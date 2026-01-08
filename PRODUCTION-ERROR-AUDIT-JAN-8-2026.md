# 🚨 Production Error Audit - January 8, 2026 (CORRECTED)

**Site:** https://gmeowhq.art  
**Status:** LIVE with CRITICAL SCHEMA DRIFT ERRORS  
**Audit Date:** January 8, 2026  
**Updated:** January 8, 2026 (after ScoringModule contract review)  
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)

**⚠️ IMPORTANT CONTEXT:**
- **ScoringModule** deployed to Base mainnet: ~Dec 31, 2025 / Jan 1, 2026
- **Subsquid schema** updated to Phase 3.2G with full ScoringModule support
- All on-chain scoring data (level, rank, multiplier, breakdown) is indexed

---

## 📘 ON-CHAIN SCORING SYSTEM (ScoringModule.sol)

### **Data Model Overview:**

**From ScoringModule Contract (Base Mainnet):**

1. **totalScore** (uint256) - Sum of ALL point categories:
   ```solidity
   totalScore = scoringPointsBalance + viralPoints + questPoints + guildPoints + referralPoints
   ```

2. **level** (uint256) - Calculated from totalScore using quadratic XP formula:
   - Base: 300 XP for level 1→2
   - Increment: +200 XP per level
   - Example: 2,100 totalScore = Level 5

3. **rankTier** (uint8) - Index 0-11 based on totalScore thresholds:
   - Tier 0: Signal Kitten (0-500)
   - Tier 2: Beacon Runner (1,500-4,000) → 1.1x multiplier
   - Tier 4: Star Captain (8,000-15,000) → 1.2x multiplier
   - Tier 10: Infinite GM (250,000-500,000) → 2.0x multiplier

4. **multiplier** (uint16) - Bonus from rank tier (basis points):
   - 1000 = 1.0x (no bonus)
   - 1100 = 1.1x
   - 2000 = 2.0x

5. **Point Categories** (for transparency):
   - `scoringPointsBalance` - GM rewards, quest claims (blockchain-verified)
   - `viralPoints` - Farcaster engagement (oracle-updated)
   - `questPoints` - Off-chain quest completions
   - `guildPoints` - Guild activity rewards
   - `referralPoints` - Referral bonuses

---

## ❌ CATEGORY 1: GRAPHQL SCHEMA DRIFT (BREAKING ERRORS)

### **Issue 1.1: `totalXP` Field Queried But Does Not Exist**

**Severity:** 🔴 **CRITICAL** - Causes 400 Bad Request errors  
**Status:** ❌ **UNRESOLVED**  
**Impact:** Guild stats, leaderboard members, frames

#### Root Cause:
Queries use deprecated field `totalXP` which was never part of the ScoringModule schema. The correct field is `totalScore` (deployed Jan 1, 2026).

**Evidence:**

**1. Actual Schema** (gmeow-indexer/schema.graphql - Phase 3.2G):
```graphql
type User @entity {
  id: ID!
  pointsBalance: BigInt!       # Current spendable (CoreModule)
  totalEarnedFromGMs: BigInt!  # Cumulative from GM events
  
  # ScoringModule on-chain data (deployed Jan 1, 2026):
  totalScore: BigInt! @index   # ✅ Sum of all point categories
  level: Int! @index           # ✅ Calculated from totalScore
  rankTier: Int! @index        # ✅ Tier index (0-11)
  multiplier: Int!             # ✅ Bonus multiplier (1000-2000)
  
  # Point breakdown:
  gmPoints: BigInt!            # ✅ Points from GM events
  viralPoints: BigInt!         # ✅ Viral engagement
  questPoints: BigInt!         # ✅ Quest completions
  guildPoints: BigInt!         # ✅ Guild rewards
  referralPoints: BigInt!      # ✅ Referral bonuses
  
  # Level progression:
  xpIntoLevel: BigInt!         # ✅ XP in current level
  xpToNextLevel: BigInt!       # ✅ XP needed for next level
  
  # Rank progression:
  pointsIntoTier: BigInt!      # ✅ Points in current tier
  pointsToNextTier: BigInt!    # ✅ Points to next tier
}
```

**2. Broken Query** (lib/integrations/subsquid-client.ts:369):
```typescript
query GetGuildStats($guildId: String!) {
  guilds(where: { id_eq: $guildId }, limit: 1) {
    members(limit: 20, orderBy: pointsContributed_DESC) {
      user {
        id
        totalXP  # ❌ FIELD DOES NOT EXIST - should be totalScore
      }
    }
  }
}
```

**3. Error Logs:**
```
[Subsquid] Guild membership query failed: HTTP 400
Cannot query field "totalXP" on type "User"
```

**4. Affected Locations:**
- `lib/integrations/subsquid-client.ts:306` - Leaderboard query
- `lib/integrations/subsquid-client.ts:336` - Leaderboard entry mapping
- `lib/integrations/subsquid-client.ts:369` - Guild stats query
- `lib/integrations/subsquid-client.ts:410` - Guild member mapping
- `lib/integrations/subsquid-client.ts:611` - Another query location

#### Correct Fix:
Replace `totalXP` with ScoringModule fields from deployed contract:

**Comprehensive User Stats Query:**
```graphql
query GetUserStats($address: String!) {
  users(where: { id_eq: $address }, limit: 1) {
    id
    
    # Core balances:
    pointsBalance        # Current spendable (CoreModule)
    totalEarnedFromGMs   # Lifetime GM earnings
    
    # ScoringModule aggregates:
    totalScore           # ✅ Sum of all categories
    level                # ✅ Current level (from totalScore)
    rankTier             # ✅ Rank tier 0-11
    multiplier           # ✅ Bonus multiplier (1000-2000)
    
    # Point breakdown (ScoringModule):
    gmPoints             # GM event points
    viralPoints          # Farcaster engagement
    questPoints          # Quest completions
    guildPoints          # Guild activity
    referralPoints       # Referral bonuses
    
    # Progression (ScoringModule):
    xpIntoLevel          # Progress in current level
    xpToNextLevel        # XP needed for next level
    pointsIntoTier       # Progress in current tier
    pointsToNextTier     # Points to next tier
  }
}
```

**For Guild Member Display:**
```graphql
user {
  id
  totalScore      # ✅ Use for "Total XP" display
  level           # ✅ User level
  rankTier        # ✅ For tier badge/color
  gmPoints        # ✅ If showing GM-specific contribution
}
```

---

### **Issue 1.2: Understanding the On-Chain Scoring System**

**Severity:** 🟢 **INFORMATIONAL** - Clarification needed  
**Status:** ✅ **DOCUMENTED**  
**Impact:** Developer understanding

#### Key Concepts (from ScoringModule.sol):

**1. Points vs Score vs XP:**
- **Points** = Generic term for any point category (GM, viral, quest, guild, referral)
- **totalScore** = Sum of ALL point categories (the "total" metric)
- **XP** = Used in level progression formulas (but totalScore is the input value)

**2. Level Calculation:**
```solidity
// ScoringModule.sol - calculateLevel()
// Takes totalScore as input, returns level using quadratic XP formula
function calculateLevel(uint256 points) public pure returns (uint256 level) {
  // Formula: level = (-b + √(b² + 4ac)) / 2a
  // where a=100, b=200, c=-points
  // Example: 2100 totalScore → Level 5
}
```

**3. Rank Tiers (12 tiers, 5 with multipliers):**
```solidity
// From _initializeRankTiers()
Tier 0:  0-500       Signal Kitten      1.0x
Tier 1:  500-1.5K    Warp Scout         1.0x
Tier 2:  1.5K-4K     Beacon Runner      1.1x ⭐
Tier 3:  4K-8K       Night Operator     1.0x
Tier 4:  8K-15K      Star Captain       1.2x ⭐
Tier 5:  15K-25K     Nebula Commander   1.0x
Tier 6:  25K-40K     Quantum Navigator  1.3x ⭐
Tier 7:  40K-60K     Cosmic Architect   1.0x
Tier 8:  60K-100K    Void Walker        1.5x ⭐
Tier 9:  100K-250K   Singularity Prime  1.0x
Tier 10: 250K-500K   Infinite GM        2.0x ⭐
Tier 11: 500K+       Omniversal Being   1.0x
```

**4. Why ALL Fields Are Important:**
Each field serves a specific purpose:
- `totalScore` - Overall ranking and tier determination
- `level` - Progression milestone, visual status
- `rankTier` - Bonus multiplier eligibility
- `multiplier` - Actual bonus applied to rewards
- `gmPoints/viralPoints/etc` - Transparency, analytics, leaderboards by category
- `xpIntoLevel/xpToNextLevel` - UI progress bars
- `pointsIntoTier/pointsToNextTier` - Next multiplier unlock countdown

---

## ❌ CATEGORY 2: API CONTRACT VIOLATIONS

### **Issue 2.1: Silent 400 Errors with 200 OK Responses**

**Severity:** 🔴 **CRITICAL** - Data integrity violation  
**Status:** ✅ **PARTIALLY HANDLED** (warnings logged, but no client notification)  
**Impact:** Users see incomplete/stale data without knowing

#### Root Cause:
Subsquid queries fail (HTTP 400), but error handling returns empty arrays instead of propagating errors.

**Evidence:**

**1. Silent Error Swallowing** (lib/subsquid-client.ts:2215-2227):
```typescript
if (!response.ok) {
  // Log warning but don't throw - guild membership is optional
  console.warn(`[Subsquid] Guild membership query failed: HTTP ${response.status}`)
  return []  // ❌ Returns empty array instead of throwing
}

if (result.errors) {
  console.warn('[Subsquid] Guild membership GraphQL error:', result.errors)
  return []  // ❌ Returns empty array instead of throwing
}
```

**2. API Routes Return 200 OK:**
```typescript
// app/api/guild/list/route.ts:420
return NextResponse.json({
  success: true,  // ❌ Claims success even if Subsquid failed
  guilds,
  // No indication that some data might be missing
}, { status: 200 })
```

#### Impact:
- `/api/leaderboard-v2` returns HTTP 200 with partial data
- `/api/guild/list` returns HTTP 200 with incomplete guild stats
- `/api/rewards/claim` silently fails to fetch guild membership
- UI shows stale/cached data without error indication
- Debugging impossible (logs show errors, API claims success)

#### Correct Fix:

**Option A:** Fail-fast (production-safe)
```typescript
if (!response.ok) {
  throw new Error(`Subsquid query failed: HTTP ${response.status}`)
}
```

**Option B:** Partial success response
```typescript
return NextResponse.json({
  success: true,
  guilds,
  warnings: subsquidErrors.length > 0 ? ['Some guild data unavailable'] : undefined,
  dataQuality: subsquidErrors.length > 0 ? 'partial' : 'complete'
}, { 
  status: subsquidErrors.length > 0 ? 206 : 200  // 206 Partial Content
})
```

**Option C:** Status field in response
```typescript
return NextResponse.json({
  status: 'success',
  data: guilds,
  meta: {
    dataSource: 'subsquid',
    cached: false,
    issues: subsquidErrors
  }
}, { status: 200 })
```

**Recommended:** Option A for critical queries (leaderboard, rewards), Option B for optional data (guild membership).

---

## ❌ CATEGORY 3: SUBSQUID HTTP 400 ERRORS

### **Issue 3.1: Guild Membership Query Failures**

**Severity:** 🔴 **CRITICAL**  
**Status:** ❌ **UNRESOLVED** (caused by Issue 1.1)  
**Impact:** Rewards claiming, guild stats, user profiles

#### Root Cause:
Query uses `totalXP` field which was never part of ScoringModule schema. Should use `totalScore`.

**Evidence:**
```
[Subsquid] Guild membership query failed: HTTP 400 { address: '0x7539...' }
[SubsquidClient] Query failed: Subsquid HTTP error: 400 Bad Request
Cannot query field "totalXP" on type "User"
```

**Affected Endpoints:**
- `/api/rewards/claim` (line 98: `getGuildMembershipByAddress`)
- Any guild-related query using `lib/integrations/subsquid-client.ts:getGuildStats`

#### Fix:
Replace `totalXP` with `totalScore` (and optionally include breakdown fields).

---

### **Issue 3.2: BigInt Timestamp Queries**

**Severity:** 🟢 **LOW** - Working as designed  
**Status:** ✅ **RESOLVED**  
**Impact:** None (queries working correctly)

#### Evidence:
```typescript
// lib/subsquid-client.ts:1248
query GetTipAnalytics($since: BigInt!, $until: BigInt!) {
  // ✅ Correct: Subsquid schema uses BigInt for timestamps
}
```

**Schema Confirmation:**
```graphql
type GMEvent @entity {
  timestamp: BigInt!  # ✅ Matches query type
}
```

**Conclusion:** No issue. BigInt timestamps are correct per Subsquid schema design.

---

## ✅ CATEGORY 4: INFRASTRUCTURE (NO ISSUES FOUND)

### **Issue 4.1: Upstash Rate Limiting Warning**

**Severity:** 🟡 **MEDIUM** - Feature disabled but intentional  
**Status:** ✅ **EXPECTED BEHAVIOR**  
**Impact:** Rate limiting disabled (may allow abuse)

#### Evidence:
```
[Rate Limit] Upstash not configured, rate limiting disabled
```

**Root Cause:** Upstash credentials made optional in `lib/config/env.ts` to allow build phase to succeed (fix deployed Jan 8, 2026).

**Current Behavior:**
```typescript
// lib/middleware/rate-limit.ts
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
if (!redisUrl || !redisToken) {
  console.warn('[Rate Limit] Upstash not configured, rate limiting disabled')
  return { success: true } // ✅ Allow all requests
}
```

#### Assessment:
- ✅ Intentional fallback for development/build
- ⚠️ Production should have Upstash configured
- 🔧 Verify Vercel environment variables include `UPSTASH_REDIS_REST_TOKEN`

**Recommended:** Check Vercel dashboard → Project Settings → Environment Variables → ensure Upstash credentials exist for Production.

---

### **Issue 4.2: Caching Layer**

**Severity:** 🟢 **NONE**  
**Status:** ✅ **WORKING CORRECTLY**  
**Impact:** None

#### Evidence:
```typescript
// app/api/leaderboard-v2/route.ts:92
const result = await getCached(
  'leaderboard-v2',
  `${period}:${page}:${pageSize}:${search || 'all'}:${orderBy}`,
  async () => getLeaderboard({ period, page, perPage: pageSize, search, orderBy }),
  { ttl: 300 }  // 5 minutes
)
```

**Assessment:**
- ✅ Cache keys include all query params (no collision)
- ✅ TTL is reasonable (5 minutes)
- ✅ Cache warming happens on first request
- ✅ No evidence of caching error responses

**Conclusion:** Caching layer working as designed.

---

## 📊 CATEGORY 5: UI IMPACT ASSESSMENT

### **Affected Pages:**

#### 1. **Home Page** (`/`)
- **Status:** 🟡 **PARTIAL IMPACT**
- **Issue:** `components/home/GuildsShowcase.tsx` expects `guild.totalPoints` (Guild entity)
- **Assessment:** ✅ **SAFE** - Guild entity HAS totalPoints field (no schema drift)

#### 2. **Leaderboard** (`/leaderboard`)
- **Status:** 🔴 **BROKEN**
- **Issue:** Queries `user.totalXP` which doesn't exist
- **Impact:** Leaderboard entries missing user stats
- **Fix:** Replace `totalXP` with `totalScore`

#### 3. **Guild Pages** (`/guild/*`)
- **Status:** 🔴 **BROKEN**
- **Issue:** Guild member stats query `totalXP`
- **Impact:** Member XP not displayed
- **Fix:** Replace `totalXP` with `totalScore` in `getGuildStats` query

#### 4. **Profile Pages** (`/profile/[fid]`)
- **Status:** 🟡 **PARTIAL IMPACT**
- **Issue:** May use `getUserStats` which queries `totalPoints` (interface name mismatch)
- **Assessment:** Need to verify actual queries used

#### 5. **Frames** (`/frame/*`)
- **Status:** 🔴 **BROKEN**
- **Issue:** Frame data depends on `lib/integrations/subsquid-client.ts`
- **Impact:** XP overlays, stats frames broken
- **Fix:** Replace `totalXP` with `totalScore`

#### 6. **Quests** (`/quests/*`)
- **Status:** 🟡 **UNKNOWN**
- **Issue:** Need to verify if quest verification queries user stats
- **Assessment:** Check `components/quests/QuestVerification.tsx` queries

---

## 🔧 COMPREHENSIVE FIX PLAN

### **Priority 1: Fix Schema Drift (CRITICAL)**

**Understanding the ScoringModule Contract:**

The contract deployed Jan 1, 2026 uses:
- `totalScore` as the aggregate metric (sum of all categories)
- `level` calculated from totalScore using XP formula
- `rankTier` determined by totalScore thresholds
- `multiplier` as the bonus from rankTier

**Files to Update:**

1. **lib/integrations/subsquid-client.ts** (5+ locations)
   
   Replace `totalXP` with `totalScore` and enhance with ScoringModule fields:
   
   ```typescript
   // Line 193: getUserStats query
   query GetUserStats($address: String!) {
     users(where: { id_eq: $address }, limit: 1) {
       id
       totalScore      // ✅ Main aggregate
       level           // ✅ From ScoringModule
       rankTier        // ✅ Tier index 0-11
       multiplier      // ✅ Bonus multiplier
       gmPoints        // ✅ Breakdown
       viralPoints
       questPoints
       guildPoints
       referralPoints
       currentStreak
       lastGMTimestamp
       lifetimeGMs
     }
   }
   
   // Line 300: getLeaderboard query  
   query GetLeaderboard($limit: Int!, $offset: Int!) {
     leaderboardEntries(limit: $limit, offset: $offset, orderBy: rank_ASC) {
       rank
       totalPoints     // ✅ LeaderboardEntry uses totalPoints (denormalized)
       user {
         id
         level         // ✅ Add level for display
         rankTier      // ✅ Add tier for badges
       }
     }
   }
   
   // Line 369: getGuildStats query
   query GetGuildStats($guildId: String!) {
     guilds(where: { id_eq: $guildId }, limit: 1) {
       id
       owner
       totalMembers
       totalPoints    // ✅ Guild uses totalPoints
       members(limit: 20, orderBy: pointsContributed_DESC) {
         user {
           id
           totalScore   // ✅ User uses totalScore
           level
           rankTier
         }
         pointsContributed
       }
     }
   }
   ```

2. **Update TypeScript interfaces to match ScoringModule:**
   ```typescript
   // lib/integrations/subsquid-client.ts
   export interface UserStats {
     address: string;
     
     // ScoringModule aggregates:
     totalScore: number;      // ✅ Sum of all categories
     level: number;           // ✅ Calculated from totalScore
     rankTier: number;        // ✅ Tier index 0-11
     multiplier: number;      // ✅ Bonus (1000-2000)
     
     // Point breakdown:
     gmPoints: number;
     viralPoints: number;
     questPoints: number;
     guildPoints: number;
     referralPoints: number;
     
     // Progression:
     xpIntoLevel: number;
     xpToNextLevel: number;
     pointsIntoTier: number;
     pointsToNextTier: number;
     
     // Legacy CoreModule:
     pointsBalance: number;   // Current spendable
     available: number;
     locked: bigint;
     total: bigint;
     tier: string;           // Convert rankTier to name
     
     // Streaks:
     currentStreak: number;
     lastGMTimestamp: number | null;
     lifetimeGMs: number;
     
     // Counts:
     guildMemberships: number;
     badgeCount: number;
     rank: number | null;
     weeklyPoints: number;
     monthlyPoints: number;
   }
   
   export interface LeaderboardEntry {
     rank: number;
     address: string;
     totalPoints: number;  // ✅ From LeaderboardEntry entity
     level: number;        // ✅ From User.level
     tier: string;         // ✅ Convert User.rankTier to name
     gmStreak: number;
     totalGMs: number;
   }
   ```

3. **Add rank tier name helper:**
   ```typescript
   // Convert rankTier index to name
   function getRankTierName(tierIndex: number): string {
     const tiers = [
       'Signal Kitten',      // 0
       'Warp Scout',         // 1
       'Beacon Runner',      // 2
       'Night Operator',     // 3
       'Star Captain',       // 4
       'Nebula Commander',   // 5
       'Quantum Navigator',  // 6
       'Cosmic Architect',   // 7
       'Void Walker',        // 8
       'Singularity Prime',  // 9
       'Infinite GM',        // 10
       'Omniversal Being'    // 11
     ];
     return tiers[tierIndex] || 'Signal Kitten';
   }
   ```

### **Priority 2: Improve Error Handling (HIGH)**

**Files to Update:**

1. **lib/subsquid-client.ts:2215-2227**
   ```typescript
   if (!response.ok) {
     // For critical queries: throw error
     if (isCriticalQuery) {
       throw new Error(`Subsquid query failed: HTTP ${response.status}`)
     }
     // For optional data: log and return empty
     console.warn(`[Subsquid] Optional query failed: HTTP ${response.status}`)
     return []
   }
   ```

2. **Add error propagation to API routes:**
   ```typescript
   try {
     const guilds = await fetchGuilds()
     return NextResponse.json({ guilds }, { status: 200 })
   } catch (error) {
     if (error.message.includes('Subsquid')) {
       return NextResponse.json(
         { error: 'Data service unavailable' },
         { status: 503 }  // ✅ Service Unavailable
       )
     }
     throw error
   }
   ```

### **Priority 3: Verification & Testing (MEDIUM)**

1. **Test Subsquid queries with actual schema:**
   ```bash
   # Get ScoringModule data for a user
   curl -X POST $SUBSQUID_URL \
     -H "Content-Type: application/json" \
     -d '{
       "query": "{ users(limit:1) { 
         id 
         totalScore 
         level 
         rankTier 
         multiplier 
         gmPoints 
         viralPoints 
         questPoints 
         guildPoints 
         referralPoints 
       } }"
     }'
   ```

2. **Verify ScoringModule contract integration:**
   ```bash
   # Check if Subsquid is indexing StatsUpdated events
   curl -X POST $SUBSQUID_URL \
     -d '{
       "query": "{ 
         statsUpdatedEvents(limit: 10, orderBy: blockNumber_DESC) {
           user { id }
           totalScore
           level
           rankTier
           multiplier
           blockNumber
           txHash
         }
       }"
     }'
   ```

3. **Verify all ScoringModule fields exist:**
   ```bash
   curl -X POST $SUBSQUID_URL \
     -d '{
       "query": "{ 
         __type(name: \"User\") { 
           fields { 
             name 
             type { name kind ofType { name } }
           }
         }
       }"
     }' | jq '.data.__type.fields[] | select(.name | contains("Score") or contains("level") or contains("rank") or contains("Points"))'
   ```

3. **Monitor error logs after deploy:**
   - Check Vercel logs for `[Subsquid]` errors
   - Verify HTTP 400 errors disappear
   - Confirm API routes return correct status codes

---

## 📋 COMPLETION CRITERIA

### ✅ **Issue Resolved When:**

1. **Schema Drift Fixed:**
   - [ ] All `totalXP` queries replaced with `totalScore`
   - [ ] TypeScript interfaces include all ScoringModule fields (level, rankTier, multiplier, breakdowns)
   - [ ] Queries distinguish between User.totalScore and LeaderboardEntry.totalPoints
   - [ ] Local Subsquid query test returns ScoringModule data

2. **ScoringModule Integration Verified:**
   - [ ] Queries include `level` field (calculated from totalScore)
   - [ ] Queries include `rankTier` field (0-11 index)
   - [ ] Queries include `multiplier` field (1000-2000 basis points)
   - [ ] Queries include breakdown fields (gmPoints, viralPoints, questPoints, guildPoints, referralPoints)
   - [ ] UI displays rank tier names correctly (Signal Kitten → Omniversal Being)
   - [ ] UI shows bonus multiplier badges (1.1x, 1.2x, 1.3x, 1.5x, 2.0x)

3. **Error Handling Improved:**
   - [ ] Critical queries throw errors on failure
   - [ ] Optional queries return empty with warnings
   - [ ] API routes return correct HTTP status codes (503 for Subsquid failures)
   - [ ] Partial data responses use HTTP 206 or status field

4. **Production Verified:**
   - [ ] Vercel logs show zero HTTP 400 errors from Subsquid
   - [ ] `/api/leaderboard-v2` returns complete data with levels and tiers
   - [ ] `/api/guild/list` shows correct member totalScore (not totalXP)
   - [ ] Frames display totalScore, level, and rank tier correctly
   - [ ] No silent data corruption (users notified of errors)
   - [ ] Rank tier badges display with correct multipliers

5. **Infrastructure Confirmed:**
   - [ ] Subsquid indexing StatsUpdated events from ScoringModule
   - [ ] All 5 point categories tracked separately (gmPoints, viralPoints, questPoints, guildPoints, referralPoints)
   - [ ] Level progression working (quadratic XP formula)
   - [ ] Rank tier assignment working (12 tiers, 5 with multipliers)
   - [ ] Upstash credentials configured in Vercel Production
   - [ ] Rate limiting active
   - [ ] Cache layer not caching error responses

---

## 📚 REFERENCE: ScoringModule Contract Functions

**Key View Functions (for frontend queries):**

1. `getUserStats(address)` → (level, tier, score, multiplier)
2. `getLevelProgress(address)` → (level, xpIntoLevel, xpForLevel, xpToNext)
3. `getRankProgress(address)` → (tierIndex, pointsIntoTier, pointsToNext, hasMultiplier)
4. `getScoreBreakdown(address)` → (points, viral, quest, guild, referral, total)
5. `calculateLevel(uint256 points)` → level (pure function)
6. `getRankTier(uint256 points)` → tierIndex
7. `getMultiplier(uint8 tierIndex)` → multiplier in basis points

**Note:** All of these are indexed by Subsquid, so queries should use the indexed User entity fields, not call the contract directly (saves gas and provides instant response).

---

## 🚫 FALSE COMPLETION INDICATORS

**DO NOT mark as resolved if:**
- ❌ Errors still appear in logs but "it works for me locally"
- ❌ API returns 200 OK but logs show Subsquid failures
- ❌ "Fixed by clearing cache" (schema drift still exists)
- ❌ "Works in development" but fails in production (environment issue)
- ❌ "No errors in recent logs" without verifying queries return data

**Only mark resolved after:**
- ✅ Production deployment with fix
- ✅ Manual testing of affected endpoints
- ✅ Zero HTTP 400 errors in Vercel logs for 24 hours
- ✅ Complete data in all API responses
- ✅ UI components display correct user stats

---

## 📌 EVIDENCE SUMMARY

### **Confirmed Issues:**

| Issue | Severity | Status | Evidence | Contract Reference |
|-------|----------|--------|----------|-------------------|
| `totalXP` schema drift | 🔴 CRITICAL | ❌ UNRESOLVED | 5+ query locations, HTTP 400 errors | Should use `totalScore` from ScoringModule |
| Missing ScoringModule fields | 🟡 MEDIUM | ❌ UNRESOLVED | Queries don't include level, rankTier, multiplier | All fields exist in schema (Phase 3.2G) |
| Silent error swallowing | 🔴 CRITICAL | ✅ PARTIAL FIX | Returns empty arrays, logs warnings | Not contract-related |
| API contract violations | 🔴 CRITICAL | ❌ UNRESOLVED | 200 OK with internal failures | Not contract-related |
| Guild membership 400s | 🔴 CRITICAL | ❌ UNRESOLVED | Caused by totalXP drift | Fix: use totalScore |

### **Verified Correct (from ScoringModule Contract):**

| Item | Assessment | Contract Function | Deployed |
|------|------------|------------------|----------|
| totalScore field | ✅ CORRECT | `totalScore[user]` | ✅ Jan 1, 2026 |
| level calculation | ✅ CORRECT | `calculateLevel(totalScore)` | ✅ Jan 1, 2026 |
| rankTier (0-11) | ✅ CORRECT | `getRankTier(totalScore)` | ✅ Jan 1, 2026 |
| multiplier (1000-2000) | ✅ CORRECT | `getMultiplier(tierIndex)` | ✅ Jan 1, 2026 |
| Point breakdown | ✅ CORRECT | gmPoints, viralPoints, questPoints, guildPoints, referralPoints | ✅ Jan 1, 2026 |
| XP progression | ✅ CORRECT | `getLevelProgress()` | ✅ Jan 1, 2026 |
| Rank progression | ✅ CORRECT | `getRankProgress()` | ✅ Jan 1, 2026 |
| BigInt timestamps | ✅ CORRECT | Matches schema design | N/A |
| Upstash warning | ✅ EXPECTED | Intentional fallback for build | N/A |
| Caching layer | ✅ WORKING | No evidence of issues | N/A |

### **ScoringModule Contract Details:**

**Deployed:** Base Mainnet (~Dec 31, 2025 / Jan 1, 2026)  
**Purpose:** On-chain scoring system with level progression, rank tiers, and multipliers  
**Indexed by:** Subsquid (Phase 3.2G schema update)

**State Variables:**
- `totalScore[address]` - Sum of all point categories
- `userLevel[address]` - Current level (calculated from totalScore)
- `userRankTier[address]` - Tier index 0-11
- `scoringPointsBalance[address]` - GM/quest points
- `viralPoints[address]` - Farcaster engagement (oracle-updated)
- `questPoints[address]` - Off-chain quest completions
- `guildPoints[address]` - Guild activity
- `referralPoints[address]` - Referral bonuses

**Events Emitted:**
- `StatsUpdated(user, totalScore, level, rankTier, multiplier)` - Indexed by Subsquid
- `LevelUp(user, oldLevel, newLevel, totalScore)`
- `RankUp(user, oldTier, newTier, totalScore)`

---

**End of Corrected Audit Report**  
**Next Action:** Replace `totalXP` with `totalScore` and add full ScoringModule field support
