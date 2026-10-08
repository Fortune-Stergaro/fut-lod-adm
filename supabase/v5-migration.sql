-- Run in Supabase > SQL Editor AFTER v4-migration.sql.
-- 1. Real admin check: admin pages, admin functions and admin data are only available to the emails in the `admins` table.
-- 2. Locks down data that was readable by everyone (interest requests, agents' base prices).
-- 3. Site traffic tracking + the analytics function behind /admin/analytics.
-- 4. Remembers the price and your markup at the moment an apartment is marked sold (so profit figures never shift later).

-- 0. ADMINS. Put YOUR email here (the one you sign in with). Add more admins later with:
--      insert into admins (email) values ('someone@example.com');
create table if not exists admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table admins enable row level security;     -- no policies: nobody can read or edit this table through the API
revoke all on admins from anon, authenticated;

do $$
declare v_owner text := 'obefortune2@gmail.com';     -- <<< EDIT THIS before running
begin
  if v_owner not like '%@%' then
    raise exception 'Edit v_owner near the top of v5-migration.sql: replace PUT-YOUR-ADMIN-EMAIL-HERE with your admin email, then run again.';
  end if;
  insert into admins (email) values (lower(trim(v_owner))) on conflict do nothing;
end $$;

-- 1. The real check. True only for a signed-in user whose CONFIRMED account email is in `admins`.
create or replace function admin_check() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  )
$$;
grant execute on function admin_check() to anon, authenticated;   -- needed so row-level-security policies can call it; it only returns true/false

-- 2. Data that must not be public
-- 2a. Interest requests (names + phone numbers) were readable by everyone ("TEST ONLY" policy from schema.sql)
drop policy if exists "TEST ONLY read requests" on requests;
drop policy if exists "admin reads requests" on requests;
create policy "admin reads requests" on requests for select to authenticated using (admin_check());

-- 2b. The public lodge view exposed the agents' base prices (your markup) and review notes. Rebuild it with public columns only.
drop view if exists lodges_with_stats;
create view lodges_with_stats as
select id, lodge_name, name, location, rooms, units_total, price_first_year, price_yearly, video_url, stats, created_at,
       interest_count, booked_count, sold_count, units_available
from lodges_all_stats
where review_status = 'approved';
grant select on lodges_with_stats to anon, authenticated;

-- 2c. Same for direct reads of the lodges table: hide the agent's base prices and rejection notes from the API.
--     (Admin and agents get them through admin_lodges() / agent_lodges(), which run with elevated rights.)
revoke select on lodges from anon, authenticated;
grant select (id, name, location, rooms, price_first_year, price_yearly, video_url, is_booked, created_at, lodge_name,
              units_total, agent_id, stats, review_status, source, submitted_at, reviewed_at)
  on lodges to anon, authenticated;
revoke insert, update, delete on lodges from anon;
revoke all on agents, bookings from anon;

-- 2d. Only the functions that should be public stay public
revoke execute on function admin_set_booking_status(uuid, text), admin_allow_connect(uuid), admin_lodges(),
  admin_review_lodge(uuid, text, text), admin_update_category(uuid, text, text),
  unbook(uuid), my_connect_info(uuid), mark_agent_contacted(uuid), my_agent(), agent_lodges(),
  agent_submit_lodge(jsonb), agent_update_lodge(uuid, jsonb), book_unit(uuid, text, text)
  from public, anon;
grant execute on function admin_set_booking_status(uuid, text), admin_allow_connect(uuid), admin_lodges(),
  admin_review_lodge(uuid, text, text), admin_update_category(uuid, text, text),
  unbook(uuid), my_connect_info(uuid), mark_agent_contacted(uuid), my_agent(), agent_lodges(),
  agent_submit_lodge(jsonb), agent_update_lodge(uuid, jsonb), book_unit(uuid, text, text)
  to authenticated;
revoke execute on function _check_lodge_input(jsonb) from public, anon, authenticated;

-- 3. Remember what each sold apartment earned (first year only) and what part of it is your markup
alter table bookings
  add column if not exists sold_amount numeric,    -- first-year price paid
  add column if not exists sold_profit numeric;    -- first-year price minus the agent's base price (your markup)

update bookings b set
  sold_amount = l.price_first_year,
  sold_profit = l.price_first_year - coalesce(l.agent_price_first_year, l.price_first_year)
from lodges l
where l.id = b.lodge_id and b.status = 'sold' and b.sold_amount is null;

create or replace function admin_set_booking_status(p_booking_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  if p_status not in ('revoked', 'sold') then raise exception 'Bad status'; end if;
  update bookings b set
    status = p_status,
    status_changed_at = now(),
    sold_amount = case when p_status = 'sold' then l.price_first_year end,
    sold_profit = case when p_status = 'sold' then l.price_first_year - coalesce(l.agent_price_first_year, l.price_first_year) end
  from lodges l
  where b.id = p_booking_id and b.status = 'active' and l.id = b.lodge_id;
  return found;
end $$;
grant execute on function admin_set_booking_status(uuid, text) to authenticated;

-- 4. Traffic tracking (anonymous: a random id stored in the visitor's browser, no IP addresses, no personal data)
create table if not exists site_visits (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  path text not null,
  kind text not null default 'view' check (kind in ('view', 'ping')),   -- ping = "still here" heartbeat
  created_at timestamptz not null default now()
);
create index if not exists site_visits_created_idx on site_visits (created_at);
create index if not exists site_visits_visitor_idx on site_visits (visitor_id, created_at desc);
alter table site_visits enable row level security;   -- no policies: written only by track_visit(), read only by admin_analytics()
revoke all on site_visits from anon, authenticated;

create or replace function track_visit(p_visitor uuid, p_path text, p_kind text default 'view') returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_visitor is null or length(coalesce(p_path, '')) = 0 or p_path like '/admin%' then return; end if;
  if p_kind not in ('view', 'ping') then p_kind := 'view'; end if;
  -- ignore bursts: one record per visitor per 20 seconds
  if exists (select 1 from site_visits where visitor_id = p_visitor and created_at > now() - interval '20 seconds') then return; end if;
  insert into site_visits (visitor_id, path, kind) values (p_visitor, left(p_path, 200), p_kind);
end $$;
grant execute on function track_visit(uuid, text, text) to anon, authenticated;

-- 5. Everything the analytics page shows, in one admin-only call
create or replace function admin_analytics(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
  v_tz constant text := 'Africa/Lagos';
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_apartments jsonb; v_agents jsonb; v_traffic jsonb; v_signups jsonb; v_money jsonb;
begin
  if not admin_check() then raise exception 'Not allowed'; end if;

  -- apartments on the live site
  select jsonb_build_object(
    'lodges', count(*),
    'total', coalesce(sum(units_total), 0),
    'available', coalesce(sum(units_available), 0),
    'booked', coalesce(sum(booked_count), 0),
    'sold', coalesce(sum(sold_count), 0),
    'interests', coalesce(sum(interest_count), 0),
    'lodges_with_interest', count(*) filter (where interest_count > 0))
  into v_apartments
  from lodges_all_stats where review_status = 'approved';

  -- one line per agent: of the lodges they uploaded, how many are booked / have interest / are sold
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name,
      'lodges', coalesce(s.lodges, 0), 'booked', coalesce(s.booked, 0),
      'interested', coalesce(s.interested, 0), 'sold', coalesce(s.sold, 0))
    order by coalesce(s.lodges, 0) desc, a.name), '[]'::jsonb)
  into v_agents
  from agents a
  left join lateral (
    select count(*) as lodges,
           count(*) filter (where l.booked_count > 0) as booked,
           count(*) filter (where l.interest_count > 0) as interested,
           count(*) filter (where l.sold_count > 0) as sold
    from lodges_all_stats l where l.agent_id = a.id) s on true;

  -- traffic
  select jsonb_build_object(
    'online_now', (select count(distinct visitor_id) from site_visits where created_at > now() - interval '30 minutes'),
    'today_visitors', (select count(distinct visitor_id) from site_visits where (created_at at time zone v_tz)::date = v_today),
    'total_visitors', (select count(distinct visitor_id) from site_visits),
    'total_views', (select count(*) from site_visits where kind = 'view'),
    'since', (select min(created_at) from site_visits),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'visitors', coalesce(t.visitors, 0), 'views', coalesce(t.views, 0)) order by d.day), '[]'::jsonb)
      from (select (v_today - g) as day from generate_series(0, v_days - 1) g) d
      left join (
        select (created_at at time zone v_tz)::date as day,
               count(distinct visitor_id) as visitors,
               count(*) filter (where kind = 'view') as views
        from site_visits
        where created_at >= now() - ((v_days + 1) * interval '1 day')
        group by 1) t on t.day = d.day))
  into v_traffic;

  -- sign-ups (confirmed accounts, not counting admins)
  select jsonb_build_object(
    'total', count(*),
    'last_7', count(*) filter (where u.created_at > now() - interval '7 days'),
    'last_30', count(*) filter (where u.created_at > now() - interval '30 days'))
  into v_signups
  from auth.users u
  where u.email_confirmed_at is not null and lower(u.email) not in (select email from admins);

  -- money: only apartments marked sold, first-year price only
  select jsonb_build_object('sold', count(*), 'revenue', coalesce(sum(sold_amount), 0), 'profit', coalesce(sum(sold_profit), 0))
  into v_money
  from bookings where status = 'sold';

  return jsonb_build_object('days', v_days, 'apartments', v_apartments, 'agents', v_agents,
                            'traffic', v_traffic, 'signups', v_signups, 'money', v_money);
end $$;
grant execute on function admin_analytics(int) to authenticated;
revoke execute on function admin_analytics(int) from public, anon;

notify pgrst, 'reload schema';
