# Route Migration Checklist - TRUE HYBRID Pattern

## Pre-Migration Requirements (READ FIRST)

### 1. Documentation Review ✅
- [x] HYBRID-IMPLEMENTATION-COMPLETE-PLAN.md
- [x] INFRASTRUCTURE-USAGE-QUICK-REF.md
- [x] DOCS-UPDATE-COMPLETE.md

### 2. Data Source Mapping ✅
**Subsquid (On-Chain)**:
- User stats, points, XP, streaks
- GM events, tips, quests completions
- Badge mints, badge stakes
- Guild deposits, treasury operations
- Referral network, referral events

**Supabase (Off-Chain)**:
- user_profiles (FID, wallets, metadata)
- badge_casts (viral metrics)
- guild_metadata, guild_events
- referral_stats, referral_activity
- quest_definitions, user_quests

**Calculated (Application Layer)**:
- Level from XP: calculateLevelProgress()
- Rank tier: getRankTierByPoints()
- Viral bonuses: calculateViralBonus()

### 3. Available Functions ✅

**Subsquid** (29 functions):
- getLeaderboardEntry(), getRecentActivity()
- getTipEvents(), getRankEvents(), getGMEventAnalytics()
- getQuestCompletions(), getQuestById()
- getBadgeMintAnalytics(), getBadgeStakes()
- getPointsTransactions(), getPointsBalance()
- getTreasuryOperations(), getGuildDepositAnalytics()
- getReferrerChain(), getPlatformAnalytics()

**Calculation** (lib/leaderboard/rank.ts):
- calculateLevelProgress(points) → { level, percentage }
- getRankTierByPoints(points) → RankTier
- calculateRankProgress(points) → RankProgress

**Validation** (lib/validation/api-schemas):
- FIDSchema, AddressSchema, QuestVerifySchema

**Rate Limiting** (lib/middleware/rate-limit):
- apiLimiter (60 req/min), strictLimiter (10 req/min)

**Caching** (lib/cache/server):
- getCached(namespace, key, fetcher, { ttl })

---

## Migration Workflow (ONE ROUTE AT A TIME)

### Step 1: Identify Route Category
- Stats routes: /api/stats/*
- User routes: /api/user/*
- Badge routes: /api/badges/*
- Quest routes: /api/quests/*
- Guild routes: /api/guild/*
- Leaderboard: /api/leaderboard*

### Step 2: Map Data Sources
```typescript
// Document what comes from where:
// Layer 1 (Subsquid): 
// Layer 2 (Supabase): 
// Layer 3 (Calculated): 
```

### Step 3: Implement TRUE HYBRID Pattern
```typescript
import { getCached } from '@/lib/cache/server'
import { apiLimiter, rateLimit, getClientIp } from '@/lib/middleware/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { createClient } from '@/lib/supabase/edge'
import { getLeaderboardEntry } from '@/lib/subsquid-client'
import { calculateLevelProgress } from '@/lib/leaderboard/rank'

export async function GET(request: NextRequest) {
  // 1. Rate limit
  const ip = getClientIp(request)
  const { success } = await rateLimit(apiLimiter, ip)
  
  // 2. Validate
  const validation = FIDSchema.safeParse(fid)
  
  // 3. Layer 1: On-chain (Subsquid)
  const onChainData = await getLeaderboardEntry(address)
  
  // 4. Layer 2: Off-chain (Supabase)
  const supabase = createClient(request)
  const { data: profile } = await supabase...
  
  // 5. Layer 3: Calculate
  const level = calculateLevelProgress(onChainData.totalXP)
  
  // 6. Merge
  return NextResponse.json({
    ...onChainData,
    ...profile,
    level,
    metadata: {
      sources: { 
        onchain: true, 
        offchain: true, 
        calculated: true 
      }
    }
  })
}
```

### Step 4: Verify Checklist
- [ ] Uses Subsquid for on-chain data
- [ ] Uses Supabase for off-chain data
- [ ] Calculates derived metrics
- [ ] Uses lib/ infrastructure (no inline code)
- [ ] 0 TypeScript errors
- [ ] Response includes all three layers
- [ ] Response field names match frontend interface

---

## Priority Routes (Next 20)

### High Priority (User-Facing)
1. `/api/stats` - Platform stats
2. `/api/user/[fid]/stats` - User stats
3. `/api/badges/[badgeId]` - Badge details
4. `/api/quests/[questId]` - Quest details
5. `/api/leaderboard` - Global leaderboard

### Medium Priority (Analytics)
6. `/api/analytics/platform` - Platform analytics
7. `/api/analytics/quests` - Quest analytics
8. `/api/guild/[guildId]` - Guild details

### Expansion Candidates
9. `/api/user/[fid]/badges` - User badges
10. `/api/user/[fid]/quests` - User quest progress

---

## Current Status

**Completed**: 20 routes (13.4%)
**Remaining**: 129 routes (86.6%)
**Next Target**: 40+ routes (27%)

**Ready to Start**: ✅
