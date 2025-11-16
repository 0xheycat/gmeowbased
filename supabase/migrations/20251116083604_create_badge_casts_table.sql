-- Phase 5.7: Badge Cast Tracking Table
-- Logs all badge shares published to Warpcast via Cast API
-- Enables viral metrics tracking for bonus XP calculation (Phase 5.8)

CREATE TABLE IF NOT EXISTS badge_casts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fid INTEGER NOT NULL,
  badge_id TEXT NOT NULL,
  cast_hash TEXT NOT NULL UNIQUE,
  cast_url TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('mythic', 'legendary', 'epic', 'rare', 'common')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Future Phase 5.8: Viral engagement metrics
  likes_count INTEGER DEFAULT 0,
  recasts_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  viral_bonus_xp INTEGER DEFAULT 0,
  last_metrics_update TIMESTAMPTZ
);

-- Index for user cast history
CREATE INDEX IF NOT EXISTS idx_badge_casts_fid ON badge_casts(fid);

-- Index for badge tracking
CREATE INDEX IF NOT EXISTS idx_badge_casts_badge_id ON badge_casts(badge_id);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_badge_casts_created_at ON badge_casts(created_at DESC);

-- Index for cast hash lookup
CREATE INDEX IF NOT EXISTS idx_badge_casts_cast_hash ON badge_casts(cast_hash);

-- Foreign key to user_profiles (soft constraint, optional)
-- ALTER TABLE badge_casts ADD CONSTRAINT fk_badge_casts_user 
--   FOREIGN KEY (fid) REFERENCES user_profiles(fid) ON DELETE CASCADE;

COMMENT ON TABLE badge_casts IS 'Phase 5.7: Tracks badge shares published to Warpcast via Cast API. Enables viral metrics for Phase 5.8 bonus XP.';
COMMENT ON COLUMN badge_casts.cast_hash IS 'Warpcast cast hash (unique identifier)';
COMMENT ON COLUMN badge_casts.viral_bonus_xp IS 'Phase 5.8: Bonus XP earned from cast engagement (10 recasts = +50 XP)';
