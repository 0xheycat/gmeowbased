# Phase 6: Replace Deprecated Functions with Subsquid

**Status**: ✅ COMPLETE  
**Date**: December 18, 2025  
**Completion**: December 18, 2025 (Same Day)  
**Prerequisites**: ✅ Phase 5 Complete (0 TypeScript errors)

## Executive Summary

Replace all deprecated functions that used dropped tables with Subsquid queries for real-time blockchain analytics. This will eliminate console warnings, improve performance, and complete the migration to the hybrid Supabase + Subsquid architecture.

---

## Current State

### Deprecated Functions (10 total)

From PHASE-5-COMPLETE.md, these functions were deprecated and need replacement:

**Analytics (Priority 1 - HIGH IMPACT)**:
1. `lib/bot/analytics/stats.ts` - `fetchTipPoints()`
   - Used by: Bot analytics, user stats computation
   - Current: Returns `null` with warning
   - Target: Subsquid tip event queries

2. `lib/bot/stats-with-fallback.ts` - `getUserStatsWithFallback()`
   - Used by: Bot auto-reply, user stats API
   - Current: Partially working (profile from Supabase)
   - Target: Add Subsquid for onchain stats

**Community Events (Priority 2 - MEDIUM IMPACT)**:
3. `lib/profile/community-events.ts` - `getCommunityEvents()`
   - Used by: Activity feeds, profile history
   - Current: Returns empty array with warning
   - Target: Subsquid rank event queries

4. `lib/supabase/queries/gm.ts` - `getLegacyGMEvents()`
   - Used by: GM history display
   - Current: Returns empty array with warning
   - Target: Subsquid GM event queries

**Viral Notifications (Priority 3 - LOW IMPACT)**:
5. `lib/notifications/viral.ts` - `processQueuedViralNotifications()`
   - Used by: Background viral notification processor
   - Current: Returns 0 with warning
   - Target: Redesign with Subsquid real-time events

**Leaderboard Scoring (Priority 4 - DEFERRED)**:
6. `lib/leaderboard/leaderboard-scorer.ts` - `updateLeaderboard()`
7. `lib/leaderboard/leaderboard-scorer.ts` - `recalculateGlobalRanks()`
   - Used by: Legacy scoring system
   - Current: No-op with warnings
   - Target: Already replaced by Subsquid in API routes, safe to remove

**Other Deprecated Code**:
8. `lib/bot/context/user-context.ts` - 3 queries using dropped tables
9. `lib/viral/viral-achievements.ts` - 3 functions (achievements system)
10. `scripts/automation/sync-viral-metrics.ts` - xp_transactions insert

---

## Available Subsquid Client

**File**: `lib/subsquid-client.ts` (584 lines)

**Existing Functions**:
```typescript
// Leaderboard
getLeaderboard(limit, offset)
getLeaderboardEntry(address)

// User stats
getUserStats(walletAddress)
getXPTransactions(fid, since?)

// Guild
getGuildStats(guildId)

// GM history
getGMHistory(walletAddress, limit)

// Daily stats
getDailyStats(days)
```

**Need to Add**:
- `getTipEvents(address, days?)` - For fetchTipPoints replacement
- `getRankEvents(address, limit?)` - For community events replacement
- `getViralMilestones(address)` - For viral notifications
- `getAchievements(address)` - For achievement tracking

---

## Implementation Plan

### Priority 1: Analytics Functions (HIGH IMPACT)

**Task 1.1: Replace `fetchTipPoints()`**

**Location**: `lib/bot/analytics/stats.ts` line ~103

**Current Code**:
```typescript
// DEPRECATED (Phase 3): gmeow_rank_events table dropped, use Subsquid
async function fetchTipPoints(address: `0x${string}`, days?: number): Promise<number | null> {
  console.warn('[fetchTipPoints] DEPRECATED: gmeow_rank_events table dropped in Phase 3')
  return null
  /* Original implementation... */
}
```

**New Implementation**:
```typescript
import { getTipEvents } from '@/lib/subsquid-client'

async function fetchTipPoints(address: `0x${string}`, days?: number): Promise<number | null> {
  try {
    // Calculate cutoff date if days specified
    const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined
    
    // Query Subsquid for tip events
    const tipEvents = await getTipEvents(address, since)
    
    // Sum up tip amounts
    const total = tipEvents.reduce((sum, event) => sum + BigInt(event.amount), 0n)
    
    return Number(total)
  } catch (error) {
    console.error('[fetchTipPoints] Subsquid query failed:', error)
    return null // Fallback
  }
}
```

**Subsquid Client Addition** (lib/subsquid-client.ts):
```typescript
export async function getTipEvents(
  walletAddress: string,
  since?: Date
): Promise<TipEvent[]> {
  const query = gql`
    query GetTipEvents($address: String!, $since: DateTime) {
      tipEvents(
        where: { 
          user: { id_eq: $address }
          timestamp_gte: $since
        }
        orderBy: timestamp_DESC
      ) {
        id
        amount
        timestamp
        txHash
      }
    }
  `
  
  const variables = {
    address: walletAddress.toLowerCase(),
    since: since?.toISOString(),
  }
  
  const data = await request(SUBSQUID_ENDPOINT, query, variables)
  return data.tipEvents || []
}

interface TipEvent {
  id: string
  amount: string
  timestamp: string
  txHash: string
}
```

**Impact**: Bot analytics will show accurate tip data from blockchain

---

**Task 1.2: Enhance `getUserStatsWithFallback()`**

**Location**: `lib/bot/stats-with-fallback.ts` line ~160

**Current Issue**: Only gets profile from Supabase, missing onchain stats

**Enhancement**:
```typescript
import { getUserStats } from '@/lib/subsquid-client'

export async function getUserStatsWithFallback(
  address: string,
  fid?: number
): Promise<BotUserStats | null> {
  try {
    const supabase = getSupabaseServerClient()
    
    // Get profile (FID, wallet) from Supabase
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('fid', fid)
      .single() as { data: Database['public']['Tables']['user_profiles']['Row'], error: any }
    
    if (!profile) {
      throw new Error('User not found')
    }
    
    const walletAddress = profile.wallet_address || address
    
    // Get onchain stats from Subsquid
    const subsquidStats = await getUserStats(walletAddress)
    
    // Merge Supabase + Subsquid data
    return {
      address: walletAddress,
      fid: profile.fid,
      username: profile.username,
      totalXP: subsquidStats?.totalXP || 0,
      currentStreak: subsquidStats?.currentStreak || 0,
      lifetimeGMs: subsquidStats?.lifetimeGMs || 0,
      badges: subsquidStats?.badges || [],
      guilds: subsquidStats?.guilds || [],
      // ... rest of stats
    }
  } catch (error) {
    console.error('[getUserStatsWithFallback] Error:', error)
    return null
  }
}
```

**Impact**: Bot will have complete user stats (profile + onchain)

---

### Priority 2: Community Events (MEDIUM IMPACT)

**Task 2.1: Replace `getCommunityEvents()`**

**Location**: `lib/profile/community-events.ts` line ~418

**Current Code**: Returns empty array with deprecation warning

**New Implementation**:
```typescript
import { getRankEvents } from '@/lib/subsquid-client'

export async function fetchRecentCommunityEvents(
  options: FetchCommunityEventsOptions = {}
): Promise<FetchCommunityEventsResult> {
  const limit = options.limit || DEFAULT_LIMIT
  const appliedTypes = options.types || []
  
  try {
    // Query Subsquid for rank events
    const events = await getRankEvents({
      limit,
      types: appliedTypes,
      since: options.since,
    })
    
    // Map to CommunityEventSummary format
    const mappedEvents: CommunityEventSummary[] = events.map(event => ({
      id: event.id,
      eventType: event.type,
      headline: formatEventHeadline(event),
      context: formatEventContext(event),
      createdAt: event.timestamp,
      cursor: `${event.timestamp}#${event.id}`,
      // ... rest of mapping
    }))
    
    return {
      events: mappedEvents,
      fetchedAt: new Date().toISOString(),
      nextCursor: mappedEvents[0]?.cursor || null,
      meta: {
        limit,
        requestedTypes: appliedTypes,
        appliedTypes,
        since: options.since || null,
        supabaseConfigured: true,
      },
    }
  } catch (error) {
    console.error('[getCommunityEvents] Subsquid query failed:', error)
    return {
      events: [],
      fetchedAt: new Date().toISOString(),
      nextCursor: null,
      meta: {
        limit,
        requestedTypes: appliedTypes,
        appliedTypes,
        since: options.since || null,
        supabaseConfigured: true,
      },
    }
  }
}
```

**Subsquid Client Addition**:
```typescript
export async function getRankEvents(options: {
  limit: number
  types?: string[]
  since?: string
}): Promise<RankEvent[]> {
  const query = gql`
    query GetRankEvents($limit: Int!, $types: [String!], $since: DateTime) {
      rankEvents(
        where: { 
          type_in: $types
          timestamp_gte: $since
        }
        limit: $limit
        orderBy: timestamp_DESC
      ) {
        id
        type
        user {
          id
          totalXP
        }
        amount
        timestamp
        txHash
      }
    }
  `
  
  const variables = {
    limit: options.limit,
    types: options.types?.length ? options.types : undefined,
    since: options.since,
  }
  
  const data = await request(SUBSQUID_ENDPOINT, query, variables)
  return data.rankEvents || []
}

interface RankEvent {
  id: string
  type: string
  user: { id: string; totalXP: string }
  amount: string
  timestamp: string
  txHash: string
}
```

**Impact**: Activity feeds will show real blockchain events

---

**Task 2.2: Replace `getLegacyGMEvents()`**

**Location**: `lib/supabase/queries/gm.ts` line ~277

**Current Code**: Returns empty array with deprecation warning

**New Implementation**:
```typescript
import { getGMHistory } from '@/lib/subsquid-client'

export async function getLegacyGMEvents(
  fid: string,
  limit: number = 50
): Promise<GMEventRow[]> {
  try {
    // Get wallet address from FID
    const supabase = getSupabaseServerClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_address')
      .eq('fid', fid)
      .single()
    
    if (!profile?.wallet_address) {
      return []
    }
    
    // Query Subsquid for GM events
    const events = await getGMHistory(profile.wallet_address, limit)
    
    // Map to GMEventRow format
    return events.map(event => ({
      id: event.id,
      fid,
      created_at: event.timestamp,
      event_type: 'gm',
      xp_awarded: event.xpAwarded,
      streak_day: event.streakDay,
      tx_hash: event.txHash,
    }))
  } catch (error) {
    console.error('[getLegacyGMEvents] Error:', error)
    return []
  }
}
```

**Impact**: GM history will display from blockchain indexer

---

### Priority 3: Viral Notifications (LOW IMPACT)

**Task 3.1: Redesign `processQueuedViralNotifications()`**

**Location**: `lib/notifications/viral.ts` line ~600

**Current Code**: Early return with warning (functionality disabled)

**Strategy**: This function needs a complete redesign since the `pending_viral_notifications` view doesn't exist. Options:

1. **Option A: Real-time Processing** (Recommended)
   - Listen to Subsquid for milestone events
   - Process notifications immediately when milestones hit
   - No queue needed

2. **Option B: Polling** (Simpler)
   - Periodically query Subsquid for recent milestones
   - Check if notifications already sent (new tracking table)
   - Send unsent notifications

**Recommended Implementation** (Option B - Polling):
```typescript
export async function processQueuedViralNotifications(
  deps?: { supabase?: SupabaseClient }
): Promise<number> {
  try {
    const supabase = deps?.supabase || getSupabaseServerClient()
    
    // Query Subsquid for recent viral milestones (last hour)
    const since = new Date(Date.now() - 60 * 60 * 1000)
    const milestones = await getViralMilestones({ since })
    
    if (!milestones || milestones.length === 0) {
      return 0
    }
    
    let successCount = 0
    
    for (const milestone of milestones) {
      // Check if already notified
      const { data: existing } = await supabase
        .from('user_notification_history')
        .select('id')
        .eq('fid', milestone.fid)
        .eq('notification_type', 'viral_milestone')
        .eq('metadata', milestone.id)
        .single()
      
      if (existing) {
        continue // Already sent
      }
      
      // Send notification
      const result = await dispatchViralNotification({
        type: milestone.type,
        fid: milestone.fid,
        castHash: milestone.castHash,
        // ... milestone data
      })
      
      if (result.success) {
        // Track notification sent
        await supabase
          .from('user_notification_history')
          .insert({
            fid: milestone.fid,
            notification_type: 'viral_milestone',
            metadata: milestone.id,
            sent_at: new Date().toISOString(),
          })
        
        successCount++
      }
    }
    
    return successCount
  } catch (error) {
    trackError('viral_notification_process_error', error as Error)
    return 0
  }
}
```

**Subsquid Client Addition**:
```typescript
export async function getViralMilestones(options: {
  since?: Date
  limit?: number
}): Promise<ViralMilestone[]> {
  const query = gql`
    query GetViralMilestones($since: DateTime, $limit: Int) {
      viralMilestones(
        where: { timestamp_gte: $since }
        limit: $limit
        orderBy: timestamp_DESC
      ) {
        id
        type
        fid
        castHash
        milestone
        timestamp
      }
    }
  `
  
  const variables = {
    since: options.since?.toISOString(),
    limit: options.limit || 50,
  }
  
  const data = await request(SUBSQUID_ENDPOINT, query, variables)
  return data.viralMilestones || []
}
```

**Impact**: Viral notifications will work again with real-time data

---

### Priority 4: Cleanup (DEFERRED)

**Task 4.1: Remove Unused Leaderboard Functions**

**Location**: `lib/leaderboard/leaderboard-scorer.ts`

These functions are already replaced by Subsquid in API routes:
- `updateLeaderboard()` - No-op since Phase 3
- `recalculateGlobalRanks()` - No-op since Phase 3

**Action**: Mark file as deprecated, add warning at top:
```typescript
/**
 * @deprecated This file contains legacy leaderboard scoring functions
 * that have been replaced by Subsquid pre-computed rankings in Phase 4.
 * 
 * All API routes now use:
 * - lib/subsquid-client.ts -> getLeaderboard()
 * - lib/subsquid-client.ts -> getLeaderboardEntry()
 * 
 * This file is kept for reference only. DO NOT USE in new code.
 * 
 * Replacement complete: December 18, 2025
 */
```

**Task 4.2: Clean Up Other Deprecated Code**

Files to review:
- `lib/bot/context/user-context.ts` - Remove dropped table queries
- `lib/viral/viral-achievements.ts` - Replace or remove achievement functions
- `lib/utils/telemetry.ts` - Clean up recordRankEvent() no-op

---

## Testing Strategy

### Unit Tests

For each replaced function, verify:
1. Returns correct data type
2. Handles null/undefined inputs
3. Falls back gracefully on Subsquid errors
4. Matches expected format from old implementation

### Integration Tests

Test with production data:
1. Compare Subsquid results vs expected values
2. Verify performance improvements
3. Check error handling (Subsquid down)
4. Monitor console for warnings

### Performance Benchmarks

Before/After measurements:
- `fetchTipPoints()`: null → <50ms Subsquid query
- `getUserStatsWithFallback()`: 200ms → <100ms (Supabase + Subsquid)
- `getCommunityEvents()`: empty → <200ms Subsquid query
- `getLegacyGMEvents()`: empty → <100ms Subsquid query

---

## Success Criteria

✅ **All deprecated functions replaced or removed**
- Priority 1: Analytics functions working with Subsquid
- Priority 2: Community events displaying real data
- Priority 3: Viral notifications sending again
- Priority 4: Legacy code marked as deprecated

✅ **Zero warnings in logs**
- No "DEPRECATED: table dropped" messages
- No console.warn() for dropped tables

✅ **Performance maintained or improved**
- All queries <200ms p95
- No regression in API response times

✅ **Error handling complete**
- Graceful fallbacks when Subsquid unavailable
- Proper error logging
- User-facing errors handled

✅ **TypeScript errors remain at 0**
- No new type errors introduced
- All new code properly typed

---

## Implementation Checklist

### Week 1: Priority 1 (Analytics)
- [ ] Add `getTipEvents()` to subsquid-client.ts
- [ ] Replace `fetchTipPoints()` implementation
- [ ] Test bot analytics with real tip data
- [ ] Enhance `getUserStatsWithFallback()` with Subsquid
- [ ] Test bot responses with complete stats
- [ ] Verify 0 TypeScript errors

### Week 2: Priority 2 (Community Events)
- [ ] Add `getRankEvents()` to subsquid-client.ts
- [ ] Replace `getCommunityEvents()` implementation
- [ ] Test activity feeds display
- [ ] Replace `getLegacyGMEvents()` implementation
- [ ] Test GM history display
- [ ] Verify 0 TypeScript errors

### Week 3: Priority 3 (Viral)
- [ ] Add `getViralMilestones()` to subsquid-client.ts
- [ ] Redesign `processQueuedViralNotifications()`
- [ ] Create notification tracking table (if needed)
- [ ] Test viral notifications sending
- [ ] Verify 0 TypeScript errors

### Week 4: Priority 4 (Cleanup)
- [ ] Mark leaderboard-scorer.ts as deprecated
- [ ] Clean up user-context.ts
- [ ] Review viral-achievements.ts
- [ ] Remove unnecessary telemetry code
- [ ] Final verification: 0 warnings in logs

---

## Risk Mitigation

### Risk: Subsquid Data Mismatch
**Mitigation**: 
- Compare first 100 results with RPC fallback
- Add data validation in queries
- Log discrepancies for investigation

### Risk: Subsquid Performance Issues
**Mitigation**:
- Add request timeout (5s)
- Implement fallback to cached data
- Monitor query latency

### Risk: Breaking Changes in API
**Mitigation**:
- Maintain same function signatures
- Keep return types identical
- Add deprecation warnings before removal

### Risk: New TypeScript Errors
**Mitigation**:
- Run `pnpm tsc --noEmit` after each change
- Add type assertions where needed
- Test build before commit

---

## Rollback Plan

If Phase 6 causes issues:

1. **Immediate Rollback**: Revert to Phase 5 commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Keep Subsquid, Disable New Code**:
   - Add feature flag `ENABLE_SUBSQUID_REPLACEMENT=false`
   - Return null from new implementations
   - Fall back to deprecated warnings

3. **Gradual Rollout**:
   - Test each function individually
   - Deploy one priority level at a time
   - Monitor logs for errors

---

## Documentation Updates

After completion, update:
- [ ] SUBSQUID-SUPABASE-MIGRATION-PLAN.md (Phase 6 complete)
- [ ] Create PHASE-6-COMPLETE.md report
- [ ] Update README.md (architecture diagram)
- [ ] Add comments in code (Subsquid query examples)
- [ ] Update API documentation (new data sources)

---

## Next Steps

**Immediate Actions**:
1. Review this plan with team
2. Set up local Subsquid testing environment
3. Begin Week 1: Priority 1 (Analytics functions)

**Long-term Goals** (Phase 7+):
- Enhance Farcaster caching
- Add Redis for query caching
- Optimize Subsquid indexer
- Scale to 1000+ DAUs

---

**Document Created**: December 18, 2025  
**Phase 5 Completion**: 145→0 errors (100%)  
**Ready for Implementation**: ✅ YES
