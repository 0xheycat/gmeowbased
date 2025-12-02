-- ========================================
-- Leaderboard V2.2 Database Schema
-- ========================================
-- Creates leaderboard_calculations table with scoring breakdown
-- Implements 6-source scoring formula + rank tracking
-- 
-- Formula: Base Points + Viral XP + Guild Bonus + Referral Bonus + Streak Bonus + Badge Prestige
-- 
-- Reference: docs/phase-reports/LEADERBOARD-SYSTEM-REVIEW.md (100% approved)
-- Implementation: lib/leaderboard-scorer.ts

CREATE TABLE IF NOT EXISTS leaderboard_calculations (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  farcaster_fid INTEGER NOT NULL,
  
  -- Scoring breakdown (6 sources)
  base_points INTEGER DEFAULT 0 NOT NULL,        -- Quest points from contract
  viral_xp INTEGER DEFAULT 0 NOT NULL,            -- Viral bonuses from badge_casts
  guild_bonus INTEGER DEFAULT 0 NOT NULL,         -- Guild level * 100
  referral_bonus INTEGER DEFAULT 0 NOT NULL,      -- Referral count * 50
  streak_bonus INTEGER DEFAULT 0 NOT NULL,        -- GM streak * 10
  badge_prestige INTEGER DEFAULT 0 NOT NULL,      -- Badge count * 25
  
  -- Auto-calculated total score (generated column)
  total_score INTEGER GENERATED ALWAYS AS (
    base_points + viral_xp + guild_bonus + 
    referral_bonus + streak_bonus + badge_prestige
  ) STORED,
  
  -- Ranking metadata
  global_rank INTEGER,                            -- Position in leaderboard (1 = top)
  rank_change INTEGER DEFAULT 0,                  -- Change from previous period (positive = moved up)
  rank_tier TEXT,                                 -- Tier name from IMPROVED_RANK_TIERS
  
  -- Time tracking
  period TEXT DEFAULT 'all_time' NOT NULL,        -- 'daily', 'weekly', 'all_time'
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_address_period UNIQUE(address, period),
  CONSTRAINT valid_period CHECK (period IN ('daily', 'weekly', 'all_time')),
  CONSTRAINT non_negative_scores CHECK (
    base_points >= 0 AND
    viral_xp >= 0 AND
    guild_bonus >= 0 AND
    referral_bonus >= 0 AND
    streak_bonus >= 0 AND
    badge_prestige >= 0
  )
);

-- ========================================
-- Performance Indexes
-- ========================================

-- Primary sorting index (most queries sort by total_score DESC)
CREATE INDEX idx_leaderboard_total_score ON leaderboard_calculations(total_score DESC);

-- Period filtering (daily/weekly/all_time switches)
CREATE INDEX idx_leaderboard_period ON leaderboard_calculations(period);

-- User lookups by FID
CREATE INDEX idx_leaderboard_fid ON leaderboard_calculations(farcaster_fid);

-- Rank-based queries (e.g., "get top 100")
CREATE INDEX idx_leaderboard_global_rank ON leaderboard_calculations(global_rank) WHERE global_rank IS NOT NULL;

-- Address lookups
CREATE INDEX idx_leaderboard_address ON leaderboard_calculations(address);

-- Composite index for period + score (most common query pattern)
CREATE INDEX idx_leaderboard_period_score ON leaderboard_calculations(period, total_score DESC);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

ALTER TABLE leaderboard_calculations ENABLE ROW LEVEL SECURITY;

-- Public read access (leaderboard is public data)
CREATE POLICY "Allow public read access"
  ON leaderboard_calculations FOR SELECT
  USING (true);

-- Service role full access (for cron job updates)
CREATE POLICY "Allow service_role full access"
  ON leaderboard_calculations FOR ALL
  USING (auth.role() = 'service_role');

-- ========================================
-- Update Trigger (auto-update updated_at)
-- ========================================

CREATE OR REPLACE FUNCTION update_leaderboard_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard_calculations_updated_at
  BEFORE UPDATE ON leaderboard_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_calculations_updated_at();

-- ========================================
-- Grant Permissions
-- ========================================

-- Ensure anon role can read
GRANT SELECT ON leaderboard_calculations TO anon;

-- Ensure authenticated users can read
GRANT SELECT ON leaderboard_calculations TO authenticated;

-- Service role needs full access for cron updates
GRANT ALL ON leaderboard_calculations TO service_role;

-- ========================================
-- Comments (documentation)
-- ========================================

COMMENT ON TABLE leaderboard_calculations IS 'Leaderboard V2.2 - Multi-source scoring system with rank tracking';
COMMENT ON COLUMN leaderboard_calculations.base_points IS 'Quest completion points from on-chain contract events';
COMMENT ON COLUMN leaderboard_calculations.viral_xp IS 'Viral engagement bonuses from badge_casts table';
COMMENT ON COLUMN leaderboard_calculations.guild_bonus IS 'Guild level multiplier (level * 100)';
COMMENT ON COLUMN leaderboard_calculations.referral_bonus IS 'Referral network rewards (count * 50)';
COMMENT ON COLUMN leaderboard_calculations.streak_bonus IS 'Daily GM streak consistency (streak * 10)';
COMMENT ON COLUMN leaderboard_calculations.badge_prestige IS 'Badge collection prestige (count * 25)';
COMMENT ON COLUMN leaderboard_calculations.total_score IS 'Auto-calculated sum of all scoring sources (generated column)';
COMMENT ON COLUMN leaderboard_calculations.global_rank IS 'Global position in leaderboard (1 = top player)';
COMMENT ON COLUMN leaderboard_calculations.rank_change IS 'Position change from previous period (positive = moved up)';
COMMENT ON COLUMN leaderboard_calculations.rank_tier IS 'Rank tier name from 12-tier system (Signal Kitten → Omniversal Being)';
COMMENT ON COLUMN leaderboard_calculations.period IS 'Time period scope (daily/weekly/all_time)';

-- ========================================
-- End of Migration
-- ========================================
