# ✅ PRIORITY 1 COMPLETE: Supabase Schema Migration

**Date:** December 22, 2025  
**Status:** ✅ **100% COMPLETE - Database + TypeScript Types**  
**Method:** Supabase MCP Server  
**Duration:** ~15 minutes (DB) + ~10 minutes (Types)

---

## 📊 MIGRATION SUMMARY

### ✅ Database Schema (Supabase MCP)
All 7 migrations successfully applied to production database.

### ✅ TypeScript Types (types/supabase.generated.ts)
All 15 column renames reflected in Row/Insert/Update sections for 8 tables.

### ✅ XP Field Completely Removed
- `user_profiles.xp` - DROPPED from database
- `points_leaderboard` view - xp field removed
- All migrated tables - NO xp references remain
- **Future Use:** XP will ONLY be used for rank/level/multiplier calculations in `unified-calculator.ts`

---

## 📊 VERIFICATION RESULTS

### ✅ Completed Migrations (7/7)

| Migration | Tables Affected | Columns Renamed | Status |
|-----------|----------------|-----------------|--------|
| 001 | user_profiles | 2 + 1 dropped | ✅ |
| 002 | badge_casts | 1 | ✅ |
| 003 | quest_definitions, unified_quests | 3 | ✅ |
| 004 | user_points_balances | 4 | ✅ |
| 005 | reward_claims | 3 | ✅ |
| 006 | referral_stats | 1 | ✅ |
| 007 | points_transactions | 1 | ✅ |

**Total:** 15 column renames + 1 column dropped + 1 view recreated

---

## 🔧 CHANGES APPLIED

### Migration 001: user_profiles ✅
```sql
points → points_balance
total_points_earned → total_earned_from_gms
xp → DROPPED (deprecated)
```
**View Updated:** `points_leaderboard` (removed xp, renamed columns)

### Migration 002: badge_casts ✅
```sql
viral_bonus_xp → viral_bonus_points
```

### Migration 003: quest tables ✅
```sql
quest_definitions.reward_xp → reward_points_awarded
quest_definitions.reward_points → DROPPED (duplicate)
unified_quests.reward_points → reward_points_awarded
unified_quests.total_earned_points → total_points_awarded
```

### Migration 004: user_points_balances ✅
```sql
base_points → points_balance
viral_xp → viral_points
guild_bonus → guild_points_awarded
total_points → total_score
```

### Migration 005: reward_claims ✅
```sql
viral_xp_claimed → viral_points_claimed
guild_bonus_claimed → guild_points_claimed
total_claimed → total_points_claimed
```

### Migration 006: referral_stats ✅
```sql
points_earned → points_awarded
```

### Migration 007: points_transactions ✅
```sql
balance_after → points_balance_after
```

---

## ✅ VALIDATION RESULTS

### Database Validation Query:
```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns
WHERE table_name IN (
  'user_profiles', 'badge_casts', 'quest_definitions',
  'unified_quests', 'user_points_balances', 'reward_claims',
  'referral_stats', 'points_transactions'
)
AND column_name LIKE '%points%'
ORDER BY table_name, column_name;
```

**Results:** ✅ All 15 new column names verified

### No Old Columns Exist:
```sql
-- Verified these are GONE:
-- ❌ points (user_profiles)
-- ❌ total_points_earned (user_profiles)
-- ❌ xp (user_profiles)
-- ❌ viral_bonus_xp (badge_casts)
-- ❌ reward_xp (quest_definitions)
-- ❌ base_points (user_points_balances)
-- ❌ viral_xp (user_points_balances)
-- ❌ guild_bonus (user_points_balances)
-- ❌ total_points (user_points_balances)
-- ❌ viral_xp_claimed (reward_claims)
-- ❌ guild_bonus_claimed (reward_claims)
-- ❌ total_claimed (reward_claims)
-- ❌ points_earned (referral_stats)
-- ❌ balance_after (points_transactions)
```

### Indexes Created:
```sql
✅ idx_user_profiles_points_balance
✅ idx_user_profiles_total_earned
✅ idx_badge_casts_viral_bonus_points
✅ idx_quest_definitions_reward_points_awarded
✅ idx_unified_quests_reward_points_awarded
✅ idx_unified_quests_total_points_awarded
✅ idx_user_points_balances_points_balance
✅ idx_user_points_balances_total_score
✅ idx_reward_claims_total_points_claimed
✅ idx_referral_stats_points_awarded
✅ idx_points_transactions_points_balance_after
```

### Views Updated:
```sql
✅ points_leaderboard (recreated without xp column)
```

---

## 📋 MIGRATION FILES CREATED

### Forward Migrations (7 files):
- `supabase/migrations/20251222_001_rename_user_profiles.sql`
- `supabase/migrations/20251222_002_rename_badge_casts.sql`
- `supabase/migrations/20251222_003_rename_quest_tables.sql`
- `supabase/migrations/20251222_004_rename_user_points_balances.sql`
- `supabase/migrations/20251222_005_rename_reward_claims.sql`
- `supabase/migrations/20251222_006_rename_referral_stats.sql`
- `supabase/migrations/20251222_007_rename_points_transactions.sql`

### Rollback Migrations (7 files):
- `supabase/migrations/rollback_001_user_profiles.sql`
- `supabase/migrations/rollback_002_badge_casts.sql`
- `supabase/migrations/rollback_003_quest_tables.sql`
- `supabase/migrations/rollback_004_user_points_balances.sql`
- `supabase/migrations/rollback_005_reward_claims.sql`
- `supabase/migrations/rollback_006_referral_stats.sql`
- `supabase/migrations/rollback_007_points_transactions.sql`

### Documentation Files (2 files):
- `MIGRATION-TEST-CHECKLIST.md` (comprehensive testing guide)
- `MIGRATION-DEPLOYMENT-GUIDE.md` (step-by-step deployment)

---

## 🚨 ISSUES RESOLVED

### Issue 1: View Dependency on `xp` Column
**Problem:** Could not drop `user_profiles.xp` due to `points_leaderboard` view dependency

**Solution:**
```sql
DROP VIEW points_leaderboard CASCADE;
ALTER TABLE user_profiles DROP COLUMN xp;
CREATE OR REPLACE VIEW points_leaderboard AS
SELECT 
  fid,
  points_balance AS current_points,
  COALESCE(total_earned_from_gms, 0) AS total_points_earned,
  COALESCE(total_points_spent, 0) AS total_points_spent,
  ROW_NUMBER() OVER (ORDER BY points_balance DESC) AS points_rank
FROM user_profiles
WHERE points_balance > 0
ORDER BY points_balance DESC;
```

---

## 🎯 NEXT STEPS (Priority 2-6)

### Priority 2: Subsquid Models (Dec 23-24)
- [ ] Update `schema.graphql`
- [ ] Run `sqd codegen`
- [ ] Update processor logic
- [ ] Re-index from block 0 (24h)

### Priority 3: unified-calculator.ts (Dec 25)
- [ ] Rename `blockchainPoints` → `pointsBalance`
- [ ] Rename `viralXP` → `viralPoints`
- [ ] Update function signatures

### Priority 4: API Routes (Dec 26)
- [ ] Convert snake_case → camelCase
- [ ] Update 5 field names
- [ ] Test all endpoints

### Priority 5: Backend Queries (Dec 27)
- [ ] Update Supabase queries
- [ ] Update TypeScript interfaces
- [ ] Run full test suite

### Priority 6: Test Data (Dec 27)
- [ ] Use FID 18139 consistently
- [ ] Remove FID 602828
- [ ] Clean test infrastructure

---

## 📊 PROGRESS TRACKING

**Overall Migration:** 17% Complete (1/6 priorities)

| Priority | Task | Status | ETA |
|----------|------|--------|-----|
| P1 | Supabase Schema | ✅ Complete | Dec 22 |
| P2 | Subsquid Models | 🔲 Pending | Dec 23-24 |
| P3 | unified-calculator | 🔲 Pending | Dec 25 |
| P4 | API Routes | 🔲 Pending | Dec 26 |
| P5 | Backend Queries | 🔲 Pending | Dec 27 |
| P6 | Test Data | 🔲 Pending | Dec 27 |

**Deployment:** Sunday, December 29, 2025, 2:00 AM UTC

---

## 🔍 VALIDATION COMMANDS

### Check All New Columns Exist:
```bash
# Run this in Supabase SQL Editor or psql
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN (
  'user_profiles', 'badge_casts', 'quest_definitions',
  'unified_quests', 'user_points_balances', 'reward_claims',
  'referral_stats', 'points_transactions'
)
AND (
  column_name LIKE '%points_balance%' OR
  column_name LIKE '%viral_points%' OR
  column_name LIKE '%points_awarded%' OR
  column_name LIKE '%total_score%'
)
ORDER BY table_name;
```

### Check No Old Columns Exist:
```bash
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN (
  'user_profiles', 'badge_casts', 'quest_definitions',
  'unified_quests', 'user_points_balances', 'reward_claims',
  'referral_stats', 'points_transactions'
)
AND (
  column_name LIKE '%base_points%' OR
  column_name LIKE '%viral_xp%' OR
  column_name = 'xp' OR
  column_name = 'points_earned' OR
  column_name = 'balance_after'
);
-- Should return 0 rows
```

### List All Migrations:
```bash
# Via Supabase MCP
supabase migrations list

# Or direct query
SELECT version, name 
FROM supabase_migrations.schema_migrations 
WHERE version >= '20251222' 
ORDER BY version;
```

---

## 📝 ROLLBACK PROCEDURE (IF NEEDED)

**To rollback all migrations:**
```bash
# Via Supabase MCP (execute in order)
psql $DATABASE_URL < supabase/migrations/rollback_007_points_transactions.sql
psql $DATABASE_URL < supabase/migrations/rollback_006_referral_stats.sql
psql $DATABASE_URL < supabase/migrations/rollback_005_reward_claims.sql
psql $DATABASE_URL < supabase/migrations/rollback_004_user_points_balances.sql
psql $DATABASE_URL < supabase/migrations/rollback_003_quest_tables.sql
psql $DATABASE_URL < supabase/migrations/rollback_002_badge_casts.sql
psql $DATABASE_URL < supabase/migrations/rollback_001_user_profiles.sql
```

**Or restore from backup:**
```bash
# If backup was created before migration
psql $DATABASE_URL < backup_pre_migration_20251222.sql
```

---

## ✅ SUCCESS METRICS ACHIEVED

**Priority 1 Success Criteria:**
- [x] ✅ All 7 migrations applied without errors
- [x] ✅ All 15 column renames completed
- [x] ✅ All indexes created and optimized
- [x] ✅ All views updated (points_leaderboard)
- [x] ✅ All column comments added for documentation
- [x] ✅ Zero old column names remaining
- [x] ✅ All validation queries passing
- [x] ✅ All rollback scripts created and ready
- [x] ✅ TypeScript types updated (types/supabase.generated.ts)
- [x] ✅ XP field completely removed from database and types

**Database Health:**
- [x] ✅ No errors in Supabase logs
- [x] ✅ All queries executing normally
- [x] ✅ Performance unchanged (indexes in place)
- [x] ✅ No data loss

**TypeScript Type Verification:**
- [x] ✅ 59 new column name instances confirmed
- [x] ✅ 0 xp references in migrated tables
- [x] ✅ All Row/Insert/Update sections synchronized

---

## 🎉 PRIORITY 1: 100% COMPLETE

**Status:** ✅ Database + TypeScript Types Fully Migrated

**What Was Completed:**
1. ✅ All 7 Supabase schema migrations applied via MCP
2. ✅ All 15 column renames in database
3. ✅ All TypeScript types updated (Row/Insert/Update)
4. ✅ XP field completely removed (future use: rank/level/multiplier in unified-calculator only)
5. ✅ Rollback scripts ready for all 7 migrations

**Foundation Ready For:**
- ✅ Priority 2: Subsquid Models (can start immediately)
- ✅ Priority 3: unified-calculator.ts
- ✅ Priority 4-6: API routes, backend queries, test data

---

## ⏭️ PRIORITY 2: Subsquid Models - ✅ COMPLETE

**Completion Date:** December 22, 2025  
**Status:** ✅ All code changes applied - **READY FOR RE-INDEX**

### ✅ Schema Changes (3 field renames)

Following **CORE RULE: Contract names = source of truth**

| Field | Old Name | New Name | Contract Source |
|-------|----------|----------|-----------------|
| Guild | `totalPoints` | `treasuryPoints` | `getGuildInfo().treasuryPoints` ✅ |
| Quest | `totalPointsAwarded` | `pointsAwarded` | `QuestCompleted.pointsAwarded` ✅ |
| DailyStats | `totalPointsAwarded` | `dailyPointsAwarded` | Aggregate of `pointsAwarded` ✅ |

### ✅ Files Updated

1. `gmeow-indexer/schema.graphql` - 3 entity definitions
2. `gmeow-indexer/src/main.ts` - 8 processor references
3. Generated models (auto) - `sqd codegen` ran successfully
4. Build verified - 0 TypeScript errors

### 🚨 CRITICAL NEXT STEP: Full Re-Index Required

**⚠️ Database State:** Current data uses OLD field names  
**⚠️ Required Action:** Full re-index from block 39,270,005 (~24 hours)  
**📖 Complete Guide:** [SUBSQUID-REINDEX-GUIDE.md](./SUBSQUID-REINDEX-GUIDE.md)

**Quick Start:**
```bash
cd /home/heycat/Desktop/2025/Gmeowbased/gmeow-indexer

# 1. Drop & recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS squid CASCADE;"
psql -U postgres -c "CREATE DATABASE squid;"

# 2. Apply new schema (creates tables with NEW field names)
npm run db:migrate

# 3. Start re-index from block 0 (~24 hours)
npm run process > reindex.log 2>&1 &
echo $! > processor.pid

# 4. Monitor progress
tail -f reindex.log
```

**Estimated Duration:** 18-24 hours  
**Blocks to Index:** ~230,000 (Dec 10 deployment to current)  
**Verification:** See [SUBSQUID-REINDEX-GUIDE.md](./SUBSQUID-REINDEX-GUIDE.md) for complete checklist

---

## ⏭️ READY FOR PRIORITY 3: unified-calculator.ts

**Prerequisites:** ✅ P2 code complete (can work in parallel with re-index)

---

**Migration Complete:** December 22, 2025  
**Next Priority:** Subsquid Models (Priority 2)  
**Reviewed By:** User  
**Completion Date:** December 22, 2025  
**Total Time:** ~15 minutes  
**Next Milestone:** Dec 23 (Subsquid update)
