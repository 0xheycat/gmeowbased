/*
 * Add read_at Column to user_notification_history
 * 
 * PURPOSE: Track when notifications are marked as read
 * - Enables "unread" filter in notification dropdown
 * - Supports mark as read/unread API
 * - Separates read state from dismissed state
 * 
 * PHASE: Phase 6.1 - Week 1 Day 1-2 (December 15, 2025)
 * REFERENCE: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (Lines 1415-1420)
 * 
 * COLUMNS:
 * - read_at: TIMESTAMPTZ (nullable) - When notification was marked as read
 *   - NULL = unread
 *   - NOT NULL = read (with timestamp)
 *   - Separate from dismissed_at (different concerns)
 * 
 * INDEXES:
 * - idx_notification_read_status: Filter by read_at IS NULL (fast unread queries)
 * - idx_notification_read_at: Sort by read timestamp (analytics)
 * 
 * DATE: December 15, 2025
 */

-- Add read_at column to user_notification_history
ALTER TABLE user_notification_history
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Create index for filtering by read status (NULL = unread, NOT NULL = read)
-- Used by: NotificationBell.tsx filterTab='unread' query
-- Query: SELECT * FROM user_notification_history WHERE read_at IS NULL
CREATE INDEX IF NOT EXISTS idx_notification_read_status 
ON user_notification_history(fid, read_at) 
WHERE read_at IS NULL;

-- Create index for read_at timestamp (for analytics and sorting)
-- Used by: Future analytics queries, sort by read time
CREATE INDEX IF NOT EXISTS idx_notification_read_at 
ON user_notification_history(read_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN user_notification_history.read_at IS 
'Timestamp when notification was marked as read. NULL = unread, NOT NULL = read. Separate from dismissed_at.';
