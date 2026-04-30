-- Migration 020: Document current identity model and Phase 3 migration plan
-- IMPORTANT: This file documents the current authentication architecture and its limitations

/*
CURRENT IDENTITY MODEL (Phases 1-2):
=====================================
- Backend: Uses JWT tokens for authentication (Bearer token in Authorization header)
- Supabase: Uses x-class-username header for identity (set by frontend)
- Risk: x-class-username header is user-controlled and can be spoofed by the frontend

HARDENING DONE IN PHASE 2:
=========================
1. Admin status moved from hardcoded 'Marquillero' to admins table
2. Admin functions restricted to authenticated users only
3. Audit logging added for sensitive operations
4. Backend validation improved with requireSelfOrAdmin middleware
5. Backend Supabase calls now validate authenticated user match

REMAINING LIMITATIONS:
====================
- Frontend creates Supabase client directly with x-class-username header
- This header is read from localStorage (user-controlled)
- Supabase RLS policies cannot validate this header server-side
- An attacker controlling the frontend could set x-class-username to any value

PHASE 3 MIGRATION PATH (Future):
===============================
Phase 3 should migrate from x-class-username header to Supabase JWT authentication:

Option A: Use Supabase native auth
  - Create Supabase auth users linked to class-app usernames
  - Have Supabase generate JWTs for authenticated users
  - Frontend embeds JWT in Authorization header for Supabase calls
  - Supabase RLS policies check JWT claims instead of x-class-username header

Option B: Server-side Supabase proxy
  - Move all Supabase data operations through backend
  - Backend validates JWT token, then makes Supabase calls
  - Frontend calls backend API instead of Supabase directly
  - Backend sets x-class-username header ONLY for calls from authenticated users

CURRENT OPERATION MODE:
======================
The app currently operates in a hybrid mode where:
1. Backend authenticates users with JWT
2. Frontend stores JWT in localStorage
3. Frontend also directly queries Supabase with x-class-username header
4. Backend handles auth-protected API endpoints

This hybrid mode is safe IF frontend cannot be compromised.
If frontend can be compromised (e.g., XSS), the x-class-username header can be spoofed.

MONITORING:
===========
- Check operation_audit_log table for suspicious patterns
- Monitor for operations where actor_username doesn't match expected patterns
- Alert on admin operations to detect unauthorized privilege escalation
*/

-- Verify that the admins table exists and is properly seeded
select count(*) as admin_count from public.admins;

-- Verify that class_app_is_admin() uses the admins table
-- (The function should show no hardcoded fallback for 'Marquillero' in Phase 2+)
