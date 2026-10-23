-- Utsava Supabase Schema
-- Run this in the Supabase SQL Editor after creating your project.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  event_type text not null,
  event_date date,
  guest_count integer,
  budget_total numeric,
  location text,
  style text,
  notes text,
  plan jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists events_created_at_idx on public.events(created_at desc);

alter table public.profiles enable row level security;
alter table public.events enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own events" on public.events for select using (auth.uid() = user_id);
create policy "Users can insert own events" on public.events for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on public.events for update using (auth.uid() = user_id);
create policy "Users can delete own events" on public.events for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();
