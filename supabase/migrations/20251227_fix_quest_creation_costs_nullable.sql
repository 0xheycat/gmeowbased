-- Fix quest_creation_costs.quest_id to allow NULL
-- Issue: Escrow record is created BEFORE quest exists, so quest_id must be nullable initially
-- Date: December 27, 2025

-- 1. Drop foreign key constraint
ALTER TABLE quest_creation_costs 
  DROP CONSTRAINT IF EXISTS quest_creation_costs_quest_id_fkey;

-- 2. Make quest_id nullable
ALTER TABLE quest_creation_costs 
  ALTER COLUMN quest_id DROP NOT NULL;

-- 3. Re-add foreign key constraint (allowing NULL)
ALTER TABLE quest_creation_costs 
  ADD CONSTRAINT quest_creation_costs_quest_id_fkey 
  FOREIGN KEY (quest_id) 
  REFERENCES unified_quests(id) 
  ON DELETE CASCADE;

-- Comment explaining the change
COMMENT ON COLUMN quest_creation_costs.quest_id IS 
  'Quest ID (nullable initially - populated after quest creation completes)';
