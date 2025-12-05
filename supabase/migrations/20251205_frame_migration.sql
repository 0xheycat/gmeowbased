-- Frame Migration SQL Scripts
-- Version: 1.0
-- Date: December 5, 2025
-- Purpose: Migrate database schema for Frog-based Frame API

-- ============================================================================
-- PHASE 1: ADD NEW COLUMNS TO EXISTING TABLES
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Extend gmeow_rank_events table with frame tracking
-- ============================================================================

-- Add session tracking
ALTER TABLE gmeow_rank_events 
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES frame_sessions(session_id) ON DELETE SET NULL;

-- Add frame type classification
ALTER TABLE gmeow_rank_events 
ADD COLUMN IF NOT EXISTS frame_type text CHECK (
  frame_type IN (
    'quest', 'guild', 'points', 'referral', 'leaderboard',
    'gm', 'verify', 'stats', 'badge', 'generic'
  )
);

-- Add interaction tracking
ALTER TABLE gmeow_rank_events 
ADD COLUMN IF NOT EXISTS interaction_type text CHECK (
  interaction_type IN ('view', 'button', 'input', 'link', 'error')
);

-- Add security validation fields
ALTER TABLE gmeow_rank_events
ADD COLUMN IF NOT EXISTS signature_valid boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rate_limited boolean DEFAULT false;

-- Add performance metrics
ALTER TABLE gmeow_rank_events
ADD COLUMN IF NOT EXISTS duration_ms integer,
ADD COLUMN IF NOT EXISTS render_time_ms integer;

COMMENT ON COLUMN gmeow_rank_events.session_id IS 'Frame session UUID for tracking user journeys';
COMMENT ON COLUMN gmeow_rank_events.frame_type IS 'Type of frame that generated this event';
COMMENT ON COLUMN gmeow_rank_events.interaction_type IS 'User interaction type: view, button, input, link, error';
COMMENT ON COLUMN gmeow_rank_events.signature_valid IS 'Whether Farcaster signature was valid';
COMMENT ON COLUMN gmeow_rank_events.rate_limited IS 'Whether request was rate limited';
COMMENT ON COLUMN gmeow_rank_events.duration_ms IS 'Total request duration in milliseconds';
COMMENT ON COLUMN gmeow_rank_events.render_time_ms IS 'Frame render time in milliseconds';

-- ============================================================================
-- 2. Extend frame_sessions table
-- ============================================================================

-- Add frame type tracking
ALTER TABLE frame_sessions 
ADD COLUMN IF NOT EXISTS frame_type text CHECK (
  frame_type IN (
    'quest', 'guild', 'points', 'referral', 'leaderboard',
    'gm', 'verify', 'stats', 'badge', 'generic'
  )
);

-- Add interaction metrics
ALTER TABLE frame_sessions 
ADD COLUMN IF NOT EXISTS interaction_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_type text,
ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;

-- Add session expiration
ALTER TABLE frame_sessions 
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '1 hour');

-- Add metadata for additional context
ALTER TABLE frame_sessions 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN frame_sessions.frame_type IS 'Type of frame for this session';
COMMENT ON COLUMN frame_sessions.interaction_count IS 'Number of interactions in this session';
COMMENT ON COLUMN frame_sessions.last_interaction_type IS 'Last interaction type (button, input, etc)';
COMMENT ON COLUMN frame_sessions.last_interaction_at IS 'Timestamp of last interaction';
COMMENT ON COLUMN frame_sessions.expires_at IS 'Session expiration time (default 1 hour)';
COMMENT ON COLUMN frame_sessions.metadata IS 'Additional session context (quest progress, filters, etc)';

-- ============================================================================
-- 3. Add frame statistics to user_profiles
-- ============================================================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_frame_interaction timestamptz,
ADD COLUMN IF NOT EXISTS frame_stats jsonb DEFAULT '{
  "total_views": 0,
  "total_interactions": 0,
  "favorite_frame_type": null,
  "last_quest_viewed": null,
  "last_leaderboard_view": null
}'::jsonb;

COMMENT ON COLUMN user_profiles.last_frame_interaction IS 'Timestamp of last frame interaction';
COMMENT ON COLUMN user_profiles.frame_stats IS 'Aggregated frame usage statistics';

-- ============================================================================
-- 4. Add frame metadata to unified_quests
-- ============================================================================

ALTER TABLE unified_quests
ADD COLUMN IF NOT EXISTS frame_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS frame_metadata jsonb DEFAULT '{
  "total_frame_views": 0,
  "total_frame_interactions": 0,
  "verification_webhook_url": null,
  "custom_buttons": null
}'::jsonb;

COMMENT ON COLUMN unified_quests.frame_enabled IS 'Whether quest is available in frames';
COMMENT ON COLUMN unified_quests.frame_metadata IS 'Frame-specific quest metadata';

COMMIT;

-- ============================================================================
-- PHASE 2: CREATE NEW INDEXES FOR PERFORMANCE
-- ============================================================================

BEGIN;

-- Index for session-based event queries
CREATE INDEX IF NOT EXISTS idx_rank_events_session_id 
ON gmeow_rank_events(session_id) 
WHERE session_id IS NOT NULL;

-- Index for frame type analytics
CREATE INDEX IF NOT EXISTS idx_rank_events_frame_type_created 
ON gmeow_rank_events(frame_type, created_at DESC) 
WHERE frame_type IS NOT NULL;

-- Index for interaction type filtering
CREATE INDEX IF NOT EXISTS idx_rank_events_interaction_type 
ON gmeow_rank_events(interaction_type, created_at DESC) 
WHERE interaction_type IS NOT NULL;

-- Index for FID + frame type queries
CREATE INDEX IF NOT EXISTS idx_rank_events_fid_frame_type 
ON gmeow_rank_events(fid, frame_type, created_at DESC) 
WHERE fid IS NOT NULL AND frame_type IS NOT NULL;

-- Index for security event monitoring
CREATE INDEX IF NOT EXISTS idx_rank_events_security 
ON gmeow_rank_events(created_at DESC, signature_valid, rate_limited) 
WHERE signature_valid = false OR rate_limited = true;

-- Index for active sessions (not expired)
CREATE INDEX IF NOT EXISTS idx_frame_sessions_active 
ON frame_sessions(expires_at, fid) 
WHERE expires_at > now();

-- Index for session cleanup (expired sessions)
CREATE INDEX IF NOT EXISTS idx_frame_sessions_expired 
ON frame_sessions(expires_at) 
WHERE expires_at <= now();

-- Index for FID + frame type sessions
CREATE INDEX IF NOT EXISTS idx_frame_sessions_fid_type 
ON frame_sessions(fid, frame_type, updated_at DESC) 
WHERE frame_type IS NOT NULL;

-- Index for quest frame analytics
CREATE INDEX IF NOT EXISTS idx_unified_quests_frame_enabled 
ON unified_quests(frame_enabled, created_at DESC) 
WHERE frame_enabled = true;

-- Index for user frame statistics
CREATE INDEX IF NOT EXISTS idx_user_profiles_frame_interaction 
ON user_profiles(last_frame_interaction DESC) 
WHERE last_frame_interaction IS NOT NULL;

COMMIT;

-- ============================================================================
-- PHASE 3: CREATE NEW EVENT TYPES (NO SCHEMA CHANGES)
-- ============================================================================

-- New event types to be used in gmeow_rank_events.event_type:
-- 
-- Existing: 'gm', 'quest-verify', 'quest-create', 'tip', 'stats-query', 'stake', 'unstake'
-- 
-- New Frame Events:
-- - 'frame-view'          : Frame rendered for user
-- - 'frame-interaction'   : Button/input interaction
-- - 'frame-error'         : Frame error occurred
-- - 'session-start'       : New frame session created
-- - 'session-end'         : Frame session ended/expired
-- - 'quest-task-verify'   : Individual task verified (multi-step)
-- - 'quest-task-skip'     : Task skipped by user
-- - 'leaderboard-view'    : Leaderboard viewed
-- - 'badge-share'         : Badge shared via frame
-- - 'referral-click'      : Referral code clicked
--
-- Usage: No schema migration needed, just insert with new event_type values

-- ============================================================================
-- PHASE 4: CREATE HELPER FUNCTIONS
-- ============================================================================

BEGIN;

-- Function to clean up expired sessions (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_frame_sessions()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM frame_sessions
  WHERE expires_at <= now()
    AND updated_at < now() - interval '24 hours'; -- Keep for 24h after expiry
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_frame_sessions() IS 'Deletes expired frame sessions older than 24 hours';

-- Function to update frame stats on user profile
CREATE OR REPLACE FUNCTION update_user_frame_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update last_frame_interaction timestamp
  UPDATE user_profiles
  SET 
    last_frame_interaction = NEW.created_at,
    frame_stats = jsonb_set(
      frame_stats,
      '{total_interactions}',
      to_jsonb(COALESCE((frame_stats->>'total_interactions')::int, 0) + 1)
    )
  WHERE fid = NEW.fid;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update user frame stats
DROP TRIGGER IF EXISTS trigger_update_user_frame_stats ON gmeow_rank_events;
CREATE TRIGGER trigger_update_user_frame_stats
  AFTER INSERT ON gmeow_rank_events
  FOR EACH ROW
  WHEN (NEW.frame_type IS NOT NULL AND NEW.interaction_type IS NOT NULL)
  EXECUTE FUNCTION update_user_frame_stats();

COMMENT ON FUNCTION update_user_frame_stats() IS 'Auto-updates user profile frame statistics on new frame events';

-- Function to update quest frame metadata
CREATE OR REPLACE FUNCTION update_quest_frame_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Increment quest frame view counter
  IF NEW.event_type = 'frame-view' AND NEW.quest_id IS NOT NULL THEN
    UPDATE unified_quests
    SET frame_metadata = jsonb_set(
      frame_metadata,
      '{total_frame_views}',
      to_jsonb(COALESCE((frame_metadata->>'total_frame_views')::int, 0) + 1)
    )
    WHERE id = NEW.quest_id;
  END IF;
  
  -- Increment quest frame interaction counter
  IF NEW.event_type = 'frame-interaction' AND NEW.quest_id IS NOT NULL THEN
    UPDATE unified_quests
    SET frame_metadata = jsonb_set(
      frame_metadata,
      '{total_frame_interactions}',
      to_jsonb(COALESCE((frame_metadata->>'total_frame_interactions')::int, 0) + 1)
    )
    WHERE id = NEW.quest_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-update quest frame stats
DROP TRIGGER IF EXISTS trigger_update_quest_frame_stats ON gmeow_rank_events;
CREATE TRIGGER trigger_update_quest_frame_stats
  AFTER INSERT ON gmeow_rank_events
  FOR EACH ROW
  WHEN (NEW.frame_type = 'quest' AND NEW.quest_id IS NOT NULL)
  EXECUTE FUNCTION update_quest_frame_stats();

COMMENT ON FUNCTION update_quest_frame_stats() IS 'Auto-updates quest frame statistics on new frame events';

COMMIT;

-- ============================================================================
-- PHASE 5: UPDATE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

BEGIN;

-- Enable RLS on frame_sessions (if not already enabled)
ALTER TABLE frame_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON frame_sessions;
CREATE POLICY "Users can view own sessions"
  ON frame_sessions FOR SELECT
  USING (fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint);

-- Policy: Users can update their own sessions
DROP POLICY IF EXISTS "Users can update own sessions" ON frame_sessions;
CREATE POLICY "Users can update own sessions"
  ON frame_sessions FOR UPDATE
  USING (fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint);

-- Policy: Service role can manage all sessions (for cleanup)
DROP POLICY IF EXISTS "Service role full access" ON frame_sessions;
CREATE POLICY "Service role full access"
  ON frame_sessions FOR ALL
  USING (current_user = 'service_role');

-- Policy: Users can view their own rank events
DROP POLICY IF EXISTS "Users can view own rank events" ON gmeow_rank_events;
CREATE POLICY "Users can view own rank events"
  ON gmeow_rank_events FOR SELECT
  USING (fid = (current_setting('request.jwt.claims', true)::json->>'fid')::bigint);

-- Policy: Service role can insert rank events (API endpoints)
DROP POLICY IF EXISTS "Service role can insert events" ON gmeow_rank_events;
CREATE POLICY "Service role can insert events"
  ON gmeow_rank_events FOR INSERT
  WITH CHECK (current_user = 'service_role');

COMMIT;

-- ============================================================================
-- PHASE 6: CREATE ANALYTICS VIEWS
-- ============================================================================

BEGIN;

-- View: Frame usage statistics by type
CREATE OR REPLACE VIEW frame_usage_stats AS
SELECT 
  frame_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT fid) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
  COUNT(*) FILTER (WHERE signature_valid = false) as invalid_signatures,
  COUNT(*) FILTER (WHERE rate_limited = true) as rate_limited_requests
FROM gmeow_rank_events
WHERE frame_type IS NOT NULL
  AND created_at > now() - interval '7 days'
GROUP BY frame_type
ORDER BY total_events DESC;

COMMENT ON VIEW frame_usage_stats IS 'Frame usage statistics for last 7 days';

-- View: Quest frame performance
CREATE OR REPLACE VIEW quest_frame_performance AS
SELECT 
  q.id as quest_id,
  q.title,
  q.category,
  (q.frame_metadata->>'total_frame_views')::int as total_views,
  (q.frame_metadata->>'total_frame_interactions')::int as total_interactions,
  COUNT(qc.id) as total_completions,
  ROUND(
    COUNT(qc.id)::numeric / NULLIF((q.frame_metadata->>'total_frame_views')::numeric, 0) * 100,
    2
  ) as completion_rate_percent
FROM unified_quests q
LEFT JOIN quest_completions qc ON q.id = qc.quest_id
WHERE q.frame_enabled = true
GROUP BY q.id, q.title, q.category, q.frame_metadata
ORDER BY total_views DESC
LIMIT 100;

COMMENT ON VIEW quest_frame_performance IS 'Quest frame views, interactions, and completion rates';

-- View: User frame engagement
CREATE OR REPLACE VIEW user_frame_engagement AS
SELECT 
  up.fid,
  up.wallet_address,
  (up.frame_stats->>'total_views')::int as total_views,
  (up.frame_stats->>'total_interactions')::int as total_interactions,
  up.last_frame_interaction,
  COUNT(DISTINCT fs.session_id) as total_sessions,
  AVG(fs.interaction_count) as avg_interactions_per_session,
  MAX(fs.updated_at) as last_session_activity
FROM user_profiles up
LEFT JOIN frame_sessions fs ON up.fid = fs.fid
WHERE up.last_frame_interaction > now() - interval '30 days'
GROUP BY up.fid, up.wallet_address, up.frame_stats, up.last_frame_interaction
ORDER BY total_interactions DESC
LIMIT 100;

COMMENT ON VIEW user_frame_engagement IS 'User frame engagement metrics for last 30 days';

COMMIT;

-- ============================================================================
-- PHASE 7: MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Check if all columns were added successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('gmeow_rank_events', 'frame_sessions', 'user_profiles', 'unified_quests')
  AND column_name IN (
    'session_id', 'frame_type', 'interaction_type', 'signature_valid', 
    'rate_limited', 'duration_ms', 'render_time_ms', 'interaction_count',
    'last_interaction_type', 'last_interaction_at', 'expires_at',
    'last_frame_interaction', 'frame_stats', 'frame_enabled', 'frame_metadata'
  )
ORDER BY table_name, column_name;

-- Check if all indexes were created successfully
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%frame%'
ORDER BY tablename, indexname;

-- Check if all functions were created successfully
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN (
  'cleanup_expired_frame_sessions',
  'update_user_frame_stats',
  'update_quest_frame_stats'
);

-- Check if all triggers were created successfully
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%frame%'
ORDER BY event_object_table, trigger_name;

-- Check if all views were created successfully
SELECT 
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'frame_usage_stats',
    'quest_frame_performance',
    'user_frame_engagement'
  )
ORDER BY table_name;

-- ============================================================================
-- PHASE 8: SAMPLE DATA FOR TESTING (OPTIONAL)
-- ============================================================================

-- Insert sample frame events for testing
-- UNCOMMENT ONLY IN DEVELOPMENT/STAGING ENVIRONMENT

-- INSERT INTO gmeow_rank_events (
--   event_type, frame_type, interaction_type, chain, wallet_address, fid,
--   delta, total_points, level, tier_name, tier_percent,
--   signature_valid, rate_limited, duration_ms, render_time_ms,
--   metadata
-- ) VALUES
--   ('frame-view', 'quest', 'view', 'base', '0x1234...', 12345, 0, 1000, 5, 'Gold', 45.5, true, false, 1250, 850, '{"quest_id": 1}'),
--   ('frame-interaction', 'quest', 'button', 'base', '0x1234...', 12345, 10, 1010, 5, 'Gold', 46.0, true, false, 950, 650, '{"quest_id": 1, "button": "verify"}'),
--   ('frame-view', 'leaderboard', 'view', 'base', '0x5678...', 67890, 0, 500, 3, 'Silver', 30.2, true, false, 1100, 750, '{"period": "weekly"}'),
--   ('frame-error', 'quest', 'error', 'base', '0x1234...', 12345, 0, 1010, 5, 'Gold', 46.0, false, false, 2500, 0, '{"error": "Quest not found"}');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Final message
DO $$
BEGIN
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'Frame Migration SQL Scripts Completed Successfully!';
  RAISE NOTICE 'Version: 1.0';
  RAISE NOTICE 'Date: %', now();
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Added % new columns to existing tables', 19;
  RAISE NOTICE '- Created % new indexes for performance', 10;
  RAISE NOTICE '- Created % helper functions', 3;
  RAISE NOTICE '- Created % triggers for auto-updates', 2;
  RAISE NOTICE '- Updated RLS policies for security';
  RAISE NOTICE '- Created % analytics views', 3;
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Run verification queries above';
  RAISE NOTICE '2. Test helper functions with sample data';
  RAISE NOTICE '3. Deploy Frog framework migration';
  RAISE NOTICE '4. Monitor frame_usage_stats view';
  RAISE NOTICE '5. Set up cron job for cleanup_expired_frame_sessions()';
  RAISE NOTICE '==============================================================';
END $$;
