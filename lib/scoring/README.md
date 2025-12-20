# Unified Scoring Engine

**Single source of truth for ALL scoring calculations in Gmeowbased**

Created: December 20, 2025

## Purpose

This unified calculation library consolidates ALL scoring logic from:
- `lib/leaderboard/rank.ts` (428 lines) - Level progression, 12-tier ranks, multipliers
- `lib/viral/viral-bonus.ts` (279 lines) - Viral engagement scoring & XP tiers
- `lib/profile/stats-calculator.ts` (267 lines) - Display formatting & derived stats
- `lib/profile/profile-service.ts` - Data aggregation orchestration

**Goal**: Create single authoritative source to prevent confusion about calculation logic across 3-layer architecture.

---

## 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Blockchain (Subsquid Indexer)                     │
├─────────────────────────────────────────────────────────────┤
│ • GM rewards (with streak multiplier applied in contract)  │
│ • GM streak tracking (User.currentStreak)                  │
│ • NFT badge ownership (minted badges)                      │
│ • Guild membership (guild join events)                     │
│                                                             │
│ Storage: Subsquid User.totalPoints                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Off-Chain (Supabase Database)                     │
├─────────────────────────────────────────────────────────────┤
│ • Quest completions (user_quest_progress, via website)     │
│ • Viral bonus XP (badge_casts.viral_bonus_xp)             │
│ • Guild activity (guild_members, via website)              │
│ • Referral rewards (referrals, via bot API calls)          │
│                                                             │
│ Storage: Supabase tables                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Application Logic (This File)                     │
├─────────────────────────────────────────────────────────────┤
│ • Total score = Layer1 + Layer2                            │
│ • Level progression (quadratic formula)                    │
│ • Rank tier assignment (12-tier system)                    │
│ • Multiplier application (rank-based XP boost)             │
│ • Display formatting (human-readable numbers)              │
│                                                             │
│ Computation: Real-time in profile-service.ts               │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Calculation Flow

```typescript
// 1. FETCH LAYER 1 (Blockchain via Subsquid)
const subsquidUser = await fetchSubsquidUser(fid)
const blockchainPoints = subsquidUser.totalPoints  // GM rewards

// 2. FETCH LAYER 2 (Off-Chain via Supabase)
const viralXP = await sumViralBonusXP(fid)
const questPoints = await sumQuestPoints(fid)
const guildPoints = await sumGuildPoints(fid)
const referralPoints = await sumReferralPoints(fid)

// 3. CALCULATE TOTAL SCORE
const totalScore = blockchainPoints + viralXP + questPoints + guildPoints + referralPoints

// 4. DERIVE LEVEL (Quadratic Progression)
const level = calculateLevelProgress(totalScore)
// Formula: 300 + (level-1) × 200 XP per level

// 5. DERIVE RANK TIER (12-Tier System)
const rank = calculateRankProgress(totalScore)
// Tiers: Signal Kitten (0) → Omniversal Being (500K+)

// 6. APPLY MULTIPLIERS (Rank-Based)
const earnedXP = applyRankMultiplier(baseXP, totalScore)
// Multipliers: 1.1x to 2.0x based on rank tier
```

---

## Usage Examples

### Basic: Calculate Complete Stats

```typescript
import { calculateCompleteStats } from '@/lib/scoring/unified-calculator'

const stats = calculateCompleteStats({
  // Layer 1: Blockchain
  blockchainPoints: 5000,      // Subsquid User.totalPoints
  currentStreak: 15,           // Subsquid User.currentStreak
  lastGMTimestamp: 1734700000, // Subsquid User.lastGMTimestamp
  lifetimeGMs: 45,            // Subsquid User.lifetimeGMs
  
  // Layer 2: Off-Chain
  viralXP: 1250,              // SUM(badge_casts.viral_bonus_xp)
  questPoints: 500,           // SUM(user_quest_progress.points)
  guildPoints: 200,           // SUM(guild_activity.points)
  referralPoints: 50,         // SUM(referrals.points)
})

console.log(stats)
// {
//   scores: {
//     blockchainPoints: 5000,
//     viralXP: 1250,
//     questPoints: 500,
//     guildPoints: 200,
//     referralPoints: 50,
//     totalScore: 7000
//   },
//   level: {
//     level: 5,
//     xpToNextLevel: 300,
//     levelPercent: 0.57,
//     ...
//   },
//   rank: {
//     currentTier: { name: 'Night Operator', ... },
//     nextTier: { name: 'Star Captain', ... },
//     percent: 0.75,
//     pointsToNext: 1000,
//     ...
//   },
//   formatted: {
//     totalScore: "7.0k",
//     blockchainPoints: "5.0k",
//     viralXP: "1.3k",
//     level: "5",
//     rankTier: "Night Operator"
//   },
//   streak: 15,
//   lastGMTimestamp: 1734700000,
//   lifetimeGMs: 45
// }
```

### Level Progression Only

```typescript
import { calculateLevelProgress } from '@/lib/scoring/unified-calculator'

const levelData = calculateLevelProgress(1250) // Total score
// {
//   level: 4,
//   levelFloor: 800,
//   nextLevelTarget: 1500,
//   xpIntoLevel: 450,
//   xpForLevel: 700,
//   xpToNextLevel: 250,
//   levelPercent: 0.64
// }
```

### Rank Progression Only

```typescript
import { calculateRankProgress } from '@/lib/scoring/unified-calculator'

const rankData = calculateRankProgress(8000)
// {
//   currentTier: {
//     name: 'Star Captain',
//     minPoints: 8000,
//     maxPoints: 15000,
//     tier: 'intermediate',
//     reward: { type: 'multiplier', value: 1.2 }
//   },
//   nextTier: {
//     name: 'Nebula Commander',
//     minPoints: 15000,
//     ...
//   },
//   percent: 0.0,           // 0% into Star Captain tier
//   pointsToNext: 7000,     // 7K points to Nebula Commander
//   ...
// }
```

### Apply Rank Multiplier

```typescript
import { applyRankMultiplier } from '@/lib/scoring/unified-calculator'

// User at 8,000 points (Star Captain, +20% multiplier)
const baseXP = 100
const totalScore = 8000
const finalXP = applyRankMultiplier(baseXP, totalScore)
// finalXP = 120 (100 × 1.2)

// User at 1,000 points (Warp Scout, no multiplier)
const baseXP2 = 100
const totalScore2 = 1000
const finalXP2 = applyRankMultiplier(baseXP2, totalScore2)
// finalXP2 = 100 (no multiplier)
```

### Viral Engagement Scoring

```typescript
import { 
  calculateEngagementScore, 
  getViralTier, 
  calculateViralBonus,
  calculateIncrementalBonus,
  estimateNextTier
} from '@/lib/scoring/unified-calculator'

// Calculate engagement score
const metrics = { likes: 15, recasts: 3, replies: 2 }
const score = calculateEngagementScore(metrics)
// score = (3×10) + (2×5) + (15×2) = 70

// Get viral tier
const tier = getViralTier(score)
// tier = { name: 'Viral', emoji: '⚡', xp: 250, minScore: 50, ... }

// Full viral bonus calculation
const bonus = calculateViralBonus(metrics)
// {
//   score: 70,
//   tier: { name: 'Viral', xp: 250, ... },
//   xp: 250,
//   breakdown: { recasts: 30, replies: 10, likes: 30 }
// }

// Calculate incremental bonus (prevents double-rewards)
const previousMetrics = { likes: 10, recasts: 2, replies: 1 }
const currentMetrics = { likes: 25, recasts: 5, replies: 3 }
const incrementalXP = calculateIncrementalBonus(currentMetrics, previousMetrics)
// Only awards XP for NEW engagement (400 XP difference)

// Estimate next tier (gamification)
const estimate = estimateNextTier(score, tier)
// {
//   nextTier: { name: 'Mega Viral', xp: 500, ... },
//   scoreNeeded: 30,
//   suggestedEngagement: "3 more recasts"
// }
```

### Display Formatting

```typescript
import {
  formatPoints,
  formatNumber,
  formatMemberAge,
  formatLastActive,
  getMemberAgeDays
} from '@/lib/scoring/unified-calculator'

// Format points with K/M suffix
formatPoints(1500)      // "1.5k"
formatPoints(1500000)   // "1.5M"
formatPoints(250)       // "250"

// Format numbers with commas
formatNumber(1234567)   // "1,234,567"

// Format member age
const onboardDate = "2024-10-01T00:00:00Z"
formatMemberAge(onboardDate)  // "3 months"
getMemberAgeDays(onboardDate) // 81 (days)

// Format last active
const lastActive = "2025-12-20T10:00:00Z"
formatLastActive(lastActive)  // "2 hours ago" or "Just now"
```

---

## Formulas Reference

### Level Progression (Quadratic)

```
XP for level N = 300 + (N-1) × 200

Examples:
  Level 1: 300 XP
  Level 2: 500 XP (300 + 200)
  Level 3: 700 XP (300 + 400)
  Level 10: 2100 XP (300 + 1800)

Total XP to reach level N:
  XP = (100 × N²) + (100 × N)
```

### 12-Tier Rank System

| Tier | Points | Reward |
|------|--------|--------|
| Signal Kitten | 0 - 500 | First Steps Badge |
| Warp Scout | 500 - 1.5K | Explorer Badge |
| Beacon Runner | 1.5K - 4K | **+10% Quest XP** |
| Night Operator | 4K - 8K | Streak Master Badge |
| Star Captain | 8K - 15K | **+20% Quest XP** |
| Nebula Commander | 15K - 25K | Guild Founder Badge |
| Quantum Navigator | 25K - 40K | **+30% Quest XP** |
| Cosmic Architect | 40K - 60K | System Builder Badge |
| Void Walker | 60K - 100K | **+50% Quest XP** |
| Singularity Prime | 100K - 250K | Legendary Pilot Badge |
| Infinite GM | 250K - 500K | **+100% Quest XP** |
| Omniversal Being | 500K+ | Custom Role + Discord Access |

### Viral Engagement Scoring

```
Engagement Score = (Recasts × 10) + (Replies × 5) + (Likes × 2)

Tier Thresholds:
  Mega Viral: 100+ score → 500 XP
  Viral:      50+ score  → 250 XP
  Popular:    20+ score  → 100 XP
  Engaging:   10+ score  → 50 XP
  Active:     5+ score   → 25 XP
```

---

## Migration Guide

### Replacing Old Calculations

**Before (OLD)**:
```typescript
// Multiple imports from different files
import { calculateLevel } from '@/lib/leaderboard/rank'
import { calculateViralBonus } from '@/lib/viral/viral-bonus'
import { calculateStats } from '@/lib/profile/stats-calculator'
```

**After (NEW)**:
```typescript
// Single import from unified engine
import { calculateCompleteStats } from '@/lib/scoring/unified-calculator'

const stats = calculateCompleteStats({
  blockchainPoints: subsquidUser.totalPoints,
  currentStreak: subsquidUser.currentStreak,
  lastGMTimestamp: subsquidUser.lastGMTimestamp,
  lifetimeGMs: subsquidUser.lifetimeGMs,
  viralXP: viralSum,
  questPoints: questSum,
  guildPoints: guildSum,
  referralPoints: referralSum,
})
```

### Deprecation Timeline

1. ✅ **Phase 1 (Current)**: Unified calculator created
2. ⏳ **Phase 2**: Update profile-service.ts to use unified calculator
3. ⏳ **Phase 3**: Update hybrid-calculator.ts to use unified calculator
4. ⏳ **Phase 4**: Mark old files as deprecated (add warnings)
5. ⏳ **Phase 5**: Remove old calculation files after 1 month

---

## Constants

All tier thresholds and formulas are **immutable** and defined in `unified-calculator.ts`:

```typescript
// Level progression
LEVEL_XP_BASE = 300
LEVEL_XP_INCREMENT = 200

// Engagement weights
ENGAGEMENT_WEIGHTS = { RECAST: 10, REPLY: 5, LIKE: 2 }

// Viral tiers
VIRAL_TIERS = { mega_viral, viral, popular, engaging, active, none }

// 12 rank tiers
IMPROVED_RANK_TIERS = [ /* 12 tiers */ ]
```

---

## Critical Rules

✅ **ALL scoring calculations MUST go through this file**
✅ **NO calculations should be duplicated in other files**
✅ **ALL formulas must match contract logic**
✅ **ALL tier thresholds are immutable (no runtime changes)**

❌ **NO direct database writes (read-only calculations)**
❌ **NO mixing XP/Points terminology (use Points everywhere)**
❌ **NO emojis in calculation logic (icons only)**

---

## Testing

```typescript
import { calculateCompleteStats } from '@/lib/scoring/unified-calculator'

// Test case 1: New user (0 points)
const newUser = calculateCompleteStats({
  blockchainPoints: 0,
  currentStreak: 0,
  lastGMTimestamp: null,
  lifetimeGMs: 0,
  viralXP: 0,
})
expect(newUser.level.level).toBe(1)
expect(newUser.rank.currentTier.name).toBe('Signal Kitten')

// Test case 2: Star Captain tier (+20% multiplier)
const starCaptain = calculateCompleteStats({
  blockchainPoints: 8000,
  currentStreak: 30,
  lastGMTimestamp: Date.now(),
  lifetimeGMs: 100,
  viralXP: 0,
})
expect(starCaptain.rank.currentTier.name).toBe('Star Captain')
expect(starCaptain.rank.currentTier.reward?.value).toBe(1.2)
```

---

## References

- **COMPLETE-CALCULATION-SYSTEM.md** - Full system architecture documentation
- **contract/modules/BaseModule.sol** - Streak multiplier percentages
- **contract/libraries/CoreLogicLib.sol** - GM reward calculation
- **gmeow-indexer/src/main.ts** - Event indexing logic
- **lib/profile/profile-service.ts** - Data orchestration layer

---

## Support

For questions or issues:
1. Check COMPLETE-CALCULATION-SYSTEM.md for architecture details
2. Review this README for formula explanations
3. Trace contract logic in CoreLogicLib.sol
4. Verify indexer behavior in gmeow-indexer/src/main.ts

**DO NOT** create new calculation files. ALL logic belongs in `unified-calculator.ts`.
