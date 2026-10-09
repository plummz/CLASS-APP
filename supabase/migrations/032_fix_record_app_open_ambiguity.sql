-- Applied 2026-10-09. The output column "username" clashed with app_open_counts.username
-- ("column reference is ambiguous"), so app opens were never recorded.
create or replace function public.class_app_record_app_open(p_local_count integer default 1)
returns table(username text, count integer, total bigint)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  actor text := public.class_app_username();
  local_count integer := greatest(1, coalesce(p_local_count, 1));
begin
  if actor is null then raise exception 'Missing CLASS APP username'; end if;
  insert into public.app_open_counts as a (username, count, last_opened_at, updated_at)
  values (actor, local_count, now(), now())
  on conflict (username) do update
    set count = greatest(a.count + 1, excluded.count),
        last_opened_at = now(), updated_at = now();
  return query select c.username, c.count,
    (select coalesce(sum(all_counts.count),0)::bigint from public.app_open_counts all_counts) as total
    from public.app_open_counts c where c.username = actor;
end; $$;
