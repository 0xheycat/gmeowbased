-- Migration 002: Rename badge_casts viral columns to match contract terminology
-- Date: December 22, 2025
-- Phase: P1 - Supabase Schema Migration
-- Breaking Change: YES - Column rename

-- ============================================================================
-- CHANGES
-- ============================================================================
-- 1. viral_bonus_xp → viral_bonus_points (consistent points terminology)

-- ============================================================================
-- STEP 1: Rename column
-- ============================================================================

ALTER TABLE badge_casts 
  RENAME COLUMN viral_bonus_xp TO viral_bonus_points;

-- ============================================================================
-- STEP 2: Update indexes (if any)
-- ============================================================================

-- Drop old index if exists
DROP INDEX IF EXISTS idx_badge_casts_viral_bonus_xp;

-- Create new index on viral_bonus_points
CREATE INDEX IF NOT EXISTS idx_badge_casts_viral_bonus_points 
  ON badge_casts(viral_bonus_points);

-- ============================================================================
-- STEP 3: Add column comment
-- ============================================================================

COMMENT ON COLUMN badge_casts.viral_bonus_points IS 
  'Bonus points from viral cast engagement (calculated from viral_score using tier thresholds)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_casts' AND column_name = 'viral_bonus_points'
  ) THEN
    RAISE EXCEPTION 'Migration failed: viral_bonus_points column not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_casts' AND column_name = 'viral_bonus_xp'
  ) THEN
    RAISE EXCEPTION 'Migration failed: viral_bonus_xp column still exists (should be renamed)';
  END IF;

  RAISE NOTICE 'Migration 002 completed successfully';
END $$;
