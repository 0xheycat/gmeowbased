# Guild Analytics Cache Implementation Status
**Date:** December 21, 2025  
**Author:** AI Agent  
**Status:** Database Infrastructure Complete ✅ | Cron Jobs Pending

---

## Executive Summary

Following the comprehensive infrastructure abuse audit, we've successfully created the database foundation for eliminating expensive real-time aggregations in guild analytics routes. This document tracks the complete implementation status.

**Expected Performance Improvements:**
- Guild Analytics API: **100x faster** (eliminate 500+ event aggregations)
- Member Stats API: **10x faster** (eliminate per-member event fetching)

---

## ✅ Phase 1: Database Infrastructure (COMPLETE)

### 1.1 Migration Files Created
```
✅ supabase/migrations/20251221000000_create_guild_analytics_cache.sql
✅ supabase/migrations/20251221000001_create_guild_member_stats_cache.sql
```

### 1.2 Tables Applied via Supabase MCP
```sql
-- Applied: 2025-12-21
guild_analytics_cache (13 columns)
guild_member_stats_cache (11 columns)
```

### 1.3 TypeScript Types Added
```typescript
// File: types/supabase.generated.ts
✅ guild_analytics_cache (line 233)
✅ guild_member_stats_cache (line 292)
```

**Verification:**
- ✅ Zero TypeScript errors
- ✅ All foreign keys configured
- ✅ RLS policies active (public SELECT, service_role ALL)
- ✅ Indexes created for performance
- ✅ Auto-update triggers configured

---

## 📊 Database Schema Details

### `guild_analytics_cache`
**Purpose:** Pre-computed guild-wide analytics dashboard data

**Columns:**
- `guild_id` (PK, FK → guild_metadata)
- `total_members`, `total_deposits`, `total_claims`, `treasury_balance`
- `avg_points_per_member`
- `members_7d_growth`, `points_7d_growth`, `treasury_7d_growth`
- `top_contributors` (JSONB) - Top 10 contributors array
- `member_growth_series` (JSONB) - Time-series chart data
- `treasury_flow_series` (JSONB) - Deposits/claims over time
- `activity_timeline` (JSONB) - Daily activity breakdown
- `last_synced_at`, `updated_at`

**Indexes:**
- `idx_guild_analytics_cache_updated_at`
- `idx_guild_analytics_cache_last_synced_at`

**RLS Policies:**
- Public: `SELECT` (anyone can read analytics)
- Service Role: ALL (cron can write)

**Update Strategy:** Sync every 6 hours via `sync-guilds` cron

---

### `guild_member_stats_cache`
**Purpose:** Per-member guild statistics for member roster

**Columns:**
- `guild_id`, `member_address` (Composite PK, FK → guild_metadata)
- `joined_at`, `last_active`
- `points_contributed`, `deposit_count`, `quest_completions`
- `total_score`, `global_rank`, `guild_rank`
- `last_synced_at`, `updated_at`

**Indexes:**
- `idx_guild_member_stats_cache_guild_id`
- `idx_guild_member_stats_cache_member_address`
- `idx_guild_member_stats_cache_points` (DESC for leaderboards)
- `idx_guild_member_stats_cache_guild_rank`
- `idx_guild_member_stats_cache_updated_at`

**RLS Policies:**
- Public: `SELECT` (anyone can read member stats)
- Service Role: ALL (cron can write)

**Update Strategy:** Sync hourly via new `sync-guild-members` cron

---

## ⏳ Phase 2: Cron Job Implementation (PENDING)

### 2.1 Update sync-guilds Cron
**File:** `app/api/cron/sync-guilds/route.ts`  
**Status:** ⏳ Pending

**New Logic Required:**
```typescript
// After updating guild_stats_cache, compute analytics:
1. Aggregate guild_events by guild_id
2. Calculate total_members (MEMBER_JOINED - MEMBER_LEFT)
3. Calculate total_deposits (sum POINTS_DEPOSITED)
4. Calculate total_claims (sum POINTS_CLAIMED)
5. Calculate treasury_balance (deposits - claims)
6. Calculate avg_points_per_member
7. Calculate 7-day growth rates
8. Build time-series arrays:
   - member_growth_series: [{ date, count }]
   - treasury_flow_series: [{ date, deposits, claims, balance }]
   - activity_timeline: [{ date, joins, deposits, claims }]
9. Get top 10 contributors from deposit events
10. Upsert to guild_analytics_cache
```

**Expected Changes:**
- Add analytics calculation section (lines 140-300)
- Add Supabase client for guild_analytics_cache
- Keep existing guild_stats_cache logic intact

---

### 2.2 Create sync-guild-members Cron
**File:** `app/api/cron/sync-guild-members/route.ts`  
**Status:** ⏳ Pending (New File)

**Logic Required:**
```typescript
1. Fetch all guild_events grouped by (guild_id, member_address)
2. For each member:
   a. Find MEMBER_JOINED event → joined_at
   b. Find latest event → last_active
   c. Sum POINTS_DEPOSITED → points_contributed
   d. Count deposit events → deposit_count
   e. Fetch global leaderboard from Subsquid → total_score, global_rank
   f. Calculate guild_rank by ordering points_contributed within guild
3. Upsert to guild_member_stats_cache
```

**Cron Schedule:**
- Frequency: Hourly
- GitHub Actions: `.github/workflows/cron-sync-guild-members.yml`

**Dependencies:**
- Subsquid API: `GET /leaderboard` (for global_rank, total_score)
- Supabase: guild_events, guild_member_stats_cache

---

## ⏳ Phase 3: API Route Updates (PENDING)

### 3.1 Guild Analytics API
**File:** `app/api/guild/[guildId]/analytics/route.ts`  
**Status:** ⏳ Pending

**Current Issues (Lines 280-350):**
```typescript
❌ Fetches all guild_events for the guild
❌ Filters/reduces in memory
❌ Recalculates time-series on every request
❌ Expensive for large guilds (500+ events)
```

**Required Changes:**
```typescript
✅ Replace with single query:
   const { data } = await supabase
     .from('guild_analytics_cache')
     .select('*')
     .eq('guild_id', guildId)
     .single()

✅ Parse JSONB fields:
   - top_contributors → array
   - member_growth_series → chart data
   - treasury_flow_series → chart data
   - activity_timeline → chart data

✅ Keep same response format (backwards compatible)
```

**Expected Performance:**
- Before: 500+ event aggregations (~2-5 seconds)
- After: Single row read (~20ms)
- **Improvement: 100-250x faster**

---

### 3.2 Guild Member Stats API
**File:** `app/api/guild/[guildId]/member-stats/route.ts`  
**Status:** ⏳ Pending

**Current Issues (Lines 80-130):**
```typescript
❌ Fetches all deposit events per member
❌ Aggregates in memory
❌ No pagination (loads all members at once)
```

**Required Changes:**
```typescript
✅ Replace with single query:
   const { data } = await supabase
     .from('guild_member_stats_cache')
     .select('*')
     .eq('guild_id', guildId)
     .order('guild_rank', { ascending: true })
     .range(0, 49) // Pagination

✅ Add pagination support:
   - Query params: page, limit
   - Use .range() for offset/limit

✅ Keep same response format
```

**Expected Performance:**
- Before: N queries for N members (~500ms for 50 members)
- After: Single paginated query (~50ms)
- **Improvement: 10x faster**

---

## 📋 Implementation Checklist

### Database Infrastructure
- [x] Create `guild_analytics_cache` migration file
- [x] Create `guild_member_stats_cache` migration file
- [x] Apply migrations via Supabase MCP
- [x] Add TypeScript types manually
- [x] Verify zero TypeScript errors
- [x] Verify RLS policies configured
- [x] Verify indexes created

### Cron Jobs
- [ ] Update `sync-guilds` cron with analytics calculation
- [ ] Create `sync-guild-members` cron job
- [ ] Create GitHub Actions workflow for member sync
- [ ] Test analytics cache population
- [ ] Test member stats cache population
- [ ] Verify cache freshness (last_synced_at)

### API Routes
- [ ] Update guild analytics API to read from cache
- [ ] Update member stats API to read from cache
- [ ] Add pagination to member stats API
- [ ] Test backwards compatibility
- [ ] Verify performance improvements
- [ ] Update API documentation

### Testing & Verification
- [ ] Test cache population with real guild data
- [ ] Verify time-series chart data format
- [ ] Test guild analytics dashboard UI
- [ ] Test member stats roster UI
- [ ] Load test with large guilds (1000+ members)
- [ ] Monitor cache hit rates

---

## 🎯 Next Steps (Priority Order)

1. **Update sync-guilds cron** (P0 - Critical)
   - Add analytics calculation logic
   - Test with existing guilds
   - Verify JSONB time-series format

2. **Create sync-guild-members cron** (P0 - Critical)
   - Implement member aggregation logic
   - Add Subsquid API integration
   - Test guild_rank calculation

3. **Update guild analytics API** (P1 - High)
   - Replace inline aggregations with cache read
   - Test backwards compatibility
   - Measure performance improvement

4. **Update member stats API** (P1 - High)
   - Replace inline aggregations with cache read
   - Add pagination support
   - Measure performance improvement

5. **Documentation & Monitoring** (P2 - Medium)
   - Update API documentation
   - Add cache metrics to monitoring
   - Document JSONB data structures

---

## 📈 Expected Outcomes

### Performance Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Guild Analytics API | 2-5s | 20-50ms | **100x** |
| Member Stats API | 500ms | 50ms | **10x** |
| Database Load | High | Low | **90% reduction** |
| Cache Hit Rate | 0% | 95%+ | N/A |

### Architecture Compliance
| Component | Before | After |
|-----------|--------|-------|
| Guild Analytics | ❌ Inline | ✅ Cached |
| Member Stats | ❌ Inline | ✅ Cached |
| 3-Layer Compliance | 76/100 | 95/100 |

### Scalability
- ✅ Supports guilds with 10,000+ members
- ✅ Enables real-time dashboard updates
- ✅ Reduces API response time variability
- ✅ Prevents database query timeouts

---

## 🔗 Related Documentation

- **Audit Report:** `INFRASTRUCTURE-ABUSE-AUDIT.md`
- **Migration Files:**
  - `supabase/migrations/20251221000000_create_guild_analytics_cache.sql`
  - `supabase/migrations/20251221000001_create_guild_member_stats_cache.sql`
- **Type Definitions:** `types/supabase.generated.ts` (lines 233, 292)
- **Architecture:** `3-LAYER-INTEGRATION-STATUS.md`
- **Cron Jobs:** `app/api/cron/` directory

---

## ✅ Completion Criteria

**Phase 1: Database Infrastructure** ✅ COMPLETE
- [x] Migrations applied
- [x] Types added
- [x] Zero errors
- [x] RLS configured
- [x] Indexes created

**Phase 2: Cron Jobs** ⏳ PENDING
- [ ] Analytics cache populated every 6 hours
- [ ] Member stats cache populated every 1 hour
- [ ] Cache freshness validated (last_synced_at within threshold)

**Phase 3: API Routes** ⏳ PENDING
- [ ] Analytics API uses cache exclusively
- [ ] Member stats API uses cache exclusively
- [ ] 100x performance improvement verified
- [ ] Backwards compatibility confirmed

**Phase 4: Testing** ⏳ PENDING
- [ ] Integration tests passing
- [ ] Load tests passing (1000+ members)
- [ ] UI dashboards working correctly
- [ ] Cache invalidation working

---

**Status:** Database infrastructure complete. Ready to implement cron job population logic.

**Next Action:** Update `app/api/cron/sync-guilds/route.ts` to populate `guild_analytics_cache`.
