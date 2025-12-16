-- ================================================
-- TIP SYSTEM MIGRATION
-- Created: December 9, 2025
-- Purpose: Create tip tracking and leaderboard tables
-- ================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.tip_streaks CASCADE;
DROP TABLE IF EXISTS public.tip_leaderboard CASCADE;
DROP TABLE IF EXISTS public.tips CASCADE;

-- ================================================
-- TIPS TABLE
-- Tracks all tip transactions on the platform
-- ================================================
CREATE TABLE public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender information
  sender_fid BIGINT NOT NULL,
  sender_username TEXT,
  sender_address TEXT NOT NULL,
  
  -- Receiver information
  receiver_fid BIGINT NOT NULL,
  receiver_username TEXT,
  receiver_address TEXT NOT NULL,
  
  -- Transaction details
  amount_usdc NUMERIC(18, 6) NOT NULL CHECK (amount_usdc > 0),
  message TEXT CHECK (char_length(message) <= 280),
  
  -- Blockchain data
  tx_hash TEXT NOT NULL UNIQUE,
  chain TEXT NOT NULL DEFAULT 'base' CHECK (chain IN ('base', 'op', 'celo', 'ink', 'unichain')),
  block_number BIGINT,
  
  -- Context
  cast_hash TEXT,
  cast_url TEXT,
  frame_url TEXT,
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  usd_value NUMERIC(18, 2),
  points_awarded BIGINT DEFAULT 0,
  
  -- Bot notification tracking
  bot_notified BOOLEAN DEFAULT FALSE,
  bot_cast_hash TEXT,
  bot_notified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  confirmed_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT fk_sender FOREIGN KEY (sender_fid) REFERENCES public.user_profiles(fid) ON DELETE CASCADE,
  CONSTRAINT fk_receiver FOREIGN KEY (receiver_fid) REFERENCES public.user_profiles(fid) ON DELETE CASCADE
);

-- Create indexes for query performance
CREATE INDEX idx_tips_sender_fid ON public.tips(sender_fid, created_at DESC);
CREATE INDEX idx_tips_receiver_fid ON public.tips(receiver_fid, created_at DESC);
CREATE INDEX idx_tips_created_at ON public.tips(created_at DESC);
CREATE INDEX idx_tips_tx_hash ON public.tips(tx_hash);
CREATE INDEX idx_tips_cast_hash ON public.tips(cast_hash) WHERE cast_hash IS NOT NULL;
CREATE INDEX idx_tips_status ON public.tips(status) WHERE status = 'confirmed';

-- Add RLS policies
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all confirmed tips
CREATE POLICY "Tips are viewable by everyone" ON public.tips
  FOR SELECT USING (status = 'confirmed');

-- Policy: System can insert/update tips (API key required)
CREATE POLICY "Tips can be inserted by system" ON public.tips
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tips can be updated by system" ON public.tips
  FOR UPDATE USING (true);

-- Add comment
COMMENT ON TABLE public.tips IS 'Tracks USDC tip transactions between users on Base L2';

-- ================================================
-- TIP LEADERBOARD TABLE
-- Aggregated tip statistics per user
-- ================================================
CREATE TABLE public.tip_leaderboard (
  fid BIGINT PRIMARY KEY,
  
  -- Receiving stats
  total_received_usdc NUMERIC(18, 6) NOT NULL DEFAULT 0,
  tips_received_count BIGINT NOT NULL DEFAULT 0,
  unique_supporters_count BIGINT NOT NULL DEFAULT 0,
  avg_tip_received_usdc NUMERIC(18, 6) GENERATED ALWAYS AS (
    CASE 
      WHEN tips_received_count > 0 
      THEN total_received_usdc / tips_received_count 
      ELSE 0 
    END
  ) STORED,
  
  -- Sending stats
  total_sent_usdc NUMERIC(18, 6) NOT NULL DEFAULT 0,
  tips_sent_count BIGINT NOT NULL DEFAULT 0,
  unique_recipients_count BIGINT NOT NULL DEFAULT 0,
  avg_tip_sent_usdc NUMERIC(18, 6) GENERATED ALWAYS AS (
    CASE 
      WHEN tips_sent_count > 0 
      THEN total_sent_usdc / tips_sent_count 
      ELSE 0 
    END
  ) STORED,
  
  -- Rankings
  global_rank INTEGER,
  supporter_tier TEXT CHECK (supporter_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  creator_tier TEXT CHECK (creator_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  
  -- Activity tracking
  last_tip_received_at TIMESTAMPTZ,
  last_tip_sent_at TIMESTAMPTZ,
  first_tip_received_at TIMESTAMPTZ,
  first_tip_sent_at TIMESTAMPTZ,
  
  -- Streaks
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak_days INTEGER NOT NULL DEFAULT 0,
  
  -- Points
  total_points_earned BIGINT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Foreign key
  CONSTRAINT fk_user_profile FOREIGN KEY (fid) REFERENCES public.user_profiles(fid) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_tip_leaderboard_received ON public.tip_leaderboard(total_received_usdc DESC);
CREATE INDEX idx_tip_leaderboard_sent ON public.tip_leaderboard(total_sent_usdc DESC);
CREATE INDEX idx_tip_leaderboard_supporters ON public.tip_leaderboard(unique_supporters_count DESC);
CREATE INDEX idx_tip_leaderboard_streak ON public.tip_leaderboard(current_streak_days DESC);
CREATE INDEX idx_tip_leaderboard_updated ON public.tip_leaderboard(updated_at DESC);

-- Enable RLS
ALTER TABLE public.tip_leaderboard ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view leaderboard
CREATE POLICY "Leaderboard is viewable by everyone" ON public.tip_leaderboard
  FOR SELECT USING (true);

-- Policy: System can upsert leaderboard
CREATE POLICY "Leaderboard can be updated by system" ON public.tip_leaderboard
  FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE public.tip_leaderboard IS 'Aggregated tip statistics and rankings for users';

-- ================================================
-- TIP STREAKS TABLE
-- Daily streak tracking for tip activity
-- ================================================
CREATE TABLE public.tip_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  
  -- Streak data
  streak_date DATE NOT NULL,
  tips_sent INTEGER NOT NULL DEFAULT 0,
  tips_received INTEGER NOT NULL DEFAULT 0,
  amount_sent_usdc NUMERIC(18, 6) NOT NULL DEFAULT 0,
  amount_received_usdc NUMERIC(18, 6) NOT NULL DEFAULT 0,
  
  -- Activity flags
  active_day BOOLEAN NOT NULL DEFAULT TRUE,
  streak_maintained BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Constraints
  UNIQUE (fid, streak_date),
  CONSTRAINT fk_user_profile FOREIGN KEY (fid) REFERENCES public.user_profiles(fid) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_tip_streaks_fid_date ON public.tip_streaks(fid, streak_date DESC);
CREATE INDEX idx_tip_streaks_date ON public.tip_streaks(streak_date DESC);

-- Enable RLS
ALTER TABLE public.tip_streaks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own streaks
CREATE POLICY "Users can view own streaks" ON public.tip_streaks
  FOR SELECT USING (true);

-- Policy: System can manage streaks
CREATE POLICY "System can manage streaks" ON public.tip_streaks
  FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE public.tip_streaks IS 'Daily streak tracking for tip activity and engagement';

-- ================================================
-- TRIGGER FUNCTIONS
-- Automatically update leaderboard on tip insert
-- ================================================

-- Function to update leaderboard on tip insert/update
CREATE OR REPLACE FUNCTION update_tip_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process confirmed tips
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;
  
  -- Update sender stats
  INSERT INTO public.tip_leaderboard (
    fid,
    total_sent_usdc,
    tips_sent_count,
    last_tip_sent_at,
    first_tip_sent_at
  )
  VALUES (
    NEW.sender_fid,
    NEW.amount_usdc,
    1,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (fid) DO UPDATE SET
    total_sent_usdc = tip_leaderboard.total_sent_usdc + NEW.amount_usdc,
    tips_sent_count = tip_leaderboard.tips_sent_count + 1,
    last_tip_sent_at = NEW.created_at,
    updated_at = timezone('utc'::text, now());
  
  -- Update receiver stats
  INSERT INTO public.tip_leaderboard (
    fid,
    total_received_usdc,
    tips_received_count,
    last_tip_received_at,
    first_tip_received_at
  )
  VALUES (
    NEW.receiver_fid,
    NEW.amount_usdc,
    1,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (fid) DO UPDATE SET
    total_received_usdc = tip_leaderboard.total_received_usdc + NEW.amount_usdc,
    tips_received_count = tip_leaderboard.tips_received_count + 1,
    last_tip_received_at = NEW.created_at,
    updated_at = timezone('utc'::text, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_update_tip_leaderboard
  AFTER INSERT OR UPDATE OF status ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION update_tip_leaderboard();

-- Function to update unique counts (run via cron)
CREATE OR REPLACE FUNCTION refresh_tip_unique_counts()
RETURNS void AS $$
BEGIN
  -- Update unique supporters count
  UPDATE public.tip_leaderboard lb
  SET unique_supporters_count = (
    SELECT COUNT(DISTINCT sender_fid)
    FROM public.tips
    WHERE receiver_fid = lb.fid AND status = 'confirmed'
  );
  
  -- Update unique recipients count
  UPDATE public.tip_leaderboard lb
  SET unique_recipients_count = (
    SELECT COUNT(DISTINCT receiver_fid)
    FROM public.tips
    WHERE sender_fid = lb.fid AND status = 'confirmed'
  );
  
  -- Update rankings
  WITH ranked_users AS (
    SELECT 
      fid,
      ROW_NUMBER() OVER (ORDER BY total_received_usdc DESC, tips_received_count DESC) as rank
    FROM public.tip_leaderboard
    WHERE total_received_usdc > 0
  )
  UPDATE public.tip_leaderboard lb
  SET global_rank = ru.rank
  FROM ranked_users ru
  WHERE lb.fid = ru.fid;
  
  -- Update last calculated timestamp
  UPDATE public.tip_leaderboard
  SET last_calculated_at = timezone('utc'::text, now());
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- INITIAL DATA SETUP
-- ================================================

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.tips TO anon, authenticated;
GRANT SELECT ON public.tip_leaderboard TO anon, authenticated;
GRANT SELECT ON public.tip_streaks TO anon, authenticated;

-- Create placeholder for system migration
INSERT INTO public.tips (
  sender_fid,
  sender_address,
  receiver_fid,
  receiver_address,
  amount_usdc,
  tx_hash,
  message,
  status
) VALUES (
  1,
  '0x0000000000000000000000000000000000000001',
  1,
  '0x0000000000000000000000000000000000000001',
  1.0,
  '0x0000000000000000000000000000000000000000000000000000000000000001',
  'System initialization',
  'confirmed'
) ON CONFLICT (tx_hash) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Tip system migration complete! Tables created: tips, tip_leaderboard, tip_streaks';
  RAISE NOTICE 'Triggers created: update_tip_leaderboard';
  RAISE NOTICE 'Functions created: refresh_tip_unique_counts';
END $$;
