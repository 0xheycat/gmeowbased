# Comprehensive 3-Layer Naming Standard
**Created:** December 22, 2025  
**Purpose:** Complete field-by-field mapping across Contract → Subsquid → Supabase → API

## 🎯 NAMING RULES

1. **Contract (Layer 1):** Names are IMMUTABLE (on-chain, deployed)
2. **Subsquid (Layer 2a):** MIRROR contract names exactly (1:1 mapping)
3. **Supabase (Layer 2b):** USE SAME names as Subsquid (snake_case → match indexer terminology)
4. **API (Layer 3):** camelCase version of database names (NO renaming logic!)

---

## 📊 COMPLETE FIELD MAPPING

### CATEGORY 1: BLOCKCHAIN POINTS (On-Chain Data)

#### 1.1 Current Spendable Balance

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Contract** | GmeowCore.sol | `pointsBalance` | `uint256` | ✅ IMMUTABLE - on-chain storage |
| **Subsquid** | User.model.ts | `pointsBalance` | `bigint` | ✅ Mirrors contract exactly |
| **Supabase** | user_profiles | `points_balance` | `bigint` | 🔄 RENAME from `points` |
| **API** | All routes | `pointsBalance` | `number` | ✅ camelCase (JavaScript convention) |

**Current Issues:**
- ❌ Supabase uses `points` (should be `points_balance`)
- ❌ API Guild routes use `base_points` (should be `pointsBalance`)
- ✅ API Viral routes use `blockchainPoints` (alternative acceptable name)

**Migration Actions:**
```sql
-- Supabase migration
ALTER TABLE user_profiles RENAME COLUMN points TO points_balance;
```

```typescript
// API route fix (Option A: Match Subsquid)
{
  pointsBalance: 5000  // ✅ Matches Subsquid/Supabase
}

// API route fix (Option B: Descriptive name)
{
  blockchainPoints: 5000  // ✅ Also acceptable (clarifies source)
}
```

**Decision Needed:** Should API use `pointsBalance` or `blockchainPoints`?
- **Option A (`pointsBalance`):** Matches database exactly, simpler
- **Option B (`blockchainPoints`):** More descriptive, distinguishes from other point types

---

#### 1.2 Cumulative GM Earnings

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Contract** | N/A | N/A | N/A | Contract doesn't track cumulative (only current) |
| **Subsquid** | User.model.ts | `totalEarnedFromGMs` | `bigint` | ✅ Calculated from GM events |
| **Supabase** | user_profiles | `total_earned_from_gms` | `bigint` | 🔄 RENAME from `total_points_earned` |
| **API** | Profile/Stats | `totalEarnedFromGMs` | `number` | ✅ camelCase |

**Current Issues:**
- ❌ Supabase uses `total_points_earned` (should be `total_earned_from_gms`)
- ✅ This field only goes UP (monotonic), unlike pointsBalance which can decrease

**Migration Actions:**
```sql
-- Supabase migration
ALTER TABLE user_profiles RENAME COLUMN total_points_earned TO total_earned_from_gms;
COMMENT ON COLUMN user_profiles.total_earned_from_gms IS 'Lifetime GM earnings (monotonically increasing, matches Subsquid)';
```

**Usage Example:**
```typescript
// User earned 10,000 from GMs total, but spent 3,000 on tips/withdrawals
{
  totalEarnedFromGMs: 10000,  // Cumulative earnings (never decreases)
  pointsBalance: 7000,        // Current spendable (10000 - 3000)
  totalPointsSpent: 3000      // Lifetime spending
}
```

---

#### 1.3 Total Points Spent

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Contract** | N/A | N/A | N/A | Contract doesn't track spending history |
| **Subsquid** | N/A | N/A | N/A | Not tracked in indexer |
| **Supabase** | user_profiles | `total_points_spent` | `bigint` | ✅ Already correct! |
| **API** | Profile/Stats | `totalPointsSpent` | `number` | ✅ camelCase |

**Current Issues:**
- ✅ Name is already consistent!
- 💡 Could add to Subsquid for completeness (calculate from Withdraw/Tip events)

**Formula:**
```
totalPointsSpent = totalEarnedFromGMs - pointsBalance
```

---

#### 1.4 GM Streak Data

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Contract** | GMSent event | `streak` | `uint256` | ✅ Event parameter |
| **Subsquid** | User.model.ts | `currentStreak` | `number` | ✅ From latest GM event |
| **Subsquid** | User.model.ts | `lifetimeGMs` | `number` | ✅ Count of GM events |
| **Subsquid** | User.model.ts | `lastGMTimestamp` | `bigint` | ✅ Timestamp of last GM |
| **Supabase** | N/A | N/A | N/A | Not stored (real-time from Subsquid) |
| **API** | All routes | `currentStreak` | `number` | ✅ Matches Subsquid |
| **API** | All routes | `lifetimeGMs` | `number` | ✅ Matches Subsquid |
| **API** | All routes | `lastGMTimestamp` | `number\|null` | ✅ Matches Subsquid |

**Current Issues:**
- ✅ Names are already consistent!
- ✅ Not stored in Supabase (good - single source of truth is Subsquid)

---

### CATEGORY 2: VIRAL ENGAGEMENT POINTS (Off-Chain Data)

#### 2.1 Viral Bonus XP

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Contract** | N/A | N/A | N/A | Viral XP is off-chain only |
| **Subsquid** | N/A | N/A | N/A | Not tracked on-chain |
| **Supabase** | badge_casts | `viral_bonus_xp` | `integer` | ✅ Already correct! |
| **API** | Viral routes | `viralBonusXP` | `number` | ✅ camelCase |

**Aggregate Field:**
| Supabase Query | `SUM(badge_casts.viral_bonus_xp WHERE fid = ?)` | `bigint` | Sum across all casts |
| API | `totalViralXP` | `number` | Sum of all viral bonuses |

**Current Issues:**
- ❌ API Guild routes use `viral_xp` (should be `viralBonusXP` or `totalViralXP`)
- ✅ API Viral routes use `totalViralXp` (close, but inconsistent capitalization)

**Migration Actions:**
```typescript
// API route standardization
{
  viralBonusXP: 1500,     // ✅ Single cast bonus
  totalViralXP: 5000      // ✅ Sum of all casts (aggregated)
}
```

---

#### 2.2 Viral Score & Tier

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Supabase** | badge_casts | `viral_score` | `numeric` | ✅ Engagement score formula |
| **Supabase** | badge_casts | `viral_tier` | `text` | ✅ Tier classification |
| **API** | Viral routes | `viralScore` | `number` | ✅ camelCase |
| **API** | Viral routes | `viralTier` | `string` | ✅ camelCase |

**Formula (in unified-calculator.ts):**
```typescript
viralScore = (recasts × 10) + (replies × 5) + (likes × 2)
viralTier = viralScore >= 100 ? 'mega_viral' : 
            viralScore >= 50 ? 'viral' :
            viralScore >= 20 ? 'popular' :
            viralScore >= 10 ? 'engaging' :
            viralScore >= 5 ? 'active' : 'none'
```

**Current Issues:**
- ✅ Names are already consistent!

---

### CATEGORY 3: QUEST POINTS (Off-Chain Data)

#### 3.1 Quest Rewards

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Supabase** | quest_definitions | `reward_points` | `integer` | ✅ Points for completing quest |
| **Supabase** | quest_completions | `points_awarded` | `bigint` | ✅ Points given on completion |
| **API** | Quest routes | `rewardPoints` | `number` | ✅ camelCase (definition) |
| **API** | Quest routes | `pointsAwarded` | `number` | ✅ camelCase (completion) |

**Aggregate Field:**
| Supabase Query | `SUM(quest_completions.points_awarded WHERE completer_fid = ?)` | `bigint` | Total earned from quests |
| API | `totalQuestPoints` | `number` | Sum of all quest completions |

**Current Issues:**
- ✅ Names are already consistent!

---

### CATEGORY 4: GUILD POINTS (Mixed On-Chain + Off-Chain)

#### 4.1 Guild Total Points (On-Chain)

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Contract** | Guild.sol | `totalPoints` | `uint256` | ✅ Guild's total on-chain |
| **Subsquid** | Guild.model.ts | `totalPoints` | `bigint` | ✅ Mirrors contract |
| **Supabase** | guild_stats_cache | `total_points` | `bigint` | ✅ Cached from Subsquid |
| **API** | Guild routes | `totalPoints` | `number` | ✅ camelCase |

**Current Issues:**
- ❌ Guild shows NEGATIVE points (-5000) - investigate aggregation logic!
- ✅ Field names are consistent

---

#### 4.2 Member Contributions (Off-Chain Tracking)

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Supabase** | guild_member_stats_cache | `points_contributed` | `bigint` | ✅ Member's deposits to guild |
| **Supabase** | guild_events | `amount` (POINTS_DEPOSITED) | `integer` | ✅ Single deposit amount |
| **API** | Guild member stats | `pointsContributed` | `number` | ✅ camelCase |

**Current Issues:**
- ✅ Names are already consistent!

---

### CATEGORY 5: REFERRAL POINTS (Off-Chain Data)

#### 5.1 Referral Earnings

| Layer | Source | Field Name | Type | Notes |
|-------|--------|------------|------|-------|
| **Supabase** | referral_stats | `points_earned` | `integer` | ✅ Total from referrals |
| **Supabase** | referral_activity | `points_awarded` | `integer` | ✅ Single referral reward |
| **API** | Referral routes | `pointsEarned` | `number` | ✅ camelCase (total) |
| **API** | Referral routes | `pointsAwarded` | `number` | ✅ camelCase (single) |

**Current Issues:**
- ✅ Names are already consistent!

---

### CATEGORY 6: CALCULATED SCORES (Layer 3 Only)

#### 6.1 Total Score (Unified Calculator)

| Layer | Source | Field Name | Type | Formula |
|-------|--------|------------|------|---------|
| **API** | unified-calculator.ts | `totalScore` | `number` | `pointsBalance + totalViralXP + totalQuestPoints + guildBonusPoints + referralPointsEarned` |

**Current Issues:**
- ❌ API Guild routes use `total_score` (should be `totalScore`)
- ✅ API Viral routes use `totalScore` (correct)
- ✅ unified-calculator.ts uses `totalScore` (correct)

---

#### 6.2 Level & Rank Tier

| Layer | Source | Field Name | Type | Formula |
|-------|--------|------------|------|---------|
| **API** | unified-calculator.ts | `level` | `number` | Quadratic from totalScore |
| **API** | unified-calculator.ts | `rankTier` | `string` | Tier lookup from totalScore |

**Current Issues:**
- ❌ API Guild routes use `rank_tier` (should be `rankTier`)
- ✅ API Viral routes use `rankTier` (correct)

---

## 🔧 MIGRATION CHECKLIST

### Priority 1: Supabase Schema Changes (Database Migration)

- [ ] Rename `user_profiles.points` → `points_balance`
- [ ] Rename `user_profiles.total_points_earned` → `total_earned_from_gms`
- [ ] Keep `user_profiles.total_points_spent` (already correct)
- [ ] Update indexes on renamed columns
- [ ] Add column comments for documentation

### Priority 2: Backend Query Updates

- [ ] Update all Supabase queries using `points` → `points_balance`
- [ ] Update all Supabase queries using `total_points_earned` → `total_earned_from_gms`
- [ ] Test all profile/stats endpoints

### Priority 3: API Response Standardization

**Guild Routes:**
- [ ] `app/api/guild/[guildId]/route.ts`: 
  - [ ] `base_points` → `pointsBalance` (or `blockchainPoints`)
  - [ ] `viral_xp` → `totalViralXP`
  - [ ] `total_score` → `totalScore`
  - [ ] `rank_tier` → `rankTier`
  - [ ] `is_guild_officer` → `isGuildOfficer`
- [ ] `app/api/guild/[guildId]/members/route.ts`: Same changes
- [ ] `app/api/guild/[guildId]/member-stats/route.ts`: Same changes

**Viral Routes:**
- [ ] `app/api/viral/stats/route.ts`: Check if using `blockchainPoints` consistently
- [ ] `app/api/viral/leaderboard/route.ts`: Standardize to `totalScore`, `rankTier`

### Priority 4: TypeScript Type Updates

- [ ] Update `lib/subsquid-client.ts` types to match new names
- [ ] Update `lib/scoring/unified-calculator.ts` if needed
- [ ] Update any type definitions importing from these files

### Priority 5: Test Data Consistency

- [ ] Use FID 18139 consistently across all tests
- [ ] Update test-infrastructure endpoint to use new field names
- [ ] Verify all 6 routes return consistent data

---

## ✅ FINAL STANDARD (After Migration)

### Blockchain Points
- `pointsBalance` (current spendable, can decrease)
- `totalEarnedFromGMs` (lifetime GM earnings, only increases)
- `totalPointsSpent` (lifetime spending)
- `currentStreak`, `lifetimeGMs`, `lastGMTimestamp`

### Off-Chain Points
- `viralBonusXP` (single cast), `totalViralXP` (aggregated)
- `viralScore`, `viralTier`
- `rewardPoints` (quest definition), `pointsAwarded` (quest completion), `totalQuestPoints` (aggregated)
- `pointsContributed` (guild member), `totalPoints` (guild total)
- `pointsEarned` (referral total), `pointsAwarded` (single referral)

### Calculated Scores
- `totalScore` (sum of all point types)
- `level` (from totalScore)
- `rankTier` (from totalScore)

### All Fields Use:
- **Subsquid/Supabase:** snake_case (database convention)
- **API:** camelCase (JavaScript convention)
- **NO translation layer** - API names = camelCase version of database names
