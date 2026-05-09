-- Migration 027: Tetris leaderboard scores
-- Stores each game's score; server aggregates best-per-user for display.
-- IMPORTANT: Never DROP or TRUNCATE this table — scores must persist across deploys.

CREATE TABLE IF NOT EXISTS public.tetris_scores (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT NOT NULL,
  score      INTEGER NOT NULL DEFAULT 0,
  level      INTEGER NOT NULL DEFAULT 1,
  lines      INTEGER NOT NULL DEFAULT 0,
  played_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tetris_scores_score_idx
  ON public.tetris_scores(score DESC);

ALTER TABLE public.tetris_scores ENABLE ROW LEVEL SECURITY;

-- Scores are public-readable, only service-role key (backend) may write
CREATE POLICY "Public read tetris_scores" ON public.tetris_scores
  FOR SELECT USING (true);

CREATE POLICY "Service only write tetris_scores" ON public.tetris_scores
  FOR ALL USING (false);
