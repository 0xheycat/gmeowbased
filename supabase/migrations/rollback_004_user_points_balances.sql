-- ROLLBACK Migration 004: Restore user_points_balances original column names
-- Date: December 22, 2025

ALTER TABLE user_points_balances 
  RENAME COLUMN points_balance TO base_points;

ALTER TABLE user_points_balances 
  RENAME COLUMN viral_points TO viral_xp;

ALTER TABLE user_points_balances 
  RENAME COLUMN guild_points_awarded TO guild_bonus;

ALTER TABLE user_points_balances 
  RENAME COLUMN total_score TO total_points;

-- Restore indexes
DROP INDEX IF EXISTS idx_user_points_balances_points_balance;
DROP INDEX IF EXISTS idx_user_points_balances_total_score;

CREATE INDEX idx_user_points_balances_base_points 
  ON user_points_balances(base_points);

CREATE INDEX idx_user_points_balances_total_points 
  ON user_points_balances(total_points);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_points_balances' AND column_name = 'base_points'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: base_points column not found';
  END IF;

  RAISE NOTICE 'Rollback 004 completed successfully';
END $$;
