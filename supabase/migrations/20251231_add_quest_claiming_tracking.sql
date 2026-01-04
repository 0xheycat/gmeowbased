/**
 * Migration: Add quest claiming tracking to quest_completions
 * Created: December 31, 2025
 * 
 * PURPOSE:
 * Track which quests have been claimed on-chain to prevent duplicate claims
 * and provide claiming status for the UI.
 * 
 * CHANGES:
 * - Add is_claimed column (boolean, default false)
 * - Add claim_tx_hash column (text, nullable) - stores transaction hash
 * - Add claimed_at column (timestamptz, nullable) - tracks claim timestamp
 * 
 * BACKWARD COMPATIBILITY:
 * - Existing rows default to is_claimed = false
 * - No data loss - purely additive
 * - Can rollback safely
 */

-- Add claiming status columns
ALTER TABLE quest_completions
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS claim_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Add index for efficient querying of claimed status
CREATE INDEX IF NOT EXISTS idx_quest_completions_claimed 
ON quest_completions(completer_fid, is_claimed);

-- Add index for transaction hash lookups
CREATE INDEX IF NOT EXISTS idx_quest_completions_tx_hash 
ON quest_completions(claim_tx_hash) 
WHERE claim_tx_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quest_completions.is_claimed IS 
'Tracks whether the quest reward has been claimed on-chain';

COMMENT ON COLUMN quest_completions.claim_tx_hash IS 
'Transaction hash of the on-chain claim (if claimed)';

COMMENT ON COLUMN quest_completions.claimed_at IS 
'Timestamp when the quest was claimed on-chain (if claimed)';

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 20251231_add_quest_claiming_tracking completed successfully';
END $$;
