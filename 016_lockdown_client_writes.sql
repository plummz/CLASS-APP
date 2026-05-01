-- Migration 016: Lockdown Client Writes for Folders, Files, and Messages
-- Force all writes to go through the secure backend endpoints

-- Enable RLS on the tables if not already enabled
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing insert/update/delete policies that may have allowed direct client writes
-- We will use a DO block to safely drop policies if they exist
DO $$ 
DECLARE 
    pol_rec record;
BEGIN
    FOR pol_rec IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('folders', 'files', 'messages') 
          AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_rec.policyname, pol_rec.tablename);
    END LOOP;
END $$;

-- Ensure SELECT is still allowed so the client can read data
DROP POLICY IF EXISTS "Allow public read folders" ON folders;
CREATE POLICY "Allow public read folders" ON folders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read files" ON files;
CREATE POLICY "Allow public read files" ON files FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read messages" ON messages;
CREATE POLICY "Allow public read messages" ON messages FOR SELECT USING (true);