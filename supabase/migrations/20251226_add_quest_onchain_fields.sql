-- Migration: Quest Onchain Integration
-- Created: December 26, 2025
-- Applied via: MCP Supabase (mcp_supabase_apply_migration)
-- Status: ✅ LIVE IN PRODUCTION
-- Purpose: Enable quest creation with onchain escrow via GmeowCore contract

-- Add onchain integration columns to unified_quests table
ALTER TABLE unified_quests
  ADD COLUMN onchain_quest_id bigint,
  ADD COLUMN escrow_tx_hash text,
  ADD COLUMN onchain_status text DEFAULT 'pending',
  ADD COLUMN last_synced_at timestamptz;

-- Add comments explaining contract mapping (4-layer naming convention)
COMMENT ON COLUMN unified_quests.onchain_quest_id IS 
  'Quest ID from GmeowCore.addQuest() return value (auto-increment onchain). Maps to QuestAdded.questId event field.';

COMMENT ON COLUMN unified_quests.escrow_tx_hash IS 
  'Transaction hash of addQuest() call (proof of escrow). Used to link offchain quest metadata to onchain escrow.';

COMMENT ON COLUMN unified_quests.onchain_status IS 
  'Quest status from contract: pending (not yet created onchain), active (escrowed via addQuest), completed (all rewards distributed), paused (temporarily stopped), closed (refunded). Synced from Subsquid indexer.';

COMMENT ON COLUMN unified_quests.last_synced_at IS 
  'Last sync timestamp from Subsquid indexer (QuestAdded/QuestCompleted events)';

-- Add constraints
ALTER TABLE unified_quests
  ADD CONSTRAINT chk_unified_quests_onchain_status 
    CHECK (onchain_status IN ('pending', 'active', 'completed', 'paused', 'closed'));

ALTER TABLE unified_quests
  ADD CONSTRAINT uq_unified_quests_onchain_quest_id 
    UNIQUE (onchain_quest_id);

-- Add performance indexes (partial - only index non-null values)
CREATE INDEX idx_unified_quests_onchain_quest_id 
  ON unified_quests(onchain_quest_id) 
  WHERE onchain_quest_id IS NOT NULL;

CREATE INDEX idx_unified_quests_escrow_tx_hash 
  ON unified_quests(escrow_tx_hash) 
  WHERE escrow_tx_hash IS NOT NULL;

CREATE INDEX idx_unified_quests_onchain_status 
  ON unified_quests(onchain_status) 
  WHERE onchain_status IS NOT NULL;

-- Migration Notes:
-- - All columns nullable (zero downtime, backward compatible)
-- - Default 'pending' status for quests not yet created onchain
-- - Unique constraint ensures one-to-one mapping (onchain_quest_id → database quest)
-- - Partial indexes for performance (doesn't index pending quests)
-- 
-- Contract Schema (GmeowCore):
-- function addQuest(
--   string memory name,
--   uint8 questType,
--   uint256 target,
--   uint256 rewardPointsPerUser,  // Contract param (camelCase)
--   uint256 maxCompletions,
--   uint256 expiresAt,
--   string memory meta
-- ) external returns (uint256 questId)
--
-- event QuestAdded(
--   uint256 indexed questId,
--   address indexed creator,
--   uint8 questType,
--   uint256 rewardPerUserPoints,  // Event field (camelCase - different from param!)
--   uint256 maxCompletions
-- )
--
-- 4-Layer Naming Convention:
-- Contract Function Param: rewardPointsPerUser (camelCase)
--        ↓
-- Contract Event Field:    rewardPerUserPoints (camelCase)
--        ↓
-- Subsquid Handler:        rewardPerUserPoints (exact match from event)
--        ↓
-- Supabase Schema:         reward_points_awarded (snake_case) ✅
--        ↓
-- API Layer:               rewardPointsAwarded (camelCase)
