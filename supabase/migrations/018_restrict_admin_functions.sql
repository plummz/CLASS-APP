-- Migration 018: Restrict admin function privileges
-- Depends on: 005 (class_app_admin_delete_user, class_app_admin_stats), 017
-- Status: PENDING — run after migration 017
--
-- Purpose: Migration 005 granted admin functions to 'anon, authenticated',
-- which means any unauthenticated browser can call them. This migration
-- revokes the anon grant and adds explicit admin permission checks.

-- Revoke anon grant from admin functions (safe even if already revoked)
do $$ begin
  revoke execute on function public.class_app_admin_delete_user(text) from anon;
exception when others then null; end $$;

do $$ begin
  revoke execute on function public.class_app_admin_stats() from anon;
exception when others then null; end $$;

-- Ensure authenticated role can still call these (they check is_admin internally)
do $$ begin
  grant execute on function public.class_app_admin_delete_user(text) to authenticated;
exception when others then null; end $$;

do $$ begin
  grant execute on function public.class_app_admin_stats() to authenticated;
exception when others then null; end $$;

-- Safer wrapper for admin stats that explicitly checks admin status first
create or replace function public.class_app_admin_stats_safe()
returns json language plpgsql stable security definer set search_path = public as $$
declare result json;
begin
  if not public.class_app_is_admin() then
    raise exception 'Admin privileges required';
  end if;

  select json_build_object(
    'total_users',   (select count(*) from public.profiles),
    'online_users',  (select count(*) from public.profiles where online = true),
    'total_messages',(select count(*) from public.messages),
    'total_files',   (select count(*) from public.files),
    'total_opens',   (select coalesce(sum(count), 0) from public.app_open_counts)
  ) into result;

  return result;
end; $$;

do $$ begin
  grant execute on function public.class_app_admin_stats_safe() to authenticated;
exception when others then null; end $$;
