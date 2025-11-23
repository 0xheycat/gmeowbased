# Phase 1G: Frame System Polish & Advanced Features

**Created:** November 23, 2025  
**Status:** 🔵 PLANNING  
**Based On:** Phase 1F completion + regression fix (commit 0efc3ce)  
**Focus:** Production stability, performance optimization, and advanced features

---

## 🎯 Phase 1G Mission

**Goal:** Transform frames from "functional" to "polished production-grade" with advanced features, comprehensive error handling, and performance optimization.

**Key Themes:**
1. **Stability** - Error handling, fallbacks, monitoring
2. **Performance** - Caching strategies, optimization, CDN preparation
3. **Features** - Rank progression, animations, interactions
4. **Developer Experience** - Testing tools, debugging, documentation

---

## 📊 Phase 1F Retrospective

### ✅ What Worked Well
- **Systematic approach:** Layer-by-layer fixes (functional → infrastructure → testing)
- **Design system:** Unified FRAME_FONTS, FRAME_COLORS, FRAME_LAYOUT
- **Task decomposition:** 14 tasks, each 2-4 hours, easy to track
- **Documentation:** STATUS.md kept updated, clear completion criteria
- **Testing workflow:** Localhost → TypeScript → Build → Deploy → Production

### ⚠️ What Needs Improvement
- **Regression prevention:** formatXpDisplay() duplicate bypassed official library
- **Import audits:** Unused imports (FRAME_LAYOUT, calculateRankProgress) not caught early
- **Testing gaps:** No automated tests for frame generation
- **Error handling:** No error frames for timeouts, not-found, permissions
- **Monitoring:** No alerts for frame generation failures

### 🔍 Root Causes
1. **No linting rules** for unused imports (TypeScript allows them)
2. **No integration tests** for frame rendering
3. **Manual testing only** (prone to missed edge cases)
4. **No error budget** (frame failures invisible)
5. **Task dependencies unclear** (Task 5 broke Task 10 integration)

---

##  🚨 Known Issues from Phase 1F

### Critical (Blocking Production)
- ✅ **FIXED:** Unused imports regression (commit 0efc3ce)
- ⚠️ **OPEN:** No error frames for HTTP 500/404/timeout scenarios
- ⚠️ **OPEN:** No monitoring/alerts for frame generation failures

### High Priority (Impact User Experience)
- 🟡 **Rank progression not shown** (calculateRankProgress imported but not used)
- 🟡 **FRAME_LAYOUT constants not applied** (hardcoded values everywhere)
- 🟡 **No loading states** (frames take 3-6s to generate, no feedback)
- 🟡 **No cache warmup** (first request always slow)
- 🟡 **No frame analytics** (can't measure engagement/shares)

### Medium Priority (Technical Debt)
- 🟢 **No automated tests** for frame image generation
- 🟢 **No E2E tests** for frame workflows (share → view → interact)
- 🟢 **No performance budgets** (frame size, generation time)
- 🟢 **No accessibility audit** (alt text, contrast ratios)
- 🟢 **No SEO optimization** (meta descriptions, structured data)

---

## 📋 Phase 1G Task Breakdown

### 🔴 Layer 1: Error Handling & Resilience (8 hours)

#### Task 1: Error Frame System (3 hours) 🔴
**Priority:** P0 (Critical - Production Blocker)  
**Goal:** Graceful error handling with user-friendly error frames

**Scope:**
1. **Create error frame template** (`/api/frame/error`)
   - HTTP 500: Internal server error frame
   - HTTP 404: Not found frame
   - HTTP 408: Timeout frame (slow data fetching)
   - HTTP 403: Permission denied frame
   - HTTP 429: Rate limit exceeded frame

2. **Error frame design**
   - Consistent with main frame design system
   - Clear error message + emoji indicator
   - "Try Again" button (link to refresh)
   - "Go Home" button (link to main app)
   - Footer: "@gmeowbased • Need help? Visit docs"

3. **Implement error boundaries**
   - Wrap all frame handlers with try-catch
   - Log errors to Sentry (structured error context)
   - Return appropriate error frame (not raw error message)
   - Include debug info in development (hide in production)

4. **Testing**
   - Test all 5 error types on localhost
   - Verify error frames display correctly in Warpcast
   - Check Sentry error logging (correct stack traces)
   - Verify "Try Again" button works

**Files:**
- `app/api/frame/error/route.tsx` (new)
- `app/api/frame/image/route.tsx` (add error handler)
- `lib/frame-errors.ts` (new - error utilities)

**Success Criteria:**
- ✅ 5 error frame types implemented
- ✅ All frame handlers wrapped with error boundary
- ✅ Errors logged to Sentry with context
- ✅ Error frames tested in Warpcast

---

#### Task 2: Fallback & Timeout Handling (2 hours) 🔴
**Priority:** P0 (Critical - Data fetching reliability)  
**Goal:** Graceful degradation when data sources are slow/unavailable

**Scope:**
1. **Add timeout wrappers**
   - Wrap fetchUserByFid() with 3s timeout
   - Wrap contract reads with 5s timeout
   - Wrap Supabase queries with 3s timeout
   - Return cached data if available (stale-while-revalidate)

2. **Implement fallback data**
   - Default user: "Anonymous" + placeholder stats
   - Default GM data: 0 streak, 0 count
   - Default onchain stats: "Data unavailable"
   - Show "⏳ Loading..." indicator if timeout

3. **Cache-first strategy**
   - Check Redis cache before fetching (getCachedFrame)
   - Return stale cache if fresh fetch times out
   - Set "X-Cache-Status: STALE" header
   - Background refresh (fire-and-forget)

4. **Testing**
   - Simulate slow Neynar API (3s delay)
   - Simulate Supabase timeout (mock query)
   - Verify fallback data displays correctly
   - Check stale cache behavior

**Files:**
- `lib/neynar.ts` (add timeout wrapper)
- `lib/gm-utils.ts` (add timeout wrapper)
- `app/api/frame/route.tsx` (implement fallbacks)
- `app/api/frame/image/route.tsx` (handle missing data)

**Success Criteria:**
- ✅ All data fetching has 3-5s timeouts
- ✅ Fallback data displays correctly
- ✅ Stale cache served when fresh fetch fails
- ✅ No frame generation failures due to timeouts

---

#### Task 3: Monitoring & Alerting (3 hours) 🔴
**Priority:** P1 (High - Observability)  
**Goal:** Proactive monitoring of frame system health

**Scope:**
1. **Frame generation metrics**
   - Track generation time (p50, p95, p99)
   - Track cache hit rate (HIT vs MISS)
   - Track error rate by type (500, 404, timeout)
   - Track frame size (KB) by type

2. **Sentry integration**
   - Structured error logging (frame type, FID, params)
   - Performance monitoring (slow frame alerts)
   - Breadcrumbs (data fetching timeline)
   - User feedback widget (report broken frames)

3. **Vercel Analytics**
   - Track /api/frame endpoint usage
   - Monitor response times (Web Vitals)
   - Track geographic distribution (CDN planning)
   - Monitor bandwidth usage (image optimization ROI)

4. **Alert rules**
   - Email alert: Error rate >5% for 5 minutes
   - Slack alert: p95 generation time >8 seconds
   - Slack alert: Cache hit rate <60%
   - Dashboard: Real-time frame health (Sentry)

**Files:**
- `sentry.server.config.ts` (update with frame context)
- `lib/frame-metrics.ts` (new - metrics helpers)
- `app/api/frame/*/route.tsx` (add instrumentation)

**Success Criteria:**
- ✅ All frame handlers instrumented
- ✅ Sentry dashboard shows frame metrics
- ✅ Alert rules configured (email + Slack)
- ✅ Performance budgets defined (p95 <6s)

---

### 🟡 Layer 2: Performance & Optimization (10 hours)

#### Task 4: Cache Strategy Optimization (3 hours) 🟡
**Priority:** P1 (High - User experience)  
**Goal:** Minimize frame generation latency with smart caching

**Scope:**
1. **Cache warmup system**
   - Pre-generate frames for top 100 users (cron job)
   - Cache popular frames (leaderboards, quests)
   - Warm cache after deployment (post-deploy hook)
   - Invalidate cache on data changes (webhooks)

2. **Tiered cache TTL**
   - Static frames: 24 hours (leaderboards)
   - User frames: 5 minutes (GM stats)
   - Real-time frames: 60 seconds (onchain stats)
   - Quest frames: Until quest ends

3. **Cache key optimization**
   - Include tier in cache key (Mythic vs Common)
   - Include achievement state (badges, streaks)
   - Separate cache pools (Redis cluster)
   - LRU eviction policy

4. **Cache analytics**
   - Track hit rate by frame type
   - Track memory usage (Redis)
   - Identify cold frames (never cached)
   - Optimize cache key cardinality

**Files:**
- `lib/frame-cache.ts` (enhance with tiered TTL)
- `scripts/cache-warmup.ts` (new - cron job)
- `app/api/webhooks/cache-invalidate/route.tsx` (new)

**Success Criteria:**
- ✅ Cache hit rate >80% (up from ~60%)
- ✅ p50 latency <500ms (cached frames)
- ✅ Cache warmup runs post-deploy
- ✅ Cache invalidation works (webhook tested)

---

#### Task 5: Image Optimization (2 hours) 🟡
**Priority:** P1 (High - Bandwidth savings)  
**Goal:** Reduce frame image size without quality loss

**Scope:**
1. **Background image optimization**
   - Compress og-image.png (currently ~500KB)
   - Generate WebP variant (50-70% smaller)
   - Use base64 inline for small images (<10KB)
   - Remove unused transparency

2. **Font subsetting**
   - Subset font files (only used characters)
   - Load fonts from CDN (Vercel Edge)
   - Use variable fonts (single file, multiple weights)
   - Preload critical fonts

3. **Image format detection**
   - Serve WebP for modern clients
   - Fallback to PNG for older clients
   - Use Accept header detection
   - A/B test AVIF format

4. **Lazy loading**
   - Serve low-quality placeholder first (LQIP)
   - Progressive loading (blur → sharp)
   - Only generate high-res when needed
   - Cache multiple resolutions

**Files:**
- `public/og-image.png` (optimize with ImageOptim)
- `app/api/frame/image/route.tsx` (add WebP support)
- `lib/image-optimization.ts` (new)

**Success Criteria:**
- ✅ og-image.png size <200KB (down from 500KB)
- ✅ WebP variant available
- ✅ Average frame size <150KB
- ✅ Bandwidth usage down 40%

---

#### Task 6: Database Query Optimization (3 hours) 🟡
**Priority:** P2 (Medium - Backend efficiency)  
**Goal:** Faster data fetching for frame generation

**Scope:**
1. **Query analysis**
   - Profile all Supabase queries (EXPLAIN ANALYZE)
   - Identify N+1 queries (batch fetching)
   - Add missing indexes (user_profiles.fid, gm_history.user_fid)
   - Optimize JOIN queries (use views)

2. **Read replicas**
   - Route frame queries to read replica
   - Separate write traffic (GM recording)
   - Monitor replication lag (<100ms)
   - Failover to primary if replica down

3. **Query caching**
   - Cache expensive aggregations (leaderboards)
   - Use materialized views (daily rankings)
   - Refresh views on schedule (hourly)
   - Cache user profiles (5-minute TTL)

4. **Connection pooling**
   - Use Supabase connection pooler
   - Limit concurrent connections (max 10)
   - Reuse connections (pgBouncer)
   - Monitor connection usage

**Files:**
- `lib/supabase/client.ts` (add read replica config)
- `supabase/migrations/*` (add indexes)
- `lib/queries.ts` (optimize queries)

**Success Criteria:**
- ✅ All queries <100ms (p95)
- ✅ Read replica traffic >80%
- ✅ Connection usage <50% capacity
- ✅ No N+1 queries detected

---

#### Task 7: CDN Preparation (2 hours) 🟡
**Priority:** P2 (Medium - Future-proofing)  
**Goal:** Prepare frames for CDN distribution

**Scope:**
1. **Cache headers optimization**
   - Set proper Cache-Control headers
   - Add Vary: Accept (WebP support)
   - Use ETag for conditional requests
   - Set immutable for static frames

2. **Edge function migration prep**
   - Identify stateless frame types
   - Test on Vercel Edge runtime
   - Measure cold start time
   - Plan gradual migration

3. **Geographic distribution**
   - Analyze traffic by region (Vercel Analytics)
   - Identify high-traffic regions
   - Test Cloudflare R2 (image storage)
   - Plan CDN rollout strategy

4. **Documentation**
   - Document CDN architecture
   - Create migration checklist
   - Write runbook for CDN issues
   - Define rollback procedure

**Files:**
- `docs/architecture/CDN-STRATEGY.md` (new)
- `app/api/frame/*/route.tsx` (update headers)
- `vercel.json` (add edge config)

**Success Criteria:**
- ✅ Cache headers optimized
- ✅ Edge function POC tested
- ✅ CDN strategy documented
- ✅ Rollout plan defined

---

### 🟢 Layer 3: Advanced Features (12 hours)

#### Task 8: Rank Progression System (4 hours) 🟢
**Priority:** P2 (Medium - Gamification)  
**Goal:** Show rank tiers and progression in frames

**Scope:**
1. **Integrate calculateRankProgress()**
   - Use official library from lib/rank.ts
   - Show current tier (Signal Kitten → Mythic GM)
   - Show progress to next tier (bar + percentage)
   - Show tier benefits (tagline)

2. **Rank tier visualization**
   - Add tier badge to frames (top-right corner)
   - Tier-specific colors (Signal Kitten: blue, Mythic GM: purple)
   - Progress bar with gradient (matches tier color)
   - "Next Tier" indicator (e.g., "2,500 XP to Star Captain")

3. **Frame types with ranks**
   - Points frame: Prominent tier display + progress bar
   - Leaderboards frame: Show user's tier
   - OnchainStats frame: Add tier badge
   - GM frame: Show tier if high (Mythic/Star Captain)

4. **Testing**
   - Test all 6 tiers (Signal Kitten → Mythic GM)
   - Verify progress bars accurate (0%, 50%, 100%)
   - Check tier colors match design system
   - Test edge cases (0 XP, max tier)

**Files:**
- `app/api/frame/image/route.tsx` (integrate calculateRankProgress)
- `lib/frame-design-system.ts` (add tier color mappings)
- `app/api/frame/route.tsx` (pass tier data to image)

**Success Criteria:**
- ✅ calculateRankProgress() used in 4 frame types
- ✅ Tier badges display correctly
- ✅ Progress bars match XP calculations
- ✅ All 6 tiers tested and verified

---

#### Task 9: FRAME_LAYOUT Standardization (2 hours) 🟢
**Priority:** P3 (Low - Consistency)  
**Goal:** Replace hardcoded values with FRAME_LAYOUT constants

**Scope:**
1. **Audit hardcoded values**
   - Find all hardcoded dimensions (600, 400, 540, 360)
   - Find all hardcoded sizes (180, 120, 60, 24)
   - Find all hardcoded gaps (16, 12, 10, 8, 6)
   - Find all hardcoded radii (12, 10, 8, 4)

2. **Replace with constants**
   - WIDTH → FRAME_LAYOUT.width
   - HEIGHT → FRAME_LAYOUT.height
   - Card dimensions → FRAME_LAYOUT.cardWidth/cardHeight
   - Icon sizes → FRAME_LAYOUT.iconLarge/Medium/Small/Tiny
   - Spacing → FRAME_LAYOUT.gapLarge/Medium/Small/Tiny/Micro
   - Border radius → FRAME_LAYOUT.radiusLarge/Medium/Small/Micro

3. **Verify consistency**
   - All frames use same card size
   - All icons sized consistently
   - All spacing follows system
   - No hardcoded values remain

4. **Testing**
   - Visual regression test (all 9 frames)
   - Verify dimensions unchanged
   - Check spacing looks correct
   - Build passes with no errors

**Files:**
- `app/api/frame/image/route.tsx` (replace hardcoded values)

**Success Criteria:**
- ✅ 0 hardcoded dimension values (use constants)
- ✅ All frames render identically (visual diff)
- ✅ grep search finds no magic numbers
- ✅ Build passes with 0 warnings

---

#### Task 10: Frame Animations (Experimental) (3 hours) 🟢
**Priority:** P3 (Low - Nice-to-have)  
**Goal:** Explore animated frames for engagement

**Scope:**
1. **Research Farcaster animation support**
   - Check if frames support GIF/APNG
   - Test animated og:image in Warpcast
   - Measure performance impact
   - Check size limits (current: PNG ~150KB)

2. **Implement simple animations**
   - Progress bar fill animation (CSS animation)
   - Streak fire emoji pulse (scale transform)
   - Level up sparkle effect (fade in/out)
   - Tier badge entrance (slide + fade)

3. **Animation library evaluation**
   - Test Remotion (React animations)
   - Test Canvas API (manual frame generation)
   - Compare file sizes (GIF vs APNG vs MP4)
   - Measure generation time impact

4. **A/B testing plan**
   - 50% users get animated frames
   - Track engagement (shares, clicks)
   - Measure load time impact
   - Collect user feedback

**Files:**
- `app/api/frame/image-animated/route.tsx` (new - experimental)
- `lib/frame-animations.ts` (new - animation helpers)
- `docs/experiments/FRAME-ANIMATIONS.md` (new)

**Success Criteria:**
- ✅ Animation POC working (1 frame type)
- ✅ File size <300KB (acceptable for animation)
- ✅ Generation time <10s (acceptable for queue)
- ✅ A/B test plan documented

---

#### Task 11: Frame Analytics Integration (3 hours) 🟢
**Priority:** P2 (Medium - Product insights)  
**Goal:** Track frame engagement and optimize for virality

**Scope:**
1. **Event tracking**
   - Track frame views (by type, user, referrer)
   - Track share button clicks (Warpcast, Twitter)
   - Track link button clicks (GM, Quest, Profile)
   - Track error rates (by type, by frame)

2. **Analytics schema**
   - Create frame_analytics table (Supabase)
   - Fields: event_type, frame_type, user_fid, timestamp, metadata
   - Indexes: event_type + timestamp, frame_type + user_fid
   - Partitions: Monthly (for performance)

3. **Dashboard**
   - Top frames by views (chart)
   - Share rate by frame type (%)
   - Average generation time (histogram)
   - Error rate over time (line chart)

4. **Insights**
   - Which frames get shared most?
   - Which frames convert to app visits?
   - Which frames have highest error rates?
   - Which users are power sharers?

**Files:**
- `supabase/migrations/*_frame_analytics.sql` (new)
- `lib/frame-analytics.ts` (new - event logging)
- `app/api/analytics/frames/route.tsx` (new - dashboard API)

**Success Criteria:**
- ✅ All frame views tracked
- ✅ Share clicks tracked
- ✅ Dashboard displays key metrics
- ✅ Insights documented

---

### 🔵 Layer 4: Testing & Quality (8 hours)

#### Task 12: Automated Frame Testing (4 hours) 🔵
**Priority:** P1 (High - Regression prevention)  
**Goal:** Catch issues before production deployment

**Scope:**
1. **Unit tests**
   - Test formatXp() (all edge cases)
   - Test calculateLevelProgress() (0 XP, max XP)
   - Test buildIdentityDisplay() (username, address, FID fallbacks)
   - Test buildComposeText() (all achievement tiers)

2. **Integration tests**
   - Test frame generation (all 9 types)
   - Test error frames (all 5 error types)
   - Mock external APIs (Neynar, Supabase)
   - Verify PNG output (file size, dimensions)

3. **Visual regression tests**
   - Snapshot all 9 frame types (baseline images)
   - Compare generated frames to baseline (pixel diff)
   - Flag any visual changes for review
   - Update baseline after approved changes

4. **E2E tests (Playwright)**
   - Test frame in Warpcast iframe
   - Test share button click
   - Test link button navigation
   - Verify frame renders correctly

**Files:**
- `__tests__/lib/rank.test.ts` (new)
- `__tests__/api/frame/image.test.ts` (new)
- `e2e/frame-visual-regression.spec.ts` (new)
- `e2e/frame-interactions.spec.ts` (new)

**Success Criteria:**
- ✅ 20+ unit tests passing
- ✅ 9 integration tests (1 per frame type)
- ✅ Visual regression baseline captured
- ✅ E2E test suite passing

---

#### Task 13: Linting & Code Quality (2 hours) 🔵
**Priority:** P2 (Medium - Maintainability)  
**Goal:** Prevent regressions with automated checks

**Scope:**
1. **ESLint rules**
   - Enable @typescript-eslint/no-unused-vars (error)
   - Enable @typescript-eslint/no-unused-imports (error)
   - Enable no-duplicate-imports (error)
   - Enable prefer-const (warning)

2. **Pre-commit hooks**
   - Run ESLint on staged files (lint-staged)
   - Run TypeScript type checking (tsc --noEmit)
   - Run Prettier formatting (auto-fix)
   - Block commit if errors found

3. **CI checks**
   - GitHub Actions: Lint + TypeScript + Tests
   - Block PR merge if checks fail
   - Require code review from @0xheycat
   - Auto-label PRs (frame-system, bug, feature)

4. **Code coverage**
   - Measure test coverage (Jest)
   - Set minimum coverage (70%)
   - Generate coverage report (HTML)
   - Track coverage over time

**Files:**
- `.eslintrc.json` (update rules)
- `.husky/pre-commit` (new - git hook)
- `.github/workflows/ci.yml` (update)
- `jest.config.js` (add coverage config)

**Success Criteria:**
- ✅ ESLint blocks unused imports
- ✅ Pre-commit hook runs successfully
- ✅ CI pipeline enforces checks
- ✅ Test coverage >70%

---

#### Task 14: Documentation & Developer Guide (2 hours) 🔵
**Priority:** P2 (Medium - Onboarding)  
**Goal:** Make frame system easy to understand and extend

**Scope:**
1. **Architecture documentation**
   - Update FRAME-SYSTEM-ARCHITECTURE.md
   - Document cache strategy (Redis, TTL, warming)
   - Document error handling (boundaries, Sentry)
   - Document monitoring (metrics, alerts)

2. **Developer guide**
   - How to add a new frame type (step-by-step)
   - How to test frames locally (scripts)
   - How to debug frame errors (Sentry, logs)
   - How to optimize frame performance (profiling)

3. **API documentation**
   - Document all frame endpoints (/api/frame, /api/frame/image)
   - Document query parameters (type, fid, user, chain, etc.)
   - Document response format (vNext JSON)
   - Document error codes (500, 404, 408, 403, 429)

4. **Runbooks**
   - Frame outage response (check Sentry, Vercel, Redis)
   - Cache issues (flush, warm, monitor)
   - Performance degradation (check p95, identify bottleneck)
   - Rollback procedure (revert commit, redeploy)

**Files:**
- `docs/architecture/FRAME-SYSTEM-ARCHITECTURE.md` (update)
- `docs/guides/FRAME-DEVELOPMENT-GUIDE.md` (new)
- `docs/api/FRAME-API-REFERENCE.md` (new)
- `docs/runbooks/FRAME-INCIDENT-RESPONSE.md` (new)

**Success Criteria:**
- ✅ Architecture doc up to date
- ✅ Developer guide complete (5+ sections)
- ✅ API reference generated
- ✅ Runbooks tested (dry-run)

---

## 📐 Phase 1G Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│              USER (Warpcast, Twitter)                    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│            VERCEL EDGE (Future CDN)                      │
│  • Cache-Control headers                                 │
│  • ETag support                                          │
│  • Geographic routing                                    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         FRAME ROUTES (/frame/*, /api/frame)             │
│  • Input validation (frame-validation.ts)                │
│  • Error boundaries (try-catch + Sentry)                 │
│  • Timeout wrappers (3-5s)                               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│           REDIS CACHE (Phase 1A)                         │
│  • Tiered TTL (60s, 5min, 24h)                           │
│  • Cache warmup (post-deploy)                            │
│  • LRU eviction                                          │
│  • Hit rate: Target 80%+                                 │
└─────────────────────────────────────────────────────────┘
                   ↓ (MISS)
┌─────────────────────────────────────────────────────────┐
│       DATA LAYER (Supabase, Neynar, Contracts)          │
│  • Read replicas (80% traffic)                           │
│  • Connection pooling (max 10)                           │
│  • Query timeout (3s)                                    │
│  • Fallback data (if timeout)                            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│       IMAGE GENERATION (/api/frame/image)                │
│  • ImageResponse (Satori)                                │
│  • Background: og-image.png (optimized)                  │
│  • WebP support (future)                                 │
│  • Generation time: Target p95 <6s                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│            MONITORING (Sentry, Vercel)                   │
│  • Error tracking (structured logs)                      │
│  • Performance metrics (p50, p95, p99)                   │
│  • Alerts (email + Slack)                                │
│  • Dashboards (real-time health)                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Metrics

### Performance
- **p50 latency:** <500ms (cached), <3s (uncached)
- **p95 latency:** <2s (cached), <6s (uncached)
- **Cache hit rate:** >80% (up from 60%)
- **Frame size:** <150KB average (down from 200KB)

### Reliability
- **Error rate:** <1% (down from ~5%)
- **Uptime:** >99.9% (monitored via Sentry)
- **Timeout rate:** <0.5% (with fallbacks)
- **Cache failures:** <0.1% (Redis HA)

### Quality
- **Test coverage:** >70% (unit + integration)
- **Visual regressions:** 0 (automated checks)
- **TypeScript errors:** 0 (strict mode enforced)
- **Unused imports:** 0 (ESLint enforced)

### Features
- **Rank progression:** Visible in 4 frame types
- **Error frames:** 5 types implemented
- **Analytics:** Tracking 4 key events
- **Monitoring:** 4 alert rules active

---

## ⏱️ Timeline & Milestones

### Week 1 (Nov 23-29): Layer 1 - Error Handling
- **Day 1-2:** Task 1 (Error Frame System) - 3h
- **Day 3:** Task 2 (Fallback & Timeout Handling) - 2h
- **Day 4-5:** Task 3 (Monitoring & Alerting) - 3h
- **Milestone:** Error rate <1%, monitoring active

### Week 2 (Nov 30 - Dec 6): Layer 2 - Performance
- **Day 1-2:** Task 4 (Cache Strategy Optimization) - 3h
- **Day 3:** Task 5 (Image Optimization) - 2h
- **Day 4-5:** Task 6 (Database Query Optimization) - 3h
- **Day 6:** Task 7 (CDN Preparation) - 2h
- **Milestone:** Cache hit rate >80%, p95 <6s

### Week 3 (Dec 7-13): Layer 3 - Advanced Features
- **Day 1-3:** Task 8 (Rank Progression System) - 4h
- **Day 4:** Task 9 (FRAME_LAYOUT Standardization) - 2h
- **Day 5:** Task 10 (Frame Animations - Experimental) - 3h
- **Day 6-7:** Task 11 (Frame Analytics Integration) - 3h
- **Milestone:** Rank system live, analytics tracking

### Week 4 (Dec 14-20): Layer 4 - Testing & Quality
- **Day 1-3:** Task 12 (Automated Frame Testing) - 4h
- **Day 4:** Task 13 (Linting & Code Quality) - 2h
- **Day 5-6:** Task 14 (Documentation & Developer Guide) - 2h
- **Milestone:** 70% test coverage, docs complete

**Total Estimated Time:** 38 hours (4 weeks @ 10h/week)

---

## 🚧 Risks & Mitigation

### Risk 1: Cache Warmup Performance Impact
- **Impact:** HIGH (could slow down deployments)
- **Probability:** Medium (100 frames * 3s = 5 minutes)
- **Mitigation:** 
  - Run warmup async (post-deploy hook)
  - Limit to top 50 users (not 100)
  - Use queue system (BullMQ)
- **Contingency:** Skip warmup if >5 min, cache on-demand

### Risk 2: Animation File Size
- **Impact:** MEDIUM (large files = slow load)
- **Probability:** High (GIF typically 2-5MB)
- **Mitigation:**
  - Set hard limit: 300KB (reject if larger)
  - Use APNG (better compression than GIF)
  - Test with sample frames before full rollout
- **Contingency:** Keep animations experimental, don't release

### Risk 3: Database Migration Downtime
- **Impact:** HIGH (frame generation fails during migration)
- **Probability:** Low (indexes can be added online)
- **Mitigation:**
  - Use `CREATE INDEX CONCURRENTLY` (no locks)
  - Test migrations on staging first
  - Schedule during low-traffic hours (2-4 AM UTC)
- **Contingency:** Rollback migration, deploy without indexes

### Risk 4: Monitoring Alert Fatigue
- **Impact:** MEDIUM (engineers ignore alerts)
- **Probability:** Medium (too many false positives)
- **Mitigation:**
  - Tune alert thresholds (start conservative)
  - Use rate limiting (max 1 alert per 5 min)
  - Implement alert escalation (email → Slack → PagerDuty)
- **Contingency:** Adjust alert rules based on first 2 weeks

---

## 📦 Deliverables

### Code
- ✅ Error frame system (5 error types)
- ✅ Timeout handling (all data sources)
- ✅ Monitoring integration (Sentry + Vercel)
- ✅ Cache optimization (warmup + tiered TTL)
- ✅ Image optimization (WebP support)
- ✅ Database optimization (indexes + read replicas)
- ✅ Rank progression (4 frame types)
- ✅ FRAME_LAYOUT standardization
- ✅ Frame animations (experimental POC)
- ✅ Analytics integration
- ✅ Automated tests (70% coverage)
- ✅ ESLint rules (enforce quality)

### Documentation
- ✅ Architecture doc (updated)
- ✅ Developer guide (5+ sections)
- ✅ API reference (all endpoints)
- ✅ Runbooks (4 scenarios)
- ✅ CDN strategy (rollout plan)
- ✅ Animation research (findings + recommendations)

### Infrastructure
- ✅ Sentry alerts (4 rules configured)
- ✅ Redis cache (optimized + warmed)
- ✅ GitHub Actions CI (lint + test + coverage)
- ✅ Pre-commit hooks (auto-fix formatting)
- ✅ Visual regression baseline (9 frames)

---

## 🎓 Lessons Learned (from Phase 1F)

### What to Keep Doing ✅
1. **Layer-by-layer approach** - Systematic, reduces risk
2. **Small tasks (2-4h)** - Easy to track, complete in 1 session
3. **Localhost testing first** - Catches issues before production
4. **Documentation updates** - Keep STATUS.md current
5. **Commit messages** - Detailed, include testing results

### What to Improve 🔧
1. **Import audits** - Run `pnpm tsc --noEmit` after every task
2. **Automated tests** - Prevent regressions (formatXpDisplay)
3. **Task dependencies** - Document clearly (Task 5 → Task 10)
4. **Error handling** - Don't wait for production errors
5. **Monitoring** - Add early, not after issues

### What to Start Doing 🚀
1. **Pre-commit hooks** - Block bad code before commit
2. **Visual regression** - Catch layout issues automatically
3. **E2E tests** - Verify frame workflows end-to-end
4. **Performance budgets** - Set targets, measure, alert
5. **Load testing** - Simulate high traffic before launch

---

## 🔗 Dependencies

### External Services
- ✅ **Redis** - Cache (Phase 1A - already deployed)
- ✅ **Sentry** - Error tracking (already configured)
- ✅ **Vercel Analytics** - Performance monitoring (already enabled)
- ⏳ **Supabase Read Replica** - Database optimization (Task 6)
- ⏳ **BullMQ** - Queue system (Task 4 - cache warmup)

### Internal Libraries
- ✅ `lib/rank.ts` - XP/level/tier calculations (Phase 1F Task 10)
- ✅ `lib/frame-design-system.ts` - Fonts/colors/layout (Phase 1F Task 8)
- ✅ `lib/frame-cache.ts` - Redis caching (Phase 1A)
- ⏳ `lib/frame-errors.ts` - Error utilities (Task 1)
- ⏳ `lib/frame-metrics.ts` - Monitoring helpers (Task 3)
- ⏳ `lib/frame-analytics.ts` - Event tracking (Task 11)

---

## 📞 Support & Communication

**Questions?** Ping @0xheycat in #frame-system  
**Issues?** File ticket: https://github.com/0xheycat/gmeowbased/issues  
**Emergency?** Check:
1. Sentry dashboard (errors, performance)
2. Vercel logs (deployment, runtime errors)
3. Redis status (cache health)
4. Supabase status (database connectivity)

**Weekly Sync:** Fridays 3 PM UTC (review progress, adjust priorities)

---

## ✅ Phase 1G Completion Criteria

- [ ] All 14 tasks complete (38 hours estimated)
- [ ] Error rate <1% (down from ~5%)
- [ ] Cache hit rate >80% (up from 60%)
- [ ] p95 latency <6s (cached + uncached)
- [ ] Test coverage >70% (unit + integration)
- [ ] 0 unused imports (ESLint enforced)
- [ ] 5 error frame types implemented
- [ ] 4 monitoring alerts active
- [ ] Rank progression live in 4 frames
- [ ] Documentation complete (4 docs)

**Target Completion:** December 20, 2025  
**Next Phase:** Phase 1H (Advanced interactions, transactions, multi-step flows)

---

*Phase 1G: Transform frames from functional to production-grade with polish, performance, and resilience.* 🚀
