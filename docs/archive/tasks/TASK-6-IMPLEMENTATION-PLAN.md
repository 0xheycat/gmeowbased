# Task 6: Performance Optimization - Implementation Plan

**Date**: December 4, 2025  
**Status**: 🚀 IN PROGRESS  
**Estimated Time**: 2-3 hours  
**Score Impact**: +1 point (94/100 → 95/100)  
**Priority**: High (performance is critical for Web3 apps)

## 🎯 Goal

Optimize Quest System for fast load times, smooth interactions, and excellent Core Web Vitals scores.

## 📊 Success Criteria

**Target Score Breakdown** (+1.0 total):
- **Code Splitting** (0.3): Lazy load heavy components, reduce initial bundle
- **React Optimization** (0.3): Memo, useMemo, useCallback to prevent re-renders
- **Image Optimization** (0.2): Next.js Image, lazy loading, WebP format
- **Bundle Analysis** (0.2): Identify and optimize large dependencies

**Lighthouse Performance Target**: 90+ (currently unknown, will audit)

**Core Web Vitals Target**:
- **LCP** (Largest Contentful Paint): <2.5s
- **FID** (First Input Delay): <100ms
- **CLS** (Cumulative Layout Shift): <0.1

## 🔧 Implementation Phases

### Phase 1: Bundle Analysis & Audit (20-30 min)

**Objective**: Understand current bundle size and identify optimization opportunities

#### 1.1 Install Analysis Tools
```bash
pnpm add -D @next/bundle-analyzer
```

#### 1.2 Configure Bundle Analyzer
```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // existing config
})
```

#### 1.3 Run Analysis
```bash
ANALYZE=true pnpm build
# Opens visual bundle report in browser
```

#### 1.4 Lighthouse Audit (Current State)
```bash
# Development build
pnpm dev

# In Chrome DevTools:
# 1. Open Lighthouse tab
# 2. Select "Performance" only
# 3. Run audit on /quests page
# 4. Document baseline scores
```

**Expected Findings**:
- Large dependencies: recharts (~200KB), framer-motion (~100KB), lucide-react (~50KB)
- Unused code from libraries
- Non-optimized images
- Unnecessary re-renders

---

### Phase 2: Code Splitting (30-40 min)

**Objective**: Lazy load heavy components to reduce initial bundle size

#### 2.1 Identify Heavy Components
```tsx
// Heavy components to lazy load:
- QuestAnalyticsDashboard (uses recharts ~200KB)
- QuestManagementTable (complex table logic)
- QuestImageUploader (react-dropzone)
- NotificationBell (complex dropdown state)
```

#### 2.2 Implement React.lazy()

**Pattern**:
```tsx
import { lazy, Suspense } from 'react';
import { QuestAnalyticsSkeleton } from './skeletons';

// Lazy load heavy component
const QuestAnalyticsDashboard = lazy(() => 
  import('@/components/quests/QuestAnalyticsDashboard')
);

export function QuestsPage() {
  return (
    <Suspense fallback={<QuestAnalyticsSkeleton />}>
      <QuestAnalyticsDashboard data={data} />
    </Suspense>
  );
}
```

#### 2.3 Route-Level Code Splitting

**Already Implemented** ✅ (Next.js automatic):
- Each page in `app/` directory is automatically code-split
- Dynamic imports for route components

**Action**: Verify with bundle analyzer that routes are split

#### 2.4 Component-Level Splitting

**Priority Components**:
1. **QuestAnalyticsDashboard** - Uses recharts (200KB)
2. **QuestManagementTable** - Complex logic, rarely used
3. **QuestImageUploader** - Uses react-dropzone (50KB)
4. **ComparisonModal** (leaderboard) - Heavy comparison logic

**Implementation**:
```tsx
// app/quests/manage/page.tsx
const QuestAnalyticsDashboard = lazy(() => 
  import('@/components/quests/QuestAnalyticsDashboard')
);
const QuestManagementTable = lazy(() => 
  import('@/components/quests/QuestManagementTable')
);

// app/leaderboard/page.tsx
const ComparisonModal = lazy(() => 
  import('@/components/leaderboard/ComparisonModal')
);
```

**Skeletons Needed**:
- QuestAnalyticsSkeleton (already exists ✅)
- ManagementTableSkeleton (already exists ✅)
- ComparisonModalSkeleton (create if needed)

---

### Phase 3: React Optimization (40-50 min)

**Objective**: Prevent unnecessary re-renders with memoization

#### 3.1 React.memo for Pure Components

**Pattern**:
```tsx
import { memo } from 'react';

// Before: Re-renders on every parent update
export default function QuestCard({ id, title, ... }: Props) {
  return <div>...</div>;
}

// After: Only re-renders when props change
export default memo(function QuestCard({ id, title, ... }: Props) {
  return <div>...</div>;
}, (prevProps, nextProps) => {
  // Custom comparison (optional)
  return prevProps.id === nextProps.id && 
         prevProps.title === nextProps.title;
});
```

**Components to Memoize**:
1. **QuestCard** - Rendered in grids (10-20 cards)
2. **FilterChip** - Rendered in lists (5-10 chips)
3. **LeaderboardRow** - Rendered in tables (50-100 rows)
4. **MetricCard** (analytics) - Static display cards

#### 3.2 useMemo for Expensive Computations

**Pattern**:
```tsx
import { useMemo } from 'react';

function QuestFilters({ quests, filters }) {
  // Before: Filters on every render (slow)
  const filteredQuests = quests.filter(q => 
    filters.categories.includes(q.category)
  );

  // After: Only recomputes when quests or filters change
  const filteredQuests = useMemo(() => 
    quests.filter(q => 
      filters.categories.includes(q.category)
    ),
    [quests, filters]
  );
}
```

**Computations to Memoize**:
1. **Quest Filtering** (QuestGrid) - Filter by category/status/difficulty
2. **Quest Sorting** (QuestManagementTable) - Sort by multiple fields
3. **Leaderboard Ranking** - Calculate positions and changes
4. **Search Results** - Filter quests by search term

#### 3.3 useCallback for Stable Function References

**Pattern**:
```tsx
import { useCallback } from 'react';

function QuestGrid({ onFilterChange }) {
  // Before: New function on every render
  const handleCategorySelect = (category) => {
    onFilterChange({ categories: [category] });
  };

  // After: Stable function reference
  const handleCategorySelect = useCallback((category) => {
    onFilterChange({ categories: [category] });
  }, [onFilterChange]);

  return (
    <FilterButton onClick={handleCategorySelect} /> // Won't re-render unnecessarily
  );
}
```

**Functions to Stabilize**:
1. **Filter Handlers** - Category/difficulty/status selection
2. **Sort Handlers** - Column click handlers
3. **Search Handlers** - Debounced search input
4. **Modal Handlers** - Open/close callbacks

#### 3.4 Profiler Analysis

**Tool**: React DevTools Profiler

**Process**:
1. Open React DevTools in browser
2. Go to Profiler tab
3. Start recording
4. Interact with quest filters (change category)
5. Stop recording
6. Analyze flame graph for slow components

**Target**: Reduce re-renders from ~50-100ms to <20ms per interaction

---

### Phase 4: Image Optimization (20-30 min)

**Objective**: Optimize images for fast loading and minimal CLS

#### 4.1 Next.js Image Component Audit

**Current Usage** (already good):
```tsx
// QuestCard.tsx
<Image
  src={coverImage}
  alt={title}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

**Already Implemented** ✅:
- Next.js Image component (automatic optimization)
- `sizes` attribute for responsive images
- `fill` layout for responsive containers

#### 4.2 Priority Loading for Above-Fold Images

**Pattern**:
```tsx
// Featured quest (above fold)
<Image
  src={coverImage}
  alt={title}
  fill
  priority // Preload this image
  className="object-cover"
/>

// Grid cards (below fold)
<Image
  src={coverImage}
  alt={title}
  fill
  loading="lazy" // Lazy load (default)
  className="object-cover"
/>
```

**Action**: Add `priority` to first 2-3 quest cards on /quests page

#### 4.3 WebP Format with Fallback

**Already Handled** ✅ by Next.js Image:
- Automatically serves WebP when browser supports
- Falls back to original format (JPG/PNG)
- No code changes needed

#### 4.4 Placeholder Blur (Reduce CLS)

**Pattern**:
```tsx
<Image
  src={coverImage}
  alt={title}
  fill
  placeholder="blur"
  blurDataURL="data:image/png;base64,..." // Generated by Next.js
  className="object-cover"
/>
```

**Action**: For static images, generate blur placeholders with Next.js

---

### Phase 5: Dependency Optimization (20-30 min)

**Objective**: Reduce bundle size by optimizing dependencies

#### 5.1 Tree Shaking Verification

**Check Import Patterns**:
```tsx
// ❌ Bad: Imports entire library
import _ from 'lodash';

// ✅ Good: Imports specific function
import debounce from 'lodash/debounce';
```

**Audit All Imports**:
```bash
grep -r "import \* as" components/ app/
grep -r "import.*from 'lodash'" components/ app/
grep -r "import.*from 'framer-motion'" components/ app/
```

#### 5.2 Icon Library Optimization

**Current**: lucide-react (~50KB)

**Check Usage**:
```bash
grep -r "from 'lucide-react'" components/ app/ | wc -l
# If <20 unique icons, consider custom SVG components
```

**Options**:
1. **Keep lucide-react** if using many icons (already tree-shaken)
2. **Custom SVG components** if using <20 icons (save ~30KB)

#### 5.3 Framer Motion Optimization

**Current**: framer-motion (~100KB)

**Check for Overuse**:
```bash
grep -r "motion\." components/ | wc -l
# If most animations are simple, consider CSS alternatives
```

**Optimization**:
```tsx
// ❌ Heavy: Full Framer Motion for simple fade
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>

// ✅ Light: CSS transition (0KB)
<div className="opacity-0 animate-fade-in">
// Add to globals.css:
// @keyframes fade-in {
//   from { opacity: 0; }
//   to { opacity: 1; }
// }
```

**Action**: Replace simple animations with CSS (keep complex gestures/drag with Framer)

#### 5.4 Recharts Optimization

**Current**: recharts (~200KB) - Used in QuestAnalyticsDashboard

**Already Optimized** ✅ by Phase 2 code splitting:
- Lazy loaded only when analytics dashboard opens
- Not in initial bundle

**No Action Needed** if code split successfully

---

### Phase 6: Lighthouse Re-Audit & Verification (20-30 min)

**Objective**: Measure performance improvements and hit target scores

#### 6.1 Production Build
```bash
pnpm build
pnpm start
```

#### 6.2 Lighthouse Audit (After Optimization)
```bash
# Run on production build
# Target metrics:
# - Performance: 90+
# - LCP: <2.5s
# - FID: <100ms
# - CLS: <0.1
```

#### 6.3 Bundle Size Comparison
```bash
ANALYZE=true pnpm build
# Compare before/after:
# - Initial bundle: Target <200KB (down from ~300KB)
# - Total JS: Target <500KB (down from ~700KB)
```

#### 6.4 Real-World Testing
```bash
# Test on:
# - Chrome DevTools Network throttling (Fast 3G)
# - Lighthouse mobile simulation
# - Real mobile device (iOS/Android)
```

**Success Criteria**:
- [ ] Lighthouse Performance: 90+
- [ ] Initial bundle: <200KB
- [ ] LCP: <2.5s on Fast 3G
- [ ] No layout shift on image load
- [ ] Smooth 60fps animations

---

## 📈 Expected Impact

### Bundle Size Reduction
- **Before**: ~300KB initial, ~700KB total
- **After**: ~200KB initial, ~500KB total
- **Savings**: ~30% reduction

### Performance Scores
- **Lighthouse**: 70-80 → 90+ (target)
- **LCP**: 3-4s → <2.5s
- **FID**: <100ms (already good)
- **CLS**: 0.1-0.2 → <0.1

### User Experience
- **Initial Load**: 2-3s → 1-2s (on 3G)
- **Interaction**: Smooth, no jank
- **Re-renders**: 50-100ms → <20ms

---

## 🚀 Implementation Order

### Priority 1: Quick Wins (30 min)
1. React.memo for QuestCard, FilterChip
2. useMemo for quest filtering
3. Add `priority` to above-fold images

### Priority 2: Code Splitting (40 min)
4. Lazy load QuestAnalyticsDashboard
5. Lazy load QuestManagementTable
6. Lazy load ComparisonModal

### Priority 3: Deep Optimization (60 min)
7. useCallback for all filter handlers
8. useMemo for sorting logic
9. Replace simple Framer animations with CSS
10. Bundle analysis and verification

### Priority 4: Testing (30 min)
11. Lighthouse audit
12. Real device testing
13. Documentation

---

## 📝 Files to Modify

### New Files (1)
1. **next.config.js** - Add bundle analyzer

### Modified Files (Estimated 8-10)
1. **components/quests/QuestCard.tsx** - React.memo
2. **components/quests/QuestFilters.tsx** - useMemo, useCallback
3. **components/quests/QuestGrid.tsx** - useMemo filtering, priority images
4. **components/quests/QuestManagementTable.tsx** - useMemo sorting
5. **components/quests/FilterChip.tsx** - React.memo
6. **app/quests/manage/page.tsx** - Lazy load analytics & table
7. **app/leaderboard/page.tsx** - Lazy load comparison modal
8. **components/leaderboard/LeaderboardRow.tsx** - React.memo
9. **tailwind.config.ts** - Add custom animations (if replacing Framer)
10. **app/globals.css** - Add CSS animations (if replacing Framer)

### Documentation (1)
1. **TASK-6-COMPLETION-REPORT.md** - Performance improvements, metrics, before/after

---

## ✅ Success Checklist

### Implementation
- [ ] Bundle analyzer configured
- [ ] Baseline Lighthouse audit documented
- [ ] React.memo added to list-rendered components
- [ ] useMemo added to expensive computations
- [ ] useCallback added to event handlers
- [ ] Code splitting for heavy components
- [ ] Priority loading for above-fold images
- [ ] Simple animations replaced with CSS (if applicable)

### Testing
- [ ] Production build successful
- [ ] Lighthouse Performance: 90+
- [ ] LCP: <2.5s on Fast 3G
- [ ] CLS: <0.1 (no layout shift)
- [ ] Bundle size reduced by 30%+
- [ ] No TypeScript errors
- [ ] Visual regression check (no UI breaks)

### Documentation
- [ ] TASK-6-COMPLETION-REPORT.md created
- [ ] Before/after metrics documented
- [ ] CURRENT-TASK.md updated (95/100)
- [ ] FOUNDATION-REBUILD-ROADMAP.md updated
- [ ] Todo list updated (Task 6 complete)

---

## 🎯 Score Breakdown

**Target**: +1.0 points (94 → 95/100)

**Phase Contributions**:
- Code Splitting: +0.3 (reduce initial bundle, faster load)
- React Optimization: +0.3 (prevent re-renders, smooth interactions)
- Image Optimization: +0.2 (faster LCP, no CLS)
- Bundle Analysis: +0.2 (identify and fix bottlenecks)

**Quality Threshold**:
- Must achieve Lighthouse 90+ for full +1.0
- Can earn partial credit (e.g., +0.7 for 85-89 score)
- Real-world testing required (not just DevTools simulation)

---

**Status**: Ready to implement  
**Next Step**: Phase 1 - Bundle Analysis & Audit
