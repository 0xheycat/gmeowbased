# Points & Scoring Naming Convention

**Created:** December 22, 2025  
**Purpose:** Standardize all points-related naming across contracts, indexer, API, and database

## 🚨 CRITICAL ISSUES FOUND

### Issue 1: Data Inconsistency
- **Guild route**: FID 602828, wallet 0x8870C155..., points: 5000
- **Test route**: FID 18139, wallet 0x7539472..., points: 20
- **Problem**: Using different test users, mixing mock and real data

### Issue 2: Naming Confusion
Multiple overlapping terms for points:
- `pointsBalance` (contract + Subsquid)
- `totalPoints` (guild aggregation, leaderboard)
- `totalScore` (calculated value)
- `base_points` (API response)
- `pointsEarned` (event field)
- `rewardPoints` (event field)
- `totalEarnedFromGMs` (Subsquid cumulative)

---

## 📋 OFFICIAL NAMING STANDARD

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
