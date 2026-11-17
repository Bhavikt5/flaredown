-- Flare Down: run this once in Supabase → SQL Editor → New query → Run.
-- Every table is protected by Row Level Security: each signed-in user can
-- only see and change their own rows.

create table if not exists public.checkins (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  skin int not null,
  itch int not null,
  stress int not null,
  sleep_hours real not null,
  alcohol_units real not null,
  flare boolean not null default false,
  areas jsonb not null default '[]',
  treatments jsonb not null default '[]',
  notes text not null default '',
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists public.meals (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  meal text not null,
  dish_id text not null,
  dish_name text not null,
  ingredients jsonb not null default '[]',
  tags jsonb not null default '[]',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists public.custom_dishes (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  ingredients jsonb not null default '[]',
  fried boolean not null default false,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists public.custom_ingredients (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  tags jsonb not null default '[]',
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists public.treatments (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null,
  active boolean not null default true,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists public.photos (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  area text not null,
  note text not null default '',
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null default '',
  updated_at timestamptz not null default now()
);

-- Indexes for "changed since" sync queries
create index if not exists checkins_user_updated on public.checkins (user_id, updated_at);
create index if not exists meals_user_updated on public.meals (user_id, updated_at);
create index if not exists custom_dishes_user_updated on public.custom_dishes (user_id, updated_at);
create index if not exists custom_ingredients_user_updated on public.custom_ingredients (user_id, updated_at);
create index if not exists treatments_user_updated on public.treatments (user_id, updated_at);
create index if not exists photos_user_updated on public.photos (user_id, updated_at);

-- Row Level Security: own rows only
do $$
declare t text;
begin
  foreach t in array array['checkins','meals','custom_dishes','custom_ingredients','treatments','photos','profiles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own select" on public.%I', t);
    execute format('drop policy if exists "own insert" on public.%I', t);
    execute format('drop policy if exists "own update" on public.%I', t);
    execute format('drop policy if exists "own delete" on public.%I', t);
    execute format('create policy "own select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Private bucket for skin photos (only used if you turn on photo backup in the app)
insert into storage.buckets (id, name, public)
values ('skin-photos', 'skin-photos', false)
on conflict (id) do nothing;

drop policy if exists "skin photos own read" on storage.objects;
drop policy if exists "skin photos own insert" on storage.objects;
drop policy if exists "skin photos own update" on storage.objects;
drop policy if exists "skin photos own delete" on storage.objects;

create policy "skin photos own read" on storage.objects for select to authenticated
  using (bucket_id = 'skin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "skin photos own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'skin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "skin photos own update" on storage.objects for update to authenticated
  using (bucket_id = 'skin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "skin photos own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'skin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
