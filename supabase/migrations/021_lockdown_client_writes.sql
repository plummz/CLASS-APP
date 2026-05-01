-- Migration 021: Lock down all direct browser writes on sensitive tables
-- Depends on: 003 (RLS enabled on folders/files), 016 (calendar_notes)
-- Status: PENDING — run after migration 020
--
-- PURPOSE:
-- This is the most security-critical migration. It removes every
-- INSERT / UPDATE / DELETE policy that allowed browser clients to
-- directly mutate folders, files, messages, or calendar_notes.
--
-- After this migration:
--   - Browser clients can only READ these tables (via SELECT policies).
--   - All writes must go through the authenticated backend API (server.js),
--     which uses SUPABASE_SERVICE_KEY that bypasses RLS.
--   - Even a spoofed x-class-username header cannot write to these tables.
--
-- TABLES LOCKED DOWN:
--   folders         — no client INSERT/UPDATE/DELETE
--   files           — no client INSERT/UPDATE/DELETE
--   messages        — no client INSERT/UPDATE/DELETE
--   calendar_notes  — no client INSERT/UPDATE/DELETE (already blocked in 016)
--
-- TABLES NOT LOCKED DOWN HERE (lower risk, identity-non-critical):
--   message_reactions    — users add/remove their own emoji reactions
--   activity_log         — users log their own activity
--   shared_ai_outputs    — users share their own summaries
--   shared_announcements — users post their own announcements
--   code_lab_completions — users record their own completions
--   app_open_counts      — users increment their own count
--
-- ─────────────────────────────────────────────────────────────────

-- ENABLE RLS (idempotent — safe if already enabled)
alter table public.folders        enable row level security;
alter table public.files          enable row level security;
alter table public.messages       enable row level security;
alter table public.calendar_notes enable row level security;

-- ── FOLDERS ──────────────────────────────────────────────────────

-- Drop ALL existing INSERT / UPDATE / DELETE policies on folders
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where tablename = 'folders' and schemaname = 'public'
      and cmd in ('INSERT','UPDATE','DELETE','ALL')
  loop
    execute format('drop policy if exists %I on public.folders', r.policyname);
  end loop;
end $$;

-- Only the SELECT policy survives; anyone can read folders
drop policy if exists "Allow public read folders" on public.folders;
create policy "Allow public read folders"
  on public.folders for select using (true);

-- ── FILES ────────────────────────────────────────────────────────

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where tablename = 'files' and schemaname = 'public'
      and cmd in ('INSERT','UPDATE','DELETE','ALL')
  loop
    execute format('drop policy if exists %I on public.files', r.policyname);
  end loop;
end $$;

drop policy if exists "Allow public read files" on public.files;
create policy "Allow public read files"
  on public.files for select using (true);

-- ── MESSAGES ─────────────────────────────────────────────────────

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where tablename = 'messages' and schemaname = 'public'
      and cmd in ('INSERT','UPDATE','DELETE','ALL')
  loop
    execute format('drop policy if exists %I on public.messages', r.policyname);
  end loop;
end $$;

drop policy if exists "Allow public read messages" on public.messages;
create policy "Allow public read messages"
  on public.messages for select using (true);

-- ── CALENDAR NOTES ───────────────────────────────────────────────

-- Migration 016 already creates no client write policies.
-- These drops are a safety net in case any were added manually.
drop policy if exists "Users can manage calendar notes" on public.calendar_notes;
drop policy if exists "Users can update calendar notes" on public.calendar_notes;
drop policy if exists "Users can delete calendar notes" on public.calendar_notes;

-- Ensure the read policy is present
drop policy if exists "Users can view calendar notes" on public.calendar_notes;
create policy "Users can view calendar notes"
  on public.calendar_notes for select using (true);

-- ── VERIFICATION ─────────────────────────────────────────────────
-- Run this query after applying the migration to confirm lockdown:
-- select tablename, policyname, cmd
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('folders','files','messages','calendar_notes')
--   and cmd in ('INSERT','UPDATE','DELETE')
-- order by tablename, cmd;
-- Expected: zero rows returned.
