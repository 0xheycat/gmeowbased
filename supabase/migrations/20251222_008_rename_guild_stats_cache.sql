-- Migration: Rename guild_stats_cache.total_points → treasury_points
-- Date: December 22, 2025
-- Priority: P4 (API Routes Migration)
-- Context: Align with Subsquid Guild.treasuryPoints (guild treasury balance)
--
-- CRITICAL: This is guild treasury points, NOT aggregate member points
-- Source: Subsquid schema.graphql Guild.treasuryPoints (from contract getGuildInfo().treasuryPoints)

-- 1. Rename total_points → treasury_points
ALTER TABLE IF EXISTS public.guild_stats_cache
  RENAME COLUMN total_points TO treasury_points;

-- 2. Update column comment
COMMENT ON COLUMN public.guild_stats_cache.treasury_points IS 
  'Guild treasury balance (matches Subsquid Guild.treasuryPoints from contract)';

-- Verification: Confirm column renamed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'guild_stats_cache' 
      AND column_name = 'total_points'
  ) THEN
    RAISE EXCEPTION 'Migration failed: total_points column still exists (should be treasury_points)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'guild_stats_cache' 
      AND column_name = 'treasury_points'
  ) THEN
    RAISE EXCEPTION 'Migration failed: treasury_points column not found';
  END IF;

  RAISE NOTICE 'Migration successful: guild_stats_cache.treasury_points created';
END $$;
