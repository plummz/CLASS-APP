-- Migration 003: Row Level Security policies
-- Depends on: 001 (helper functions), 002 (tables)

create or replace function public.class_app_can_view_folder(folder_row public.folders)
returns boolean language sql stable as $$
  select not (coalesce(folder_row.folder_type,'')='profile' or coalesce(folder_row.parent,'') like 'profile:%')
    or folder_row.owner = public.class_app_username()
    or public.class_app_is_admin()
    or coalesce(folder_row.permissions->>'everyone','edit') in ('view','edit')
    or coalesce(folder_row.permissions->'viewers','[]'::jsonb) ? public.class_app_username()
    or coalesce(folder_row.permissions->'editors','[]'::jsonb) ? public.class_app_username(); $$;

create or replace function public.class_app_can_edit_folder(folder_row public.folders)
returns boolean language sql stable as $$
  select public.class_app_is_admin()
    or folder_row.owner = public.class_app_username()
    or (not (coalesce(folder_row.folder_type,'')='profile' or coalesce(folder_row.parent,'') like 'profile:%')
        and public.class_app_username() is not null)
    or coalesce(folder_row.permissions->>'everyone','edit')='edit'
    or coalesce(folder_row.permissions->'editors','[]'::jsonb) ? public.class_app_username(); $$;

create or replace function public.class_app_can_place_folder(folder_parent text, folder_owner text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.class_app_is_admin()
    or (folder_owner = public.class_app_username()
        and (folder_parent is null or folder_parent='' or folder_parent='profile:'||public.class_app_username()
          or (folder_parent not like 'profile:%'
              and not exists (select 1 from public.folders pf where pf.id::text=folder_parent))
          or exists (select 1 from public.folders pf
              where pf.id::text=folder_parent and public.class_app_can_edit_folder(pf)))); $$;

alter table public.folders enable row level security;
alter table public.files   enable row level security;
alter table public.shared_ai_outputs    enable row level security;
alter table public.shared_announcements enable row level security;
alter table public.app_updates          enable row level security;
alter table public.code_lab_completions enable row level security;
alter table public.app_open_counts      enable row level security;

drop policy if exists "class folders select" on public.folders;
create policy "class folders select" on public.folders
  for select using (public.class_app_can_view_folder(folders));

drop policy if exists "class folders insert" on public.folders;
create policy "class folders insert" on public.folders
  for insert with check (public.class_app_can_place_folder(parent, owner));

drop policy if exists "class folders update" on public.folders;
create policy "class folders update" on public.folders
  for update using (public.class_app_is_admin() or owner=public.class_app_username())
  with check (public.class_app_can_place_folder(parent, owner));

drop policy if exists "class folders delete" on public.folders;
create policy "class folders delete" on public.folders
  for delete using (public.class_app_is_admin() or owner=public.class_app_username());

drop policy if exists "class files select" on public.files;
create policy "class files select" on public.files
  for select using (exists (
    select 1 from public.folders f
    where f.id::text=files.folder_id::text and public.class_app_can_view_folder(f)));

drop policy if exists "class files insert" on public.files;
create policy "class files insert" on public.files
  for insert with check (exists (
    select 1 from public.folders f
    where f.id::text=files.folder_id::text and public.class_app_can_edit_folder(f)));

drop policy if exists "class files update" on public.files;
create policy "class files update" on public.files
  for update using (exists (
    select 1 from public.folders f
    where f.id::text=files.folder_id::text and public.class_app_can_edit_folder(f)))
  with check (exists (
    select 1 from public.folders f
    where f.id::text=files.folder_id::text and public.class_app_can_edit_folder(f)));

drop policy if exists "class files delete" on public.files;
create policy "class files delete" on public.files
  for delete using (exists (
    select 1 from public.folders f
    where f.id::text=files.folder_id::text and public.class_app_can_edit_folder(f)));

drop policy if exists "shared ai read"          on public.shared_ai_outputs;
drop policy if exists "shared ai insert"        on public.shared_ai_outputs;
drop policy if exists "shared ai delete owner"  on public.shared_ai_outputs;
create policy "shared ai read"         on public.shared_ai_outputs for select using (true);
create policy "shared ai insert"       on public.shared_ai_outputs for insert with check (sharer=public.class_app_username());
create policy "shared ai delete owner" on public.shared_ai_outputs for delete using (sharer=public.class_app_username() or public.class_app_is_admin());

drop policy if exists "shared announcements read"   on public.shared_announcements;
drop policy if exists "shared announcements insert" on public.shared_announcements;
create policy "shared announcements read"   on public.shared_announcements for select using (true);
create policy "shared announcements insert" on public.shared_announcements for insert with check (sharer=public.class_app_username());

drop policy if exists "app updates read"         on public.app_updates;
drop policy if exists "app updates admin insert" on public.app_updates;
create policy "app updates read"         on public.app_updates for select using (active=true);
create policy "app updates admin insert" on public.app_updates for insert with check (public.class_app_is_admin());

drop policy if exists "code lab completions read"        on public.code_lab_completions;
drop policy if exists "code lab completions insert self" on public.code_lab_completions;
create policy "code lab completions read"        on public.code_lab_completions for select using (true);
create policy "code lab completions insert self" on public.code_lab_completions for insert with check (username=public.class_app_username() and points=1);

drop policy if exists "app open counts read"        on public.app_open_counts;
drop policy if exists "app open counts insert self" on public.app_open_counts;
drop policy if exists "app open counts update self" on public.app_open_counts;
create policy "app open counts read"        on public.app_open_counts for select using (true);
create policy "app open counts insert self" on public.app_open_counts for insert with check (username=public.class_app_username());
create policy "app open counts update self" on public.app_open_counts for update using (username=public.class_app_username()) with check (username=public.class_app_username());
