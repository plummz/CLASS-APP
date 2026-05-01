-- ============================================================
-- Migration 014: Repair reviewer_votes table deployment
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviewer_votes (
  id BIGSERIAL PRIMARY KEY,
  reviewer_id BIGINT NOT NULL REFERENCES public.reviewers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviewer_votes_reviewer_id
  ON public.reviewer_votes(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviewer_votes_user_id
  ON public.reviewer_votes(user_id);

ALTER TABLE public.reviewer_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviewer_votes select all" ON public.reviewer_votes;
CREATE POLICY "reviewer_votes select all"
  ON public.reviewer_votes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "reviewer_votes insert own" ON public.reviewer_votes;
CREATE POLICY "reviewer_votes insert own"
  ON public.reviewer_votes
  FOR INSERT
  WITH CHECK (user_id = public.class_app_username());

DROP POLICY IF EXISTS "reviewer_votes delete own" ON public.reviewer_votes;
CREATE POLICY "reviewer_votes delete own"
  ON public.reviewer_votes
  FOR DELETE
  USING (user_id = public.class_app_username());
