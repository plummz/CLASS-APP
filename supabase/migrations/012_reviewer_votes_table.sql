-- ============================================================
-- Migration 012: Reviewer Votes Table (Upvoting & Trending)
-- ============================================================

-- Create reviewer_votes table for upvoting
CREATE TABLE IF NOT EXISTS public.reviewer_votes (
  id BIGSERIAL PRIMARY KEY,
  reviewer_id BIGINT NOT NULL REFERENCES public.reviewers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- One vote per user per reviewer
  UNIQUE(reviewer_id, user_id)
);

-- Create index for faster lookups by reviewer_id
CREATE INDEX IF NOT EXISTS idx_reviewer_votes_reviewer_id ON public.reviewer_votes(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_votes_user_id ON public.reviewer_votes(user_id);

-- Enable RLS
ALTER TABLE public.reviewer_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see all votes (for vote counts on cards)
DROP POLICY IF EXISTS "reviewer_votes select all" ON public.reviewer_votes;
CREATE POLICY "reviewer_votes select all" ON public.reviewer_votes
  FOR SELECT USING (true);

-- RLS Policy: Logged-in users can insert their own votes
DROP POLICY IF EXISTS "reviewer_votes insert own" ON public.reviewer_votes;
CREATE POLICY "reviewer_votes insert own" ON public.reviewer_votes
  FOR INSERT WITH CHECK (user_id = public.class_app_username());

-- RLS Policy: Users can delete their own votes
DROP POLICY IF EXISTS "reviewer_votes delete own" ON public.reviewer_votes;
CREATE POLICY "reviewer_votes delete own" ON public.reviewer_votes
  FOR DELETE USING (user_id = public.class_app_username());
