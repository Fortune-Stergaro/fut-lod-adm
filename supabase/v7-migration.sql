-- Run in Supabase > SQL Editor AFTER v6-migration.sql (deploy the matching site code first).
-- Areas: lodges pick their area from a managed list (KFF, Dama, Talba Road, ...) and visitors can filter by area.
-- SAFE TO RE-RUN: every statement is idempotent. If you ever re-run an older migration (v2-v4), re-run v6 and v7 afterwards.
-- (An earlier draft of this file removed the area from the public data. This version replaces it: run it again if you ran that one.)

-- 1. The list of areas (readable by everyone for the dropdowns; changed only by the owner)
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  created_at timestamptz not null default now()
);
create unique index if not exists areas_name_key on areas (lower(name));
alter table areas enable row level security;
drop policy if exists "anyone reads areas" on areas;
drop policy if exists "admin adds areas" on areas;
create policy "anyone reads areas" on areas for select to anon, authenticated using (true);
create policy "admin adds areas" on areas for insert to authenticated with check (admin_check());
-- (renames and deletes go through the two functions below, so lodges always stay in sync)
revoke update, delete on areas from anon, authenticated;
revoke insert on areas from anon;

-- Starter areas, plus every area name already typed on an existing lodge so nothing is orphaned. Edit the list in Admin > Areas.
insert into areas (name) values ('KFF'), ('Dama'), ('Talba Road') on conflict do nothing;
insert into areas (name)
  select distinct trim(location) from lodges where location is not null and length(trim(location)) >= 2
  on conflict do nothing;

-- 2. Every lodge's area must be one from the list (and is stored with the list's exact spelling)
create or replace function lodges_check_area() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.location is null or length(trim(new.location)) = 0 then new.location := null; return new; end if;
  select name into v_name from areas where lower(name) = lower(trim(new.location));
  if v_name is null then raise exception 'Unknown area: choose one from the list'; end if;
  new.location := v_name;
  return new;
end $$;
drop trigger if exists lodges_area_check on lodges;
create trigger lodges_area_check before insert or update of location on lodges
  for each row execute function lodges_check_area();

-- tidy existing lodges to the list's spelling (the trigger above validates this update)
update lodges l set location = a.name from areas a
  where lower(trim(l.location)) = lower(a.name) and l.location is distinct from a.name;

-- 3. Agents must choose an area when they submit or resend a lodge
create or replace function _check_lodge_input(p jsonb) returns void language plpgsql as $$
begin
  if length(trim(coalesce(p ->> 'lodge_name', ''))) < 2 or length(trim(coalesce(p ->> 'name', ''))) < 2 then raise exception 'Name is required'; end if;
  if length(trim(coalesce(p ->> 'location', ''))) < 2 then raise exception 'Choose an area'; end if;
  if coalesce((p ->> 'rooms')::int, 0) < 1 or coalesce((p ->> 'units_total')::int, 0) < 1 then raise exception 'Rooms and apartments must be at least 1'; end if;
  if coalesce((p ->> 'price_first_year')::numeric, -1) < 0 or coalesce((p ->> 'price_yearly')::numeric, -1) < 0 then raise exception 'Enter both prices'; end if;
  if jsonb_typeof(coalesce(p -> 'stats', '[]'::jsonb)) <> 'array' then raise exception 'Bad stats'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p -> 'stats', '[]'::jsonb)) e
             where (e ->> 'status') not in ('essential', 'convenient', 'premium') or length(coalesce(e ->> 'name', '')) < 2) then
    raise exception 'Bad stats';
  end if;
end $$;

-- 4. Owner tools: rename an area everywhere, delete an unused one
create or replace function admin_rename_area(p_id uuid, p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Bad name'; end if;
  select name into v_old from areas where id = p_id;
  if not found then return false; end if;
  update areas set name = trim(p_name) where id = p_id;                      -- a duplicate name raises error 23505
  update lodges set location = trim(p_name) where lower(location) = lower(v_old);
  return true;
end $$;

create or replace function admin_delete_area(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  select name into v_name from areas where id = p_id;
  if not found then return 'not_found'; end if;
  if exists (select 1 from lodges where lower(location) = lower(v_name)) then return 'in_use'; end if;
  delete from areas where id = p_id;
  return 'ok';
end $$;
revoke execute on function admin_rename_area(uuid, text), admin_delete_area(uuid) from public, anon;
grant execute on function admin_rename_area(uuid, text), admin_delete_area(uuid) to authenticated;

-- 4b. (the lodge NAME stays private: it is not in this list of public columns)
-- 5. Public data: area is public again (name stays hidden)
drop view if exists lodges_with_stats;
create view lodges_with_stats as
select id, name, location, rooms, units_total, price_first_year, price_yearly, video_url, stats, created_at,
       interest_count, booked_count, sold_count, units_available
from lodges_all_stats
where review_status = 'approved';
grant select on lodges_with_stats to anon, authenticated;
revoke all on lodges_all_stats from anon, authenticated;

revoke select on lodges from anon, authenticated;
grant select (id, name, location, rooms, price_first_year, price_yearly, video_url, is_booked, created_at,
              units_total, agent_id, stats, review_status, source, submitted_at, reviewed_at)
  on lodges to anon, authenticated;

notify pgrst, 'reload schema';
