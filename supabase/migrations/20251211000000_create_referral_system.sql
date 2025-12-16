-- =====================================================
-- Referral System Database Schema
-- =====================================================
-- Created: December 11, 2025
-- Purpose: Support referral tracking, stats, and leaderboard
-- Dependencies: leaderboard_calculations table (existing)
--
-- Tables:
--   1. referral_stats - User referral statistics and leaderboard data
--   2. referral_activity - Event log for referral actions
--   3. referral_registrations - Code registration records (blockchain source of truth)

-- =====================================================
-- Table 1: referral_stats
-- =====================================================
-- Purpose: Aggregated referral statistics per user
-- Used by: /api/referral/leaderboard, /api/referral/[fid]/analytics

CREATE TABLE IF NOT EXISTS referral_stats (
  id BIGSERIAL PRIMARY KEY,
  fid INTEGER NOT NULL UNIQUE,                    -- Farcaster ID (primary identifier)
  address TEXT,                                   -- Ethereum wallet address
  username TEXT,                                  -- Farcaster username (for display)
  avatar TEXT,                                    -- Avatar URL (for display)
  
  -- Referral metrics
  total_referrals INTEGER DEFAULT 0 NOT NULL,     -- Total users referred
  successful_referrals INTEGER DEFAULT 0 NOT NULL,-- Referrals who completed action
  points_earned INTEGER DEFAULT 0 NOT NULL,       -- Total points from referrals
  
  -- Performance metrics
  conversion_rate DECIMAL(5,2) DEFAULT 0,         -- successful / total * 100
  growth_rate DECIMAL(5,2) DEFAULT 0,             -- Referral velocity (per day)
  
  -- Tier system
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  
  -- Ranking
  rank INTEGER,                                    -- Global ranking position
  rank_change INTEGER DEFAULT 0,                   -- Change from previous period
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT positive_referrals CHECK (total_referrals >= 0),
  CONSTRAINT positive_points CHECK (points_earned >= 0),
  CONSTRAINT valid_conversion CHECK (conversion_rate >= 0 AND conversion_rate <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_stats_fid ON referral_stats(fid);
CREATE INDEX IF NOT EXISTS idx_referral_stats_address ON referral_stats(address);
CREATE INDEX IF NOT EXISTS idx_referral_stats_total_referrals ON referral_stats(total_referrals DESC);
CREATE INDEX IF NOT EXISTS idx_referral_stats_points ON referral_stats(points_earned DESC);
CREATE INDEX IF NOT EXISTS idx_referral_stats_tier ON referral_stats(tier);
CREATE INDEX IF NOT EXISTS idx_referral_stats_rank ON referral_stats(rank);

-- Comments
COMMENT ON TABLE referral_stats IS 'Aggregated referral statistics per user for leaderboard and analytics';
COMMENT ON COLUMN referral_stats.fid IS 'Farcaster ID - primary user identifier';
COMMENT ON COLUMN referral_stats.total_referrals IS 'Count of all users referred by this user';
COMMENT ON COLUMN referral_stats.points_earned IS 'Total points earned from referral program';
COMMENT ON COLUMN referral_stats.tier IS 'Referral program tier based on performance';

-- =====================================================
-- Table 2: referral_activity
-- =====================================================
-- Purpose: Event log for all referral-related actions
-- Used by: /api/referral/activity/[fid]

CREATE TABLE IF NOT EXISTS referral_activity (
  id BIGSERIAL PRIMARY KEY,
  fid INTEGER NOT NULL,                           -- User who performed the action
  event_type TEXT NOT NULL,                       -- Type of activity event
  
  -- Event details
  referral_code TEXT,                             -- Associated referral code
  referred_fid INTEGER,                           -- FID of referred user (if applicable)
  points_awarded INTEGER DEFAULT 0,               -- Points earned from this event
  
  -- Metadata
  metadata JSONB,                                 -- Additional event data
  
  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'code_registered',      -- User registered a new referral code
    'code_used',            -- Someone used this user's code
    'referral_completed',   -- Referred user completed qualifying action
    'tier_upgraded',        -- User advanced to new tier
    'points_earned',        -- Points awarded
    'milestone_reached'     -- Achievement unlocked
  ))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_activity_fid ON referral_activity(fid);
CREATE INDEX IF NOT EXISTS idx_referral_activity_timestamp ON referral_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_referral_activity_event_type ON referral_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_referral_activity_code ON referral_activity(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_activity_referred_fid ON referral_activity(referred_fid);

-- Comments
COMMENT ON TABLE referral_activity IS 'Event log of all referral program activities';
COMMENT ON COLUMN referral_activity.event_type IS 'Type of referral event (code_registered, code_used, etc.)';
COMMENT ON COLUMN referral_activity.metadata IS 'Additional event context as JSON';

-- =====================================================
-- Table 3: referral_registrations
-- =====================================================
-- Purpose: Track referral code registrations and relationships
-- Source: Blockchain events (ReferralCodeRegistered, ReferrerSet)
-- Used by: Cron job sync, analytics

CREATE TABLE IF NOT EXISTS referral_registrations (
  id BIGSERIAL PRIMARY KEY,
  fid INTEGER NOT NULL,                           -- User's Farcaster ID
  wallet_address TEXT NOT NULL,                   -- User's wallet address
  referral_code TEXT UNIQUE NOT NULL,             -- User's unique referral code
  
  -- Referral chain
  referrer_fid INTEGER,                           -- FID of user who referred them
  referrer_code TEXT,                             -- Code used to join
  
  -- Blockchain data
  registration_tx TEXT,                           -- Transaction hash of code registration
  referrer_set_tx TEXT,                           -- Transaction hash of setReferrer call
  block_number BIGINT,                            -- Block where code was registered
  
  -- Timestamps
  registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT unique_fid_registration UNIQUE(fid),
  CONSTRAINT unique_wallet_registration UNIQUE(wallet_address)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_registrations_fid ON referral_registrations(fid);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_wallet ON referral_registrations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_code ON referral_registrations(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_referrer_fid ON referral_registrations(referrer_fid);
CREATE INDEX IF NOT EXISTS idx_referral_registrations_block ON referral_registrations(block_number);

-- Comments
COMMENT ON TABLE referral_registrations IS 'Referral code registrations synced from blockchain';
COMMENT ON COLUMN referral_registrations.referral_code IS 'Unique code registered on-chain via registerReferralCode()';
COMMENT ON COLUMN referral_registrations.referrer_fid IS 'FID of the user who referred this user';
COMMENT ON COLUMN referral_registrations.registration_tx IS 'Transaction hash from ReferralCodeRegistered event';

-- =====================================================
-- RLS Policies
-- =====================================================
-- Enable Row Level Security

ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read referral stats (public leaderboard)
CREATE POLICY "Public read access for referral_stats"
  ON referral_stats FOR SELECT
  USING (true);

-- Policy: Anyone can read referral activity (public feed)
CREATE POLICY "Public read access for referral_activity"
  ON referral_activity FOR SELECT
  USING (true);

-- Policy: Anyone can read referral registrations (public data)
CREATE POLICY "Public read access for referral_registrations"
  ON referral_registrations FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update (cron job, API endpoints)
CREATE POLICY "Service role can modify referral_stats"
  ON referral_stats FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can modify referral_activity"
  ON referral_activity FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can modify referral_registrations"
  ON referral_registrations FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- Functions
-- =====================================================

-- Function: Update referral stats timestamp on any change
CREATE OR REPLACE FUNCTION update_referral_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on referral_stats
CREATE TRIGGER trigger_update_referral_stats_timestamp
  BEFORE UPDATE ON referral_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_stats_timestamp();

-- Function: Update referral registrations timestamp
CREATE OR REPLACE FUNCTION update_referral_registrations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on referral_registrations
CREATE TRIGGER trigger_update_referral_registrations_timestamp
  BEFORE UPDATE ON referral_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_registrations_timestamp();

-- =====================================================
-- Sample Data (for testing)
-- =====================================================
-- Insert sample data only if tables are empty

DO $$
BEGIN
  -- Check if referral_stats is empty
  IF NOT EXISTS (SELECT 1 FROM referral_stats LIMIT 1) THEN
    INSERT INTO referral_stats (fid, address, username, avatar, total_referrals, points_earned, tier, rank)
    VALUES
      (18139, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'testuser1', 'https://i.imgur.com/example1.jpg', 10, 500, 'gold', 1),
      (12345, '0x0000000000000000000000000000000000000001', 'testuser2', 'https://i.imgur.com/example2.jpg', 5, 250, 'silver', 2),
      (67890, '0x0000000000000000000000000000000000000002', 'testuser3', 'https://i.imgur.com/example3.jpg', 2, 100, 'bronze', 3);
    
    RAISE NOTICE 'Sample referral_stats inserted';
  END IF;
  
  -- Check if referral_activity is empty
  IF NOT EXISTS (SELECT 1 FROM referral_activity LIMIT 1) THEN
    INSERT INTO referral_activity (fid, event_type, referral_code, points_awarded)
    VALUES
      (18139, 'code_registered', 'TESTCODE', 0),
      (18139, 'code_used', 'TESTCODE', 50),
      (18139, 'referral_completed', 'TESTCODE', 100);
    
    RAISE NOTICE 'Sample referral_activity inserted';
  END IF;
END $$;

-- =====================================================
-- Verification
-- =====================================================

-- Verify tables exist
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('referral_stats', 'referral_activity', 'referral_registrations');
  
  IF table_count = 3 THEN
    RAISE NOTICE '✅ All 3 referral tables created successfully';
  ELSE
    RAISE WARNING '⚠️ Only % of 3 tables created', table_count;
  END IF;
END $$;
