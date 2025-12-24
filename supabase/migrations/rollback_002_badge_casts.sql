-- ROLLBACK Migration 002: Restore badge_casts original column names
-- Date: December 22, 2025

ALTER TABLE badge_casts 
  RENAME COLUMN viral_bonus_points TO viral_bonus_xp;

DROP INDEX IF EXISTS idx_badge_casts_viral_bonus_points;

CREATE INDEX idx_badge_casts_viral_bonus_xp 
  ON badge_casts(viral_bonus_xp);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_casts' AND column_name = 'viral_bonus_xp'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: viral_bonus_xp column not found';
  END IF;

  RAISE NOTICE 'Rollback 002 completed successfully';
END $$;
