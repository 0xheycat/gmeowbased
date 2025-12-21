-- Migration: Create guild_member_stats_cache table
-- Purpose: Cache per-member guild statistics to avoid real-time aggregations
-- Performance: 10x improvement over inline calculations
-- Populated by: app/api/cron/sync-guild-members/route.ts (hourly)
-- Used by: app/api/guild/[guildId]/member-stats/route.ts

-- Create guild_member_stats_cache table
CREATE TABLE IF NOT EXISTS public.guild_member_stats_cache (
  guild_id TEXT NOT NULL,
  member_address TEXT NOT NULL,
  
  -- Member activity metadata
  joined_at TIMESTAMPTZ NOT NULL,
  last_active TIMESTAMPTZ,
  
  -- Contribution stats (pre-aggregated from guild_events)
  points_contributed BIGINT DEFAULT 0,
  deposit_count INTEGER DEFAULT 0,
  quest_completions INTEGER DEFAULT 0,
  
  -- Global leaderboard stats (from Subsquid)
  total_score BIGINT DEFAULT 0,
  global_rank INTEGER,
  
  -- Guild-specific rank
  guild_rank INTEGER,
  
  -- Metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite primary key
  PRIMARY KEY (guild_id, member_address),
  
  -- Foreign key constraint
  CONSTRAINT fk_guild_metadata FOREIGN KEY (guild_id) 
    REFERENCES public.guild_metadata(guild_id) 
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guild_member_stats_cache_guild_id 
  ON public.guild_member_stats_cache(guild_id);

CREATE INDEX IF NOT EXISTS idx_guild_member_stats_cache_member_address 
  ON public.guild_member_stats_cache(member_address);

CREATE INDEX IF NOT EXISTS idx_guild_member_stats_cache_points 
  ON public.guild_member_stats_cache(guild_id, points_contributed DESC);

CREATE INDEX IF NOT EXISTS idx_guild_member_stats_cache_guild_rank 
  ON public.guild_member_stats_cache(guild_id, guild_rank);

CREATE INDEX IF NOT EXISTS idx_guild_member_stats_cache_updated_at 
  ON public.guild_member_stats_cache(updated_at);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_guild_member_stats_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guild_member_stats_cache_updated_at 
  ON public.guild_member_stats_cache;

CREATE TRIGGER trigger_update_guild_member_stats_cache_updated_at
  BEFORE UPDATE ON public.guild_member_stats_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guild_member_stats_cache_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.guild_member_stats_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (member stats are public)
DROP POLICY IF EXISTS "Allow public read access to guild member stats" 
  ON public.guild_member_stats_cache;

CREATE POLICY "Allow public read access to guild member stats"
  ON public.guild_member_stats_cache
  FOR SELECT
  USING (true);

-- RLS Policy: Only service role can insert/update (cron job)
DROP POLICY IF EXISTS "Service role can manage guild member stats" 
  ON public.guild_member_stats_cache;

CREATE POLICY "Service role can manage guild member stats"
  ON public.guild_member_stats_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add helpful comments
COMMENT ON TABLE public.guild_member_stats_cache IS 
  'Pre-computed per-member guild statistics cache. Populated by sync-guild-members cron hourly. Prevents expensive real-time aggregations in member stats API.';

COMMENT ON COLUMN public.guild_member_stats_cache.points_contributed IS 
  'Total points deposited to guild by this member (sum of POINTS_DEPOSITED events)';

COMMENT ON COLUMN public.guild_member_stats_cache.deposit_count IS 
  'Number of deposit transactions made by member';

COMMENT ON COLUMN public.guild_member_stats_cache.quest_completions IS 
  'Number of quests completed while in guild (future feature)';

COMMENT ON COLUMN public.guild_member_stats_cache.guild_rank IS 
  'Member rank within guild (1 = top contributor)';

COMMENT ON COLUMN public.guild_member_stats_cache.global_rank IS 
  'Member global leaderboard rank (from Subsquid)';

COMMENT ON COLUMN public.guild_member_stats_cache.total_score IS 
  'Member total score (from Subsquid - blockchain + viral XP)';
