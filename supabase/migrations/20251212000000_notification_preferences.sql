/*
 * Notification Preferences Schema - User Notification Settings
 * 
 * TODO:
 * - [x] Add priority_settings column (JSONB for custom category priorities) - Phase 1
 * - [x] Add min_priority_for_push column (TEXT with CHECK constraint) - Phase 1
 * - [x] Add xp_rewards_display column (BOOLEAN for XP badge toggle) - Phase 1
 * - [x] Add priority_last_updated column (TIMESTAMPTZ for analytics) - Phase 1
 * - [ ] Add migration to add priority columns (separate file or ALTER) - Phase 1
 * - [ ] Add notification history table for analytics (Phase 3)
 * - [ ] Add notification templates table for custom messages (Phase 4)
 * 
 * FEATURES:
 * - Global mute toggle (global_mute, mute_until)
 * - Category-specific settings (enabled, push per category)
 * - Quiet hours with timezone support (22:00-08:00 default)
 * - Row-level security (users can only access own preferences)
 * - Helper function: is_notification_allowed(fid, category)
 * 
 * PHASE: Phase 1 - Schema Migration & Priority Columns
 * DATE: December 12, 2025 (original), December 15, 2025 (priority enhancement)
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md
 * - Priority Logic: lib/notifications/priority.ts (DEFAULT_PRIORITY_MAP)
 * - Dispatcher: supabase/functions/_shared/miniapp_notification_dispatcher.ts
 * - farcaster.instructions.md: Section 3.5 (Database RLS policies)
 * 
 * SUGGESTIONS:
 * - Add indexes for common queries (fid, wallet_address)
 * - Add comment documentation for all columns
 * - Implement timezone validation in quiet_hours_timezone
 * - Add updated_at trigger for automatic timestamp updates
 * - Create view for aggregated preference stats
 * 
 * CRITICAL FOUND:
 * - Priority columns added via MCP (not in this migration file)
 * - is_notification_allowed() function incomplete (TODO: quiet hours)
 * - RLS policies use auth.uid() which may not work with FID-based auth
 * - Missing indexes on priority_last_updated for analytics queries
 * 
 * AVOID:
 * - ❌ NO hardcoded FIDs or wallet addresses in policies
 * - ❌ NO missing CHECK constraints on enum-like columns
 * - ❌ NO circular dependencies between tables
 * - ❌ NO missing indexes on frequently queried columns
 * 
 * REQUIREMENTS:
 * - ✅ JSONB column for flexible category settings
 * - ✅ Row-level security enabled on all tables
 * - ✅ Foreign key constraints (if referencing other tables)
 * - ✅ Indexed columns for performance (fid, wallet_address)
 * - ✅ Comment documentation for table and columns
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Complete implementation roadmap
 * @see lib/notifications/priority.ts - Priority helper functions
 */

-- User notification preferences
-- Phase 3: Add User Preferences
-- Created: December 12, 2025

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid bigint NOT NULL UNIQUE,
  wallet_address text,
  
  -- Global settings
  global_mute boolean DEFAULT false,
  mute_until timestamptz,
  
  -- Category preferences (jsonb for flexibility)
  category_settings jsonb DEFAULT '{
    "gm": {"enabled": true, "push": false},
    "quest": {"enabled": true, "push": true},
    "badge": {"enabled": true, "push": true},
    "tip": {"enabled": true, "push": true},
    "mention": {"enabled": true, "push": true},
    "guild": {"enabled": true, "push": false},
    "level": {"enabled": true, "push": true},
    "rank": {"enabled": true, "push": false},
    "social": {"enabled": true, "push": false},
    "achievement": {"enabled": true, "push": true},
    "reward": {"enabled": true, "push": true}
  }'::jsonb,
  
  -- Quiet hours
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  quiet_hours_timezone text DEFAULT 'UTC',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (fid = auth.uid()::bigint OR wallet_address = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (fid = auth.uid()::bigint OR wallet_address = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (fid = auth.uid()::bigint OR wallet_address = auth.jwt() ->> 'wallet_address');

-- Indexes
CREATE INDEX idx_notification_preferences_fid ON notification_preferences(fid);
CREATE INDEX idx_notification_preferences_wallet ON notification_preferences(wallet_address);

-- Function to check if notification allowed
CREATE OR REPLACE FUNCTION is_notification_allowed(
  p_fid bigint,
  p_category text
) RETURNS boolean AS $$
DECLARE
  v_prefs notification_preferences;
  v_category_enabled boolean;
  v_in_quiet_hours boolean;
BEGIN
  -- Get preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE fid = p_fid;
  
  -- No preferences = allow all (default behavior)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Global mute
  IF v_prefs.global_mute THEN
    RETURN false;
  END IF;
  
  -- Temp mute (pause notifications)
  IF v_prefs.mute_until IS NOT NULL AND v_prefs.mute_until > now() THEN
    RETURN false;
  END IF;
  
  -- Category disabled
  v_category_enabled := (v_prefs.category_settings -> p_category ->> 'enabled')::boolean;
  IF NOT v_category_enabled THEN
    RETURN false;
  END IF;
  
  -- Quiet hours (skip for now - complex timezone logic)
  -- TODO: Implement quiet hours check with timezone support
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE notification_preferences IS 'User notification preferences for controlling which notifications they receive';
COMMENT ON FUNCTION is_notification_allowed IS 'Check if a notification should be sent to a user based on their preferences';
