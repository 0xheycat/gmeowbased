-- Create guild_deposits table for audit trail
-- Tracks oracle deposits of guild bonus points

CREATE TABLE IF NOT EXISTS guild_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  guild_bonus NUMERIC NOT NULL,
  guilds JSONB NOT NULL, -- Array of guild contributions
  tx_hash TEXT NOT NULL,
  deposited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_guild_deposits_user ON guild_deposits(user_address);
CREATE INDEX idx_guild_deposits_tx ON guild_deposits(tx_hash);
CREATE INDEX idx_guild_deposits_date ON guild_deposits(deposited_at DESC);

-- Add comment
COMMENT ON TABLE guild_deposits IS 'Oracle deposit audit trail for guild bonus points (Jan 12, 2026)';
