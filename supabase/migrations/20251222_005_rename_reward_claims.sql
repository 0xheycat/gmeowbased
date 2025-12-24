-- Migration 005: Rename reward_claims columns to match contract terminology
-- Date: December 22, 2025
-- Phase: P1 - Supabase Schema Migration
-- Breaking Change: YES - 3 column renames

-- ============================================================================
-- CHANGES
-- ============================================================================
-- 1. viral_xp_claimed → viral_points_claimed (consistent points terminology)
-- 2. guild_bonus_claimed → guild_points_claimed (consistent points terminology)
-- 3. total_claimed → total_points_claimed (add clarity)

-- ============================================================================
-- STEP 1: Rename columns
-- ============================================================================

ALTER TABLE reward_claims 
  RENAME COLUMN viral_xp_claimed TO viral_points_claimed;

ALTER TABLE reward_claims 
  RENAME COLUMN guild_bonus_claimed TO guild_points_claimed;

ALTER TABLE reward_claims 
  RENAME COLUMN total_claimed TO total_points_claimed;

-- ============================================================================
-- STEP 2: Update indexes
-- ============================================================================

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_reward_claims_total_claimed;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_reward_claims_total_points_claimed 
  ON reward_claims(total_points_claimed);

-- ============================================================================
-- STEP 3: Add column comments
-- ============================================================================

COMMENT ON COLUMN reward_claims.viral_points_claimed IS 
  'Viral points deposited to contract via oracle (from badge cast engagement)';

COMMENT ON COLUMN reward_claims.guild_points_claimed IS 
  'Guild bonus points deposited to contract via oracle';

COMMENT ON COLUMN reward_claims.total_points_claimed IS 
  'Total points deposited to contract (viral_points_claimed + guild_points_claimed)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reward_claims' AND column_name = 'viral_points_claimed'
  ) THEN
    RAISE EXCEPTION 'Migration failed: viral_points_claimed column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reward_claims' AND column_name = 'guild_points_claimed'
  ) THEN
    RAISE EXCEPTION 'Migration failed: guild_points_claimed column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reward_claims' AND column_name = 'total_points_claimed'
  ) THEN
    RAISE EXCEPTION 'Migration failed: total_points_claimed column not found';
  END IF;

  RAISE NOTICE 'Migration 005 completed successfully';
END $$;
