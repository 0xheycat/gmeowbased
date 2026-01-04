-- Migration: Add escrow refund tracking fields
-- Date: 2025-12-27
-- Purpose: Support automated escrow refund system
-- Applied via: mcp_supabase_apply_migration

-- 1. Check if status column exists, if not add it (with constraint)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unified_quests' AND column_name = 'status'
  ) THEN
    ALTER TABLE unified_quests ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- Update status constraint to include 'refunded'
ALTER TABLE unified_quests DROP CONSTRAINT IF EXISTS unified_quests_status_check;
ALTER TABLE unified_quests ADD CONSTRAINT unified_quests_status_check 
  CHECK (status IN ('active', 'completed', 'paused', 'closed', 'refunded'));

-- 2. Add refunded_at timestamp field
ALTER TABLE unified_quests
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- 3. Add completion_count if not exists (for escrow calculations)
ALTER TABLE unified_quests
  ADD COLUMN IF NOT EXISTS completion_count bigint DEFAULT 0;

-- 4. Create index for refund queries (without NOW() function in WHERE clause)
CREATE INDEX IF NOT EXISTS idx_unified_quests_expired_active 
  ON unified_quests(expiry_date, status) 
  WHERE status = 'active';

-- 5. Add comments for documentation
COMMENT ON COLUMN unified_quests.status IS 'Quest status: active (running), completed (max reached), paused (creator paused), closed (creator closed), refunded (escrow returned)';
COMMENT ON COLUMN unified_quests.refunded_at IS 'Timestamp when escrow was automatically refunded due to expiration';
COMMENT ON COLUMN unified_quests.completion_count IS 'Number of completed quest instances (for escrow refund calculation)';

-- 6. Create increment_points_balance RPC function
CREATE OR REPLACE FUNCTION increment_points_balance(
  p_fid bigint,
  p_amount bigint,
  p_source text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user_points_balances
  INSERT INTO user_points_balances (fid, points_balance, updated_at)
  VALUES (p_fid, p_amount, NOW())
  ON CONFLICT (fid) DO UPDATE
  SET 
    points_balance = user_points_balances.points_balance + p_amount,
    updated_at = NOW();

  -- Log transaction for audit trail (if points_transactions table exists)
  BEGIN
    INSERT INTO points_transactions (
      fid,
      amount,
      transaction_type,
      source,
      created_at
    )
    VALUES (
      p_fid,
      p_amount,
      CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END,
      p_source,
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, skip logging (non-critical)
      NULL;
  END;
END;
$$;

COMMENT ON FUNCTION increment_points_balance IS 'Atomically increment/decrement user points balance with audit trail';

-- ═══════════════════════════════════════════════════════════════════════════
-- MANUAL TYPE UPDATE REQUIRED (per types/supabase.ts workflow)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Update types/supabase.generated.ts:
-- 
-- unified_quests Row interface:
--   completion_count: number
--   refunded_at: string | null
--   status: string (constraint: 'active' | 'completed' | 'paused' | 'closed' | 'refunded')
-- 
-- unified_quests Insert interface:
--   completion_count?: number
--   refunded_at?: string | null
--   status?: string
-- 
-- unified_quests Update interface:
--   completion_count?: number
--   refunded_at?: string | null
--   status?: string
-- 
-- ═══════════════════════════════════════════════════════════════════════════
