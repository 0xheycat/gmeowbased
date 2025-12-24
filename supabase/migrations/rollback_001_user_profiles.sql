-- ROLLBACK Migration 001: Restore user_profiles original column names
-- Date: December 22, 2025
-- WARNING: Use this ONLY if migration 001 needs to be reverted

-- ============================================================================
-- STEP 1: Rename columns back to original
-- ============================================================================

ALTER TABLE user_profiles 
  RENAME COLUMN points_balance TO points;

ALTER TABLE user_profiles 
  RENAME COLUMN total_earned_from_gms TO total_points_earned;

-- ============================================================================
-- STEP 2: Restore xp column (if dropped)
-- ============================================================================

-- Note: Data will be lost if xp was dropped
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS xp bigint DEFAULT 0;

-- ============================================================================
-- STEP 3: Restore indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_user_profiles_points_balance;
DROP INDEX IF EXISTS idx_user_profiles_total_earned;

CREATE INDEX idx_user_profiles_points 
  ON user_profiles(points);

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'points'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: points column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'total_points_earned'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: total_points_earned column not found';
  END IF;

  RAISE NOTICE 'Rollback 001 completed successfully';
END $$;
