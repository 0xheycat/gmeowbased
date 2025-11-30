# Phase 5.8: Bonus Rewards System - Viral Engagement Tracking 🚀

**Date**: November 16, 2025  
**Status**: 🟢 Ready to Start  
**Dependencies**: ✅ Phase 5.7 Complete (badge_casts table created)

---

## Overview

Implement viral engagement tracking for badge shares on Farcaster, awarding bonus XP based on cast performance (likes, recasts, replies). Users who create viral badge shares earn additional rewards, encouraging organic platform growth.

---

## Goals

1. **Track cast engagement metrics** (likes, recasts, replies) via Neynar webhooks
2. **Calculate viral bonus XP** based on engagement thresholds
3. **Update leaderboard** with viral bonus points
4. **Display viral achievements** in user profiles
5. **Create webhook endpoint** for Neynar cast event notifications

---

## Architecture

### Data Flow
```
Badge Share Cast Published (Phase 5.7)
    ↓
badge_casts table created with cast_hash
    ↓
Neynar Webhook: cast.engagement.updated
    ↓
/api/webhooks/neynar/cast-engagement (new)
    ↓
Update badge_casts metrics (likes, recasts, replies)
    ↓
Calculate viral_bonus_xp
    ↓
Award XP to user (update user_points)
    ↓
Update leaderboard
```

### XP Calculation Formula

**Viral Bonus XP** = Base multiplier × Engagement score

**Engagement Tiers**:
- 🔥 **Mega Viral** (100+ interactions): +500 XP
- ⚡ **Viral** (50-99 interactions): +250 XP
- ✨ **Popular** (20-49 interactions): +100 XP
- 💫 **Engaging** (10-19 interactions): +50 XP
- 🌟 **Active** (5-9 interactions): +25 XP

**Interaction Weight**:
- Recast: 10 points (highest value - amplifies reach)
- Like: 2 points (medium value - shows approval)
- Reply: 5 points (high value - drives conversation)

**Example Calculation**:
```typescript
// Cast with 15 recasts, 30 likes, 8 replies
const score = (15 * 10) + (30 * 2) + (8 * 5) // 150 + 60 + 40 = 250
// 250 total = Viral tier = +250 XP
```

---

## Implementation Tasks

### 1. Database Schema Updates ✅ (Already Complete)

**Table**: `badge_casts`
```sql
-- Already created in Phase 5.7:
CREATE TABLE badge_casts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  badge_id UUID NOT NULL REFERENCES user_badges(id),
  cast_hash TEXT NOT NULL UNIQUE,
  cast_url TEXT NOT NULL,
  tier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Phase 5.8 columns (ready to use):
  likes_count INTEGER DEFAULT 0,
  recasts_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  viral_bonus_xp INTEGER DEFAULT 0,
  last_metrics_update TIMESTAMPTZ
);

CREATE INDEX idx_badge_casts_cast_hash ON badge_casts(cast_hash);
CREATE INDEX idx_badge_casts_fid ON badge_casts(fid);
```

### 2. Neynar Webhook Integration (NEW)

**Endpoint**: `/app/api/webhooks/neynar/cast-engagement/route.ts`

**Features**:
- Verify Neynar webhook signature (security)
- Parse cast engagement payload
- Update badge_casts metrics
- Calculate and award viral bonus XP
- Update user_points table
- Trigger leaderboard refresh

**Webhook Events**:
- `cast.created` (optional: track initial creation)
- `cast.engagement.updated` (primary: likes/recasts/replies)

### 3. Viral Bonus Calculator (NEW)

**File**: `/lib/viral-bonus.ts`

**Functions**:
```typescript
// Calculate engagement score
calculateEngagementScore(likes, recasts, replies): number

// Determine XP tier
getViralTier(score): { name, xp, emoji }

// Award XP to user
awardViralBonus(fid, castHash, bonusXp): Promise<void>

// Update leaderboard
refreshLeaderboardWithBonus(fid): Promise<void>
```

### 4. Analytics Events (NEW)

**File**: `/lib/analytics.ts`

**New Events**:
```typescript
type AnalyticsEvent =
  | 'viral_bonus_awarded'    // When user earns viral XP
  | 'cast_viral_milestone'   // When cast hits engagement threshold
  | 'leaderboard_rank_up'    // When viral bonus increases rank
```

### 5. Profile Display (UPDATE)

**File**: `/app/profile/[fid]/page.tsx`

**New Section**: Viral Achievements
- Total viral XP earned
- Top performing casts (by engagement)
- Viral tier badges (Mega Viral, Viral, Popular, etc.)
- Share again CTA for low-performing casts

### 6. Admin Dashboard (UPDATE)

**File**: `/components/admin/BadgeManagerPanel.tsx`

**New Tab**: "Viral Analytics"
- Top viral casts (by XP awarded)
- Engagement leaderboard
- Average engagement by tier
- Viral conversion rate (shares → viral)

---

## API Endpoints

### 1. `/api/webhooks/neynar/cast-engagement` (POST) - NEW
**Purpose**: Receive cast engagement updates from Neynar  
**Auth**: Neynar webhook signature verification  
**Payload**:
```json
{
  "type": "cast.engagement.updated",
  "data": {
    "cast_hash": "0x...",
    "likes": 45,
    "recasts": 12,
    "replies": 8,
    "timestamp": "2025-11-16T12:00:00Z"
  }
}
```
**Response**:
```json
{
  "success": true,
  "viralBonusAwarded": 100,
  "tier": "popular"
}
```

### 2. `/api/viral/stats?fid=123` (GET) - NEW
**Purpose**: Get user's viral engagement statistics  
**Response**:
```json
{
  "fid": 123,
  "totalViralXp": 850,
  "topCasts": [
    {
      "castHash": "0x...",
      "castUrl": "...",
      "likes": 45,
      "recasts": 12,
      "replies": 8,
      "bonusXp": 100,
      "tier": "popular"
    }
  ],
  "tierBreakdown": {
    "mega_viral": 1,
    "viral": 3,
    "popular": 8
  }
}
```

### 3. `/api/viral/leaderboard` (GET) - NEW
**Purpose**: Get viral XP leaderboard  
**Query Params**: `?limit=50&chain=base&season=current`  
**Response**:
```json
{
  "leaderboard": [
    {
      "fid": 123,
      "username": "heyCat",
      "totalViralXp": 1250,
      "viralCasts": 15,
      "rank": 1
    }
  ]
}
```

---

## Quality Gates

### GI-7: MCP Spec Sync ✅
- Neynar Webhook API documentation review
- Cast engagement event payload validation
- Webhook signature verification implementation

### GI-11: Frame URL Safety ✅
- Webhook endpoint uses POST only
- Signature verification prevents spoofing
- Rate limiting on webhook endpoint (100/min)

### GI-12: Frame Button Validation ✅
- Profile viral achievements use proper links
- Share again CTAs use correct frame URLs
- Leaderboard links validated

### GI-13: UI/UX Audit ✅
- Viral achievement badges (clear visual hierarchy)
- Loading states for viral stats
- Empty state for no viral casts
- Mobile-responsive viral leaderboard

---

## Testing Checklist

### Unit Tests
- [ ] `calculateEngagementScore()` with various inputs
- [ ] `getViralTier()` boundary conditions
- [ ] `awardViralBonus()` duplicate award prevention
- [ ] Webhook signature verification

### Integration Tests
- [ ] Neynar webhook payload processing
- [ ] Database update (badge_casts metrics)
- [ ] XP award (user_points update)
- [ ] Leaderboard refresh trigger

### E2E Tests
- [ ] Share badge → Cast published → Webhook received → XP awarded
- [ ] Multiple engagement updates (incremental XP)
- [ ] Profile displays viral achievements
- [ ] Leaderboard includes viral XP

---

## Security Considerations

1. **Webhook Signature Verification**
   - Validate Neynar webhook signature using HMAC-SHA256
   - Reject requests without valid signature
   - Use `NEYNAR_WEBHOOK_SECRET` from env

2. **Duplicate Award Prevention**
   - Track `last_metrics_update` timestamp
   - Only award bonus if metrics increased
   - Idempotent XP awards (no double-dipping)

3. **Rate Limiting**
   - Limit webhook endpoint to 100 requests/min
   - Prevent spam/DoS attacks
   - Use Vercel Edge rate limiting

4. **Cast Hash Validation**
   - Verify cast_hash exists in badge_casts table
   - Ensure FID owns the cast
   - Prevent unauthorized XP claims

---

## Rollout Plan

### Phase 1: Backend (Week 1)
1. Create webhook endpoint
2. Implement viral bonus calculator
3. Add database update logic
4. Deploy to staging
5. Test with Neynar webhook simulator

### Phase 2: Frontend (Week 1)
1. Add viral achievements to profile
2. Create viral leaderboard page
3. Update admin dashboard
4. Add analytics events

### Phase 3: Testing (Week 2)
1. Unit tests for all new functions
2. Integration tests with Neynar webhooks
3. E2E tests for full flow
4. Load testing (1000 webhooks/min)

### Phase 4: Production (Week 2)
1. Deploy to production
2. Register webhook with Neynar
3. Monitor for 48 hours
4. Collect metrics and iterate

---

## Success Metrics

**Engagement KPIs**:
- **Share rate**: +30% (users sharing badges)
- **Avg likes per cast**: 15+ likes
- **Viral conversion**: 10% of casts reach "Popular" tier
- **Repeat sharing**: 40% of users share 2+ badges

**Technical KPIs**:
- **Webhook latency**: <500ms processing time
- **Uptime**: 99.9% webhook endpoint availability
- **Error rate**: <0.1% failed webhook processing
- **XP accuracy**: 100% correct viral bonus awards

---

## Dependencies

**External Services**:
- ✅ Neynar API (cast engagement data)
- ✅ Neynar Webhooks (event notifications)
- ✅ Supabase (badge_casts table, user_points)

**Internal Dependencies**:
- ✅ Phase 5.7 complete (badge_casts table)
- ✅ Cast API integration (badge publishing)
- ✅ Analytics system (lib/analytics.ts)
- ✅ Leaderboard system (existing)

---

## Files to Create

### New Files (5)
1. `/app/api/webhooks/neynar/cast-engagement/route.ts` (webhook handler)
2. `/app/api/viral/stats/route.ts` (viral statistics API)
3. `/app/api/viral/leaderboard/route.ts` (viral leaderboard API)
4. `/lib/viral-bonus.ts` (calculation logic)
5. `/app/viral/leaderboard/page.tsx` (viral leaderboard UI)

### Modified Files (4)
1. `/app/profile/[fid]/page.tsx` (add viral achievements section)
2. `/components/admin/BadgeManagerPanel.tsx` (add viral analytics tab)
3. `/lib/analytics.ts` (add viral events)
4. `/docs/phase/PHASE5.8-IMPLEMENTATION.md` (this file)

---

## Estimated Timeline

**Total**: 1-2 weeks

- Backend implementation: 3 days
- Frontend implementation: 2 days
- Testing: 2 days
- Documentation: 1 day
- Deployment + monitoring: 2 days

---

## Next Steps

1. **Immediate**: Create webhook endpoint and viral bonus calculator
2. **Week 1**: Deploy backend to staging, test with Neynar
3. **Week 2**: Add frontend displays, full E2E testing
4. **Week 3**: Production deployment, monitoring

---

## Questions for Review

1. **XP Formula**: Is the engagement score weighting correct? (Recasts:10, Replies:5, Likes:2)
2. **Viral Tiers**: Should we add more granular tiers (e.g., "Super Viral" at 150+)?
3. **Time Window**: Should viral bonus decay over time (e.g., engagement after 7 days counts less)?
4. **Duplicate Shares**: Should users earn XP for sharing the same badge multiple times?
5. **Leaderboard**: Separate viral XP leaderboard or integrate with existing leaderboard?

---

**Ready to proceed?** Let me know and I'll start with the webhook endpoint and viral bonus calculator! 🚀
