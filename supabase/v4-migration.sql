-- Run in Supabase > SQL Editor AFTER v3-migration.sql.
-- Agent portal: registered agents (matched by sign-in email) submit lodges; the owner reviews, edits, approves or rejects.
-- Public pages only ever see approved lodges.

-- 0. One agent per email (needed to match an agent to a signed-in user)
create unique index if not exists agents_email_key on agents (lower(email)) where email is not null;

-- 1. Views must be rebuilt (they are recreated below)
drop view if exists lodges_with_stats;
drop view if exists lodges_all_stats;

-- 2. Review columns on lodges. Existing lodges stay approved (live).
alter table lodges
  add column if not exists review_status text not null default 'approved' check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists rejection_note text,
  add column if not exists source text not null default 'admin' check (source in ('admin', 'agent')),
  add column if not exists agent_price_first_year numeric,   -- what the agent asked for (before your fee)
  add column if not exists agent_price_yearly numeric,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz;

-- 3. Who is the signed-in agent?
create or replace function my_agent_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from agents where email is not null and lower(email) = lower(auth.jwt() ->> 'email') limit 1
$$;

create or replace function my_agent() returns json
language sql stable security definer set search_path = public as $$
  select to_json(a) from (select id, name, whatsapp, email from agents
    where email is not null and lower(email) = lower(auth.jwt() ->> 'email') limit 1) a
$$;

-- 4. Views: everything (private) and approved-only (public)
create view lodges_all_stats as
select l.*, s.interest_count, s.booked_count, s.sold_count,
  greatest(l.units_total - s.booked_count - s.sold_count, 0) as units_available
from lodges l
cross join lateral (select
  (select count(*) from requests r where r.lodge_id = l.id and r.type = 'interest')::int as interest_count,
  (select count(*) from bookings b where b.lodge_id = l.id and b.status = 'active')::int as booked_count,
  (select count(*) from bookings b where b.lodge_id = l.id and b.status = 'sold')::int as sold_count) s;
revoke all on lodges_all_stats from anon, authenticated;   -- only reachable through the functions below

create view lodges_with_stats as select * from lodges_all_stats where review_status = 'approved';
grant select on lodges_with_stats to anon, authenticated;

-- 5. Row access on lodges: public sees approved; admin sees all; an agent sees their own
drop policy if exists "anyone can read lodges" on lodges;
drop policy if exists "read lodges" on lodges;
create policy "read lodges" on lodges for select to anon, authenticated
  using (review_status = 'approved' or admin_check() or agent_id = my_agent_id());

-- 6. Agents may upload videos (never delete)
drop policy if exists "agents upload videos" on storage.objects;
create policy "agents upload videos" on storage.objects for insert to authenticated
  with check (bucket_id = 'lodge-videos' and my_agent_id() is not null);

-- 7. Input check shared by the agent functions
create or replace function _check_lodge_input(p jsonb) returns void language plpgsql as $$
begin
  if length(trim(coalesce(p ->> 'lodge_name', ''))) < 2 or length(trim(coalesce(p ->> 'name', ''))) < 2 then raise exception 'Name is required'; end if;
  if coalesce((p ->> 'rooms')::int, 0) < 1 or coalesce((p ->> 'units_total')::int, 0) < 1 then raise exception 'Rooms and apartments must be at least 1'; end if;
  if coalesce((p ->> 'price_first_year')::numeric, -1) < 0 or coalesce((p ->> 'price_yearly')::numeric, -1) < 0 then raise exception 'Enter both prices'; end if;
  if jsonb_typeof(coalesce(p -> 'stats', '[]'::jsonb)) <> 'array' then raise exception 'Bad stats'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p -> 'stats', '[]'::jsonb)) e
             where (e ->> 'status') not in ('essential', 'convenient', 'premium') or length(coalesce(e ->> 'name', '')) < 2) then
    raise exception 'Bad stats';
  end if;
end $$;

-- 8. Agent functions
create or replace function agent_lodges() returns json
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := my_agent_id();
begin
  if v_id is null then return '[]'::json; end if;
  return coalesce((select json_agg(to_jsonb(v) order by v.created_at desc) from lodges_all_stats v where v.agent_id = v_id), '[]'::json);
end $$;

create or replace function agent_submit_lodge(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_agent uuid := my_agent_id(); v_id uuid;
begin
  if v_agent is null then raise exception 'Not a registered agent'; end if;
  perform _check_lodge_input(p);
  insert into lodges (lodge_name, name, location, rooms, units_total, price_first_year, price_yearly,
                      agent_price_first_year, agent_price_yearly, stats, video_url, agent_id, review_status, source, submitted_at)
  values (trim(p ->> 'lodge_name'), trim(p ->> 'name'), nullif(trim(p ->> 'location'), ''), (p ->> 'rooms')::int, (p ->> 'units_total')::int,
          (p ->> 'price_first_year')::numeric, (p ->> 'price_yearly')::numeric,
          (p ->> 'price_first_year')::numeric, (p ->> 'price_yearly')::numeric,
          coalesce(p -> 'stats', '[]'::jsonb), nullif(p ->> 'video_url', ''), v_agent, 'pending', 'agent', now())
  returning id into v_id;
  return v_id;
end $$;

-- Edit and resend a rejected lodge
create or replace function agent_update_lodge(p_id uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_agent uuid := my_agent_id();
begin
  if v_agent is null then raise exception 'Not a registered agent'; end if;
  perform _check_lodge_input(p);
  update lodges set
    lodge_name = trim(p ->> 'lodge_name'), name = trim(p ->> 'name'), location = nullif(trim(p ->> 'location'), ''),
    rooms = (p ->> 'rooms')::int, units_total = (p ->> 'units_total')::int,
    price_first_year = (p ->> 'price_first_year')::numeric, price_yearly = (p ->> 'price_yearly')::numeric,
    agent_price_first_year = (p ->> 'price_first_year')::numeric, agent_price_yearly = (p ->> 'price_yearly')::numeric,
    stats = coalesce(p -> 'stats', '[]'::jsonb),
    video_url = coalesce(nullif(p ->> 'video_url', ''), video_url),
    review_status = 'pending', rejection_note = null, submitted_at = now(), reviewed_at = null
  where id = p_id and agent_id = v_agent and review_status = 'rejected';
  if not found then raise exception 'Only your rejected lodges can be edited and resent'; end if;
end $$;

-- 9. Admin functions
create or replace function admin_lodges() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  return coalesce((select json_agg(to_jsonb(v) || jsonb_build_object('agent_name', a.name) order by v.created_at desc)
                   from lodges_all_stats v left join agents a on a.id = v.agent_id), '[]'::json);
end $$;

create or replace function admin_review_lodge(p_id uuid, p_decision text, p_note text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Bad decision'; end if;
  if p_decision = 'rejected' and length(trim(coalesce(p_note, ''))) < 3 then raise exception 'Add a note for the agent'; end if;
  update lodges set review_status = p_decision,
    rejection_note = case when p_decision = 'rejected' then trim(p_note) else null end,
    reviewed_at = now()
  where id = p_id;
  if not found then return false; end if;
  if p_decision = 'approved' then      -- any new stat names become categories
    insert into stat_categories (name, status)
    select distinct on (lower(e ->> 'name')) e ->> 'name', e ->> 'status'
    from lodges l, jsonb_array_elements(l.stats) e where l.id = p_id
    order by lower(e ->> 'name')
    on conflict do nothing;
  end if;
  return true;
end $$;

-- 10. Booking only works on approved lodges
create or replace function book_unit(p_lodge_id uuid, p_name text, p_phone text)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_lodge lodges; v_taken int;
begin
  if v_uid is null then return 'not_signed_in'; end if;
  if length(trim(p_name)) < 2 or length(trim(p_phone)) < 10 then return 'bad_details'; end if;
  select * into v_lodge from lodges where id = p_lodge_id for update;
  if not found or v_lodge.review_status <> 'approved' then return 'not_found'; end if;
  if exists (select 1 from bookings where lodge_id = p_lodge_id and user_id = v_uid and status = 'active')
    then return 'already_booked'; end if;
  select count(*) into v_taken from bookings where lodge_id = p_lodge_id and status in ('active', 'sold');
  if v_taken >= v_lodge.units_total then return 'full'; end if;
  insert into bookings (lodge_id, user_id, email, name, phone)
    values (p_lodge_id, v_uid, coalesce(auth.jwt() ->> 'email', ''), trim(p_name), trim(p_phone));
  return 'ok';
end $$;

-- The agent link page must not reveal the agent's base prices or review notes
create or replace function get_connection(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select b.name as client_name, b.status as status, a.name as agent_name,
         (to_jsonb(l) - 'agent_id' - 'agent_price_first_year' - 'agent_price_yearly' - 'rejection_note') as lodge into r
  from bookings b join lodges l on l.id = b.lodge_id left join agents a on a.id = l.agent_id
  where b.connect_token = p_token and b.connect_allowed;
  if not found then return null; end if;
  return json_build_object('client_name', r.client_name, 'status', r.status, 'agent_name', r.agent_name, 'lodge', r.lodge);
end $$;

grant execute on function my_agent_id(), my_agent(), agent_lodges(), agent_submit_lodge(jsonb), agent_update_lodge(uuid, jsonb) to authenticated;
grant execute on function admin_lodges(), admin_review_lodge(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
