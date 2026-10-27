-- Utsava schema. Run once in Supabase → SQL Editor.
-- Also enable: Authentication → Providers → "Allow anonymous sign-ins".

create extension if not exists "pgcrypto";

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  intake     jsonb not null,
  plan       jsonb,
  ledger     jsonb not null default '{"expenses":[],"shortlist":[]}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_user_idx on public.events(user_id, updated_at desc);

create table if not exists public.guests (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  phone      text,
  group_name text,
  diet       text,
  invited    text[] not null default '{}',
  token      uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create index if not exists guests_event_idx on public.guests(event_id);

create table if not exists public.rsvps (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references public.guests(id) on delete cascade,
  event_name   text not null,
  status       text not null check (status in ('yes','no','maybe')),
  party_size   int  not null default 1 check (party_size between 1 and 20),
  note         text,
  responded_at timestamptz not null default now(),
  unique (guest_id, event_name)
);

alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps  enable row level security;

-- Owners only. Public RSVPs go through a server route (service role) that checks the guest token.
drop policy if exists "own events" on public.events;
create policy "own events" on public.events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own guests" on public.guests;
create policy "own guests" on public.guests for all
  using (exists (select 1 from public.events e where e.id = guests.event_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = guests.event_id and e.user_id = auth.uid()));

drop policy if exists "own rsvps" on public.rsvps;
create policy "own rsvps" on public.rsvps for select
  using (exists (select 1 from public.guests g join public.events e on e.id = g.event_id
                 where g.id = rsvps.guest_id and e.user_id = auth.uid()));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events for each row execute procedure public.touch_updated_at();

-- ───────────────────────── Production hardening (idempotent; safe to re-run) ─────────────────────────

-- Guard against runaway payloads (1 MB plan, 512 KB ledger, 100 guests-per-insert is enforced in the app).
alter table public.events drop constraint if exists events_plan_size;
alter table public.events add constraint events_plan_size check (plan is null or pg_column_size(plan) < 1048576);
alter table public.events drop constraint if exists events_ledger_size;
alter table public.events add constraint events_ledger_size check (pg_column_size(ledger) < 524288);

-- Hot paths: RSVP dashboard joins and per-guest lookups.
create index if not exists rsvps_guest_idx on public.rsvps(guest_id);
create index if not exists guests_token_idx on public.guests(token);

-- Hygiene: bounded free-text columns.
alter table public.guests drop constraint if exists guests_text_len;
alter table public.guests add constraint guests_text_len check (
  coalesce(char_length(phone), 0) <= 30 and coalesce(char_length(group_name), 0) <= 80 and coalesce(char_length(diet), 0) <= 80
);
alter table public.rsvps drop constraint if exists rsvps_note_len;
alter table public.rsvps add constraint rsvps_note_len check (coalesce(char_length(note), 0) <= 300);

-- Defence in depth: the browser (anon/authenticated roles) can never write RSVPs directly.
revoke insert, update, delete on public.rsvps from anon, authenticated;
