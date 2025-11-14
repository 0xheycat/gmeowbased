-- Public schema wrappers for PostgREST configuration helpers
-- Generated on 2025-11-11

create or replace function public.http_set_config(name text, value text)
returns void
language sql
security definer
as $$
  select supabase_functions.http_set_config(name, value);
$$;

grant execute on function public.http_set_config(text, text) to service_role;

create or replace function public.http_refresh_schema_cache()
returns void
language sql
security definer
as $$
  select supabase_functions.http_refresh_schema_cache();
$$;

grant execute on function public.http_refresh_schema_cache() to service_role;
