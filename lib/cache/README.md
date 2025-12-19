# Redis Caching Layer

**Phase 7 Priority 2: Performance Optimization**

This directory contains the Redis caching implementation to reduce database load and improve API response times.

## Overview

The caching layer provides:
- **15-minute TTL** for leaderboard data
- **5-minute TTL** for user statistics
- **3-minute TTL** for blockchain events
- **Graceful degradation** (works without Redis)
- **Cache invalidation** via webhooks
- **Monitoring endpoints** for cache health

## Performance Targets

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Leaderboard API | 50ms | <10ms | 80% |
| User Stats API | 100ms | <50ms | 50% |
| Events API | 150ms | <30ms | 80% |
| Cache Hit Rate | 0% | 90%+ | New capability |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     API Routes                          │
│  /api/leaderboard-v2  /api/users/[address]  /api/events│
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Cache Layer (Redis)                    │
│  leaderboard-cache.ts  user-cache.ts  events-cache.ts  │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐  ┌─────────────────────┐
│  Redis Cache     │  │   Data Sources      │
│  (15min TTL)     │  │  - Supabase         │
│  localhost:6379  │  │  - Subsquid         │
└──────────────────┘  │  - Blockchain RPC   │
                      └─────────────────────┘
```

## Files

### Core Infrastructure

- **`redis-client.ts`** - Redis connection management
  - Singleton pattern with connection pooling
  - Exponential backoff retry strategy
  - Event handlers for connect/error/close
  - Graceful shutdown on SIGTERM/SIGINT
  - Helper functions: `checkRedisHealth()`, `getRedisInfo()`, `clearAllCache()`

### Cache Implementations

- **`leaderboard-cache.ts`** - Leaderboard queries (15min TTL)
  - `getCachedLeaderboard(limit)` - Top N users
  - `invalidateLeaderboardCache()` - Clear on new GMs
  - `warmLeaderboardCache(limit)` - Pre-populate cache
  - `getLeaderboardCacheStatus()` - Check TTL remaining

- **`user-cache.ts`** - User statistics (5min TTL)
  - `getCachedUserStats(walletAddress)` - User profile + stats
  - `invalidateUserCache(walletAddress)` - Clear on user events
  - `invalidateMultipleUserCaches(addresses[])` - Batch invalidation
  - `warmUserStatsCache(walletAddress)` - Pre-populate cache
  - `getUserStatsCacheStatus(walletAddress)` - Check TTL remaining

- **`events-cache.ts`** - Blockchain events (3min TTL)
  - `getCachedRecentGMEvents(limit)` - Recent GM activity
  - `getCachedRankEvents(address, limit)` - User rank changes
  - `getCachedTipEvents(address, limit)` - User tip history
  - `invalidateGMEventsCache()` - Clear on new blockchain events
  - `invalidateUserEventsCache(address)` - Clear user-specific events

## Setup

### Local Development

1. **Start Redis** (Docker Compose):
   ```bash
   cd gmeow-indexer
   docker-compose up redis -d
   ```

2. **Configure Environment** (`.env.local`):
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   ```

3. **Verify Redis is running**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Production Deployment

1. **Choose Redis Provider**:
   - **Upstash** (recommended for serverless): https://upstash.com
   - **Redis Cloud**: https://redis.com/try-free
   - **AWS ElastiCache**: For existing AWS infrastructure
   - **Self-hosted**: redis:7-alpine on EC2/Kubernetes

2. **Update Environment Variables**:
   ```env
   REDIS_HOST=redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your-redis-password
   REDIS_DB=0
   ```

3. **Test Connection**:
   ```bash
   curl http://localhost:3000/api/admin/cache-stats \
     -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
   ```

## Usage

### API Integration

```typescript
// Before (direct query)
import { getLeaderboard } from '@/lib/leaderboard/leaderboard-scorer'

export async function GET() {
  const data = await getLeaderboard({ limit: 100 })
  return NextResponse.json({ data })
}

// After (with caching)
import { getCachedLeaderboard } from '@/lib/cache/leaderboard-cache'

export async function GET() {
  const data = await getCachedLeaderboard(100) // Cached!
  return NextResponse.json({ data })
}
```

### Cache Invalidation

```typescript
// After new GM event
import { invalidateLeaderboardCache } from '@/lib/cache/leaderboard-cache'
import { invalidateUserCache } from '@/lib/cache/user-cache'
import { invalidateGMEventsCache } from '@/lib/cache/events-cache'

await invalidateLeaderboardCache() // Clear leaderboard
await invalidateUserCache(userAddress) // Clear user stats
await invalidateGMEventsCache() // Clear GM events
```

### Cache Warming

```typescript
// Pre-populate caches (e.g., cron job)
import { warmLeaderboardCache } from '@/lib/cache/leaderboard-cache'
import { warmUserStatsCache } from '@/lib/cache/user-cache'

await warmLeaderboardCache(100) // Top 100 users
await warmUserStatsCache('0x1234...') // Specific user
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/admin/cache-stats \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "redis": {
      "connected": true,
      "uptime": 86400,
      "version": "7.2.4"
    },
    "memory": {
      "used": "2.45M",
      "peak": "3.12M",
      "fragmentation": 1.03
    },
    "stats": {
      "totalKeys": 847,
      "hitRate": 94.2,
      "evictedKeys": 12
    },
    "keys": {
      "leaderboard": 15,
      "userStats": 742,
      "events": 90
    }
  }
}
```

### Clear Cache
```bash
# Clear all caches (dangerous!)
curl -X DELETE "http://localhost:3000/api/admin/cache-stats?all=true" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"

# Clear specific pattern
curl -X DELETE "http://localhost:3000/api/admin/cache-stats?pattern=leaderboard:*" \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY"
```

## Cache Keys Format

```
leaderboard:v2:{period}:{page}:{pageSize}:{search}:{orderBy}
user:stats:{walletAddress}
events:gm:{limit}
events:rank:{walletAddress}:{limit}
events:tips:{walletAddress}:{limit}
```

## Graceful Degradation

All cache functions include fallback logic:

```typescript
try {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached) // Cache hit
  
  const data = await fetchFromDatabase() // Cache miss
  await redis.setex(key, ttl, JSON.stringify(data))
  return data
  
} catch (error) {
  console.error('[Cache] Error:', error)
  return await fetchFromDatabase() // Fallback on error
}
```

**Redis unavailable?** → App continues working, just slower (direct DB queries)

## Best Practices

### DO ✅
- Use cache for high-traffic read-heavy endpoints
- Invalidate cache on data mutations
- Set appropriate TTLs (shorter for frequently changing data)
- Monitor cache hit rates
- Pre-warm cache for predictable queries
- Handle Redis errors gracefully

### DON'T ❌
- Cache user-specific sensitive data without proper isolation
- Set TTLs too long (stale data)
- Set TTLs too short (excessive DB load)
- Ignore cache invalidation (serve stale data)
- Store large objects (>1MB) in cache
- Use cache for write-heavy operations

## Troubleshooting

### Redis Connection Failed
```
Error: ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
1. Check Redis is running: `docker-compose ps redis`
2. Verify Redis port: `redis-cli -h localhost -p 6379 ping`
3. Check firewall rules (production)

### Cache Always Missing
```
[Cache] Leaderboard MISS
[Cache] Leaderboard MISS
```

**Solution:**
1. Check Redis memory: `redis-cli INFO memory`
2. Check eviction policy: Should be `allkeys-lru`
3. Increase memory limit if needed: `maxmemory 512mb`

### High Memory Usage
```
used_memory: 512M
maxmemory_policy: allkeys-lru
evicted_keys: 10000
```

**Solution:**
1. Increase Redis memory limit (docker-compose.yml)
2. Reduce TTLs for less critical data
3. Review cache key patterns (too many variations?)

## Performance Metrics

Track these metrics in production:

- **Cache Hit Rate**: `keyspace_hits / (keyspace_hits + keyspace_misses) * 100`
- **Memory Usage**: `used_memory` / `maxmemory`
- **Eviction Rate**: `evicted_keys` per minute
- **Connection Errors**: `rejected_connections`, `total_connections_received`
- **Response Time**: P50, P95, P99 with/without cache

## Roadmap

### Phase 7 Priority 2 (Current)
- [x] Redis infrastructure setup
- [x] Leaderboard caching (15min TTL)
- [x] User stats caching (5min TTL)
- [x] Events caching (3min TTL)
- [x] API route integration
- [x] Cache monitoring endpoint

### Phase 7 Priority 3 (Next)
- [ ] Cache warming cron jobs
- [ ] Cache invalidation webhooks
- [ ] Performance metrics dashboard
- [ ] Redis Cluster setup (production)

### Future Enhancements
- [ ] Redis Streams for real-time updates
- [ ] Cache preloading based on access patterns
- [ ] A/B testing different TTLs
- [ ] Cache compression for large objects
- [ ] Multi-region cache replication

## References

- **Phase 7 Plan**: `PHASE-7-PERFORMANCE-OPTIMIZATION-PLAN.md`
- **Redis Docs**: https://redis.io/docs/
- **ioredis Docs**: https://github.com/redis/ioredis
- **Docker Compose**: `gmeow-indexer/docker-compose.yml`
- **Monitoring API**: `app/api/admin/cache-stats/route.ts`

---

**Created**: December 19, 2025  
**Status**: ✅ Phase 7 Priority 2 COMPLETE  
**Target**: 90%+ cache hit rate, <10ms API responses
