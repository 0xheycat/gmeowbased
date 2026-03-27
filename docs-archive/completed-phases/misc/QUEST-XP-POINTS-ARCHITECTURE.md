# Quest Reward System: XP vs Points Architecture
**Date**: December 25, 2025  
**Status**: Production Implementation  
**Reference**: QUEST-NAMING-AUDIT-REPORT.md, QUEST-SYSTEM-PRODUCTION-FIXES.md

---

## Executive Summary

Quests use a **dual reward system** with **single value storage**:

```
Quest Creator Sets: reward_points_awarded = 100
                            ↓
                Quest Completion
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
  POINTS = 100                             XP = 100
  (Onchain Currency)                   (Offline Progression)
  
  • Spendable                          • Non-spendable
  • Escrow for quests                  • Level/rank only
  • Decreases when spent               • Never decreases
  • Contract-tracked                   • Database-tracked
```

---

## Two Separate Reward Types

### 1. Points (Onchain Currency)

**Purpose**: Spendable economic currency  
**Lifecycle**: Earned → Spent → Refunded  
**Storage**: Multiple tables tracking balance  
**Contract Event**: `QuestCompleted(pointsAwarded)`

**Database Flow**:
```
unified_quests.reward_points_awarded (definition)
        ↓
quest_completions.points_awarded (distribution record)
        ↓
user_points_balances.points_balance (current spendable balance)
```

**Usage Examples**:
- ✅ Create new quest (escrow 100 Points)
- ✅ Purchase NFT badge (spend 50 Points)
- ✅ Join guild raffle (spend 200 Points)

**Balance Calculation**:
```typescript
// user_points_balances.total_score
total_score = points_balance + viral_points + guild_points_awarded
```

---

### 2. XP (Offline Progression)

**Purpose**: Level/rank progression (cannot be spent)  
**Lifecycle**: Earned → Accumulated → Level Up  
**Storage**: `user_points.xp` column  
**Source**: Unified calculator (off-chain logic)

**Database Flow**:
```
unified_quests.reward_points_awarded (same value as Points)
        ↓
increment_user_xp() RPC function (distribution)
        ↓
user_points.xp (lifetime accumulation)
        ↓
Computed: level, rank, tier
```

**Usage Examples**:
- ✅ Quest completion awards XP
- ✅ Level increases from 5 → 6
- ✅ Rank calculated: top 100 users
- ❌ Cannot spend XP (not a currency)

**Level Calculation**:
```typescript
// lib/unified-calculator.ts (conceptual)
function calculateLevel(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 500) return 2;
  if (xp < 1000) return 3;
  // ... tier-based progression
}
```

---

## Current Implementation

### Quest Definition

**Schema** (Supabase):
```sql
CREATE TABLE unified_quests (
  id bigserial PRIMARY KEY,
  reward_points_awarded bigint DEFAULT 0,  -- Single value for BOTH rewards
  -- No separate reward_xp column
);
```

**TypeScript** (lib/supabase/types/quest.ts):
```typescript
export interface Quest {
  reward_points_awarded: number;  // ✅ Correct: matches schema
  // Note: reward_xp is NOT stored, calculated at completion
}
```

### Quest Completion Flow

**File**: `lib/supabase/queries/quests.ts`

```typescript
async function completeQuestTask(questId, userFid, taskIndex, verificationProof) {
  // 1. Verify task completion
  // 2. Update progress
  
  // 3. If final task, award BOTH Points and XP
  if (isFinalTask) {
    const rewardAmount = questData.reward_points_awarded;  // Single value
    
    // Award Points (recorded in quest_completions)
    await supabase.from('quest_completions').insert({
      quest_id: questId,
      completer_fid: userFid,
      points_awarded: rewardAmount,  // Points distribution
    });
    
    // Award XP (via RPC function)
    await supabase.rpc('increment_user_xp', {
      p_fid: userFid,
      p_xp_amount: rewardAmount,  // XP distribution (same value)
      p_source: `quest_completion_${questId}`,
    });
  }
}
```

**Key Insight**: Same value (`reward_points_awarded`) used for BOTH distributions.

---

## Why Two Separate Systems?

### Economic Design

**Points (Currency)**:
- ✅ Creates economic loop (earn → spend → earn)
- ✅ Quest creation escrow prevents spam
- ✅ Marketplace transactions (badges, NFTs)
- ✅ Guild treasury deposits

**XP (Progression)**:
- ✅ Permanent achievement record
- ✅ Level/rank never decreases (motivational)
- ✅ Unlock features (higher tiers)
- ✅ Leaderboard without economic influence

### Divergence Over Time

**Example User Journey**:

```
Day 1: Complete Quest A (100 Points + 100 XP)
  • points_balance = 100
  • xp = 100
  • Both equal ✅

Day 2: Create Quest B (escrow 50 Points)
  • points_balance = 50  (decreased)
  • xp = 100            (unchanged)
  • NOW DIFFERENT ⚠️

Day 3: Complete Quest C (50 Points + 50 XP)
  • points_balance = 100 (50 + 50)
  • xp = 150            (100 + 50)
  • Permanently diverged

Day 4: Mint Badge (spend 30 Points)
  • points_balance = 70
  • xp = 150            (never decreases)
  • XP > Points forever
```

---

## Database Schema Reference

### Tables Involved

**Quest Rewards**:
```sql
-- Quest definition (single value)
unified_quests.reward_points_awarded

-- Points distribution record
quest_completions.points_awarded

-- XP tracked separately (no xp_awarded column in completions)
-- XP via increment_user_xp() → user_points.xp
```

**User Balances**:
```sql
-- Points balance (spendable)
user_points_balances.points_balance      -- Current spendable
user_points_balances.viral_points        -- From casts
user_points_balances.guild_points_awarded -- From guilds
user_points_balances.total_score         -- Sum of above (GENERATED)

-- XP balance (progression)
user_points.xp                           -- Lifetime XP (never decreases)
user_points.level                        -- Computed from XP
user_points.rank                         -- Computed from total_score
```

---

## Migration History

### Issue #4: XP and Points Separation (QUEST-SYSTEM-PRODUCTION-FIXES.md)

**Problem**: XP and Points were conflated  
**Solution**: Separated distribution at completion time

**Before** (incorrect):
```typescript
// Only awarded Points, no XP tracking
await supabase.from('quest_completions').insert({
  points_awarded: reward_points,
});
// XP never awarded ❌
```

**After** (correct):
```typescript
// Award Points
await supabase.from('quest_completions').insert({
  points_awarded: reward_points_awarded,
});

// Award XP separately
await supabase.rpc('increment_user_xp', {
  p_xp_amount: reward_points_awarded,  // Same value
});
```

---

## Naming Convention Compliance

### 4-Layer Alignment (POINTS-NAMING-CONVENTION.md)

**Points Field**:
| Layer | Field Name | Format | Status |
|-------|-----------|--------|--------|
| Contract | `pointsAwarded` | camelCase | ✅ |
| Subsquid | `pointsAwarded` | camelCase | ✅ |
| Supabase | `reward_points_awarded` | snake_case | ✅ |
| API/Types | `reward_points_awarded` | snake_case | ✅ |

**XP Tracking**:
| Layer | Field Name | Format | Status |
|-------|-----------|--------|--------|
| Contract | N/A (off-chain) | - | - |
| Subsquid | N/A | - | - |
| Supabase | `user_points.xp` | snake_case | ✅ |
| API/Types | `xp` | camelCase | ✅ |

---

## Future Enhancements (Optional)

### Option 1: Separate XP Values

Allow quest creators to set different XP and Points amounts:

```sql
ALTER TABLE unified_quests ADD COLUMN reward_xp bigint;
```

**Example**:
- Easy Quest: 50 Points + 100 XP (favor progression)
- Hard Quest: 200 Points + 50 XP (favor economy)

**Pros**: More flexible reward design  
**Cons**: More complex for creators, potential economic imbalance

### Option 2: XP Multipliers

Apply multipliers based on quest difficulty:

```typescript
const xpMultiplier = {
  beginner: 1.0,
  intermediate: 1.5,
  advanced: 2.0,
};

const xpAwarded = reward_points_awarded * xpMultiplier[difficulty];
```

**Pros**: Encourages harder quests  
**Cons**: Requires balancing, complexity

---

## Testing Checklist

### Quest Creation
- [ ] Set `reward_points_awarded = 100` in quest creation
- [ ] Verify field name matches schema (not `reward_points`)
- [ ] Escrow calculation uses `reward_points_awarded`

### Quest Completion
- [ ] Points recorded in `quest_completions.points_awarded`
- [ ] XP awarded via `increment_user_xp()` RPC
- [ ] Both use same value from `reward_points_awarded`
- [ ] `user_points_balances.points_balance` increases
- [ ] `user_points.xp` increases

### Balance Queries
- [ ] Points balance: `SELECT points_balance FROM user_points_balances`
- [ ] XP balance: `SELECT xp FROM user_points`
- [ ] Total score: `SELECT total_score FROM user_points_balances`

---

## API Examples

### Quest Creation

**Request**:
```bash
POST /api/quests/create
{
  "title": "Complete 3 Swaps",
  "reward_points_awarded": 100,  // ✅ Correct field name
  "category": "onchain"
}
```

**Database**:
```sql
INSERT INTO unified_quests (reward_points_awarded) VALUES (100);
```

### Quest Completion

**Request**:
```bash
POST /api/quests/quest-123/progress
{
  "userFid": 18139,
  "taskIndex": 2
}
```

**Backend Logic**:
```typescript
// 1. Award Points
await supabase.from('quest_completions').insert({
  points_awarded: 100  // From reward_points_awarded
});

// 2. Award XP (same value)
await supabase.rpc('increment_user_xp', {
  p_xp_amount: 100
});
```

---

## Common Mistakes to Avoid

❌ **WRONG**: Creating quest with `reward_points` field
```typescript
const quest = { reward_points: 100 };  // Field doesn't exist in schema
```

✅ **CORRECT**: Use `reward_points_awarded`
```typescript
const quest = { reward_points_awarded: 100 };
```

❌ **WRONG**: Storing XP in quest definition
```typescript
const quest = { reward_xp: 50 };  // Column doesn't exist
```

✅ **CORRECT**: XP calculated at completion
```typescript
// Quest stores only reward_points_awarded
// XP = reward_points_awarded (same value, distributed separately)
```

❌ **WRONG**: Querying XP from quest_completions
```typescript
const { xp_awarded } = await supabase
  .from('quest_completions')
  .select('xp_awarded');  // Column doesn't exist
```

✅ **CORRECT**: Query XP from user_points
```typescript
const { xp } = await supabase
  .from('user_points')
  .select('xp')
  .eq('fid', userFid);
```

---

## Summary

**One Value, Two Distributions**:
- Quest stores: `reward_points_awarded = 100`
- On completion:
  - Points: 100 (quest_completions.points_awarded)
  - XP: 100 (user_points.xp via RPC)

**Why Separate?**:
- Points: Spendable currency (escrow, marketplace)
- XP: Progression system (level, rank)

**Key Rule**: 
> `reward_points_awarded` is the contract-aligned source of truth.  
> Never use `reward_points` or `reward_xp` - they don't exist in schema.

---

**Document Owner**: Development Team  
**Last Updated**: December 25, 2025  
**Related Docs**: 
- QUEST-NAMING-AUDIT-REPORT.md (naming compliance)
- QUEST-SYSTEM-PRODUCTION-FIXES.md (Issue #4 - XP separation)
- POINTS-NAMING-CONVENTION.md (4-layer architecture)
