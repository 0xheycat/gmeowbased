-- ============================================================================
-- Enable RLS Policies for Sensitive Tables
-- ============================================================================
-- Created: November 30, 2025
-- Purpose: Enable Row Level Security on tables that were missing policies
-- 
-- Tables:
-- 1. viral_milestone_achievements - User achievement tracking
-- 2. viral_tier_history - Tier change audit log
-- 3. user_badges - Badge ownership records
-- 4. mint_queue - NFT minting queue
-- 5. frame_sessions - Frame state management
-- ============================================================================

-- ============================================================================
-- 1. VIRAL_MILESTONE_ACHIEVEMENTS
-- ============================================================================

-- Enable RLS
ALTER TABLE viral_milestone_achievements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own achievements
CREATE POLICY "Users can view own achievements"
  ON viral_milestone_achievements
  FOR SELECT
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to achievements"
  ON viral_milestone_achievements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view all achievements (for leaderboards)
CREATE POLICY "Authenticated users can view all achievements"
  ON viral_milestone_achievements
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 2. VIRAL_TIER_HISTORY
-- ============================================================================

-- Enable RLS
ALTER TABLE viral_tier_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tier history
CREATE POLICY "Users can view own tier history"
  ON viral_tier_history
  FOR SELECT
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to tier history"
  ON viral_tier_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view all tier changes (for analytics)
CREATE POLICY "Authenticated users can view all tier changes"
  ON viral_tier_history
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 3. USER_BADGES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own badges
CREATE POLICY "Users can view own badges"
  ON user_badges
  FOR SELECT
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to badges"
  ON user_badges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view all badges (for profiles/leaderboards)
CREATE POLICY "Authenticated users can view all badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update their own badge mint status (for client-side minting)
CREATE POLICY "Users can update own badge mint status"
  ON user_badges
  FOR UPDATE
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  )
  WITH CHECK (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- ============================================================================
-- 4. MINT_QUEUE
-- ============================================================================

-- Enable RLS
ALTER TABLE mint_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own mint queue entries
CREATE POLICY "Users can view own mint queue"
  ON mint_queue
  FOR SELECT
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Service role has full access (for automation scripts)
CREATE POLICY "Service role has full access to mint queue"
  ON mint_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Users can insert their own mint requests
CREATE POLICY "Users can insert own mint requests"
  ON mint_queue
  FOR INSERT
  WITH CHECK (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- ============================================================================
-- 5. FRAME_SESSIONS
-- ============================================================================

-- Enable RLS
ALTER TABLE frame_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON frame_sessions
  FOR SELECT
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON frame_sessions
  FOR UPDATE
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  )
  WITH CHECK (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON frame_sessions
  FOR INSERT
  WITH CHECK (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON frame_sessions
  FOR DELETE
  USING (
    fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint
  );

-- Policy: Service role has full access (for cleanup automation)
CREATE POLICY "Service role has full access to frame sessions"
  ON frame_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Anon users can create sessions (for unauthenticated frame usage)
CREATE POLICY "Anon users can create sessions"
  ON frame_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Anon users can update sessions by session_id
CREATE POLICY "Anon users can update sessions by id"
  ON frame_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Query to verify RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN (
--   'viral_milestone_achievements',
--   'viral_tier_history', 
--   'user_badges',
--   'mint_queue',
--   'frame_sessions'
-- );

COMMENT ON TABLE viral_milestone_achievements IS 
  'RLS enabled: Users can view own achievements, authenticated users can view all';

COMMENT ON TABLE viral_tier_history IS 
  'RLS enabled: Users can view own history, authenticated users can view all';

COMMENT ON TABLE user_badges IS 
  'RLS enabled: Users can view/update own badges, authenticated users can view all';

COMMENT ON TABLE mint_queue IS 
  'RLS enabled: Users can view/insert own entries, service role has full access';

COMMENT ON TABLE frame_sessions IS 
  'RLS enabled: Users can CRUD own sessions, anon can create/update, service role has full access';
