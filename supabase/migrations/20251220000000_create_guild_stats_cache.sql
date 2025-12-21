-- Migration: Create guild_stats_cache table
-- Created: 2025-12-20
-- Purpose: Cache basic guild statistics for guild list API
-- Updated by: sync-guilds cron (every 6 hours)

-- Create guild_stats_cache table
CREATE TABLE IF NOT EXISTS public.guild_stats_cache (
  guild_id TEXT PRIMARY KEY,
  member_count INTEGER NOT NULL DEFAULT 0,
  total_points BIGINT NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  treasury_balance BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  leader_address TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guild_stats_cache_is_active 
  ON public.guild_stats_cache(is_active);

CREATE INDEX IF NOT EXISTS idx_guild_stats_cache_leader 
  ON public.guild_stats_cache(leader_address);

-- Disable RLS (public read access, no sensitive data)
ALTER TABLE public.guild_stats_cache DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON public.guild_stats_cache TO anon, authenticated;
GRANT ALL ON public.guild_stats_cache TO service_role;
