# Cache Invalidation Runbook

**Last Updated**: November 18, 2025  
**Phase**: Phase 4 Performance Optimization  
**Owner**: Development Team  

---

## Overview

This runbook provides procedures for managing the multi-layer cache system (L1 in-memory + L2 Redis) implemented in Phase 4. It covers cache invalidation strategies, monitoring procedures, and troubleshooting common cache-related issues.

---

## Table of Contents

1. [Cache Architecture](#cache-architecture)
2. [Cache Key Patterns](#cache-key-patterns)
3. [Manual Invalidation Procedures](#manual-invalidation-procedures)
4. [Automatic Invalidation](#automatic-invalidation)
5. [Monitoring Cache Effectiveness](#monitoring-cache-effectiveness)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Procedures](#emergency-procedures)

---

## Cache Architecture

### L1 Cache (In-Memory)
- **Type**: LRU (Least Recently Used)
- **Capacity**: 1000 items
- **Scope**: Per Node.js process (serverless instance)
- **Latency**: <1ms
- **Eviction**: Automatic when capacity reached
- **TTL**: Shared with L2 cache

### L2 Cache (Upstash Redis)
- **Type**: Redis (Vercel KV)
- **Scope**: Shared across all serverless instances
- **Latency**: ~5-15ms
- **TTL**: Per-route configuration (30s - 5min)
- **Persistence**: In-memory with Redis persistence

### Cache Flow
```
Request → Check L1 → (miss) → Check L2 → (miss) → Database/API
                ↓                    ↓                    ↓
              Response           Store in L1         Store in L2 + L1
```

---

## Cache Key Patterns

### Route-Based Keys

#### User Badges
```typescript
// Pattern
`user:badges:${fid}`

// Example
`user:badges:3621`

// Cached Routes
- GET /api/badges/list?fid=3621
- GET /api/user/profile?fid=3621 (includes badges)

// TTL: 300s (5 minutes)
```

#### Badge Templates
```typescript
// Pattern
`badges:templates:all`

// Example
`badges:templates:all`

// Cached Routes
- GET /api/badges/templates

// TTL: 300s (5 minutes)
```

#### Viral Stats
```typescript
// Pattern
`viral:stats:${fid}`

// Example
`viral:stats:3621`

// Cached Routes
- GET /api/viral/stats?fid=3621

// TTL: 120s (2 minutes)
```

#### Viral Leaderboard
```typescript
// Pattern
`viral:leaderboard:${chain}:${limit}`

// Example
`viral:leaderboard:base:10`

// Cached Routes
- GET /api/viral/leaderboard?chain=base&limit=10

// TTL: 180s (3 minutes)
```

#### User Profile
```typescript
// Pattern
`user:profile:${fid}`

// Example
`user:profile:3621`

// Cached Routes
- GET /api/user/profile?fid=3621

// TTL: 300s (5 minutes)
```

#### Dashboard Telemetry
```typescript
// Pattern
`dashboard:telemetry`

// Example
`dashboard:telemetry`

// Cached Routes
- GET /api/dashboard/telemetry

// TTL: 45s
```

#### Seasons
```typescript
// Pattern
`seasons:active`

// Example
`seasons:active`

// Cached Routes
- GET /api/seasons

// TTL: 30s
```

---

## Manual Invalidation Procedures

### Using the Cache Helper

#### Invalidate Specific User Badges
```typescript
import { invalidateCache } from '@/lib/cache';

// Invalidate user badges cache
await invalidateCache(`user:badges:${fid}`);

// Example
await invalidateCache('user:badges:3621');
```

#### Invalidate Viral Stats
```typescript
import { invalidateCache } from '@/lib/cache';

// Invalidate viral stats for specific user
await invalidateCache(`viral:stats:${fid}`);

// Example
await invalidateCache('viral:stats:3621');
```

#### Invalidate User Profile
```typescript
import { invalidateCache } from '@/lib/cache';

// Invalidate user profile (includes badges, quests, etc.)
await invalidateCache(`user:profile:${fid}`);

// Example
await invalidateCache('user:profile:3621');
```

#### Invalidate Badge Templates
```typescript
import { invalidateCache } from '@/lib/cache';

// Invalidate all badge templates
await invalidateCache('badges:templates:all');
```

#### Invalidate Leaderboard
```typescript
import { invalidateCache } from '@/lib/cache';

// Invalidate specific leaderboard
await invalidateCache(`viral:leaderboard:${chain}:${limit}`);

// Example
await invalidateCache('viral:leaderboard:base:10');
```

#### Invalidate Seasons
```typescript
import { invalidateCache } from '@/lib/cache';

// Invalidate active seasons cache
await invalidateCache('seasons:active');
```

---

### Using Redis CLI (Emergency)

#### Connect to Upstash Redis
```bash
# Get connection details from Vercel environment variables
redis-cli -h driving-turtle-38422.upstash.io -p 38422 -a AZY...

# Or use REST API
curl -X POST https://driving-turtle-38422.upstash.io/del/user:badges:3621 \
  -H "Authorization: Bearer AZY..."
```

#### Delete Specific Key
```bash
# Delete user badges
DEL user:badges:3621

# Delete viral stats
DEL viral:stats:3621

# Delete leaderboard
DEL viral:leaderboard:base:10
```

#### Delete Pattern (Dangerous!)
```bash
# Delete all user badges (use with caution)
EVAL "return redis.call('del', unpack(redis.call('keys', 'user:badges:*')))" 0

# Delete all viral stats
EVAL "return redis.call('del', unpack(redis.call('keys', 'viral:stats:*')))" 0
```

#### Flush Entire Cache (Emergency Only!)
```bash
# ⚠️ WARNING: This clears ALL cache entries
FLUSHDB

# Confirm before running
redis-cli -h ... -p ... -a ... FLUSHDB
```

---

## Automatic Invalidation

### Badge Assignment
**Trigger**: POST /api/badges/assign

**Invalidated Keys**:
- `user:badges:${fid}` - User's badge list
- `user:profile:${fid}` - User's profile (includes badges)

**Implementation**:
```typescript
// In app/api/badges/assign/route.ts
export async function POST(request: Request) {
  const { fid, badgeId } = await request.json();
  
  // Assign badge to user
  await assignBadge(fid, badgeId);
  
  // Invalidate caches
  await invalidateCache(`user:badges:${fid}`);
  await invalidateCache(`user:profile:${fid}`);
  
  return NextResponse.json({ success: true });
}
```

---

### Quest Completion
**Trigger**: POST /api/quests/complete

**Invalidated Keys**:
- `user:profile:${fid}` - User's profile (includes quest progress)
- `viral:stats:${fid}` - User's viral stats (may change with quest completion)

**Implementation**:
```typescript
// In app/api/quests/complete/route.ts (example)
export async function POST(request: Request) {
  const { fid, questId } = await request.json();
  
  // Complete quest
  await completeQuest(fid, questId);
  
  // Invalidate caches
  await invalidateCache(`user:profile:${fid}`);
  await invalidateCache(`viral:stats:${fid}`);
  
  return NextResponse.json({ success: true });
}
```

---

### Season Change
**Trigger**: Admin action or scheduled job

**Invalidated Keys**:
- `seasons:active` - Active seasons list

**Implementation**:
```typescript
// In season management code
export async function updateSeason(seasonData: Season) {
  // Update season
  await updateSeasonInDatabase(seasonData);
  
  // Invalidate seasons cache
  await invalidateCache('seasons:active');
  
  return { success: true };
}
```

---

### Leaderboard Updates
**Trigger**: Rank events, achievements

**Strategy**: Rely on TTL (180s) instead of invalidation

**Reason**: 
- Leaderboard changes frequently
- Short TTL (3 minutes) balances freshness vs performance
- Manual invalidation on critical events only

**Manual Invalidation** (optional):
```typescript
// For critical updates (e.g., season end)
await invalidateCache(`viral:leaderboard:${chain}:10`);
await invalidateCache(`viral:leaderboard:${chain}:50`);
await invalidateCache(`viral:leaderboard:${chain}:100`);
```

---

## Monitoring Cache Effectiveness

### Performance Dashboard
**URL**: https://gmeowhq.art/api/admin/performance

**Metrics**:
- Cache hit rate (L1, L2, overall)
- Average response times (cached vs uncached)
- Cache memory usage
- Slow request detection (>500ms)

---

### X-Response-Time Headers
**Check Response Time**:
```bash
curl -I https://gmeowhq.art/api/viral/stats?fid=3621

# Look for header
X-Response-Time: 308.42ms
```

**Interpretation**:
- <50ms: Likely L1 cache hit ⚡⚡⚡
- 50-200ms: Likely L2 cache hit ⚡⚡
- 200-500ms: Moderate (database query with indexes) ⚡
- >500ms: Slow (cold cache or complex query) ⚠️

---

### Cache Hit Rate Calculation
**Formula**:
```
Hit Rate = (L1 Hits + L2 Hits) / Total Requests
```

**Target**: >70%

**Measurement**:
```typescript
// Track in application
let totalRequests = 0;
let cacheHits = 0;

// In getCached() function
totalRequests++;
if (cached) {
  cacheHits++;
}

const hitRate = (cacheHits / totalRequests) * 100;
console.log(`Cache Hit Rate: ${hitRate.toFixed(1)}%`);
```

---

### Redis Memory Usage
**Check Upstash Dashboard**:
1. Visit https://console.upstash.com
2. Select "driving-turtle-38422" database
3. View memory usage metrics

**Expected Usage**:
- Typical: 10-50 MB (1000-5000 cached entries)
- High: 50-100 MB (peak traffic)
- Alert: >100 MB (consider cache cleanup)

---

### Database Query Performance
**Check Index Usage**:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
  AND schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Expected Results**:
- High `idx_scan` values (>1000) on frequently used indexes
- Low scan counts may indicate unused index or cache effectiveness

---

## Troubleshooting

### Issue: Cache Not Working

#### Symptoms
- High response times (500ms+) on all requests
- X-Response-Time consistent across requests (no improvement)
- Database queries in logs for every request

#### Diagnosis
```bash
# Check if Redis is accessible
curl -X POST https://driving-turtle-38422.upstash.io/ping \
  -H "Authorization: Bearer $KV_REST_API_TOKEN"

# Expected: {"result":"PONG"}
```

#### Resolution
1. **Check Environment Variables**:
   ```bash
   # In Vercel dashboard or CLI
   vercel env ls
   
   # Look for:
   KV_REST_API_URL=https://driving-turtle-38422.upstash.io
   KV_REST_API_TOKEN=AZY...
   ```

2. **Verify lib/cache.ts Logic**:
   ```typescript
   const USE_EXTERNAL_CACHE = 
     !!process.env.KV_REST_API_URL || 
     !!process.env.UPSTASH_REDIS_REST_URL;
   ```

3. **Check Logs**:
   ```bash
   vercel logs --follow
   
   # Look for cache-related errors
   ```

4. **Restart Vercel Functions**:
   ```bash
   vercel --force
   ```

---

### Issue: Stale Data in Cache

#### Symptoms
- Users seeing outdated information
- Badge assignments not reflecting immediately
- Leaderboard showing old positions

#### Diagnosis
```typescript
// Check TTL of cached key
const ttl = await redis.ttl('user:badges:3621');
console.log(`TTL: ${ttl}s`);
```

#### Resolution
1. **Manual Invalidation**:
   ```typescript
   await invalidateCache('user:badges:3621');
   await invalidateCache('user:profile:3621');
   ```

2. **Reduce TTL** (if persistent issue):
   ```typescript
   // In route handler
   await getCached(cacheKey, fetchFn, {
     ttl: 60, // Reduce from 300s to 60s
   });
   ```

3. **Add Invalidation Trigger**:
   ```typescript
   // In mutation endpoint
   await invalidateCache(`user:badges:${fid}`);
   ```

---

### Issue: Cache Memory Full

#### Symptoms
- Upstash showing >100 MB memory usage
- Redis evicting keys before TTL expires
- Degraded cache performance

#### Diagnosis
```bash
# Check Redis memory usage
redis-cli -h ... INFO memory

# Check number of keys
redis-cli -h ... DBSIZE
```

#### Resolution
1. **Clear Expired Keys**:
   ```bash
   # Redis will automatically evict expired keys
   # Force cleanup:
   redis-cli -h ... --scan --pattern "*" | xargs redis-cli -h ... TTL
   ```

2. **Reduce TTLs**:
   ```typescript
   // Shorten cache durations
   const TTL_VIRAL_STATS = 60; // Was 120s
   const TTL_USER_PROFILE = 180; // Was 300s
   ```

3. **Flush Low-Priority Keys**:
   ```bash
   # Remove less critical caches
   redis-cli -h ... DEL dashboard:telemetry
   redis-cli -h ... EVAL "return redis.call('del', unpack(redis.call('keys', 'viral:stats:*')))" 0
   ```

4. **Upgrade Upstash Plan** (if needed):
   - Current: Free tier (limited memory)
   - Upgrade: Pro tier (more memory, better performance)

---

### Issue: L1 Cache Not Warming

#### Symptoms
- First request fast, second request slow
- L2 cache working, but L1 not populating
- Inconsistent response times

#### Diagnosis
```typescript
// Check L1 cache implementation in lib/cache.ts
const cached = l1Cache.get(key);
console.log('L1 cached:', !!cached);
```

#### Resolution
1. **Verify L1 Cache Store**:
   ```typescript
   // In getCached() after fetching from L2
   l1Cache.set(key, value); // Ensure this is called
   ```

2. **Check LRU Capacity**:
   ```typescript
   // Increase if needed
   const l1Cache = new LRUCache<string, any>({
     max: 1000, // Increase to 2000 if needed
   });
   ```

3. **Ensure Proper Serialization**:
   ```typescript
   // L1 stores objects directly, no serialization needed
   l1Cache.set(key, data); // data is already an object
   ```

---

### Issue: High Cache Miss Rate

#### Symptoms
- Cache hit rate <50% (target >70%)
- Database load not reducing as expected
- Response times not improving

#### Diagnosis
```typescript
// Log cache hits vs misses
const hitRate = (cacheHits / totalRequests) * 100;
console.log(`Cache Hit Rate: ${hitRate.toFixed(1)}%`);
```

#### Resolution
1. **Increase TTLs**:
   ```typescript
   // Extend cache durations
   const TTL_VIRAL_STATS = 300; // Was 120s
   const TTL_USER_PROFILE = 600; // Was 300s
   ```

2. **Analyze Traffic Patterns**:
   ```bash
   # Check which routes have most traffic
   vercel logs | grep "X-Response-Time"
   ```

3. **Add Cache Warming**:
   ```typescript
   // Pre-populate cache for popular users
   async function warmCache() {
     const popularFids = [3621, 12345, 67890];
     for (const fid of popularFids) {
       await getCached(`user:badges:${fid}`, () => getUserBadges(fid));
     }
   }
   ```

4. **Check Cache Key Consistency**:
   ```typescript
   // Ensure cache keys are consistent
   const cacheKey = `user:badges:${fid}`;
   // NOT: `user:badges:${fid}:${timestamp}` (creates unique keys)
   ```

---

## Emergency Procedures

### Scenario 1: Stale Data Causing Critical Issue

**Symptoms**: Users seeing incorrect data (e.g., wrong badge count, outdated leaderboard)

**Immediate Actions**:
1. **Flush Affected Cache Keys**:
   ```bash
   # Connect to Redis
   redis-cli -h driving-turtle-38422.upstash.io -p 38422 -a AZY...
   
   # Delete affected keys
   DEL user:badges:*
   DEL user:profile:*
   DEL viral:leaderboard:*
   ```

2. **Verify Flushed**:
   ```bash
   # Check key count
   DBSIZE
   # Should be lower than before
   ```

3. **Monitor Requests**:
   ```bash
   # Watch logs for cache misses and rebuilds
   vercel logs --follow | grep "Cache miss"
   ```

4. **Communicate**:
   - Notify team of cache flush
   - Document issue and resolution
   - Update runbook if new pattern discovered

---

### Scenario 2: Cache Causing Performance Degradation

**Symptoms**: Response times increased after cache implementation

**Immediate Actions**:
1. **Disable External Cache Temporarily**:
   ```bash
   # Remove KV environment variables (forces L1 only)
   vercel env rm KV_REST_API_URL production
   vercel env rm KV_REST_API_TOKEN production
   
   # Redeploy
   vercel --prod --force
   ```

2. **Analyze Logs**:
   ```bash
   # Look for Redis timeout errors
   vercel logs | grep "Redis"
   vercel logs | grep "timeout"
   ```

3. **Check Redis Health**:
   ```bash
   # Upstash console → Metrics
   # Look for:
   # - High latency
   # - Connection errors
   # - Memory issues
   ```

4. **Rollback if Needed**:
   ```bash
   # Deploy previous version
   git checkout <previous-commit>
   vercel --prod
   ```

5. **Root Cause Analysis**:
   - Check Upstash status page
   - Review Redis query patterns
   - Analyze cache key distribution
   - Evaluate serialization overhead

---

### Scenario 3: Cache Filling with Junk Data

**Symptoms**: Cache memory growing rapidly, low hit rate, many unique keys

**Immediate Actions**:
1. **Identify Junk Keys**:
   ```bash
   # List all keys
   redis-cli -h ... KEYS "*" | head -100
   
   # Look for patterns:
   # - Timestamp-based keys (BAD)
   # - User-input-based keys (BAD)
   # - Consistent pattern keys (GOOD)
   ```

2. **Flush Junk Keys**:
   ```bash
   # If pattern identified (e.g., timestamped keys)
   redis-cli -h ... --scan --pattern "*:timestamp:*" | xargs redis-cli -h ... DEL
   ```

3. **Fix Cache Key Generation**:
   ```typescript
   // BAD: Includes timestamp
   const cacheKey = `user:badges:${fid}:${Date.now()}`;
   
   // GOOD: Static pattern
   const cacheKey = `user:badges:${fid}`;
   ```

4. **Deploy Fix**:
   ```bash
   git commit -m "fix: cache key generation without timestamp"
   vercel --prod
   ```

5. **Monitor**:
   ```bash
   # Watch key count stabilize
   watch -n 5 'redis-cli -h ... DBSIZE'
   ```

---

## Cache Management Best Practices

### 1. Use Consistent Cache Keys
```typescript
// ✅ GOOD: Consistent pattern
const cacheKey = `user:badges:${fid}`;

// ❌ BAD: Includes timestamp (creates unique keys)
const cacheKey = `user:badges:${fid}:${Date.now()}`;

// ❌ BAD: Includes request-specific data
const cacheKey = `user:badges:${fid}:${req.headers['user-agent']}`;
```

---

### 2. Set Appropriate TTLs
```typescript
// Real-time data: Short TTL
const TTL_TELEMETRY = 45; // 45 seconds

// User-specific data: Medium TTL
const TTL_USER_PROFILE = 300; // 5 minutes

// Static-ish data: Long TTL
const TTL_BADGE_TEMPLATES = 300; // 5 minutes

// Frequently changing: Rely on invalidation
// (No TTL needed if invalidated on every change)
```

---

### 3. Invalidate on Mutations
```typescript
// Always invalidate after data changes
export async function POST(request: Request) {
  const { fid, badgeId } = await request.json();
  
  // 1. Mutate data
  await assignBadge(fid, badgeId);
  
  // 2. Invalidate affected caches
  await invalidateCache(`user:badges:${fid}`);
  await invalidateCache(`user:profile:${fid}`);
  
  // 3. Return success
  return NextResponse.json({ success: true });
}
```

---

### 4. Monitor Cache Performance
```typescript
// Add logging for cache hits/misses
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: { ttl?: number }
): Promise<T> {
  const l1Cached = l1Cache.get(key);
  if (l1Cached) {
    console.log(`[Cache] L1 HIT: ${key}`);
    return l1Cached;
  }
  
  const l2Cached = await redis.get(key);
  if (l2Cached) {
    console.log(`[Cache] L2 HIT: ${key}`);
    l1Cache.set(key, l2Cached);
    return l2Cached;
  }
  
  console.log(`[Cache] MISS: ${key}`);
  const data = await fetchFn();
  
  // Store in both caches
  await redis.set(key, data, { ex: options?.ttl || 120 });
  l1Cache.set(key, data);
  
  return data;
}
```

---

### 5. Document Cache Keys
```typescript
// Add comments documenting cache keys
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');
  
  /**
   * Cache Key: `user:badges:${fid}`
   * TTL: 300s (5 minutes)
   * Invalidated on: Badge assignment, quest completion
   */
  const cacheKey = `user:badges:${fid}`;
  
  return getCached(cacheKey, () => getUserBadges(fid), { ttl: 300 });
}
```

---

## Related Documentation

- **Phase 4 Completion Summary**: `docs/maintenance/NOV 2025/PHASE-4-COMPLETION-SUMMARY.md`
- **Stage 5 Results**: `docs/maintenance/NOV 2025/PHASE-4-STAGE-5-RESULTS.md`
- **Known Issues**: `docs/maintenance/NOV 2025/KNOWN-ISSUES-PHASE4.md`
- **lib/cache.ts**: Cache implementation source code

---

## Support & Contact

For cache-related issues or questions:
1. Check this runbook first
2. Review application logs in Vercel dashboard
3. Check Upstash Redis console for metrics
4. Contact development team if issue persists

---

**Last Updated**: November 18, 2025  
**Version**: 1.0  
**Maintainer**: Development Team  
