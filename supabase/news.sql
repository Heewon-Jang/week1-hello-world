-- Daily news captions.
-- Run this in Supabase Dashboard -> SQL Editor (after captions.sql).
-- Safe to run more than once.

-- One headline per day (New York time), picked from campus/NYC news feeds.
create table if not exists public.news_items (
  id bigint generated always as identity primary key,
  news_date date not null unique,
  headline text not null,
  url text not null,
  source text not null,
  created_at timestamptz not null default now()
);

-- A caption belongs to either an uploaded image or a news headline.
alter table public.captions alter column image_id drop not null;
alter table public.captions
  add column if not exists news_id bigint references public.news_items (id) on delete cascade;
alter table public.captions drop constraint if exists captions_one_target;
alter table public.captions
  add constraint captions_one_target check ((image_id is null) <> (news_id is null));
create index if not exists captions_news_id_idx on public.captions (news_id);

-- RLS: anyone can read headlines. There are no insert/update/delete policies:
-- only the server, using the secret key (which bypasses RLS), writes news rows
-- and news captions. The "Users caption own images" policy already rejects
-- user-inserted captions without an image.
alter table public.news_items enable row level security;

drop policy if exists "Anyone can view news" on public.news_items;
create policy "Anyone can view news"
  on public.news_items for select to anon, authenticated
  using (true);

-- Check: every table should show rls_enabled = true
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
