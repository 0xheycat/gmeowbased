# Phase 1D: Frame Analytics & Personalization - Planning Document

**Status**: Planning  
**Created**: 2025-01-28  
**Updated**: 2025-11-23  
**Target Completion**: TBD  
**Dependencies**: Phase 1C completion (Tasks 1-6)

---

## ⚠️ IMPORTANT: Frame Embed Support Deprecated

**Effective Date**: November 23, 2025

**CRITICAL CHANGE**: Farcaster frames **no longer support interactive POST buttons** or traditional frame embeds. This fundamentally changes the frame architecture:

- ❌ **POST buttons removed**: No `action: 'post'` buttons in any frame
- ❌ **Frame embeds deprecated**: Traditional frame protocol no longer functional
- ✅ **Link buttons only**: Frames now use `action: 'link'` to external URLs
- ✅ **Launch frames**: Miniapp launch buttons (`action: 'launch_frame'`) still work
- ✅ **Static metadata**: OG tags, compose text (fc:frame:text) still render

**Impact on Phase 1D**:
- Analytics tracking simplified (no POST interactions to track)
- A/B testing focused on link CTR, miniapp launches, and compose shares
- Personalization limited to static content (titles, descriptions, images)
- Performance optimization still relevant (faster static frame loads)

**Migration Strategy**:
All interactive features moved to **miniapp URLs** (`action: 'link'` or `action: 'launch_frame'`). Frames serve as **static previews** that link to interactive miniapps.

---

## Executive Summary

Phase 1D focuses on **data-driven optimization** and **personalized experiences** for Farcaster frames. Building on the rich embeds foundation from Phase 1C, this phase introduces analytics tracking, A/B testing infrastructure, and dynamic content personalization to improve user engagement and conversion rates.

**Note**: This plan was created before frame embed deprecation. Features have been adjusted to work within the new static frame + miniapp architecture.

**Core Objectives** (Adjusted for Static Frame Architecture):
1. **Frame Analytics** - Track frame views, link clicks, and miniapp launches (no POST tracking)
2. **A/B Testing** - Compare different static frame variants (titles, images, button labels)
3. **Personalization** - Tailor frame metadata based on user behavior and on-chain data
4. **Performance Monitoring** - Optimize static frame load times and image generation

---

## Phase 1C Completion Status

### ✅ Completed Tasks (6/6)

1. **Task 1: Text Replacements** - All "GMEOW" → "gmeowbased" conversions complete
2. **Task 2: Compose Text** - fc:frame:text meta tags added to all 9 frame types
3. **Task 3: Enhanced OG Descriptions** - Emoji descriptions for GM and generic frames
4. **Task 4: Username Display** - @username replaces wallet addresses in points frame
5. **Task 5: Rich Quest Titles** - Actual quest names shown instead of "Quest #ID"
6. **Task 6: QuestCard Share Button** - Warpcast composer integration

**Commit**: `35c0469` - "feat(frames): Phase 1C tasks 4-5 - username display + quest titles"  
**Testing**: All 9 frame types validated on localhost:3007 ✅

### 🔄 Deferred Features

The following features were identified during Phase 1C but deferred for future implementation:

#### 1. Username Caching & Rate Limiting
- **Current**: Each frame request calls Neynar API for username resolution
- **Issue**: Potential rate limiting on high-traffic frames
- **Solution**: Implement Redis/Supabase caching layer for Neynar profiles
- **Priority**: Medium (becomes critical above 10k daily frame views)

#### 2. Extended Emoji Descriptions
- **Current**: Only GM and generic frames have emoji descriptions
- **Issue**: Other frame types (quest, guild, points, etc.) still use plain text
- **Solution**: Add emoji-rich descriptions for all 9 frame types
- **Priority**: Low (cosmetic improvement, not functional)

#### 3. Dynamic Quest Metadata
- **Current**: Quest overlay shows static information (reward, spots, expiry)
- **Issue**: No real-time completion percentage or trending indicators
- **Solution**: Add live quest stats (% complete, trending badge, time remaining)
- **Priority**: Medium (improves quest engagement)

#### 4. Multi-Chain Quest Support
- **Current**: Quest frames show single chain information
- **Issue**: Cross-chain quests not visually distinguished
- **Solution**: Add multi-chain badges and aggregated stats
- **Priority**: Low (depends on multi-chain quest availability)

#### 5. Frame Image Generation Optimization
- **Current**: Dynamic images generated on-demand per request
- **Issue**: High compute cost for complex overlays with profiles
- **Solution**: Pre-render common frame variants, use CDN caching
- **Priority**: High (performance & cost optimization)

---

## Phase 1D: Proposed Features

### Feature 1: Frame Analytics Tracking

**Objective**: Capture comprehensive frame interaction data for optimization.

**⚠️ Adjusted for No POST Buttons**: Analytics now focuses on static frame views, link clicks, and miniapp launches. No POST button tracking needed.

#### Implementation Details

**1.1 Event Tracking** (Updated for Static Frames)
- Frame view events (initial load)
- Link button click events (external URLs)
- Launch frame events (miniapp opens) ✅ Still supported
- Share/compose events (Warpcast composer opens)
- Error events (failed loads, API errors)
- ~~POST button clicks~~ ❌ Removed - not supported

**1.2 Data Schema** (Simplified for Static Frames)
```typescript
interface FrameAnalyticsEvent {
  eventId: string;
  timestamp: Date;
  frameType: 'quest' | 'guild' | 'points' | 'gm' | 'badge' | 'referral' | 'leaderboard' | 'verify' | 'onchainstats';
  eventType: 'view' | 'link_click' | 'launch' | 'share' | 'error'; // No 'post' events
  userId?: number; // FID if available
  userAddress?: string; // Wallet address if available
  chainId?: string;
  questId?: number;
  guildId?: number;
  buttonIndex?: number;
  buttonAction?: 'link' | 'launch_frame'; // Only link and launch_frame supported
  targetUrl?: string; // Where the link/launch goes
  sessionId: string;
  referrer?: string;
  userAgent?: string;
  errorCode?: string;
  loadTimeMs?: number;
}

// Note: POST button tracking removed - frames are now static with link-only buttons
```

**1.3 Storage Options**
- **Supabase**: Real-time analytics table with RLS policies
- **PostHog**: External analytics platform with session replay
- **Custom**: Lightweight Redis buffer → Supabase batch insert

**1.4 Analytics Dashboard**
- Frame performance overview (views, clicks, conversions)
- Quest completion funnels (view → launch → verify → claim)
- User journey tracking (what frames they visit, in what order)
- Error rate monitoring (failed API calls, timeout events)

#### Success Metrics (Updated for Static Frames)
- **Link Click Rate**: (link button clicks / frame views) > 12% (lower than POST CTR, links require navigation)
- **Launch Rate**: (miniapp launches / frame views) > 8%
- **Share Rate**: (compose opens / frame views) > 5%
- **Quest Completion Rate**: Measured via miniapp analytics (not frame POST tracking)

#### Estimated Effort
- **Development**: 3-4 days
- **Testing**: 1 day
- **Documentation**: 1 day
- **Total**: 5-6 days

---

### Feature 2: A/B Testing Infrastructure

**Objective**: Systematically test frame variants to optimize engagement.

**⚠️ Adjusted for Static Frames**: A/B testing now focuses on visual elements (titles, descriptions, images, button labels) that affect link CTR, not POST interactions.

#### Implementation Details

**2.1 Variant Definition** (Updated for Static Frames)
```typescript
interface FrameVariant {
  variantId: string;
  name: string;
  frameType: string;
  weight: number; // 0-100, percentage of traffic
  changes: {
    title?: string;
    description?: string;
    buttonLabels?: string[]; // Link button labels only
    buttonOrder?: number[]; // Reorder link buttons
    emojiStyle?: 'minimal' | 'rich' | 'none';
    composeTextTemplate?: string;
    overlayStyle?: 'default' | 'identity-card' | 'minimal';
    imageStyle?: 'dynamic' | 'static'; // Frame image variation
  };
  enabled: boolean;
  startDate: Date;
  endDate?: Date;
}

// Note: No POST button testing - all buttons are links or launch_frame actions
```

**2.2 Variant Selection Logic**
- Deterministic hashing: `hash(fid + experimentId) % 100 < variantWeight`
- Consistent assignment: Same user always sees same variant
- Session persistence: Variant stored in frame state for continuity

**2.3 Test Examples** (Updated for Link Buttons)

**Test 1: Quest Link Button Labels**
- **Control**: "Start Quest on Base" (existing link button)
- **Variant A**: "🎮 Open Quest"
- **Variant B**: "⚡ Play Now"
- **Metric**: Link click-through rate (CTR)
- **Note**: All buttons use `action: 'link'`, no POST actions

**Test 2: Compose Text Length**
- **Control**: "⚔️ New quest unlocked on Base! recast and claim • Base @gmeowbased"
- **Variant A**: "New quest on Base! @gmeowbased"
- **Variant B**: "⚔️ recast and claim quest is live @gmeowbased"
- **Metric**: Share rate (compose opens)

**Test 3: Frame Image Styles**
- **Control**: Dynamic overlay with quest metadata
- **Variant A**: Minimal static image with large quest name
- **Variant B**: Hero image with quest preview
- **Metric**: Link CTR and miniapp launch rate

**2.4 Results Analysis**
- Statistical significance calculator (chi-squared test)
- Confidence intervals for CTR, conversion rate
- Winner declaration criteria (p < 0.05, min 500 views per variant)
- Rollout automation (promote winner to 100% traffic)

#### Success Metrics (Updated for Static Frames)
- **Test Velocity**: Run 2-3 A/B tests per week
- **Winning Variants**: 15%+ improvement over control in link CTR (lower bar than POST CTR)
- **Rollout Speed**: Winner promoted within 3 days of significance

#### Estimated Effort
- **Development**: 4-5 days
- **Testing**: 2 days
- **Documentation**: 1 day
- **Total**: 7-8 days

---

### Feature 3: Dynamic Content Personalization

**Objective**: Tailor frame content based on user context and behavior.

**⚠️ Adjusted for Static Frames**: Personalization limited to metadata (titles, descriptions, images, compose text). Interactive personalization moved to miniapps.

#### Implementation Details

**3.1 Personalization Signals**
- **User Profile**: FID, username, follower count, verified status
- **On-Chain Activity**: Token balances, NFT holdings, transaction history
- **Frame History**: Previously viewed frames, completed quests, badges earned
- **Time Context**: Time of day, day of week, seasonal events
- **Network Context**: Chain preference (Base vs. others), gas price

**3.2 Personalization Rules**

**Rule 1: Quest Recommendations**
```typescript
// Show quests matching user's skill level
if (userCompletedQuests < 3) {
  recommendedQuests = getQuestsByDifficulty('beginner');
} else if (userCompletedQuests < 10) {
  recommendedQuests = getQuestsByDifficulty('intermediate');
} else {
  recommendedQuests = getQuestsByDifficulty('advanced');
}
```

**Rule 2: Time-Based Messaging**
```typescript
// Adapt GM frame greeting to user's timezone
const userHour = getUserLocalHour(fid);
if (userHour >= 5 && userHour < 12) {
  greeting = '🌅 Good Morning';
} else if (userHour >= 12 && userHour < 17) {
  greeting = '☀️ Good Afternoon';
} else if (userHour >= 17 && userHour < 21) {
  greeting = '🌆 Good Evening';
} else {
  greeting = '🌙 Good Night';
}
```

**Rule 3: Badge Highlights**
```typescript
// Emphasize rare badges in badge frames
if (badgeRarity === 'legendary' && !userOwnsBadge) {
  description = `🏆 LEGENDARY BADGE! Only ${badgeHolderCount} collectors own this.`;
} else if (userOwnsBadge) {
  description = `✅ You own this badge! Share to flex your collection.`;
} else {
  description = `Collect this badge to complete your ${collectionName} set.`;
}
```

**3.3 Personalization Data Pipeline**
- **Input**: FID, wallet address, frame type
- **Enrichment**: Fetch user profile, on-chain stats, frame history
- **Rules Engine**: Apply personalization rules based on signals
- **Output**: Customized frame content (title, description, buttons, compose text)
- **Caching**: Redis cache for user profiles (5 min TTL)

**3.4 Privacy & Consent**
- All personalization uses public blockchain data
- No PII collection beyond Farcaster profile (username, pfp)
- Opt-out mechanism: Generic frames if user prefers

#### Success Metrics (Updated for Static Frames)
- **Personalized Link CTR**: 20%+ higher than generic frames (lower than POST CTR expectations)
- **Quest Completion Rate**: Measured in miniapp, not frame
- **User Retention**: 30%+ more repeat frame views leading to miniapp visits

#### Estimated Effort
- **Development**: 5-6 days
- **Testing**: 2 days
- **Documentation**: 1 day
- **Total**: 8-9 days

---

### Feature 4: Performance Monitoring & Optimization

**Objective**: Ensure fast, reliable frame rendering across all frame types.

#### Implementation Details

**4.1 Performance Metrics**
- **Frame Load Time**: Time from request to HTML response (target: < 500ms)
- **Image Generation Time**: Time to render dynamic frame image (target: < 300ms)
- **API Response Time**: External API calls (Neynar, Supabase) (target: < 200ms)
- **Cache Hit Rate**: Percentage of cached vs. fresh data (target: > 70%)
- **Error Rate**: Failed requests / total requests (target: < 1%)

**4.2 Optimization Strategies**

**Strategy 1: Aggressive Caching**
```typescript
// Cache static frame images (24h TTL)
const cacheKey = `frame:${frameType}:${hash(params)}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;

// Generate frame image
const image = await generateFrameImage(params);
await redis.set(cacheKey, image, { ex: 86400 }); // 24h
return image;
```

**Strategy 2: Parallel API Calls**
```typescript
// Fetch user profile and quest data in parallel
const [profile, questData, onchainStats] = await Promise.all([
  fallbackResolveNeynarProfile({ fid }),
  fetchQuestData(questId, chainKey),
  fetchOnchainStats(userAddress, chainKey)
]);
```

**Strategy 3: Lazy Loading**
```typescript
// Load critical data first, defer non-critical enrichment
const criticalData = await loadCriticalFrameData(params);
const html = buildFrameHtml(criticalData);

// Enrich data in background (for next request)
enrichFrameDataAsync(params).catch(console.error);

return html;
```

**Strategy 4: CDN Edge Caching**
```typescript
// Vercel Edge Config: Cache frame responses at edge nodes
export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1'], // US East & West
};

// Set aggressive cache headers for static frames
res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
```

**4.3 Monitoring Dashboard**
- Real-time latency percentiles (p50, p95, p99)
- Error rate alerts (Sentry integration)
- API call volume and response times
- Cache hit/miss ratios by frame type
- Cost tracking (Neynar API calls, Supabase reads)

**4.4 Load Testing**
- Simulate 1,000 concurrent frame requests
- Test different frame types under load
- Identify bottlenecks (database, external APIs, image generation)
- Optimize critical paths to meet performance targets

#### Success Metrics
- **p95 Latency**: < 800ms for all frame types
- **Cache Hit Rate**: > 75% for repeated requests
- **Error Rate**: < 0.5% of total requests
- **Cost Efficiency**: < $0.001 per frame view

#### Estimated Effort
- **Development**: 4-5 days
- **Testing**: 2 days
- **Documentation**: 1 day
- **Total**: 7-8 days

---

## Implementation Roadmap

### Phase 1D.1: Analytics Foundation (Week 1-2)
- **Days 1-2**: Design analytics schema and event taxonomy
- **Days 3-5**: Implement event tracking in frame route handlers
- **Days 6-7**: Set up Supabase analytics tables with RLS
- **Days 8-9**: Build basic analytics dashboard (Next.js admin page)
- **Day 10**: Testing and validation

**Deliverables**:
- ✅ Analytics event tracking in production
- ✅ Supabase tables: `frame_analytics`, `frame_sessions`
- ✅ Admin dashboard showing frame views, CTR, launch rate
- ✅ Documentation: Analytics Event Reference

### Phase 1D.2: A/B Testing Infrastructure (Week 3-4)
- **Days 1-2**: Design variant configuration system (Supabase table)
- **Days 3-5**: Implement variant selection logic in frame handlers
- **Days 6-7**: Build experiment management UI (admin page)
- **Days 8-9**: Develop results analysis & statistical testing
- **Day 10**: Run first pilot A/B test (quest button labels)

**Deliverables**:
- ✅ A/B testing framework in production
- ✅ Supabase tables: `frame_experiments`, `experiment_variants`
- ✅ Admin UI: Create/edit experiments, view results
- ✅ Documentation: A/B Testing Guide
- ✅ Pilot test results report

### Phase 1D.3: Personalization Engine (Week 5-6)
- **Days 1-2**: Design personalization rules engine
- **Days 3-5**: Implement user signal collection (profile, on-chain, history)
- **Days 6-8**: Build personalization rules (quest recs, time-based, badges)
- **Days 9-10**: Test personalized vs. generic frame performance

**Deliverables**:
- ✅ Personalization rules engine in production
- ✅ Redis cache for user profiles and signals
- ✅ 5+ personalization rules active (quests, GM, badges)
- ✅ Documentation: Personalization Rules Catalog
- ✅ Performance report: Personalized vs. generic CTR

### Phase 1D.4: Performance Optimization (Week 7-8)
- **Days 1-2**: Set up performance monitoring (Sentry, custom metrics)
- **Days 3-5**: Implement caching strategies (Redis, CDN edge)
- **Days 6-7**: Parallel API calls and lazy loading optimizations
- **Days 8-9**: Load testing and bottleneck identification
- **Day 10**: Deploy optimizations and validate metrics

**Deliverables**:
- ✅ Performance monitoring dashboard
- ✅ Redis caching layer for profiles, frame images
- ✅ CDN edge caching for static frames
- ✅ Load test report (1,000 concurrent requests)
- ✅ Latency reduced by 30%+ (target: p95 < 800ms)

---

## Success Criteria

### Phase 1D Overall Goals (Adjusted for Static Frame Architecture)

**Engagement Metrics** (compared to Phase 1C baseline):
- 20%+ increase in link button click-through rate (lower than POST CTR)
- 15%+ increase in miniapp launch rate
- 10%+ increase in frame share/compose rate
- Quest completion tracked in miniapp, not frame POST interactions

**Performance Metrics**:
- 95th percentile frame load time < 800ms
- Cache hit rate > 75% for repeated requests
- Error rate < 0.5% of total frame views
- API cost < $0.001 per frame view

**Operational Metrics**:
- Analytics dashboard used weekly by product team
- 2-3 A/B tests running concurrently (testing link buttons, images, metadata)
- 5+ active personalization rules
- 100% test coverage for analytics, A/B testing, personalization

**Documentation**:
- Analytics Event Reference (all tracked events documented, no POST events)
- A/B Testing Guide (how to test static frame variants)
- Personalization Rules Catalog (metadata-only personalization)
- Performance Optimization Playbook (caching strategies, load testing)

---

## ⚠️ Architecture Change Impact Summary

**What Changed (November 23, 2025)**:
- ❌ Frame embeds deprecated - no interactive POST buttons
- ❌ POST action tracking removed from analytics
- ❌ POST button A/B testing removed
- ✅ Link buttons still work - track link CTR instead
- ✅ Launch frame (miniapp) buttons still work
- ✅ Static metadata (titles, images, compose text) still render
- ✅ All interactions moved to miniapp URLs

**How Phase 1D Adapts**:
- Analytics: Track link clicks and miniapp launches instead of POST interactions
- A/B Testing: Test static frame elements (titles, images, button labels) that drive link CTR
- Personalization: Focus on metadata personalization (quest recommendations in title/description)
- Performance: Optimize static frame generation and image rendering

---

## Risk Assessment

### High Risk
1. **API Rate Limiting** (Neynar, external services)
   - **Mitigation**: Aggressive caching, fallback to cached data
   - **Contingency**: Implement request queue, upgrade API tier

2. **Performance Regression** (added analytics overhead)
   - **Mitigation**: Async event logging, batch inserts
   - **Contingency**: Feature flag to disable analytics if latency spikes

### Medium Risk
3. **A/B Test Contamination** (user sees multiple variants)
   - **Mitigation**: Deterministic hashing, session persistence
   - **Contingency**: Reset experiment, extend test duration

4. **Personalization Privacy Concerns**
   - **Mitigation**: Only use public blockchain data, no PII
   - **Contingency**: Add opt-out mechanism, generic fallback

### Low Risk
5. **Cache Invalidation** (stale data shown to users)
   - **Mitigation**: Short TTLs (5-10 min), versioned cache keys
   - **Contingency**: Manual cache flush, reduce TTLs

6. **Analytics Data Volume** (high storage costs)
   - **Mitigation**: Sample high-volume events, aggregate old data
   - **Contingency**: Archive to cold storage, delete old events

---

## Dependencies & Prerequisites

### Technical Dependencies
- ✅ Phase 1C completion (Tasks 1-6 done)
- ✅ Supabase database with RLS policies
- ⏳ Redis instance for caching (Vercel KV or self-hosted)
- ⏳ Sentry integration for error tracking
- ⏳ PostHog or custom analytics platform (optional)

### Team Dependencies
- **Engineer**: Full-stack developer (analytics, A/B testing, personalization)
- **Designer**: Frame UI improvements based on A/B test results
- **Product Manager**: Define personalization rules, A/B test hypotheses
- **QA Tester**: Validate analytics accuracy, A/B test logic

### External Dependencies
- **Neynar API**: Stable and responsive (< 200ms p95)
- **Supabase**: Sufficient read/write throughput (1,000+ req/sec)
- **Vercel Edge Network**: CDN caching enabled

---

## Open Questions

1. **Analytics Platform**: Self-hosted (Supabase) vs. external (PostHog)?
   - **Consideration**: Cost, ease of use, session replay, funnel analysis
   - **Recommendation**: Start with Supabase (free tier), migrate to PostHog if needed

2. **A/B Test Duration**: How long to run tests before declaring winner?
   - **Consideration**: Traffic volume, effect size, statistical power
   - **Recommendation**: Min 3 days, 500 views per variant, p < 0.05

3. **Personalization Scope**: How aggressively should we personalize?
   - **Consideration**: User privacy, complexity, maintenance overhead
   - **Recommendation**: Start with 5 simple rules, expand based on results

4. **Performance Budget**: What's acceptable latency for rich frames?
   - **Consideration**: User experience, cost, infrastructure limits
   - **Recommendation**: p95 < 800ms, p99 < 1200ms

5. **Caching Strategy**: Redis vs. Vercel KV vs. in-memory cache?
   - **Consideration**: Cost, latency, global distribution
   - **Recommendation**: Vercel KV for global edge caching

---

## Next Steps

### Immediate Actions (This Week)
1. **Review & Approve**: Product team reviews Phase 1D plan
2. **Resource Allocation**: Assign engineer to Phase 1D work
3. **Technical Design**: Detailed design docs for analytics schema, A/B testing logic
4. **Kickoff Meeting**: Align team on goals, timeline, success metrics

### Short-Term (Next 2 Weeks)
1. **Phase 1D.1 Kickoff**: Begin analytics foundation implementation
2. **Supabase Setup**: Create analytics tables, RLS policies
3. **Event Tracking**: Implement frame view, button click events
4. **Dashboard Prototype**: Basic analytics dashboard in admin UI

### Long-Term (Next 2 Months)
1. **Complete Phase 1D**: All 4 features (analytics, A/B testing, personalization, performance)
2. **Run 5+ A/B Tests**: Optimize button labels, compose text, emoji styles
3. **Activate 10+ Personalization Rules**: Quests, GM, badges, leaderboards
4. **Achieve Performance Targets**: p95 < 800ms, cache hit > 75%

---

## Appendix

### A. Deferred Feature Details

#### A.1 Username Caching Architecture
```typescript
// Redis cache schema
interface CachedProfile {
  fid: number;
  username: string;
  pfpUrl: string;
  displayName: string;
  neynarScore: number;
  cachedAt: Date;
  ttl: number; // seconds
}

// Cache key: `neynar:profile:${fid}`
// TTL: 5 minutes (300 seconds)
// Invalidation: Manual flush or TTL expiry
```

#### A.2 Extended Emoji Descriptions
| Frame Type | Current Description | Proposed Emoji Description |
|------------|---------------------|---------------------------|
| Quest | "Clear this mission..." | "⚔️ Clear this mission on ⛓️ {chain}..." |
| Guild | "Join guild..." | "🏰 Join guild on ⛓️ {chain}..." |
| Points | "Connect wallet..." | "💰 Check your gmeowbased Points balance on ⛓️ {chain}..." |
| Badge | "Collect badge..." | "🎖️ Collect this exclusive badge on ⛓️ {chain}..." |
| Referral | "Invite friends..." | "🎁 Invite friends and earn rewards on ⛓️ {chain}..." |
| Leaderboard | "Top players..." | "🏆 Top players on gmeowbased leaderboard..." |
| Verify | "Verify quest..." | "✅ Verify quest completion on ⛓️ {chain}..." |
| OnchainStats | "On-chain metrics..." | "📊 On-chain activity metrics on ⛓️ {chain}..." |

#### A.3 Dynamic Quest Metadata Examples
```typescript
// Real-time quest completion percentage
const completionRate = questCompletedCount / questTotalSpots * 100;
if (completionRate > 80) {
  badge = { label: '🔥 HOT', tone: 'pink' }; // Trending quest
} else if (completionRate > 50) {
  badge = { label: `${Math.round(completionRate)}% FULL`, tone: 'gold' };
} else {
  badge = { label: questName, tone: 'violet' };
}

// Time-sensitive urgency messaging
const hoursLeft = (questExpiresAt - Date.now()) / (1000 * 60 * 60);
if (hoursLeft < 24 && hoursLeft > 0) {
  urgencyMessage = `⏰ ENDING IN ${Math.round(hoursLeft)}H`;
  description = `${urgencyMessage} • ${description}`;
}
```

### B. Analytics Event Examples

**Event 1: Frame View**
```json
{
  "eventId": "evt_1234567890",
  "timestamp": "2025-01-28T15:30:00Z",
  "frameType": "quest",
  "eventType": "view",
  "userId": 12345,
  "chainId": "base",
  "questId": 42,
  "sessionId": "sess_abc123",
  "referrer": "https://warpcast.com/~/compose",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
  "loadTimeMs": 450
}
```

**Event 2: Button Click**
```json
{
  "eventId": "evt_9876543210",
  "timestamp": "2025-01-28T15:31:15Z",
  "frameType": "quest",
  "eventType": "button_click",
  "userId": 12345,
  "chainId": "base",
  "questId": 42,
  "buttonIndex": 1,
  "buttonAction": "link",
  "sessionId": "sess_abc123"
}
```

**Event 3: Error**
```json
{
  "eventId": "evt_error_456",
  "timestamp": "2025-01-28T15:32:00Z",
  "frameType": "quest",
  "eventType": "error",
  "userId": 12345,
  "errorCode": "NEYNAR_TIMEOUT",
  "sessionId": "sess_abc123",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)..."
}
```

### C. A/B Test Configuration Example

```typescript
const questButtonTest: FrameExperiment = {
  experimentId: 'exp_quest_button_labels_001',
  name: 'Quest Button Labels - Jan 2025',
  frameType: 'quest',
  enabled: true,
  startDate: new Date('2025-02-01'),
  endDate: new Date('2025-02-14'),
  variants: [
    {
      variantId: 'control',
      name: 'Control (Original)',
      weight: 33,
      changes: {
        buttonLabels: ['Verify & Claim', 'Start Quest on Base']
      }
    },
    {
      variantId: 'variant_a',
      name: 'Variant A (Gamified)',
      weight: 33,
      changes: {
        buttonLabels: ['🎮 Verify Quest', '🎮 Play Quest Now']
      }
    },
    {
      variantId: 'variant_b',
      name: 'Variant B (Action-Oriented)',
      weight: 34,
      changes: {
        buttonLabels: ['✅ Claim Reward', '⚡ Start Earning']
      }
    }
  ],
  primaryMetric: 'ctr',
  secondaryMetrics: ['launch_rate', 'claim_rate']
};
```

### D. Performance Benchmarks

| Frame Type | Current p95 Latency | Target p95 Latency | Optimization Status |
|------------|---------------------|--------------------|--------------------|
| GM | 520ms | < 500ms | ✅ Within target |
| Quest | 680ms | < 600ms | ⚠️ Needs optimization |
| Guild | 590ms | < 600ms | ✅ Within target |
| Points | 750ms | < 600ms | ❌ Requires caching |
| Badge | 480ms | < 500ms | ✅ Within target |
| Referral | 510ms | < 500ms | ⚠️ Close to limit |
| Leaderboard | 820ms | < 700ms | ❌ Database query optimization needed |
| Verify | 650ms | < 600ms | ⚠️ Needs optimization |
| OnchainStats | 890ms | < 800ms | ❌ External API bottleneck |

**Critical Optimizations Needed**:
1. **Points Frame**: Implement Redis cache for user stats (target: -150ms)
2. **Leaderboard Frame**: Add database indexes, paginate results (target: -120ms)
3. **OnchainStats Frame**: Cache RPC responses, parallel API calls (target: -90ms)

---

## Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-28 | 1.0 | GitHub Copilot | Initial Phase 1D planning document created |

---

## References

- [Phase 1C Completion Summary](../Phase-1C/PHASE-1C-COMPLETION-SUMMARY.md)
- [Phase 1C Implementation Plan](../Phase-1C/PHASE-1C-IMPLEMENTATION-PLAN.md)
- [Farcaster Frames Spec](https://docs.farcaster.xyz/reference/frames/spec)
- [Neynar API Documentation](https://docs.neynar.com/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
