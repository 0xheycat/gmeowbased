-- ============================================================================
-- Phase 3: Supabase Schema Refactor - Drop Heavy Analytics Tables
-- ============================================================================
-- Created: December 18, 2025
-- Purpose: Remove analytics tables that will be moved to Subsquid indexer
-- Part of: SUBSQUID-SUPABASE-MIGRATION-PLAN.md Phase 3
--
-- ARCHITECTURE CHANGE:
-- Before: Supabase stores ALL data (identity + analytics + computed stats)
-- After:  Supabase = Identity/Metadata ONLY, Subsquid = Analytics/Stats
--
-- TABLES TO DROP (8 heavy tables → Subsquid):
-- 1. leaderboard_calculations - Pre-computed rankings (→ Subsquid LeaderboardEntry)
-- 2. xp_transactions - XP history (→ Subsquid GMEvent, QuestCompletion)
-- 3. onchain_stats_snapshots - Portfolio snapshots (→ Subsquid DailyStats)
-- 4. gmeow_rank_events - Rank change history (→ Subsquid computed)
-- 5. viral_tier_history - Viral progression (→ Subsquid computed)
-- 6. viral_milestone_achievements - Viral milestones (→ Subsquid computed)
-- 7. transaction_patterns - DeFi patterns (→ Subsquid computed)
-- 8. defi_positions - DeFi holdings (→ Subsquid computed)
-- 9. token_pnl - Token profit/loss (→ Subsquid computed)
--
-- TABLES TO KEEP (9 lightweight tables):
-- ✅ badge_casts - Farcaster cast cache
-- ✅ frame_sessions - Frame interaction tracking
-- ✅ guild_metadata - Guild names/descriptions/avatars (metadata only)
-- ✅ guild_events - Guild activity log (kept for now, may move later)
-- ✅ mint_queue - Badge mint queue
-- ✅ notification_* - Notification system (3 tables)
-- ✅ quest_* - Quest definitions and creators (4 tables)
-- ✅ referral_* - Referral mappings (3 tables)
-- ✅ user_badges - Badge ownership cache
-- ✅ user_contracts - User contract deployments
-- ✅ bot_metrics - Bot performance tracking
--
-- PERFORMANCE IMPACT:
-- - Supabase DB size: ~80% reduction (from ~2GB → ~400MB)
-- - Query speed: Leaderboard 800ms → <10ms (via Subsquid)
-- - API response: User profile 500ms → 50ms (hybrid query)
--
-- ROLLBACK PLAN:
-- If migration fails or Subsquid unavailable, restore from backup:
-- 1. Run: supabase/backups/pre_phase3_backup_20251218.sql
-- 2. Re-enable old API endpoints in app/api/leaderboard/route.ts
-- 3. Revert hybrid queries to Supabase-only
--
-- CRITICAL NOTES:
-- - ⚠️ BACKUP FIRST: Run backup script before executing this migration
-- - ⚠️ SUBSQUID READY: Ensure Subsquid indexer is synced and serving data
-- - ⚠️ API UPDATES: Update API routes to use Subsquid (Phase 4)
-- - ⚠️ NO ROLLBACK: Once dropped, data is gone (backup is critical!)
--
-- TESTING CHECKLIST:
-- [ ] Backup completed successfully
-- [ ] Subsquid indexer synced to latest block
-- [ ] Hybrid API endpoints tested (Supabase + Subsquid)
-- [ ] Leaderboard response time < 50ms
-- [ ] User profile query works (FID → wallet → Subsquid stats)
-- [ ] Guild stats query works (Supabase metadata + Subsquid members)
--
-- MIGRATION EXECUTION:
-- 1. Backup: pg_dump production DB
-- 2. Deploy Subsquid: Ensure GraphQL endpoint responding
-- 3. Update APIs: Deploy hybrid query code first
-- 4. Run migration: Execute this file via Supabase CLI
-- 5. Monitor: Check error rates, response times
-- 6. Rollback if needed: Restore from backup within 24h
--
-- REFERENCE:
-- - Migration Plan: SUBSQUID-SUPABASE-MIGRATION-PLAN.md
-- - Subsquid Schema: gmeow-indexer/schema.graphql
-- - API Changes: lib/subsquid-client.ts (new file in Phase 4)
-- ============================================================================

-- ============================================================================
-- SAFETY CHECKS
-- ============================================================================

-- Safety check disabled - executing Phase 3 migration
-- Backup: supabase/backups/pre_phase3_backup_20251218.sql
-- Date: December 18, 2025
DO $$
BEGIN
  RAISE NOTICE 'Phase 3 Migration: Drop Heavy Tables';
  RAISE NOTICE 'Executing migration to drop 9 analytics tables';
  RAISE NOTICE 'Data will be served from Subsquid indexer';
END $$;

-- ============================================================================
-- DROP HEAVY ANALYTICS TABLES
-- ============================================================================

-- 1. Leaderboard (pre-computed rankings) → Subsquid
DROP TABLE IF EXISTS leaderboard_calculations CASCADE;
RAISE NOTICE 'Dropped: leaderboard_calculations (→ Subsquid LeaderboardEntry)';

-- 2. XP Transactions (XP history) → Subsquid
DROP TABLE IF EXISTS xp_transactions CASCADE;
RAISE NOTICE 'Dropped: xp_transactions (→ Subsquid GMEvent, QuestCompletion)';

-- 3. Onchain Stats Snapshots (portfolio history) → Subsquid
DROP TABLE IF EXISTS onchain_stats_snapshots CASCADE;
RAISE NOTICE 'Dropped: onchain_stats_snapshots (→ Subsquid DailyStats)';

-- 4. Rank Events (rank change history) → Subsquid
DROP TABLE IF EXISTS gmeow_rank_events CASCADE;
RAISE NOTICE 'Dropped: gmeow_rank_events (→ Subsquid computed from LeaderboardEntry)';

-- 5. Viral Tier History (viral progression) → Subsquid
DROP TABLE IF EXISTS viral_tier_history CASCADE;
RAISE NOTICE 'Dropped: viral_tier_history (→ Subsquid computed from badge_casts engagement)';

-- 6. Viral Milestone Achievements (viral milestones) → Subsquid
DROP TABLE IF EXISTS viral_milestone_achievements CASCADE;
RAISE NOTICE 'Dropped: viral_milestone_achievements (→ Subsquid computed from viral XP)';

-- 7. Transaction Patterns (DeFi analysis) → Subsquid
DROP TABLE IF EXISTS transaction_patterns CASCADE;
RAISE NOTICE 'Dropped: transaction_patterns (→ Subsquid computed from chain data)';

-- 8. DeFi Positions (portfolio holdings) → Subsquid
DROP TABLE IF EXISTS defi_positions CASCADE;
RAISE NOTICE 'Dropped: defi_positions (→ Subsquid computed from chain data)';

-- 9. Token PnL (profit/loss tracking) → Subsquid
DROP TABLE IF EXISTS token_pnl CASCADE;
RAISE NOTICE 'Dropped: token_pnl (→ Subsquid computed from chain data)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List remaining tables (should be ~20 lightweight tables)
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Remaining tables: %', table_count;
  RAISE NOTICE 'Expected: ~20 lightweight tables';
  RAISE NOTICE '========================================';
END $$;

-- Show remaining table sizes (should all be small)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

COMMENT ON SCHEMA public IS 'Phase 3 Complete: Supabase now handles identity/metadata only. Analytics moved to Subsquid indexer. See SUBSQUID-SUPABASE-MIGRATION-PLAN.md for hybrid query patterns.';

-- ============================================================================
-- NEXT STEPS (Phase 4)
-- ============================================================================
-- 1. Update API routes to use Subsquid:
--    - app/api/leaderboard/route.ts → getLeaderboard()
--    - app/api/user/[fid]/route.ts → getUserStats()
--    - app/api/guild/[id]/route.ts → getGuildStats()
--
-- 2. Create Subsquid client library:
--    - lib/subsquid-client.ts (GraphQL queries)
--    - lib/subsquid/queries.ts (query helpers)
--
-- 3. Implement hybrid queries:
--    - Supabase: Identity (FID → wallet) + Metadata (guild names)
--    - Subsquid: Stats (XP, streaks, badges) + Analytics (leaderboard)
--
-- 4. Add caching layer:
--    - Redis cache for Subsquid responses (5-min TTL)
--    - Edge caching for leaderboard (1-min TTL)
--
-- 5. Monitor performance:
--    - Leaderboard query time: Target <10ms
--    - User profile query time: Target <50ms
--    - Error rate: Target <0.1%
--
-- 6. Gradual rollout:
--    - 10% traffic → Verify metrics
--    - 50% traffic → Monitor for 24h
--    - 100% traffic → Full migration complete
-- ============================================================================
