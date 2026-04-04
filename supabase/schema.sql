create extension if not exists pgcrypto;

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  builder_mode text not null,
  question_type text not null,
  difficulty text not null,
  exam_format text not null,
  question_count integer not null,
  source_text text,
  question_files jsonb not null default '[]'::jsonb,
  answer_files jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  responses jsonb,
  score integer,
  correct_count integer,
  wrong_count integer,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wrong_notes (
  id text primary key,
  user_id uuid not null,
  exam_title text not null,
  topic text not null,
  stem text not null,
  my_answer text not null,
  answer text not null,
  explanation text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.exam_attempts enable row level security;
alter table public.wrong_notes enable row level security;

drop policy if exists "Users manage own exam attempts" on public.exam_attempts;
create policy "Users manage own exam attempts"
on public.exam_attempts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own wrong notes" on public.wrong_notes;
create policy "Users manage own wrong notes"
on public.wrong_notes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
