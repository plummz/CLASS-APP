-- Applied 2026-10-09 (step B). The username comes only from the server-signed pass (verified JWT
-- claim class_username). The browser-supplied x-class-username header is no longer trusted.
create or replace function public.class_app_username()
returns text language plpgsql stable set search_path = public as $$
declare claims jsonb := '{}'::jsonb;
begin
  begin claims := coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb;
  exception when others then claims := '{}'::jsonb; end;
  return nullif(claims->>'class_username', '');
end; $$;
