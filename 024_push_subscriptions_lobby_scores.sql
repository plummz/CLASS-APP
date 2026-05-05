-- Migration 024: Persist push_subscriptions and lobby_scores in Supabase
-- Replaces ephemeral data.json storage so data survives Render redeploys.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           BIGSERIAL PRIMARY KEY,
  username     TEXT NOT NULL,
  endpoint     TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (username, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- Only the service-role key (backend) may read/write
CREATE POLICY "Service only push_subscriptions" ON public.push_subscriptions
  FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS public.lobby_scores (
  username   TEXT PRIMARY KEY,
  score      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lobby_scores ENABLE ROW LEVEL SECURITY;
-- Scores are public-readable, only service-role may write
CREATE POLICY "Public read lobby_scores" ON public.lobby_scores
  FOR SELECT USING (true);
CREATE POLICY "Service only write lobby_scores" ON public.lobby_scores
  FOR ALL USING (false);
