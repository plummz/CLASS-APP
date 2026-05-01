-- Migration 015: Admin table and RLS hardening
-- Depends on: 001 (class_app_username, class_app_is_admin), 002 (tables)
-- Status: PENDING — run after migration 014
--
-- Purpose: Move admin status from a hardcoded username check to a
-- database-driven admins table. This allows admins to be added/removed
-- without redeploying code.
--
-- NOTE ON IDENTITY MODEL:
-- class_app_username() reads the x-class-username HTTP request header,
-- which is still browser-controlled at this phase. Migration 021 locks
-- down direct client writes so that even a spoofed header cannot modify
-- sensitive data. Migration 017 removes the hardcoded 'Marquillero'
-- fallback once this table is seeded.

-- Create admins table to store admin status properly
create table if not exists public.admins (
  username text primary key,
  granted_at timestamptz not null default now(),
  granted_by text,
  reason text
);

-- Enable RLS on admins table
alter table public.admins enable row level security;

-- Anyone can view the list of admins (admin list is not secret)
drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select using (true);

-- Only admins can insert new admins (prevents self-elevation)
drop policy if exists "admins insert admin" on public.admins;
create policy "admins insert admin" on public.admins
  for insert with check (public.class_app_is_admin());

-- Only admins can delete admins
drop policy if exists "admins delete admin" on public.admins;
create policy "admins delete admin" on public.admins
  for delete using (public.class_app_is_admin());

-- Seed the admins table with the bootstrap admin.
-- This is the ONLY place the admin username appears in SQL.
-- Migration 017 removes the hardcoded fallback from class_app_is_admin()
-- once this row exists.
insert into public.admins (username, reason)
values ('Marquillero', 'Bootstrap admin — seeded by migration 015')
on conflict (username) do nothing;

-- Update class_app_is_admin() to check the admins table.
-- The hardcoded 'Marquillero' fallback is kept here temporarily as a
-- safety net in case this migration runs before the table is populated.
-- Migration 017 removes that fallback.
create or replace function public.class_app_is_admin()
returns boolean language sql stable as $$
  select public.class_app_username() = 'Marquillero'
    or exists (select 1 from public.admins where username = public.class_app_username());
$$;
