-- Allow admin to delete shared announcements
create policy "shared announcements delete"
  on public.shared_announcements
  for delete
  using (public.class_app_username() = 'Marquillero');
