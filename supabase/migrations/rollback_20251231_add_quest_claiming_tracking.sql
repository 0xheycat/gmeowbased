/**
 * Rollback: Remove quest claiming tracking columns
 * Created: December 31, 2025
 * 
 * Reverts changes from 20251231_add_quest_claiming_tracking.sql
 */

-- Drop indexes
DROP INDEX IF EXISTS idx_quest_completions_claimed;
DROP INDEX IF EXISTS idx_quest_completions_tx_hash;

-- Drop columns
ALTER TABLE quest_completions
DROP COLUMN IF EXISTS is_claimed,
DROP COLUMN IF EXISTS claim_tx_hash,
DROP COLUMN IF EXISTS claimed_at;

-- Log rollback
DO $$
BEGIN
  RAISE NOTICE 'Rollback 20251231_add_quest_claiming_tracking completed';
END $$;
