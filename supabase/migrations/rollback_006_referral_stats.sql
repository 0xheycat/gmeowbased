-- ROLLBACK Migration 006: Restore referral_stats original column names
-- Date: December 22, 2025

ALTER TABLE referral_stats 
  RENAME COLUMN points_awarded TO points_earned;

DROP INDEX IF EXISTS idx_referral_stats_points_awarded;

CREATE INDEX idx_referral_stats_points_earned 
  ON referral_stats(points_earned);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'referral_stats' AND column_name = 'points_earned'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: points_earned column not found';
  END IF;

  RAISE NOTICE 'Rollback 006 completed successfully';
END $$;
