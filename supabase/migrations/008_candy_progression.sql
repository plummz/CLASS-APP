-- ── Candy Match progression ───────────────────────────────────────────────
-- candy_progress: one row per user (level, coins, equipped cosmetics)
-- candy_inventory: owned skins/effects per user
-- Permissive RLS — works with the Supabase anon key, no custom RPCs.

create table if not exists public.candy_progress (
  id              uuid primary key default gen_random_uuid(),
  username        text not null unique,
  highest_level   integer not null default 1,
  coins           integer not null default 0,
  equipped_skin   text not null default 'default',
  equipped_effect text not null default 'none',
  updated_at      timestamptz not null default now()
);

alter table public.candy_progress enable row level security;

create policy "candy_progress_all"
  on public.candy_progress for all
  using (true) with check (true);

-- candy_inventory: one row per (user, item) — unique constraint prevents duplicates
create table if not exists public.candy_inventory (
  id           uuid primary key default gen_random_uuid(),
  username     text not null,
  item_id      text not null,
  item_type    text not null check (item_type in ('skin', 'effect')),
  acquired_at  timestamptz not null default now(),
  unique (username, item_id)
);

alter table public.candy_inventory enable row level security;

create policy "candy_inventory_all"
  on public.candy_inventory for all
  using (true) with check (true);
