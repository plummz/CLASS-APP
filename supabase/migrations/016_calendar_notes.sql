-- Migration 016: Create calendar_notes table
-- Tracks calendar notes per date

CREATE TABLE IF NOT EXISTS public.calendar_notes (
  id BIGSERIAL PRIMARY KEY,
  date_key TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date_key)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calendar_notes_date_key ON public.calendar_notes(date_key);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_updated_by ON public.calendar_notes(updated_by);

-- Enable RLS
ALTER TABLE public.calendar_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can view all calendar notes
DROP POLICY IF EXISTS "Users can view calendar notes" ON public.calendar_notes;
CREATE POLICY "Users can view calendar notes"
  ON public.calendar_notes
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can create/update calendar notes
DROP POLICY IF EXISTS "Users can manage calendar notes" ON public.calendar_notes;
CREATE POLICY "Users can manage calendar notes"
  ON public.calendar_notes
  FOR INSERT
  WITH CHECK (public.class_app_username() IS NOT NULL);

-- RLS Policy: Allow update (for upsert)
DROP POLICY IF EXISTS "Users can update calendar notes" ON public.calendar_notes;
CREATE POLICY "Users can update calendar notes"
  ON public.calendar_notes
  FOR UPDATE
  USING (true);

-- RLS Policy: Allow delete
DROP POLICY IF EXISTS "Users can delete calendar notes" ON public.calendar_notes;
CREATE POLICY "Users can delete calendar notes"
  ON public.calendar_notes
  FOR DELETE
  USING (public.class_app_username() IS NOT NULL);
