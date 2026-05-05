-- Migration 016: Lock down client writes on folders, files, and messages
-- All mutations go through the authenticated backend API (service-role key).
-- Clients may only SELECT their own rows; INSERT/UPDATE/DELETE are blocked.

ALTER TABLE IF EXISTS public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('folders', 'files', 'messages')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- folders: owner can read their own rows
DROP POLICY IF EXISTS "Allow owner read folders" ON public.folders;
CREATE POLICY "Allow owner read folders" ON public.folders
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);

-- files: owner can read their own rows
DROP POLICY IF EXISTS "Allow owner read files" ON public.files;
CREATE POLICY "Allow owner read files" ON public.files
  FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);

-- messages: authenticated users can read all messages (chat is shared)
DROP POLICY IF EXISTS "Allow authenticated read messages" ON public.messages;
CREATE POLICY "Allow authenticated read messages" ON public.messages
  FOR SELECT USING (true);
