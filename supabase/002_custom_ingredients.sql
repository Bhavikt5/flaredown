-- Flare Down update 002: your own ingredients and packaged products.
-- Run once in Supabase → SQL Editor → New query → Run.
-- (Safe to run on top of schema.sql. Nothing is deleted.)

create table if not exists public.custom_ingredients (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  tags jsonb not null default '[]',
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create index if not exists custom_ingredients_user_updated on public.custom_ingredients (user_id, updated_at);

alter table public.custom_ingredients enable row level security;

create policy "own select" on public.custom_ingredients for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own insert" on public.custom_ingredients for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own update" on public.custom_ingredients for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own delete" on public.custom_ingredients for delete to authenticated
  using ((select auth.uid()) = user_id);
