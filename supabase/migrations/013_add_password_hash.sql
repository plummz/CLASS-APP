-- Migration 013: Add password_hash column to profiles
-- Depends on: 002 (profiles table)
--
-- NOTE: Do NOT enable RLS on profiles here. This app uses a custom
-- x-class-username header via class_app_username() — not Supabase Auth —
-- so auth.uid() is always NULL. Enabling RLS without a valid anon SELECT
-- policy would block all profile reads, including the login flow.
-- Security boundary is enforced server-side via JWT (requireAuth middleware).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
