-- Migration 001: Rename user_profiles columns to match contract naming
-- Date: December 22, 2025
-- Phase: P1 - Supabase Schema Migration
-- Breaking Change: YES - Column renames

-- ============================================================================
-- CHANGES
-- ============================================================================
-- 1. points → points_balance (match contract pointsBalance)
-- 2. total_points_earned → total_earned_from_gms (match Subsquid User.totalEarnedFromGMs)
-- 3. DROP xp (deprecated, unused column)

-- ============================================================================
-- STEP 1: Rename columns
-- ============================================================================

ALTER TABLE user_profiles 
  RENAME COLUMN points TO points_balance;

ALTER TABLE user_profiles 
  RENAME COLUMN total_points_earned TO total_earned_from_gms;

-- ============================================================================
-- STEP 2: Drop deprecated columns
-- ============================================================================

ALTER TABLE user_profiles 
  DROP COLUMN IF EXISTS xp;

-- ============================================================================
-- STEP 3: Update indexes
-- ============================================================================

-- Drop old index if exists
DROP INDEX IF EXISTS idx_user_profiles_points;

-- Create new index on points_balance
CREATE INDEX IF NOT EXISTS idx_user_profiles_points_balance 
  ON user_profiles(points_balance);

-- Create index on total_earned_from_gms for analytics
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_earned 
  ON user_profiles(total_earned_from_gms);

-- ============================================================================
-- STEP 4: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN user_profiles.points_balance IS 
  'Current spendable points balance (matches contract pointsBalance storage variable)';

COMMENT ON COLUMN user_profiles.total_earned_from_gms IS 
  'Lifetime total earned from GM events (matches Subsquid User.totalEarnedFromGMs, never decreases)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'points_balance'
  ) THEN
    RAISE EXCEPTION 'Migration failed: points_balance column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'total_earned_from_gms'
  ) THEN
    RAISE EXCEPTION 'Migration failed: total_earned_from_gms column not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'xp'
  ) THEN
    RAISE EXCEPTION 'Migration failed: xp column still exists (should be dropped)';
  END IF;

  RAISE NOTICE 'Migration 001 completed successfully';
END $$;
