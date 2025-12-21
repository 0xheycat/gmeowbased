-- Migration: Create reward_claims table
-- Created: 2025-12-20
-- Purpose: Track pending reward claims via oracle deposits (gaming platform pattern)
-- Pattern: Off-chain points calculation → Oracle deposits to on-chain contract

-- Create reward_claims table
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  fid BIGINT,
  
  -- Breakdown of points by category
  viral_xp_claimed BIGINT DEFAULT 0,
  guild_bonus_claimed BIGINT DEFAULT 0,
  referral_bonus_claimed BIGINT DEFAULT 0,
  streak_bonus_claimed BIGINT DEFAULT 0,
  badge_prestige_claimed BIGINT DEFAULT 0,
  
  -- Total and on-chain verification
  total_claimed BIGINT NOT NULL CHECK (total_claimed > 0),
  tx_hash TEXT UNIQUE,
  oracle_address TEXT DEFAULT '0x8870C155666809609176260F2B65a626C000D773',
  
  -- Timestamps
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.reward_claims IS 
  'Tracks pending reward claims via oracle deposits (gaming platform pattern)';

COMMENT ON COLUMN public.reward_claims.total_claimed IS 
  'Total points deposited to contract via oracle';

COMMENT ON COLUMN public.reward_claims.tx_hash IS 
  'On-chain transaction hash from oracle deposit';

COMMENT ON COLUMN public.reward_claims.oracle_address IS 
  'Oracle wallet that deposited the points';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reward_claims_wallet 
  ON public.reward_claims(wallet_address);

CREATE INDEX IF NOT EXISTS idx_reward_claims_fid 
  ON public.reward_claims(fid);

CREATE INDEX IF NOT EXISTS idx_reward_claims_tx_hash 
  ON public.reward_claims(tx_hash);

CREATE INDEX IF NOT EXISTS idx_reward_claims_claimed_at 
  ON public.reward_claims(claimed_at DESC);

-- Disable RLS (public read access for transparency)
ALTER TABLE public.reward_claims DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON public.reward_claims TO anon, authenticated;
GRANT ALL ON public.reward_claims TO service_role;
