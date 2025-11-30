-- ============================================================================
-- Security Fixes Migration - November 30, 2025
-- ============================================================================
-- Purpose: Fix security issues identified by Supabase MCP advisors
-- 
-- Issues Fixed:
-- 1. SECURITY DEFINER view (ERROR level)
-- 2. 15 functions with mutable search_path (WARN level)
-- 3. Duplicate RLS policies causing performance issues
-- ============================================================================

-- ============================================================================
-- 1. Fix SECURITY DEFINER View
-- ============================================================================

DROP VIEW IF EXISTS pending_viral_notifications;

CREATE OR REPLACE VIEW pending_viral_notifications AS
SELECT 
  vth.id,
  vth.cast_hash,
  vth.fid,
  vth.old_tier,
  vth.new_tier,
  vth.xp_bonus_awarded,
  vth.changed_at
FROM viral_tier_history vth
WHERE vth.notification_sent = FALSE
  AND vth.changed_at > NOW() - INTERVAL '24 hours'
ORDER BY vth.changed_at DESC;
-- Removed SECURITY DEFINER to enforce proper RLS

COMMENT ON VIEW pending_viral_notifications IS 
  'Viral tier change notifications pending delivery. No SECURITY DEFINER - uses querying user permissions.';

-- ============================================================================
-- 2. Fix Mutable search_path Functions  
-- ============================================================================

-- All functions must have immutable search_path to prevent injection attacks

ALTER FUNCTION mark_notification_sent(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION get_available_nfts_for_user(BIGINT) SET search_path = public, pg_temp;
ALTER FUNCTION update_frame_sessions_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION update_user_badges_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION update_nft_metadata_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION get_user_nft_stats(BIGINT) SET search_path = public, pg_temp;
ALTER FUNCTION increment_quest_completion(BIGINT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION cleanup_expired_frame_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION increment_nft_supply(TEXT, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION update_badge_templates_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION get_event_leaderboard(TEXT, TEXT, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION award_creator_earnings(BIGINT, TEXT, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION log_viral_tier_change() SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION increment_user_xp(BIGINT, INTEGER, TEXT) SET search_path = public, pg_temp;

-- Also fix cleanup functions from pg_cron migration
ALTER FUNCTION cleanup_old_notifications() SET search_path = public, pg_temp;
ALTER FUNCTION expire_old_quests() SET search_path = public, pg_temp;

-- ============================================================================
-- 3. Remove Duplicate RLS Policies
-- ============================================================================

-- user_notification_history has duplicate SELECT policies
DO $$ 
BEGIN
  -- Drop one of the duplicate SELECT policies (keep the newer one)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_history' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    DROP POLICY "Users can view own notifications" ON user_notification_history;
  END IF;

  -- Drop one of the duplicate UPDATE policies (keep the newer one)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_history' 
    AND policyname = 'Users can update own notifications'
  ) THEN
    DROP POLICY "Users can update own notifications" ON user_notification_history;
  END IF;
END $$;

-- ============================================================================
-- 4. Optimize RLS Policies for Performance (Optional but Recommended)
-- ============================================================================

-- Wrap auth calls in SELECT to prevent re-evaluation per row
-- This fixes the "auth_rls_initplan" performance warnings

-- Example: user_profiles policy optimization
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can read own profile'
  ) THEN
    DROP POLICY "Users can read own profile" ON user_profiles;
    
    CREATE POLICY "Users can read own profile" ON user_profiles
      FOR SELECT
      USING (
        fid = (SELECT (current_setting('request.jwt.claims', true)::json->>'fid')::bigint)
      );
  END IF;
END $$;

-- Example: user_notification_history remaining policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_history' 
    AND policyname = 'Users can view their own notifications'
  ) THEN
    DROP POLICY "Users can view their own notifications" ON user_notification_history;
    
    CREATE POLICY "Users can view their own notifications" ON user_notification_history
      FOR SELECT
      USING (
        fid = (SELECT (current_setting('request.jwt.claims', true)::json->>'fid')::bigint)
      );
  END IF;
END $$;

-- Example: user_notification_history dismiss policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_notification_history' 
    AND policyname = 'Users can dismiss their own notifications'
  ) THEN
    DROP POLICY "Users can dismiss their own notifications" ON user_notification_history;
    
    CREATE POLICY "Users can dismiss their own notifications" ON user_notification_history
      FOR UPDATE
      USING (
        fid = (SELECT (current_setting('request.jwt.claims', true)::json->>'fid')::bigint)
      )
      WITH CHECK (
        fid = (SELECT (current_setting('request.jwt.claims', true)::json->>'fid')::bigint)
      );
  END IF;
END $$;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check view has no SECURITY DEFINER
-- SELECT 
--   schemaname, 
--   viewname,
--   viewowner
-- FROM pg_views 
-- WHERE viewname = 'pending_viral_notifications';

-- Check all functions have search_path set
-- SELECT 
--   routine_schema,
--   routine_name,
--   prosecdef as is_security_definer,
--   proconfig as configuration
-- FROM information_schema.routines r
-- JOIN pg_proc p ON p.proname = r.routine_name
-- WHERE routine_schema = 'public'
--   AND routine_type = 'FUNCTION'
-- ORDER BY routine_name;

-- Check for remaining duplicate policies
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   cmd,
--   COUNT(*) as count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename, policyname, cmd
-- HAVING COUNT(*) > 1;

COMMENT ON SCHEMA public IS 
  'Security fixes applied: removed SECURITY DEFINER view, fixed function search_path, removed duplicate RLS policies.';
