-- Save the prompts (and the model that answered) for every AI generation.
-- Run this in Supabase Dashboard -> SQL Editor (after news.sql).
-- Safe to run more than once. RLS policies from captions.sql still apply.

-- Step 1 of the prompt chain: image -> description.
alter table public.images add column if not exists description_prompt text;
alter table public.images add column if not exists description_model text;

-- Step 2: description (or today's headlines) -> captions.
alter table public.captions add column if not exists prompt text;
alter table public.captions add column if not exists model text;
