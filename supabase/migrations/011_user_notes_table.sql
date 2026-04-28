-- ============================================================
-- Migration 011: User Notes Table with RLS
-- ============================================================

-- Create user_notes table for Notepad cloud sync
CREATE TABLE IF NOT EXISTS user_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  shared_to_reviewers BOOLEAN DEFAULT FALSE,

  -- Ensure one user doesn't create duplicate notes
  UNIQUE(user_id, title, created_at)
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_updated_at ON user_notes(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notes
DROP POLICY IF EXISTS "Users can view their own notes" ON user_notes;
CREATE POLICY "Users can view their own notes"
  ON user_notes
  FOR SELECT
  USING (user_id = (SELECT username FROM auth.users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can insert their own notes
DROP POLICY IF EXISTS "Users can create their own notes" ON user_notes;
CREATE POLICY "Users can create their own notes"
  ON user_notes
  FOR INSERT
  WITH CHECK (user_id = (SELECT username FROM auth.users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can update their own notes
DROP POLICY IF EXISTS "Users can update their own notes" ON user_notes;
CREATE POLICY "Users can update their own notes"
  ON user_notes
  FOR UPDATE
  USING (user_id = (SELECT username FROM auth.users WHERE id = auth.uid() LIMIT 1))
  WITH CHECK (user_id = (SELECT username FROM auth.users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can delete their own notes
DROP POLICY IF EXISTS "Users can delete their own notes" ON user_notes;
CREATE POLICY "Users can delete their own notes"
  ON user_notes
  FOR DELETE
  USING (user_id = (SELECT username FROM auth.users WHERE id = auth.uid() LIMIT 1));
