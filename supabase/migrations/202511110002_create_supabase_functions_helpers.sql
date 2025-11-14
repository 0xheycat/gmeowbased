-- Helper functions required to manage PostgREST configuration via HTTP RPC
-- Generated on 2025-11-11

create schema if not exists supabase_functions;

create or replace function supabase_functions.http_set_config(name text, value text)
returns void
language sql
security definer
set search_path = pg_catalog
as $$
  select set_config(name, coalesce(value, ''), true);
$$;

grant execute on function supabase_functions.http_set_config(text, text) to service_role;

grant usage on schema supabase_functions to service_role;

create or replace function supabase_functions.http_refresh_schema_cache()
returns void
language sql
security definer
set search_path = pg_catalog
as $$
  select pg_notify('pgrst', 'reload schema');
$$;

grant execute on function supabase_functions.http_refresh_schema_cache() to service_role;
