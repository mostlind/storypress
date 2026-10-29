-- Portraits storage, character lookup index, and the storybooks update policy.
--
-- The characters table itself already exists (see the 20260911033648 baseline),
-- so this migration only adds what is missing around it.

-- ── characters: integrity and lookup ────────────────────────────────────────

-- Every read of this table filters by project_id and orders by display_order.
create index if not exists characters_project_id_display_order_idx
  on public.characters (project_id, display_order);

-- project_id is nullable in the baseline. A character with no project is
-- invisible to the RLS policy and is never reached by the project cascade, so
-- it could only ever be orphaned data.
alter table public.characters
  alter column project_id set not null;

-- ── portraits bucket ────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('portraits', 'portraits', false)
on conflict (id) do nothing;

-- Portrait paths are "<project_id>/<character_id>.jpg", so ownership is checked
-- by joining the first path segment to a project the caller owns. Note this
-- differs from the photos bucket, whose paths start with the user id.
drop policy if exists "Users can manage portraits for own projects" on storage.objects;
create policy "Users can manage portraits for own projects"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'portraits'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'portraits'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );

-- ── storybooks bucket: allow a page to be overwritten ───────────────────────

-- "Users can upload storybooks" covers INSERT only. /api/beats/regenerate
-- re-uploads an existing object with upsert: true, which Postgres sees as an
-- UPDATE, so without this policy "Fix image" fails for everyone except the
-- worker, which uses the service role and bypasses RLS.
drop policy if exists "Users can update storybooks for own projects" on storage.objects;
create policy "Users can update storybooks for own projects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'storybooks'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'storybooks'
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[1]
        and p.user_id = auth.uid()
    )
  );
