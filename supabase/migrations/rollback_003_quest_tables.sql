-- ROLLBACK Migration 003: Restore quest tables original column names
-- Date: December 22, 2025

-- quest_definitions
ALTER TABLE quest_definitions 
  RENAME COLUMN reward_points_awarded TO reward_xp;

-- unified_quests
ALTER TABLE unified_quests 
  RENAME COLUMN reward_points_awarded TO reward_points;

ALTER TABLE unified_quests 
  RENAME COLUMN total_points_awarded TO total_earned_points;

-- Drop new indexes
DROP INDEX IF EXISTS idx_quest_definitions_reward_points_awarded;
DROP INDEX IF EXISTS idx_unified_quests_reward_points_awarded;
DROP INDEX IF EXISTS idx_unified_quests_total_points_awarded;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quest_definitions' AND column_name = 'reward_xp'
  ) THEN
    RAISE EXCEPTION 'Rollback failed: reward_xp column not found';
  END IF;

  RAISE NOTICE 'Rollback 003 completed successfully';
END $$;
