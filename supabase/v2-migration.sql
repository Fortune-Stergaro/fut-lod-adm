-- Run in Supabase > SQL Editor AFTER schema.sql. Replaces admin-dev.sql / admin-production.sql.
-- Adds: apartments per lodge, agents, sign-in based bookings, sold tracking, connect-with-agent links.
-- Note: lodges that were "booked" under the old single-booking system become available again.

-- 0. TESTING SWITCH: while /admin is unprotected, everyone counts as an admin.
-- When you protect /admin, replace the body with a real check, e.g.
--   select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'))
create or replace function admin_check() returns boolean language sql stable as $$ select true $$;

-- 1. Agents
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  email text,
  created_at timestamptz not null default now()
);
alter table agents enable row level security;
drop policy if exists "admin manages agents" on agents;
create policy "admin manages agents" on agents for all to anon, authenticated
  using (admin_check()) with check (admin_check());

-- 2. Lodge columns
alter table lodges
  add column if not exists lodge_name text,
  add column if not exists units_total int not null default 1 check (units_total >= 1),
  add column if not exists agent_id uuid references agents(id) on delete set null;

drop policy if exists "DEV open insert lodges" on lodges;
drop policy if exists "DEV open update lodges" on lodges;
drop policy if exists "DEV open delete lodges" on lodges;
drop policy if exists "admin add lodges" on lodges;
drop policy if exists "admin edit lodges" on lodges;
drop policy if exists "admin delete lodges" on lodges;
create policy "admin add lodges"    on lodges for insert to anon, authenticated with check (admin_check());
create policy "admin edit lodges"   on lodges for update to anon, authenticated using (admin_check()) with check (admin_check());
create policy "admin delete lodges" on lodges for delete to anon, authenticated using (admin_check());

-- 3. Bookings (one row per apartment booked, tied to a signed-in user)
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  lodge_id uuid not null references lodges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  phone text not null,
  status text not null default 'active' check (status in ('active', 'unbooked', 'revoked', 'sold')),
  connect_allowed boolean not null default false,
  connect_token uuid not null default gen_random_uuid() unique,
  agent_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now()
);
create unique index if not exists one_active_booking_per_user on bookings (lodge_id, user_id) where status = 'active';
alter table bookings enable row level security;
drop policy if exists "read bookings" on bookings;
create policy "read bookings" on bookings for select to anon, authenticated
  using (user_id = auth.uid() or admin_check());
-- No insert/update/delete policies: all changes go through the functions below.

-- 4. Old single-booking functions are gone
drop function if exists book_lodge(uuid, text, text);
drop function if exists revoke_booking(uuid);

-- 5. Lodges with live counts
drop view if exists lodges_with_stats;
create view lodges_with_stats as
select l.*, s.interest_count, s.booked_count, s.sold_count,
  greatest(l.units_total - s.booked_count - s.sold_count, 0) as units_available
from lodges l
cross join lateral (select
  (select count(*) from requests r where r.lodge_id = l.id and r.type = 'interest')::int as interest_count,
  (select count(*) from bookings b where b.lodge_id = l.id and b.status = 'active')::int as booked_count,
  (select count(*) from bookings b where b.lodge_id = l.id and b.status = 'sold')::int as sold_count) s;
grant select on lodges_with_stats to anon, authenticated;

-- 6. Functions
create or replace function book_unit(p_lodge_id uuid, p_name text, p_phone text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_lodge lodges; v_taken int;
begin
  if v_uid is null then return 'not_signed_in'; end if;
  if length(trim(p_name)) < 2 or length(trim(p_phone)) < 10 then return 'bad_details'; end if;
  select * into v_lodge from lodges where id = p_lodge_id for update;   -- serialises racing bookings
  if not found then return 'not_found'; end if;
  if exists (select 1 from bookings where lodge_id = p_lodge_id and user_id = v_uid and status = 'active')
    then return 'already_booked'; end if;
  select count(*) into v_taken from bookings where lodge_id = p_lodge_id and status in ('active', 'sold');
  if v_taken >= v_lodge.units_total then return 'full'; end if;
  insert into bookings (lodge_id, user_id, email, name, phone)
    values (p_lodge_id, v_uid, coalesce(auth.jwt() ->> 'email', ''), trim(p_name), trim(p_phone));
  return 'ok';
end $$;

create or replace function unbook(p_booking_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'unbooked', status_changed_at = now()
    where id = p_booking_id and user_id = auth.uid() and status = 'active';
  return found;
end $$;

create or replace function admin_set_booking_status(p_booking_id uuid, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  if p_status not in ('revoked', 'sold') then raise exception 'Bad status'; end if;
  update bookings set status = p_status, status_changed_at = now() where id = p_booking_id and status = 'active';
  return found;
end $$;

create or replace function admin_allow_connect(p_booking_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  update bookings set connect_allowed = true where id = p_booking_id and status = 'active';
  return found;
end $$;

-- What the booking user needs to contact the agent (only once you've allowed it)
create or replace function my_connect_info(p_booking_id uuid) returns json
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select b.connect_token as token, a.name as agent_name, a.whatsapp as agent_whatsapp into r
  from bookings b join lodges l on l.id = b.lodge_id join agents a on a.id = l.agent_id
  where b.id = p_booking_id and b.user_id = auth.uid() and b.connect_allowed and b.status = 'active';
  if not found then return null; end if;
  return json_build_object('token', r.token, 'agent_name', r.agent_name, 'agent_whatsapp', r.agent_whatsapp);
end $$;

create or replace function mark_agent_contacted(p_booking_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update bookings set agent_contacted_at = coalesce(agent_contacted_at, now())
    where id = p_booking_id and user_id = auth.uid() and connect_allowed;
end $$;

-- Powers the special link page /connect/<token>
create or replace function get_connection(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select b.name as client_name, b.status as status, a.name as agent_name, (to_jsonb(l) - 'agent_id') as lodge into r
  from bookings b join lodges l on l.id = b.lodge_id left join agents a on a.id = l.agent_id
  where b.connect_token = p_token and b.connect_allowed;
  if not found then return null; end if;
  return json_build_object('client_name', r.client_name, 'status', r.status, 'agent_name', r.agent_name, 'lodge', r.lodge);
end $$;

grant execute on function book_unit(uuid, text, text) to authenticated;
grant execute on function unbook(uuid), my_connect_info(uuid), mark_agent_contacted(uuid) to authenticated;
grant execute on function admin_set_booking_status(uuid, text), admin_allow_connect(uuid) to anon, authenticated;
grant execute on function get_connection(uuid) to anon, authenticated;

-- 7. Video storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lodge-videos', 'lodge-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800;
drop policy if exists "DEV open upload videos" on storage.objects;
drop policy if exists "DEV open delete videos" on storage.objects;
drop policy if exists "admin upload videos" on storage.objects;
drop policy if exists "admin delete videos" on storage.objects;
create policy "admin upload videos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'lodge-videos' and admin_check());
create policy "admin delete videos" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'lodge-videos' and admin_check());
