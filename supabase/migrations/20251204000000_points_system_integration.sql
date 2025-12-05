-- Points System Integration Migration
-- Date: December 4, 2025
-- Purpose: Add Points economy support to user profiles and create Points transaction log

-- ============================================================================
-- 1. Add Points columns to user_profiles table
-- ============================================================================

-- Check if columns already exist before adding
DO $$ 
BEGIN
    -- Add points column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='points') THEN
        ALTER TABLE user_profiles ADD COLUMN points BIGINT DEFAULT 0 NOT NULL;
    END IF;
    
    -- Add total_points_earned column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='total_points_earned') THEN
        ALTER TABLE user_profiles ADD COLUMN total_points_earned BIGINT DEFAULT 0 NOT NULL;
    END IF;
    
    -- Add total_points_spent column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_profiles' AND column_name='total_points_spent') THEN
        ALTER TABLE user_profiles ADD COLUMN total_points_spent BIGINT DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Add index for Points queries
CREATE INDEX IF NOT EXISTS user_profiles_points_idx ON user_profiles(points DESC);

-- ============================================================================
-- 2. Create Points transaction log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS points_transactions (
  id BIGSERIAL PRIMARY KEY,
  
  -- User info
  fid BIGINT NOT NULL,
  
  -- Transaction details
  amount BIGINT NOT NULL,  -- Positive = earned, Negative = spent
  source TEXT NOT NULL,     -- 'quest_completion:2', 'quest_creation', 'badge_mint'
  balance_after BIGINT NOT NULL,
  
  -- Optional metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for points_transactions
CREATE INDEX IF NOT EXISTS points_transactions_fid_idx ON points_transactions(fid);
CREATE INDEX IF NOT EXISTS points_transactions_created_at_idx ON points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS points_transactions_source_idx ON points_transactions(source);
CREATE INDEX IF NOT EXISTS points_transactions_amount_idx ON points_transactions(amount);

-- Composite index for user transaction history
CREATE INDEX IF NOT EXISTS points_transactions_fid_created_at_idx ON points_transactions(fid, created_at DESC);

-- ============================================================================
-- 3. Add slug column to unified_quests table
-- ============================================================================

DO $$ 
BEGIN
    -- Add slug column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='unified_quests' AND column_name='slug') THEN
        ALTER TABLE unified_quests ADD COLUMN slug TEXT;
    END IF;
END $$;

-- Generate slugs for existing quests
UPDATE unified_quests 
SET slug = CONCAT('quest-', id)
WHERE slug IS NULL;

-- Make slug NOT NULL and UNIQUE after data migration
ALTER TABLE unified_quests 
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT unified_quests_slug_unique UNIQUE (slug);

-- Add index for slug lookups
CREATE INDEX IF NOT EXISTS unified_quests_slug_idx ON unified_quests(slug);

-- ============================================================================
-- 4. Helper function: Award Points to user
-- ============================================================================

CREATE OR REPLACE FUNCTION award_points(
  p_fid BIGINT,
  p_amount BIGINT,
  p_source TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  -- Update user profile (add Points)
  UPDATE user_profiles
  SET 
    points = points + p_amount,
    total_points_earned = total_points_earned + p_amount
  WHERE fid = p_fid
  RETURNING points INTO v_new_balance;
  
  -- If user doesn't exist, return 0
  IF v_new_balance IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Log transaction
  INSERT INTO points_transactions (fid, amount, source, balance_after, metadata)
  VALUES (p_fid, p_amount, p_source, v_new_balance, p_metadata);
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Helper function: Spend Points from user
-- ============================================================================

CREATE OR REPLACE FUNCTION spend_points(
  p_fid BIGINT,
  p_amount BIGINT,
  p_source TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS BIGINT AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Check current balance
  SELECT points INTO v_current_balance
  FROM user_profiles
  WHERE fid = p_fid;
  
  -- If user doesn't exist or insufficient balance, raise exception
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_fid;
  END IF;
  
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Points: has %, needs %', v_current_balance, p_amount;
  END IF;
  
  -- Update user profile (subtract Points)
  UPDATE user_profiles
  SET 
    points = points - p_amount,
    total_points_spent = total_points_spent + p_amount
  WHERE fid = p_fid
  RETURNING points INTO v_new_balance;
  
  -- Log transaction (negative amount)
  INSERT INTO points_transactions (fid, amount, source, balance_after, metadata)
  VALUES (p_fid, -p_amount, p_source, v_new_balance, p_metadata);
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Helper function: Get Points balance
-- ============================================================================

CREATE OR REPLACE FUNCTION get_points_balance(p_fid BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  SELECT points INTO v_balance
  FROM user_profiles
  WHERE fid = p_fid;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Helper function: Get Points transaction history
-- ============================================================================

CREATE OR REPLACE FUNCTION get_points_transactions(
  p_fid BIGINT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  amount BIGINT,
  source TEXT,
  balance_after BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.amount,
    pt.source,
    pt.balance_after,
    pt.metadata,
    pt.created_at
  FROM points_transactions pt
  WHERE pt.fid = p_fid
  ORDER BY pt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Update quest_completions to automatically award Points
-- ============================================================================

CREATE OR REPLACE FUNCTION on_quest_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Award Points to completer
  PERFORM award_points(
    NEW.completer_fid,
    NEW.points_awarded,
    CONCAT('quest_completion:', NEW.quest_id),
    jsonb_build_object(
      'quest_id', NEW.quest_id,
      'completion_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_quest_completion_trigger ON quest_completions;
CREATE TRIGGER on_quest_completion_trigger
  AFTER INSERT ON quest_completions
  FOR EACH ROW
  EXECUTE FUNCTION on_quest_completion();

-- ============================================================================
-- 9. Enable RLS on points_transactions
-- ============================================================================

ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own Points transactions"
  ON points_transactions FOR SELECT
  USING (fid = current_setting('app.current_user_fid', true)::BIGINT);

-- Anyone can view Points balances (for leaderboards)
-- This is already covered by user_profiles RLS policies

-- ============================================================================
-- 10. Create Points leaderboard view
-- ============================================================================

CREATE OR REPLACE VIEW points_leaderboard AS
SELECT 
  fid,
  points as current_balance,
  total_points_earned,
  total_points_spent,
  (total_points_earned - total_points_spent) as net_points,
  RANK() OVER (ORDER BY points DESC) as rank
FROM user_profiles
WHERE points > 0
ORDER BY points DESC;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Summary:
-- ✅ Added Points columns to user_profiles (points, total_points_earned, total_points_spent)
-- ✅ Created points_transactions table for transaction log
-- ✅ Added slug column to unified_quests (unique, indexed)
-- ✅ Created helper functions (award_points, spend_points, get_points_balance, get_points_transactions)
-- ✅ Created trigger to automatically award Points on quest completion
-- ✅ Enabled RLS on points_transactions
-- ✅ Created points_leaderboard view

COMMENT ON TABLE points_transactions IS 'Points transaction log - tracks all Points earned and spent';
COMMENT ON COLUMN points_transactions.amount IS 'Positive = earned, Negative = spent';
COMMENT ON COLUMN points_transactions.source IS 'Transaction source: quest_completion:ID, quest_creation, badge_mint, etc.';
COMMENT ON COLUMN unified_quests.slug IS 'URL-friendly unique identifier for quests (e.g., quest-1, quest-2)';
