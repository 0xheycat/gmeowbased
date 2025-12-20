# Complete Calculation System Documentation

**Date**: December 20, 2025  
**Purpose**: Unified documentation of ALL calculation logic across the codebase

---

## Overview

The calculation system has **3 calculation layers** and **4 source files**:

### Calculation Files:
1. **`lib/leaderboard/rank.ts`** - Level progression, XP, Rank tiers (12-tier system)
2. **`lib/viral/viral-bonus.ts`** - Viral engagement scoring & XP bonus
3. **`lib/profile/stats-calculator.ts`** - Profile stats formatting & display
4. **`lib/profile/profile-service.ts`** - Data fetching & aggregation (MAIN ORCHESTRATOR)

### Data Sources:
1. **LAYER 1 (Blockchain)**: Subsquid indexer → `User.totalPoints` (on-chain)
2. **LAYER 2 (Off-chain)**: Supabase → `badge_casts.viral_bonus_xp` (social engagement)
3. **LAYER 3 (Calculated)**: Application logic → Level, Rank, Multipliers

---

## COMPLETE CALCULATION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: FETCH BLOCKCHAIN POINTS (Subsquid)                     │
├─────────────────────────────────────────────────────────────────┤
│ Query: User entity by wallet address                           │
│ Field: User.totalPoints (BigInt)                               │
│ Source: GM events, Quest completions, Tips (on-chain)          │
│                                                                 │
│ Result: blockchainPoints = Number(user.totalPoints)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: FETCH VIRAL BONUS (Supabase)                           │
├─────────────────────────────────────────────────────────────────┤
│ Query: badge_casts table (aggregate by FID)                    │
│ Field: viral_bonus_xp (calculated from likes/recasts/replies)  │
│ Calculation: lib/viral/viral-bonus.ts                          │
│                                                                 │
│ Formula:                                                        │
│   engagementScore = (recasts × 10) + (replies × 5) + (likes × 2)│
│   tier = getViralTier(engagementScore)                         │
│   viralXP = tier.xp (0, 25, 50, 100, 250, 500)                │
│                                                                 │
│ Result: viralBonusXP = SUM(badge_casts.viral_bonus_xp)         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: CALCULATE TOTAL SCORE (Application)                    │
├─────────────────────────────────────────────────────────────────┤
│ Formula:                                                        │
│   totalScore = blockchainPoints + viralBonusXP                 │
│                                                                 │
│ Example:                                                        │
│   blockchainPoints = 1000 (from GM events)                     │
│   viralBonusXP = 250 (viral tier bonus)                        │
│   totalScore = 1250                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: CALCULATE LEVEL (lib/leaderboard/rank.ts)              │
├─────────────────────────────────────────────────────────────────┤
│ Function: calculateLevelProgress(totalScore)                   │
│                                                                 │
│ Formula (Quadratic Progression):                               │
│   LEVEL_XP_BASE = 300                                          │
│   LEVEL_XP_INCREMENT = 200                                     │
│   xpForLevel(n) = 300 + (n-1) × 200                           │
│                                                                 │
│ Level Requirements:                                             │
│   Level 1: 0 XP                                                │
│   Level 2: 300 XP                                              │
│   Level 3: 800 XP (300 + 500)                                 │
│   Level 4: 1500 XP (300 + 500 + 700)                          │
│   Level n: ∑(300 + (i-1)×200) for i=1 to n-1                  │
│                                                                 │
│ Result:                                                         │
│   {                                                             │
│     level: 4,                                                  │
│     levelFloor: 800,                                           │
│     nextLevelTarget: 1500,                                     │
│     xpIntoLevel: 450,                                          │
│     xpToNextLevel: 250,                                        │
│     levelPercent: 0.64 (64%)                                   │
│   }                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: CALCULATE RANK TIER (lib/leaderboard/rank.ts)          │
├─────────────────────────────────────────────────────────────────┤
│ Function: getRankTierByPoints(totalScore)                      │
│                                                                 │
│ 12-Tier System (IMPROVED_RANK_TIERS):                          │
│                                                                 │
│ BEGINNER (0-5K):                                               │
│   1. Signal Kitten      (0-500)     - First Steps Badge       │
│   2. Warp Scout         (500-1.5K)  - Explorer Badge          │
│   3. Beacon Runner      (1.5K-4K)   - +10% Quest XP Multiplier│
│                                                                 │
│ INTERMEDIATE (4K-25K):                                         │
│   4. Night Operator     (4K-8K)     - Streak Master Badge     │
│   5. Star Captain       (8K-15K)    - +20% Quest XP Multiplier│
│   6. Nebula Commander   (15K-25K)   - Guild Founder Badge     │
│                                                                 │
│ ADVANCED (25K-100K):                                           │
│   7. Quantum Navigator  (25K-40K)   - +30% Quest XP Multiplier│
│   8. Cosmic Architect   (40K-60K)   - System Builder Badge    │
│   9. Void Walker        (60K-100K)  - +50% Quest XP Multiplier│
│                                                                 │
│ LEGENDARY (100K+):                                             │
│   10. Singularity Prime (100K-250K) - Legendary Pilot Badge   │
│   11. Infinite GM       (250K-500K) - +100% Quest XP Multiplier│
│   12. Omniversal Being  (500K+)     - Custom Role + Discord   │
│                                                                 │
│ Result:                                                         │
│   {                                                             │
│     name: "Beacon Runner",                                     │
│     minPoints: 1500,                                           │
│     maxPoints: 4000,                                           │
│     tier: "beginner",                                          │
│     icon: "flash",                                             │
│     colorClass: "text-accent-green",                           │
│     reward: { type: "multiplier", value: 1.1 }                │
│   }                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: APPLY RANK MULTIPLIER (lib/leaderboard/rank.ts)        │
├─────────────────────────────────────────────────────────────────┤
│ Function: applyRankMultiplier(baseXP, currentPoints)           │
│                                                                 │
│ Logic:                                                          │
│   1. Get current rank tier from totalScore                     │
│   2. Check if tier has multiplier reward                       │
│   3. Multiply XP earnings by tier multiplier                   │
│                                                                 │
│ Example:                                                        │
│   User has 1250 totalScore → Beacon Runner tier               │
│   Beacon Runner reward: { type: "multiplier", value: 1.1 }    │
│   Base quest XP: 100                                           │
│   Multiplied XP: 100 × 1.1 = 110                              │
│                                                                 │
│ Tier Multipliers:                                              │
│   Beacon Runner:       1.1x  (+10%)                            │
│   Star Captain:        1.2x  (+20%)                            │
│   Quantum Navigator:   1.3x  (+30%)                            │
│   Void Walker:         1.5x  (+50%)                            │
│   Infinite GM:         2.0x  (+100%)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: FINAL RESPONSE (lib/profile/profile-service.ts)        │
├─────────────────────────────────────────────────────────────────┤
│ Response Structure:                                             │
│ {                                                               │
│   stats: {                                                      │
│     // SOURCE: Blockchain (Subsquid User.totalPoints)          │
│     base_points: 1000,                                         │
│                                                                 │
│     // SOURCE: Supabase (SUM of badge_casts.viral_bonus_xp)    │
│     viral_xp: 250,                                             │
│                                                                 │
│     // CALCULATED: base_points + viral_xp                      │
│     total_score: 1250,                                         │
│                                                                 │
│     // CALCULATED: from total_score using rank.ts              │
│     level: 4,                                                  │
│     rank_tier: "Beacon Runner",                                │
│                                                                 │
│     // Additional stats from Subsquid                          │
│     streak_bonus: 0,    // User.currentStreak                 │
│     guild_bonus: 0,     // From guild membership              │
│     referral_bonus: 0,  // From referral system               │
│     badge_prestige: 0,  // From badge staking                 │
│                                                                 │
│     // Activity counts from Supabase                           │
│     quest_completions: 5,  // Count from quest_completions    │
│     badge_count: 3,        // Count from user_badges          │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## DETAILED FUNCTION BREAKDOWN

### 1. Blockchain Points (Subsquid)

**File**: `lib/subsquid-client.ts` (NEEDS FIX)

**Current (BROKEN)**:
```typescript
// ❌ Queries non-existent LeaderboardEntry fields
getUserStatsByFID(fid: number) {
  query: `leaderboardEntries { totalScore, basePoints, viralXP }`
  // Returns null - table empty and fields don't exist
}
```

**Should Be**:
```typescript
// ✅ Query User entity directly
async getUserStatsByWallet(wallet: string) {
  const query = `
    query GetUserByWallet($wallet: String!) {
      users(where: { id_eq: $wallet }) {
        id                    # Wallet address
        totalPoints           # ✅ Blockchain points (GM + Quests + Tips)
        currentStreak         # Streak days
        lifetimeGMs           # Total GM count
        lastGMTimestamp       # Last GM time
      }
    }
  `
  
  const data = await this.query(query, { wallet: wallet.toLowerCase() })
  const user = data?.users?.[0]
  
  return {
    wallet: user.id,
    totalPoints: Number(user.totalPoints || 0),
    currentStreak: user.currentStreak || 0,
    lifetimeGMs: user.lifetimeGMs || 0,
  }
}

// Map FID → wallet using Neynar first
async getUserStatsByFID(fid: number) {
  const neynarUser = await fetchUserByFid(fid)
  if (!neynarUser?.custody_address) return null
  
  return this.getUserStatsByWallet(neynarUser.custody_address)
}
```

---

### 2. Viral Bonus Calculation (Supabase + lib/viral/viral-bonus.ts)

**Engagement Score Formula**:
```typescript
// lib/viral/viral-bonus.ts
const ENGAGEMENT_WEIGHTS = {
  RECAST: 10,   // Amplification weight
  REPLY: 5,     // Conversation weight
  LIKE: 2,      // Approval weight
}

function calculateEngagementScore(metrics: {
  likes: number
  recasts: number
  replies: number
}): number {
  return (
    (metrics.recasts × 10) +
    (metrics.replies × 5) +
    (metrics.likes × 2)
  )
}
```

**Viral Tier Mapping**:
```typescript
const VIRAL_TIERS = {
  mega_viral: { minScore: 100, xp: 500 },  // 🔥 10 recasts or 50 likes
  viral:      { minScore: 50,  xp: 250 },  // ⚡ 5 recasts or 25 likes
  popular:    { minScore: 20,  xp: 100 },  // ✨ 2 recasts or 10 likes
  engaging:   { minScore: 10,  xp: 50 },   // 💫 1 recast or 5 likes
  active:     { minScore: 5,   xp: 25 },   // 🌟 3 likes
  none:       { minScore: 0,   xp: 0 },    // No engagement
}
```

**Example**:
```typescript
// Cast has: 15 likes, 3 recasts, 2 replies
const score = (3 × 10) + (2 × 5) + (15 × 2) = 30 + 10 + 30 = 70
// Score 70 → "viral" tier → 250 XP bonus
```

**Aggregate from Supabase**:
```typescript
// lib/profile/profile-service.ts
const { data: viralCasts } = await supabase
  .from('badge_casts')
  .select('viral_bonus_xp')
  .eq('fid', fid)

const viralBonusXP = viralCasts?.reduce((sum, cast) => 
  sum + (cast.viral_bonus_xp || 0), 0
) || 0
```

---

### 3. Total Score Calculation

**File**: `lib/profile/profile-service.ts` line 298

```typescript
// CURRENT (BROKEN):
const totalScore = (leaderboard?.total_score || 0) + viralBonusXP
// leaderboard.total_score is NULL because Subsquid query fails

// SHOULD BE:
const blockchainPoints = Number(subsquidUser?.totalPoints || 0)  // From Subsquid
const viralXP = viralBonusXP  // From Supabase (already calculated)
const totalScore = blockchainPoints + viralXP

// Breakdown for response:
stats: {
  base_points: blockchainPoints,   // ✅ Actual on-chain points
  viral_xp: viralXP,               // ✅ Social engagement bonus
  total_score: totalScore,         // ✅ Combined total
}
```

---

### 4. Level Calculation (lib/leaderboard/rank.ts)

**Quadratic Level Progression**:
```typescript
// Constants
const LEVEL_XP_BASE = 300        // XP for level 1→2
const LEVEL_XP_INCREMENT = 200   // Additional XP per level

// XP required for each level
function getXpForLevel(level: number): number {
  return LEVEL_XP_BASE + (level - 1) * LEVEL_XP_INCREMENT
}

// Level progression table:
// Level 1→2: 300 XP
// Level 2→3: 500 XP (300 + 200)
// Level 3→4: 700 XP (300 + 400)
// Level 4→5: 900 XP (300 + 600)
// Level n→n+1: 300 + (n-1)×200 XP

// Total XP to reach level n
function getTotalXpToReachLevel(level: number): number {
  const n = level - 1
  return (LEVEL_XP_INCREMENT/2) * n * n + 
         ((2*LEVEL_XP_BASE - LEVEL_XP_INCREMENT)/2) * n
}
```

**Example Calculation**:
```typescript
// User has 1250 total score
const levelData = calculateLevelProgress(1250)

// Returns:
{
  level: 4,              // Current level
  levelFloor: 800,       // XP at start of level 4
  nextLevelTarget: 1500, // XP needed for level 5
  xpIntoLevel: 450,      // Progress into level 4 (1250 - 800)
  xpForLevel: 700,       // XP needed for level 4→5
  xpToNextLevel: 250,    // XP remaining (1500 - 1250)
  levelPercent: 0.64     // 64% progress (450/700)
}
```

---

### 5. Rank Tier & Multipliers (lib/leaderboard/rank.ts)

**12-Tier System with Rewards**:

```typescript
const IMPROVED_RANK_TIERS = [
  // BEGINNER (0-5K)
  { 
    name: 'Signal Kitten', 
    minPoints: 0, 
    maxPoints: 500,
    reward: { type: 'badge', name: 'First Steps' }
  },
  { 
    name: 'Warp Scout', 
    minPoints: 500, 
    maxPoints: 1500,
    reward: { type: 'badge', name: 'Explorer' }
  },
  { 
    name: 'Beacon Runner', 
    minPoints: 1500, 
    maxPoints: 4000,
    reward: { type: 'multiplier', value: 1.1 }  // +10% XP
  },
  
  // INTERMEDIATE (4K-25K)
  { 
    name: 'Night Operator', 
    minPoints: 4000, 
    maxPoints: 8000,
    reward: { type: 'badge', name: 'Streak Master' }
  },
  { 
    name: 'Star Captain', 
    minPoints: 8000, 
    maxPoints: 15000,
    reward: { type: 'multiplier', value: 1.2 }  // +20% XP
  },
  // ... more tiers
]
```

**Multiplier Application**:
```typescript
// User earns 100 XP from quest
const baseXP = 100
const userTotalScore = 1250

const tier = getImprovedRankTierByPoints(userTotalScore)
// tier = "Beacon Runner" with 1.1x multiplier

const finalXP = applyRankMultiplier(baseXP, userTotalScore)
// finalXP = 100 × 1.1 = 110 XP
```

---

### 6. Stats Display Formatting (lib/profile/stats-calculator.ts)

```typescript
// Format numbers for display
export function calculateStats(stats: ProfileStats) {
  // Calculate level from total_score
  const levelData = calculateLevel(stats.total_score)
  
  // Calculate rank tier
  const rankTier = calculateRankTier(stats.base_points)
  
  // Calculate streak from streak_bonus (10 points per day)
  const streak = Math.floor(stats.streak_bonus / 10)
  
  return {
    level: levelData.level,
    levelPercent: levelData.percent,
    xpToNextLevel: levelData.xpToNext,
    rankTier: stats.rank_tier || rankTier,
    streak,
    totalScore: stats.total_score,
    formattedStats: {
      base_points: formatNumber(stats.base_points),    // "1,000"
      viral_xp: formatNumber(stats.viral_xp),          // "250"
      total_score: formatNumber(stats.total_score),    // "1,250"
    },
    rankProgress: levelData.rankProgress,
  }
}
```

---

## COMPLETE EXAMPLE WALKTHROUGH

**User**: FID 18139

### Input Data:
```typescript
// From Subsquid User entity
blockchainPoints = 1000  // GM events + Quest completions

// From Supabase badge_casts
viralCasts = [
  { cast_hash: "0xabc", viral_bonus_xp: 100 },  // Popular cast
  { cast_hash: "0xdef", viral_bonus_xp: 250 },  // Viral cast
]
viralBonusXP = 100 + 250 = 350
```

### Step-by-Step Calculation:

**STEP 1**: Total Score
```typescript
totalScore = blockchainPoints + viralBonusXP
           = 1000 + 350
           = 1350
```

**STEP 2**: Level Calculation
```typescript
calculateLevelProgress(1350)

// Level progression check:
// Level 1: 0 XP
// Level 2: 300 XP  
// Level 3: 800 XP  ← User passed this
// Level 4: 1500 XP ← User in this range
// Level 5: 2300 XP

// User is at level 4
level = 4
levelFloor = 800
nextLevelTarget = 1500
xpIntoLevel = 1350 - 800 = 550
xpForLevel = 1500 - 800 = 700
xpToNextLevel = 1500 - 1350 = 150
levelPercent = 550 / 700 = 0.786 (78.6%)
```

**STEP 3**: Rank Tier
```typescript
getImprovedRankTierByPoints(1350)

// Check tiers:
// Signal Kitten: 0-500     ← passed
// Warp Scout: 500-1500     ← current! (1350 is in this range)
// Beacon Runner: 1500-4000

tier = {
  name: "Warp Scout",
  minPoints: 500,
  maxPoints: 1500,
  reward: { type: 'badge', name: 'Explorer' }
}
```

**STEP 4**: Next Quest XP (with multiplier)
```typescript
// User completes a quest worth 100 XP
baseQuestXP = 100

// Check if current tier has multiplier
// Warp Scout has no multiplier (only badge reward)
// User needs to reach Beacon Runner (1500) for 1.1x multiplier

earnedXP = 100  // No multiplier yet
newTotalScore = 1350 + 100 = 1450
```

**STEP 5**: Progress to Next Tier
```typescript
getNextTierReward(1350)

nextTier = {
  name: "Beacon Runner",
  minPoints: 1500,
  reward: { type: 'multiplier', value: 1.1 }
}
pointsNeeded = 1500 - 1350 = 150

// After earning 100 XP: 1450 / 1500 = 96.7% to next tier!
```

### Final API Response:
```json
{
  "stats": {
    "base_points": 1000,        // Blockchain (Subsquid)
    "viral_xp": 350,            // Social (Supabase)
    "total_score": 1350,        // Calculated
    "level": 4,                 // Calculated
    "level_percent": 78.6,      // Calculated
    "xp_to_next_level": 150,    // Calculated
    "rank_tier": "Warp Scout",  // Calculated
    "next_tier": "Beacon Runner", // Calculated
    "points_to_next_tier": 150, // Calculated
    "next_reward": "+10% Quest XP", // From tier config
    "streak_bonus": 0,
    "guild_bonus": 0,
    "referral_bonus": 0,
    "badge_prestige": 0,
    "quest_completions": 5,
    "badge_count": 3
  }
}
```

---

## CRITICAL ISSUES & FIXES

### Issue 1: Subsquid Query Broken

**Problem**: Code queries `leaderboardEntries` table which is empty and missing fields

**Fix**:
```typescript
// lib/subsquid-client.ts

// NEW: Query User entity directly
async getUserStatsByWallet(wallet: string): Promise<UserStats | null> {
  const query = `
    query GetUserByWallet($wallet: String!) {
      users(where: { id_eq: $wallet }) {
        id
        totalPoints
        currentStreak
        lifetimeGMs
      }
    }
  `
  // ... implementation
}

// UPDATE: Map FID → wallet first
async getUserStatsByFID(fid: number): Promise<UserStats | null> {
  // 1. Fetch wallet from Neynar
  const neynarUser = await fetchUserByFid(fid)
  if (!neynarUser?.custody_address) return null
  
  // 2. Query Subsquid User entity
  return this.getUserStatsByWallet(neynarUser.custody_address)
}
```

### Issue 2: Missing Total Score Calculation

**Problem**: `totalScore` uses broken Subsquid data

**Fix**:
```typescript
// lib/profile/profile-service.ts line 298

// OLD (BROKEN):
const totalScore = (leaderboard?.total_score || 0) + viralBonusXP

// NEW (CORRECT):
const blockchainPoints = Number(subsquidUser?.totalPoints || 0)
const viralXP = viralBonusXP  // Already aggregated from badge_casts
const totalScore = blockchainPoints + viralXP

// Response:
stats: {
  base_points: blockchainPoints,  // ✅ From Subsquid User.totalPoints
  viral_xp: viralXP,              // ✅ From Supabase badge_casts
  total_score: totalScore,        // ✅ Correctly calculated
}
```

---

## SUMMARY

### Data Flow:
1. **Blockchain** → Subsquid `User.totalPoints` → `base_points`
2. **Social** → Supabase `badge_casts.viral_bonus_xp` → `viral_xp`
3. **Calculate** → `total_score = base_points + viral_xp`
4. **Derive** → Level (from total_score) using quadratic formula
5. **Derive** → Rank tier (from total_score) using 12-tier system
6. **Apply** → Multipliers to future XP earnings

### Files Involved:
- `lib/subsquid-client.ts` - Fetch blockchain points (NEEDS FIX)
- `lib/profile/profile-service.ts` - Orchestrate all calculations (NEEDS FIX)
- `lib/viral/viral-bonus.ts` - Viral engagement scoring (✅ CORRECT)
- `lib/leaderboard/rank.ts` - Level & rank calculations (✅ CORRECT)
- `lib/profile/stats-calculator.ts` - Display formatting (✅ CORRECT)

### Next Steps:
1. Fix Subsquid client to query `User` entity
2. Update profile-service.ts calculation logic
3. Test with real user data
4. Verify multipliers apply correctly to new XP
