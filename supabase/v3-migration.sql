-- Run in Supabase > SQL Editor AFTER v2-migration.sql.
-- Replaces the old true/false "features" with stats: { name, status, available }.
-- status: essential (silver) | convenient (gold) | premium (purple)

-- 1. The list of known stat categories (used as suggestions when adding a stat)
create table if not exists stat_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null check (status in ('essential', 'convenient', 'premium')),
  created_at timestamptz not null default now()
);
create unique index if not exists stat_categories_name_key on stat_categories (lower(name));
alter table stat_categories enable row level security;
drop policy if exists "anyone reads categories" on stat_categories;
drop policy if exists "admin adds categories" on stat_categories;
drop policy if exists "admin deletes categories" on stat_categories;
create policy "anyone reads categories" on stat_categories for select to anon, authenticated using (true);
create policy "admin adds categories" on stat_categories for insert to anon, authenticated with check (admin_check());
create policy "admin deletes categories" on stat_categories for delete to anon, authenticated using (admin_check());
-- (renames and status changes go through admin_update_category() below so lodges stay in sync)

insert into stat_categories (name, status) values
  ('Stable electricity', 'essential'), ('Running water', 'essential'), ('Well', 'essential'), ('Modern toilet', 'essential'),
  ('Ceiling fan', 'convenient'), ('Kitchen', 'convenient'), ('Fenced compound', 'convenient'), ('Security', 'convenient'),
  ('Starlink', 'premium')
on conflict do nothing;

-- 2. Each lodge keeps its own stats list
alter table lodges add column if not exists stats jsonb not null default '[]'::jsonb;

-- 3. Convert old features (once)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lodges' and column_name = 'features') then
    update lodges l set stats = coalesce((
      select jsonb_agg(jsonb_build_object('name', m.name, 'status', m.status, 'available', true))
      from unnest(l.features) f
      join (values
        ('stable_electricity', 'Stable electricity', 'essential'), ('running_water', 'Running water', 'essential'),
        ('well', 'Well', 'essential'), ('modern_toilet', 'Modern toilet', 'essential'),
        ('ceiling_fan', 'Ceiling fan', 'convenient'), ('kitchen', 'Kitchen', 'convenient'),
        ('fenced', 'Fenced compound', 'convenient'), ('security', 'Security', 'convenient'),
        ('starlink', 'Starlink', 'premium')) as m(key, name, status) on m.key = f
    ), '[]'::jsonb)
    where l.stats = '[]'::jsonb and l.features is not null and cardinality(l.features) > 0;
  end if;
end $$;

-- 4. Rebuild the view without the old column
drop view if exists lodges_with_stats;
alter table lodges drop column if exists features;
create view lodges_with_stats as
select l.*, s.interest_count, s.booked_count, s.sold_count,
  greatest(l.units_total - s.booked_count - s.sold_count, 0) as units_available
from lodges l
cross join lateral (select
  (select count(*) from requests r where r.lodge_id = l.id and r.type = 'interest')::int as interest_count,
  (select count(*) from bookings b where b.lodge_id = l.id and b.status = 'active')::int as booked_count,
  (select count(*) from bookings b where b.lodge_id = l.id and b.status = 'sold')::int as sold_count) s;
grant select on lodges_with_stats to anon, authenticated;

-- 5. Rename / re-status a category everywhere it's used
create or replace function admin_update_category(p_id uuid, p_name text, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  if p_status not in ('essential', 'convenient', 'premium') then raise exception 'Bad status'; end if;
  if length(trim(p_name)) < 2 then raise exception 'Bad name'; end if;
  select name into v_old from stat_categories where id = p_id;
  if not found then return false; end if;
  update stat_categories set name = trim(p_name), status = p_status where id = p_id;
  update lodges set stats = coalesce((
      select jsonb_agg(case when lower(t.e ->> 'name') = lower(v_old)
        then t.e || jsonb_build_object('name', trim(p_name), 'status', p_status) else t.e end order by t.i)
      from jsonb_array_elements(stats) with ordinality as t(e, i)), '[]'::jsonb)
  where exists (select 1 from jsonb_array_elements(stats) e where lower(e ->> 'name') = lower(v_old));
  return true;
end $$;
grant execute on function admin_update_category(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
