# Phase 2: Unified Calculator Migration - Complete Import Updates

**Date**: December 20, 2025  
**Status**: In Progress

---

## Objective

Update ALL remaining imports across the codebase to use the new unified calculator (`lib/scoring/unified-calculator.ts`) instead of deprecated files.

---

## Files Requiring Migration

### Active Code Files (Priority)

1. **lib/bot/analytics/stats.ts**
   - `import { calculateRankProgress } from '@/lib/leaderboard/rank'`
   - Update to: `from '@/lib/scoring/unified-calculator'`

2. **lib/leaderboard/leaderboard-service.ts**
   - `import { calculateLevelProgress, getRankTierByPoints } from '@/lib/leaderboard/rank'`
   - Update to: `from '@/lib/scoring/unified-calculator'`

3. **lib/profile/profile-data.ts**
   - `import { calculateRankProgress } from '@/lib/leaderboard/rank'`
   - Update to: `from '@/lib/scoring/unified-calculator'`

4. **components/XPEventOverlay.tsx**
   - `import { calculateRankProgress, type RankProgress } from '@/lib/leaderboard/rank'`
   - Update to: `from '@/lib/scoring/unified-calculator'`

5. **components/leaderboard/LeaderboardTable.tsx**
   - `import { getImprovedRankTierByPoints } from '@/lib/leaderboard/rank'`
   - Update to: `getRankTierByPoints from '@/lib/scoring/unified-calculator'`

6. **components/viral/ViralBadgeMetrics.tsx**
   - `import { getViralTier, type ViralTier } from '@/lib/viral/viral-bonus'`
   - Update to: `from '@/lib/scoring/unified-calculator'`

7. **components/viral/ViralTierBadge.tsx**
   - `import { type ViralTierConfig } from '@/lib/viral/viral-bonus'`
   - Update to: `from '@/lib/scoring/unified-calculator'`

8. **components/viral/ViralStatsCard.tsx**
   - `import { getViralTier, estimateNextTier, formatEngagementMetrics, type EngagementMetrics } from '@/lib/viral/viral-bonus'`
   - Update to: `from '@/lib/scoring/unified-calculator'`

9. **components/profile/ProfileStats.tsx**
   - `import { calculateStats, formatLastActive } from '@/lib/profile/stats-calculator'`
   - Update to: `calculateCompleteStats, formatLastActive from '@/lib/scoring/unified-calculator'`

10. **components/GMButton.tsx**
    - `import { calculateRankProgress } from '@/lib/leaderboard/rank'`
    - Update to: `from '@/lib/scoring/unified-calculator'`

### Documentation Files (Low Priority)
- UNIFIED-CALCULATOR-MIGRATION.md (examples only)
- HYBRID-IMPLEMENTATION-COMPLETE-PLAN.md (examples only)
- lib/scoring/README.md (examples only)
- lib/README.md (examples only)

### Backup Files (Skip)
- .backup/* (archived code)

---

## Migration Strategy

1. ✅ Update lib/ files first (infrastructure)
2. ✅ Update components/ files second (UI)
3. ✅ Run type checking after each batch
4. ✅ Test with real data
5. ✅ Update documentation last

---

## Progress Tracking

- [x] lib/bot/analytics/stats.ts ✅
- [x] lib/leaderboard/leaderboard-service.ts ✅
- [x] lib/profile/profile-data.ts ✅
- [x] components/XPEventOverlay.tsx ✅
- [x] components/leaderboard/LeaderboardTable.tsx ✅
- [x] components/viral/ViralBadgeMetrics.tsx ✅
- [x] components/viral/ViralTierBadge.tsx ✅
- [x] components/viral/ViralStatsCard.tsx ✅
- [x] components/profile/ProfileStats.tsx ✅ (partial - formatLastActive only)
- [x] components/GMButton.tsx ✅

---

## Special Cases

### `formatEngagementMetrics` - NOT in unified calculator
**Issue**: Used in `ViralStatsCard.tsx` but not exported from unified calculator
**Solution**: Need to add this function to unified calculator OR keep importing from viral-bonus.ts

### `getImprovedRankTierByPoints` vs `getRankTierByPoints`
**Old name**: `getImprovedRankTierByPoints`
**New name**: `getRankTierByPoints` (simplified)
**Action**: Update function name during migration

---

## Validation

After migration:
1. Run `npm run type-check` (ensure no TypeScript errors)
2. Run `npm run build` (ensure build succeeds)
3. Test key features:
   - Profile stats display
   - Leaderboard rendering
   - Viral tier badges
   - Level progression
   - Rank tier assignments

---

## Rollback Plan

If issues arise:
1. Deprecated files still exist (backward compatible)
2. Can revert individual file imports
3. No database changes required
4. Safe to rollback at any time

---

## Migration Results

### ✅ Successfully Migrated (10 files)

1. **lib/bot/analytics/stats.ts**
   - Changed: `calculateRankProgress` from `@/lib/leaderboard/rank` → `@/lib/scoring/unified-calculator`

2. **lib/leaderboard/leaderboard-service.ts**
   - Changed: `calculateLevelProgress, getRankTierByPoints` from `@/lib/leaderboard/rank` → `@/lib/scoring/unified-calculator`

3. **lib/profile/profile-data.ts**
   - Changed: `calculateRankProgress` from `@/lib/leaderboard/rank` → `@/lib/scoring/unified-calculator`

4. **components/XPEventOverlay.tsx**
   - Changed: `calculateRankProgress, RankProgress` from `@/lib/leaderboard/rank` → `@/lib/scoring/unified-calculator`

5. **components/leaderboard/LeaderboardTable.tsx**
   - Changed: `getImprovedRankTierByPoints` from `@/lib/leaderboard/rank` → `getRankTierByPoints` from `@/lib/scoring/unified-calculator`
   - Updated 3 function calls: `getImprovedRankTierByPoints()` → `getRankTierByPoints()`

6. **components/viral/ViralBadgeMetrics.tsx**
   - Changed: `getViralTier, ViralTier` from `@/lib/viral/viral-bonus` → `@/lib/scoring/unified-calculator`

7. **components/viral/ViralTierBadge.tsx**
   - Changed: `ViralTierConfig` from `@/lib/viral/viral-bonus` → `@/lib/scoring/unified-calculator`

8. **components/viral/ViralStatsCard.tsx**
   - Changed: `getViralTier, estimateNextTier, formatEngagementMetrics, EngagementMetrics` from `@/lib/viral/viral-bonus` → `@/lib/scoring/unified-calculator`

9. **components/profile/ProfileStats.tsx**
   - Changed: `formatLastActive` from `@/lib/profile/stats-calculator` → `@/lib/scoring/unified-calculator`
   - Note: Kept `calculateStats` from stats-calculator (wrapper function, different signature)

10. **components/GMButton.tsx**
    - Changed: `calculateRankProgress` from `@/lib/leaderboard/rank` → `@/lib/scoring/unified-calculator`

### 📦 Unified Calculator Enhancement

Added missing function: `formatEngagementMetrics` (was missing, now added to line ~745)

### ✅ Type Safety Verified

All migrations passed TypeScript type checking - no errors found in migrated files.

### ⚠️ Special Cases

**ProfileStats.tsx - Partial Migration**:
- Only migrated `formatLastActive` (signature matches)
- Kept `calculateStats` from stats-calculator (different signature than `calculateCompleteStats`)
- Future: Create compatibility wrapper OR refactor component

**Function Name Change**:
- `getImprovedRankTierByPoints` → `getRankTierByPoints` (simplified naming)
