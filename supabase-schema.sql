-- ---------------------------------------------------------------------------
-- Schema für die Quiz-Website (Backend "supabase").
-- Im Supabase-Projekt unter SQL Editor einfügen und ausführen.
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Quizze -------------------------------------------------------------------

create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  questions   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Einstellungen: genau eine Zeile mit dem gerade aktiven Quiz ---------------

create table if not exists public.settings (
  id             int primary key default 1,
  active_quiz_id uuid references public.quizzes(id) on delete set null,
  updated_at     timestamptz not null default now(),
  constraint settings_single_row check (id = 1)
);

insert into public.settings (id, active_quiz_id)
values (1, null)
on conflict (id) do nothing;

-- Ergebnisse ---------------------------------------------------------------

create table if not exists public.results (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid references public.quizzes(id) on delete cascade,
  quiz_title  text,
  player_name text not null,
  score       int not null,
  total       int not null,
  answers     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists results_quiz_id_idx on public.results (quiz_id);
create index if not exists results_created_at_idx on public.results (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Besucher (Rolle "anon") dürfen Quizze lesen und ein Ergebnis eintragen.
-- Alles andere – Quizze anlegen/ändern/löschen, aktives Quiz setzen,
-- Ergebnisse lesen und löschen – erfordert eine Anmeldung ("authenticated").
-- ---------------------------------------------------------------------------

alter table public.quizzes  enable row level security;
alter table public.settings enable row level security;
alter table public.results  enable row level security;

-- Quizze: öffentlich lesbar, Schreiben nur angemeldet
drop policy if exists quizzes_read_public on public.quizzes;
create policy quizzes_read_public on public.quizzes
  for select using (true);

drop policy if exists quizzes_write_admin on public.quizzes;
create policy quizzes_write_admin on public.quizzes
  for all to authenticated using (true) with check (true);

-- Einstellungen: öffentlich lesbar (damit die Startseite das aktive Quiz kennt)
drop policy if exists settings_read_public on public.settings;
create policy settings_read_public on public.settings
  for select using (true);

drop policy if exists settings_write_admin on public.settings;
create policy settings_write_admin on public.settings
  for all to authenticated using (true) with check (true);

-- Ergebnisse: jeder darf eintragen, nur Angemeldete dürfen lesen und löschen
drop policy if exists results_insert_public on public.results;
create policy results_insert_public on public.results
  for insert with check (true);

drop policy if exists results_read_admin on public.results;
create policy results_read_admin on public.results
  for select to authenticated using (true);

drop policy if exists results_delete_admin on public.results;
create policy results_delete_admin on public.results
  for delete to authenticated using (true);
