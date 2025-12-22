# 🏛️ lib/ Infrastructure - Quick Reference Card

> **⚠️ Print this and tape to your monitor during migration!**

## ✅ ALWAYS USE

```typescript
// Caching
import { getCached, invalidateCache } from '@/lib/cache/server'

// Rate Limiting
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'

// Validation
import { FIDSchema, QuestVerifySchema } from '@/lib/validation/api-schemas'

// Supabase
import { createClient } from '@/lib/supabase/edge'

// Error Handling
import { createErrorResponse } from '@/lib/middleware/error-handler'

// Subsquid
import { getLeaderboardEntry } from '@/lib/subsquid-client'
```

## ❌ NEVER USE

```typescript
// ❌ NO inline caching
const cache = new Map()

// ❌ NO inline rate limiting
const rateLimits = new Map()

// ❌ NO inline Zod schemas
const schema = z.object({ ... })

// ❌ NO direct Supabase imports
import { createClient } from '@supabase/supabase-js'

// ❌ NO direct Subsquid queries
fetch('http://localhost:4350/graphql', ...)

// ❌ NO inline IP extraction
request.headers.get('x-forwarded-for')
```

## 🔍 Pre-Commit Checklist

Before committing ANY API route:

```bash
# Run these checks (all should be 0 results)
grep -n "new Map()" your-route.ts
grep -n "createClient(process.env" your-route.ts
grep -n "fetch.*4350" your-route.ts
grep -n "z.object" your-route.ts
grep -n "x-forwarded-for" your-route.ts
```

## 📦 Standard Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache/server'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { createErrorResponse } from '@/lib/middleware/error-handler'
import { createClient } from '@/lib/supabase/edge'
import { getLeaderboardEntry } from '@/lib/subsquid-client'

export async function GET(request: NextRequest, { params }: any) {
  try {
    // 1. Rate limit
    const ip = getClientIp(request)
    const { success } = await rateLimit(apiLimiter, ip)
    if (!success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

    // 2. Validate input
    const validation = FIDSchema.safeParse(parseInt(params.fid))
    if (!validation.success) return NextResponse.json({ error: 'Invalid FID' }, { status: 400 })
    const fid = validation.data

    // 3. Get cached data
    const data = await getCached(
      'user-stats',         // namespace
      `fid:${fid}`,         // key
      async () => {         // fetcher
        const supabase = createClient(request)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('wallet_address')
          .eq('fid', fid)
          .single()

        const entry = await getLeaderboardEntry(profile.wallet_address)
        return { fid, ...entry }
      },
      { ttl: 60 }           // options
    )

    return NextResponse.json(data)

  } catch (error) {
    return createErrorResponse(error, { context: 'GET /api/users/[fid]/stats' })
  }
}
```

## 🚀 Available Infrastructure

### Cache (`@/lib/cache/server`)
- `getCached(namespace, key, fn, { ttl })` - Multi-tier caching
- `invalidateCache(key)` - Invalidate specific key
- Features: L1 memory → L2 Redis → L3 filesystem, stale-while-revalidate

### Rate Limit (`@/lib/middleware/rate-limit`)
- `apiLimiter` - 60 requests/minute (standard routes)
- `strictLimiter` - 10 requests/minute (write-heavy routes)
- `getClientIp(request)` - Safe IP extraction (handles proxies)
- `rateLimit(limiter, identifier)` - Rate limit check

### Validation (`@/lib/validation/api-schemas`)
- `FIDSchema` - Farcaster ID (positive integer)
- `AddressSchema` - Ethereum address (0x...)
- `CastHashSchema` - Cast hash validation
- `QuestVerifySchema` - Quest verification payload
- `QuestClaimSchema` - Quest claim payload
- `BadgeMintSchema` - Badge minting payload
- `AdminBadgeCreateSchema` - Admin badge creation

### Supabase (`@/lib/supabase/edge`)
- `createClient(request)` - Server-side client with auth
- `getSupabaseServerClient()` - Admin client (bypasses RLS)
- `getSupabaseAdminClient()` - Full admin (service role)

### Subsquid (`@/lib/subsquid-client`)
- `getLeaderboardEntry(address)` - User leaderboard data
- `getRecentActivity(address, limit)` - Activity history
- `getQuestCompletions(address)` - Quest progress
- `getActiveBadgeStakes(address)` - Staking info
- `getReferrerChain(address)` - Referral tree
- ... 24 more functions

### Error Handling (`@/lib/middleware/error-handler`)
- `createErrorResponse(error, context)` - Consistent error format
- Automatic logging, proper status codes, stack traces in dev

## 📊 Migration Phase Checklist

### Phase 1 (2 days) - Fix Broken Routes ✅
- [ ] Fix `app/frame/gm/route.tsx` - Use getGMEvents()
- [ ] Fix `app/api/cron/sync-referrals/route.ts` - Update to user_profiles
- [ ] Fix `app/api/cron/sync-guild-leaderboard/route.ts` - Update to user_profiles

### Phase 2 (1 week) - High Priority Routes
- [ ] 50 user-facing routes (leaderboard, stats, quests, guilds)
- [ ] All routes use lib/ infrastructure (no inline code)
- [ ] Performance: <50ms p95, >80% cache hit rate

### Phase 3 (1 week) - Remaining Routes
- [ ] 70 remaining routes (badges, referrals, admin, analytics)
- [ ] Same infrastructure enforcement

### Phase 4 (3-5 days) - Bot Lib Files
- [ ] 171 lib files updated to use subsquid-client

## 🎯 Success Criteria

- [ ] ✅ All routes use `getCached()` (0 inline Map caches)
- [ ] ✅ All routes use `apiLimiter`/`strictLimiter` (0 inline rate limiters)
- [ ] ✅ All routes import from `@/lib/validation/api-schemas` (0 inline Zod)
- [ ] ✅ All routes use `createClient()` from `@/lib/supabase/edge`
- [ ] ✅ All routes use functions from `@/lib/subsquid-client`
- [ ] ✅ 127/127 routes migrated
- [ ] ✅ 0 broken routes
- [ ] ✅ Performance <50ms p95

---

**Full Documentation**: See `HYBRID-IMPLEMENTATION-COMPLETE-PLAN.md` (1271 lines)  
**Status**: ✅ TRUST OF DOCUMENTATION
