-- Applied 2026-10-09 (step A). Username from the server-signed pass (JWT claim class_username) first,
-- old x-class-username header as a temporary fallback. Own-row rules for profiles and Pokemon saves,
-- admin check on the activity log, alarm functions limited to the service role.
create or replace function public.class_app_username()
returns text language plpgsql stable set search_path = public as $$
declare claims jsonb := '{}'::jsonb; headers jsonb := '{}'::jsonb;
begin
  begin claims := coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb;
  exception when others then claims := '{}'::jsonb; end;
  if nullif(claims->>'class_username', '') is not null then
    return claims->>'class_username';
  end if;
  begin headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  exception when others then headers := '{}'::jsonb; end;
  return nullif(headers->>'x-class-username', '');
end; $$;

alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
  using (username = public.class_app_username() or public.class_app_is_admin())
  with check (true);

alter table public.pokemon_saves enable row level security;
drop policy if exists "pokemon saves read" on public.pokemon_saves;
create policy "pokemon saves read" on public.pokemon_saves for select using (true);
drop policy if exists "pokemon saves insert own" on public.pokemon_saves;
create policy "pokemon saves insert own" on public.pokemon_saves for insert
  with check (username = public.class_app_username());
drop policy if exists "pokemon saves update own" on public.pokemon_saves;
create policy "pokemon saves update own" on public.pokemon_saves for update
  using (username = public.class_app_username()) with check (username = public.class_app_username());

create or replace function public.class_app_admin_activity_log(p_limit integer default 100)
returns table(id bigint, username text, action text, details text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.class_app_is_admin() then raise exception 'Admin only'; end if;
  return query select a.id, a.username, a.action, a.details, a.created_at
    from public.activity_log a order by a.created_at desc limit p_limit;
end; $$;
revoke execute on function public.class_app_admin_stats() from anon, authenticated, public;

revoke execute on function public.alarm_mark_triggered(bigint) from anon, authenticated, public;
revoke execute on function public.get_alarms_to_fire() from anon, authenticated, public;
revoke execute on function public.get_user_alarm_subscriptions(uuid) from anon, authenticated, public;
revoke execute on function public.delete_alarm_subscription(bigint) from anon, authenticated, public;
grant execute on function public.alarm_mark_triggered(bigint), public.get_alarms_to_fire(),
  public.get_user_alarm_subscriptions(uuid), public.delete_alarm_subscription(bigint) to service_role;

alter function public.class_app_is_admin() set search_path = public;
