-- Run this whole file in Supabase > SQL Editor.

create table lodges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  rooms int not null default 1,
  price_first_year numeric not null,   -- what a tenant pays in year one
  price_yearly numeric not null,       -- what they pay every year after
  video_url text,                      -- public URL (e.g. Supabase Storage bucket "lodge-videos")
  features text[] not null default '{}',
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  lodge_id uuid not null references lodges(id) on delete cascade,
  type text not null check (type in ('interest', 'booking')),
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Lodges plus how many people showed interest
create view lodges_with_stats as
select l.*,
  (select count(*) from requests r where r.lodge_id = l.id and r.type = 'interest')::int as interest_count
from lodges l;

alter table lodges enable row level security;
alter table requests enable row level security;

create policy "anyone can read lodges" on lodges for select using (true);
-- Interest requests can be inserted directly. Bookings must go through book_lodge().
create policy "anyone can show interest" on requests for insert with check (type = 'interest');
-- TESTING ONLY: lets the open admin page read requests. Remove before production.
create policy "TEST ONLY read requests" on requests for select using (true);

-- Atomic booking: returns false if someone else booked first.
create or replace function book_lodge(p_lodge_id uuid, p_name text, p_phone text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update lodges set is_booked = true where id = p_lodge_id and is_booked = false;
  if not found then return false; end if;
  insert into requests (lodge_id, type, name, phone) values (p_lodge_id, 'booking', p_name, p_phone);
  return true;
end $$;

grant select on lodges_with_stats to anon;
grant execute on function book_lodge(uuid, text, text) to anon;

-- Sample lodge (add a real video_url later)
insert into lodges (name, location, rooms, price_first_year, price_yearly, video_url, features) values
('Single room self-contain', 'Bosso Estate', 1, 250000, 200000, '',
 array['stable_electricity','running_water','modern_toilet','ceiling_fan','starlink']);
