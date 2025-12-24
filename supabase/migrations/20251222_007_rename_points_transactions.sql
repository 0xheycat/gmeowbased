-- Migration 007: Rename points_transactions columns for clarity
-- Date: December 22, 2025
-- Phase: P1 - Supabase Schema Migration
-- Breaking Change: YES - Column rename

-- ============================================================================
-- CHANGES
-- ============================================================================
-- 1. balance_after → points_balance_after (add clarity, match contract terminology)

-- ============================================================================
-- STEP 1: Rename column
-- ============================================================================

ALTER TABLE points_transactions 
  RENAME COLUMN balance_after TO points_balance_after;

-- ============================================================================
-- STEP 2: Update indexes
-- ============================================================================

-- Drop old index if exists
DROP INDEX IF EXISTS idx_points_transactions_balance_after;

-- Create new index
CREATE INDEX IF NOT EXISTS idx_points_transactions_points_balance_after 
  ON points_transactions(points_balance_after);

-- ============================================================================
-- STEP 3: Add column comment
-- ============================================================================

COMMENT ON COLUMN points_transactions.points_balance_after IS 
  'Points balance after transaction (snapshot of contract pointsBalance)';

-- NOTE: Verify 'amount' column already exists and matches contract event
COMMENT ON COLUMN points_transactions.amount IS 
  'Transaction amount (matches contract PointsDeposited/PointsWithdrawn.amount event field)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_transactions' AND column_name = 'points_balance_after'
  ) THEN
    RAISE EXCEPTION 'Migration failed: points_balance_after column not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_transactions' AND column_name = 'balance_after'
  ) THEN
    RAISE EXCEPTION 'Migration failed: balance_after column still exists (should be renamed)';
  END IF;

  -- Verify amount column exists (should already match contract)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_transactions' AND column_name = 'amount'
  ) THEN
    RAISE WARNING 'amount column not found in points_transactions (expected to exist)';
  END IF;

  RAISE NOTICE 'Migration 007 completed successfully';
END $$;
