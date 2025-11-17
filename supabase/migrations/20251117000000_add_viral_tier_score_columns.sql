-- ============================================================================
-- Add viral_tier and viral_score columns to badge_casts
-- ============================================================================
-- Phase 5.1 Prerequisite: Enable viral tier tracking on badge_casts table
-- Project: Gmeowbased (@gmeowbased)
-- Founder: @heycat
-- Created: November 17, 2025
-- MCP Verified: November 17, 2025
-- Applied: November 17, 2025
-- ============================================================================

ALTER TABLE badge_casts 
  ADD COLUMN IF NOT EXISTS viral_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viral_tier TEXT DEFAULT 'none';

-- Add index for viral tier queries
CREATE INDEX IF NOT EXISTS idx_badge_casts_viral_tier 
  ON badge_casts(viral_tier);

-- Add index for viral score queries
CREATE INDEX IF NOT EXISTS idx_badge_casts_viral_score 
  ON badge_casts(viral_score DESC);

-- Add comments
COMMENT ON COLUMN badge_casts.viral_score IS 
  'Phase 5.1: Viral engagement score calculated from: (recasts × 10) + (replies × 5) + (likes × 2)';
COMMENT ON COLUMN badge_casts.viral_tier IS 
  'Phase 5.1: Viral tier (none, active, engaging, popular, viral, mega_viral) based on viral_score';
