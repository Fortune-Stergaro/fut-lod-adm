-- Admin doctor: run each block in the Supabase SQL Editor to see why an admin account is not recognised.
-- Replace your@email.com with the email you sign in with.

-- 1. Is the email in the admin list (must be lowercase)?
select * from admins;

-- 2. Does that account exist and is it confirmed? (email_confirmed_at must NOT be empty)
select id, email, email_confirmed_at from auth.users where lower(email) = lower('your@email.com');

-- 3. Is the real check installed? It should mention "admins" (if it says "select true" or "select false", v5 has not been applied)
select pg_get_functiondef('public.admin_check'::regproc);

-- 4. Are the v5/v6/v7 functions present? (expect 5 rows)
select proname from pg_proc
 where proname in ('admin_check','admin_analytics','admin_bookings','admin_interests','admin_rename_area') order by 1;

-- 5. End-to-end test: pretend to be that user. Paste the id from query 2 in BOTH places. The last line should say true.
begin;
select set_config('request.jwt.claim.sub', 'PASTE-USER-ID-HERE', true);
select set_config('request.jwt.claims', '{"sub":"PASTE-USER-ID-HERE","role":"authenticated"}', true);
set local role authenticated;
select admin_check();
rollback;
