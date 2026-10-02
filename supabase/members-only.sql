-- Members-only content: you must be logged in to see photos, captions and news.
-- Run this in Supabase Dashboard -> SQL Editor (after prompts.sql).
-- Safe to run more than once.

-- Table reads: authenticated users only (was anon + authenticated).
drop policy if exists "Anyone can view images" on public.images;
drop policy if exists "Logged-in users view images" on public.images;
create policy "Logged-in users view images"
  on public.images for select to authenticated
  using (true);

drop policy if exists "Anyone can view captions" on public.captions;
drop policy if exists "Logged-in users view captions" on public.captions;
create policy "Logged-in users view captions"
  on public.captions for select to authenticated
  using (true);

drop policy if exists "Anyone can view news" on public.news_items;
drop policy if exists "Logged-in users view news" on public.news_items;
create policy "Logged-in users view news"
  on public.news_items for select to authenticated
  using (true);

-- Photo files: private bucket; logged-in users get short-lived signed URLs.
update storage.buckets set public = false where id = 'images';

drop policy if exists "Logged-in users view images" on storage.objects;
create policy "Logged-in users view images"
  on storage.objects for select to authenticated
  using (bucket_id = 'images');
