# Points & Event Naming Convention - Contract as Source of Truth

**Created:** December 22, 2025  
**Updated:** December 22, 2025 (Complete 3-Core Audit)  
**Purpose:** Use **contract names** as immutable source of truth. Rename all 3 cores (Subsquid, Supabase, API) to match.

## 🎯 CORE PRINCIPLE

**CONTRACT NAMES = IMMUTABLE SOURCE OF TRUTH** (on-chain, deployed, cannot change)

All other layers MUST use contract naming:
- **Subsquid**: Use exact contract names (pointsBalance, pointsEarned, rewardPoints)
- **Supabase**: Use snake_case version of contract names (points_balance, points_earned, reward_points)
- **API/Types**: Use camelCase version of contract names (pointsBalance, pointsEarned, rewardPoints)

---

## 📊 COMPLETE EVENT & FIELD AUDIT

### Layer 1: Smart Contract (GmeowCore.sol) - IMMUTABLE SOURCE OF TRUTH

**Storage Variables:**
```solidity
mapping(address => uint256) public pointsBalance;  // Current spendable balance
mapping(address => uint256) public pointsLocked;   // Points locked in activities
```

**Events with Point Fields:**
```solidity
event GMSent(address indexed user, uint256 streak, uint256 pointsEarned);
event GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak);
event PointsDeposited(address indexed who, uint256 amount);
event PointsWithdrawn(address indexed who, uint256 amount);
event PointsTipped(address indexed from, address indexed to, uint256 points, uint256 fid);
event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, ...);
```

**Contract Field Names (IMMUTABLE):**
- `pointsBalance` - Current spendable balance (storage)
- `pointsLocked` - Points locked in activities (storage)
- `pointsEarned` - Points earned from GM (GMSent event)
- `rewardPoints` - Reward points from action (GMEvent, quest events)
- `amount` - Generic amount (deposit/withdrawal events)
- `points` - Generic points (tip/transfer events)
- `pointsAwarded` - Quest completion reward (QuestCompleted event)

---

### Layer 2a: Subsquid Indexer - AUDIT RESULTS

**Current Names:**
```typescript
// User Model (gmeow-indexer/src/model/generated/user.model.ts)
@BigIntColumn_() pointsBalance!: bigint              // ✅ MATCHES contract
@BigIntColumn_() totalEarnedFromGMs!: bigint         // ❌ NOT in contract (tracking)

// Guild Model
@BigIntColumn_() totalPoints!: bigint                // ❌ Should be pointsBalance or treasuryPoints

// Quest Model
@BigIntColumn_() totalPointsAwarded!: bigint         // ❌ Should be pointsAwarded

// DailyStats Model
@BigIntColumn_() totalPointsAwarded!: bigint         // ❌ Should be pointsAwarded

// LeaderboardEntry Model (DEPRECATED)
@BigIntColumn_() totalPoints!: bigint                // ❌ Should be totalScore
```

**Issues Found:**
1. ✅ `User.pointsBalance` matches contract ✅
2. ❌ `totalEarnedFromGMs` not in contract (custom tracking - OK but needs documentation)
3. ❌ `Guild.totalPoints` ambiguous (should be `treasuryPoints` or `totalContributions`)
4. ❌ `totalPointsAwarded` should match event name `pointsAwarded`
5. ❌ `LeaderboardEntry.totalPoints` should be `totalScore` (calculated, not contract)

---

### Layer 2b: Supabase Database - AUDIT RESULTS

**Current Names:**
```sql
-- user_profiles
points                 bigint     -- ❌ Should be points_balance
total_points_earned    bigint     -- ❌ Should be total_earned_from_gms
total_points_spent     bigint     -- ✅ OK (off-chain tracking)
xp                     bigint     -- ❌ DEPRECATED (unused)

-- badge_casts
viral_bonus_xp         integer    -- ✅ OK (off-chain only)
viral_score            numeric    -- ✅ OK (off-chain only)
viral_tier             text       -- ✅ OK (off-chain only)

-- quest_definitions
reward_xp              integer    -- ❌ Should be reward_points_balance
reward_points          integer    -- ❌ Ambiguous (points_awarded vs points_balance?)
reward_badges          text[]     -- ✅ OK

-- quest_completions
points_awarded         bigint     -- ✅ MATCHES contract event

-- unified_quests
reward_points          bigint     -- ❌ Should be points_awarded
total_completions      bigint     -- ✅ OK
total_earned_points    bigint     -- ❌ Should be total_points_awarded

-- guild_member_stats_cache
points_contributed     bigint     -- ✅ OK (specific enough)
total_score            bigint     -- ✅ OK (calculated, not contract)

-- referral_stats
points_earned          integer    -- ❌ Should be points_awarded

-- points_transactions
amount                 bigint     -- ✅ MATCHES contract event
balance_after          bigint     -- ❌ Should be points_balance_after

-- user_points_balances
base_points            bigint     -- ❌ Should be points_balance
viral_xp               bigint     -- ✅ OK (off-chain)
guild_bonus            bigint     -- ❌ Should be guild_points_awarded
total_points           bigint     -- ❌ Should be total_score

-- reward_claims
viral_xp_claimed       bigint     -- ❌ Should be viral_points_claimed
guild_bonus_claimed    bigint     -- ❌ Should be guild_points_claimed
total_claimed          bigint     -- ❌ Should be total_points_claimed
```

**Issues Found:**
1. ❌ `user_profiles.points` should be `points_balance` (matches contract)
2. ❌ `user_profiles.total_points_earned` should be `total_earned_from_gms` (matches Subsquid)
3. ❌ `user_profiles.xp` is deprecated and unused (remove column)
4. ❌ `reward_xp` should be `reward_points` or `points_awarded`
5. ❌ Mixing `points_earned` vs `points_awarded` (use `points_awarded` consistently)
6. ❌ `base_points` should be `points_balance`
7. ❌ `viral_xp` is fine for off-chain, but mixing XP/points terminology
8. ❌ `total_points` should be `total_score` (calculated field)

---

### Layer 3: API & Type Definitions - AUDIT RESULTS

**Current Names (unified-calculator.ts):**
```typescript
export type TotalScore = {
  blockchainPoints: number   // ❌ Should be pointsBalance (from contract)
  viralXP: number            // ❌ Should be viralPoints (consistent terminology)
  questPoints: number        // ✅ OK (generic enough)
  guildPoints: number        // ✅ OK (generic enough)
  referralPoints: number     // ✅ OK (generic enough)
  totalScore: number         // ✅ OK (calculated sum)
}
```

**Issues Found:**
1. ❌ `blockchainPoints` should be `pointsBalance` (matches contract storage)
2. ❌ `viralXP` should be `viralPoints` (consistent points terminology)
3. ✅ `totalScore` is OK (calculated field, not in contract)

---
## 🎯 COMPLETE CALCULATION SYSTEM ARCHITECTURE

### Overview: 3-Layer Points System

**The system separates concerns across 3 distinct layers:**

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: BLOCKCHAIN (Immutable Source of Truth)                │
├─────────────────────────────────────────────────────────────────┤
│ Contract: GmeowCore.sol                                         │
│ Storage:  pointsBalance (uint256) - Current spendable          │
│ Events:   GMSent, PointsDeposited, PointsWithdrawn, etc.       │
│ Indexer:  Subsquid → User.pointsBalance (mirrors contract)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: OFF-CHAIN DATABASE (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│ viral_points      - Badge cast engagement (calculated)         │
│ quest_points      - Quest completions (website)                │
│ guild_points      - Guild activity bonuses (website)           │
│ referral_points   - Referral rewards (bot API)                 │
│                                                                 │
│ NOTE: These are SEPARATE from blockchain points                │
│       They track off-chain activities                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: CALCULATION LOGIC (unified-calculator.ts)             │
├─────────────────────────────────────────────────────────────────┤
│ totalScore = pointsBalance + viralPoints + questPoints +       │
│              guildPoints + referralPoints                      │
│                                                                 │
│ level = calculateLevelProgress(totalScore)                     │
│   Formula: Quadratic progression (300 + n×200 XP/level)        │
│   Example: Lvl 1→2 = 300 XP, Lvl 2→3 = 500 XP, Lvl 3→4 = 700  │
│                                                                 │
│ rankTier = getRankTierByPoints(totalScore)                     │
│   12 tiers: Signal Kitten → Omniversal Being                   │
│   Thresholds: 0, 500, 1500, 4000, 8000, 15000, 30000, ...     │
│                                                                 │
│ multiplier = getRankMultiplier(rankTier)                       │
│   Range: 1.0x to 2.0x based on rank tier                       │
│   Applied to: Quest rewards, viral XP                          │
└─────────────────────────────────────────────────────────────────┘
```

### Critical Distinction: pointsBalance vs totalScore

**❌ COMMON MISTAKE:** Treating these as the same thing

```typescript
// WRONG - These are DIFFERENT concepts
pointsBalance === totalScore  // FALSE!

// CORRECT - Understand the difference
pointsBalance = contract storage (on-chain only)
totalScore = pointsBalance + viralPoints + questPoints + guildPoints + referralPoints
```

**Example:**
```typescript
User has:
  - pointsBalance: 5000 (from blockchain GM rewards)
  - viralPoints: 1500 (from badge cast engagement)
  - questPoints: 500 (from quest completions)
  - guildPoints: 200 (from guild bonuses)
  - referralPoints: 300 (from referrals)

Result:
  - pointsBalance: 5000 ← contract storage
  - totalScore: 7500 ← calculated sum (used for level/rank)
```

### Multi-Wallet Aggregation (Layer 2.5)

**Users can have multiple wallets. API aggregates all wallets:**

```typescript
// User Profile in Supabase
{
  fid: 18139,
  wallet_address: "0x1234...",      // Connected wallet
  custody_address: "0x5678...",     // Farcaster custody
  verified_addresses: ["0x9abc..."] // Additional wallets
}

// Subsquid Data (3 separate User records)
User { id: "0x1234...", pointsBalance: 5000n }
User { id: "0x5678...", pointsBalance: 3000n }
User { id: "0x9abc...", pointsBalance: 2000n }

// API Response (aggregated)
{
  pointsBalance: 10000,  // 5000 + 3000 + 2000
  viralPoints: 1500,
  totalScore: 11500,
  metadata: {
    multiWallet: {
      walletCount: 3,
      wallets: ["0x1234...", "0x5678...", "0x9abc..."],
      walletsSuccessful: 3
    }
  }
}
```

---

## 📊 LEVEL PROGRESSION SYSTEM

### Quadratic Formula (300 + n×200)

**XP required for each level increases quadratically:**

```typescript
Level 1 → 2: 300 XP
Level 2 → 3: 500 XP   (+200)
Level 3 → 4: 700 XP   (+200)
Level 4 → 5: 900 XP   (+200)
Level 5 → 6: 1100 XP  (+200)
...
```

**Formula:**
```typescript
LEVEL_XP_BASE = 300
LEVEL_XP_INCREMENT = 200

XP for level n = LEVEL_XP_BASE + (n - 1) × LEVEL_XP_INCREMENT
Total XP to reach level n = Σ(300 + k×200) for k=0 to n-1
                          = (n-1) × 300 + 200 × [n(n-1)/2]
```

**Example Calculations:**

| Level | XP Needed | Cumulative XP | Progress |
|-------|-----------|---------------|----------|
| 1     | 0         | 0             | Start    |
| 2     | 300       | 300           | +300     |
| 3     | 500       | 800           | +500     |
| 4     | 700       | 1500          | +700     |
| 5     | 900       | 2400          | +900     |
| 10    | 2100      | 13500         | +2100    |
| 20    | 4100      | 58000         | +4100    |
| 50    | 10100     | 502500        | +10100   |
| 99    | 19900     | 1950300       | +19900   |

**API Response Structure:**

```typescript
{
  level: 5,                  // Current level
  levelFloor: 2400,          // Total XP to reach level 5
  nextLevelTarget: 3500,     // Total XP to reach level 6
  xpIntoLevel: 100,          // Progress into current level
  xpForLevel: 1100,          // XP needed for level 5→6
  xpToNextLevel: 1000,       // XP remaining to level up
  levelPercent: 0.09         // 9% progress (100/1100)
}
```

---

## 🏆 RANK TIER SYSTEM (12 Tiers)

### Complete Tier Breakdown

**Rank is determined by `totalScore` (NOT `pointsBalance`):**

```typescript
rankTier = getRankTierByPoints(totalScore)
```

**12-Tier Progression:**

| Tier | Name | Min Points | Max Points | Category | Multiplier | Reward |
|------|------|------------|------------|----------|------------|--------|
| 1 | Signal Kitten | 0 | 500 | Beginner | 1.0x | First Steps Badge |
| 2 | Warp Scout | 500 | 1,500 | Beginner | 1.0x | Explorer Badge |
| 3 | Beacon Runner | 1,500 | 4,000 | Beginner | 1.1x | +10% Quest XP |
| 4 | Night Operator | 4,000 | 8,000 | Intermediate | 1.2x | Streak Master Badge |
| 5 | Star Captain | 8,000 | 15,000 | Intermediate | 1.3x | +30% Quest XP |
| 6 | Void Navigator | 15,000 | 30,000 | Intermediate | 1.4x | Guild Leader Badge |
| 7 | Quantum Architect | 30,000 | 60,000 | Advanced | 1.5x | +50% Quest XP |
| 8 | Alpha Cat | 60,000 | 100,000 | Advanced | 1.6x | Alpha Badge |
| 9 | Nexus Keeper | 100,000 | 200,000 | Advanced | 1.7x | Nexus Badge |
| 10 | Reality Shaper | 200,000 | 350,000 | Legendary | 1.8x | Reality Badge |
| 11 | Cosmic Entity | 350,000 | 500,000 | Legendary | 1.9x | Cosmic Badge |
| 12 | Omniversal Being | 500,000+ | ∞ | Mythic | 2.0x | Omniversal Badge |

### Rank Multipliers

**Multipliers apply to quest rewards and viral XP:**

```typescript
// Example: User completes quest worth 100 base XP
// User is "Alpha Cat" (Tier 8, 1.6x multiplier)

baseQuestXP = 100
rankMultiplier = 1.6
finalXP = baseQuestXP × rankMultiplier = 160 XP

// User receives 60% bonus XP for being high rank
```

**Multiplier Progression:**

```typescript
Beginner (Tiers 1-3):     1.0x - 1.1x  (0-10% bonus)
Intermediate (Tiers 4-6): 1.2x - 1.4x  (20-40% bonus)
Advanced (Tiers 7-9):     1.5x - 1.7x  (50-70% bonus)
Legendary (Tiers 10-11):  1.8x - 1.9x  (80-90% bonus)
Mythic (Tier 12):         2.0x         (100% bonus)
```

**API Response Structure:**

```typescript
{
  currentTier: {
    name: "Alpha Cat",
    minPoints: 60000,
    maxPoints: 100000,
    tier: "advanced",
    reward: { type: "multiplier", value: 1.6, label: "+60% Quest XP" }
  },
  nextTier: {
    name: "Nexus Keeper",
    minPoints: 100000,
    maxPoints: 200000
  },
  percent: 0.5,              // 50% progress through tier
  currentFloor: 60000,       // Tier start
  nextTarget: 100000,        // Tier end
  pointsIntoTier: 20000,     // Progress (80000 - 60000)
  pointsToNext: 20000        // Remaining (100000 - 80000)
}
```

---

## 🔥 VIRAL ENGAGEMENT SYSTEM

### Engagement Score Calculation

**Formula:**
```typescript
score = (recasts × 10) + (replies × 5) + (likes × 2)

ENGAGEMENT_WEIGHTS = {
  RECAST: 10,  // Highest - amplifies reach
  REPLY: 5,    // High - drives conversation
  LIKE: 2      // Medium - shows approval
}
```

**Example:**
```typescript
Cast has:
  - 8 recasts
  - 12 replies
  - 25 likes

score = (8 × 10) + (12 × 5) + (25 × 2)
      = 80 + 60 + 50
      = 190
```

### 6 Viral Tiers

| Tier | Name | Emoji | XP Reward | Min Score | Example Engagement |
|------|------|-------|-----------|-----------|-------------------|
| 1 | Mega Viral | 🔥 | 500 | 100+ | 10 recasts OR 50 likes |
| 2 | Viral | ⚡ | 250 | 50+ | 5 recasts OR 25 likes |
| 3 | Popular | ✨ | 100 | 20+ | 2 recasts OR 10 likes |
| 4 | Engaging | 💫 | 50 | 10+ | 1 recast OR 5 likes |
| 5 | Active | 🌟 | 25 | 5+ | 3 likes |
| 6 | None | - | 0 | <5 | No engagement |

### Viral XP Calculation

**Tier upgrades award incremental XP (no double-rewarding):**

```typescript
// Initial cast (no engagement)
tier: "none", xp: 0

// After 6 likes (score = 12)
tier: "engaging", xp: 50  // Award +50 XP

// After 12 likes + 2 recasts (score = 44)
tier: "popular", xp: 100  // Award +50 XP (100 - 50 previous)

// After 12 likes + 6 recasts (score = 84)
tier: "viral", xp: 250    // Award +150 XP (250 - 100 previous)
```

**Prevents Double-Rewarding:**
```typescript
// WRONG - User gets 500 + 250 + 100 = 850 XP total
calculateViralBonus() // Returns full XP every time

// CORRECT - User gets only incremental XP
calculateIncrementalBonus(current, previous) 
// Returns difference: max(0, currentXP - previousXP)
```

### Viral Data Flow

```
1. User shares badge → POST /api/cast/badge-share
2. Cast logged to badge_casts:
   {
     cast_hash: "0xabc...",
     fid: 18139,
     viral_score: 0,
     viral_tier: "none",
     viral_bonus_xp: 0,
     likes: 0, recasts: 0, replies: 0
   }

3. Cron job runs (every 5 min) → viral-engagement-sync.ts
4. Fetch engagement from Neynar API
5. Calculate score = (recasts×10) + (replies×5) + (likes×2)
6. Determine tier (mega_viral, viral, popular, etc.)
7. Calculate incremental XP (only new XP)
8. Update badge_casts:
   {
     viral_score: 84,
     viral_tier: "viral",
     viral_bonus_xp: 250,  // Cumulative
     likes: 12, recasts: 6, replies: 0
   }

9. If tier upgraded → Send notification
10. User's viralPoints updated in API responses
```

---

## 🔧 COMPLETE API RESPONSE STRUCTURE

### CompleteStats Type (from unified-calculator.ts)

```typescript
{
  // Score breakdown (Layer 1 + Layer 2)
  scores: {
    pointsBalance: 5000,     // Layer 1: Blockchain
    viralPoints: 1500,       // Layer 2: Off-chain
    questPoints: 500,        // Layer 2: Off-chain
    guildPoints: 200,        // Layer 2: Off-chain
    referralPoints: 300,     // Layer 2: Off-chain
    totalScore: 7500         // Layer 3: Calculated sum
  },
  
  // Level progression (Layer 3)
  level: {
    level: 5,
    levelFloor: 2400,
    nextLevelTarget: 3500,
    xpIntoLevel: 100,
    xpForLevel: 1100,
    xpToNextLevel: 1000,
    levelPercent: 0.09
  },
  
  // Rank progression (Layer 3)
  rank: {
    currentTier: {
      name: "Beacon Runner",
      minPoints: 1500,
      maxPoints: 4000,
      tier: "beginner",
      reward: { type: "multiplier", value: 1.1, label: "+10% Quest XP" }
    },
    nextTier: {
      name: "Night Operator",
      minPoints: 4000,
      maxPoints: 8000
    },
    percent: 0.6,
    currentFloor: 1500,
    nextTarget: 4000,
    pointsIntoTier: 1500,
    pointsToNext: 1000
  },
  
  // Display formatting
  formatted: {
    totalScore: "7,500",
    pointsBalance: "5,000",
    viralPoints: "1,500",
    level: "Level 5",
    rankTier: "Beacon Runner"
  },
  
  // Blockchain metadata (Layer 1)
  streak: 7,
  lastGMTimestamp: 1703232000000,
  lifetimeGMs: 42
}
```

### Multi-Wallet Metadata

**Added in API responses for transparency:**

```typescript
{
  // ... scores, level, rank, formatted ...
  
  metadata: {
    sources: {
      subsquid: true,    // Data from Subsquid indexer
      supabase: true,    // Data from Supabase
      calculated: true   // Data from unified-calculator
    },
    multiWallet: {
      walletCount: 3,
      wallets: [
        "0x1234...",  // Connected wallet
        "0x5678...",  // Custody wallet
        "0x9abc..."   // Verified wallet
      ],
      walletsSuccessful: 3  // All wallets returned data
    }
  }
}
```

---
## 🔧 COMPLETE RENAMING PLAN

### RULE 1: Contract Names are Immutable
✅ **NEVER change:** `pointsBalance`, `pointsEarned`, `rewardPoints`, `amount`, `points`, `pointsAwarded`  
✅ **These are on-chain** and deployed - changing them is impossible

### RULE 2: Subsquid Must Mirror Contract
```typescript
// ✅ CORRECT (matches contract exactly)
User.pointsBalance: bigint

// ❌ WRONG (invented name)
User.totalPoints: bigint

// ✅ CORRECT (matches contract event)
Quest.pointsAwarded: bigint

// ❌ WRONG (doesn't match event)
Quest.totalPointsAwarded: bigint
```

### RULE 3: Supabase Must Use Contract Terminology (snake_case)
```sql
-- ✅ CORRECT (snake_case of contract name)
points_balance         bigint  -- matches contract pointsBalance
points_earned          bigint  -- matches event pointsEarned
points_awarded         bigint  -- matches event pointsAwarded
amount                 bigint  -- matches event amount

-- ❌ WRONG (invented names)
points                 bigint  -- ambiguous
base_points            bigint  -- not in contract
reward_points          bigint  -- ambiguous (earned? awarded? balance?)
total_points           bigint  -- ambiguous
```

### RULE 4: API/Types Must Use Contract Naming (camelCase)
```typescript
// ✅ CORRECT (camelCase of contract name)
pointsBalance: number     // matches contract pointsBalance
pointsEarned: number      // matches event pointsEarned
pointsAwarded: number     // matches event pointsAwarded
amount: number            // matches event amount

// ❌ WRONG (invented names)
blockchainPoints: number  // not in contract
basePoints: number        // not in contract
viralXP: number          // mixing XP/points (should be viralPoints)
```

---

## 📋 DETAILED FIELD MAPPING TABLE

### ON-CHAIN CONTRACT FIELDS (Layer 1) - SOURCE OF TRUTH

| Contract Name | Type | Usage | Events Using It |
|--------------|------|-------|-----------------|
| `pointsBalance` | uint256 | Current spendable balance (storage) | GMSent, PointsDeposited, PointsWithdrawn, PointsTipped |
| `pointsLocked` | uint256 | Points locked in activities (storage) | (internal) |
| `pointsEarned` | uint256 | Points earned from single GM (event field) | GMSent event |
| `rewardPoints` | uint256 | Reward from generic action (event field) | GMEvent event |
| `amount` | uint256 | Generic amount (deposit/withdrawal) | PointsDeposited, PointsWithdrawn |
| `points` | uint256 | Generic points (tips/transfers) | PointsTipped event |
| `pointsAwarded` | uint256 | Quest completion reward (event field) | QuestCompleted event |

**Key Insight:** Contract uses DIFFERENT names for different contexts:
- `pointsBalance` = storage variable (cumulative balance)
- `pointsEarned` = reward from specific GM event  
- `rewardPoints` = generic reward from action
- `pointsAwarded` = quest-specific reward
- `amount` = generic deposit/withdrawal
- `points` = generic transfer (tips)

---

### SUBSQUID MODEL FIELDS (Layer 2a) - CURRENT vs RECOMMENDED

| Current Name | Type | ✅ Status | Recommended Name | Reason |
|-------------|------|---------|------------------|--------|
| `pointsBalance` | bigint | ✅ KEEP | `pointsBalance` | ✅ Matches contract storage |
| `totalEarnedFromGMs` | bigint | ⚠️ KEEP | `totalEarnedFromGMs` | ⚠️ Custom tracking (not in contract, but OK) |
| `totalPoints` (Guild) | bigint | ❌ RENAME | `treasuryPointsBalance` | ❌ Ambiguous - clarify it's guild treasury |
| `totalPointsAwarded` (Quest) | bigint | ❌ RENAME | `pointsAwarded` | ❌ Should match event name |
| `totalPointsAwarded` (DailyStats) | bigint | ❌ RENAME | `dailyPointsAwarded` | ❌ Add context (daily) |
| `totalPoints` (LeaderboardEntry) | bigint | ❌ DEPRECATE | `totalScore` | ❌ Deprecated model (mixed layers) |

**Subsquid Naming Rules:**
1. ✅ Storage variables: Use exact contract name (`pointsBalance`)
2. ✅ Event fields: Use exact event name (`pointsEarned`, `pointsAwarded`, `amount`)
3. ⚠️ Cumulative tracking: Prefix with scope (`totalEarnedFromGMs`, `lifetimeTipsGiven`)
4. ❌ NEVER invent generic names (`totalPoints` is too ambiguous)

---

### SUPABASE SCHEMA FIELDS (Layer 2b) - CURRENT vs RECOMMENDED

| Table | Current Name | Type | ✅ Status | Recommended Name | Reason |
|-------|-------------|------|---------|------------------|--------|
| user_profiles | `points` | bigint | ❌ RENAME | `points_balance` | Match contract `pointsBalance` |
| user_profiles | `total_points_earned` | bigint | ❌ RENAME | `total_earned_from_gms` | Match Subsquid tracking |
| user_profiles | `total_points_spent` | bigint | ✅ KEEP | `total_points_spent` | ✅ Clear, off-chain tracking |
| user_profiles | `xp` | bigint | ❌ REMOVE | N/A | ❌ DEPRECATED unused column |
| badge_casts | `viral_bonus_xp` | integer | ⚠️ RENAME | `viral_bonus_points` | ⚠️ Consistent terminology |
| badge_casts | `viral_score` | numeric | ✅ KEEP | `viral_score` | ✅ OK (engagement score, not points) |
| quest_definitions | `reward_xp` | integer | ❌ RENAME | `reward_points_awarded` | Match event `pointsAwarded` |
| quest_definitions | `reward_points` | integer | ❌ RENAME | `reward_points_awarded` | ❌ Ambiguous (earned vs awarded) |
| quest_completions | `points_awarded` | bigint | ✅ KEEP | `points_awarded` | ✅ Matches contract event |
| unified_quests | `reward_points` | bigint | ❌ RENAME | `reward_points_awarded` | Match event name |
| unified_quests | `total_earned_points` | bigint | ❌ RENAME | `total_points_awarded` | ❌ `earned` ambiguous |
| guild_member_stats_cache | `points_contributed` | bigint | ✅ KEEP | `points_contributed` | ✅ Specific context |
| guild_member_stats_cache | `total_score` | bigint | ✅ KEEP | `total_score` | ✅ Calculated field (not contract) |
| referral_stats | `points_earned` | integer | ❌ RENAME | `points_awarded` | Match contract terminology |
| points_transactions | `amount` | bigint | ✅ KEEP | `amount` | ✅ Matches contract event |
| points_transactions | `balance_after` | bigint | ❌ RENAME | `points_balance_after` | Add clarity |
| user_points_balances | `base_points` | bigint | ❌ RENAME | `points_balance` | Match contract storage |
| user_points_balances | `viral_xp` | bigint | ⚠️ RENAME | `viral_points` | ⚠️ Consistent terminology |
| user_points_balances | `guild_bonus` | bigint | ❌ RENAME | `guild_points_awarded` | Add clarity |
| user_points_balances | `total_points` | bigint | ❌ RENAME | `total_score` | Calculated field |
| reward_claims | `viral_xp_claimed` | bigint | ❌ RENAME | `viral_points_claimed` | Consistent terminology |
| reward_claims | `guild_bonus_claimed` | bigint | ❌ RENAME | `guild_points_claimed` | Consistent terminology |
| reward_claims | `total_claimed` | bigint | ❌ RENAME | `total_points_claimed` | Add clarity |

**Supabase Naming Rules:**
1. ✅ Match contract storage: `points_balance` (not `points`)
2. ✅ Match contract events: `points_awarded`, `amount`
3. ✅ Use context prefixes: `viral_points`, `guild_points`, `referral_points`
4. ✅ Distinguish earned vs awarded: Use `awarded` for rewards, `earned` for cumulative
5. ❌ NEVER use generic `points` or `xp` alone (too ambiguous)

---

### API/TYPE DEFINITIONS (Layer 3) - CURRENT vs RECOMMENDED

| File | Current Name | Type | ✅ Status | Recommended Name | Reason |
|------|-------------|------|---------|------------------|--------|
| unified-calculator.ts | `blockchainPoints` | number | ❌ RENAME | `pointsBalance` | Match contract storage |
| unified-calculator.ts | `viralXP` | number | ❌ RENAME | `viralPoints` | Consistent terminology |
| unified-calculator.ts | `questPoints` | number | ✅ KEEP | `questPoints` | ✅ Generic enough |
| unified-calculator.ts | `guildPoints` | number | ✅ KEEP | `guildPoints` | ✅ Generic enough |
| unified-calculator.ts | `referralPoints` | number | ✅ KEEP | `referralPoints` | ✅ Generic enough |
| unified-calculator.ts | `totalScore` | number | ✅ KEEP | `totalScore` | ✅ Calculated sum |

**API/Type Naming Rules:**
1. ✅ Use camelCase of contract names: `pointsBalance` (not `blockchainPoints`)
2. ✅ Use `points` suffix consistently: `viralPoints`, `questPoints`, `guildPoints`
3. ✅ Calculated fields can use descriptive names: `totalScore`, `level`, `rankTier`
4. ❌ NEVER mix XP/points terminology (`viralXP` → `viralPoints`)
5. ❌ NEVER invent new names not in contract (`blockchainPoints` → `pointsBalance`)

---

## 🔄 COMPLETE MIGRATION PLAN

### Priority 1: Fix Supabase Schema (Database Migrations)

**Step 1.1: Rename user_profiles columns**
```sql
-- Migration: 001_rename_user_profiles_points.sql
ALTER TABLE user_profiles RENAME COLUMN points TO points_balance;
ALTER TABLE user_profiles RENAME COLUMN total_points_earned TO total_earned_from_gms;
DROP COLUMN user_profiles.xp;  -- DEPRECATED unused column

-- Update indexes
DROP INDEX IF EXISTS idx_user_profiles_points;
CREATE INDEX idx_user_profiles_points_balance ON user_profiles(points_balance);

-- Add comments
COMMENT ON COLUMN user_profiles.points_balance IS 'Current spendable points (matches contract pointsBalance)';
COMMENT ON COLUMN user_profiles.total_earned_from_gms IS 'Lifetime GM earnings (matches Subsquid User.totalEarnedFromGMs)';
```

**Step 1.2: Rename badge_casts viral columns**
```sql
-- Migration: 002_rename_badge_casts_viral.sql
ALTER TABLE badge_casts RENAME COLUMN viral_bonus_xp TO viral_bonus_points;

COMMENT ON COLUMN badge_casts.viral_bonus_points IS 'Bonus points from cast engagement (was viral_bonus_xp)';
```

**Step 1.3: Rename quest tables**
```sql
-- Migration: 003_rename_quest_rewards.sql
ALTER TABLE quest_definitions RENAME COLUMN reward_xp TO reward_points_awarded;
ALTER TABLE quest_definitions RENAME COLUMN reward_points TO reward_points_awarded_backup;  -- Backup old column
ALTER TABLE quest_definitions DROP COLUMN reward_points_awarded_backup AFTER migration;

ALTER TABLE unified_quests RENAME COLUMN reward_points TO reward_points_awarded;
ALTER TABLE unified_quests RENAME COLUMN total_earned_points TO total_points_awarded;

COMMENT ON COLUMN quest_definitions.reward_points_awarded IS 'Points awarded on quest completion (matches contract QuestCompleted.pointsAwarded)';
```

**Step 1.4: Rename user_points_balances**
```sql
-- Migration: 004_rename_user_points_balances.sql
ALTER TABLE user_points_balances RENAME COLUMN base_points TO points_balance;
ALTER TABLE user_points_balances RENAME COLUMN viral_xp TO viral_points;
ALTER TABLE user_points_balances RENAME COLUMN guild_bonus TO guild_points_awarded;
ALTER TABLE user_points_balances RENAME COLUMN total_points TO total_score;

-- Update computed column
ALTER TABLE user_points_balances DROP COLUMN total_score;
ALTER TABLE user_points_balances ADD COLUMN total_score bigint GENERATED ALWAYS AS (points_balance + viral_points + guild_points_awarded) STORED;

COMMENT ON COLUMN user_points_balances.points_balance IS 'Base points from blockchain activities (matches contract pointsBalance)';
COMMENT ON COLUMN user_points_balances.viral_points IS 'Points from viral cast engagement';
COMMENT ON COLUMN user_points_balances.guild_points_awarded IS 'Bonus points awarded from guild membership';
COMMENT ON COLUMN user_points_balances.total_score IS 'Computed total: points_balance + viral_points + guild_points_awarded';
```

**Step 1.5: Rename reward_claims**
```sql
-- Migration: 005_rename_reward_claims.sql
ALTER TABLE reward_claims RENAME COLUMN viral_xp_claimed TO viral_points_claimed;
ALTER TABLE reward_claims RENAME COLUMN guild_bonus_claimed TO guild_points_claimed;
ALTER TABLE reward_claims RENAME COLUMN total_claimed TO total_points_claimed;

COMMENT ON COLUMN reward_claims.viral_points_claimed IS 'Viral points deposited via oracle';
COMMENT ON COLUMN reward_claims.guild_points_claimed IS 'Guild points deposited via oracle';
COMMENT ON COLUMN reward_claims.total_points_claimed IS 'Total points deposited to contract';
```

**Step 1.6: Rename referral_stats**
```sql
-- Migration: 006_rename_referral_stats.sql
ALTER TABLE referral_stats RENAME COLUMN points_earned TO points_awarded;

COMMENT ON COLUMN referral_stats.points_awarded IS 'Points awarded from referrals (matches contract event terminology)';
```

**Step 1.7: Rename points_transactions**
```sql
-- Migration: 007_rename_points_transactions.sql
ALTER TABLE points_transactions RENAME COLUMN balance_after TO points_balance_after;

COMMENT ON COLUMN points_transactions.points_balance_after IS 'Points balance after transaction';
```

---

### Priority 2: Fix Subsquid Model Names

**Step 2.1: Rename Guild.totalPoints**
```typescript
// gmeow-indexer/src/model/generated/guild.model.ts
@BigIntColumn_({nullable: false})
treasuryPointsBalance!: bigint  // was: totalPoints
```

**Step 2.2: Rename Quest.totalPointsAwarded**
```typescript
// gmeow-indexer/src/model/generated/quest.model.ts
@BigIntColumn_({nullable: false})
pointsAwarded!: bigint  // was: totalPointsAwarded
```

**Step 2.3: Rename DailyStats.totalPointsAwarded**
```typescript
// gmeow-indexer/src/model/generated/dailyStats.model.ts
@BigIntColumn_({nullable: false})
dailyPointsAwarded!: bigint  // was: totalPointsAwarded
```

**Step 2.4: Deprecate LeaderboardEntry model**
```typescript
// gmeow-indexer/src/model/generated/leaderboardEntry.model.ts
/**
 * @deprecated MIXED LAYERS - Use separate queries for blockchain (User.pointsBalance) 
 * and calculated (API totalScore). This model will be removed in v2.0.
 */
export class LeaderboardEntry { ... }
```

---

### Priority 3: Fix unified-calculator.ts Types

**Step 3.1: Rename TotalScore type**
```typescript
// lib/scoring/unified-calculator.ts
export type TotalScore = {
  pointsBalance: number        // was: blockchainPoints (matches contract)
  viralPoints: number          // was: viralXP (consistent terminology)
  questPoints: number          // ✅ keep as-is
  guildPoints: number          // ✅ keep as-is
  referralPoints: number       // ✅ keep as-is
  totalScore: number           // ✅ keep as-is (calculated sum)
}
```

**Step 3.2: Update calculateCompleteStats input**
```typescript
export function calculateCompleteStats(input: {
  pointsBalance: number         // was: blockchainPoints
  currentStreak: number          
  lastGMTimestamp: number | null 
  lifetimeGMs: number            
  viralPoints: number           // was: viralXP
  questPoints?: number           
  guildPoints?: number           
  referralPoints?: number        
}): CompleteStats {
  const scores: TotalScore = {
    pointsBalance: input.pointsBalance,
    viralPoints: input.viralPoints,
    questPoints: input.questPoints || 0,
    guildPoints: input.guildPoints || 0,
    referralPoints: input.referralPoints || 0,
    totalScore: 
      input.pointsBalance + 
      input.viralPoints + 
      (input.questPoints || 0) + 
      (input.guildPoints || 0) + 
      (input.referralPoints || 0),
  }
  // ... rest of calculation
}
```

**Step 3.3: Update CompleteStats formatted fields**
```typescript
export type CompleteStats = {
  scores: TotalScore
  level: LevelProgress
  rank: RankProgress
  formatted: {
    totalScore: string
    pointsBalance: string       // was: blockchainPoints
    viralPoints: string         // was: viralXP
    level: string
    rankTier: string
  }
  streak: number
  lastGMTimestamp: number | null
  lifetimeGMs: number
}
```

---

### Priority 4: Fix API Route Responses

**Step 4.1: Update Guild API routes**
```typescript
// app/api/guild/[guildId]/route.ts
// Current (WRONG):
{
  base_points: 5000,
  viral_xp: 0,
  total_score: 5000,
  rank_tier: "unranked",
  is_guild_officer: true
}

// Recommended (CORRECT):
{
  pointsBalance: 5000,         // was: base_points
  viralPoints: 0,              // was: viral_xp
  totalScore: 5000,            // was: total_score
  rankTier: "unranked",        // was: rank_tier
  isGuildOfficer: true         // was: is_guild_officer
}
```

**Step 4.2: Verify Viral API routes already correct**
```typescript
// app/api/viral/stats/route.ts (ALREADY CORRECT)
{
  pointsBalance: 0,            // ✅ correct (after unified-calculator rename)
  totalViralPoints: 0,         // ✅ correct (aggregated)
  totalScore: 0,               // ✅ correct
  level: 1,                    // ✅ correct
  rankTier: "Signal Kitten"    // ✅ correct
}
```

---

### Priority 5: Update All Backend Queries

**Step 5.1: Search and replace Supabase queries**
```bash
# Find all Supabase queries using old column names
grep -r "user_profiles.points" app/ lib/
grep -r "total_points_earned" app/ lib/
grep -r "viral_bonus_xp" app/ lib/
grep -r "base_points" app/ lib/

# Update to new names:
# user_profiles.points → user_profiles.points_balance
# total_points_earned → total_earned_from_gms
# viral_bonus_xp → viral_bonus_points
# base_points → points_balance
```

**Step 5.2: Update TypeScript interfaces**
```typescript
// Before:
interface UserProfile {
  points: number
  total_points_earned: number
}

// After:
interface UserProfile {
  points_balance: number
  total_earned_from_gms: number
}
```

---

### Priority 6: Update Test Data

**Step 6.1: Use consistent test FID**
```typescript
// test-infrastructure endpoint and all route tests
const TEST_FID = 18139  // Use this EVERYWHERE
const TEST_WALLET = "0x7539472dad6a371e6e152c5a203469aa32314130"

// Remove FID 602828 from all test data
```

---

## 📖 FINAL NAMING REFERENCE

### Contract-Based Naming (IMMUTABLE SOURCE)

| Concept | Contract Name | Subsquid | Supabase | API/Types |
|---------|--------------|----------|----------|-----------|
| Current spendable balance | `pointsBalance` | `pointsBalance` | `points_balance` | `pointsBalance` |
| GM reward (single) | `pointsEarned` | `pointsEarned` | N/A | N/A |
| Generic reward | `rewardPoints` | `rewardPoints` | N/A | N/A |
| Quest reward | `pointsAwarded` | `pointsAwarded` | `points_awarded` | `pointsAwarded` |
| Deposit/withdrawal | `amount` | `amount` | `amount` | `amount` |
| Tip/transfer | `points` | `points` | `points` | `points` |
| Guild treasury | N/A | `treasuryPointsBalance` | `treasury_points_balance` | `treasuryPointsBalance` |
| Viral engagement (off-chain) | N/A | N/A | `viral_points` | `viralPoints` |
| Cumulative GM earnings | N/A | `totalEarnedFromGMs` | `total_earned_from_gms` | `totalEarnedFromGMs` |
| Calculated total | N/A | N/A | `total_score` | `totalScore` |

---

## ✅ VALIDATION CHECKLIST

### Database Migration
- [ ] Migration 001: Rename user_profiles.points → points_balance
- [ ] Migration 002: Rename badge_casts.viral_bonus_xp → viral_bonus_points
- [ ] Migration 003: Rename quest reward columns
- [ ] Migration 004: Rename user_points_balances columns
- [ ] Migration 005: Rename reward_claims columns
- [ ] Migration 006: Rename referral_stats.points_earned → points_awarded
- [ ] Migration 007: Rename points_transactions.balance_after → points_balance_after
- [ ] Test all migrations on staging database
- [ ] Verify no broken queries after migration

### Subsquid Updates
- [ ] Rename Guild.totalPoints → treasuryPointsBalance
- [ ] Rename Quest.totalPointsAwarded → pointsAwarded
- [ ] Rename DailyStats.totalPointsAwarded → dailyPointsAwarded
- [ ] Deprecate LeaderboardEntry model
- [ ] Rebuild indexer schema
- [ ] Re-index from block 0 to ensure consistency

### unified-calculator.ts Updates
- [ ] Rename TotalScore.blockchainPoints → pointsBalance
- [ ] Rename TotalScore.viralXP → viralPoints
- [ ] Update calculateCompleteStats input parameter names
- [ ] Update CompleteStats.formatted field names
- [ ] Update all function JSDoc comments
- [ ] Run TypeScript compilation to catch type errors

### API Route Updates
- [ ] Update Guild route response: base_points → pointsBalance
- [ ] Update Guild route response: viral_xp → viralPoints
- [ ] Update Guild route response: total_score → totalScore
- [ ] Update Guild route response: rank_tier → rankTier
- [ ] Update Guild route response: is_guild_officer → isGuildOfficer
- [ ] Verify Viral routes already using correct names
- [ ] Test all API endpoints with new field names

### Backend Query Updates
- [ ] Find all user_profiles.points queries → update to points_balance
- [ ] Find all total_points_earned queries → update to total_earned_from_gms
- [ ] Find all viral_bonus_xp queries → update to viral_bonus_points
- [ ] Find all base_points queries → update to points_balance
- [ ] Update TypeScript interfaces for Supabase responses
- [ ] Run full test suite

### Test Data Updates
- [ ] Use FID 18139 consistently across all tests
- [ ] Remove FID 602828 from test data
- [ ] Update test-infrastructure endpoint
- [ ] Verify all 6 routes use same test user

### Documentation Updates
- [ ] Update API documentation with new field names
- [ ] Add migration guide for frontend clients (BREAKING CHANGE)
- [ ] Update COMPLETE-CALCULATION-SYSTEM.md
- [ ] Update any other docs referencing old field names

---

## 🚨 BREAKING CHANGES WARNING

**This is a MAJOR BREAKING CHANGE for:**
1. ✅ Frontend (all API responses renamed)
2. ✅ Database queries (column names changed)
3. ✅ TypeScript types (field names changed)
4. ❌ Contract (NO CHANGES - contract is immutable)
5. ⚠️ Subsquid indexer (model names changed - requires re-index)

**Migration Strategy:**
1. Deploy database migrations first (with downtime window)
2. Update backend queries immediately after migration
3. Deploy new API with updated field names
4. Notify frontend team of breaking changes
5. Rebuild Subsquid indexer with new schema
6. Monitor for errors in production

**Rollback Plan:**
- Keep migration rollback scripts ready
- Have old API version running in parallel for 24h
- Monitor error logs for any missed queries
- Be ready to hotfix any broken endpoints

---

## 📊 SUCCESS METRICS

After completing migration, you should see:
1. ✅ All Supabase columns match contract terminology (snake_case)
2. ✅ All Subsquid models match contract terminology (exact names)
3. ✅ All API responses use camelCase of contract names
4. ✅ Zero usage of deprecated terms: `blockchainPoints`, `viralXP`, `base_points`, `total_points`
5. ✅ Consistent test data (FID 18139 everywhere)
6. ✅ No negative points in guild stats
7. ✅ Metadata fields present in all API responses

**Verification Commands:**
```bash
# Check Supabase schema matches standard
psql -c "\d user_profiles" | grep points_balance
psql -c "\d badge_casts" | grep viral_bonus_points

# Check no old field names in codebase
grep -r "blockchainPoints" lib/ app/
grep -r "viralXP" lib/ app/
grep -r "base_points" app/

# Check API responses
curl http://localhost:3000/api/guild/1 | jq '.leaderboardStats'
curl http://localhost:3000/api/viral/stats | jq '.scores'
```

---

**END OF DOCUMENT**  
**Last Updated:** December 22, 2025  
**Next Review:** After migration completion
