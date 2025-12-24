-- Migration 004: Rename user_points_balances columns to match contract terminology
-- Date: December 22, 2025
-- Phase: P1 - Supabase Schema Migration
-- Breaking Change: YES - 4 column renames

-- ============================================================================
-- CHANGES
-- ============================================================================
-- 1. base_points → points_balance (match contract pointsBalance)
-- 2. viral_xp → viral_points (consistent points terminology)
-- 3. guild_bonus → guild_points_awarded (match event naming pattern)
-- 4. total_points → total_score (calculated field, not contract field)

-- ============================================================================
-- STEP 1: Rename columns
-- ============================================================================

ALTER TABLE user_points_balances 
  RENAME COLUMN base_points TO points_balance;

ALTER TABLE user_points_balances 
  RENAME COLUMN viral_xp TO viral_points;

ALTER TABLE user_points_balances 
  RENAME COLUMN guild_bonus TO guild_points_awarded;

ALTER TABLE user_points_balances 
  RENAME COLUMN total_points TO total_score;

-- ============================================================================
-- STEP 2: Update indexes
-- ============================================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_user_points_balances_base_points;
DROP INDEX IF EXISTS idx_user_points_balances_total_points;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_user_points_balances_points_balance 
  ON user_points_balances(points_balance);

CREATE INDEX IF NOT EXISTS idx_user_points_balances_total_score 
  ON user_points_balances(total_score);

-- ============================================================================
-- STEP 3: Update computed columns (if using generated columns)
-- ============================================================================

-- If total_score is a generated column, drop and recreate
-- (Adjust if your schema uses different computed column syntax)
DO $$
BEGIN
  -- Check if total_score was a generated column
  -- If so, we need to drop the generation expression and recreate
  -- For now, we assume manual calculation in application
  RAISE NOTICE 'If total_score is computed, update triggers/functions manually';
END $$;

-- ============================================================================
-- STEP 4: Add column comments
-- ============================================================================

COMMENT ON COLUMN user_points_balances.points_balance IS 
  'Base points from blockchain activities (matches contract pointsBalance storage variable)';

COMMENT ON COLUMN user_points_balances.viral_points IS 
  'Points from viral cast engagement (off-chain calculation)';

COMMENT ON COLUMN user_points_balances.guild_points_awarded IS 
  'Bonus points awarded from guild membership and activities';

COMMENT ON COLUMN user_points_balances.total_score IS 
  'Computed total: points_balance + viral_points + guild_points_awarded (used for level/rank calculations)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_points_balances' AND column_name = 'points_balance'
  ) THEN
    RAISE EXCEPTION 'Migration failed: points_balance column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_points_balances' AND column_name = 'viral_points'
  ) THEN
    RAISE EXCEPTION 'Migration failed: viral_points column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_points_balances' AND column_name = 'guild_points_awarded'
  ) THEN
    RAISE EXCEPTION 'Migration failed: guild_points_awarded column not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_points_balances' AND column_name = 'total_score'
  ) THEN
    RAISE EXCEPTION 'Migration failed: total_score column not found';
  END IF;

  RAISE NOTICE 'Migration 004 completed successfully';
END $$;
