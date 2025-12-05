# 🚨 API Security Strategy - DEFERRED TO API CLEANUP PHASE

**Date**: December 4, 2025  
**Status**: 🟡 DOCUMENTED - Will implement during API cleanup phase (after core features rebuilt)  
**Priority**: HIGH but deferred - Focus on rebuilding features first (Leaderboard 95%, Dashboard 70%, Quest 97%)  
**Context**: Pre-build stage with ~60 APIs, old foundation broken, need to rebuild features before securing APIs

---

## ⚠️ PROBLEM IDENTIFIED (DEFERRED)

### Current State (Pre-Build Phase)
```
🟡 API Cost: $50+ from Alchemy (technical debt)
🟡 ~60 total APIs (need audit to identify which are still used)
🟡 Old foundation broken (not maintained, only added features)
🟡 Current Focus: Rebuild core features (Leaderboard, Dashboard, Quest, Homepage, Profile, Guild, NFTs)
🟡 API Security: Will implement during cleanup phase AFTER core rebuild
```

**Decision**: Rebuild features first → Then audit & secure APIs  
**Rationale**: Can't secure APIs we don't know are used. Need working features first.  

**Projected Risk with 100 users**: $5,000+/month 💸  
**Projected Risk with 1,000 users**: $50,000+/month 💸💸💸  
**Mitigation**: Will implement full security during API cleanup phase

---

## 🛡️ SECURITY ARCHITECTURE (3-Layer Defense)

### Layer 1: Edge Protection (Vercel/Middleware)
**Purpose**: Block attacks before they hit our API

```typescript
// middleware.ts (ENHANCED VERSION)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/api/rate-limit';
import { validateApiKey } from '@/lib/api/auth';

// API routes that need protection
const PROTECTED_ROUTES = [
  '/api/neynar',      // Farcaster data
  '/api/alchemy',     // Blockchain data
  '/api/coinbase',    // AgentKit
  '/api/quests',      // Quest operations
  '/api/users',       // User data
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip protection for public routes
  if (!PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ===== LAYER 1.1: IP-BASED RATE LIMITING =====
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimitResult = await rateLimit.check(ip);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        retryAfter: rateLimitResult.retryAfter,
        limit: rateLimitResult.limit,
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          'Retry-After': rateLimitResult.retryAfter.toString(),
        }
      }
    );
  }

  // ===== LAYER 1.2: API KEY VALIDATION =====
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || !validateApiKey(apiKey)) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  // ===== LAYER 1.3: REQUEST SIZE LIMIT =====
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
    return NextResponse.json(
      { error: 'Request payload too large' },
      { status: 413 }
    );
  }

  // ===== LAYER 1.4: SUSPICIOUS PATTERNS =====
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  if (isSuspicious && !apiKey.startsWith('admin_')) {
    console.warn(`🚨 Suspicious request from IP: ${ip}, UA: ${userAgent}`);
    // Log but don't block (might be legitimate)
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

### Layer 2: Application-Level Protection

#### 2.1: Rate Limiting (Redis/Upstash)

```typescript
// lib/api/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limit tiers
export const rateLimits = {
  // Free tier (unauthenticated)
  anonymous: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
    analytics: true,
    prefix: 'ratelimit:anon',
  }),

  // Authenticated users
  authenticated: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: 'ratelimit:user',
  }),

  // Premium users (future)
  premium: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 requests per minute
    analytics: true,
    prefix: 'ratelimit:premium',
  }),

  // Expensive operations (blockchain queries)
  blockchain: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    analytics: true,
    prefix: 'ratelimit:blockchain',
  }),
};

// Helper function
export async function checkRateLimit(
  identifier: string,
  tier: keyof typeof rateLimits = 'anonymous'
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}> {
  const limiter = rateLimits[tier];
  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
  };
}
```

#### 2.2: API Key Management

```typescript
// lib/api/auth.ts
import crypto from 'crypto';
import { redis } from './rate-limit';

interface ApiKey {
  id: string;
  key: string;
  userId: string;
  name: string;
  tier: 'anonymous' | 'authenticated' | 'premium';
  createdAt: number;
  expiresAt?: number;
  permissions: string[];
  usageCount: number;
  lastUsed?: number;
}

// Generate secure API key
export function generateApiKey(userId: string, tier: 'authenticated' | 'premium'): string {
  const prefix = tier === 'premium' ? 'gm_premium_' : 'gm_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
}

// Validate API key
export async function validateApiKey(key: string): Promise<ApiKey | null> {
  if (!key || !key.startsWith('gm_')) {
    return null;
  }

  // Check Redis cache first
  const cached = await redis.get<ApiKey>(`apikey:${key}`);
  if (cached) {
    // Check expiration
    if (cached.expiresAt && cached.expiresAt < Date.now()) {
      await redis.del(`apikey:${key}`);
      return null;
    }
    
    // Update usage stats
    await redis.hincrby(`apikey:${key}:stats`, 'usageCount', 1);
    await redis.hset(`apikey:${key}:stats`, 'lastUsed', Date.now());
    
    return cached;
  }

  // If not in cache, validate from database (future)
  // For now, reject unknown keys
  return null;
}

// Create API key for user
export async function createApiKey(
  userId: string,
  name: string,
  tier: 'authenticated' | 'premium' = 'authenticated',
  permissions: string[] = ['quests:read', 'users:read'],
  expiresInDays?: number
): Promise<ApiKey> {
  const key = generateApiKey(userId, tier);
  const apiKey: ApiKey = {
    id: crypto.randomUUID(),
    key,
    userId,
    name,
    tier,
    createdAt: Date.now(),
    expiresAt: expiresInDays ? Date.now() + (expiresInDays * 24 * 60 * 60 * 1000) : undefined,
    permissions,
    usageCount: 0,
  };

  // Store in Redis (7 day TTL by default)
  await redis.setex(
    `apikey:${key}`,
    expiresInDays ? expiresInDays * 24 * 60 * 60 : 7 * 24 * 60 * 60,
    JSON.stringify(apiKey)
  );

  return apiKey;
}

// Revoke API key
export async function revokeApiKey(key: string): Promise<void> {
  await redis.del(`apikey:${key}`);
  await redis.del(`apikey:${key}:stats`);
}
```

#### 2.3: Request Validation & Sanitization

```typescript
// lib/api/validation.ts
import { z } from 'zod';

// Common request schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const questQuerySchema = z.object({
  category: z.enum(['onchain', 'social', 'creative', 'learn']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  status: z.enum(['active', 'completed', 'draft']).optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
});

// Sanitize user input (prevent injection attacks)
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/[^\w\s\-_.,!?@#]/g, ''); // Allow only safe characters
}

// Validate Farcaster FID
export function validateFid(fid: unknown): number {
  const parsed = z.coerce.number().int().min(1).max(1000000).safeParse(fid);
  if (!parsed.success) {
    throw new Error('Invalid Farcaster FID');
  }
  return parsed.data;
}

// Validate Ethereum address
export function validateAddress(address: unknown): string {
  const parsed = z.string().regex(/^0x[a-fA-F0-9]{40}$/).safeParse(address);
  if (!parsed.success) {
    throw new Error('Invalid Ethereum address');
  }
  return parsed.data.toLowerCase();
}
```

---

### Layer 3: Provider-Specific Protection

#### 3.1: Alchemy API Protection

```typescript
// lib/api/providers/alchemy.ts
import { Network, Alchemy } from 'alchemy-sdk';
import { checkRateLimit } from '../rate-limit';
import { redis } from '../rate-limit';

// Initialize with cost-optimized settings
const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY!,
  network: Network.BASE_MAINNET,
  maxRetries: 2, // Reduce retries to prevent cost explosion
});

// Cache expensive queries (5 minutes)
const CACHE_TTL = 300; // 5 minutes

export async function getTokenBalance(
  address: string,
  userId: string
): Promise<{ balance: string; usdValue: number }> {
  // Rate limit check (blockchain tier = 5 req/min)
  const rateLimit = await checkRateLimit(userId, 'blockchain');
  if (!rateLimit.success) {
    throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`);
  }

  // Check cache first
  const cacheKey = `alchemy:balance:${address}`;
  const cached = await redis.get<{ balance: string; usdValue: number }>(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return cached;
  }

  // Make API call (COSTS MONEY)
  console.log(`💰 Alchemy API call: getTokenBalance(${address})`);
  const balance = await alchemy.core.getBalance(address);
  
  // Cache result
  const result = {
    balance: balance.toString(),
    usdValue: 0, // Calculate from price feed
  };
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

  // Track usage for cost monitoring
  await redis.hincrby('api:alchemy:stats', 'totalCalls', 1);
  await redis.hincrby('api:alchemy:stats', `user:${userId}`, 1);

  return result;
}

// Get NFTs with aggressive caching
export async function getNFTs(
  address: string,
  userId: string
): Promise<any[]> {
  const rateLimit = await checkRateLimit(userId, 'blockchain');
  if (!rateLimit.success) {
    throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`);
  }

  // Cache for 1 hour (NFTs don't change frequently)
  const cacheKey = `alchemy:nfts:${address}`;
  const cached = await redis.get<any[]>(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return cached;
  }

  // Make API call (EXPENSIVE)
  console.log(`💰 Alchemy API call: getNFTs(${address})`);
  const nfts = await alchemy.nft.getNftsForOwner(address);

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(nfts.ownedNfts));

  // Track usage
  await redis.hincrby('api:alchemy:stats', 'totalCalls', 1);
  await redis.hincrby('api:alchemy:stats', `user:${userId}`, 1);

  return nfts.ownedNfts;
}
```

#### 3.2: Neynar API Protection

```typescript
// lib/api/providers/neynar.ts
import { checkRateLimit } from '../rate-limit';
import { redis } from '../rate-limit';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const CACHE_TTL = 60; // 1 minute for Farcaster data

export async function getUserByFid(
  fid: number,
  requesterId: string
): Promise<any> {
  // Rate limit (authenticated tier = 100 req/min)
  const rateLimit = await checkRateLimit(requesterId, 'authenticated');
  if (!rateLimit.success) {
    throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`);
  }

  // Check cache
  const cacheKey = `neynar:user:${fid}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return JSON.parse(cached as string);
  }

  // Make API call
  console.log(`💰 Neynar API call: getUserByFid(${fid})`);
  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    {
      headers: { 'api_key': NEYNAR_API_KEY },
    }
  );

  if (!response.ok) {
    throw new Error(`Neynar API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache result
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));

  // Track usage
  await redis.hincrby('api:neynar:stats', 'totalCalls', 1);

  return data;
}
```

---

## 📊 Cost Monitoring & Alerts

### Cost Tracking Dashboard

```typescript
// lib/api/monitoring.ts
import { redis } from './rate-limit';

export interface ApiUsageStats {
  provider: string;
  totalCalls: number;
  totalCost: number;
  callsByUser: Record<string, number>;
  callsByEndpoint: Record<string, number>;
  period: string;
}

// Get usage stats
export async function getApiUsageStats(provider: string): Promise<ApiUsageStats> {
  const stats = await redis.hgetall(`api:${provider}:stats`);
  
  return {
    provider,
    totalCalls: parseInt(stats.totalCalls || '0'),
    totalCost: estimateCost(provider, parseInt(stats.totalCalls || '0')),
    callsByUser: Object.entries(stats)
      .filter(([key]) => key.startsWith('user:'))
      .reduce((acc, [key, value]) => {
        acc[key.replace('user:', '')] = parseInt(value as string);
        return acc;
      }, {} as Record<string, number>),
    callsByEndpoint: {},
    period: 'last_24h',
  };
}

// Estimate cost based on provider pricing
function estimateCost(provider: string, calls: number): number {
  const pricing: Record<string, number> = {
    alchemy: 0.01,    // $0.01 per request (estimate)
    neynar: 0.001,    // $0.001 per request
    coinbase: 0.005,  // $0.005 per request
  };

  return calls * (pricing[provider] || 0);
}

// Send alert if cost exceeds threshold
export async function checkCostThreshold(provider: string, threshold: number) {
  const stats = await getApiUsageStats(provider);
  
  if (stats.totalCost > threshold) {
    console.error(`🚨 COST ALERT: ${provider} exceeded $${threshold} (current: $${stats.totalCost})`);
    
    // Send notification (implement with your notification system)
    // await sendDiscordAlert(`API cost alert: ${provider} = $${stats.totalCost}`);
    
    // Optionally disable API temporarily
    await redis.setex(`api:${provider}:disabled`, 3600, '1'); // Disable for 1 hour
    
    return true;
  }
  
  return false;
}
```

---

## 🚀 Implementation Plan

### Phase 1: Critical Protection (2-3 hours) - DO THIS NOW
- [x] Create API-SECURITY-STRATEGY.md (this document)
- [ ] Install Upstash Redis (`pnpm add @upstash/redis @upstash/ratelimit`)
- [ ] Create Upstash account + get Redis credentials
- [ ] Implement middleware.ts with rate limiting
- [ ] Implement lib/api/rate-limit.ts
- [ ] Implement lib/api/auth.ts (API key management)
- [ ] Add environment variables:
  ```bash
  UPSTASH_REDIS_REST_URL="https://..."
  UPSTASH_REDIS_REST_TOKEN="..."
  API_KEY_SECRET="generate-with-openssl-rand-hex-32"
  ```
- [ ] Test rate limiting (curl commands)
- [ ] Deploy to production BEFORE continuing Task 7

### Phase 2: Provider Protection (1-2 hours)
- [ ] Wrap Alchemy calls with caching + rate limits
- [ ] Wrap Neynar calls with caching + rate limits
- [ ] Wrap Coinbase AgentKit calls with rate limits
- [ ] Add cost tracking to all providers
- [ ] Set up daily cost monitoring

### Phase 3: Monitoring & Alerts (1 hour)
- [ ] Create /api/admin/usage endpoint (admin only)
- [ ] Set up daily usage reports
- [ ] Configure cost alerts ($10, $25, $50 thresholds)
- [ ] Add usage dashboard to admin panel

---

## 📋 Checklist: Before Enabling Any API

**BEFORE calling Alchemy/Neynar/Coinbase**:
- [ ] Rate limit configured (5-10 req/min for expensive calls)
- [ ] Caching implemented (5min-1hour depending on data freshness)
- [ ] API key validation required
- [ ] Request validation (zod schemas)
- [ ] Cost tracking enabled
- [ ] Alert threshold set
- [ ] Tested with curl/Postman
- [ ] Documented in API-SECURITY-STRATEGY.md

---

## 💰 Cost Estimates (After Protection)

### With 0 users (Current)
- **Before**: $50/month (WASTE)
- **After**: $0/month (no calls = no cost)

### With 10 users (Launch Target)
- **Before**: $500-1000/month (unprotected)
- **After**: $5-10/month (cached + rate limited)

### With 100 users
- **Before**: $5,000-10,000/month (bankruptcy)
- **After**: $50-100/month (sustainable)

### With 1,000 users
- **Before**: $50,000+/month (DISASTER)
- **After**: $500-1,000/month (acceptable)

**Savings**: 90-95% cost reduction with proper protection

---

## 🔒 Security Best Practices

### 1. Never Trust Client Input
```typescript
// ❌ BAD
app.get('/api/user/:fid', async (req, res) => {
  const user = await getUserByFid(req.params.fid); // No validation!
  res.json(user);
});

// ✅ GOOD
app.get('/api/user/:fid', async (req, res) => {
  const fid = validateFid(req.params.fid); // Validate first
  const rateLimit = await checkRateLimit(req.ip, 'authenticated');
  if (!rateLimit.success) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  const user = await getUserByFid(fid, req.ip);
  res.json(user);
});
```

### 2. Cache Aggressively
```typescript
// ❌ BAD: Every request hits Alchemy ($$$)
const balance = await alchemy.core.getBalance(address);

// ✅ GOOD: Check cache first
const cached = await redis.get(`balance:${address}`);
if (cached) return cached;
const balance = await alchemy.core.getBalance(address);
await redis.setex(`balance:${address}`, 300, balance); // Cache 5min
```

### 3. Rate Limit by User + IP
```typescript
// ✅ GOOD: Limit both authenticated users and anonymous IPs
const userLimit = await checkRateLimit(userId, 'authenticated'); // 100/min
const ipLimit = await checkRateLimit(req.ip, 'anonymous'); // 10/min

if (!userLimit.success || !ipLimit.success) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### 4. Monitor & Alert
```typescript
// ✅ GOOD: Track every expensive call
await redis.hincrby('api:alchemy:stats', 'totalCalls', 1);
await checkCostThreshold('alchemy', 10); // Alert if >$10/day
```

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- [ ] Rate limiting works (test with 11 requests in 1 minute = blocked)
- [ ] API keys required for all protected endpoints
- [ ] Middleware blocks requests without valid keys
- [ ] Cost tracking enabled for all providers
- [ ] Zero API calls when no users online

### Phase 2 Complete When:
- [ ] Alchemy calls cached (5min for balances, 1hr for NFTs)
- [ ] Neynar calls cached (1min for user data)
- [ ] Rate limits per provider (5/min blockchain, 100/min Farcaster)
- [ ] Cost reduced by 90%+ vs current state

### Phase 3 Complete When:
- [ ] Daily usage reports working
- [ ] Cost alerts configured ($10, $25, $50)
- [ ] Admin dashboard shows usage stats
- [ ] Auto-disable if threshold exceeded

---

## 📖 Documentation Updates Required

**Before Task 7**, update these docs with API security requirements:

1. **FOUNDATION-REBUILD-ROADMAP.md**
   - Add "Phase 2.8: API Security" (CRITICAL, must complete before Task 7)
   - Estimated: 3-4 hours
   - Blocking: YES (Task 7 cannot start without this)

2. **CURRENT-TASK.md**
   - Update current score: 95/100
   - Add Task 6.5: API Security (emergency task)
   - Target: 95/100 (no score change, but prevents bankruptcy)

3. **docs/planning/** (NEW)
   - Create API-INTEGRATION-GUIDE.md
   - Security requirements for all API integrations
   - Reference this document

4. **Task 7 Plan** (Update before starting)
   - Add security requirements to all API calls
   - Farcaster API must use rate limiting
   - User progress must use caching
   - Authentication must use API keys

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### DO THIS FIRST (Before Task 7):
1. **Stop all API calls** (already done - no users)
2. **Implement Phase 1** (rate limiting + API keys) - 2-3 hours
3. **Test thoroughly** (curl + manual testing) - 30 minutes
4. **Deploy to production** - 15 minutes
5. **Verify $0 cost for 24 hours** - monitor
6. **THEN start Task 7** with security built-in

### During Task 7:
- **Every API call** must go through rate limiter
- **Every response** must be cached (when possible)
- **Every cost** must be tracked
- **Test with** 10 requests to verify limits work

---

## ✅ User Decision

**User (@heycat)**: Continue with Task 7 (feature rebuild), handle API security later during cleanup phase.

**Context Understood**:
1. Pre-build stage: Rebuilding core features (Leaderboard 95%, Dashboard 70%, Quest 97%)
2. ~60 APIs in codebase, unclear which are still used
3. Old foundation broken from lack of maintenance
4. Need to rebuild: Homepage, Profile, Guild, NFTs, etc.
5. API audit & security will happen AFTER core features are rebuilt

**Revised Strategy**: 
- ✅ Continue Task 7: Real Data Integration (Quest System)
- ✅ Document API security patterns in this file (reference for later)
- ✅ Focus on rebuilding features to 95-100/100 quality
- 🔄 DEFER API security to "Phase 7: API Cleanup & Audit" (after core rebuild)
- 🔄 Will audit ~60 APIs, remove unused, secure active ones

**This document serves as**: Reference guide for future API cleanup phase.

---

## 📋 Future API Cleanup Phase (After Core Rebuild)

### Phase 7: API Cleanup & Security (8-12 hours estimated)

**Timing**: Execute AFTER all core features rebuilt (Homepage, Profile, Guild, NFTs, Quest, Leaderboard, Dashboard)

**Steps**:
1. **API Audit** (3-4 hours)
   - Inventory all ~60 APIs in codebase
   - Identify which are actively used
   - Remove unused/deprecated APIs
   - Document remaining APIs

2. **Security Implementation** (3-4 hours)
   - Implement rate limiting (Upstash Redis)
   - Add API key authentication
   - Wrap providers with caching
   - Set up cost monitoring

3. **Testing & Monitoring** (2-4 hours)
   - Test all protected endpoints
   - Verify cost reduction
   - Set up alerts
   - Monitor for 48 hours

**Will revisit this document when ready for API cleanup.**

---

**Status**: 🟢 DOCUMENTED - Ready for Task 7  
**Next**: Continue Task 7 (Real Data Integration) with feature rebuild focus
