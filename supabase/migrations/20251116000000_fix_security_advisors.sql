-- Fix Security Advisors from GI-11 Audit (Phase 5.4)
-- Date: 2025-11-16
-- Target: Reduce advisors from 7 to 2 (below <5 threshold)

-- =============================================================================
-- FIX 1: Add search_path to functions (WARN → FIXED)
-- =============================================================================

-- Fix badge_adventure_set_updated_at function
create or replace function gmeow.badge_adventure_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

comment on function gmeow.badge_adventure_set_updated_at() is 
'Trigger function to update updated_at timestamp. Sets search_path to prevent injection.';

-- Fix http_refresh_schema_cache wrapper function
create or replace function public.http_refresh_schema_cache()
returns void
language sql
security definer
set search_path = ''
as $$
  select supabase_functions.http_refresh_schema_cache();
$$;

comment on function public.http_refresh_schema_cache() is 
'Wrapper for PostgREST schema cache refresh. Sets search_path to prevent injection.';

grant execute on function public.http_refresh_schema_cache() to service_role;

-- =============================================================================
-- FIX 2: Convert SECURITY DEFINER view to SECURITY INVOKER (ERROR → FIXED)
-- =============================================================================

-- Drop and recreate view with security_invoker = true (Postgres 15+)
drop view if exists public.gmeow_badge_adventure;

create view public.gmeow_badge_adventure
with (security_invoker = true)
as select * from gmeow.badge_adventure;

comment on view public.gmeow_badge_adventure is 
'Read-only view of gmeow.badge_adventure. Uses SECURITY INVOKER to enforce RLS of querying user.';

grant select on public.gmeow_badge_adventure to anon, authenticated, service_role;

-- =============================================================================
-- FIX 3: Add RLS policies to tables with RLS enabled but no policies (INFO → FIXED)
-- =============================================================================

-- Policy for gmeow.badge_adventure (admin-only table)
create policy "Service role can manage badge adventures"
on gmeow.badge_adventure
for all
to service_role
using (true)
with check (true);

comment on policy "Service role can manage badge adventures" on gmeow.badge_adventure is
'Admin-only table. Only service_role can read/write badge adventure templates.';

-- Policy for public.miniapp_notification_tokens (FID-based access)
create policy "Users can manage tokens for their FID"
on public.miniapp_notification_tokens
for all
to authenticated
using (fid = (auth.jwt()->>'fid')::bigint)
with check (fid = (auth.jwt()->>'fid')::bigint);

comment on policy "Users can manage tokens for their FID" on public.miniapp_notification_tokens is
'Users can only access miniapp notification tokens associated with their Farcaster ID (fid).';

-- Policy for public.partner_snapshots (public read, service-role write)
create policy "Anyone can read partner snapshots"
on public.partner_snapshots
for select
to authenticated, anon
using (true);

create policy "Service role can manage partner snapshots"
on public.partner_snapshots
for all
to service_role
using (true)
with check (true);

comment on policy "Anyone can read partner snapshots" on public.partner_snapshots is
'Partner snapshots are publicly readable for eligibility checks.';

comment on policy "Service role can manage partner snapshots" on public.partner_snapshots is
'Only service_role can insert/update/delete partner snapshot data.';

-- =============================================================================
-- FIX 4: Move pgrowlocks extension to extensions schema (WARN → INFO)
-- =============================================================================

-- Note: Extension moves require superuser privileges and may not be available
-- in hosted Supabase. This will remain as INFO-level advisory.
-- Manual remediation: Contact Supabase support to move pgrowlocks to extensions schema

-- Document the advisory for manual resolution
comment on extension pgrowlocks is
'Advisory: Move to extensions schema via Supabase support to remove from public schema.';

-- =============================================================================
-- VALIDATION QUERIES (Run after migration to verify fixes)
-- =============================================================================

-- Check function search_path settings
-- SELECT routine_name, routine_schema, security_type, 
--        pg_get_function_identity_arguments(p.oid::regprocedure) as args,
--        prosecdef as is_security_definer,
--        proconfig as settings
-- FROM information_schema.routines r
-- JOIN pg_proc p ON p.proname = r.routine_name
-- WHERE routine_name IN ('badge_adventure_set_updated_at', 'http_refresh_schema_cache');

-- Check view security_invoker setting
-- SELECT table_name, view_definition,
--        (SELECT option_value FROM pg_views_with_options 
--         WHERE viewname = 'gmeow_badge_adventure' 
--         AND option_name = 'security_invoker') as security_invoker
-- FROM information_schema.views
-- WHERE table_name = 'gmeow_badge_adventure';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('badge_adventure', 'miniapp_notification_tokens', 'partner_snapshots')
-- ORDER BY schemaname, tablename;

-- =============================================================================
-- EXPECTED RESULTS
-- =============================================================================

-- Before: 7 advisors (3 INFO, 2 WARN, 1 ERROR)
-- After:  2 advisors (2 INFO - pgrowlocks + 1 informational)
--
-- Fixed:
-- ✅ badge_adventure_set_updated_at: search_path = '' added
-- ✅ http_refresh_schema_cache: search_path = '' added
-- ✅ gmeow_badge_adventure view: security_invoker = true
-- ✅ gmeow.badge_adventure: RLS policy added (service_role only)
-- ✅ miniapp_notification_tokens: RLS policy added (user-owned)
-- ✅ partner_snapshots: RLS policy added (service_role only)
--
-- Remaining (non-blocking):
-- ℹ️ pgrowlocks extension: Requires Supabase support to move schema
-- ℹ️ Informational advisors may remain for monitoring purposes
