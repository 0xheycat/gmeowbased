-- @edit-start 2025-11-13 — Ensure bot config helpers exist
create or replace function public.http_get_config(name text)
returns text
language sql
security definer
set search_path = pg_catalog, public
as $$
  select current_setting(name, true)
$$;

create or replace function public.http_set_config(name text, value text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config(name, value, true);
end;
$$;

revoke all on function public.http_get_config(text) from public;
revoke all on function public.http_set_config(text, text) from public;

grant execute on function public.http_get_config(text) to service_role;
grant execute on function public.http_set_config(text, text) to service_role;
-- @edit-end
