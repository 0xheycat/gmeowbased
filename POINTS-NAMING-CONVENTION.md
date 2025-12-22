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

### Layer 1: Smart Contract (On-Chain)

**Contract Storage Variables:**
```solidity
mapping(address => uint256) public pointsBalance;  // Current spendable balance
mapping(uint256 => uint256) public fidPoints;      // FID-based lookup
uint256 public contractPointsReserve;              // Contract's point reserve
mapping(address => uint256) public pointsLocked;   // Points locked in activities
```

**Contract Events:**
```solidity
event GMSent(address user, uint256 streak, uint256 pointsEarned);
event GMEvent(address user, uint256 rewardPoints, uint256 newStreak);
event PointsDeposited(address who, uint256 amount);
event PointsWithdrawn(address who, uint256 amount);
event PointsTipped(address from, address to, uint256 points, uint256 fid);
```

**Event Field Naming:**
- `pointsEarned` - Points earned from GM event
- `rewardPoints` - Reward points from action
- `amount` - Generic amount for deposits/withdrawals
- `points` - Generic points for tips/transfers

**✅ OFFICIAL CONTRACT NAME:** `pointsBalance`
- **Type:** `uint256` (BigInt in TypeScript)
- **Meaning:** Current spendable points balance for a wallet
- **Source of Truth:** On-chain storage variable

---

### Layer 2: Subsquid Indexer (Off-Chain Database)

**User Model Schema:**
```typescript
@Entity_()
export class User {
  @BigIntColumn_({nullable: false})
  pointsBalance!: bigint              // ← CURRENT spendable balance (matches contract)
  
  @BigIntColumn_({nullable: false})
  totalEarnedFromGMs!: bigint         // ← CUMULATIVE earned from GM events only
  
  @IntColumn_({nullable: false})
  currentStreak!: number              // Current GM streak
  
  @BigIntColumn_({nullable: false})
  lastGMTimestamp!: bigint            // Last GM timestamp
  
  @IntColumn_({nullable: false})
  lifetimeGMs!: number                // Total GM count
  
  @BigIntColumn_({nullable: false})
  totalTipsGiven!: bigint             // Total points tipped to others
  
  @BigIntColumn_({nullable: false})
  totalTipsReceived!: bigint          // Total points received from tips
}
```

**Other Model Fields:**
```typescript
// Guild Model
@BigIntColumn_({nullable: false})
totalPoints!: bigint                  // Guild's total accumulated points

// LeaderboardEntry Model
@BigIntColumn_({nullable: false})
totalPoints!: bigint                  // User's total points for leaderboard

// DailyStats Model
@BigIntColumn_({nullable: false})
totalPointsAwarded!: bigint           // Points awarded today

// Quest Model
@BigIntColumn_({nullable: false})
totalPointsAwarded!: bigint           // Points awarded by this quest
```

**Indexer Processing Logic:**
```typescript
// GMEvent processing
user.pointsBalance += points          // Update current balance
user.totalEarnedFromGMs += points     // Track cumulative earnings from GMs

// Deposit processing
user.pointsBalance += amount          // Add to current balance

// Withdrawal processing
user.pointsBalance -= amount          // Deduct from current balance

// Tip processing
fromUser.pointsBalance -= points      // Sender loses points
toUser.pointsBalance += points        // Receiver gains points
```

**✅ SUBSQUID NAMING:**
- `pointsBalance` - Current spendable balance (mirrors contract)
- `totalEarnedFromGMs` - Lifetime GM earnings (cumulative, never decreases)
- `totalPoints` - Aggregated points (used in guild/leaderboard contexts)

---

### Layer 3: API Response (Unified Calculator)

**Current API Response Fields (INCONSISTENT - NEEDS FIXING):**
```typescript
// From guild/[guildId]/route.ts
{
  leaderboardStats: {
    base_points: 5000,           // ⚠️ Should be "blockchainPoints"
    viral_xp: 0,                 // ✅ OK
    guild_bonus_points: 0,       // ✅ OK
    total_score: 5000,           // ⚠️ Should be "totalScore"
    global_rank: null,           // ✅ OK
    rank_tier: "unranked",       // ⚠️ Should be "rankTier"
    is_guild_officer: true       // ⚠️ Should be "isGuildOfficer"
  }
}

// From viral/stats/route.ts
{
  blockchainPoints: 0,           // ✅ CORRECT
  totalViralXp: 0,              // ✅ CORRECT
  totalScore: 0,                // ✅ CORRECT
  level: 1,                     // ✅ CORRECT
  rankTier: "Signal Kitten"     // ✅ CORRECT
}
```

**✅ STANDARDIZED API NAMING (Must Use):**
```typescript
interface UserStats {
  // PRIMARY POINT VALUES
  blockchainPoints: number        // From contract pointsBalance (multi-wallet sum)
  viralXP: number                 // Viral experience points
  questPoints: number             // Quest completion points
  guildPoints: number             // Guild bonus points
  referralPoints: number          // Referral bonus points
  
  // CALCULATED VALUES
  totalScore: number              // Sum of all point types
  level: number                   // Calculated level (0-99)
  rankTier: string                // Tier name (Signal Kitten, Alpha Cat, etc.)
  
  // BLOCKCHAIN STATS
  currentStreak: number           // Current GM streak
  lifetimeGMs: number             // Total GMs sent
  lastGMTimestamp: number | null  // Last GM timestamp
  
  // FORMATTED DISPLAY
  formatted: {
    blockchainPoints: string      // "1,234"
    totalScore: string            // "5,678"
    level: string                 // "Level 5"
    rankTier: string              // "Alpha Cat"
  }
  
  // METADATA (UPDATE #1 & #2)
  metadata: {
    sources: {
      subsquid: boolean           // Data from Subsquid
      supabase: boolean           // Data from Supabase
      calculated: boolean         // Data from calculator
    },
    multiWallet: {
      walletCount: number         // Number of wallets checked
      wallets: string[]           // List of wallets
      walletsSuccessful: number   // Wallets with data
    }
  }
}
```

---

## 🔄 FIELD MAPPING TABLE

| **Contract (On-Chain)** | **Subsquid (Indexer)** | **API Response** | **Meaning** |
|------------------------|----------------------|------------------|-------------|
| `pointsBalance` | `pointsBalance` | `blockchainPoints` | Current spendable balance (multi-wallet sum in API) |
| `pointsEarned` (event) | `totalEarnedFromGMs` | N/A | Cumulative GM earnings (internal tracking) |
| N/A | `totalPoints` (guild) | `guildPoints` | Guild-specific point aggregation |
| N/A | `totalPoints` (leaderboard) | `totalScore` | Total score for ranking |
| `rewardPoints` (event) | Added to `pointsBalance` | Counted in `blockchainPoints` | Points from actions |
| N/A | N/A | `viralXP` | Off-chain viral engagement score |
| N/A | N/A | `questPoints` | Off-chain quest completion score |
| N/A | N/A | `referralPoints` | Off-chain referral bonus |
| N/A | N/A | `totalScore` | Sum of all point types |

---

## 📊 DATA FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: SMART CONTRACT (Source of Truth)                      │
├─────────────────────────────────────────────────────────────────┤
│ Storage: pointsBalance (uint256)                               │
│ Events:  GMSent.pointsEarned, PointsDeposited.amount           │
│                                                                 │
│ Example: wallet 0x1234... has pointsBalance = 5000             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: SUBSQUID INDEXER (Event Aggregation)                  │
├─────────────────────────────────────────────────────────────────┤
│ User.pointsBalance = 5000n (bigint, mirrors contract)          │
│ User.totalEarnedFromGMs = 8000n (cumulative, includes spent)   │
│ User.currentStreak = 7                                         │
│ User.lifetimeGMs = 42                                          │
│                                                                 │
│ Note: pointsBalance can go down (withdrawals, tips)            │
│       totalEarnedFromGMs only goes up                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2.5: MULTI-WALLET AGGREGATION (UPDATE #1)                │
├─────────────────────────────────────────────────────────────────┤
│ User has 3 wallets:                                            │
│ - wallet_address:       0x1234... → pointsBalance: 5000       │
│ - custody_address:      0x5678... → pointsBalance: 3000       │
│ - verified_addresses[0]: 0x9abc... → pointsBalance: 2000      │
│                                                                │
│ Aggregated:             blockchainPoints = 10,000             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: UNIFIED CALCULATOR (Scoring)                          │
├─────────────────────────────────────────────────────────────────┤
│ Input:                                                          │
│   blockchainPoints: 10000 (from multi-wallet sum)              │
│   viralXP: 1500 (from badge casts)                            │
│   questPoints: 500 (from completed quests)                     │
│   guildPoints: 200 (from guild bonuses)                        │
│   referralPoints: 300 (from referrals)                         │
│                                                                 │
│ Calculated:                                                     │
│   totalScore = 10000 + 1500 + 500 + 200 + 300 = 12,500       │
│   level = 8 (based on totalScore)                             │
│   rankTier = "Alpha Cat" (tier for level 8)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: API RESPONSE (Client-Facing)                          │
├─────────────────────────────────────────────────────────────────┤
│ {                                                               │
│   blockchainPoints: 10000,    // Multi-wallet sum              │
│   viralXP: 1500,              // Off-chain                     │
│   questPoints: 500,           // Off-chain                     │
│   guildPoints: 200,           // Off-chain                     │
│   referralPoints: 300,        // Off-chain                     │
│   totalScore: 12500,          // Calculated                    │
│   level: 8,                   // Calculated                    │
│   rankTier: "Alpha Cat",      // Calculated                    │
│   currentStreak: 7,           // From Subsquid                 │
│   lifetimeGMs: 42,            // From Subsquid                 │
│   metadata: {                 // UPDATE #1 & #2                │
│     sources: { subsquid: true, supabase: true, calculated: true },│
│     multiWallet: { walletCount: 3, wallets: [...], walletsSuccessful: 3 }│
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚨 CRITICAL NAMING RULES

### ✅ DO USE:
- **Contract:** `pointsBalance` (storage), `pointsEarned` (event), `rewardPoints` (event)
- **Subsquid:** `pointsBalance`, `totalEarnedFromGMs`, `totalPoints` (context-specific)
- **API:** `blockchainPoints`, `viralXP`, `totalScore`, `level`, `rankTier`
- **Formatted:** camelCase for all API fields

### ❌ DON'T USE:
- `base_points` → Use `blockchainPoints`
- `total_score` → Use `totalScore`
- `rank_tier` → Use `rankTier`
- `is_guild_officer` → Use `isGuildOfficer`
- `points` (ambiguous) → Be specific: `blockchainPoints`, `questPoints`, etc.
- `totalPoints` in API → Use `totalScore` or `blockchainPoints`

### 🔄 SNAKE_CASE TO CAMELCASE:
All API responses must use camelCase:
```typescript
// ❌ WRONG (snake_case)
{
  base_points: 5000,
  viral_xp: 1000,
  total_score: 6000,
  rank_tier: "Alpha Cat",
  is_guild_officer: true
}

// ✅ CORRECT (camelCase)
{
  blockchainPoints: 5000,
  viralXP: 1000,
  totalScore: 6000,
  rankTier: "Alpha Cat",
  isGuildOfficer: true
}
```

---

## 🔧 MIGRATION CHECKLIST

### Step 1: Fix API Response Naming
- [ ] Update `app/api/guild/[guildId]/route.ts`
  - [ ] Change `base_points` → `blockchainPoints`
  - [ ] Change `viral_xp` → `viralXP`
  - [ ] Change `total_score` → `totalScore`
  - [ ] Change `rank_tier` → `rankTier`
  - [ ] Change `is_guild_officer` → `isGuildOfficer`
- [ ] Update `app/api/guild/[guildId]/members/route.ts`
- [ ] Update `app/api/guild/[guildId]/member-stats/route.ts`
- [ ] Update `app/api/viral/leaderboard/route.ts`

### Step 2: Add Metadata to All Routes
- [ ] Add `metadata.sources` (subsquid, supabase, calculated)
- [ ] Add `metadata.multiWallet` (walletCount, wallets, walletsSuccessful)

### Step 3: Use Consistent Test Data
- [ ] Use FID 18139 consistently across all tests
- [ ] Use wallet 0x7539472dad6a371e6e152c5a203469aa32314130
- [ ] Remove FID 602828 from test data
- [ ] Ensure test-infrastructure and route tests use same user

### Step 4: Update Documentation
- [ ] Update API docs with new field names
- [ ] Add examples showing `blockchainPoints` vs `totalScore`
- [ ] Document multi-wallet aggregation
- [ ] Add migration guide for frontend clients

---

## 📖 GLOSSARY

**blockchainPoints**
- **Source:** Contract `pointsBalance` (multi-wallet sum)
- **Type:** `number`
- **Range:** 0 to 2^53-1 (JavaScript safe integer)
- **Meaning:** Current spendable points from on-chain activities (GMs, deposits, tips)
- **Can decrease:** Yes (withdrawals, tips sent)

**totalEarnedFromGMs**
- **Source:** Subsquid cumulative tracking
- **Type:** `bigint`
- **Meaning:** Lifetime total earned from GM events only (never decreases)
- **Can decrease:** No (monotonically increasing)
- **Use case:** Track total GM earnings even after spending

**viralXP**
- **Source:** Off-chain badge cast engagement
- **Type:** `number`
- **Meaning:** Experience points from viral badge sharing
- **Can decrease:** No

**questPoints**
- **Source:** Off-chain quest completions
- **Type:** `number`
- **Meaning:** Points from completing quests
- **Can decrease:** No

**guildPoints**
- **Source:** Guild membership bonuses
- **Type:** `number`
- **Meaning:** Bonus points from guild activities
- **Can decrease:** No

**referralPoints**
- **Source:** Referral system
- **Type:** `number`
- **Meaning:** Points from referring new users
- **Can decrease:** No

**totalScore**
- **Source:** Calculated (sum of all point types)
- **Type:** `number`
- **Formula:** `blockchainPoints + viralXP + questPoints + guildPoints + referralPoints`
- **Meaning:** Overall user score for leaderboards and ranking
- **Use case:** Global rankings, tier assignments

**pointsBalance** (Contract/Subsquid)
- **Source:** On-chain storage variable
- **Type:** `uint256` (contract), `bigint` (Subsquid)
- **Meaning:** Current spendable balance for a single wallet
- **Can decrease:** Yes (withdrawals, tips, spending)
- **Note:** NOT the same as `blockchainPoints` (which is multi-wallet sum)

---

## 🎯 EXAMPLES

### Example 1: Single Wallet User
```typescript
// Contract State
wallet 0x1234...
  pointsBalance: 5000

// Subsquid
User {
  id: "0x1234...",
  pointsBalance: 5000n,
  totalEarnedFromGMs: 8000n,  // Earned 8k, spent 3k
  currentStreak: 7,
  lifetimeGMs: 42
}

// API Response (after multi-wallet aggregation)
{
  blockchainPoints: 5000,     // Only 1 wallet
  viralXP: 1500,
  totalScore: 6500,
  level: 4,
  rankTier: "Alpha Cat",
  currentStreak: 7,
  lifetimeGMs: 42,
  metadata: {
    sources: { subsquid: true, supabase: true, calculated: true },
    multiWallet: {
      walletCount: 1,
      wallets: ["0x1234..."],
      walletsSuccessful: 1
    }
  }
}
```

### Example 2: Multi-Wallet User
```typescript
// Contract State
wallet 0x1234... pointsBalance: 5000
wallet 0x5678... pointsBalance: 3000
wallet 0x9abc... pointsBalance: 2000

// Subsquid (3 separate User records)
User { id: "0x1234...", pointsBalance: 5000n, ... }
User { id: "0x5678...", pointsBalance: 3000n, ... }
User { id: "0x9abc...", pointsBalance: 2000n, ... }

// Supabase (1 user profile)
user_profiles {
  fid: 18139,
  wallet_address: "0x1234...",
  custody_address: "0x5678...",
  verified_addresses: ["0x9abc..."]
}

// API Response (after multi-wallet aggregation)
{
  blockchainPoints: 10000,    // 5000 + 3000 + 2000
  viralXP: 1500,
  totalScore: 11500,
  level: 7,
  rankTier: "Alpha Cat",
  currentStreak: 7,           // From first wallet with data
  lifetimeGMs: 42,            // From first wallet with data
  metadata: {
    sources: { subsquid: true, supabase: true, calculated: true },
    multiWallet: {
      walletCount: 3,
      wallets: ["0x1234...", "0x5678...", "0x9abc..."],
      walletsSuccessful: 3
    }
  }
}
```

### Example 3: Guild Context
```typescript
// Guild.totalPoints (sum of all member contributions)
Guild {
  id: "1",
  name: "gmeowbased",
  totalPoints: 15000n,        // Sum of all member pointsBalance
  memberCount: 3
}

// Member stats
{
  address: "0x1234...",
  points: "5000",             // Member's contribution (their pointsBalance)
  blockchainPoints: 5000,     // Same as points (for consistency)
  viralXP: 1500,
  totalScore: 6500,           // Used for guild leaderboard
  guildRank: 1                // Rank within guild
}
```

---

## 🐛 BUG FIXES NEEDED

### Bug 1: Inconsistent Test Data
**Current:** Test infrastructure uses FID 18139, guild route shows FID 602828  
**Fix:** Use FID 18139 consistently across all tests  
**Impact:** Confusing test results, can't validate data consistency

### Bug 2: Snake Case in API Responses
**Current:** Guild routes return `base_points`, `total_score`, `rank_tier`  
**Fix:** Convert to camelCase: `blockchainPoints`, `totalScore`, `rankTier`  
**Impact:** Inconsistent API, harder for frontend to consume

### Bug 3: Missing Metadata
**Current:** Routes don't include `metadata.sources` or `metadata.multiWallet`  
**Fix:** Add metadata to all route responses  
**Impact:** Can't verify data sources or multi-wallet aggregation

### Bug 4: Guild totalPoints = -5000
**Current:** Guild shows negative points  
**Fix:** Investigate why guild points calculation is negative  
**Hypothesis:** Might be withdrawals or incorrect aggregation logic

---

## ✅ APPROVAL REQUIRED

**Does this naming convention make sense?**
- Contract: `pointsBalance` (current spendable)
- Subsquid: `pointsBalance`, `totalEarnedFromGMs`
- API: `blockchainPoints` (multi-wallet sum), `totalScore` (all points)

**Ready to proceed with:**
1. Fixing snake_case → camelCase in API responses
2. Using consistent test data (FID 18139 only)
3. Adding metadata to all routes
4. Migrating deprecated functions

**Next Steps:**
- Review this document
- Approve naming convention
- Begin API response standardization
- Fix test data consistency
- Add metadata fields
