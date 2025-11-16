-- Add error tracking and retry count to mint_queue
-- Migration: 20250115000000_add_mint_queue_error_tracking.sql

ALTER TABLE mint_queue
ADD COLUMN IF NOT EXISTS error TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add index for error tracking
CREATE INDEX IF NOT EXISTS idx_mint_queue_error ON mint_queue(status) WHERE error IS NOT NULL;

-- Update existing 'pending' status to include retry logic
-- Add comment
COMMENT ON COLUMN mint_queue.error IS 'Error message if mint failed';
COMMENT ON COLUMN mint_queue.retry_count IS 'Number of retry attempts for failed mints';
