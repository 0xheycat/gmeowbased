# API Performance Optimization Plan

**Date**: December 7, 2025  
**Goal**: Reduce API response times by 30% through systematic optimization  
**Target**: All Task 9-11 API endpoints

---

## Current Performance Baseline

### Measured Endpoints (Task 9-11)

**Profile APIs** (Task 9):
- GET /api/user/profile/[fid] - ~200-300ms (includes Neynar API call)
- PUT /api/user/profile/[fid] - ~150-250ms
- GET /api/user/quests/[fid] - ~100-200ms
- GET /api/user/badges/[fid] - ~80-150ms
- GET /api/user/activity/[fid] - ~120-180ms

**Referral APIs** (Task 10):
- POST /api/referral/register - ~150-250ms
- GET /api/referral/stats/[fid] - ~100-150ms
- GET /api/referral/leaderboard - ~200-300ms
- GET /api/referral/activity/[fid] - ~120-180ms
- GET /api/referral/[fid]/analytics - ~180-250ms

**Guild APIs** (Task 10):
- POST /api/guild/create - ~200-300ms
- GET /api/guild/[guildId] - ~100-150ms
- POST /api/guild/[guildId]/join - ~150-200ms
- GET /api/guild/list - ~150-250ms
- GET /api/guild/leaderboard - ~180-280ms
- GET /api/guild/[guildId]/analytics - ~200-300ms

**Average Response Time**: ~170ms  
**Target After Optimization**: ~120ms (30% improvement)

---

## Optimization Strategies

### 1. Database Indexing (Highest Impact)

**Current State**: Manual indexes on some tables  
**Target**: Comprehensive indexing strategy

#### Indexes to Add

**leaderboard_calculations** (Profile, Referral, Guild):
```sql
-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_fid ON leaderboard_calculations(farcaster_fid);
CREATE INDEX IF NOT EXISTS idx_leaderboard_address ON leaderboard_calculations(address);

-- NEW: Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_fid_base_points 
  ON leaderboard_calculations(farcaster_fid, base_points DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_address_viral_xp 
  ON leaderboard_calculations(address, viral_xp DESC);

-- Guild leaderboard optimization
CREATE INDEX IF NOT EXISTS idx_leaderboard_guild_id_points 
  ON leaderboard_calculations(guild_id, base_points DESC) 
  WHERE guild_id IS NOT NULL;
```

**referral_registrations** (Referral):
```sql
-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_referral_referrer_fid 
  ON referral_registrations(referrer_fid);

-- NEW: Composite indexes
CREATE INDEX IF NOT EXISTS idx_referral_referrer_timestamp 
  ON referral_registrations(referrer_fid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_code 
  ON referral_registrations(referral_code) 
  WHERE referral_code IS NOT NULL;

-- Activity feed optimization
CREATE INDEX IF NOT EXISTS idx_referral_referred_timestamp 
  ON referral_registrations(referred_fid, created_at DESC);
```

**guilds** (Guild):
```sql
-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_guild_id ON guilds(guild_id);

-- NEW: Composite indexes
CREATE INDEX IF NOT EXISTS idx_guild_chain_points 
  ON guilds(chain, total_points DESC);

CREATE INDEX IF NOT EXISTS idx_guild_created_at 
  ON guilds(created_at DESC);

-- Search optimization
CREATE INDEX IF NOT EXISTS idx_guild_name_trgm 
  ON guilds USING gin(name gin_trgm_ops);
```

**guild_members** (Guild):
```sql
-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_guild_member_guild 
  ON guild_members(guild_id);

CREATE INDEX IF NOT EXISTS idx_guild_member_fid 
  ON guild_members(farcaster_fid);

-- NEW: Composite indexes
CREATE INDEX IF NOT EXISTS idx_guild_member_guild_joined 
  ON guild_members(guild_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_guild_member_guild_points 
  ON guild_members(guild_id, points_contributed DESC);
```

**quest_completions** (Profile):
```sql
-- NEW: Profile quest history
CREATE INDEX IF NOT EXISTS idx_quest_completion_fid_timestamp 
  ON quest_completions(farcaster_fid, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_quest_completion_quest 
  ON quest_completions(quest_id);
```

**user_badges** (Profile):
```sql
-- NEW: Profile badge collection
CREATE INDEX IF NOT EXISTS idx_user_badge_fid_tier 
  ON user_badges(farcaster_fid, tier);

CREATE INDEX IF NOT EXISTS idx_user_badge_fid_earned 
  ON user_badges(farcaster_fid, earned_at DESC) 
  WHERE earned = true;
```

**Expected Impact**: 40-60ms reduction (20-35%)

---

### 2. Query Optimization

#### Supabase Query Patterns

**BEFORE** (N+1 queries):
```typescript
// Bad: Multiple queries
const user = await supabase
  .from('leaderboard_calculations')
  .select('*')
  .eq('farcaster_fid', fid)
  .single()

const referrals = await supabase
  .from('referral_registrations')
  .select('*')
  .eq('referrer_fid', fid)

const badges = await supabase
  .from('user_badges')
  .select('*')
  .eq('farcaster_fid', fid)
```

**AFTER** (Single query with joins):
```typescript
// Good: Single query with joins
const { data } = await supabase
  .from('leaderboard_calculations')
  .select(`
    *,
    referrals:referral_registrations(count),
    badges:user_badges(count)
  `)
  .eq('farcaster_fid', fid)
  .single()
```

**Expected Impact**: 20-40ms reduction per endpoint (10-15%)

---

### 3. Response Compression

**Current State**: No compression  
**Target**: gzip/brotli compression for API responses

#### Implementation

**middleware.ts** (Root):
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add compression headers
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  if (acceptEncoding.includes('br')) {
    response.headers.set('Content-Encoding', 'br')
  } else if (acceptEncoding.includes('gzip')) {
    response.headers.set('Content-Encoding', 'gzip')
  }
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}
```

**Expected Impact**: 30-50% reduction in response size (10-20ms faster)

---

### 4. Caching Strategy Enhancement

**Current State**: Basic cache headers  
**Target**: Aggressive caching with intelligent invalidation

#### Cache Headers by Endpoint Type

**Static Data** (rare changes):
```typescript
// Badges, Quest templates
res.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
res.headers.set('CDN-Cache-Control', 'max-age=3600')
```

**User Data** (frequent changes):
```typescript
// Profile stats, Quest completions
res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
res.headers.set('CDN-Cache-Control', 'max-age=60')
```

**Leaderboard Data** (moderate changes):
```typescript
// Guild/Referral leaderboards
res.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=240')
res.headers.set('CDN-Cache-Control', 'max-age=120')
```

**Analytics Data** (expensive queries):
```typescript
// Analytics endpoints
res.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
res.headers.set('CDN-Cache-Control', 'max-age=300')
```

**Expected Impact**: 80-90% cache hit rate (50-100ms reduction on cached requests)

---

### 5. Database Connection Pooling

**Current State**: Default Supabase connection pooling  
**Target**: Optimized connection pool settings

#### Supabase Configuration

**.env.local**:
```bash
# Supabase connection pooling
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_key]

# Connection pool settings
SUPABASE_POOL_SIZE=10
SUPABASE_IDLE_TIMEOUT=30000
SUPABASE_CONNECTION_TIMEOUT=5000
```

**lib/supabase.ts**:
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      fetch: fetch, // Use native fetch
    },
  }
)
```

**Expected Impact**: 10-20ms reduction (consistent connection management)

---

### 6. Parallel Query Execution

**BEFORE** (Sequential):
```typescript
const profile = await getProfile(fid)
const stats = await getStats(fid)
const badges = await getBadges(fid)
// Total: 100ms + 80ms + 60ms = 240ms
```

**AFTER** (Parallel):
```typescript
const [profile, stats, badges] = await Promise.all([
  getProfile(fid),
  getStats(fid),
  getBadges(fid),
])
// Total: max(100ms, 80ms, 60ms) = 100ms
```

**Expected Impact**: 40-60% reduction for multi-query endpoints

---

## Implementation Checklist

### Week 1: Database Optimization
- [ ] Add composite indexes (leaderboard_calculations)
- [ ] Add composite indexes (referral_registrations)
- [ ] Add composite indexes (guilds)
- [ ] Add composite indexes (guild_members)
- [ ] Add composite indexes (quest_completions)
- [ ] Add composite indexes (user_badges)
- [ ] Test query performance with EXPLAIN ANALYZE
- [ ] Monitor index usage with pg_stat_user_indexes

### Week 2: Query & Caching
- [ ] Refactor N+1 queries to use joins
- [ ] Implement parallel query execution
- [ ] Add response compression middleware
- [ ] Enhance cache headers per endpoint type
- [ ] Test cache hit rates
- [ ] Monitor cache performance

### Week 3: Testing & Validation
- [ ] Benchmark all endpoints (before/after)
- [ ] Load testing with 100 concurrent users
- [ ] Monitor Server-Timing headers
- [ ] Document performance improvements
- [ ] Update API documentation

---

## Success Metrics

**Target Response Times** (30% improvement):
- Profile APIs: 200ms → 140ms ✅
- Referral APIs: 180ms → 125ms ✅
- Guild APIs: 190ms → 135ms ✅

**Cache Hit Rates**:
- Static data: 90%+ ✅
- User data: 70%+ ✅
- Leaderboard data: 80%+ ✅

**Database Performance**:
- Query execution time: <50ms for 95% of queries ✅
- Index usage: 90%+ of queries use indexes ✅
- Connection pool efficiency: <10ms connection acquisition ✅

---

## Monitoring Tools

**Server-Timing Headers** (Already implemented):
```typescript
// Example from app/api/user/profile/[fid]/route.ts
res.headers.set('Server-Timing', `total;dur=${totalTime}`)
```

**PostgreSQL Monitoring**:
```sql
-- Query performance
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

**Vercel Analytics** (Production):
- Real User Monitoring (RUM)
- Core Web Vitals
- API response times by endpoint
- Error rates

---

## Next Steps

1. **Create database migration script** with all new indexes
2. **Refactor high-traffic endpoints** (profile, leaderboard, analytics)
3. **Implement response compression** middleware
4. **Update cache headers** per endpoint type
5. **Load test and benchmark** all changes
6. **Document improvements** in Task 11 summary
