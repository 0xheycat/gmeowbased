-- ====================================
-- TIP SYSTEM CLEANUP MIGRATION
-- Removes old USDC/hybrid tip tables
-- Prepares for mention-based rebuild
-- Date: December 9, 2025
-- ====================================

-- PURPOSE:
-- The existing tip system uses unprofessional wallet-to-wallet pattern.
-- This migration removes all old tables to prepare for Farcaster-native
-- mention-based tip system (@gmeowbased send 100 points to @user).
--
-- See: docs/features/TIP-SYSTEM-PROFESSIONAL-ARCHITECTURE.md

-- BACKUP REQUIRED:
-- Before applying, backup existing data:
-- pg_dump $DATABASE_URL \
--   --table=public.tips \
--   --table=public.tip_leaderboard \
--   --table=public.tip_streaks \
--   --data-only \
--   --file=backups/tip-system-backup-$(date +%Y%m%d).sql

-- ====================================
-- 1. Drop old tip tables
-- ====================================

DROP TABLE IF EXISTS public.tip_streaks CASCADE;
DROP TABLE IF EXISTS public.tip_leaderboard CASCADE;
DROP TABLE IF EXISTS public.tips CASCADE;

COMMENT ON SCHEMA public IS 'Old tip tables removed 2025-12-09 - ready for mention-based system rebuild';

-- ====================================
-- 2. Create new mention-based tips table
-- ====================================

CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender (from Farcaster cast author)
  sender_fid BIGINT NOT NULL,
  sender_username TEXT,
  sender_address TEXT NOT NULL,
  
  -- Receiver (from @mention in cast)
  receiver_fid BIGINT NOT NULL,
  receiver_username TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  
  -- Transaction (points only, no USDC)
  points_awarded BIGINT NOT NULL CHECK (points_awarded > 0),
  tx_hash TEXT NOT NULL UNIQUE,
  chain TEXT NOT NULL DEFAULT 'base',
  
  -- Context (Farcaster cast that triggered tip)
  cast_hash TEXT NOT NULL UNIQUE,
  cast_url TEXT NOT NULL,
  cast_text TEXT,
  parent_cast_hash TEXT,
  
  -- Bot interaction
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  bot_replied BOOLEAN DEFAULT FALSE,
  bot_cast_hash TEXT,
  bot_cast_url TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Foreign keys (optional - profiles may not exist yet)
  CONSTRAINT fk_sender FOREIGN KEY (sender_fid) REFERENCES user_profiles(fid) ON DELETE SET NULL,
  CONSTRAINT fk_receiver FOREIGN KEY (receiver_fid) REFERENCES user_profiles(fid) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_tips_sender ON tips(sender_fid, created_at DESC);
CREATE INDEX idx_tips_receiver ON tips(receiver_fid, created_at DESC);
CREATE INDEX idx_tips_cast_hash ON tips(cast_hash);
CREATE INDEX idx_tips_status ON tips(status) WHERE status = 'confirmed';
CREATE INDEX idx_tips_created_at ON tips(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tips_updated_at
  BEFORE UPDATE ON tips
  FOR EACH ROW
  EXECUTE FUNCTION update_tips_updated_at();

COMMENT ON TABLE tips IS 'Mention-based tip transactions from Farcaster casts (@gmeowbased send X points to @user)';
COMMENT ON COLUMN tips.cast_hash IS 'Hash of original cast that mentioned @gmeowbased with tip command';
COMMENT ON COLUMN tips.bot_replied IS 'Whether @gmeowbased bot sent confirmation reply';
COMMENT ON COLUMN tips.notification_sent IS 'Whether Farcaster notification sent to receiver via Neynar SDK';

-- ====================================
-- 3. Create leaderboard materialized view
-- ====================================

CREATE MATERIALIZED VIEW tip_leaderboard AS
SELECT
  -- User identity
  COALESCE(sender_fid, receiver_fid) AS fid,
  COALESCE(sender_username, receiver_username) AS username,
  
  -- Sender stats
  COUNT(*) FILTER (WHERE sender_fid = COALESCE(sender_fid, receiver_fid) AND status = 'confirmed') AS tips_sent_count,
  SUM(points_awarded) FILTER (WHERE sender_fid = COALESCE(sender_fid, receiver_fid) AND status = 'confirmed') AS total_points_sent,
  
  -- Receiver stats
  COUNT(*) FILTER (WHERE receiver_fid = COALESCE(sender_fid, receiver_fid) AND status = 'confirmed') AS tips_received_count,
  SUM(points_awarded) FILTER (WHERE receiver_fid = COALESCE(sender_fid, receiver_fid) AND status = 'confirmed') AS total_points_received,
  
  -- Combined stats
  COUNT(*) FILTER (WHERE status = 'confirmed') AS total_tips,
  SUM(points_awarded) FILTER (WHERE status = 'confirmed') AS total_points,
  
  -- Timestamps
  MAX(created_at) AS last_tip_at,
  MIN(created_at) AS first_tip_at
  
FROM tips
WHERE status = 'confirmed'
GROUP BY COALESCE(sender_fid, receiver_fid), COALESCE(sender_username, receiver_username);

CREATE UNIQUE INDEX idx_tip_leaderboard_fid ON tip_leaderboard(fid);
CREATE INDEX idx_tip_leaderboard_points_received ON tip_leaderboard(total_points_received DESC NULLS LAST);
CREATE INDEX idx_tip_leaderboard_points_sent ON tip_leaderboard(total_points_sent DESC NULLS LAST);

COMMENT ON MATERIALIZED VIEW tip_leaderboard IS 'Aggregated tip statistics per user (refresh manually after batch operations)';

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_tip_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tip_leaderboard;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_tip_leaderboard IS 'Call after batch tip operations to update leaderboard stats';

-- ====================================
-- 4. RLS Policies (Security)
-- ====================================

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Anyone can read confirmed tips (public leaderboard)
CREATE POLICY "Anyone can read confirmed tips"
  ON tips FOR SELECT
  USING (status = 'confirmed');

-- Only service role can insert/update tips (backend only)
CREATE POLICY "Service role can insert tips"
  ON tips FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update tips"
  ON tips FOR UPDATE
  USING (auth.role() = 'service_role');

COMMENT ON POLICY "Anyone can read confirmed tips" ON tips IS 'Public read access for leaderboard display';
COMMENT ON POLICY "Service role can insert tips" ON tips IS 'Only backend webhook handler can create tips';

-- ====================================
-- VERIFICATION QUERIES
-- ====================================

-- Check new table structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'tips' 
-- ORDER BY ordinal_position;

-- Verify leaderboard view:
-- SELECT * FROM tip_leaderboard LIMIT 10;

-- Check RLS policies:
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'tips';
