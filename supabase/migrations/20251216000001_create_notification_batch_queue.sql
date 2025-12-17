/*
 * Notification Batch Queue - Phase 2 P6 (Notification Batching)
 * 
 * PURPOSE:
 * - Queue notifications for batching during quiet hours (10pm-8am local time)
 * - Throttle notifications to max 3 per hour per user
 * - Aggregate notifications into daily digests sent at 8am local time
 * - Priority-based delivery (achievement > tip > quest > badge)
 * 
 * FEATURES:
 * - Scheduled delivery based on user timezone
 * - Priority queue system (1-10, lower = higher priority)
 * - Failed delivery retry tracking
 * - Delivered_at timestamp for analytics
 * 
 * PHASE: Phase 2 P6 - Notification Batching
 * DATE: December 16, 2025
 * GOAL: Reduce notification fatigue by 30%, increase open rate by 20%
 * 
 * REFERENCE:
 * - Related table: user_notification_history (notification log)
 * - Related table: notification_preferences (user settings)
 * - Integration: lib/notification-batching.ts
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 */

-- ============================================================================
-- Table: notification_batch_queue
-- ============================================================================
-- Purpose: Queue notifications for batching and throttling
-- Use Case: Store notifications to be sent during optimal times
-- Populated: Via lib/notification-batching.ts shouldBatchNotification()
-- Processed: Via app/api/cron/send-digests/route.ts (runs at 8am UTC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_batch_queue (
  id BIGSERIAL PRIMARY KEY,
  
  -- User identification
  fid BIGINT NOT NULL,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL, -- 'achievement', 'tip', 'quest', 'badge', 'guild', 'gm', 'level', 'rank'
  priority INTEGER NOT NULL DEFAULT 5, -- 1 (highest) to 10 (lowest)
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL, -- When to send (8am local time)
  delivered_at TIMESTAMPTZ, -- Null until sent
  
  -- Retry tracking
  failed_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Payload (JSON data for notification)
  payload JSONB NOT NULL, -- {title, body, targetUrl, metadata}
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Index: Query pending notifications for a user
CREATE INDEX IF NOT EXISTS idx_notification_batch_queue_fid 
  ON notification_batch_queue(fid, delivered_at) 
  WHERE delivered_at IS NULL;

-- Index: Query notifications scheduled for delivery
CREATE INDEX IF NOT EXISTS idx_notification_batch_queue_scheduled 
  ON notification_batch_queue(scheduled_for, delivered_at) 
  WHERE delivered_at IS NULL;

-- Index: Query by priority for processing order
CREATE INDEX IF NOT EXISTS idx_notification_batch_queue_priority 
  ON notification_batch_queue(priority, scheduled_for) 
  WHERE delivered_at IS NULL;

-- Index: Query notifications by type for analytics
CREATE INDEX IF NOT EXISTS idx_notification_batch_queue_type 
  ON notification_batch_queue(notification_type, created_at DESC);

-- ============================================================================
-- Check Constraints
-- ============================================================================

-- Priority must be between 1 (highest) and 10 (lowest)
ALTER TABLE notification_batch_queue 
  ADD CONSTRAINT check_priority_range 
  CHECK (priority >= 1 AND priority <= 10);

-- Scheduled_for must be in the future or recent past (within 1 day)
ALTER TABLE notification_batch_queue 
  ADD CONSTRAINT check_scheduled_for_reasonable 
  CHECK (scheduled_for >= NOW() - INTERVAL '1 day');

-- Failed attempts must be non-negative
ALTER TABLE notification_batch_queue 
  ADD CONSTRAINT check_failed_attempts_non_negative 
  CHECK (failed_attempts >= 0);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE notification_batch_queue IS 
  'Queues notifications for batching and throttling. Sent at optimal times (8am local). Phase 2 P6.';

COMMENT ON COLUMN notification_batch_queue.fid IS 
  'Farcaster FID of the user receiving the notification';

COMMENT ON COLUMN notification_batch_queue.notification_type IS 
  'Type: achievement, tip, quest, badge, guild, gm, level, rank (used for digest grouping)';

COMMENT ON COLUMN notification_batch_queue.priority IS 
  'Priority: 1 (highest) to 10 (lowest). Achievement=1, Tip=3, Quest=5, Badge=7';

COMMENT ON COLUMN notification_batch_queue.scheduled_for IS 
  'When to send notification. Typically 8am in user timezone (quiet hours respected)';

COMMENT ON COLUMN notification_batch_queue.delivered_at IS 
  'Timestamp when notification was successfully delivered. NULL = pending';

COMMENT ON COLUMN notification_batch_queue.failed_attempts IS 
  'Number of failed delivery attempts. Max 3 retries before giving up';

COMMENT ON COLUMN notification_batch_queue.payload IS 
  'JSONB payload: {title, body, targetUrl, metadata}. Used for notification rendering';

-- ============================================================================
-- Helper Function: Cleanup Old Delivered Notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_batched_notifications()
RETURNS VOID AS $$
BEGIN
  -- Delete delivered notifications older than 7 days
  DELETE FROM notification_batch_queue
  WHERE delivered_at IS NOT NULL
    AND delivered_at < NOW() - INTERVAL '7 days';
  
  -- Delete failed notifications (3+ attempts) older than 3 days
  DELETE FROM notification_batch_queue
  WHERE failed_attempts >= 3
    AND created_at < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_batched_notifications IS 
  'Cleanup delivered notifications (7+ days old) and failed notifications (3+ days, 3+ attempts)';

-- Optional: Schedule cleanup with pg_cron (if available)
-- SELECT cron.schedule('cleanup-batched-notifications', '0 3 * * *', 'SELECT cleanup_old_batched_notifications()');

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE notification_batch_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do anything (for cron jobs and APIs)
CREATE POLICY "Service role full access"
  ON notification_batch_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Users can view their own queued notifications
CREATE POLICY "Users can view own queued notifications"
  ON notification_batch_queue FOR SELECT
  USING (fid = auth.uid()::bigint);

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ notification_batch_queue table created successfully';
  RAISE NOTICE '📊 Indexes: 4 indexes for optimal query performance';
  RAISE NOTICE '🔒 RLS: Enabled with 2 policies';
  RAISE NOTICE '🧹 Helper function: cleanup_old_batched_notifications()';
  RAISE NOTICE '🎯 Ready for Phase 2 P6 notification batching';
END $$;
