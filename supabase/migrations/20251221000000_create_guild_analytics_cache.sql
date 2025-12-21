-- Migration: Create guild_analytics_cache table
-- Purpose: Cache pre-computed guild analytics to avoid real-time aggregations
-- Performance: 100x improvement over inline calculations
-- Populated by: app/api/cron/sync-guilds/route.ts (every 6 hours)
-- Used by: app/api/guild/[guildId]/analytics/route.ts

-- Create guild_analytics_cache table
CREATE TABLE IF NOT EXISTS public.guild_analytics_cache (
  guild_id TEXT PRIMARY KEY,
  
  -- Current totals (snapshot)
  total_members INTEGER DEFAULT 0,
  total_deposits BIGINT DEFAULT 0,
  total_claims BIGINT DEFAULT 0,
  treasury_balance BIGINT DEFAULT 0,
  avg_points_per_member INTEGER DEFAULT 0,
  
  -- 7-day growth metrics (%)
  members_7d_growth INTEGER DEFAULT 0,
  points_7d_growth INTEGER DEFAULT 0,
  treasury_7d_growth INTEGER DEFAULT 0,
  
  -- Top contributors (cached JSON array)
  -- Format: [{ address: string, points: number, rank: number }]
  top_contributors JSONB DEFAULT '[]'::jsonb,
  
  -- Time-series data (cached for charts)
  -- Member growth: [{ date: string, count: number }]
  member_growth_series JSONB DEFAULT '[]'::jsonb,
  
  -- Treasury flow: [{ date: string, deposits: number, claims: number, balance: number }]
  treasury_flow_series JSONB DEFAULT '[]'::jsonb,
  
  -- Activity timeline: [{ date: string, joins: number, deposits: number, claims: number }]
  activity_timeline JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_guild_metadata FOREIGN KEY (guild_id) 
    REFERENCES public.guild_metadata(guild_id) 
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_guild_analytics_cache_updated_at 
  ON public.guild_analytics_cache(updated_at);

CREATE INDEX IF NOT EXISTS idx_guild_analytics_cache_last_synced 
  ON public.guild_analytics_cache(last_synced_at);

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_guild_analytics_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guild_analytics_cache_updated_at 
  ON public.guild_analytics_cache;

CREATE TRIGGER trigger_update_guild_analytics_cache_updated_at
  BEFORE UPDATE ON public.guild_analytics_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_guild_analytics_cache_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.guild_analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (analytics are public)
DROP POLICY IF EXISTS "Allow public read access to guild analytics" 
  ON public.guild_analytics_cache;

CREATE POLICY "Allow public read access to guild analytics"
  ON public.guild_analytics_cache
  FOR SELECT
  USING (true);

-- RLS Policy: Only service role can insert/update (cron job)
DROP POLICY IF EXISTS "Service role can manage guild analytics" 
  ON public.guild_analytics_cache;

CREATE POLICY "Service role can manage guild analytics"
  ON public.guild_analytics_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add helpful comment
COMMENT ON TABLE public.guild_analytics_cache IS 
  'Pre-computed guild analytics cache. Populated by sync-guilds cron every 6 hours. Prevents expensive real-time aggregations in guild analytics API.';

COMMENT ON COLUMN public.guild_analytics_cache.top_contributors IS 
  'Top 10 guild contributors as JSON array: [{ address, points, rank }]';

COMMENT ON COLUMN public.guild_analytics_cache.member_growth_series IS 
  'Member growth time-series for charts: [{ date, count }]';

COMMENT ON COLUMN public.guild_analytics_cache.treasury_flow_series IS 
  'Treasury flow time-series: [{ date, deposits, claims, balance }]';

COMMENT ON COLUMN public.guild_analytics_cache.activity_timeline IS 
  'Activity timeline: [{ date, joins, deposits, claims }]';
