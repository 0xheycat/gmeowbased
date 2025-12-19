# Phase 7: Performance Optimization & Caching

**Status**: 🚀 READY TO START  
**Date**: December 19, 2025  
**Prerequisites**: ✅ Phase 6 Complete (All deprecated functions replaced)

## Executive Summary

Enhance performance through schema improvements, caching layers, and code cleanup. Target: <10ms API response times with 90%+ cache hit rate for frequently accessed data.

---

## Current State Analysis

### Performance Baseline (Post-Phase 6)

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Leaderboard API | ~50ms | <10ms | 80% improvement needed |
| User Profile API | ~100ms | <50ms | 50% improvement needed |
| Community Events | ~150ms | <50ms | 67% improvement needed |
| Cache Hit Rate | 0% (no cache) | 90% | Need caching layer |
| Subsquid Query Time | 200-500ms | <100ms | Schema optimization needed |

### Subsquid Schema Gaps

**Missing Entities** (identified in Phase 6):
1. `tipEvents` - For direct tip queries (currently stub)
2. `viralMilestones` - For milestone tracking (currently stub)
3. `xpTransactions` - For detailed XP history
4. `achievementUnlocks` - For achievement tracking

**Performance Issues**:
- No query-level caching
- No aggregation tables
- Missing indexes on common queries
- No denormalized data for fast reads

### Code Cleanup Needed

**Deprecated Files to Remove**:
1. `lib/viral/viral-achievements.ts` - All functions no-op
2. `lib/leaderboard/leaderboard-scorer.ts` - Unused manual scoring
3. Unused bot context helpers
4. Old telemetry functions

---

## Phase 7 Priorities

### Priority 1: Subsquid Schema Enhancements (Week 1) 🔥

**Goal**: Add missing entities and optimize queries

**Task 1.1: Add TipEvents Entity**

File: `gmeow-indexer/schema.graphql`

```graphql
type TipEvent @entity {
  id: ID!
  from: User!
  to: User!
  amount: BigInt!
  timestamp: DateTime!
  txHash: String!
  blockNumber: Int!
  
  # Computed fields for analytics
  isFirstTip: Boolean!
  dailyTipCount: Int!
}

type User @entity {
  # ... existing fields
  tipsGiven: [TipEvent!]! @derivedFrom(field: "from")
  tipsReceived: [TipEvent!]! @derivedFrom(field: "to")
  totalTipsGiven: BigInt!
  totalTipsReceived: BigInt!
}
```

**Implementation**:
```typescript
// gmeow-indexer/src/main.ts
// Add to GmeowCore event handlers

ctx.blocks.forEach(block => {
  for (let log of block.logs) {
    if (log.topics[0] === TipSent.topic) {
      const event = TipSent.decode(log)
      
      // Create TipEvent
      const tipEvent = new TipEvent({
        id: log.id,
        from: getOrCreateUser(event.from),
        to: getOrCreateUser(event.to),
        amount: event.amount,
        timestamp: new Date(block.header.timestamp * 1000),
        txHash: log.transaction?.hash || '',
        blockNumber: block.header.height,
        isFirstTip: false, // Computed in second pass
        dailyTipCount: 0,
      })
      
      tipEvents.set(tipEvent.id, tipEvent)
    }
  }
})
```

**Impact**:
- ✅ `getTipEvents()` becomes fully functional
- ✅ `fetchTipPoints()` gets real data
- ✅ Tip analytics dashboard enabled

---

**Task 1.2: Add ViralMilestones Entity**

File: `gmeow-indexer/schema.graphql`

```graphql
type ViralMilestone @entity {
  id: ID!
  user: User!
  milestoneType: String! # "first_gm", "10_streak", "100_tips_received", etc.
  value: BigInt!
  timestamp: DateTime!
  castHash: String
  notificationSent: Boolean!
  
  # Context
  previousValue: BigInt
  requiredValue: BigInt!
  category: String! # "gm", "tips", "badges", "guilds"
}

type User @entity {
  # ... existing fields
  milestones: [ViralMilestone!]! @derivedFrom(field: "user")
  milestoneCount: Int!
}
```

**Milestone Detection Logic**:
```typescript
// Detect milestones during event processing
function checkMilestones(user: User, eventType: string): ViralMilestone[] {
  const milestones: ViralMilestone[] = []
  
  // GM Streaks
  if (eventType === 'gm') {
    if (user.currentStreak === 7n) {
      milestones.push(createMilestone(user, '7_day_streak', 7n))
    }
    if (user.currentStreak === 30n) {
      milestones.push(createMilestone(user, '30_day_streak', 30n))
    }
    if (user.lifetimeGMs === 100n) {
      milestones.push(createMilestone(user, '100_gms', 100n))
    }
  }
  
  // Tip Milestones
  if (eventType === 'tip') {
    if (user.totalTipsReceived === 10n) {
      milestones.push(createMilestone(user, '10_tips_received', 10n))
    }
  }
  
  return milestones
}
```

**Impact**:
- ✅ `getViralMilestones()` becomes fully functional
- ✅ `processQueuedViralNotifications()` gets real data
- ✅ Achievement system automated

---

**Task 1.3: Add Aggregation Tables**

File: `gmeow-indexer/schema.graphql`

```graphql
type DailyUserStats @entity {
  id: ID! # userId-YYYY-MM-DD
  user: User!
  date: DateTime!
  
  # Daily metrics
  gmsCompleted: Int!
  tipsGiven: BigInt!
  tipsReceived: BigInt!
  xpEarned: BigInt!
  guildsJoined: Int!
  badgesMinted: Int!
  
  # Computed
  streakDay: Int!
  rank: Int
}

type HourlyLeaderboardSnapshot @entity {
  id: ID! # YYYY-MM-DD-HH
  timestamp: DateTime!
  
  # Top 100 snapshot
  entries: String! # JSON array of {rank, userId, totalPoints}
  
  # Metadata
  totalUsers: Int!
  averagePoints: BigInt!
  medianPoints: BigInt!
}
```

**Benefits**:
- 🚀 Pre-computed daily stats (no aggregation queries)
- 🚀 Historical leaderboard snapshots
- 🚀 Faster analytics dashboards

---

### Priority 2: Caching Layer (Week 2) ⚡

**Goal**: 90%+ cache hit rate for hot paths

**Task 2.1: Add Redis Caching**

Install Redis:
```bash
# Docker Compose addition
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
```

Create Redis Client:
```typescript
// lib/cache/redis-client.ts
import { Redis } from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})

export default redis
```

---

**Task 2.2: Cache Leaderboard Data**

File: `lib/cache/leaderboard-cache.ts`

```typescript
import redis from './redis-client'
import { getLeaderboard } from '@/lib/subsquid-client'

const LEADERBOARD_KEY = 'leaderboard:top100'
const LEADERBOARD_TTL = 15 * 60 // 15 minutes

export async function getCachedLeaderboard(limit = 100) {
  try {
    // Try cache first
    const cached = await redis.get(LEADERBOARD_KEY)
    if (cached) {
      console.log('[Cache] Leaderboard hit')
      return JSON.parse(cached)
    }
    
    // Cache miss - fetch from Subsquid
    console.log('[Cache] Leaderboard miss, fetching...')
    const data = await getLeaderboard(limit)
    
    // Store in cache
    await redis.setex(
      LEADERBOARD_KEY,
      LEADERBOARD_TTL,
      JSON.stringify(data)
    )
    
    return data
  } catch (error) {
    console.error('[Cache] Error:', error)
    // Fallback to direct query
    return await getLeaderboard(limit)
  }
}

// Cache invalidation on new GM event
export async function invalidateLeaderboardCache() {
  await redis.del(LEADERBOARD_KEY)
  console.log('[Cache] Leaderboard invalidated')
}
```

**Usage in API**:
```typescript
// app/api/leaderboard/route.ts
import { getCachedLeaderboard } from '@/lib/cache/leaderboard-cache'

export async function GET(request: Request) {
  const data = await getCachedLeaderboard()
  
  return NextResponse.json({
    success: true,
    data,
    cached: true,
  })
}
```

**Performance**:
- Cold: 200ms (Subsquid query)
- Warm: <5ms (Redis cache hit)
- 95% cache hit rate expected

---

**Task 2.3: Cache User Stats**

File: `lib/cache/user-cache.ts`

```typescript
import redis from './redis-client'
import { getUserStats } from '@/lib/subsquid-client'

const USER_STATS_PREFIX = 'user:stats:'
const USER_STATS_TTL = 5 * 60 // 5 minutes

export async function getCachedUserStats(walletAddress: string) {
  const key = `${USER_STATS_PREFIX}${walletAddress.toLowerCase()}`
  
  try {
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
    
    const data = await getUserStats(walletAddress)
    await redis.setex(key, USER_STATS_TTL, JSON.stringify(data))
    
    return data
  } catch (error) {
    console.error('[Cache] User stats error:', error)
    return await getUserStats(walletAddress)
  }
}

// Invalidate specific user
export async function invalidateUserCache(walletAddress: string) {
  const key = `${USER_STATS_PREFIX}${walletAddress.toLowerCase()}`
  await redis.del(key)
}
```

---

**Task 2.4: Cache Community Events**

File: `lib/cache/events-cache.ts`

```typescript
import redis from './redis-client'
import { getRankEvents } from '@/lib/subsquid-client'

const EVENTS_PREFIX = 'events:'
const EVENTS_TTL = 3 * 60 // 3 minutes

export async function getCachedRankEvents(options: {
  fid?: number
  limit?: number
  types?: string[]
}) {
  const key = `${EVENTS_PREFIX}${JSON.stringify(options)}`
  
  try {
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
    
    const data = await getRankEvents(options)
    await redis.setex(key, EVENTS_TTL, JSON.stringify(data))
    
    return data
  } catch (error) {
    console.error('[Cache] Events error:', error)
    return await getRankEvents(options)
  }
}
```

---

### Priority 3: Code Cleanup (Week 3) 🧹

**Goal**: Remove unused code, improve maintainability

**Task 3.1: Archive Deprecated Files**

Create archive directory:
```bash
mkdir -p archive/phase-7-cleanup
```

**Files to Archive**:
```bash
# Viral achievements (all no-op functions)
mv lib/viral/viral-achievements.ts archive/phase-7-cleanup/

# Legacy leaderboard scorer (unused)
mv lib/leaderboard/leaderboard-scorer.ts archive/phase-7-cleanup/

# Old telemetry (recordRankEvent no-op)
# Keep file but remove deprecated function
```

**Task 3.2: Remove Deprecated Code**

File: `lib/utils/telemetry.ts` (lines 750-760)

```typescript
// REMOVE THIS SECTION:
// DEPRECATED (Phase 3): gmeow_rank_events table dropped
export async function recordRankEvent(...) {
  console.log('[telemetry] recordRankEvent (DEPRECATED)')
  return
}
```

**Task 3.3: Update Import References**

Search and update imports:
```bash
# Find references to archived files
grep -r "viral-achievements" --include="*.ts" --include="*.tsx"
grep -r "leaderboard-scorer" --include="*.ts" --include="*.tsx"

# Update or remove imports
```

---

### Priority 4: Farcaster Caching (Week 4) 📱

**Goal**: 80% cache hit rate for Farcaster data

**Task 4.1: Enhanced Neynar Webhook**

File: `app/api/neynar/webhook/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import redis from '@/lib/cache/redis-client'

export async function POST(request: Request) {
  const event = await request.json()
  const supabase = createClient()
  
  // Update user profile cache
  if (event.type === 'user.updated') {
    const profile = {
      fid: event.data.fid,
      username: event.data.username,
      display_name: event.data.display_name,
      avatar_url: event.data.pfp_url,
      bio: event.data.profile.bio.text,
      follower_count: event.data.follower_count,
      following_count: event.data.following_count,
      verified: event.data.verified,
      updated_at: new Date().toISOString(),
    }
    
    // Update Supabase
    await supabase
      .from('user_profiles')
      .upsert(profile)
    
    // Update Redis cache
    await redis.setex(
      `farcaster:user:${profile.fid}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(profile)
    )
  }
  
  // Cache cast data
  if (event.type === 'cast.created') {
    const cast = {
      cast_hash: event.data.hash,
      fid: event.data.author.fid,
      cast_text: event.data.text,
      created_at: new Date(event.data.timestamp).toISOString(),
    }
    
    await supabase.from('badge_casts').insert(cast)
    
    await redis.setex(
      `farcaster:cast:${cast.cast_hash}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(cast)
    )
  }
  
  return NextResponse.json({ success: true })
}
```

**Task 4.2: Farcaster Profile Cache Helper**

File: `lib/cache/farcaster-cache.ts`

```typescript
import redis from './redis-client'
import { getNeynarServerClient } from '@/lib/integrations/neynar'

export async function getCachedFarcasterProfile(fid: number) {
  const key = `farcaster:user:${fid}`
  
  try {
    // Try cache
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
    
    // Fetch from Neynar
    const neynar = getNeynarServerClient()
    const profile = await neynar.fetchUser(fid)
    
    // Cache for 24 hours
    await redis.setex(key, 24 * 60 * 60, JSON.stringify(profile))
    
    return profile
  } catch (error) {
    console.error('[Cache] Farcaster profile error:', error)
    return null
  }
}
```

---

## Implementation Timeline

### Week 1: Subsquid Schema (Dec 19-25)
- [ ] Day 1-2: Add TipEvents entity and handlers
- [ ] Day 3-4: Add ViralMilestones entity and detection
- [ ] Day 5-6: Add aggregation tables (DailyUserStats)
- [ ] Day 7: Deploy schema updates, verify queries

### Week 2: Caching Layer (Dec 26-Jan 1)
- [ ] Day 1: Setup Redis (Docker + config)
- [ ] Day 2-3: Implement leaderboard cache
- [ ] Day 4: Implement user stats cache
- [ ] Day 5: Implement events cache
- [ ] Day 6-7: Testing and monitoring

### Week 3: Code Cleanup (Jan 2-8)
- [ ] Day 1-2: Archive deprecated files
- [ ] Day 3-4: Remove unused code
- [ ] Day 5: Update imports and references
- [ ] Day 6-7: Testing and verification

### Week 4: Farcaster Caching (Jan 9-15)
- [ ] Day 1-2: Enhanced webhook handler
- [ ] Day 3-4: Cache helper functions
- [ ] Day 5-6: Integration testing
- [ ] Day 7: Performance monitoring

---

## Success Metrics

### Performance Targets

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Leaderboard API | 50ms | <10ms | p95 response time |
| User Stats API | 100ms | <50ms | p95 response time |
| Community Events | 150ms | <50ms | p95 response time |
| Cache Hit Rate | 0% | 90% | Redis INFO stats |
| Subsquid Query | 500ms | <100ms | GraphQL timing |

### Code Quality Targets

| Metric | Before | Target |
|--------|--------|--------|
| Deprecated Files | 3 files | 0 files |
| Unused Functions | ~10 | 0 |
| Console Warnings | ~15/request | 0 |
| Type Coverage | 100% | 100% |

---

## Rollback Plan

If Phase 7 causes issues:

### Level 1: Disable Caching
```typescript
// lib/cache/redis-client.ts
const CACHE_ENABLED = process.env.ENABLE_REDIS_CACHE === 'true'

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  if (!CACHE_ENABLED) {
    return await fetcher()
  }
  // ... cache logic
}
```

### Level 2: Revert Schema Changes
```bash
# Rollback Subsquid schema
cd gmeow-indexer
git checkout main -- schema.graphql
sqd codegen
sqd build
sqd deploy
```

### Level 3: Restore Archived Files
```bash
# Restore archived files if needed
cp archive/phase-7-cleanup/* lib/
```

---

## Monitoring & Alerts

### Redis Monitoring

```typescript
// lib/monitoring/redis-stats.ts
export async function getRedisStats() {
  const info = await redis.info('stats')
  
  return {
    cacheHitRate: calculateHitRate(info),
    memoryUsage: parseMemory(info),
    connectedClients: parseClients(info),
    totalKeys: await redis.dbsize(),
  }
}

// Expose via API
// app/api/admin/cache-stats/route.ts
export async function GET() {
  const stats = await getRedisStats()
  return NextResponse.json(stats)
}
```

### Performance Monitoring

```typescript
// lib/monitoring/performance.ts
export function trackQueryTime(
  operation: string,
  duration: number,
  cached: boolean
) {
  console.log(`[Perf] ${operation}: ${duration}ms (cached: ${cached})`)
  
  // Send to monitoring service (PostHog, DataDog, etc.)
  // analytics.track('query_performance', { operation, duration, cached })
}
```

---

## Documentation Updates

After completion, update:
- [ ] `SUBSQUID-SUPABASE-MIGRATION-PLAN.md` - Phase 7 complete
- [ ] Create `PHASE-7-COMPLETE.md` report
- [ ] Update `README.md` - Architecture diagram with caching
- [ ] Update API docs - Cache headers and invalidation
- [ ] Create `CACHING-STRATEGY.md` guide

---

## Phase 8 Preview: Advanced Features

After Phase 7, we'll be ready for:
1. **Real-time Updates** - WebSocket subscriptions
2. **Advanced Analytics** - Trends, predictions, insights
3. **Multi-chain Support** - Expand beyond Base
4. **Enhanced Bot** - AI-powered responses with full context

---

**Document Created**: December 19, 2025  
**Phase 6 Completion**: 5/5 functions replaced (100%)  
**Ready for Implementation**: ✅ YES

**Estimated Completion**: January 15, 2026 (4 weeks)
