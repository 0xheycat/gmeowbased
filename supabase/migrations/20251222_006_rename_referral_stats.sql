-- Migration 006: Rename referral_stats columns to match contract event terminology
-- Date: December 22, 2025
-- Phase: P1 - Supabase Schema Migration
-- Breaking Change: YES - Column rename

-- ============================================================================
-- CHANGES
-- ============================================================================
-- 1. points_earned → points_awarded (match contract event naming pattern)

-- ============================================================================
-- STEP 1: Rename column
-- ============================================================================

ALTER TABLE referral_stats 
  RENAME COLUMN points_earned TO points_awarded;

-- ============================================================================
-- STEP 2: Update indexes
-- ============================================================================

-- Drop old index if exists
DROP INDEX IF EXISTS idx_referral_stats_points_earned;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_referral_stats_points_awarded 
  ON referral_stats(points_awarded);

-- ============================================================================
-- STEP 3: Add column comment
-- ============================================================================

COMMENT ON COLUMN referral_stats.points_awarded IS 
  'Points awarded from referrals (matches contract event terminology: pointsAwarded)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referral_stats' AND column_name = 'points_awarded'
  ) THEN
    RAISE EXCEPTION 'Migration failed: points_awarded column not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referral_stats' AND column_name = 'points_earned'
  ) THEN
    RAISE EXCEPTION 'Migration failed: points_earned column still exists (should be renamed)';
  END IF;

  RAISE NOTICE 'Migration 006 completed successfully';
END $$;
