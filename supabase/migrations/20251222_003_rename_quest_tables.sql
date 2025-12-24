-- Migration 003: Rename quest table columns to match contract event naming
-- Date: December 22, 2025
-- Phase: P1 - Supabase Schema Migration
-- Breaking Change: YES - Column renames

-- ============================================================================
-- CHANGES
-- ============================================================================
-- quest_definitions:
--   1. reward_xp → reward_points_awarded (match QuestCompleted.pointsAwarded event)
--   2. reward_points → reward_points_awarded (consolidate naming)
--
-- unified_quests:
--   1. reward_points → reward_points_awarded (match event name)
--   2. total_earned_points → total_points_awarded (consistent with event)

-- ============================================================================
-- TABLE 1: quest_definitions
-- ============================================================================

-- Rename reward_xp to reward_points_awarded
ALTER TABLE quest_definitions 
  RENAME COLUMN reward_xp TO reward_points_awarded;

-- If reward_points column exists, consolidate it
-- (Note: Check if both columns exist in production)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_definitions' AND column_name = 'reward_points'
  ) THEN
    -- If reward_points has different values, you may need to merge logic
    -- For now, we'll drop it and use reward_points_awarded
    ALTER TABLE quest_definitions DROP COLUMN reward_points;
    RAISE NOTICE 'Dropped duplicate reward_points column';
  END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_quest_definitions_reward_points_awarded 
  ON quest_definitions(reward_points_awarded);

-- Add comment
COMMENT ON COLUMN quest_definitions.reward_points_awarded IS 
  'Points awarded on quest completion (matches contract QuestCompleted.pointsAwarded event field)';

-- ============================================================================
-- TABLE 2: unified_quests
-- ============================================================================

-- Rename reward_points to reward_points_awarded
ALTER TABLE unified_quests 
  RENAME COLUMN reward_points TO reward_points_awarded;

-- Rename total_earned_points to total_points_awarded
ALTER TABLE unified_quests 
  RENAME COLUMN total_earned_points TO total_points_awarded;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_unified_quests_reward_points_awarded 
  ON unified_quests(reward_points_awarded);

CREATE INDEX IF NOT EXISTS idx_unified_quests_total_points_awarded 
  ON unified_quests(total_points_awarded);

-- Add comments
COMMENT ON COLUMN unified_quests.reward_points_awarded IS 
  'Points awarded per quest completion (matches contract QuestCompleted.pointsAwarded)';

COMMENT ON COLUMN unified_quests.total_points_awarded IS 
  'Cumulative points awarded by this quest (sum of all completions × reward_points_awarded)';

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  -- Validate quest_definitions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_definitions' AND column_name = 'reward_points_awarded'
  ) THEN
    RAISE EXCEPTION 'Migration failed: quest_definitions.reward_points_awarded not found';
  END IF;

  -- Validate unified_quests
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unified_quests' AND column_name = 'reward_points_awarded'
  ) THEN
    RAISE EXCEPTION 'Migration failed: unified_quests.reward_points_awarded not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unified_quests' AND column_name = 'total_points_awarded'
  ) THEN
    RAISE EXCEPTION 'Migration failed: unified_quests.total_points_awarded not found';
  END IF;

  RAISE NOTICE 'Migration 003 completed successfully';
END $$;
