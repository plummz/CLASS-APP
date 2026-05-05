-- Migration 026: Add tags column to user_notes for subject tagging
ALTER TABLE public.user_notes
  ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT NULL;
