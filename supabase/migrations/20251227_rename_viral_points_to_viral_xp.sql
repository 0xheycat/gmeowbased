-- Rename viral_points to viral_xp (architectural accuracy fix)
-- Date: December 27, 2025
-- Reason: Column stores XP values (progression metric), not Points (currency)
-- Impact: Aligns with quest system (min_viral_xp_required) and XP vs Points distinction
-- Migration: Applied via mcp_supabase_apply_migration on December 27, 2025

-- ═══════════════════════════════════════════════════════════════════════════
-- 🎯 ARCHITECTURAL JUSTIFICATION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- XP vs Points: Two Separate Reward Systems
-- ──────────────────────────────────────────
-- XP (Progression):
--   - Purpose: Leveling/ranks (non-spendable, display only)
--   - Storage: user_points.xp, user_points_balances.viral_xp
--   - Usage: Quest unlock requirements (unified_quests.min_viral_xp_required)
--   - Behavior: Only increases (permanent progression)
--
-- Points (Currency):
--   - Purpose: Spendable currency (quest escrow, marketplace)
--   - Storage: user_points_balances.points_balance
--   - Usage: Quest rewards (unified_quests.reward_points_awarded)
--   - Behavior: Increases/decreases (spent on quests)
--
-- PROBLEM: Dec 22, 2024 migration renamed viral_xp → viral_points (WRONG!)
-- - Column name says "points" but stores XP values
-- - Inconsistent with quest system: user.viral_points vs quest.min_viral_xp_required
-- - Creates architectural confusion (mixing XP and Points terminology)
--
-- SOLUTION: Rename viral_points → viral_xp (correct data type naming)
-- - Matches quest system terminology (min_viral_xp_required)
-- - Self-documenting schema (viral_xp stores XP, not Points)
-- - Consistent with XP vs Points architectural distinction

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION SQL
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE user_points_balances 
  RENAME COLUMN viral_points TO viral_xp;

COMMENT ON COLUMN user_points_balances.viral_xp IS 
  'XP from viral Farcaster engagement (likes, recasts, replies). Progression metric only, separate from Points currency. Used for quest unlock requirements (min_viral_xp_required). Cannot be spent - display only.';

-- ═══════════════════════════════════════════════════════════════════════════
-- AFFECTED FILES (requires TypeScript updates)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- TypeScript Type Updates Required:
-- 1. types/supabase.generated.ts - UserPointsBalances interface
-- 2. All queries selecting user_points_balances.viral_points
-- 3. Estimated: 10-15 files need viral_points → viral_xp rename
--
-- Grep to find affected files:
-- grep -r "viral_points" lib/**/*.ts app/**/*.ts

-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK PLAN (if needed)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ALTER TABLE user_points_balances 
--   RENAME COLUMN viral_xp TO viral_points;
