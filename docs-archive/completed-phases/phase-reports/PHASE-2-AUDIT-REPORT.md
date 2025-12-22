# Phase 2: Complete Function Audit & Migration

**Date**: December 20, 2025  
**Status**: In Progress

---

## Objective

Ensure ALL functions from deprecated files are available in `lib/scoring/unified-calculator.ts`.

---

## Deprecated Files Analysis

### 1. lib/leaderboard/rank.ts

**Exported Functions**:
- ✅ `calculateLevelProgress` - IN unified-calculator (line 431)
- ✅ `calculateRankProgress` - IN unified-calculator (line 516)
- ✅ `getRankTierByPoints` - IN unified-calculator (line 322)
- ✅ `getTotalXpToReachLevel` - IN unified-calculator (line 408)
- ✅ `formatPoints` - IN unified-calculator (line 727)
- ✅ `formatNumber` - IN unified-calculator (line 735)
- ✅ `formatXp` - IN unified-calculator (line 742)

**Exported Types**:
- ✅ `LevelProgress` - IN unified-calculator (line 385)
- ✅ `RankProgress` - IN unified-calculator (line 494)
- ✅ `RankTier` - IN unified-calculator (line 185)

**Status**: ✅ **100% COMPLETE** (all 10 exports present)

---

### 2. lib/viral/viral-bonus.ts

**Exported Functions**:
- ✅ `calculateViralBonus` - IN unified-calculator (line 628)
- ✅ `getViralTier` - IN unified-calculator (line 563)
- ✅ `calculateIncrementalBonus` - IN unified-calculator (line 706)
- ✅ `estimateNextTier` - IN unified-calculator (line 776)
- ✅ `formatEngagementMetrics` - ADDED in Phase 2 (line ~760)

**Exported Types**:
- ✅ `ViralTier` - IN unified-calculator (line 220)
- ✅ `ViralTierConfig` - IN unified-calculator (line 220)
- ✅ `EngagementMetrics` - IN unified-calculator (line 542)

**Status**: ✅ **100% COMPLETE** (all 8 exports present)

---

### 3. lib/profile/stats-calculator.ts

**Exported Functions**:
- ❌ `calculateStats` - **MISSING** from unified-calculator
- ✅ `getMemberAgeDays` - IN unified-calculator (line 795)
- ✅ `formatMemberAge` - IN unified-calculator (line 756)
- ❌ `calculateActivityRate` - **MISSING** from unified-calculator
- ✅ `formatLastActive` - IN unified-calculator (line 808)

**Exported Types**:
- ❌ `StatsCalculationResult` - **MISSING** from unified-calculator

**Status**: ⚠️ **60% COMPLETE** (3/5 functions, 0/1 type)

**MISSING EXPORTS**:
1. `calculateStats(stats: ProfileStats): StatsCalculationResult`
2. `calculateActivityRate(questCompletions: number, memberSince: string): number`
3. `StatsCalculationResult` interface

---

## Action Plan

### Step 1: Add Missing Functions ✅ DONE
- [x] Add `calculateStats` to unified-calculator
- [x] Add `calculateActivityRate` to unified-calculator
- [x] Add `StatsCalculationResult` interface

### Step 2: Update Imports (One by One)
- [ ] lib/bot/analytics/stats.ts
- [ ] lib/leaderboard/leaderboard-service.ts
- [ ] lib/profile/profile-data.ts
- [ ] components/XPEventOverlay.tsx
- [ ] components/leaderboard/LeaderboardTable.tsx
- [ ] components/viral/ViralBadgeMetrics.tsx
- [ ] components/viral/ViralTierBadge.tsx
- [ ] components/viral/ViralStatsCard.tsx
- [ ] components/profile/ProfileStats.tsx
- [ ] components/GMButton.tsx

### Step 3: Verify Each Migration
- [ ] Type check after each file
- [ ] Ensure no runtime errors
- [ ] Document any special cases

---

## Migration Results

### Added to Unified Calculator (Phase 2)
1. ✅ `formatEngagementMetrics` (line ~760)
2. ✅ `StatsCalculationResult` interface (line ~910)
3. ✅ `ProfileStats` interface (line ~930) - Full 23-field interface
4. ✅ `calculateStats` legacy wrapper (line ~963) - **FIXED to match unified system**
5. ✅ `calculateActivityRate` (line ~1014)

### Critical Fixes Applied
- ✅ **Interface Matching**: calculateStats now accepts FULL ProfileStats (23 fields)
- ✅ **Streak Calculation**: Fixed from 100 pts/day → 10 pts/day (matches original)
- ✅ **Rank Tier Source**: Uses total_score (UNIFIED SYSTEM) not base_points
- ✅ **Type Safety**: Added ProfileStats interface to avoid circular imports

### Unified System Principles Verified
1. ✅ Core calculations use unified functions (calculateLevelProgress, getRankTierByPoints)
2. ✅ Formatters use unified functions (formatNumber, formatPoints)
3. ✅ Rank tier calculated from total_score (not base_points)
4. ✅ All interfaces match existing type definitions

---

## Next Steps

1. Migrate imports one by one (NOT in bulk)
2. Test each file individually after migration
3. Commit after each successful migration
4. Document any issues or special cases

---

## ⚠️ PHASE 2 MIGRATION CHECKLIST (Use for EVERY file migration)

Before migrating any file import, you MUST:

### 1. Read Current Import Statement
```bash
grep "from '@/lib/leaderboard/rank'" <file_path>
grep "from '@/lib/viral/viral-bonus'" <file_path>
grep "from '@/lib/profile/stats-calculator'" <file_path>
```

### 2. Verify Function Exists in Unified Calculator
```bash
grep "^export function <function_name>" lib/scoring/unified-calculator.ts
grep "^export (interface|type) <type_name>" lib/scoring/unified-calculator.ts
```

### 3. Check Function Signature Match
- Open `lib/scoring/unified-calculator.ts`
- Find the function definition (line number from grep)
- Compare parameters and return type with old file
- ✅ Signature matches → Safe to migrate
- ❌ Signature differs → Document in special cases

### 4. Update Import Statement (One file at a time)
```typescript
// BEFORE
import { calculateRankProgress } from '@/lib/leaderboard/rank'

// AFTER  
import { calculateRankProgress } from '@/lib/scoring/unified-calculator'
```

### 5. Handle Function Name Changes
- `getImprovedRankTierByPoints` → `getRankTierByPoints` (simplified)
- Update ALL function calls in the file
- Search for all occurrences: `grep "<old_name>" <file_path>`

### 6. Type Check After Migration
```bash
npx tsc --noEmit <file_path> 2>&1 | grep "error TS"
```
- ✅ No errors → Commit
- ❌ Has errors → Fix before proceeding

### 7. Verify Unified System Integration
- [ ] Uses unified calculator functions (not inline calculations)
- [ ] Interfaces match ProfileStats/RankProgress/ViralTier
- [ ] No breaking changes to component API
- [ ] Formatters use unified formatters (formatNumber, formatPoints, formatXp)
- [ ] 0 TypeScript errors

### 8. Commit After Each Successful Migration
```bash
git add <file_path>
git commit -m "migrate: <file_name> to unified calculator

- Changed: <function_names> → @/lib/scoring/unified-calculator
- Verified: Type checking passed
- Status: ✅ No breaking changes"
```

### 9. Document Special Cases
If migration requires special handling:
- Interface mismatch → Update PHASE-2-AUDIT-REPORT.md
- Function signature differs → Document workaround
- Component needs refactor → Mark as future task

---