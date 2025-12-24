-- ROLLBACK Migration 005: Restore reward_claims original column names
-- Date: December 22, 2025

ALTER TABLE reward_claims 
  RENAME COLUMN viral_points_claimed TO viral_xp_claimed;

ALTER TABLE reward_claims 
  RENAME COLUMN guild_points_claimed TO guild_bonus_claimed;

ALTER TABLE reward_claims 
  RENAME COLUMN total_points_claimed TO total_claimed;

DROP INDEX IF EXISTS idx_reward_claims_total_points_claimed;

CREATE INDEX idx_reward_claims_total_claimed 
  ON reward_claims(total_claimed);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reward_claims' AND column_name = 'viral_xp_claimed'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: viral_xp_claimed column not found';
  END IF;

  RAISE NOTICE 'Rollback 005 completed successfully';
END $$;
