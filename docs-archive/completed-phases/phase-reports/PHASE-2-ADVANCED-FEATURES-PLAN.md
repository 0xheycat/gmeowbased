# 🚀 Phase 2: Advanced Features - Implementation Plan

**Date**: December 16, 2025, 10:00 PM CST  
**Status**: ✅ **COMPLETE** - All features deployed (12.5h actual vs 32h estimated)  
**Phase Duration**: 1 day (2.6x faster than 1-week estimate)  
**Priority**: Medium-High (enhance bot intelligence and user experience)

**Reference Documentation**:
- [Part 1: Architecture & Current State](FARCASTER-BOT-ENHANCEMENT-PLAN-PART-1.md)
- [Part 2: XP Calculation & Enhancements](FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md)
- [Part 3: Implementation Priorities](FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md)
- [Phase 1 Week 4 Complete](PHASE-1-WEEK-4-COMPLETE.md)

**Website**: https://gmeowhq.art  
**Network**: Base (Chain ID 8453)

---

## 📋 Executive Summary

Phase 2 introduces advanced bot intelligence features that make the bot more context-aware, reduce notification fatigue, and improve response accuracy. Building on Phase 1's foundation (context-aware replies, personalized greetings, multi-step conversations), Phase 2 focuses on smart frame selection, intelligent notification management, and confidence-based intent detection.

**Phase 2 Features** (ALL COMPLETE ✅):
- ✅ **P7**: Intent Confidence Scoring (2h) - Score intents 0.0-1.0, ask clarifying questions on low confidence
- ✅ **P6**: Notification Batching (8h) - Respect quiet hours, send daily digests, throttle rapid notifications
- ✅ **P5**: Dynamic Frame Selection (2.5h) - Context-aware frames based on user state and history

**Delivered Outcomes**:
- **-30%** notification fatigue expected (batching + quiet hours)
- **+15%** intent detection accuracy expected (confidence scoring)
- **+25%** frame CTR expected (dynamic selection based on context)
- **+10%** user engagement expected (smarter, more helpful bot)

**Completion Docs**:
- [PHASE-2-P7-COMPLETE.md](PHASE-2-P7-COMPLETE.md)
- [PHASE-2-P6-COMPLETE.md](PHASE-2-P6-COMPLETE.md)
- [PHASE-2-P5-COMPLETE.md](PHASE-2-P5-COMPLETE.md)

---

## 🎯 Feature Breakdown

### P7: Intent Confidence Scoring (Priority: HIGH, Risk: LOW)

**Current State**:
- Binary intent detection (match or no match)
- No confidence scores
- No fallback for ambiguous queries

**Enhancement**:
```typescript
interface IntentDetection {
  type: AgentIntentType
  confidence: number  // 0.0-1.0
  timeframe?: 'day' | 'week' | 'month' | 'all'
}

function detectIntentWithConfidence(text: string): IntentDetection {
  const scores = {
    stats: calculateKeywordScore(text, ['stats', 'show me', 'how am i']),
    streak: calculateKeywordScore(text, ['streak', 'gm count', 'days']),
    quests: calculateKeywordScore(text, ['quest', 'mission', 'task']),
    tips: calculateKeywordScore(text, ['tip', 'sent', 'received']),
    leaderboards: calculateKeywordScore(text, ['rank', 'leaderboard', 'top']),
  }
  
  const maxIntent = Object.entries(scores).reduce((a, b) => 
    b[1] > a[1] ? b : a
  )
  
  return {
    type: maxIntent[0] as AgentIntentType,
    confidence: maxIntent[1],
  }
}
```

**Scoring Algorithm**:
1. **Keyword Matching** (0.0-0.6): Count matching keywords, weight by specificity
2. **Question Pattern** (0.0-0.2): Presence of question words/marks
3. **Context Bonus** (0.0-0.2): Previous intent context from conversation state

**Confidence Thresholds**:
- **>0.7**: High confidence → Direct response
- **0.5-0.7**: Medium confidence → Response with gentle suggestion
- **<0.5**: Low confidence → Ask clarifying question

**Example Flows**:
```
User: "show my stats"
Detection: { type: 'stats', confidence: 0.92 }
Response: [Direct stats reply]

User: "what's my rank"
Detection: { type: 'leaderboards', confidence: 0.65 }
Response: [Rank reply] + "💡 Want to see full leaderboards? Ask 'show leaderboards'"

User: "how am i doing"
Detection: { type: 'stats', confidence: 0.42 }
Response: "I can help with that! Are you asking about:
          1️⃣ Your stats (XP, level, streak)
          2️⃣ Your quest progress
          3️⃣ Your leaderboard rank"
```

**Implementation Files**:
- Modify: `lib/agent-auto-reply.ts` (add detectIntentWithConfidence function)
- Modify: `lib/agent-auto-reply.ts` (update detectIntent to use confidence)
- Create: `__tests__/lib/agent-auto-reply-p7-confidence.test.ts` (30 tests)

**Testing Strategy**:
- 30 unit tests for scoring accuracy
- 10 edge cases (ambiguous queries, typos, multiple intents)
- Manual QA with 20 real user queries

**Success Criteria**:
- 90%+ confidence accuracy on test queries
- <5% increase in clarifying questions (not annoying)
- No regressions in existing intent detection

---

### P6: Notification Batching (Priority: HIGH, Risk: MEDIUM)

**Current State**:
- All notifications sent immediately
- No quiet hours support (schema exists but not implemented)
- No throttling for rapid-fire notifications

**Enhancement Components**:

**1. Quiet Hours Respect**:
```typescript
async function shouldBatchNotification(
  fid: number,
  priority: 'low' | 'medium' | 'high' | 'critical'
): Promise<boolean> {
  const prefs = await getNotificationPreferences(fid)
  
  if (!prefs.quiet_hours_enabled) return false
  if (priority === 'critical') return false  // Never batch critical
  
  const userTime = convertToTimezone(new Date(), prefs.quiet_hours_timezone)
  const hour = userTime.getHours()
  
  const start = parseTime(prefs.quiet_hours_start)  // e.g., 22:00
  const end = parseTime(prefs.quiet_hours_end)      // e.g., 08:00
  
  return isInQuietHours(hour, start, end)
}
```

**2. Daily Digest**:
```typescript
async function sendDailyDigest(fid: number) {
  const yesterday = getYesterday()
  const batched = await getBatchedNotifications(fid, yesterday)
  
  if (batched.length === 0) return
  
  const summary = {
    totalXP: batched.reduce((sum, n) => sum + (n.metadata?.xp || 0), 0),
    activities: batched.filter(n => n.category === 'quest').length,
    achievements: batched.filter(n => n.category === 'achievement').length,
    tips: batched.filter(n => n.category === 'tip').length,
  }
  
  const digestText = buildDigestMessage(summary)
  
  await sendPushNotification({
    fid,
    title: '📬 Daily Summary',
    body: digestText,
    priority: 'medium',
    deep_link: '/notifications',
  })
  
  await markNotificationsAsSent(batched.map(n => n.id))
}
```

**3. Smart Throttling**:
```typescript
async function throttleNotification(fid: number, notification: Notification): Promise<boolean> {
  const recentCount = await countRecentNotifications(fid, { hours: 1 })
  
  if (recentCount >= 3) {
    // Throttle: Add to batch queue
    await addToBatchQueue(fid, notification)
    return true  // Throttled
  }
  
  return false  // Not throttled, send immediately
}
```

**Batch Queue Schema**:
```sql
CREATE TABLE notification_batch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid INTEGER NOT NULL,
  notification_data JSONB NOT NULL,
  priority TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,  -- When to send (null = next digest)
  sent_at TIMESTAMPTZ
);
```

**GitHub Actions Cron** (ONLY acceptable scheduler - NO Vercel cron):
```yaml
# .github/workflows/send-digests.yml
name: Send Notification Digests
on:
  schedule:
    - cron: '0 8 * * *'  # 8 AM UTC daily
  workflow_dispatch:

jobs:
  send-digests:
    runs-on: ubuntu-latest
    steps:
      - name: Send digests
        env:
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
          NEXT_PUBLIC_BASE_URL: ${{ secrets.NEXT_PUBLIC_BASE_URL }}
        run: |
          curl -X POST \
            -H "Authorization: Bearer $CRON_SECRET" \
            "$NEXT_PUBLIC_BASE_URL/api/cron/send-digests"
```

**Implementation Files**:
- Create: `supabase/migrations/YYYYMMDD_notification_batch_queue.sql`
- Modify: `lib/notifications.ts` (add batching logic)
- Create: `cron/send-digests.ts` (digest job)
- Create: `lib/notification-batching.ts` (batch queue management)
- Create: `__tests__/lib/notification-batching.test.ts` (25 tests)

**Testing Strategy**:
- 25 unit tests for batching logic
- 10 integration tests with time mocking
- Manual QA with different quiet hours settings

**Success Criteria**:
- 100% quiet hours respect (no notifications during quiet period)
- Digest sent within 1 hour of quiet hours end
- No missed critical notifications (streak breaks, XP milestones)

---

### P5: Dynamic Frame Selection (Priority: MEDIUM, Risk: MEDIUM)

**Current State**:
- Frame selected based on intent only
- No user context considered
- Static frame URLs

**Enhancement**:

**UserContext Interface**:
```typescript
interface UserContext {
  // Quest context
  hasActiveQuest: boolean
  activeQuestId?: number
  questProgress?: number  // 0-100
  
  // Achievement context
  hasUnseenAchievement: boolean
  latestAchievementId?: number
  
  // Guild context
  isGuildMember: boolean
  isGuildOfficer: boolean
  guildRank?: number
  
  // User stats context
  totalXP: number
  level: number
  streak: number
  
  // Interaction history
  lastFrameType?: BotFrameType
  frameInteractionCount: number
}
```

**Dynamic Selection Logic**:
```typescript
async function selectOptimalFrame(
  intent: AgentIntentType,
  fid: number
): Promise<BotFrameType> {
  const context = await buildUserContext(fid)
  
  // Priority 1: Active quest in progress (override quests intent)
  if (context.hasActiveQuest && intent === 'quests') {
    return 'quest-progress'  // Show progress bar
  }
  
  // Priority 2: New achievement unlocked (override any intent)
  if (context.hasUnseenAchievement) {
    return 'achievement-showcase'  // Celebrate achievement
  }
  
  // Priority 3: Guild context (override guild intent)
  if (context.isGuildMember && intent === 'guild') {
    if (context.isGuildOfficer) {
      return 'guild-management'  // Officer view
    }
    return 'guild-leaderboard'  // Member view
  }
  
  // Priority 4: Beginner user (override quests intent)
  if (context.totalXP < 500 && intent === 'quests') {
    return 'beginner-quests'  // Filter to easy quests
  }
  
  // Priority 5: Default intent-based frame
  return getDefaultFrameForIntent(intent)
}
```

**User Context Building** (parallel queries for performance):
```typescript
async function buildUserContext(fid: number): Promise<UserContext> {
  const [profile, quests, achievements, guild] = await Promise.all([
    getUserProfile(fid),
    getActiveQuests(fid),
    getUnseenAchievements(fid),
    getUserGuild(fid),
  ])
  
  return {
    hasActiveQuest: quests.length > 0,
    activeQuestId: quests[0]?.id,
    questProgress: quests[0]?.progress,
    hasUnseenAchievement: achievements.length > 0,
    latestAchievementId: achievements[0]?.id,
    isGuildMember: guild !== null,
    isGuildOfficer: guild?.role === 'officer',
    guildRank: guild?.rank,
    totalXP: profile.totalXP,
    level: profile.level,
    streak: profile.streak,
  }
}
```

**Caching Strategy** (5-minute TTL):
```typescript
const CONTEXT_CACHE_KEY = (fid: number) => `user:context:${fid}`
const CONTEXT_TTL = 5 * 60  // 5 minutes

async function buildUserContext(fid: number): Promise<UserContext> {
  const cached = await redis.get(CONTEXT_CACHE_KEY(fid))
  if (cached) return JSON.parse(cached)
  
  const context = await buildUserContextFromDB(fid)
  await redis.setex(CONTEXT_CACHE_KEY(fid), CONTEXT_TTL, JSON.stringify(context))
  
  return context
}
```

**Implementation Files**:
- Create: `lib/bot-user-context.ts` (UserContext building)
- Modify: `lib/bot-frame-builder.ts` (add selectOptimalFrame)
- Modify: `lib/agent-auto-reply.ts` (use dynamic frame selection)
- Create: `__tests__/lib/bot-user-context.test.ts` (20 tests)

**Testing Strategy**:
- 20 unit tests for context building
- 15 integration tests for frame selection
- Manual QA with different user profiles

**Success Criteria**:
- Context building completes in <200ms (parallel queries)
- Frame selection accuracy >90% (correct context-aware choice)
- No regressions in existing frame embedding

---

## 📅 Implementation Timeline

**Phase 2 Estimated Duration**: 1 week (based on Phase 1 velocity of 18x faster)

**Week 1 Breakdown**:
- **Day 1**: P7 Implementation (Intent Confidence Scoring) - 6 hours
  - Morning: Scoring algorithm + detectIntentWithConfidence function (3 hours)
  - Afternoon: Integration + clarifying questions logic (2 hours)
  - Evening: Testing (30 tests, 1 hour)

- **Day 2**: P7 QA + P6 Start (Notification Batching) - 8 hours
  - Morning: P7 manual QA + refinements (2 hours)
  - Afternoon: P6 database migration + quiet hours logic (3 hours)
  - Evening: Daily digest implementation (3 hours)

- **Day 3**: P6 Continued (Notification Batching) - 8 hours
  - Morning: Smart throttling + batch queue (3 hours)
  - Afternoon: Cron job setup + testing (3 hours)
  - Evening: Integration + QA (2 hours)

- **Day 4**: P5 Implementation (Dynamic Frame Selection) - 6 hours
  - Morning: UserContext building + caching (3 hours)
  - Afternoon: selectOptimalFrame logic + integration (2 hours)
  - Evening: Testing (20 tests, 1 hour)

- **Day 5**: P5 QA + Documentation - 4 hours
  - Morning: P5 manual QA + refinements (2 hours)
  - Afternoon: Documentation updates + completion report (2 hours)

**Total**: 32 hours estimated (vs 7 days / 56 hours in original plan)  
**Velocity**: ~1.75x faster than original estimate

---

## 🧪 Testing Strategy

**Phase 2 Testing Goals**:
- 95%+ test coverage for new code
- Zero regressions in existing features
- Performance benchmarks met (<50ms overhead)

**Test Suite Breakdown**:

**P7: Intent Confidence Scoring**:
- 30 unit tests:
  - Keyword scoring accuracy (10 tests)
  - Confidence threshold handling (5 tests)
  - Clarifying question generation (5 tests)
  - Context bonus integration (5 tests)
  - Edge cases (ambiguous queries, typos) (5 tests)

**P6: Notification Batching**:
- 25 unit tests:
  - Quiet hours detection (5 tests)
  - Batch queue management (5 tests)
  - Daily digest building (5 tests)
  - Smart throttling (5 tests)
  - Priority handling (5 tests)
- 10 integration tests:
  - End-to-end batching flow (5 tests)
  - Cron job execution (3 tests)
  - Time zone handling (2 tests)

**P5: Dynamic Frame Selection**:
- 20 unit tests:
  - UserContext building (8 tests)
  - Frame selection logic (8 tests)
  - Caching behavior (4 tests)
- 15 integration tests:
  - Context-aware selection flows (10 tests)
  - Performance benchmarks (5 tests)

**Total**: 100 tests across Phase 2 features

---

## 📊 Success Metrics

**Target Metrics** (measured 2 weeks after Phase 2 deployment):

**User Experience**:
- **Notification Opt-Out Rate**: <10% (target: maintain current rate)
- **Bot Interaction Rate**: +10% (more helpful responses)
- **Frame CTR**: +25% (context-aware frames more relevant)
- **Clarifying Question Rate**: 3-5% (not annoying, helpful)

**Technical Performance**:
- **Response Time P95**: <1000ms (including context building)
- **Intent Detection Accuracy**: 90%+ (measured via user feedback)
- **Quiet Hours Respect**: 100% (no violations)
- **Digest Delivery Success**: >98% (sent within 1 hour)

**Engagement Metrics**:
- **Daily Digest Open Rate**: >40% (compared to 15-20% for individual notifications)
- **Multi-Turn Conversation Rate**: +20% (confidence scoring enables better follow-ups)
- **Average Session Length**: +15% (more engaging interactions)

---

## 🚨 Risk Assessment

**P7: Intent Confidence Scoring** (Risk: LOW)
- **Risk**: Over-triggering clarifying questions (annoying users)
- **Mitigation**: Set conservative threshold (0.5), only ask when NO intent >0.5
- **Fallback**: A/B test with 50% of users first

**P6: Notification Batching** (Risk: MEDIUM)
- **Risk**: Delayed critical notifications (streak breaks, XP milestones)
- **Mitigation**: Never batch critical priority, always send immediately
- **Monitoring**: Track notification delivery SLA (target: <5 min for critical)

**P5: Dynamic Frame Selection** (Risk: MEDIUM)
- **Risk**: Context building queries slow down response time
- **Mitigation**: Parallel queries (Promise.all), 5-min cache, 500ms timeout
- **Fallback**: If context building fails, fall back to intent-based frame

**Overall Phase 2 Risk**: **MEDIUM** (manageable with proper testing and monitoring)

---

## 📚 Documentation Requirements

**Files to Create**:
- ✅ `PHASE-2-ADVANCED-FEATURES-PLAN.md` (this file)
- ⏳ `PHASE-2-P7-CONFIDENCE-SCORING.md` (P7 detailed spec)
- ⏳ `PHASE-2-P6-NOTIFICATION-BATCHING.md` (P6 detailed spec)
- ⏳ `PHASE-2-P5-DYNAMIC-FRAMES.md` (P5 detailed spec)
- ⏳ `PHASE-2-COMPLETE.md` (completion report)

**Files to Update**:
- ⏳ `FARCASTER-BOT-ENHANCEMENT-PLAN-PART-3.md` (update Phase 2 status)
- ⏳ `CURRENT-TASK.md` (track active work)
- ⏳ `FOUNDATION-REBUILD-ROADMAP.md` (update roadmap)

**File Headers** (per farcaster.instructions.md):
```typescript
/**
 * #file: lib/notification-batching.ts
 * 
 * PHASE: Phase 2 Advanced Features (December 16, 2025)
 * DATE: December 16, 2025
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (Chain ID 8453)
 * 
 * FEATURES:
 * - Quiet hours respect (notification_preferences.quiet_hours_enabled)
 * - Daily digest system (batch low-priority notifications)
 * - Smart throttling (max 3 notifications per hour)
 * - Batch queue management (notification_batch_queue table)
 * - Priority-based handling (critical always sent immediately)
 * 
 * TODO:
 * - [ ] Add A/B testing for digest vs immediate
 * - [ ] Monitor notification delivery SLA
 * - [ ] Add user feedback collection
 * - [ ] Optimize batch queue cleanup
 * 
 * REFERENCE DOCUMENTATION:
 * - FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md (Section 6: Enhancements)
 * - PHASE-2-ADVANCED-FEATURES-PLAN.md (P6: Notification Batching)
 * - docs/setup/NOTIFICATION-SYSTEM.md
 * 
 * CRITICAL ISSUES & WARNINGS:
 * - NEVER batch critical priority notifications (streak breaks, XP milestones)
 * - Ensure digest sent within 1 hour of quiet hours end (SLA)
 * - Monitor notification opt-out rate (target: <10%)
 * 
 * SUGGESTIONS & OPTIMIZATIONS:
 * - Consider ML-based priority scoring (future enhancement)
 * - Add notification preview in digest (not just counts)
 * - Support per-category batching preferences
 * 
 * AVOID (from farcaster.instructions.md):
 * - NO emojis in code (use icons from components/icons/)
 * - NO mixing old and new patterns
 * - NO creating new files without checking for duplicates
 * - NO missing API security layers (10-layer pattern)
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - Update CURRENT-TASK.md after completing each feature
 * - Run all tests (target 95%+ pass rate)
 * - Zero TypeScript compilation errors
 * - Professional headers on all responses
 * 
 * CHANGE LOG:
 * - 2025-12-16: Initial implementation (quiet hours + digest)
 */
```

---

## 🎯 Next Steps

**Immediate Actions**:
1. ✅ Review Phase 2 plan with team/user
2. ⏳ Get user approval to proceed with P7 first
3. ⏳ Create detailed P7 spec document
4. ⏳ Set up test framework for confidence scoring
5. ⏳ Begin P7 implementation (6 hours estimated)

**Before Starting Each Feature**:
- [ ] Read relevant section in FARCASTER-BOT-ENHANCEMENT-PLAN-PART-2.md
- [ ] Create detailed spec document (P7/P6/P5 specific)
- [ ] Design test cases (aim for 95%+ coverage)
- [ ] Set up test data and mocks
- [ ] Review farcaster.instructions.md requirements

**After Completing Each Feature**:
- [ ] Run full test suite (all tests passing)
- [ ] Manual QA with real user scenarios
- [ ] Update CURRENT-TASK.md with completion status
- [ ] Document any issues or edge cases discovered
- [ ] Deploy to staging for soak testing

---

## 🤔 Questions for User

1. **Priority Order**: Should we implement P7 → P6 → P5 (as planned), or different order based on user needs?

2. **Notification Batching**: What's the preferred default for new users - immediate notifications or digest mode?

3. **Clarifying Questions**: Is it acceptable for bot to ask clarifying questions 3-5% of the time, or should we set lower threshold?

4. **Testing Scope**: Should we do A/B testing for Phase 2 features (50% rollout), or full deployment after QA?

5. **Cron Jobs**: only github Cron 
---

**Status**: ✅ **PLANNING COMPLETE** - Ready for user approval to begin Phase 2  
**Next Action**: Get user confirmation on priority order and begin P7 implementation

