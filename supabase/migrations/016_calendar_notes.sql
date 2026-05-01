-- Migration 016: Create calendar_notes table
-- Depends on: 001 (class_app_username), 002 (tables)
-- Status: PENDING — run after migration 015
--
-- Purpose: Per-date calendar notes shared across users.
-- Writes go through the backend API (requireAuth), so client-side
-- INSERT/UPDATE/DELETE policies are intentionally restrictive.
-- Migration 021 will fully lock down client writes; these policies
-- are already aligned with that intent.

create table if not exists public.calendar_notes (
  id bigserial primary key,
  date_key text not null,
  note text not null default '',
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(date_key)
);

create index if not exists idx_calendar_notes_date_key on public.calendar_notes(date_key);
create index if not exists idx_calendar_notes_updated_by on public.calendar_notes(updated_by);

alter table public.calendar_notes enable row level security;

-- Any authenticated session may read calendar notes
drop policy if exists "Users can view calendar notes" on public.calendar_notes;
create policy "Users can view calendar notes"
  on public.calendar_notes for select using (true);

-- Client writes are intentionally blocked; the backend uses the service
-- role key which bypasses RLS. These DROP statements ensure no leftover
-- permissive policies survive if this migration is re-run.
drop policy if exists "Users can manage calendar notes"  on public.calendar_notes;
drop policy if exists "Users can update calendar notes"  on public.calendar_notes;
drop policy if exists "Users can delete calendar notes"  on public.calendar_notes;

-- No INSERT / UPDATE / DELETE policies are created here.
-- All calendar note writes must go through the authenticated backend API.
