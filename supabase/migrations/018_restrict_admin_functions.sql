-- Migration 018: Restrict admin function privileges
-- Removes overly broad grant of admin functions to 'anon' and authenticated users
-- These functions should only be callable by authenticated admins

-- Revoke previous overly-broad grants
revoke execute on function public.class_app_admin_delete_user(text) from anon, authenticated;
revoke execute on function public.class_app_admin_stats() from anon, authenticated;

-- Grant only to authenticated role (still checks class_app_is_admin() internally)
-- Note: This doesn't prevent the call, but it fails faster if user isn't authenticated
grant execute on function public.class_app_admin_delete_user(text) to authenticated;
grant execute on function public.class_app_admin_stats() to authenticated;

-- Create a safer wrapper function for admin stats that does permission check first
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
    'total_opens',   (select coalesce(sum(count),0) from public.app_open_counts)
  ) into result;

  return result;
end; $$;

grant execute on function public.class_app_admin_stats_safe() to authenticated;

-- Note: The x-class-username header-based identity is still not cryptographically secure.
-- These changes reduce the surface area of attack by:
-- 1. Requiring authentication (not allowing anon access)
-- 2. Adding explicit permission checks before operations
-- 3. Providing safer wrapper functions that check permissions first
