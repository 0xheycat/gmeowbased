# 🚨 CRITICAL ARCHITECTURE CORRECTION: Points vs XP

**Date**: December 20, 2025  
**Issue**: Mislabeling of on-chain "POINTS" as "XP" in indexer and documentation  
**Impact**: HIGH - Affects all leaderboard, profile, and stats queries

---

## ❌ THE PROBLEM

Our smart contracts **DO NOT HAVE AN XP SYSTEM**. They only have a **POINTS SYSTEM**.

### What's Actually On-Chain (GmeowCore.sol):

```solidity
// Storage
mapping(address => uint256) public pointsBalance;    // ✅ Available points
mapping(address => uint256) public pointsLocked;     // ✅ Staked points  
mapping(address => uint256) public userTotalEarned;  // ✅ Total points earned
mapping(address => uint256) public gmStreak;         // ✅ Streak count

// Events
event GMSent(address indexed user, uint256 streak, uint256 pointsEarned);
event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, ...);
event PointsTipped(address indexed from, address indexed to, uint256 points, uint256 fid);
```

**NO `totalXP` VARIABLE EXISTS ON-CHAIN!**

### What the Indexer Incorrectly Does:

```typescript
// ❌ WRONG: Mislabeling points as XP
user.totalXP += points  // This is actually totalPOINTS!

gmEvents.push(new GMEvent({
  xpAwarded: points,  // ❌ Wrong field name - should be pointsAwarded
}))
```

### What the Schema Incorrectly Says:

```graphql
type User @entity {
  totalXP: BigInt!  # ❌ WRONG - This is actually totalPoints
}

type GMEvent @entity {
  xpAwarded: BigInt!  # ❌ WRONG - This is actually pointsAwarded
}
```

---

## ✅ THE CORRECT ARCHITECTURE

### Layer 1: ON-CHAIN (Blockchain via Subsquid)

**What's Stored:**
- ✅ **Points** (earned from GM, Quests, Tips)
- ✅ **Streaks** (consecutive days)
- ✅ **Badge Mints** (NFT ownership)
- ✅ **Guild Events** (joins, deposits)
- ✅ **Referral Events** (network tracking)

**NOT Stored:**
- ❌ XP
- ❌ Levels  
- ❌ Rank Tiers
- ❌ Percentiles

### Layer 2: OFF-CHAIN (Supabase)

**What's Stored:**
- ✅ User profiles (FID, username, avatar)
- ✅ Viral bonus XP (calculated from Farcaster engagement)
- ✅ Badge metadata
- ✅ Quest descriptions
- ✅ Guild metadata

### Layer 3: CALCULATED (Application Logic)

**What's Derived:**
```typescript
// XP = On-chain Points + Off-chain Viral Bonus
const totalXP = blockchainPoints + viralBonusXP

// Level calculated from total XP
const { level, progress } = calculateLevelProgress(totalXP)

// Rank tier calculated from total XP  
const rankTier = getRankTierByPoints(totalXP)  
// "Signal Kitten" → "Crypto Cat" → ... → "Legendary"
```

---

## 🔧 REQUIRED FIXES

### 1. Subsquid Schema (gmeow-indexer/schema.graphql)

```graphql
# ❌ BEFORE (WRONG):
type User @entity {
  totalXP: BigInt!
}

type GMEvent @entity {
  xpAwarded: BigInt!
}

# ✅ AFTER (CORRECT):
type User @entity {
  totalPoints: BigInt!  # Earned from blockchain
  totalXPCalculated: BigInt  # Optional: points + viral (calculated)
}

type GMEvent @entity {
  pointsAwarded: BigInt!  # From GMSent event
}
```

### 2. Subsquid Processor (gmeow-indexer/src/main.ts)

```typescript
// ❌ BEFORE (WRONG):
user.totalXP += points

// ✅ AFTER (CORRECT):
user.totalPoints += points
```

### 3. Subsquid Client (lib/subsquid-client.ts)

```typescript
// ❌ BEFORE (WRONG):
const stats = await getLeaderboardEntry(fid)
// Returns: { totalScore: stats.totalXP }

// ✅ AFTER (CORRECT):
const stats = await getLeaderboardEntry(fid)
// Returns: { totalScore: stats.totalPoints }
```

### 4. Profile Service (lib/profile/profile-service.ts)

```typescript
// ✅ CORRECT FLOW:
// 1. Get blockchain points
const onchainData = await getLeaderboardEntry(fid)
const blockchainPoints = Number(onchainData.totalPoints || 0)

// 2. Get viral bonus (off-chain)
const { data: viral } = await supabase
  .from('viral_bonus_xp')
  .select('viral_bonus_xp')
  .eq('fid', fid)
  .single()

// 3. Calculate total XP (application layer)
const totalXP = blockchainPoints + (viral?.viral_bonus_xp || 0)

// 4. Calculate derived metrics
const { level, progress } = calculateLevelProgress(totalXP)
const rankTier = getRankTierByPoints(totalXP)
```

### 5. Documentation Updates

Update all docs to reflect:
- "Points" = on-chain currency
- "XP" = calculated metric (points + viral bonus)
- "Level" = derived from XP
- "Rank Tier" = derived from XP

---

## 📊 DATA FLOW EXAMPLE

### User Profile Query:

```
1. Subsquid:     totalPoints = 1000 (from blockchain)
2. Supabase:     viral_bonus_xp = 250 (from Farcaster)
3. Calculated:   totalXP = 1250
4. Calculated:   level = 5 (from calculateLevelProgress)
5. Calculated:   rank_tier = "Crypto Cat" (from getRankTierByPoints)

Response:
{
  points: 1000,           // Layer 1: Blockchain
  viral_xp: 250,          // Layer 2: Supabase
  total_xp: 1250,         // Layer 3: Calculated
  level: 5,               // Layer 3: Calculated
  rank_tier: "Crypto Cat" // Layer 3: Calculated
}
```

---

## 🎯 TERMINOLOGY STANDARDS

| Term | Definition | Storage Location |
|------|------------|------------------|
| **Points** | On-chain currency earned from GM/Quests/Tips | Blockchain (Subsquid) |
| **Viral Bonus** | Off-chain XP from Farcaster engagement | Supabase |
| **Total XP** | Points + Viral Bonus (calculated) | **NOT STORED** - Calculated |
| **Level** | Progression tier (1-100) | **NOT STORED** - Calculated from XP |
| **Rank Tier** | Status name (Signal Kitten → Legendary) | **NOT STORED** - Calculated from XP |

---

## ⚠️ MIGRATION CHECKLIST

- [ ] Update Subsquid schema (`totalXP` → `totalPoints`)
- [ ] Regenerate schema types: `npm run codegen` in gmeow-indexer
- [ ] Update processor logic (src/main.ts)
- [ ] Clear and re-sync indexer database
- [ ] Update lib/subsquid-client.ts queries
- [ ] Update lib/profile/profile-service.ts
- [ ] Update all route handlers
- [ ] Update HYBRID-IMPLEMENTATION-COMPLETE-PLAN.md
- [ ] Update INFRASTRUCTURE-USAGE-QUICK-REF.md
- [ ] Test all leaderboard/profile routes
- [ ] Verify frontend displays correctly

---

## 📖 REFERENCES

**Smart Contracts:**
- `/contract/modules/CoreModule.sol` - Points system implementation
- `/contract/modules/BaseModule.sol` - Event definitions

**Indexer:**
- `/gmeow-indexer/schema.graphql` - GraphQL schema (needs update)
- `/gmeow-indexer/src/main.ts` - Event processor (needs update)

**Application Layer:**
- `/lib/subsquid-client.ts` - Blockchain data queries
- `/lib/leaderboard/rank.ts` - XP → Level/Tier calculations
- `/lib/profile/profile-service.ts` - Profile data assembly

**Documentation:**
- `/HYBRID-IMPLEMENTATION-COMPLETE-PLAN.md` - Architecture overview
- `/INFRASTRUCTURE-USAGE-QUICK-REF.md` - Implementation patterns

---

**Status**: 🚨 CRITICAL - Must fix before production deployment
**Next Steps**: Update schema → regenerate types → re-sync indexer → update client queries
