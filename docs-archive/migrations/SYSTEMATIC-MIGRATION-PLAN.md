# 📋 SYSTEMATIC MIGRATION PLAN
**Date**: December 19, 2025
**Approach**: Professional, systematic, test-driven
**Pattern**: Subsquid (on-chain) + Supabase (metadata) Hybrid

---

## PHASE 1: FIX BROKEN ROUTES (URGENT - 2 days)

### Day 1: Create Missing Query Functions

**File**: `lib/subsquid-client.ts`

**Function 1: getGMEvents()**
```typescript
export async function getGMEvents(
  fid: number,
  options?: {
    limit?: number
    since?: Date
    includeStreak?: boolean
  }
): Promise<GMEvent[]> {
  const query = `
    query GetGMEvents($fid: Int!, $since: BigInt, $limit: Int) {
      gmEvents(
        where: { user: { fid_eq: $fid }, timestamp_gte: $since }
        orderBy: timestamp_DESC
        limit: $limit
      ) {
        id
        timestamp
        xpAwarded
        streakDay
        blockNumber
        txHash
      }
    }
  `
  // Implementation following existing pattern
}
```

**Function 2: getPointsTransactions()**
```typescript
export async function getPointsTransactions(
  fid: number,
  options?: {
    limit?: number
    since?: Date
    transactionType?: string
  }
): Promise<PointsTransaction[]> {
  // Query PointsTransaction entity
  // Return user's XP history
}
```

### Day 2: Fix Broken Routes

**Route 1: `app/frame/gm/route.tsx`**
```typescript
// OLD (BROKEN):
const { data: gmEvents } = await supabase
  .from('gmeow_rank_events')  // ❌ Table dropped
  .select('created_at, chain')
  .eq('fid', fid)

// NEW (WORKING):
import { getGMEvents } from '@/lib/subsquid-client'

const gmEvents = await getGMEvents(fid, {
  limit: 100,
  includeStreak: true
})
```

**Route 2: `app/api/cron/sync-referrals/route.ts`**
```typescript
// OLD (BROKEN):
await supabase
  .from('leaderboard_calculations')  // ❌ Table dropped
  .update({ referral_bonus: stat.total_rewards })

// NEW (WORKING):
// Option A: Remove leaderboard update (Subsquid handles rankings)
// Option B: Use Subsquid API to trigger reindex
// Recommendation: Remove - Subsquid auto-calculates rankings
```

**Route 3: `app/api/cron/sync-guild-leaderboard/route.ts`**
```typescript
// OLD (BROKEN):
await supabase
  .from('leaderboard_calculations')
  .update({ guild_id, guild_name })

// NEW (WORKING):
import { getLeaderboard, getLeaderboardEntry } from '@/lib/subsquid-client'

// Get rankings from Subsquid
const rankings = await getLeaderboard({ limit: 1000 })

// Update guild metadata in Supabase (metadata only)
await supabase
  .from('user_profiles')
  .update({ guild_id, guild_name })
  .in('address', guildMemberAddresses)
```

---

## PHASE 2: COMPLETE PARTIAL MIGRATIONS (3 days)

### Route 4: `app/api/guild/[guildId]/route.ts`

**Current State**: Uses Subsquid but has dropped table refs

**Migration**:
1. Remove all `leaderboard_calculations` references
2. Use `getGuildMembers()` for member list
3. Use `getLeaderboardEntry()` for individual ranks
4. Keep Supabase for guild metadata only

**Pattern**:
```typescript
// Supabase: Guild metadata
const { data: guild } = await supabase
  .from('guilds')
  .select('id, name, description, avatar_url, created_at')
  .eq('id', guildId)

// Subsquid: Member stats and rankings
const members = await getGuildMembers(guildId)
const memberRanks = await Promise.all(
  members.map(m => getLeaderboardEntry(m.address))
)

// Merge
return {
  ...guild,
  members: members.map((m, i) => ({
    ...m,
    rank: memberRanks[i]?.rank,
    xp: memberRanks[i]?.xp
  }))
}
```

### Route 5-6: Leaderboard Routes

Similar pattern - use Subsquid for all ranking data, Supabase only for user profile enrichment.

---

## PHASE 3: HIGH PRIORITY USER-FACING ROUTES (1 week)

### Category A: Leaderboard APIs (10 routes)
Priority: CRITICAL (main feature)

Routes:
- `/api/leaderboard-v2/route.ts` ✅ (partial - complete)
- `/api/leaderboard-v2/stats/route.ts` ✅ (partial - complete)
- `/api/leaderboard-v2/[fid]/route.ts`
- `/api/leaderboard-v2/guild/[guildId]/route.ts`
- `/api/leaderboard/viral-tier/route.ts`
- `/api/leaderboard/history/route.ts`
- ... (4 more)

Pattern: Pure Subsquid with profile enrichment

### Category B: Guild APIs (15 routes)
Priority: HIGH (core feature)

Routes:
- `/api/guild/[guildId]/route.ts` ✅ (partial - complete)
- `/api/guild/[guildId]/members/route.ts`
- `/api/guild/[guildId]/member-stats/route.ts`
- `/api/guild/[guildId]/treasury/route.ts`
- `/api/guild/[guildId]/events/route.ts`
- ... (10 more)

Pattern: Subsquid for events/stats, Supabase for metadata

### Category C: User Stats APIs (20 routes)
Priority: HIGH (dashboard data)

Routes:
- `/api/user/stats/[fid]/route.ts`
- `/api/user/activity/[fid]/route.ts`
- `/api/user/xp-history/[fid]/route.ts`
- `/api/user/streaks/[fid]/route.ts`
- `/api/user/badges/[fid]/route.ts`
- ... (15 more)

Pattern: Subsquid for on-chain data, Supabase for profile

---

## PHASE 4: MEDIUM PRIORITY ROUTES (1 week)

### Category D: Quest APIs (10 routes)
- `/api/quests/route.ts` ✅ (done)
- `/api/quests/[id]/route.ts`
- `/api/quests/[id]/completions/route.ts` ✅ (done)
- `/api/quests/[id]/progress/route.ts`
- ... (6 more)

### Category E: Badge/Staking APIs (12 routes)
- `/api/staking/stakes/route.ts` ✅ (done)
- `/api/staking/badges/route.ts` ✅ (done)
- `/api/badges/[badgeId]/route.ts`
- `/api/badges/[badgeId]/holders/route.ts`
- ... (8 more)

### Category F: Referral APIs (8 routes)
- `/api/referral/stats/[code]/route.ts`
- `/api/referral/tree/[fid]/route.ts`
- `/api/referral/rewards/[fid]/route.ts`
- ... (5 more)

---

## PHASE 5: LOW PRIORITY / ADMIN (3 days)

### Category G: Admin APIs (10 routes)
- `/api/admin/viral/webhook-health/route.ts`
- `/api/admin/viral/notification-stats/route.ts`
- `/api/admin/analytics/route.ts`
- ... (7 more)

### Category H: Cron Jobs (5 routes)
- `/api/cron/sync-referrals/route.ts` ✅ (fix in Phase 1)
- `/api/cron/sync-guild-leaderboard/route.ts` ✅ (fix in Phase 1)
- `/api/cron/daily-snapshot/route.ts`
- ... (2 more)

### Category I: Analytics/Misc (remaining routes)
- Profile APIs
- Social APIs
- Frame routes
- Webhook handlers

---

## PHASE 6: BOT LIB FILES (1 week)

**Files**: 171 lib files, only 12 currently use Subsquid

**Priority Order**:
1. Core bot response functions (10 files)
2. Leaderboard calculators (8 files)
3. Stats aggregators (12 files)
4. Guild management (15 files)
5. Quest handlers (10 files)
6. Badge managers (8 files)
7. Utility functions (108 files)

**Pattern**: Same as API routes - Subsquid for on-chain, Supabase for metadata

---

## TESTING STRATEGY

### For Each Route:

**1. Unit Test**
```typescript
describe('GET /api/staking/stakes', () => {
  it('returns stakes from Subsquid', async () => {
    const response = await fetch('/api/staking/stakes?address=0x123')
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.stakes).toBeDefined()
  })

  it('enriches with Supabase metadata', async () => {
    const response = await fetch('/api/staking/stakes?address=0x123')
    const data = await response.json()
    expect(data.stakes[0].badge.name).toBeDefined()
  })

  it('returns cached data on second call', async () => {
    await fetch('/api/staking/stakes?address=0x123')
    const start = Date.now()
    await fetch('/api/staking/stakes?address=0x123')
    const duration = Date.now() - start
    expect(duration).toBeLessThan(10) // Redis cache hit
  })
})
```

**2. Integration Test**
- Test with real Subsquid data
- Verify Supabase enrichment works
- Check Redis caching
- Validate error handling

**3. Performance Test**
- Response time < 50ms (p95)
- Cache hit rate > 80%
- No N+1 queries
- Proper pagination

---

## MIGRATION CHECKLIST (PER ROUTE)

```markdown
## Route: /api/example/route.ts

### Pre-Migration:
- [ ] Identify data sources (on-chain vs metadata)
- [ ] Check if Subsquid query function exists
- [ ] Review current Supabase queries
- [ ] Document current behavior

### Migration:
- [ ] Create/use Subsquid query function
- [ ] Keep only metadata queries in Supabase
- [ ] Implement hybrid pattern
- [ ] Add Redis caching (if appropriate)
- [ ] Remove dropped table references

### Testing:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Performance tests pass
- [ ] Manual testing with real data

### Validation:
- [ ] 0 TypeScript errors
- [ ] Response time < 50ms (p95)
- [ ] Cache hit rate > 80% (if cached)
- [ ] No errors in logs
- [ ] Documentation updated

### Code Review:
- [ ] Pattern follows template
- [ ] Error handling proper
- [ ] Caching strategy correct
- [ ] Comments clear
```

---

## PROGRESS TRACKING

### Weekly Report Template:

```markdown
## Week N Progress Report

**Dates**: [Start] - [End]

**Completed**:
- Routes migrated: X
- Broken routes fixed: Y
- Tests added: Z
- Performance improvements: A

**Metrics**:
- API routes migrated: X/127 (Y%)
- Lib files migrated: X/171 (Y%)
- Routes broken: X
- Average response time: Xms
- Cache hit rate: X%

**Blockers**: None / [List blockers]

**Next Week Plan**:
- Migrate Category X (N routes)
- Fix remaining broken routes
- Add tests for migrated routes
```

---

## SUCCESS CRITERIA

### Week 1: ✅ STABLE
- [ ] 0 broken routes
- [ ] 10 fully working routes (8%)
- [ ] All partial migrations completed
- [ ] Missing query functions created

### Week 2-3: ✅ FUNCTIONAL
- [ ] 55 routes migrated (43%)
- [ ] All user-facing features working
- [ ] Leaderboard, guild, profile APIs done
- [ ] Performance targets met (<50ms p95)

### Week 4: ✅ COMPLETE
- [ ] 127 routes migrated (100%)
- [ ] Bot lib files updated (60%+)
- [ ] Comprehensive test coverage
- [ ] Documentation accurate
- [ ] Production-ready

---

## DAILY WORKFLOW

**Morning** (30min):
1. Pull latest code
2. Review overnight indexer logs
3. Check if any routes broken
4. Plan day's migration targets

**Work** (6-7 hours):
1. Pick next route from priority list
2. Follow migration checklist
3. Test thoroughly
4. Commit with clear message
5. Update progress tracker

**End of Day** (15min):
1. Push code
2. Update progress document
3. Note any blockers
4. Plan tomorrow

---

## RISK MITIGATION

**Risk 1**: Breaking more routes during migration
- Mitigation: Test every route after touching it
- Mitigation: Never drop tables until migration complete

**Risk 2**: Missing query functions discovered late
- Mitigation: Audit all entities vs functions (done)
- Mitigation: Create functions proactively

**Risk 3**: Performance degradation
- Mitigation: Benchmark before/after each migration
- Mitigation: Redis caching on all routes

**Risk 4**: Timeline slip
- Mitigation: Weekly progress reports
- Mitigation: Focus on high-priority routes first
- Mitigation: Parallel work where possible

---

## CONCLUSION

This is a **systematic, professional, test-driven migration plan**.

- Clear priorities (fix broken first, then user-facing, then rest)
- Proven pattern (4 working routes as template)
- Testing strategy (unit, integration, performance)
- Progress tracking (weekly reports, honest metrics)
- Risk mitigation (test everything, benchmark, report)

**Timeline**: 3-4 weeks to completion
**Confidence**: HIGH (foundation is excellent, pattern is proven)
**Next Step**: Start Phase 1 (fix broken routes)

---

**Status**: Ready to begin systematic migration following this plan.
