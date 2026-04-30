-- Migration 015: Admin table and RLS hardening
-- Improves identity safety by moving from hardcoded admin username to proper admin table
-- This is an incremental hardening step; full migration to JWT auth is covered in Phase 3

-- Create admins table to store admin status properly
create table if not exists public.admins (
  username text primary key,
  granted_at timestamptz not null default now(),
  granted_by text,
  reason text
);

-- Enable RLS on admins table
alter table public.admins enable row level security;

-- Anyone can view the list of admins (this is public info)
drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select using (true);

-- Only admins can insert new admins
drop policy if exists "admins insert admin" on public.admins;
create policy "admins insert admin" on public.admins for insert with check (public.class_app_is_admin());

-- Only admins can delete admins
drop policy if exists "admins delete admin" on public.admins;
create policy "admins delete admin" on public.admins for delete using (public.class_app_is_admin());

-- Seed the admins table with the original hardcoded admin
insert into public.admins (username, reason)
values ('Marquillero', 'Original hardcoded admin - seed during migration')
on conflict (username) do nothing;

-- Create updated is_admin function that checks the admins table
-- while still supporting the legacy hardcoded check as a fallback
create or replace function public.class_app_is_admin()
returns boolean language sql stable as $$
  select public.class_app_username() = 'Marquillero'
    or exists (select 1 from public.admins where username = public.class_app_username());
$$;

-- NOTE: The x-class-username header is still user-supplied and can be spoofed.
-- This migration hardens the admin check to use a database table, but the
-- fundamental weakness of x-class-username header-based identity persists.
-- Phase 3 (Auth Hardening) will address this by migrating to JWT-based auth.
