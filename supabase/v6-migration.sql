-- Run in Supabase > SQL Editor AFTER v5-migration.sql (deploy the matching site code first).
-- Keeps the real lodge name (lodges.lodge_name) off every public page AND out of the public data feed.
-- Visitors and normal signed-in users can no longer read it, even by calling the database API directly.
-- Who still sees it: the owner (admin), the lodge's agent (agent portal), and the private /connect/<token> page.

-- 1. Public lodge view without lodge_name
drop view if exists lodges_with_stats;
create view lodges_with_stats as
select id, name, location, rooms, units_total, price_first_year, price_yearly, video_url, stats, created_at,
       interest_count, booked_count, sold_count, units_available
from lodges_all_stats
where review_status = 'approved';
grant select on lodges_with_stats to anon, authenticated;

-- 2. Direct reads of the lodges table: lodge_name (and the agents' base prices) stay hidden from the API
revoke select on lodges from anon, authenticated;
grant select (id, name, location, rooms, price_first_year, price_yearly, video_url, is_booked, created_at,
              units_total, agent_id, stats, review_status, source, submitted_at, reviewed_at)
  on lodges to anon, authenticated;

-- 3. The admin screens used to read lodge_name through the table; give them admin-only functions instead
create or replace function admin_bookings() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  return coalesce((
    select jsonb_agg(
      to_jsonb(b) || jsonb_build_object('lodges', jsonb_build_object(
        'id', l.id, 'name', l.name, 'lodge_name', l.lodge_name, 'agent_id', l.agent_id,
        'agents', case when a.id is null then null else jsonb_build_object('name', a.name) end))
      order by b.created_at desc)
    from bookings b
    left join lodges l on l.id = b.lodge_id
    left join agents a on a.id = l.agent_id), '[]'::jsonb);
end $$;

create or replace function admin_interests() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not admin_check() then raise exception 'Not allowed'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'name', r.name, 'phone', r.phone, 'created_at', r.created_at, 'lodge_id', r.lodge_id,
      'lodges', case when l.id is null then null else jsonb_build_object('name', l.name, 'lodge_name', l.lodge_name) end)
      order by r.created_at desc)
    from requests r
    left join lodges l on l.id = r.lodge_id
    where r.type = 'interest'), '[]'::jsonb);
end $$;

revoke execute on function admin_bookings(), admin_interests() from public, anon;
grant execute on function admin_bookings(), admin_interests() to authenticated;

notify pgrst, 'reload schema';
