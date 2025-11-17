-- ============================================================================
-- Phase 5.1: Real-time Viral Notifications Database Migration
-- ============================================================================
-- Project: Gmeowbased (@gmeowbased)
-- Founder: @heycat
-- Created: November 17, 2025
-- Source: Custom schema design for viral milestone tracking
-- MCP Verified: November 17, 2025
--
-- Purpose:
-- - Track viral milestone achievements (first viral, 10 viral casts, etc.)
-- - Log tier change history for analytics and notifications
-- - Automate tier change detection with PostgreSQL triggers
-- ============================================================================

-- ============================================================================
-- Table: viral_milestone_achievements
-- ============================================================================
-- Purpose: Track user achievements for viral milestones
-- Use Case: Award badges and XP bonuses when users hit milestones
-- Notification: Send push notification when achievement unlocked
-- ============================================================================

CREATE TABLE IF NOT EXISTS viral_milestone_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identification
  fid BIGINT NOT NULL REFERENCES user_profiles(fid) ON DELETE CASCADE,
  
  -- Achievement details
  achievement_type TEXT NOT NULL,
  -- Types: 'first_viral', '10_viral_casts', '100_shares', 'mega_viral_master'
  
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  
  -- Reference to triggering cast (if applicable)
  cast_hash TEXT,
  
  -- Extra metadata (XP awarded, tier at time of achievement, etc.)
  metadata JSONB DEFAULT '{}',
  
  -- Prevent duplicate achievements for same user
  UNIQUE(fid, achievement_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_viral_achievements_fid 
  ON viral_milestone_achievements(fid);

CREATE INDEX IF NOT EXISTS idx_viral_achievements_type 
  ON viral_milestone_achievements(achievement_type);

CREATE INDEX IF NOT EXISTS idx_viral_achievements_pending_notification 
  ON viral_milestone_achievements(notification_sent, achieved_at) 
  WHERE notification_sent = FALSE;

COMMENT ON TABLE viral_milestone_achievements IS 
  'Tracks viral milestone achievements for users. Source: Phase 5.1 design.';

COMMENT ON COLUMN viral_milestone_achievements.achievement_type IS 
  'Achievement identifier: first_viral, 10_viral_casts, 100_shares, mega_viral_master';

COMMENT ON COLUMN viral_milestone_achievements.metadata IS 
  'JSON metadata: {xp_awarded: 100, tier_at_achievement: "viral", total_count: 10}';

-- ============================================================================
-- Table: viral_tier_history
-- ============================================================================
-- Purpose: Log all tier changes for analytics and notifications
-- Use Case: Track progression, send tier upgrade notifications
-- Populated: Automatically via trigger on badge_casts UPDATE
-- ============================================================================

CREATE TABLE IF NOT EXISTS viral_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cast identification
  cast_hash TEXT NOT NULL,
  fid BIGINT NOT NULL REFERENCES user_profiles(fid) ON DELETE CASCADE,
  
  -- Tier change details
  old_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL,
  old_score NUMERIC NOT NULL,
  new_score NUMERIC NOT NULL,
  
  -- XP bonus awarded for tier upgrade
  xp_bonus_awarded INTEGER NOT NULL,
  
  -- Timestamp
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notification tracking
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_viral_tier_history_cast 
  ON viral_tier_history(cast_hash);

CREATE INDEX IF NOT EXISTS idx_viral_tier_history_fid 
  ON viral_tier_history(fid);

CREATE INDEX IF NOT EXISTS idx_viral_tier_history_time 
  ON viral_tier_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_viral_tier_history_pending_notification 
  ON viral_tier_history(notification_sent, changed_at) 
  WHERE notification_sent = FALSE;

COMMENT ON TABLE viral_tier_history IS 
  'Logs all viral tier changes for notifications and analytics. Auto-populated by trigger.';

COMMENT ON COLUMN viral_tier_history.xp_bonus_awarded IS 
  'Incremental XP bonus awarded for reaching new tier (difference between new and old tier XP)';

-- ============================================================================
-- Trigger Function: log_viral_tier_change
-- ============================================================================
-- Purpose: Automatically log tier changes to viral_tier_history
-- Fires: AFTER UPDATE on badge_casts when viral_tier changes
-- Quality Gate: GI-11 (safe calculations, no data loss)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_viral_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if tier actually changed (not just score update)
  IF NEW.viral_tier IS DISTINCT FROM OLD.viral_tier THEN
    INSERT INTO viral_tier_history (
      cast_hash,
      fid,
      old_tier,
      new_tier,
      old_score,
      new_score,
      xp_bonus_awarded
    ) VALUES (
      NEW.cast_hash,
      NEW.fid,
      COALESCE(OLD.viral_tier, 'none'),
      NEW.viral_tier,
      COALESCE(OLD.viral_score, 0),
      NEW.viral_score,
      COALESCE(NEW.viral_bonus_xp, 0) - COALESCE(OLD.viral_bonus_xp, 0)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_viral_tier_change() IS 
  'Trigger function to automatically log viral tier changes. Source: Phase 5.1.';

-- ============================================================================
-- Trigger: track_viral_tier_change
-- ============================================================================
-- Purpose: Attach log_viral_tier_change function to badge_casts table
-- Quality Gate: GI-11 (automatic data integrity, zero data loss)
-- ============================================================================

DROP TRIGGER IF EXISTS track_viral_tier_change ON badge_casts;

CREATE TRIGGER track_viral_tier_change
  AFTER UPDATE OF viral_tier ON badge_casts
  FOR EACH ROW
  EXECUTE FUNCTION log_viral_tier_change();

COMMENT ON TRIGGER track_viral_tier_change ON badge_casts IS 
  'Automatically logs tier changes to viral_tier_history for notifications.';

-- ============================================================================
-- Helper View: pending_viral_notifications
-- ============================================================================
-- Purpose: Easy query for webhook handler to find pending notifications
-- Use Case: Background job or real-time webhook can query this view
-- ============================================================================

CREATE OR REPLACE VIEW pending_viral_notifications AS
SELECT 
  'tier_upgrade' AS notification_type,
  vth.id,
  vth.fid,
  vth.cast_hash,
  vth.new_tier AS tier,
  vth.xp_bonus_awarded AS xp_bonus,
  vth.changed_at AS triggered_at,
  NULL AS achievement_type
FROM viral_tier_history vth
WHERE vth.notification_sent = FALSE
  AND vth.changed_at > NOW() - INTERVAL '24 hours' -- Only recent tier changes

UNION ALL

SELECT 
  'achievement' AS notification_type,
  vma.id,
  vma.fid,
  vma.cast_hash,
  NULL AS tier,
  (vma.metadata->>'xp_awarded')::INTEGER AS xp_bonus,
  vma.achieved_at AS triggered_at,
  vma.achievement_type
FROM viral_milestone_achievements vma
WHERE vma.notification_sent = FALSE
  AND vma.achieved_at > NOW() - INTERVAL '24 hours' -- Only recent achievements

ORDER BY triggered_at DESC;

COMMENT ON VIEW pending_viral_notifications IS 
  'Helper view to query pending notifications (tier upgrades + achievements). Source: Phase 5.1.';

-- ============================================================================
-- Helper Function: mark_notification_sent
-- ============================================================================
-- Purpose: Mark notification as sent in viral_tier_history or achievements
-- Quality Gate: GI-11 (safe updates with transaction)
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_type TEXT,
  p_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  IF p_notification_type = 'tier_upgrade' THEN
    UPDATE viral_tier_history
    SET 
      notification_sent = TRUE,
      notification_sent_at = NOW()
    WHERE id = p_id
      AND notification_sent = FALSE;
    
    v_updated := FOUND;
    
  ELSIF p_notification_type = 'achievement' THEN
    UPDATE viral_milestone_achievements
    SET 
      notification_sent = TRUE,
      notification_sent_at = NOW()
    WHERE id = p_id
      AND notification_sent = FALSE;
    
    v_updated := FOUND;
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_notification_sent(TEXT, UUID) IS 
  'Marks notification as sent in viral_tier_history or achievements table. Source: Phase 5.1.';

-- ============================================================================
-- Verification Queries (for testing)
-- ============================================================================
-- Run these after migration to verify tables created correctly
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'viral_milestone_achievements') THEN
    RAISE EXCEPTION 'Table viral_milestone_achievements not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'viral_tier_history') THEN
    RAISE EXCEPTION 'Table viral_tier_history not created';
  END IF;
  
  RAISE NOTICE 'Migration successful: All tables created';
END $$;

-- Verify trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'track_viral_tier_change' 
      AND event_object_table = 'badge_casts'
  ) THEN
    RAISE EXCEPTION 'Trigger track_viral_tier_change not created';
  END IF;
  
  RAISE NOTICE 'Migration successful: Trigger created';
END $$;

-- Verify view exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'pending_viral_notifications') THEN
    RAISE EXCEPTION 'View pending_viral_notifications not created';
  END IF;
  
  RAISE NOTICE 'Migration successful: View created';
END $$;

-- ============================================================================
-- Sample Test Data (for development only - remove in production)
-- ============================================================================
/*
-- Test achievement insertion
INSERT INTO viral_milestone_achievements (fid, achievement_type, cast_hash, metadata)
VALUES (
  12345,
  'first_viral',
  '0xtest123',
  '{"xp_awarded": 100, "tier_at_achievement": "viral"}'::JSONB
);

-- Test tier history (will be auto-populated by trigger in production)
-- Manually test trigger by updating a badge_casts viral_tier

-- Query pending notifications
SELECT * FROM pending_viral_notifications;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
