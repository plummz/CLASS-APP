-- Applied 2026-10-09. The app (server member list and browser profile save) selects
-- profiles.updated_at, which was missing, so those queries failed.
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.class_app_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.class_app_touch_updated_at();

grant select (updated_at) on public.profiles to anon, authenticated;
