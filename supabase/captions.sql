-- Week 4: caption rating app.
-- Run this in Supabase Dashboard -> SQL Editor (after profiles.sql).
-- Safe to run more than once.

-- 1. Tables ---------------------------------------------------------------

-- An uploaded image plus the LLM's text description of it.
create table if not exists public.images (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  description text,
  created_at timestamptz not null default now()
);

-- LLM-generated captions for an image.
create table if not exists public.captions (
  id bigint generated always as identity primary key,
  image_id bigint not null references public.images (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- One vote (+1 / -1) per user per caption.
create table if not exists public.caption_votes (
  id bigint generated always as identity primary key,
  caption_id bigint not null references public.captions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (caption_id, user_id)
);

create index if not exists captions_image_id_idx on public.captions (image_id);
create index if not exists caption_votes_caption_id_idx on public.caption_votes (caption_id);

-- 2. Storage bucket for uploaded images ------------------------------------
-- Public bucket: anyone with the URL can view an image, but only logged-in
-- users can upload, and only into a folder named after their own user id.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

drop policy if exists "Users upload to their own folder" on storage.objects;
create policy "Users upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 3. Row level security: on for every table ---------------------------------

alter table public.jokes enable row level security;
alter table public.profiles enable row level security;
alter table public.images enable row level security;
alter table public.captions enable row level security;
alter table public.caption_votes enable row level security;

-- jokes: no longer used by the app, so no policies = nobody can read or write.

-- profiles: you can only see and edit your own row.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- images: anyone can browse; logged-in users can only add images as themselves.
drop policy if exists "Anyone can view images" on public.images;
create policy "Anyone can view images"
  on public.images for select to anon, authenticated
  using (true);

drop policy if exists "Users add own images" on public.images;
create policy "Users add own images"
  on public.images for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- captions: anyone can browse; captions can only be added to your own images.
drop policy if exists "Anyone can view captions" on public.captions;
create policy "Anyone can view captions"
  on public.captions for select to anon, authenticated
  using (true);

drop policy if exists "Users caption own images" on public.captions;
create policy "Users caption own images"
  on public.captions for insert to authenticated
  with check (
    exists (
      select 1 from public.images
      where images.id = captions.image_id and images.user_id = (select auth.uid())
    )
  );

-- caption_votes: logged-in users see vote totals; you can only cast,
-- change or remove your own vote.
drop policy if exists "Logged-in users view votes" on public.caption_votes;
create policy "Logged-in users view votes"
  on public.caption_votes for select to authenticated
  using (true);

drop policy if exists "Users cast own votes" on public.caption_votes;
create policy "Users cast own votes"
  on public.caption_votes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users change own votes" on public.caption_votes;
create policy "Users change own votes"
  on public.caption_votes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own votes" on public.caption_votes;
create policy "Users remove own votes"
  on public.caption_votes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 4. Check: every table should show rls_enabled = true
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
