# Remaining Calculator Migrations

**Date**: December 20, 2025  
**Status**: 5 Files Still Using Old Calculators

---

## 📋 Summary

After the unified calculator migration, **5 files** in the `app` directory are still importing from deprecated calculator files:

1. ❌ `app/test-xp-celebration/page.tsx`
2. ❌ `app/api/frame/image/badgecollection/route.tsx`
3. ❌ `app/api/frame/route.tsx`
4. ❌ `app/api/webhooks/neynar/cast-engagement/route.ts`
5. ❌ `app/api/viral/stats/route.ts`

---

## 🔍 Detailed Analysis

### 1. `app/test-xp-celebration/page.tsx`

**Current Import**:
```typescript
import { calculateRankProgress } from '@/lib/leaderboard/rank'
```

**Should Be**:
```typescript
import { calculateRankProgress } from '@/lib/scoring/unified-calculator'
```

**Usage**: Test page for XP celebration animations

---

### 2. `app/api/frame/image/badgecollection/route.tsx`

**Current Import**:
```typescript
import { formatXp } from '@/lib/leaderboard/rank'
```

**Should Be**:
```typescript
import { formatXp } from '@/lib/scoring/unified-calculator'
```

**Usage**: Frame image generation for badge collection

---

### 3. `app/api/frame/route.tsx`

**Current Import**:
```typescript
import { calculateRankProgress } from '@/lib/leaderboard/rank'
```

**Should Be**:
```typescript
import { calculateRankProgress } from '@/lib/scoring/unified-calculator'
```

**Usage**: Main frame handler for Farcaster frames

---

### 4. `app/api/webhooks/neynar/cast-engagement/route.ts`

**Current Imports**:
```typescript
import {
  calculateViralBonus,
  hasMetricsIncreased,
  calculateIncrementalBonus,
  type EngagementMetrics,
} from '@/lib/viral/viral-bonus'
```

**Should Be**:
```typescript
import {
  calculateViralBonus,
  hasMetricsIncreased,
  calculateIncrementalBonus,
  type EngagementMetrics,
} from '@/lib/scoring/unified-calculator'
```

**Usage**: Webhook handler for Neynar cast engagement events (awards viral bonus XP)

---

### 5. `app/api/viral/stats/route.ts`

**Current Import**:
```typescript
import { getViralTier, calculateEngagementScore, type EngagementMetrics } from '@/lib/viral/viral-bonus'
```

**Should Be**:
```typescript
import { getViralTier, calculateEngagementScore, type EngagementMetrics } from '@/lib/scoring/unified-calculator'
```

**Usage**: API endpoint for retrieving viral stats

---

## ✅ Already Migrated Files

These files are correctly using the unified calculator:

- ✅ `lib/bot/analytics/stats.ts`
- ✅ `lib/leaderboard/leaderboard-service.ts`
- ✅ `lib/profile/profile-data.ts`
- ✅ `lib/profile/profile-service.ts`

---

## 📊 Migration Priority

### High Priority (User-Facing)
1. **`app/api/frame/route.tsx`** - Main frame handler (high traffic)
2. **`app/api/frame/image/badgecollection/route.tsx`** - Frame image generation (high traffic)

### Medium Priority (Webhooks)
3. **`app/api/webhooks/neynar/cast-engagement/route.ts`** - Webhook handler (automated)
4. **`app/api/viral/stats/route.ts`** - API endpoint (medium traffic)

### Low Priority (Testing)
5. **`app/test-xp-celebration/page.tsx`** - Test page (dev only)

---

## 🔧 Migration Steps

### For Each File:

1. **Update Import Statement**:
   ```typescript
   // Before
   import { functionName } from '@/lib/leaderboard/rank'
   // or
   import { functionName } from '@/lib/viral/viral-bonus'
   
   // After
   import { functionName } from '@/lib/scoring/unified-calculator'
   ```

2. **Verify Functionality**:
   - Check that the imported functions exist in unified-calculator
   - Ensure type signatures match
   - Test the affected route/page

3. **Update Tests** (if applicable):
   - Update any unit tests that mock these functions
   - Verify integration tests still pass

---

## 🎯 Expected Impact

### Benefits
- ✅ Single source of truth for all calculations
- ✅ Consistent scoring across the entire app
- ✅ Easier maintenance and debugging
- ✅ Better type safety

### Risks
- ⚠️ Frame routes are high-traffic (test thoroughly)
- ⚠️ Webhook handler is critical for viral XP (verify logic)
- ⚠️ Viral stats API used by multiple consumers

---

## 🚀 Recommended Action Plan

### Phase 1: Low-Risk Migration
1. Migrate test page: `app/test-xp-celebration/page.tsx`
2. Test locally to ensure no breaking changes

### Phase 2: API Routes
3. Migrate viral stats: `app/api/viral/stats/route.ts`
4. Test with sample requests
5. Migrate webhook: `app/api/webhooks/neynar/cast-engagement/route.ts`
6. Monitor webhook logs for errors

### Phase 3: Frame Routes (Highest Traffic)
7. Migrate badge frame image: `app/api/frame/image/badgecollection/route.tsx`
8. Test frame image generation
9. Migrate main frame handler: `app/api/frame/route.tsx`
10. Test all frame flows thoroughly

### Phase 4: Verification
11. Deploy to staging
12. Run integration tests
13. Monitor production logs
14. Verify no errors in Sentry/monitoring

---

## 📝 Checklist

### Before Migration
- [ ] Review unified-calculator exports
- [ ] Confirm all imported functions exist
- [ ] Check type compatibility
- [ ] Backup current code

### During Migration
- [ ] Update imports one file at a time
- [ ] Test each file individually
- [ ] Check for TypeScript errors
- [ ] Verify runtime behavior

### After Migration
- [ ] All 5 files migrated
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] Production monitoring shows no issues
- [ ] Update UNIFIED-CALCULATOR-MIGRATION.md

---

## 🔗 Related Documentation

- `UNIFIED-CALCULATOR-MIGRATION.md` - Main migration documentation
- `BUG-FIXES-DEC-20-2025.md` - Bug fixes related to calculator
- `PHASE-2-MIGRATION-PLAN.md` - Original migration plan
- `lib/scoring/README.md` - Unified calculator API reference

---

**Status**: Ready for migration  
**Estimated Time**: 1-2 hours  
**Risk Level**: Medium (frame routes are high-traffic)
