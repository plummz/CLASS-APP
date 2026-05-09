-- Migration 025: Add questions_json column to quiz_history for re-quiz feature
-- Stores the actual quiz questions so users can retake a past quiz without re-uploading.

ALTER TABLE public.quiz_history
  ADD COLUMN IF NOT EXISTS questions_json JSONB DEFAULT NULL;
