-- Run this in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once. Does not create or change any RLS policies.

-- 1. profiles table (one row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- 2. Trigger: add a profiles row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Backfill users who signed in before the trigger existed
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 4. Check: rls_enabled should be false for the app to read/update profiles
--    without policies.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid = 'public.profiles'::regclass;
