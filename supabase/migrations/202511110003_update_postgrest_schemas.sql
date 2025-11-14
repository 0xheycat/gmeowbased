-- Ensure PostgREST exposes the gmeow schema alongside public
-- Generated on 2025-11-11

select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select supabase_functions.http_set_config('db.schemas', 'public, supabase_functions, gmeow');

select supabase_functions.http_refresh_schema_cache();
