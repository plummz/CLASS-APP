-- Applied 2026-10-08. Password hashes must never be readable or writable from the browser, and the
-- browser must not be able to create, delete or wipe accounts. The server uses the service role.
revoke all on table public.profiles from anon, authenticated;
grant select (username, display_name, birthday, address, github, email, note, online, avatar, last_seen_at, username_last_changed_at)
  on public.profiles to anon, authenticated;
grant update (username, display_name, birthday, address, github, email, note, avatar, username_last_changed_at)
  on public.profiles to anon, authenticated;

-- Pokemon saves: keep read/insert/update (save + leaderboard), drop delete/truncate from the browser
revoke delete, truncate, references, trigger on table public.pokemon_saves from anon, authenticated;
