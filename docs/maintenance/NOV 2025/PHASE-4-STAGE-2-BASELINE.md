# Phase 4 Stage 2: Frontend Bundle Optimization - Baseline Metrics

**Date**: 2025-11-18  
**Task**: 2.1 - Run Bundle Analyzer & Establish Baseline  
**Status**: ✅ COMPLETE

## Build Summary

- **Build Tool**: Next.js 15.0.0 with Turbo mode
- **Total Routes**: 87 (61 static pages + API routes)
- **Build Time**: ~3-4 minutes
- **Build Status**: ✅ SUCCESS

## Key Metrics

### Shared JavaScript Bundle
```
First Load JS shared by all: 100 kB
├─ chunks/000ae0ba-45625efa0ca9c3a4.js   52.6 kB (52.6% of shared)
├─ chunks/2348-c19f957b47592ed3.js       44.9 kB (44.9% of shared)
└─ other shared chunks (total)           2.8 kB  (2.8% of shared)
```

**Analysis**:
- Total shared bundle: **100 KB** ✅ (below 500KB target)
- Largest chunk: 52.6KB (reasonable)
- Second largest: 44.9KB (reasonable)
- Shared code is well-distributed

### Middleware
```
Middleware: 36.9 kB
```

**Analysis**:
- Middleware bundle: **36.9 KB** ✅ (acceptable for rate limiting, auth, security headers)

### Page Bundles (Top 10 Largest)

| Route | Size | First Load JS | Status |
|-------|------|---------------|--------|
| `/Quest/creator` | 39.6 kB | 456 kB | ⚠️ OPTIMIZE |
| `/admin` | 43 kB | 434 kB | ⚠️ OPTIMIZE |
| `/` (home) | 31.1 kB | 436 kB | ⚠️ OPTIMIZE |
| `/profile` | 24.1 kB | 397 kB | ✅ OK |
| `/Quest/[chain]/[id]` | 24.2 kB | 327 kB | ✅ OK |
| `/Dashboard` | 28.8 kB | 321 kB | ✅ OK |
| `/Quest` | 22.9 kB | 300 kB | ✅ OK |
| `/leaderboard` | 7.64 kB | 251 kB | ✅ GOOD |
| `/admin/viral` | 112 kB | 234 kB | ⚠️ OPTIMIZE (huge page size!) |
| `/Guild/guild/[chain]/[teamname]` | 16.8 kB | 346 kB | ✅ OK |

### API Routes
All API routes are **310 B** (optimal, server-side only).

## Optimization Targets

### 🔴 Critical (>400KB First Load JS)
1. **`/Quest/creator`** - 456 KB First Load JS
   - Page size: 39.6 KB
   - Likely candidates: Form builder, rich text editor, asset uploader
   - **Recommendation**: Code-split form components with `next/dynamic`

2. **`/admin`** - 434 KB First Load JS
   - Page size: 43 KB
   - Likely candidates: Charts (recharts?), admin tables, dashboards
   - **Recommendation**: Lazy load chart library and tables

3. **`/` (home)** - 436 KB First Load JS
   - Page size: 31.1 KB
   - Likely candidates: Animations (@lottiefiles/dotlottie-react), hero components
   - **Recommendation**: Lazy load animations and below-fold content

### 🟡 Medium Priority (300-400KB First Load JS)
4. **`/profile`** - 397 KB First Load JS
5. **`/Quest/[chain]/[id]`** - 327 KB First Load JS
6. **`/Guild/guild/[chain]/[teamname]`** - 346 KB First Load JS
7. **`/Dashboard`** - 321 KB First Load JS

### ⚠️ Page Size Alert
8. **`/admin/viral`** - **112 KB page size** (but only 234 KB First Load JS)
   - This is a massive page component
   - **Recommendation**: Split into multiple components with lazy loading

## Dependency Analysis

### Heavy Dependencies (from package.json)

#### 🔴 Potential Optimization Targets:
1. **Lottie Animations** (`@lottiefiles/dotlottie-react` - ~100KB+)
   - Used in: Home page, Quest pages
   - **Action**: Lazy load with `next/dynamic`

2. **Charts** (`recharts` - ~150KB+)
   - Used in: Admin dashboard, leaderboards
   - **Action**: Lazy load with `next/dynamic`

3. **Confetti** (`react-confetti`, `canvas-confetti` - ~50KB)
   - Used in: Quest completion, badge awards
   - **Action**: Lazy load on-demand

4. **Framer Motion** (`framer-motion` - ~100KB+)
   - Used in: Animations throughout app
   - **Action**: Tree-shake or lazy load heavy animation components

#### ✅ Already Optimized:
- ✅ Using `date-fns` (not moment.js)
- ✅ No lodash (only specific utilities)
- ✅ Minimal icon libraries (Phosphor icons)

### Build Warnings
- 2 OpenTelemetry warnings (Sentry integration) - **Non-blocking**
- No critical warnings

## Targets for Stage 2

### Task 2.2: Code Splitting
**Goal**: Reduce First Load JS by 30% on top 3 pages

**Pages to optimize**:
1. `/Quest/creator` - Target: 456 KB → 320 KB (30% reduction)
2. `/admin` - Target: 434 KB → 304 KB (30% reduction)
3. `/` (home) - Target: 436 KB → 305 KB (30% reduction)

**Components to split**:
- [ ] Lottie animations (`@lottiefiles/dotlottie-react`)
- [ ] Recharts components
- [ ] React Confetti
- [ ] Admin tables/forms
- [ ] Quest creator wizard
- [ ] Below-fold content on home page

### Task 2.3: Dependency Optimization
**Goal**: Identify and remove unused dependencies

**Actions**:
- [ ] Run `npx depcheck` to find unused dependencies
- [ ] Run `npx ts-prune` to find unused exports
- [ ] Consider replacing Framer Motion with CSS animations where possible
- [ ] Tree-shake Framer Motion imports

### Task 2.4: Image Optimization
**Goal**: Convert all images to next/image with WebP

**Actions**:
- [ ] Audit `<img>` tags in components
- [ ] Convert to `<Image>` from `next/image`
- [ ] Add blur placeholders
- [ ] Lazy load below-fold images

## Success Criteria

- [x] **Task 2.1 COMPLETE**: Baseline metrics documented
- [ ] **Task 2.2**: Code splitting (5+ components, 30% bundle reduction)
- [ ] **Task 2.3**: Dependency cleanup (remove unused, optimize heavy deps)
- [ ] **Task 2.4**: Image optimization (all images using next/image)

### Final Targets:
- ✅ Shared bundle: 100 KB (already at target!)
- ⏳ Top 3 pages First Load JS: <320 KB average
- ⏳ All pages: <400 KB First Load JS
- ⏳ Lighthouse performance: >90
- ⏳ Total JS: <1.5 MB

## Build Issues Resolved

### Issues encountered during baseline build:
1. ❌ **Linting warnings** (unused variables in cache.ts, timing.ts) - ✅ FIXED
2. ❌ **Duplicate exports** (cache.ts, timing.ts) - ✅ FIXED
3. ❌ **Missing dependency** (@vercel/kv) - ✅ FIXED (installed v3.0.0)
4. ❌ **Type errors** (Response vs NextResponse) - ✅ FIXED
5. ❌ **Duplicate type exports** (ApiHandler, TimingMetrics) - ✅ FIXED

### Build now clean:
- ✅ No linting errors
- ✅ No type errors
- ✅ No missing dependencies
- ⚠️ 2 non-critical OpenTelemetry warnings (expected from Sentry)

## Next Steps

1. **Proceed with Task 2.2**: Implement code splitting for heavy components
2. **Start with highest impact**: `/Quest/creator` (456 KB → 320 KB target)
3. **Use `next/dynamic`**: Lazy load Lottie, Recharts, Confetti components
4. **Add loading skeletons**: Provide good UX during code-split loads
5. **Re-build and measure**: Verify 30% reduction achieved

---

**Baseline Established**: ✅ COMPLETE  
**Ready for Task 2.2**: ✅ YES  
**Estimated Time for Stage 2 Completion**: 4-6 hours
