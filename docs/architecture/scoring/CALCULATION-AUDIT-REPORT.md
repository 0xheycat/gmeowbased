# Calculation Logic Audit Report

**Date**: December 20, 2025  
**Status**: ⚠️ DISCREPANCY FOUND

---

## Issue Summary

The documentation states one calculation flow, but the actual codebase has a **BROKEN** implementation that returns all zeros.

---

## DOCUMENTED Calculation (from SUBSQUID-SCHEMA-FIX-COMPLETE.md)

```
LAYER 3: APPLICATION (Next.js API)
Calculation: XP = Points (L2) + Viral Bonus (Supabase)
Derived:     Level, Rank from total XP
Response:    base_points, viral_xp, total_score
```

**Expected Flow**:
1. Get blockchain points from Subsquid (`User.totalPoints`)
2. Get viral bonus from Supabase (`viral_bonus_xp` table)
3. Calculate: `total_score = totalPoints + viral_bonus_xp`
4. Derive: `level`, `rank_tier` from `total_score`

---

## ACTUAL Implementation

### Current Code Flow (lib/profile/profile-service.ts)

```typescript
// Line 138: Fetch leaderboard data from Subsquid
const stats = await getLeaderboardEntry(fid)

// Line 144-146: Map response
total_score: stats.totalScore,    // ❌ PROBLEM: This is NULL
base_points: stats.basePoints,    // ❌ PROBLEM: This is NULL
viral_xp: stats.viralXP,          // ❌ PROBLEM: This is NULL

// Line 298: Calculate total score
const totalScore = (leaderboard?.total_score || 0) + viralBonusXP
```

### Why It's Broken

**File**: `lib/subsquid-client.ts` lines 216-234

```typescript
const USER_STATS_BY_FID_QUERY = `
  query GetUserStatsByFID($fid: Int!) {
    leaderboardEntries(where: { fid_eq: $fid }) {
      id
      wallet
      fid
      rank
      totalScore      // ❌ Field doesn't exist
      basePoints      // ❌ Field doesn't exist
      viralXP         // ❌ Field doesn't exist
      guildBonus      // ❌ Field doesn't exist
      ...
    }
  }
`
```

**Problem**: The query tries to get data from `leaderboardEntries` table, but:

1. **Schema Reality** (`gmeow-indexer/schema.graphql` lines 38-47):
```graphql
type LeaderboardEntry @entity {
  id: ID!
  user: User!
  rank: Int!
  totalPoints: BigInt!     # ✅ Only this exists
  weeklyPoints: BigInt!    # ✅ Only this exists
  monthlyPoints: BigInt!   # ✅ Only this exists
  updatedAt: DateTime!
}
```

2. **Data Reality**: `leaderboardEntries` table is **EMPTY** (never populated by processor)
```bash
curl http://localhost:4350/graphql -d '{"query":"{ leaderboardEntries { id } }"}'
# Result: { "data": { "leaderboardEntries": [] } }
```

3. **Result**: All queries return `null`, so:
   - `base_points = 0`
   - `viral_xp = 0`
   - `total_score = 0`
   - `level = 1` (default)
   - `rank_tier = "Signal Kitten"` (default)

---

## CORRECT Implementation (What Should Happen)

### Option 1: Query User Entity Directly

```typescript
const USER_STATS_BY_FID_QUERY = `
  query GetUserStatsByFID($fid: Int!) {
    # First, need to map FID → wallet address from Neynar
    # Then query User entity:
    users(where: { id_eq: $walletAddress }) {
      id                    # wallet address
      totalPoints           # ✅ Blockchain points
      currentStreak
      lifetimeGMs
      lastGMTimestamp
    }
  }
`
```

**Then in application**:
```typescript
// Get blockchain points from Subsquid
const user = await getUserByWallet(walletAddress)
const blockchainPoints = Number(user?.totalPoints || 0)

// Get viral bonus from Supabase
const { data: viral } = await supabase
  .from('viral_bonus_xp')
  .select('viral_bonus_xp')
  .eq('fid', fid)
  .single()
const viralXP = viral?.viral_bonus_xp || 0

// Calculate total score
const totalScore = blockchainPoints + viralXP

// Derive level & rank
const { level } = calculateLevelProgress(totalScore)
const rankTier = getRankTierByPoints(totalScore)

// Response
{
  base_points: blockchainPoints,   // From Subsquid User.totalPoints
  viral_xp: viralXP,               // From Supabase
  total_score: totalScore,         // Calculated
  level: level,                    // Calculated
  rank_tier: rankTier              // Calculated
}
```

### Option 2: Populate LeaderboardEntry Table

Add processor logic in `gmeow-indexer/src/main.ts` to:

1. Query Supabase for viral bonuses (requires HTTP call)
2. Calculate `totalScore = user.totalPoints + viralBonus`
3. Store in `LeaderboardEntry` with all breakdown fields
4. Update on every GM event

**Cons**: 
- Requires Subsquid → Supabase HTTP calls (slow, coupling)
- Duplicates viral_xp data
- More complex indexer logic

---

## CURRENT WORKAROUND

The profile endpoint still returns zeros but doesn't crash because of fallback values:

```typescript
// lib/profile/profile-service.ts line 325-335
stats: {
  base_points: leaderboard?.base_points || 0,   // Falls back to 0
  viral_xp: viralBonusXP,                       // Gets from Supabase correctly
  total_score: totalScore,                      // = 0 + viralXP
  level: levelProgress.level,                   // Calculates from total (works)
  rank_tier: rankTier.name,                     // Calculates from total (works)
}
```

**Result**: 
- `base_points` always shows 0 (incorrect!)
- `viral_xp` works (correct)
- `total_score` = viral_xp only (incorrect - missing blockchain points!)
- `level` and `rank_tier` calculated from incomplete total (incorrect!)

---

## Test Evidence

**User Profile API Response** (FID 18139):
```json
{
  "stats": {
    "base_points": 0,        // ❌ Should show blockchain points
    "viral_xp": 0,           // ✅ Correct (user has no viral casts)
    "total_score": 0,        // ❌ Missing blockchain points
    "level": 1,              // ❌ Default because total_score is 0
    "rank_tier": "Signal Kitten"  // ❌ Default tier
  }
}
```

**Subsquid Data Verification**:
```bash
# User data EXISTS
curl http://localhost:4350/graphql -d '{"query":"{ users(limit:1) { totalPoints } }"}'
# Result: { "totalPoints": "1" } ✅

# LeaderboardEntry is EMPTY
curl http://localhost:4350/graphql -d '{"query":"{ leaderboardEntries { id } }"}'
# Result: { "leaderboardEntries": [] } ❌
```

---

## Root Cause

1. **Schema Design**: `LeaderboardEntry` was created but never populated
2. **Query Mismatch**: Code queries non-existent fields (`basePoints`, `viralXP`)
3. **No FID Index**: `User` entity uses wallet address as ID, not FID
4. **Missing Processor**: No logic to create `LeaderboardEntry` records

---

## Recommended Fix

### IMMEDIATE (Fix broken queries):

**File**: `lib/subsquid-client.ts`

```typescript
// NEW: Query User entity by wallet address
async getUserStatsByWallet(wallet: string): Promise<UserStats | null> {
  const query = `
    query GetUserByWallet($wallet: String!) {
      users(where: { id_eq: $wallet }) {
        id
        totalPoints
        currentStreak
        lifetimeGMs
        lastGMTimestamp
      }
    }
  `
  
  const data = await this.query<{ users: any[] }>(query, { wallet: wallet.toLowerCase() })
  const user = data?.users?.[0]
  if (!user) return null
  
  return {
    wallet: user.id,
    totalScore: Number(user.totalPoints),
    basePoints: Number(user.totalPoints),  // Same as totalPoints
    viralXP: 0,  // Must be fetched from Supabase separately
    // ... rest set to 0
  }
}

// UPDATE: getUserStatsByFID to use Neynar wallet lookup first
async getUserStatsByFID(fid: number): Promise<UserStats | null> {
  // 1. Get wallet from Neynar
  const neynarUser = await fetchUserByFid(fid)
  if (!neynarUser?.custody_address) return null
  
  // 2. Query User entity by wallet
  return this.getUserStatsByWallet(neynarUser.custody_address)
}
```

**File**: `lib/profile/profile-service.ts`

```typescript
// Line 298: FIX calculation
const blockchainPoints = leaderboard?.base_points || 0  // From Subsquid User.totalPoints
const viralXP = viralBonusXP  // From Supabase badge_casts
const totalScore = blockchainPoints + viralXP

// Line 325: Use correct values
stats: {
  base_points: blockchainPoints,  // ✅ Actual blockchain points
  viral_xp: viralXP,              // ✅ Actual viral bonus
  total_score: totalScore,        // ✅ Correct sum
  level: calculateLevelProgress(totalScore).level,
  rank_tier: getRankTierByPoints(totalScore).name,
}
```

### FUTURE (Proper leaderboard):

1. Create processor to populate `LeaderboardEntry` table
2. Run hourly cron to recalculate rankings
3. Query leaderboard directly for fast reads

---

## Impact

**Current State**:
- ❌ User profiles show 0 points (data loss)
- ❌ Leaderboards empty
- ❌ Rankings incorrect
- ❌ Level/tier calculations wrong

**After Fix**:
- ✅ Shows actual blockchain points
- ✅ Correct viral XP bonus
- ✅ Accurate total scores
- ✅ Proper level/tier calculations

---

## Action Items

- [ ] Update Subsquid client queries (use `User` entity)
- [ ] Add Neynar wallet lookup in `getUserStatsByFID`
- [ ] Fix calculation in profile-service.ts
- [ ] Test with real user data
- [ ] Update documentation to match implementation
- [ ] Consider adding FID → wallet mapping table in Subsquid

---

**Status**: CRITICAL - All user stats are currently returning zeros  
**Priority**: HIGH - Breaks core game mechanics
