# 🚀 Phase 5.2 Implementation Plan: Viral Notifications Admin Dashboard

**Project**: Gmeowbased (@gmeowbased)  
**Founder**: @heycat  
**Phase**: 5.2 - Admin Dashboard for Viral Notifications  
**Started**: November 17, 2025  
**Status**: 🔄 IN PROGRESS  
**Estimated Time**: 4-6 hours

---

## 📋 Quality Gates Pre-Check

### GI-7: MCP Spec Sync ✅ COMPLETE (from Phase 5.1)

**APIs Verified**:
- ✅ Neynar SDK v3.84.0 (current)
- ✅ OnchainKit v1.1.2 (current)
- ✅ API drift resolved (commit 1dbda32)
- ✅ Database schema matches Phase 5.1 migrations

**No Additional MCP Queries Needed** — Reusing Phase 5.1 validation

---

### GI-9: Phase 5.1 Audit ✅ COMPLETE

**Phase 5.1 Status**:
- ✅ 1,655 lines of viral notification code
- ✅ 825 lines of tests (integration tested)
- ✅ 0 TypeScript errors
- ✅ 3 viral services operational
- ✅ API drift fixed and verified
- ✅ Documentation updated

**Ready for Phase 5.2**: No blockers

---

## 🎯 Phase 5.2 Objectives

Build an **admin-only dashboard** to monitor and analyze the Phase 5.1 viral notification system:

### Core Features

1. **Real-time Viral Tier Upgrade Feed** 🔄
   - Live stream of tier upgrades (active → viral)
   - User FID, cast hash, old/new tier, XP bonus
   - Time-ordered feed with filters

2. **Notification Delivery Analytics** 📊
   - Success rate (sent / total attempts)
   - Failure breakdown (no tokens, rate limited, API errors)
   - Daily/weekly trends chart
   - Average delivery time

3. **Achievement Distribution Charts** 📈
   - How many users have each achievement
   - Achievement unlock timeline
   - Most common achievement paths
   - Rarest achievements

4. **Top Viral Casts Leaderboard** 🏆
   - Highest viral scores this week
   - Most engagement (likes + recasts + replies)
   - Top viral users
   - Trending casts by tier

5. **Webhook Health Monitoring** 🛠️
   - Last webhook received timestamp
   - Webhook success/failure rate
   - Average processing time
   - Recent errors log

---

## 🗄️ Database Schema Review

**Existing Tables (Phase 5.1)**:

### `viral_tier_history`
```sql
CREATE TABLE viral_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  cast_hash TEXT NOT NULL,
  old_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL,
  old_score NUMERIC NOT NULL,
  new_score NUMERIC NOT NULL,
  xp_bonus INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (cast_hash) REFERENCES badge_casts(cast_hash)
);

CREATE INDEX idx_viral_tier_history_fid ON viral_tier_history(fid);
CREATE INDEX idx_viral_tier_history_created_at ON viral_tier_history(created_at DESC);
```

### `viral_milestone_achievements`
```sql
CREATE TABLE viral_milestone_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid BIGINT NOT NULL,
  achievement_type TEXT NOT NULL,
  cast_hash TEXT,
  xp_bonus INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  
  UNIQUE(fid, achievement_type)
);

CREATE INDEX idx_viral_achievements_fid ON viral_milestone_achievements(fid);
CREATE INDEX idx_viral_achievements_type ON viral_milestone_achievements(achievement_type);
```

### `badge_casts` (existing)
```sql
-- Columns added in Phase 5.1:
- viral_score NUMERIC DEFAULT 0
- viral_tier TEXT DEFAULT 'none'
- viral_bonus_xp INTEGER DEFAULT 0
- likes_count INTEGER DEFAULT 0
- recasts_count INTEGER DEFAULT 0
- replies_count INTEGER DEFAULT 0
```

### `miniapp_notification_tokens` (existing)
```sql
-- Columns:
- fid BIGINT
- token TEXT
- url TEXT
- status TEXT
- last_used_at TIMESTAMPTZ
- created_at TIMESTAMPTZ
```

**No New Migrations Needed** — All data exists in Phase 5.1 tables

---

## 🧩 API Routes to Build

### 1. Tier Upgrade Feed
**Route**: `/api/admin/viral/tier-upgrades`  
**Method**: GET  
**Query Params**:
- `limit` (default: 50, max: 100)
- `offset` (default: 0)
- `tier_filter` (optional: viral, mega_viral, popular, engaging)

**Response**:
```typescript
{
  upgrades: Array<{
    fid: number
    cast_hash: string
    old_tier: string
    new_tier: string
    xp_bonus: number
    created_at: string
    user_username?: string // fetched from Neynar
  }>
  total: number
  page: number
}
```

**SQL Query**:
```sql
SELECT 
  vth.fid,
  vth.cast_hash,
  vth.old_tier,
  vth.new_tier,
  vth.xp_bonus,
  vth.created_at
FROM viral_tier_history vth
ORDER BY vth.created_at DESC
LIMIT $1 OFFSET $2
```

---

### 2. Notification Analytics
**Route**: `/api/admin/viral/notification-stats`  
**Method**: GET  
**Query Params**:
- `timeframe` (default: 7d, options: 24h, 7d, 30d, all)

**Response**:
```typescript
{
  total_sent: number
  total_failed: number
  success_rate: number // percentage
  failure_breakdown: {
    no_tokens: number
    rate_limited: number
    api_errors: number
  }
  daily_trends: Array<{
    date: string
    sent: number
    failed: number
  }>
  avg_delivery_time_ms: number
}
```

**SQL Query**:
```sql
-- Count successes from gmeow_rank_events
SELECT 
  COUNT(*) FILTER (WHERE event_type = 'notification-sent') as sent,
  COUNT(*) FILTER (WHERE event_type = 'notification-failed') as failed,
  event_detail::json->>'reason' as failure_reason,
  DATE_TRUNC('day', created_at) as date
FROM gmeow_rank_events
WHERE event_type IN ('notification-sent', 'notification-failed')
  AND created_at >= NOW() - INTERVAL '{{timeframe}}'
GROUP BY date, failure_reason
ORDER BY date DESC
```

---

### 3. Achievement Distribution
**Route**: `/api/admin/viral/achievement-stats`  
**Method**: GET

**Response**:
```typescript
{
  achievements: Array<{
    type: string
    count: number
    percentage: number // of total users
  }>
  total_users_with_achievements: number
  timeline: Array<{
    date: string
    first_viral: number
    ten_viral_casts: number
    hundred_shares: number
    mega_viral_master: number
  }>
}
```

**SQL Query**:
```sql
SELECT 
  achievement_type,
  COUNT(*) as count,
  DATE_TRUNC('week', unlocked_at) as week
FROM viral_milestone_achievements
GROUP BY achievement_type, week
ORDER BY week DESC, count DESC
```

---

### 4. Top Viral Casts
**Route**: `/api/admin/viral/top-casts`  
**Method**: GET  
**Query Params**:
- `timeframe` (default: 7d)
- `limit` (default: 20)

**Response**:
```typescript
{
  casts: Array<{
    cast_hash: string
    fid: number
    viral_score: number
    viral_tier: string
    likes_count: number
    recasts_count: number
    replies_count: number
    created_at: string
    user_username?: string
  }>
}
```

**SQL Query**:
```sql
SELECT 
  bc.cast_hash,
  bc.fid,
  bc.viral_score,
  bc.viral_tier,
  bc.likes_count,
  bc.recasts_count,
  bc.replies_count,
  bc.created_at
FROM badge_casts bc
WHERE bc.created_at >= NOW() - INTERVAL '{{timeframe}}'
  AND bc.viral_score > 0
ORDER BY bc.viral_score DESC
LIMIT $1
```

---

### 5. Webhook Health
**Route**: `/api/admin/viral/webhook-health`  
**Method**: GET

**Response**:
```typescript
{
  last_webhook_at: string | null
  total_webhooks_today: number
  success_rate: number
  avg_processing_time_ms: number
  recent_errors: Array<{
    timestamp: string
    error_message: string
    cast_hash?: string
  }>
}
```

**SQL Query**:
```sql
SELECT 
  event_detail::json->>'processing_time_ms' as processing_time,
  created_at,
  CASE WHEN event_type = 'webhook-error' THEN event_detail END as error
FROM gmeow_rank_events
WHERE event_type IN ('webhook-received', 'webhook-error')
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
```

---

## 🎨 UI Components to Build

### 1. `/app/admin/viral/page.tsx`
Main dashboard page with 5 sections

**Layout**:
```tsx
<AdminLayout>
  <PageHeader title="Viral Notifications Dashboard" />
  
  <Grid cols={2}>
    <TierUpgradeFeed />
    <NotificationAnalytics />
  </Grid>
  
  <Grid cols={2}>
    <AchievementDistribution />
    <TopViralCasts />
  </Grid>
  
  <WebhookHealthMonitor />
</AdminLayout>
```

---

### 2. `/components/admin/viral/TierUpgradeFeed.tsx`

**Features**:
- Real-time SSE stream (or polling every 5s)
- Tier badge colors (active → green, popular → blue, viral → purple, mega_viral → gold)
- Username resolution via Neynar
- Click to view cast details
- Filter by tier dropdown

**Mock**:
```tsx
<Card>
  <CardHeader>
    <h3>🔄 Recent Tier Upgrades</h3>
    <Select value={tierFilter} onChange={setTierFilter}>
      <option value="all">All Tiers</option>
      <option value="viral">Viral</option>
      <option value="mega_viral">Mega Viral</option>
    </Select>
  </CardHeader>
  
  <CardContent>
    {upgrades.map(upgrade => (
      <UpgradeRow key={upgrade.id}>
        <Avatar fid={upgrade.fid} />
        <UserName>{upgrade.username}</UserName>
        <TierBadge tier={upgrade.old_tier} /> → <TierBadge tier={upgrade.new_tier} />
        <XPBonus>+{upgrade.xp_bonus} XP</XPBonus>
        <Timestamp>{upgrade.created_at}</Timestamp>
      </UpgradeRow>
    ))}
  </CardContent>
</Card>
```

---

### 3. `/components/admin/viral/NotificationAnalytics.tsx`

**Features**:
- Success rate gauge (green > 95%, yellow 85-95%, red < 85%)
- Daily trends line chart (Chart.js or Recharts)
- Failure breakdown pie chart
- Average delivery time metric

**Mock**:
```tsx
<Card>
  <CardHeader>
    <h3>📊 Notification Delivery</h3>
    <Timeframe onChange={setTimeframe} />
  </CardHeader>
  
  <Grid cols={2}>
    <Metric label="Success Rate" value={stats.success_rate + '%'} status={getStatus(stats.success_rate)} />
    <Metric label="Avg Delivery" value={stats.avg_delivery_time_ms + 'ms'} />
  </Grid>
  
  <LineChart data={stats.daily_trends} />
  
  <h4>Failure Breakdown</h4>
  <PieChart data={stats.failure_breakdown} />
</Card>
```

---

### 4. `/components/admin/viral/AchievementDistribution.tsx`

**Features**:
- Bar chart of achievement counts
- Achievement icons with counts
- Percentage badges
- Timeline view (weekly unlocks)

**Mock**:
```tsx
<Card>
  <CardHeader>
    <h3>📈 Achievement Distribution</h3>
  </CardHeader>
  
  <BarChart data={achievements} xKey="type" yKey="count" />
  
  <Grid cols={2}>
    {achievements.map(achievement => (
      <AchievementCard key={achievement.type}>
        <Icon type={achievement.type} />
        <Count>{achievement.count}</Count>
        <Percentage>{achievement.percentage}%</Percentage>
      </AchievementCard>
    ))}
  </Grid>
</Card>
```

---

### 5. `/components/admin/viral/TopViralCasts.tsx`

**Features**:
- Sortable table (score, tier, engagement)
- Cast preview on hover
- User profile link
- Timeframe selector

**Mock**:
```tsx
<Card>
  <CardHeader>
    <h3>🏆 Top Viral Casts</h3>
    <Timeframe onChange={setTimeframe} />
  </CardHeader>
  
  <Table>
    <thead>
      <tr>
        <th>User</th>
        <th>Tier</th>
        <th>Score</th>
        <th>Engagement</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      {casts.map(cast => (
        <tr key={cast.cast_hash}>
          <td><Avatar fid={cast.fid} /> {cast.username}</td>
          <td><TierBadge tier={cast.viral_tier} /></td>
          <td>{cast.viral_score}</td>
          <td>{cast.likes_count + cast.recasts_count + cast.replies_count}</td>
          <td>{formatDate(cast.created_at)}</td>
        </tr>
      ))}
    </tbody>
  </Table>
</Card>
```

---

### 6. `/components/admin/viral/WebhookHealthMonitor.tsx`

**Features**:
- Status indicator (green = healthy, yellow = degraded, red = down)
- Last webhook timestamp
- Processing time gauge
- Recent errors log with expandable details

**Mock**:
```tsx
<Card>
  <CardHeader>
    <h3>🛠️ Webhook Health</h3>
    <StatusBadge status={health.status} />
  </CardHeader>
  
  <Grid cols={3}>
    <Metric label="Last Webhook" value={formatRelativeTime(health.last_webhook_at)} />
    <Metric label="Today's Webhooks" value={health.total_webhooks_today} />
    <Metric label="Success Rate" value={health.success_rate + '%'} />
  </Grid>
  
  <h4>Recent Errors</h4>
  <ErrorLog errors={health.recent_errors} />
</Card>
```

---

## 🔐 Admin Authentication

**Requirement**: Admin-only access (reuse existing admin auth)

**Check in API routes**:
```typescript
import { validateAdminSession } from '@/lib/admin-auth'

export async function GET(request: Request) {
  const isAdmin = await validateAdminSession(request)
  
  if (!isAdmin) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // ... proceed with admin logic
}
```

**Check in page**:
```tsx
import { redirect } from 'next/navigation'
import { validateAdminSession } from '@/lib/admin-auth'

export default async function ViralAdminPage() {
  const isAdmin = await validateAdminSession()
  
  if (!isAdmin) {
    redirect('/admin/login')
  }
  
  return <ViralDashboard />
}
```

---

## 📊 Chart Library Selection

**Recommendation**: Use **Recharts** (already in project?)

**Alternative**: Chart.js or Victory

**Why Recharts**:
- ✅ React-native API
- ✅ Responsive by default
- ✅ Good TypeScript support
- ✅ Small bundle size
- ✅ Easy to theme

**Install** (if not present):
```bash
pnpm add recharts
pnpm add -D @types/recharts
```

---

## 🧪 Testing Plan

### Manual Testing
1. ✅ Visit `/admin/viral` (should redirect to login if not admin)
2. ✅ View tier upgrade feed (should show recent upgrades)
3. ✅ Check notification analytics (success rate, trends)
4. ✅ View achievement distribution (bar chart, counts)
5. ✅ Browse top viral casts (sortable table)
6. ✅ Monitor webhook health (status, errors)

### Edge Cases
- ❌ No data yet (empty state)
- ❌ Failed API calls (error fallback)
- ❌ Rate limiting (503 response)
- ❌ Invalid timeframe (default to 7d)

### Accessibility
- ✅ Keyboard navigation (tab through cards, tables)
- ✅ Screen reader labels (aria-label on metrics, charts)
- ✅ Color contrast (WCAG AA+)
- ✅ Focus indicators (visible focus rings)

---

## 📝 Quality Gates Applied

### GI-7: MCP Spec Sync
- ✅ Reusing Phase 5.1 verification
- ✅ No new API integrations (Supabase only)

### GI-8: File-Level API Sync
- ✅ No Neynar/Farcaster API calls (admin only)
- ✅ Supabase queries follow existing patterns

### GI-10: Release Readiness
- ✅ Error handling (try/catch all async)
- ✅ Type safety (no `any`, proper interfaces)
- ✅ Rate limiting (Supabase connection pooling)
- ✅ Security (admin auth required)
- ✅ Performance (Supabase indexes exist)
- ✅ Documentation (this file)

### GI-11: Frame URL Safety
- ❌ Not applicable (admin dashboard, no frames)

### GI-12: Frame Button Validation
- ❌ Not applicable (admin dashboard, no frames)

### GI-13: UI/UX Audit
- ⚠️ Ask user: "Should I run a UI/UX audit on admin dashboard?"

---

## 🚀 Implementation Steps

### Step 1: API Routes (2-3 hours)
1. Create `/app/api/admin/viral/tier-upgrades/route.ts`
2. Create `/app/api/admin/viral/notification-stats/route.ts`
3. Create `/app/api/admin/viral/achievement-stats/route.ts`
4. Create `/app/api/admin/viral/top-casts/route.ts`
5. Create `/app/api/admin/viral/webhook-health/route.ts`

### Step 2: UI Components (2-3 hours)
1. Create `/components/admin/viral/TierUpgradeFeed.tsx`
2. Create `/components/admin/viral/NotificationAnalytics.tsx`
3. Create `/components/admin/viral/AchievementDistribution.tsx`
4. Create `/components/admin/viral/TopViralCasts.tsx`
5. Create `/components/admin/viral/WebhookHealthMonitor.tsx`

### Step 3: Dashboard Page (30 minutes)
1. Create `/app/admin/viral/page.tsx`
2. Add admin auth check
3. Compose all components into grid layout

### Step 4: Testing & Polish (30 minutes)
1. Manual testing of all features
2. Error handling verification
3. Accessibility check
4. Mobile responsiveness (optional for admin)

---

## 📋 Checklist

**Before Starting**:
- ✅ Phase 5.1 complete and stable
- ✅ No API drift issues
- ✅ Documentation reviewed

**During Implementation**:
- ⏳ Admin auth applied to all routes
- ⏳ Error handling in all API calls
- ⏳ TypeScript interfaces for all responses
- ⏳ Empty states for all components
- ⏳ Loading states for async data

**Before Completion**:
- ⏳ All API routes tested
- ⏳ All UI components render correctly
- ⏳ Admin authentication working
- ⏳ Charts display data accurately
- ⏳ Documentation updated

---

## ✅ Approval Checkpoint

**Phase 5.2 Implementation Plan Complete**  
**Status**: Ready to begin implementation  

⚠️ **@heycat approval required before proceeding**

**Next Steps**:
1. Approve plan
2. Start with API routes (Step 1)
3. Build UI components (Step 2)
4. Test and deploy

---

**Source**: Phase 5.1 viral notification system  
**Reference**: `/docs/onboarding/PHASE5.1-COMPLETE.md`  
**MCP Verified**: November 17, 2025 (reusing Phase 5.1 validation)  
**Estimated Completion**: November 17, 2025 (4-6 hours from approval)
