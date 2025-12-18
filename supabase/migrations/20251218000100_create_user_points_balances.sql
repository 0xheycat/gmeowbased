-- Phase 3.4: Create user_points_balances table for quest escrow
-- 
-- Purpose: Store user points balances for escrow operations in unified quest system
-- Data Source: Synced from Subsquid indexer (hourly cron job)
-- 
-- Architecture:
-- - Subsquid: Source of truth for real-time points calculations
-- - Supabase: Cached snapshot for escrow operations (quest creation deductions)
-- - Sync Pattern: Hourly cron → Subsquid getUserStatsByFID() → UPDATE user_points_balances
-- 
-- Performance:
-- - Quest creation escrow: <50ms (local Supabase read + write)
-- - Sync overhead: <5 seconds per 1000 users (batch UPDATE)
-- 
-- Created: December 18, 2025 (Phase 3 Migration)

CREATE TABLE IF NOT EXISTS user_points_balances (
  fid BIGINT PRIMARY KEY,
  base_points BIGINT NOT NULL DEFAULT 0 CHECK (base_points >= 0),
  viral_xp BIGINT NOT NULL DEFAULT 0 CHECK (viral_xp >= 0),
  guild_bonus BIGINT NOT NULL DEFAULT 0 CHECK (guild_bonus >= 0),
  total_points BIGINT NOT NULL GENERATED ALWAYS AS (base_points + viral_xp + guild_bonus) STORED,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quest escrow lookups (FID → points balance)
CREATE INDEX IF NOT EXISTS idx_user_points_balances_fid ON user_points_balances(fid);

-- Index for sync monitoring (find stale balances older than 2 hours)
CREATE INDEX IF NOT EXISTS idx_user_points_balances_sync ON user_points_balances(last_synced_at);

-- Row Level Security (RLS)
ALTER TABLE user_points_balances ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access (quest creation checks)
CREATE POLICY "Allow public read access"
  ON user_points_balances
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Policy: Allow service role full access (sync cron)
CREATE POLICY "Allow service role full access"
  ON user_points_balances
  FOR ALL
  TO service_role
  USING (true);

COMMENT ON TABLE user_points_balances IS 'Cached user points balances for quest escrow operations. Synced hourly from Subsquid indexer.';
COMMENT ON COLUMN user_points_balances.fid IS 'Farcaster FID (primary key)';
COMMENT ON COLUMN user_points_balances.base_points IS 'Base points from activities (e.g., GM posts, quests)';
COMMENT ON COLUMN user_points_balances.viral_xp IS 'Viral XP from cast engagement';
COMMENT ON COLUMN user_points_balances.guild_bonus IS 'Guild bonus points';
COMMENT ON COLUMN user_points_balances.total_points IS 'Computed total: base_points + viral_xp + guild_bonus';
COMMENT ON COLUMN user_points_balances.last_synced_at IS 'Last sync timestamp from Subsquid';
COMMENT ON COLUMN user_points_balances.updated_at IS 'Last update timestamp';
