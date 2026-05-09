-- Migration 023: Lock down shared_ai_outputs, reviewers, and shared_announcements
-- Drops client write policies so the frontend must use the authenticated backend API.
-- Ensures RLS is enabled and SELECT is public/authenticated.

ALTER TABLE IF EXISTS public.shared_ai_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shared_announcements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('shared_ai_outputs', 'reviewers', 'shared_announcements')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Ensure read-only access for clients
DROP POLICY IF EXISTS "Allow public read shared_ai_outputs" ON public.shared_ai_outputs;
CREATE POLICY "Allow public read shared_ai_outputs" ON public.shared_ai_outputs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read reviewers" ON public.reviewers;
CREATE POLICY "Allow public read reviewers" ON public.reviewers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read shared_announcements" ON public.shared_announcements;
CREATE POLICY "Allow public read shared_announcements" ON public.shared_announcements FOR SELECT USING (true);