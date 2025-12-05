-- Add tip_points and nft_points columns to leaderboard_calculations
-- Phase 2.4.1: Category Tabs Enhancement
-- Created: December 2, 2025

-- Add tip_points column (tip earning + giving activity from TipHub)
ALTER TABLE leaderboard_calculations
ADD COLUMN IF NOT EXISTS tip_points bigint NOT NULL DEFAULT 0;

-- Add nft_points column (NFT rewards + quest NFTs earned)
ALTER TABLE leaderboard_calculations
ADD COLUMN IF NOT EXISTS nft_points bigint NOT NULL DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS leaderboard_calculations_tip_points_idx 
ON leaderboard_calculations(tip_points DESC);

CREATE INDEX IF NOT EXISTS leaderboard_calculations_nft_points_idx 
ON leaderboard_calculations(nft_points DESC);

-- Add comments
COMMENT ON COLUMN leaderboard_calculations.tip_points IS 'Tip earning + giving activity points from TipHub integration';
COMMENT ON COLUMN leaderboard_calculations.nft_points IS 'NFT rewards + quest NFTs earned points';
