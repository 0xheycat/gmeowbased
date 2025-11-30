-- ============================================================================
-- Automated Cleanup Jobs using pg_cron
-- ============================================================================
-- Created: November 30, 2025
-- Purpose: Set up automated cleanup jobs for maintenance tasks
-- 
-- Jobs:
-- 1. Notification history cleanup (weekly, Sunday 2 AM UTC)
-- 2. Frame session cleanup (daily, 4 AM UTC)
-- 3. Quest expiration (daily, 3 AM UTC)
-- 
-- Additional updates:
-- - Add metadata column to xp_transactions table for rich context
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- Schema Updates: xp_transactions metadata column
-- ============================================================================

-- Add metadata column to xp_transactions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'xp_transactions' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE xp_transactions ADD COLUMN metadata JSONB DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_metadata 
      ON xp_transactions USING GIN (metadata);
  END IF;
END $$;

-- ============================================================================
-- Function: cleanup_old_notifications
-- ============================================================================
-- Purpose: Delete notification history older than 90 days
-- Returns: Count of deleted rows
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_notification_history
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup results
  RAISE NOTICE 'Cleaned up % old notifications', deleted_count;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_notifications IS 
  'Deletes notification history older than 90 days. Called weekly by pg_cron.';

-- ============================================================================
-- Function: cleanup_expired_frame_sessions
-- ============================================================================
-- Purpose: Delete frame sessions older than 24 hours
-- Returns: Count of deleted rows
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_frame_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM frame_sessions
  WHERE updated_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % expired frame sessions', deleted_count;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_frame_sessions IS 
  'Deletes frame sessions older than 24 hours. Called daily by pg_cron.';

-- ============================================================================
-- Function: expire_old_quests
-- ============================================================================
-- Purpose: Mark expired quests as 'expired' status
-- Returns: Count of expired quests
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_quests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update user quests that are past expiration
  UPDATE user_quests
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE status IN ('available', 'in_progress')
    AND expires_at < NOW()
    AND expires_at IS NOT NULL;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RAISE NOTICE 'Expired % user quests', expired_count;
  
  RETURN expired_count;
END;
$$;

COMMENT ON FUNCTION expire_old_quests IS 
  'Marks expired user quests as expired. Called daily by pg_cron.';

-- ============================================================================
-- pg_cron Job Schedules
-- ============================================================================

-- Job 1: Notification Cleanup (Weekly on Sunday at 2 AM UTC)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * 0',  -- Sunday 2 AM UTC
  $$SELECT cleanup_old_notifications()$$
);

-- Job 2: Frame Session Cleanup (Daily at 4 AM UTC)
SELECT cron.schedule(
  'cleanup-expired-frame-sessions',
  '0 4 * * *',  -- Daily 4 AM UTC
  $$SELECT cleanup_expired_frame_sessions()$$
);

-- Job 3: Quest Expiration (Daily at 3 AM UTC)
SELECT cron.schedule(
  'expire-old-quests',
  '0 3 * * *',  -- Daily 3 AM UTC
  $$SELECT expire_old_quests()$$
);

-- ============================================================================
-- Verify Jobs
-- ============================================================================

-- Query to verify scheduled jobs
-- SELECT * FROM cron.job ORDER BY jobname;

COMMENT ON EXTENSION pg_cron IS 
  'Automated maintenance jobs for Gmeowbased. Jobs: notification cleanup (weekly), frame cleanup (daily), quest expiration (daily).';
