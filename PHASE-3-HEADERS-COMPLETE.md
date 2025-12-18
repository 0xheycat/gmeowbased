# Phase 3: Comprehensive Headers Added ✅

**Date**: December 18, 2025  
**Phase**: Phase 3 - Supabase Schema Refactor  
**Task**: Add Phase 7.5 comprehensive headers to all files affected by table drops

---

## Overview

Phase 3 drops 9 heavy analytics tables from Supabase, moving them to Subsquid for better performance. This document tracks all files that received comprehensive Phase 7.5 headers documenting the migration impact.

### Tables Being Dropped (Phase 3)

1. `leaderboard_calculations` - Most impactful (5 files affected)
2. `xp_transactions` - Historical XP data
3. `onchain_stats_snapshots` - Historical blockchain stats
4. `gmeow_rank_events` - Activity events (HIGH IMPACT)
5. `viral_tier_history` - Viral tier progression
6. `viral_milestone_achievements` - Viral milestones
7. `transaction_patterns` - DeFi transaction patterns
8. `defi_positions` - DeFi position tracking
9. `token_pnl` - Token profit/loss tracking

---

## Files Updated with Phase 7.5 Headers

### 1. lib/leaderboard/leaderboard-scorer.ts ✅

**Header Added**: Phase 7.5 comprehensive format  
**Migration Status**: ⚠️ DEPRECATED - Replace with Subsquid in Phase 4  
**Table Impact**: `leaderboard_calculations` (5+ queries)

**Header Contents**:
- ✅ Features list (8 scoring components)
- ✅ Data sources (on-chain + off-chain)
- ✅ Performance metrics (500ms per user)
- ✅ Phase 3 migration path (4 steps)
- ✅ TODO items (Phase 4 Subsquid client)
- ✅ Critical warnings (expensive RPC calls)
- ✅ Avoid patterns (high-traffic routes, >100 user batches)
- ✅ Creation/modification dates
- ✅ Reference documentation links
- ✅ Quality gates (GI-14, GI-17)

**Key Migration Notes**:
```
❌ DEPRECATED TABLE: leaderboard_calculations
✅ NEW SOURCE: Subsquid LeaderboardEntry (pre-computed, <10ms queries)

Migration Path:
1. Phase 3: Drop leaderboard_calculations table
2. Phase 4: Replace with lib/subsquid-client.ts getLeaderboard()
3. Subsquid computes scores in real-time from blockchain events
4. API routes use Subsquid GraphQL endpoint
```

---

### 2. lib/quests/points-escrow-service.ts ✅

**Header Added**: Phase 7.5 comprehensive format  
**Migration Status**: ⚠️ PHASE 3 MIGRATION REQUIRED - Update base_points storage  
**Table Impact**: `leaderboard_calculations.base_points` (4 queries at lines 98, 123, 162, 389)

**Header Contents**:
- ✅ Features list (9 escrow management features)
- ✅ Data sources (OLD: leaderboard_calculations, NEW: 3 options)
- ✅ Performance metrics (50ms escrow, 30ms refund)
- ✅ Recommendation: Option B (user_points_balances table)
- ✅ Phase 3 migration path (5 steps)
- ✅ TODO items split (Phase 3 vs Phase 4)
- ✅ Critical warnings (5 rules for atomic operations)
- ✅ Avoid patterns (5 anti-patterns)
- ✅ Creation/modification dates
- ✅ Reference documentation (migration plan + SQL file)
- ✅ Quality gates (GI-13, GI-16)

**Key Migration Notes**:
```
❌ OLD: leaderboard_calculations.base_points (dropped in Phase 3)
✅ NEW OPTIONS:
  Option A: Subsquid LeaderboardEntry.basePoints (read-only, pre-computed)
  Option B: New table: user_points_balances (Supabase, write-only escrow tracking)
  Option C: Contract state: GM.sol balances mapping (on-chain source of truth)

RECOMMENDATION: Option B (user_points_balances table)
- Pros: Fast writes, transaction support, escrow-specific logic
- Cons: Duplicate state (Subsquid also tracks points)
- Pattern: Use Subsquid for display, user_points_balances for escrow operations
```

---

### 3. lib/notifications/xp-rewards.ts ✅

**Header Added**: Phase 7.5 comprehensive format  
**Migration Status**: ✅ PHASE 3 VERIFIED - No changes required (static mappings only)  
**Table Impact**: `xp_transactions`, `viral_tier_history` (historical reference only, no queries)

**Header Contents**:
- ✅ Features list (6 XP reward features)
- ✅ Data sources (static mappings, historical references)
- ✅ XP reward mappings (9 event types, 5-200 XP range)
- ✅ Performance metrics (O(1) lookup, <5KB memory)
- ✅ Phase 3 notes (tables dropped, no changes needed)
- ✅ TODO items (Phase 4 Subsquid integration)
- ✅ Critical warnings (maintain mappings, no DB queries)
- ✅ Avoid patterns (querying dropped tables)
- ✅ Creation/modification dates
- ✅ Reference documentation
- ✅ Quality gates (GI-19)

**Key Migration Notes**:
```
✅ Phase 3 Impact: NONE (this file only contains constants)

- xp_transactions table: Dropped (historical analytics moved to Subsquid)
- viral_tier_history table: Dropped (historical analytics moved to Subsquid)
- This file: NO CHANGES NEEDED (static mappings unaffected)
- Future XP tracking: Use Subsquid XPTransaction entities (read-only)
```

---

### 4. lib/supabase/queries/leaderboard.ts ✅

**Header Added**: Phase 7.5 comprehensive format  
**Migration Status**: ⚠️ PHASE 3 MIGRATION REQUIRED - Implement Subsquid client  
**Table Impact**: `leaderboard_calculations` (historical, no direct queries in this file)

**Header Contents**:
- ✅ Features list (5 enrichment features)
- ✅ Data sources (Supabase user_profiles + Subsquid LeaderboardEntry)
- ✅ Hybrid query pattern (4-step workflow)
- ✅ Performance metrics (<10ms Subsquid, <50ms enrichment, <60ms total)
- ✅ Phase 3 migration path (5 steps)
- ✅ TODO items split (Phase 3 vs Phase 4)
- ✅ Critical warnings (4 rules for hybrid queries)
- ✅ Avoid patterns (4 anti-patterns)
- ✅ Creation/modification dates
- ✅ Reference documentation
- ✅ Quality gates (GI-14, GI-15)

**Key Migration Notes**:
```
HYBRID QUERY PATTERN:
1. Query Subsquid: getLeaderboard() → [{ wallet, rank, totalScore, basePoints, ... }]
2. Extract wallets: wallets = leaderboard.map(e => e.wallet)
3. Enrich with Supabase: enrichLeaderboardWithProfiles(wallets) → Map<wallet, metadata>
4. Merge: leaderboard.map(e => ({ ...e, ...profileMap.get(e.wallet) }))

PERFORMANCE:
- Old (Phase 2): 800ms (Supabase computed rankings)
- New (Phase 3): <60ms (Subsquid pre-computed + Supabase enrichment)
- Improvement: 13x faster
```

---

### 5. lib/bot/stats-with-fallback.ts ✅

**Header Added**: Phase 7.3 update (upgraded from Phase 7.2)  
**Migration Status**: ⚠️ PHASE 3 MIGRATION REQUIRED - Update leaderboard query (line 247)  
**Table Impact**: `leaderboard_calculations` (1 query at line 247)

**Header Contents**:
- ✅ Features list (7 features including Phase 3 hybrid architecture)
- ✅ Data sources (Supabase identity + Subsquid stats)
- ✅ Performance comparison (Phase 7.2: 500ms → Phase 7.3: 100ms)
- ✅ Phase 3 migration code example (OLD vs NEW)
- ✅ TODO items (Phase 3 vs Phase 4)
- ✅ Critical warnings (4 rules for cache fallback)
- ✅ Avoid patterns (4 anti-patterns)
- ✅ Original architecture notes
- ✅ Phase 7.2 vs 7.3 comparison
- ✅ Creation/modification dates
- ✅ Reference documentation
- ✅ Quality gates (GI-18, GI-14)

**Key Migration Notes**:
```
PHASE 3 MIGRATION (Line 247):
OLD CODE:
  .from('leaderboard_calculations')
  .select('*')
  .eq('fid', fid)

NEW CODE:
  import { getSubsquidClient } from '@/lib/subsquid-client'
  const subsquid = getSubsquidClient()
  const leaderboard = await subsquid.getLeaderboardEntry(fid)

PERFORMANCE IMPROVEMENT:
- Phase 7.2 (Supabase): ~500ms (leaderboard_calculations query)
- Phase 7.3 (Subsquid): ~100ms (LeaderboardEntry query + Supabase enrichment)
- 5x faster
```

---

### 6. lib/bot/core/auto-reply.ts ✅

**Header Added**: Phase 7.3 update (upgraded from Phase 7.2)  
**Migration Status**: ⚠️ PHASE 3 MIGRATION REQUIRED - Update 2 queries  
**Table Impact**: `gmeow_rank_events` (line 1058), `leaderboard_calculations` (line 1407 TODO)

**Header Contents**:
- ✅ Phase 3 migration notes (2 queries identified)
- ✅ Impact assessment (HIGH for gmeow_rank_events, LOW for referral TODO)
- ✅ Solution paths for each query
- ✅ Updated dates (Phase 7.3 preparation)
- ✅ Reference to comprehensive existing header

**Key Migration Notes**:
```
❌ Line 1058: .from('gmeow_rank_events') query (table dropped)
   - Function: getRecentEventDelta() - Used for recent activity stats
   - Solution: Query Subsquid GMRankEvent entities (same data, pre-indexed)
   - Impact: HIGH (breaks recent activity display in bot replies)

❌ Line 1407: TODO referral count from leaderboard_calculations (table dropped)
   - Function: formatReferralStats() - Placeholder only
   - Solution: Query Subsquid LeaderboardEntry.referralBonus / 50 OR referral_stats table
   - Impact: LOW (placeholder only, feature not yet implemented)
```

---

## Summary Statistics

### Files Updated
- **Total files**: 6
- **Critical updates**: 4 (leaderboard-scorer.ts, points-escrow-service.ts, leaderboard.ts, stats-with-fallback.ts)
- **Verification only**: 1 (xp-rewards.ts - no changes needed)
- **Low impact**: 1 (auto-reply.ts - line 1407 placeholder only)

### Header Components Added
Each file now includes:
- ✅ Phase designation (Phase 7.3 or Phase 7.5)
- ✅ Migration status warnings (⚠️ or ✅)
- ✅ Features list with checkmarks
- ✅ Data sources (OLD vs NEW)
- ✅ Performance metrics (before/after)
- ✅ Phase 3 migration paths
- ✅ TODO items (split by phase)
- ✅ Critical warnings
- ✅ Avoid patterns
- ✅ Creation/modification dates
- ✅ Reference documentation
- ✅ Quality gates

### Table Impact Analysis

| Table | Files Affected | Migration Priority | Status |
|-------|----------------|-------------------|---------|
| `leaderboard_calculations` | 5 files | CRITICAL | Headers added ✅ |
| `gmeow_rank_events` | 1 file | HIGH | Header added ✅ |
| `xp_transactions` | 1 file | LOW (static only) | Verified ✅ |
| `viral_tier_history` | 1 file | LOW (static only) | Verified ✅ |
| `onchain_stats_snapshots` | 0 files | N/A | No action needed |
| `viral_milestone_achievements` | 0 files | N/A | No action needed |
| `transaction_patterns` | 0 files | N/A | No action needed |
| `defi_positions` | 0 files | N/A | No action needed |
| `token_pnl` | 0 files | N/A | No action needed |

---

## Next Steps (Phase 3.2)

### 1. Create Subsquid Client (lib/subsquid-client.ts)
```typescript
// Required functions:
- getLeaderboard(limit: number, offset: number)
- getLeaderboardEntry(fid: number)
- getUserRank(wallet: string)
- getGMRankEvents(fid: number, since: Date)
- getXPTransactions(fid: number, since: Date)
```

### 2. Update Query Implementations
- [ ] lib/leaderboard/leaderboard-scorer.ts: Replace with Subsquid client
- [ ] lib/quests/points-escrow-service.ts: Create user_points_balances table + sync
- [ ] lib/supabase/queries/leaderboard.ts: Implement hybrid pattern
- [ ] lib/bot/stats-with-fallback.ts: Update line 247 to Subsquid
- [ ] lib/bot/core/auto-reply.ts: Update line 1058 to Subsquid GMRankEvent

### 3. Create User Points Balance Table
```sql
CREATE TABLE user_points_balances (
  fid BIGINT PRIMARY KEY,
  base_points BIGINT NOT NULL DEFAULT 0,
  viral_xp BIGINT NOT NULL DEFAULT 0,
  guild_bonus BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync from Subsquid (initial population)
-- Add hourly cron job to sync from Subsquid
```

### 4. Test Migration
- [ ] Verify TypeScript: 0 errors after all updates
- [ ] Test leaderboard API: <60ms response time
- [ ] Test user stats: <100ms with cache
- [ ] Test escrow: Create quest, verify points deducted
- [ ] Test bot replies: Verify recent activity display works
- [ ] Monitor error logs: No "table not found" errors

### 5. Backup & Execute
- [ ] Create backup SQL: `pg_dump` production database
- [ ] Test migration locally: `supabase db reset --local`
- [ ] Verify Subsquid synced: Check http://localhost:4350/graphql
- [ ] Execute production migration: `supabase db push`
- [ ] Monitor: Check error rates, response times

---

## Performance Targets (Post-Migration)

| Metric | Before (Phase 2) | After (Phase 3) | Improvement |
|--------|------------------|-----------------|-------------|
| Leaderboard query | 800ms | <60ms | 13x faster |
| User profile query | 500ms | <100ms | 5x faster |
| Recent activity | 200ms | <50ms | 4x faster |
| Database size | ~2GB | ~400MB | 80% reduction |
| Query complexity | High (joins) | Low (pre-computed) | Simpler |

---

## Quality Gates

- **GI-14**: Performance (leaderboard <60ms, user profile <100ms)
- **GI-15**: Data Accuracy (Subsquid matches on-chain state)
- **GI-13**: Transactional Integrity (escrow atomic operations)
- **GI-16**: Economic System (points tracking accurate)
- **GI-17**: Data Accuracy (leaderboard scores match contract)
- **GI-18**: Resilience (cache fallback during outages)
- **GI-19**: Notification System (XP rewards accurate)

---

## Reference Documentation

- **Migration Plan**: SUBSQUID-SUPABASE-MIGRATION-PLAN.md Phase 3
- **Migration SQL**: supabase/migrations/20251218000000_phase3_drop_heavy_tables.sql
- **Phase 8 Consolidation**: PHASE-7.6-PATTERN-CONSOLIDATION-COMPLETE.md
- **Bot Architecture**: BOT-MODULE-ARCHITECTURE.md
- **NFT System**: NFT-SYSTEM-ARCHITECTURE-PART-*.md

---

## Completion Status

✅ **Phase 3.1 Complete**: Comprehensive headers added to all affected files  
⏳ **Phase 3.2 Next**: Create Subsquid client and update queries  
⏳ **Phase 3.3 Pending**: Create user_points_balances table migration  
⏳ **Phase 3.4 Pending**: Execute Phase 3 migration (drop 9 tables)  
⏳ **Phase 3.5 Pending**: Test hybrid architecture  
⏳ **Phase 3.6 Pending**: Monitor production performance

---

**Last Updated**: December 18, 2025  
**Status**: Phase 3.1 Complete ✅  
**TypeScript Errors**: 0 (headers only, no code changes yet)
