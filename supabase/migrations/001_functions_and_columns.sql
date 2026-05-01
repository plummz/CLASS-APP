-- Migration 001: Helper functions + column additions
-- Run in Supabase SQL editor before any other migrations.

create or replace function public.class_app_username()
returns text language plpgsql stable as $$
declare headers jsonb := '{}'::jsonb;
begin
  begin headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  exception when others then headers := '{}'::jsonb; end;
  return nullif(headers->>'x-class-username', '');
end; $$;

create or replace function public.class_app_is_admin()
returns boolean language sql stable as $$
  select public.class_app_username() = 'Marquillero'; $$;

alter table public.profiles
  add column if not exists username_last_changed_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists avatar text;

alter table public.folders
  add column if not exists permissions jsonb not null
    default '{"viewers":[],"editors":[],"everyone":"edit"}'::jsonb,
  add column if not exists folder_type text;

update public.folders
set permissions = coalesce(permissions,'{}')::jsonb || '{"everyone":"edit"}'::jsonb
where not coalesce(permissions,'{}')::jsonb ? 'everyone';

alter table public.files
  add column if not exists moved_at timestamptz,
  add column if not exists is_original_upload boolean not null default true,
  add column if not exists source_file_id text;
