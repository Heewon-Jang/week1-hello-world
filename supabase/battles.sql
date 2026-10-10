-- Week 5: caption battles. Two captions for the same photo or headline go
-- head to head; the user picks the funnier one. Elo ratings are computed by
-- replaying these rows in order, so no rating column can drift or be tampered with.
-- Run this in Supabase Dashboard -> SQL Editor (after members-only.sql).
-- Safe to run more than once.

create table if not exists public.caption_battles (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  winner_id bigint not null references public.captions (id) on delete cascade,
  loser_id bigint not null references public.captions (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (winner_id <> loser_id)
);

-- Each user judges a given pair of captions only once, in either order.
create unique index if not exists caption_battles_user_pair_idx
  on public.caption_battles (user_id, least(winner_id, loser_id), greatest(winner_id, loser_id));
create index if not exists caption_battles_winner_idx on public.caption_battles (winner_id);
create index if not exists caption_battles_loser_idx on public.caption_battles (loser_id);

-- RLS: logged-in users see all results (needed for ratings); you can only
-- record battles as yourself. No update/delete: a pick is final.
alter table public.caption_battles enable row level security;

drop policy if exists "Logged-in users view battles" on public.caption_battles;
create policy "Logged-in users view battles"
  on public.caption_battles for select to authenticated
  using (true);

drop policy if exists "Users record own battles" on public.caption_battles;
create policy "Users record own battles"
  on public.caption_battles for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Make the API see the new table right away.
notify pgrst, 'reload schema';

-- Check: every table should show rls_enabled = true
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
