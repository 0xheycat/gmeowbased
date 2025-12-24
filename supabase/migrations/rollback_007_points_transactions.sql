-- ROLLBACK Migration 007: Restore points_transactions original column names
-- Date: December 22, 2025

ALTER TABLE points_transactions 
  RENAME COLUMN points_balance_after TO balance_after;

DROP INDEX IF EXISTS idx_points_transactions_points_balance_after;

CREATE INDEX idx_points_transactions_balance_after 
  ON points_transactions(balance_after);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'points_transactions' AND column_name = 'balance_after'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: balance_after column not found';
  END IF;

  RAISE NOTICE 'Rollback 007 completed successfully';
END $$;
