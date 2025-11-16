-- Create user_badges table for badge assignment tracking
CREATE TABLE IF NOT EXISTS user_badges (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  badge_id VARCHAR(100) NOT NULL,
  badge_type VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'common',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  minted BOOLEAN DEFAULT FALSE,
  minted_at TIMESTAMPTZ,
  tx_hash TEXT,
  chain VARCHAR(50),
  contract_address TEXT,
  token_id BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_badges_fid ON user_badges(fid);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_type ON user_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_user_badges_tier ON user_badges(tier);
CREATE INDEX IF NOT EXISTS idx_user_badges_minted ON user_badges(minted);
CREATE INDEX IF NOT EXISTS idx_user_badges_assigned_at ON user_badges(assigned_at);
CREATE INDEX IF NOT EXISTS idx_user_badges_fid_badge_type ON user_badges(fid, badge_type);

-- Unique constraint: one badge per user per badge_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badges_fid_badge_type_unique 
  ON user_badges(fid, badge_type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_badges_updated_at
  BEFORE UPDATE ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_user_badges_updated_at();

-- Comments
COMMENT ON TABLE user_badges IS 'Tracks badge assignments and minting status for users';
COMMENT ON COLUMN user_badges.fid IS 'Farcaster ID of the user';
COMMENT ON COLUMN user_badges.badge_id IS 'Badge registry ID (e.g., neon-initiate, gmeow-vanguard)';
COMMENT ON COLUMN user_badges.badge_type IS 'Badge type slug (e.g., neon_initiate, gmeow_vanguard)';
COMMENT ON COLUMN user_badges.tier IS 'Badge tier: common, rare, epic, legendary, mythic';
COMMENT ON COLUMN user_badges.assigned_at IS 'When the badge was assigned to the user';
COMMENT ON COLUMN user_badges.minted IS 'Whether the badge has been minted on-chain';
COMMENT ON COLUMN user_badges.minted_at IS 'When the badge was minted on-chain';
COMMENT ON COLUMN user_badges.tx_hash IS 'Blockchain transaction hash for the mint';
COMMENT ON COLUMN user_badges.chain IS 'Blockchain where badge was minted (base, op, ink, etc)';
COMMENT ON COLUMN user_badges.contract_address IS 'SoulboundBadge contract address';
COMMENT ON COLUMN user_badges.token_id IS 'NFT token ID if minted';
COMMENT ON COLUMN user_badges.metadata IS 'Additional badge metadata (JSON)';
