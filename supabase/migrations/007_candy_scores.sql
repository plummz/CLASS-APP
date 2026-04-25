-- ── Candy Match leaderboard ──────────────────────────────────────────────
-- One row per player (upserted on best score). No dependency on custom RPCs
-- or class_app_username() — RLS is permissive so the frontend anon key works.

create table if not exists public.candy_scores (
  id           uuid primary key default gen_random_uuid(),
  username     text not null unique,
  display_name text,
  avatar       text,
  score        integer not null default 0,
  moves_used   integer not null default 0,
  achieved_at  timestamptz not null default now()
);

alter table public.candy_scores enable row level security;

-- Anyone can read the leaderboard
drop policy if exists "candy_scores_read_all" on public.candy_scores;
create policy "candy_scores_read_all"
  on public.candy_scores for select
  using (true);

-- Anyone (including anon) can insert their own row
drop policy if exists "candy_scores_insert_all" on public.candy_scores;
create policy "candy_scores_insert_all"
  on public.candy_scores for insert
  with check (true);

-- Anyone can update any row (frontend guards against overwriting a better score)
drop policy if exists "candy_scores_update_all" on public.candy_scores;
create policy "candy_scores_update_all"
  on public.candy_scores for update
  using (true);
