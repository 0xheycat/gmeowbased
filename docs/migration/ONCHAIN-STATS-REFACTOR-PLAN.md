# 🔥 OnchainStats Refactor Plan - Stop RPC Bankruptcy

**Created**: December 6, 2025  
**Priority**: 🚨 CRITICAL - Cost Reduction ($50/month → <$5/month)  
**Goal**: Professional data fetching with multi-chain support  
**Estimated Effort**: 6-8 hours  
**Status**: Planning Complete ✅

---

## 📊 Current Problem Analysis

### Cost Impact
- **Monthly Cost**: $50 (last month)
- **User Visits**: ~50-100 unique users
- **Cost per User**: $0.50-$1.00 (UNSUSTAINABLE)
- **Root Cause**: Uncontrolled RPC calls directly from component

> **🔬 Research Update**: See `ONCHAIN-DATA-RESEARCH.md` for deep analysis of how Rainbow, Zerion, DeBank, Etherscan, Uniswap, and OpenSea fetch onchain data WITHOUT RPC spam. **Key finding**: Use Etherscan/Basescan APIs (FREE) instead of RPC calls = **$0/month cost**.

### Technical Issues Identified

#### 1. **Direct RPC Calls in Component** ❌
```tsx
// Current broken pattern in OnchainStats.tsx line 392-401
const client = createPublicClient({ transport: http(chainCfg.rpc) })
const [nonce, bal] = await Promise.all([
  rpcTimeout(client.getTransactionCount({ address: walletAddress }), 0),
  rpcTimeout(client.getBalance({ address: walletAddress }), 0n),
])
```
**Problems**:
- No request deduplication (10 users = 10 RPC calls)
- No rate limiting
- Every chain switch = new RPC call
- Component re-renders trigger refetch

#### 2. **Cache Implementation is Insufficient** ⚠️
```tsx
// Line 377: Cache exists but easily bypassed
const cached = chainStateCache.get(cacheKey) as CachedStats | null
if (!force && cached && Date.now() - cached.fetchedAt < STATS_CACHE_TTL_MS) {
  // Only 3 minutes TTL, too short!
}
```
**Problems**:
- 3 minute TTL too short for stats data
- No global request deduplication
- Each component instance has separate cache logic

#### 3. **Multiple Etherscan API Calls** ❌
```tsx
// Line 438-464: Loops making 100+ API calls
for (let pages = 0; pages < 100; pages++) {
  const url = `${ES_V2}?chainid=${chainCfg.chainId}&module=account&action=txlist...`
  const j = await fetchJson(url, 12000)
  // NO RATE LIMITING, NO BACKOFF
}
```
**Problems**:
- Up to 100 sequential API calls per user
- No exponential backoff
- No circuit breaker pattern

#### 4. **useEffect Dependencies Trigger Spam** ❌
```tsx
// Line 735-737: Refetch on every address/chainKey/chainCfg change
useEffect(() => {
  void load()
}, [load]) // load depends on address, chainCfg, chainKey
```
**Problems**:
- Chain icon click = refetch
- Wallet reconnect = refetch
- Component re-mount = refetch

---

## 🎯 Solution Architecture

### Professional Pattern Selection

Based on **TEMPLATE-SELECTION.md** audit, we'll use:

#### Template Choice Matrix
| Pattern | Template | Files | Adaptation | Reason |
|---------|----------|-------|------------|--------|
| **Data Fetching Hook** | music/hooks/useDataFetch | N/A | Custom | Need SWR-like behavior |
| **Loading States** | music/ui/loading/skeleton | 1 | 20% | Professional loading UI |
| **Error States** | trezoadmin-41/UIElements/ErrorBoundary | 1 | 30% | Graceful error handling |
| **Stats Card Layout** | trezoadmin-41/Dashboard/Finance/Cards | 3 | 35% | Analytics card patterns |
| **Chain Selector** | gmeowbased0.6 (keep existing) | 1 | 0% | Already works well |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ OnchainStatsV2 Component (UI Only)                         │
│ - Chain selector (keep current logic)                      │
│ - Display stats cards (trezoadmin-41 patterns)             │
│ - Loading states (music templates)                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ useOnchainStats Hook (Professional Pattern)                │
│ - SWR-like caching with stale-while-revalidate             │
│ - Request deduplication (1 req for 100 users)              │
│ - Automatic revalidation (15 min intervals)                │
│ - Error retry with exponential backoff                     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/onchain-stats/[chain] API Route                       │
│ - Server-side caching (Redis-ready)                        │
│ - Rate limiting (10 req/min per address)                   │
│ - Request batching (combine RPC calls)                     │
│ - Cost tracking (log RPC usage)                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ RPC Provider (Alchemy/Public)                              │
│ - Only called via API route                                │
│ - Automatic fallback to public RPCs                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Implementation Plan

### Phase 1: API Route Foundation (2 hours)

#### 1.1 Create API Route Structure
**File**: `app/api/onchain-stats/[chain]/route.ts`

**Features**:
- ✅ Chain-specific endpoints: `/api/onchain-stats/base`, `/api/onchain-stats/ethereum`
- ✅ Server-side caching (Next.js Cache API, Redis-ready)
- ✅ Rate limiting per address (10 requests/minute)
- ✅ Request deduplication (singleton pattern)
- ✅ Error handling with retry logic
- ✅ Cost tracking (log RPC call counts)

**Cache Strategy**:
```typescript
// Server-side cache (shared across all users)
const CACHE_CONFIG = {
  // Basic stats (balance, nonce) - update frequently
  basic: { ttl: 5 * 60 * 1000, stale: 2 * 60 * 1000 }, // 5min fresh, 2min stale
  
  // Historical data (contracts, first tx) - rarely changes
  historical: { ttl: 60 * 60 * 1000, stale: 30 * 60 * 1000 }, // 1hr fresh, 30min stale
  
  // External scores (Talent, Neynar) - update daily
  scores: { ttl: 24 * 60 * 60 * 1000, stale: 12 * 60 * 60 * 1000 }, // 24hr fresh, 12hr stale
}
```

**Rate Limiting**:
```typescript
// In-memory rate limiter (upgrade to Redis for multi-instance)
const rateLimiter = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  keyGenerator: (address: string, chain: string) => `${address}:${chain}`,
}
```

#### 1.2 RPC Call Optimization
**File**: `lib/rpc/optimized-client.ts`

**UPDATED STRATEGY** (Based on industry research):
- ✅ **PRIMARY: Use Etherscan/Basescan API** (FREE, 432k calls/day)
- ✅ **SECONDARY: Use public RPCs** (base.org, llamarpc) - only for latest balance
- ✅ **LAST RESORT: Paid RPCs** (Alchemy) - only if free options exhausted
- ✅ Circuit breaker pattern (pause after 3 failures)
- ✅ Request timeout (5 seconds max)
- ✅ Zero-cost tracking per chain

**Example - Zero RPC Calls**:
```typescript
// ❌ OLD: Direct RPC calls (EXPENSIVE)
const nonce = await client.getTransactionCount({ address })
const balance = await client.getBalance({ address })
const deployments = await loopThroughBlocks(...) // 100+ RPC calls

// ✅ NEW: Etherscan API (FREE)
const etherscan = new EtherscanClient('base')
const [nonce, balance, deployments] = await Promise.all([
  etherscan.getTransactionCount(address),    // 0 RPC calls (Etherscan API)
  etherscan.getAccountBalance(address),      // 0 RPC calls (Etherscan API)
  etherscan.getContractDeployments(address), // 0 RPC calls (Etherscan API)
])
// Total RPC calls: 0
// Total API calls: 3 (all FREE, rate limit: 5/sec = 432k/day)
```

**Data Source Priority** (Zero-Cost First):
```typescript
const DATA_SOURCE_PRIORITY = {
  balance: ['cache', 'etherscan-api', 'public-rpc', 'paid-rpc'],
  nonce: ['cache', 'etherscan-api', 'public-rpc'],
  contractDeployments: ['cache', 'etherscan-api'], // RPC not viable (would need 100+ calls)
  firstLastTx: ['cache', 'etherscan-api'],         // RPC not viable (would need 50+ calls)
  txVolume: ['cache', 'etherscan-api'],            // RPC not viable (would need 100+ calls)
}
```

**Free Tier Limits**:
- Etherscan API: 5 calls/sec = 432,000 calls/day (FREE)
- Public RPCs: Unlimited (throttled, unreliable)
- Alchemy: 300M compute units/month (backup only)

See `ONCHAIN-DATA-RESEARCH.md` for full analysis.

---

### Phase 2: Professional Data Fetching Hook (2 hours)

#### 2.1 Create useOnchainStats Hook
**File**: `hooks/useOnchainStats.ts` (REPLACE existing)

**Pattern**: SWR (stale-while-revalidate) inspired by `useSWR` and `react-query`

**Features**:
- ✅ Automatic caching (client-side + server-side)
- ✅ Request deduplication (100 users = 1 API call)
- ✅ Background revalidation (update stale data)
- ✅ Error retry with exponential backoff
- ✅ Focus revalidation (refetch on window focus)
- ✅ Optimistic updates (instant UI feedback)

**API Design**:
```typescript
const {
  data,           // OnchainStatsData | null
  loading,        // boolean (first load)
  validating,     // boolean (background refetch)
  error,          // Error | null
  mutate,         // (data) => void (manual update)
  revalidate,     // () => void (force refresh)
} = useOnchainStats(address, chainKey, {
  refreshInterval: 15 * 60 * 1000, // 15 min auto-refresh
  revalidateOnFocus: false,        // Don't refetch on tab focus
  dedupingInterval: 5000,          // 5 sec dedup window
  fallbackData: cachedStats,       // Show stale data immediately
})
```

**Request Deduplication Logic**:
```typescript
// Global request tracker
const ongoingRequests = new Map<string, Promise<OnchainStatsData>>()

function fetchStats(address: string, chain: string) {
  const key = `${address}:${chain}`
  
  // Return existing promise if request is ongoing
  if (ongoingRequests.has(key)) {
    return ongoingRequests.get(key)!
  }
  
  // Create new request
  const promise = fetch(`/api/onchain-stats/${chain}?address=${address}`)
    .then(res => res.json())
    .finally(() => ongoingRequests.delete(key))
  
  ongoingRequests.set(key, promise)
  return promise
}
```

#### 2.2 Cache Strategy
**File**: `lib/cache/onchain-stats-cache.ts`

**Multi-Layer Caching**:
```typescript
// Layer 1: Memory cache (instant, same session)
const memoryCache = new Map<string, CachedStats>()

// Layer 2: IndexedDB cache (persistent, cross-session)
const idbCache = new IDBCache('onchain-stats', 'stats-v1')

// Layer 3: Server cache (shared, Redis-ready)
const serverCache = new ServerCache('/api/onchain-stats')

// Cache priority: Memory → IndexedDB → Server → RPC
async function getCachedStats(address: string, chain: string) {
  // 1. Check memory (fastest)
  const memory = memoryCache.get(`${address}:${chain}`)
  if (memory && !isStale(memory)) return memory.data
  
  // 2. Check IndexedDB (fast)
  const idb = await idbCache.get(`${address}:${chain}`)
  if (idb && !isStale(idb)) {
    memoryCache.set(`${address}:${chain}`, idb) // Populate memory
    return idb.data
  }
  
  // 3. Check server (API route has its own cache)
  const server = await fetchFromServer(address, chain)
  return server
}
```

---

### Phase 3: Component Refactor with Template Patterns (2 hours)

#### 3.1 Create OnchainStatsV2 Component
**File**: `components/OnchainStatsV2.tsx` (NEW)

**Template Usage**:
- **Layout**: trezoadmin-41 Dashboard analytics cards (35% adaptation)
- **Loading States**: music/ui/loading/skeleton (20% adaptation)
- **Error States**: trezoadmin-41/UIElements/ErrorBoundary (30% adaptation)
- **Chain Selector**: Keep existing from gmeowbased0.6 (0% adaptation) ✅

**Key Changes**:
```tsx
// ❌ OLD: Direct RPC calls in component
const load = useCallback(async () => {
  const client = createPublicClient({ transport: http(chainCfg.rpc) })
  const nonce = await client.getTransactionCount({ address })
  // ... 500 lines of RPC logic ...
}, [address, chainCfg])

// ✅ NEW: Clean hook-based pattern
const { data, loading, error, revalidate } = useOnchainStats(address, chainKey)

// Chain switch only updates state, hook handles fetching
const handleChainSwitch = (newChain: ChainKey) => {
  setChainKey(newChain) // Hook auto-fetches via dependency
}
```

**Component Structure**:
```tsx
export function OnchainStatsV2({ onLoadingChange }: Props) {
  const { address } = useAccount()
  const [chainKey, setChainKey] = useState<ChainKey>('base')
  
  // Professional data fetching (replaces 500 lines of RPC code)
  const { data, loading, validating, error, revalidate } = useOnchainStats(
    address,
    chainKey,
    { refreshInterval: 15 * 60 * 1000 } // Auto-refresh every 15 min
  )
  
  // Keep existing chain selector logic (works well!)
  const chainCfg = CHAINS[chainKey]
  
  return (
    <div>
      {/* Chain Selector - Keep existing UI */}
      <ChainSelector
        chains={Object.values(CHAINS)}
        selected={chainKey}
        onChange={setChainKey} // Auto-triggers fetch via hook
      />
      
      {/* Stats Display - Use template patterns */}
      {loading ? (
        <StatsCardsSkeleton /> // music template pattern
      ) : error ? (
        <ErrorState error={error} onRetry={revalidate} /> // trezoadmin pattern
      ) : (
        <StatsCards data={data} validating={validating} /> // trezoadmin pattern
      )}
    </div>
  )
}
```

#### 3.2 Template-Based Components

**File**: `components/onchain-stats/StatsCards.tsx`  
**Source**: `planning/template/trezoadmin-41/Dashboard/Finance/Cards/RevenueCard.tsx`  
**Adaptation**: 35%

**Changes**:
- Convert MUI components → Tailwind classes
- Replace revenue data → onchain stats data
- Add gradient styling from gmeowbased0.6
- Keep responsive grid layout from template

**File**: `components/onchain-stats/StatsCardsSkeleton.tsx`  
**Source**: `planning/template/music/ui/loading/skeleton.tsx`  
**Adaptation**: 20%

**Changes**:
- Match StatsCards grid layout
- Add pulse animation
- Tailwind skeleton classes

**File**: `components/onchain-stats/ErrorState.tsx`  
**Source**: `planning/template/trezoadmin-41/UIElements/Alert.tsx`  
**Adaptation**: 30%

**Changes**:
- Convert Alert component → custom error UI
- Add retry button
- Match app theme colors

---

### Phase 4: Rate Limiting & Cost Monitoring (1 hour)

#### 4.1 Rate Limiter Implementation
**File**: `lib/rate-limiter.ts`

**Features**:
- ✅ Per-address rate limiting (10 req/min)
- ✅ Per-IP rate limiting (100 req/hour) for unauthenticated
- ✅ Sliding window algorithm
- ✅ Redis-ready (upgrade from in-memory)

**Example**:
```typescript
import { RateLimiter } from '@/lib/rate-limiter'

const limiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'onchain-stats',
})

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  
  // Check rate limit
  const { allowed, remaining, reset } = await limiter.check(address)
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', remaining: 0, reset },
      { status: 429 }
    )
  }
  
  // ... fetch stats ...
}
```

#### 4.2 Cost Monitoring Dashboard
**File**: `components/admin/RpcCostMonitor.tsx` (NEW)

**Features**:
- ✅ Real-time RPC call tracking
- ✅ Cost per chain breakdown
- ✅ Top users by RPC usage
- ✅ Monthly cost projection
- ✅ Alert when cost > $10/day

**Metrics**:
```typescript
type RpcMetrics = {
  totalCalls: number
  callsByChain: Record<ChainKey, number>
  estimatedCost: number // Based on Alchemy pricing
  topUsers: Array<{ address: string; calls: number }>
  timeRange: '1h' | '24h' | '7d' | '30d'
}
```

---

### Phase 5: Migration Strategy (1 hour)

#### 5.1 Feature Flag Rollout
**File**: `config/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  useOnchainStatsV2: process.env.NEXT_PUBLIC_USE_STATS_V2 === 'true', // Default: false
}
```

**Rollout Plan**:
1. **Week 1**: Deploy with `useOnchainStatsV2=false` (monitoring only)
2. **Week 2**: Enable for 10% of users (A/B test)
3. **Week 3**: Enable for 50% of users
4. **Week 4**: Enable for 100% of users
5. **Week 5**: Remove old component, cleanup

#### 5.2 A/B Test Comparison
**Metrics to Track**:
- RPC calls per user (target: 50% reduction)
- API response time (target: <500ms p95)
- Cache hit rate (target: >80%)
- User experience (loading states, errors)
- Monthly cost (target: <$5)

---

## 📊 Expected Improvements

### Cost Reduction (ZERO-COST ARCHITECTURE)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Monthly Cost** | $50 | **$0** | **100% reduction** 🎉 |
| **RPC Calls/User** | ~500-1000 | **0** | **100% elimination** |
| **API Calls/User** | ~0 | ~5-10 (Etherscan FREE) | Acceptable |
| **Cache Hit Rate** | ~30% | >80% | **2.6x improvement** |
| **API Response Time** | 2-5s | <500ms | **4-10x faster** |

### Technical Improvements
- ✅ **ZERO RPC calls** (Etherscan API replaces all RPC operations)
- ✅ Request deduplication (100 users = 1 Etherscan API call)
- ✅ Server-side caching (shared across users)
- ✅ Rate limiting (prevent FREE tier exhaustion)
- ✅ Circuit breaker (graceful degradation)
- ✅ Automatic retries (better reliability)
- ✅ Stale-while-revalidate (instant UI)
- ✅ Cost monitoring (stay within FREE tiers)

### Data Source Strategy
**OLD (Expensive)**:
```
User → Component → RPC (Alchemy) → $50/month
```

**NEW (Free)**:
```
User → Component → Hook → API Route → Etherscan API (FREE) → $0/month
                                    ↓ (fallback only)
                                    Public RPC (FREE) → $0/month
```

### Why Zero Cost is Achievable

**Etherscan/Basescan FREE Tier**:
- 5 calls/second = 432,000 calls/day
- Our usage: ~100 users × 10 calls = 1,000 calls/day
- **Headroom**: 431,000 calls/day (99.8% unused)
- **Cost**: $0 forever

**Data Coverage**:
- ✅ Balance (Etherscan API)
- ✅ Nonce/TX count (Etherscan API)
- ✅ Contract deployments (Etherscan API)
- ✅ First/last transaction (Etherscan API)
- ✅ Transaction volume (Etherscan API)
- ✅ External scores (Talent/Neynar APIs, cached 24h)

**RPC Usage**: 0 calls (eliminated entirely)

---

## 🎨 Template Pattern Summary

### Components from Templates

| Component | Template Source | Adaptation | Priority |
|-----------|----------------|------------|----------|
| **StatsCards** | trezoadmin-41/Dashboard/Finance/Cards | 35% | ⭐⭐⭐⭐⭐ |
| **StatsCardsSkeleton** | music/ui/loading/skeleton | 20% | ⭐⭐⭐⭐ |
| **ErrorState** | trezoadmin-41/UIElements/Alert | 30% | ⭐⭐⭐⭐ |
| **ChainSelector** | gmeowbased0.6 (keep existing) | 0% | ⭐⭐⭐⭐⭐ |

### Professional Patterns Applied

1. **SWR Pattern** (stale-while-revalidate)
   - Inspiration: `useSWR` library by Vercel
   - Used by: Next.js docs, Vercel dashboard, 1000+ production apps
   - Adaptation: Custom implementation for onchain data

2. **Circuit Breaker Pattern**
   - Used by: Netflix, AWS, major microservices
   - Prevents cascade failures
   - Graceful degradation

3. **Request Deduplication**
   - Used by: Apollo Client, React Query, SWR
   - Prevents duplicate API calls
   - Critical for multi-user apps

4. **Multi-Layer Caching**
   - Used by: Google, Facebook, Twitter
   - Memory → IndexedDB → Server → RPC
   - Optimizes for speed + cost

---

## 🚀 Implementation Checklist

### Phase 1: API Route (2 hours)
- [ ] Create `/api/onchain-stats/[chain]/route.ts`
- [ ] Implement server-side caching (15min TTL for balance, permanent for contracts)
- [ ] Add rate limiting logic (10 req/min per user, 4 req/sec for Etherscan)
- [ ] Create `lib/onchain-stats/etherscan-client.ts` (PRIMARY data source)
- [ ] Create `lib/onchain-stats/public-rpc-client.ts` (FALLBACK only)
- [ ] Create `lib/onchain-stats/data-source-router.ts` (smart fallback logic)
- [ ] Implement circuit breaker (pause after 3 Etherscan failures)
- [ ] Add usage tracking logs (monitor FREE tier limits)

### Phase 2: Hook (2 hours)
- [ ] Refactor `hooks/useOnchainStats.ts`
- [ ] Add SWR-like behavior (stale-while-revalidate)
- [ ] Implement request deduplication (global promise cache)
- [ ] Add background revalidation (15 min interval)
- [ ] Create `lib/cache/onchain-stats-cache.ts`
- [ ] Implement multi-layer cache (Memory → IndexedDB → Server)
- [ ] Add cache invalidation logic (different TTLs per data type)

### Phase 3: Component (2 hours)
- [ ] Create `components/OnchainStatsV2.tsx`
- [ ] Copy StatsCards from trezoadmin-41 template
- [ ] Adapt 35% (MUI → Tailwind)
- [ ] Copy skeleton from music template
- [ ] Adapt 20% (match layout)
- [ ] Copy error state from trezoadmin-41
- [ ] Adapt 30% (custom error UI)
- [ ] Keep existing chain selector (0% change) ✅
- [ ] Test chain switching + auto-fetch
- [ ] Verify ZERO RPC calls (DevTools Network tab)

### Phase 4: Monitoring (1 hour)
- [ ] Create `lib/rate-limiter.ts` (protect Etherscan FREE tier)
- [ ] Test rate limiting (10 req/min per user, 4 req/sec Etherscan)
- [ ] Create `components/admin/ApiUsageMonitor.tsx` (track FREE tier usage)
- [ ] Add real-time metrics (Etherscan API calls, cache hit rate)
- [ ] Set up alerts (>50% of FREE tier = warning)

### Phase 5: Migration (1 hour)
- [ ] Add feature flag (`NEXT_PUBLIC_USE_STATS_V2`)
- [ ] Deploy with flag=false (monitoring only)
- [ ] Enable for 10% users (A/B test)
- [ ] Monitor metrics (verify $0 cost)
- [ ] Full rollout (100% users)
- [ ] Remove old component
- [ ] Document zero-cost achievement 🎉

---

## 🔧 Configuration Changes

### Environment Variables
```bash
# Add to .env.local
NEXT_PUBLIC_USE_STATS_V2=false # Feature flag
ONCHAIN_STATS_CACHE_TTL=900000 # 15 min cache
ONCHAIN_STATS_RATE_LIMIT=10 # 10 req/min
RPC_CIRCUIT_BREAKER_THRESHOLD=5 # Pause after 5 failures
```

### Next.js Config
```javascript
// next.config.js
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['viem'], // For server-side RPC
  },
  env: {
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
  },
}
```

---

## 📈 Success Metrics

### Week 1 Targets (Monitoring Phase)
- [ ] API route deployed with Etherscan client
- [ ] Usage tracking dashboard live (monitor FREE tier)
- [ ] Baseline metrics captured (verify 0 RPC calls)

### Week 2 Targets (10% Rollout)
- [ ] 80%+ cache hit rate
- [ ] <500ms API response time
- [ ] Zero Etherscan rate limit violations
- [ ] **ZERO RPC calls confirmed** (cost = $0)
- [ ] No increase in errors

### Week 3 Targets (50% Rollout)
- [ ] **100% cost reduction confirmed** ($0 spend)
- [ ] Positive user feedback (no performance issues)
- [ ] No FREE tier limit concerns (<10% usage)
- [ ] No performance regressions

### Week 4 Targets (100% Rollout)
- [ ] **100% cost reduction** ($50 → $0) 🎉
- [ ] **100% RPC call elimination** (0 calls)
- [ ] Etherscan FREE tier usage: <1% (safe margin)
- [ ] Old component deprecated
- [ ] Document success story

---

## 🎯 Key Takeaways

### What We're Keeping ✅
1. **Chain selector UI** - Works great, no changes needed
2. **Chain switching logic** - Auto-fetch on switch is good UX
3. **Stats display layout** - Just upgrading to template patterns

### What We're Fixing 🔧
1. **RPC calls** - Replace with FREE Etherscan API (zero cost)
2. **Caching** - Multi-layer professional caching (permanent cache for contracts)
3. **Request handling** - SWR pattern with deduplication
4. **Cost tracking** - Monitor FREE tier limits (prevent future issues)

### Professional Patterns Used 🎓
1. **SWR (stale-while-revalidate)** - Industry standard data fetching
2. **Request Deduplication** - Used by React Query, Apollo Client
3. **Circuit Breaker** - Microservices best practice
4. **Multi-Layer Caching** - Performance optimization pattern
5. **Rate Limiting** - API protection pattern
6. **Zero-Cost Architecture** - Etherscan API priority (Rainbow, Zerion strategy)

### Industry Research Applied 🔬
**Learned from**: Rainbow, Zerion, DeBank, Etherscan, Uniswap, OpenSea

**Key Insights**:
- ✅ NEVER use RPC for historical data (use block explorer APIs)
- ✅ Etherscan FREE tier: 432k calls/day (more than enough)
- ✅ Cache aggressively (contract deployments = permanent)
- ✅ Request deduplication critical (100 users = 1 API call)
- ✅ Public RPCs = backup only (unreliable for primary)

See `ONCHAIN-DATA-RESEARCH.md` for full analysis.

### Template Adaptations 🎨
- **trezoadmin-41**: Analytics cards (35% adaptation)
- **music**: Loading skeletons (20% adaptation)
- **trezoadmin-41**: Error states (30% adaptation)
- **gmeowbased0.6**: Chain selector (0% - keep as is) ✅

---

**Next Steps**: Review this plan + `ONCHAIN-DATA-RESEARCH.md`, then proceed with Phase 1 implementation.

**Estimated Total Time**: 6-8 hours  
**Expected Cost Savings**: **$600/year** ($50/month × 12 → **$0**)  
**ROI**: Infinite (one-time 8hr investment → $0 ongoing cost forever)

---

**Status**: ✅ Plan Complete + Research Complete  
**Research**: See `ONCHAIN-DATA-RESEARCH.md` (industry analysis)  
**Architecture**: Zero-cost (Etherscan API + public RPCs)  
**Approval Required**: Yes (review zero-cost strategy)  
**Priority**: 🚨 CRITICAL (cost elimination opportunity)
