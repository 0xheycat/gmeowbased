-- Gaming Platform Pattern: Reward Claims Table
--
-- Tracks all pending reward claims from users
-- Implements professional gaming platform pattern:
-- - Display balance (total_score) shown in UI
-- - Spendable balance (points_balance) from contract
-- - Pending rewards claimed via oracle deposits
--
-- Created: December 19, 2025
-- Reference: GAMING-PLATFORM-PATTERN.md

CREATE TABLE IF NOT EXISTS reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identity
  wallet_address TEXT NOT NULL,
  fid BIGINT, -- Optional Farcaster FID
  
  -- Reward breakdown (what was claimed)
  viral_xp_claimed BIGINT DEFAULT 0,
  guild_bonus_claimed BIGINT DEFAULT 0,
  referral_bonus_claimed BIGINT DEFAULT 0,
  streak_bonus_claimed BIGINT DEFAULT 0,
  badge_prestige_claimed BIGINT DEFAULT 0,
  total_claimed BIGINT NOT NULL,
  
  -- Oracle deposit transaction
  tx_hash TEXT UNIQUE, -- On-chain transaction hash
  oracle_address TEXT DEFAULT '0x8870C155666809609176260F2B65a626C000D773',
  
  -- Timestamps
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT reward_claims_total_check CHECK (total_claimed > 0)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reward_claims_wallet ON reward_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reward_claims_fid ON reward_claims(fid);
CREATE INDEX IF NOT EXISTS idx_reward_claims_claimed_at ON reward_claims(claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_claims_tx_hash ON reward_claims(tx_hash);

-- Comments
COMMENT ON TABLE reward_claims IS 'Tracks pending reward claims via oracle deposits (gaming platform pattern)';
COMMENT ON COLUMN reward_claims.total_claimed IS 'Total points deposited to contract via oracle';
COMMENT ON COLUMN reward_claims.tx_hash IS 'On-chain transaction hash from oracle deposit';
COMMENT ON COLUMN reward_claims.oracle_address IS 'Oracle wallet that deposited the points';

-- Example query: Get total claimed by user
-- SELECT 
--   wallet_address,
--   COUNT(*) as claim_count,
--   SUM(total_claimed) as total_claimed,
--   MAX(claimed_at) as last_claim
-- FROM reward_claims
-- WHERE wallet_address = '0x...'
-- GROUP BY wallet_address;

-- Example query: Get claims in last 7 days
-- SELECT *
-- FROM reward_claims
-- WHERE wallet_address = '0x...'
--   AND claimed_at >= NOW() - INTERVAL '7 days'
-- ORDER BY claimed_at DESC;
