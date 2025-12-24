-- Migration: Add member_role to guild_member_stats_cache
-- Phase: 2.1 - Member Role & Permissions
-- Purpose: Track guild member roles (LEADER, OFFICER, MEMBER)
-- Synced by: .github/workflows/sync-guild-stats.yml (hourly from Subsquid)

-- Add member_role column
ALTER TABLE public.guild_member_stats_cache 
  ADD COLUMN IF NOT EXISTS member_role TEXT DEFAULT 'member' NOT NULL;

-- Add check constraint for valid roles
ALTER TABLE public.guild_member_stats_cache 
  ADD CONSTRAINT check_member_role 
  CHECK (member_role IN ('leader', 'officer', 'member'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_guild_member_stats_cache_role 
  ON public.guild_member_stats_cache(guild_id, member_role);

-- Add helpful comments
COMMENT ON COLUMN public.guild_member_stats_cache.member_role IS 
  'Member role in guild: leader (guild owner), officer (can manage members), or member (default)';
