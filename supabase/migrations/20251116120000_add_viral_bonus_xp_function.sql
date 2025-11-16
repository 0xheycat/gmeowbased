-- Phase 5.8: Viral Bonus XP System
-- Add RPC function for atomic XP updates

-- Function to increment user XP atomically
-- GI-11: Idempotent XP awards with transaction safety
CREATE OR REPLACE FUNCTION increment_user_xp(
  p_fid BIGINT,
  p_xp_amount INTEGER,
  p_source TEXT DEFAULT 'viral_bonus'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- GI-11: Atomic update with row-level locking
  UPDATE user_points
  SET 
    xp = xp + p_xp_amount,
    total_points = total_points + p_xp_amount,
    updated_at = NOW()
  WHERE fid = p_fid;
  
  -- Create record if user doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_points (fid, xp, total_points, points_balance, source)
    VALUES (p_fid, p_xp_amount, p_xp_amount, 0, p_source);
  END IF;
  
  -- Log XP transaction for audit trail
  INSERT INTO xp_transactions (fid, amount, source, created_at)
  VALUES (p_fid, p_xp_amount, p_source, NOW())
  ON CONFLICT DO NOTHING;
END;
$$;

-- Create XP transactions table for audit trail
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_fid ON xp_transactions(fid);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON xp_transactions(source);

-- Add comment for documentation
COMMENT ON FUNCTION increment_user_xp IS 'Phase 5.8: Atomically increment user XP from viral bonus system';
COMMENT ON TABLE xp_transactions IS 'Phase 5.8: Audit trail for all XP awards (viral bonuses, quest completion, etc.)';
