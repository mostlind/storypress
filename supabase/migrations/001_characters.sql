-- Migration 001 — characters, portraits bucket, and schema reconciliation
--
-- Run this in the Supabase SQL editor against an existing database.
-- Every statement is idempotent and non-destructive, so it is safe to re-run.

create extension if not exists "uuid-ossp";

-- ── Characters ───────────────────────────────────────────────────────────────
-- The cast of a storybook. Descriptions (including relationships) are fed into
-- the image prompt so Gemini draws the right people together.

create table if not exists characters (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  name text not null default '',
  description text not null default '',
  portrait_path text,                       -- storage path in the "portraits" bucket
  display_order integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists characters_project_id_display_order_idx
  on characters (project_id, display_order);

alter table characters enable row level security;

drop policy if exists "Users can manage characters on own projects" on characters;
create policy "Users can manage characters on own projects"
  on characters for all
  using (
    exists (
      select 1 from projects p
      where p.id = characters.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects p
      where p.id = characters.project_id and p.user_id = auth.uid()
    )
  );

-- ── Storage: portraits bucket ────────────────────────────────────────────────
-- Portrait paths are "<project_id>/<character_id>.jpg", so access is checked by
-- joining the first path segment to a project the caller owns. Note this differs
-- from the "photos" bucket, whose paths start with the user id.

insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', false)
on conflict (id) do nothing;

drop policy if exists "Users can manage portraits for own projects" on storage.objects;
create policy "Users can manage portraits for own projects"
  on storage.objects for all
  using (
    bucket_id = 'portraits'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'portraits'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );

-- ── Storage: storybooks bucket writes ────────────────────────────────────────
-- The worker writes here with the service role key (which bypasses RLS), but
-- /api/beats/regenerate re-generates a single page using the caller's own
-- session, so project owners need write access as well. Paths are
-- "<project_id>/beat-<n>.jpg".

drop policy if exists "Users can manage storybook images for own projects" on storage.objects;
create policy "Users can manage storybook images for own projects"
  on storage.objects for all
  using (
    bucket_id = 'storybooks'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'storybooks'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );

-- ── Reconcile storybooks with what the code actually reads and writes ────────
-- schema.sql had drifted: the app stores "beats", not "chapters", also writes
-- cover_pdf_path, and sets status to 'generating_images' between the two
-- generation phases.

alter table storybooks add column if not exists beats jsonb not null default '[]'::jsonb;
alter table storybooks add column if not exists cover_pdf_path text;

alter table storybooks drop constraint if exists storybooks_status_check;
alter table storybooks add constraint storybooks_status_check
  check (status in ('generating','generating_images','ready','failed'));

-- The legacy "chapters" column is left in place on purpose — dropping it would
-- destroy data on any project generated before the switch to beats. Once you
-- have confirmed nothing needs it:
--   alter table storybooks drop column chapters;
