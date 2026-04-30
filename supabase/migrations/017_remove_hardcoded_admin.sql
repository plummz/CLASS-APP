-- Migration 017: Remove hardcoded admin fallback
-- Hardens admin check to rely ONLY on the admins table
-- Previously class_app_is_admin() had a fallback to hardcoded 'Marquillero' username
-- This makes admin status table-driven and removable via database

create or replace function public.class_app_is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.admins where username = public.class_app_username());
$$;

-- Note: The x-class-username header is still user-supplied and can be spoofed.
-- This change hardens admin checks to be data-driven (table-based) rather than hardcoded.
-- The fundamental weakness of x-class-username header-based identity persists.
-- Phase 3 (Auth Hardening) will migrate to server-validated JWT claims in RLS context.
