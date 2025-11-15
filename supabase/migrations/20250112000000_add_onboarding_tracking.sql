-- Add onboarding tracking columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS neynar_score DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS neynar_tier VARCHAR(20) DEFAULT 'common',
ADD COLUMN IF NOT EXISTS og_nft_eligible BOOLEAN DEFAULT FALSE;

-- Create mint queue table for OG NFT minting
CREATE TABLE IF NOT EXISTS mint_queue (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  wallet_address TEXT NOT NULL,
  badge_type VARCHAR(50) NOT NULL DEFAULT 'og_member',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mint_queue_fid ON mint_queue(fid);
CREATE INDEX IF NOT EXISTS idx_mint_queue_status ON mint_queue(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarded ON user_profiles(onboarded_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON user_profiles(neynar_tier);

-- Add comments
COMMENT ON COLUMN user_profiles.onboarded_at IS 'Timestamp when user completed onboarding flow';
COMMENT ON COLUMN user_profiles.neynar_score IS 'Neynar influence score (0.00 to 1.00+)';
COMMENT ON COLUMN user_profiles.neynar_tier IS 'Tier based on Neynar score: mythic/legendary/epic/rare/common';
COMMENT ON COLUMN user_profiles.og_nft_eligible IS 'Whether user is eligible for OG member NFT (Mythic tier only)';
COMMENT ON TABLE mint_queue IS 'Queue for OG NFT minting for Mythic tier users';
