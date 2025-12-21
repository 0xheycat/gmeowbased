# Guild Analytics Cache - JSONB Data Structures
**Reference Guide for Cron Implementation**

---

## Overview

The `guild_analytics_cache` table uses JSONB columns to store pre-computed time-series data for charts and analytics dashboards. This document defines the exact structure expected by the frontend.

---

## 1. `top_contributors` (JSONB Array)

**Purpose:** Top 10 guild contributors ranked by points deposited

**Structure:**
```typescript
type TopContributor = {
  address: string;          // Member wallet address
  points: number;           // Total points deposited by this member
  rank: number;             // Rank within guild (1 = top contributor)
  fid?: number;             // Optional: Farcaster FID
  username?: string;        // Optional: Display name
  avatar?: string;          // Optional: Profile picture URL
}

type TopContributors = TopContributor[];
```

**Example:**
```json
[
  {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beef",
    "points": 15000,
    "rank": 1,
    "fid": 12345,
    "username": "alice.eth",
    "avatar": "https://..."
  },
  {
    "address": "0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199",
    "points": 12000,
    "rank": 2
  },
  ...
]
```

**Calculation Logic:**
```sql
-- Aggregate guild_events by actor_address
SELECT 
  actor_address AS address,
  SUM(amount) AS points,
  ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC) AS rank
FROM guild_events
WHERE guild_id = ? 
  AND event_type = 'POINTS_DEPOSITED'
GROUP BY actor_address
ORDER BY points DESC
LIMIT 10
```

**Optional Enrichment:**
- Join with `user_profiles` on wallet → fid
- Fetch Farcaster metadata (username, avatar) from Neynar

---

## 2. `member_growth_series` (JSONB Array)

**Purpose:** Daily member count for line chart

**Structure:**
```typescript
type MemberGrowthDataPoint = {
  date: string;             // ISO 8601 date: "2025-12-21"
  count: number;            // Total members at end of this day
}

type MemberGrowthSeries = MemberGrowthDataPoint[];
```

**Example:**
```json
[
  { "date": "2025-12-01", "count": 10 },
  { "date": "2025-12-02", "count": 12 },
  { "date": "2025-12-03", "count": 15 },
  { "date": "2025-12-04", "count": 15 },
  { "date": "2025-12-05", "count": 18 },
  ...
]
```

**Calculation Logic:**
```sql
-- Cumulative member count by day
WITH daily_changes AS (
  SELECT 
    DATE(created_at) AS day,
    SUM(CASE 
      WHEN event_type = 'MEMBER_JOINED' THEN 1 
      WHEN event_type = 'MEMBER_LEFT' THEN -1 
      ELSE 0 
    END) AS net_change
  FROM guild_events
  WHERE guild_id = ?
    AND event_type IN ('MEMBER_JOINED', 'MEMBER_LEFT')
  GROUP BY DATE(created_at)
  ORDER BY day
)
SELECT 
  day AS date,
  SUM(net_change) OVER (ORDER BY day) AS count
FROM daily_changes
```

**Time Range:** Last 30 days (or since guild creation if younger)

**Frontend Usage:** Line chart showing member growth trend

---

## 3. `treasury_flow_series` (JSONB Array)

**Purpose:** Daily deposits, claims, and balance for stacked area chart

**Structure:**
```typescript
type TreasuryFlowDataPoint = {
  date: string;             // ISO 8601 date: "2025-12-21"
  deposits: number;         // Total points deposited on this day
  claims: number;           // Total points claimed on this day
  balance: number;          // Treasury balance at end of day
}

type TreasuryFlowSeries = TreasuryFlowDataPoint[];
```

**Example:**
```json
[
  { "date": "2025-12-01", "deposits": 5000, "claims": 1000, "balance": 4000 },
  { "date": "2025-12-02", "deposits": 3000, "claims": 500, "balance": 6500 },
  { "date": "2025-12-03", "deposits": 2000, "claims": 2000, "balance": 6500 },
  { "date": "2025-12-04", "deposits": 10000, "claims": 0, "balance": 16500 },
  ...
]
```

**Calculation Logic:**
```sql
-- Daily deposits and claims
WITH daily_flow AS (
  SELECT 
    DATE(created_at) AS day,
    SUM(CASE WHEN event_type = 'POINTS_DEPOSITED' THEN amount ELSE 0 END) AS deposits,
    SUM(CASE WHEN event_type = 'POINTS_CLAIMED' THEN amount ELSE 0 END) AS claims
  FROM guild_events
  WHERE guild_id = ?
    AND event_type IN ('POINTS_DEPOSITED', 'POINTS_CLAIMED')
  GROUP BY DATE(created_at)
  ORDER BY day
)
SELECT 
  day AS date,
  deposits,
  claims,
  SUM(deposits - claims) OVER (ORDER BY day) AS balance
FROM daily_flow
```

**Time Range:** Last 30 days

**Frontend Usage:** Stacked area chart showing treasury inflows/outflows

---

## 4. `activity_timeline` (JSONB Array)

**Purpose:** Daily activity breakdown for bar chart

**Structure:**
```typescript
type ActivityDataPoint = {
  date: string;             // ISO 8601 date: "2025-12-21"
  joins: number;            // New members joined
  deposits: number;         // Number of deposit transactions
  claims: number;           // Number of claim transactions
  totalEvents: number;      // Total events (optional)
}

type ActivityTimeline = ActivityDataPoint[];
```

**Example:**
```json
[
  { "date": "2025-12-01", "joins": 5, "deposits": 3, "claims": 1, "totalEvents": 9 },
  { "date": "2025-12-02", "joins": 2, "deposits": 8, "claims": 0, "totalEvents": 10 },
  { "date": "2025-12-03", "joins": 0, "deposits": 4, "claims": 2, "totalEvents": 6 },
  ...
]
```

**Calculation Logic:**
```sql
SELECT 
  DATE(created_at) AS date,
  COUNT(CASE WHEN event_type = 'MEMBER_JOINED' THEN 1 END) AS joins,
  COUNT(CASE WHEN event_type = 'POINTS_DEPOSITED' THEN 1 END) AS deposits,
  COUNT(CASE WHEN event_type = 'POINTS_CLAIMED' THEN 1 END) AS claims,
  COUNT(*) AS totalEvents
FROM guild_events
WHERE guild_id = ?
  AND DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date
```

**Time Range:** Last 30 days

**Frontend Usage:** Grouped bar chart showing daily activity breakdown

---

## 5. Growth Calculations (Numeric Columns)

### `members_7d_growth` (integer)
**Purpose:** Net change in member count over last 7 days

**Calculation:**
```sql
SELECT COUNT(*) 
FROM guild_events 
WHERE guild_id = ?
  AND event_type IN ('MEMBER_JOINED', 'MEMBER_LEFT')
  AND created_at >= NOW() - INTERVAL '7 days'
  AND (
    CASE 
      WHEN event_type = 'MEMBER_JOINED' THEN 1
      WHEN event_type = 'MEMBER_LEFT' THEN -1
    END
  )
```

**Example:** `+5` (5 new net members in last 7 days)

---

### `points_7d_growth` (integer)
**Purpose:** Net change in total deposits over last 7 days

**Calculation:**
```sql
SELECT COALESCE(SUM(amount), 0)
FROM guild_events
WHERE guild_id = ?
  AND event_type = 'POINTS_DEPOSITED'
  AND created_at >= NOW() - INTERVAL '7 days'
```

**Example:** `+15000` (15,000 points deposited in last 7 days)

---

### `treasury_7d_growth` (integer)
**Purpose:** Net change in treasury balance over last 7 days (deposits - claims)

**Calculation:**
```sql
SELECT 
  COALESCE(SUM(CASE WHEN event_type = 'POINTS_DEPOSITED' THEN amount ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN event_type = 'POINTS_CLAIMED' THEN amount ELSE 0 END), 0)
FROM guild_events
WHERE guild_id = ?
  AND event_type IN ('POINTS_DEPOSITED', 'POINTS_CLAIMED')
  AND created_at >= NOW() - INTERVAL '7 days'
```

**Example:** `+8000` (treasury grew by 8,000 points in last 7 days)

---

## Implementation Example (TypeScript)

```typescript
// app/api/cron/sync-guilds/route.ts

import { createClient } from '@/lib/supabase/server';

async function computeGuildAnalytics(guildId: string) {
  const supabase = createClient();
  
  // Fetch all guild events
  const { data: events } = await supabase
    .from('guild_events')
    .select('*')
    .eq('guild_id', guildId)
    .order('created_at');

  if (!events) return null;

  // 1. Top Contributors
  const contributorMap = new Map<string, number>();
  events.forEach(e => {
    if (e.event_type === 'POINTS_DEPOSITED' && e.amount) {
      contributorMap.set(
        e.actor_address, 
        (contributorMap.get(e.actor_address) || 0) + e.amount
      );
    }
  });
  
  const top_contributors = Array.from(contributorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([address, points], idx) => ({
      address,
      points,
      rank: idx + 1
    }));

  // 2. Member Growth Series
  const memberCountByDay = new Map<string, number>();
  let runningTotal = 0;
  
  events
    .filter(e => ['MEMBER_JOINED', 'MEMBER_LEFT'].includes(e.event_type))
    .forEach(e => {
      const date = e.created_at.split('T')[0]; // "2025-12-21"
      const delta = e.event_type === 'MEMBER_JOINED' ? 1 : -1;
      runningTotal += delta;
      memberCountByDay.set(date, runningTotal);
    });
  
  const member_growth_series = Array.from(memberCountByDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 3. Treasury Flow Series
  const treasuryByDay = new Map<string, { deposits: number; claims: number }>();
  
  events
    .filter(e => ['POINTS_DEPOSITED', 'POINTS_CLAIMED'].includes(e.event_type))
    .forEach(e => {
      const date = e.created_at.split('T')[0];
      const existing = treasuryByDay.get(date) || { deposits: 0, claims: 0 };
      
      if (e.event_type === 'POINTS_DEPOSITED') {
        existing.deposits += e.amount || 0;
      } else if (e.event_type === 'POINTS_CLAIMED') {
        existing.claims += e.amount || 0;
      }
      
      treasuryByDay.set(date, existing);
    });
  
  let balance = 0;
  const treasury_flow_series = Array.from(treasuryByDay.entries())
    .map(([date, { deposits, claims }]) => {
      balance += deposits - claims;
      return { date, deposits, claims, balance };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // 4. Activity Timeline
  const activityByDay = new Map<string, { joins: number; deposits: number; claims: number }>();
  
  events.forEach(e => {
    const date = e.created_at.split('T')[0];
    const existing = activityByDay.get(date) || { joins: 0, deposits: 0, claims: 0 };
    
    if (e.event_type === 'MEMBER_JOINED') existing.joins++;
    if (e.event_type === 'POINTS_DEPOSITED') existing.deposits++;
    if (e.event_type === 'POINTS_CLAIMED') existing.claims++;
    
    activityByDay.set(date, existing);
  });
  
  const activity_timeline = Array.from(activityByDay.entries())
    .map(([date, { joins, deposits, claims }]) => ({
      date,
      joins,
      deposits,
      claims,
      totalEvents: joins + deposits + claims
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 5. Growth Metrics
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const members_7d_growth = events
    .filter(e => 
      ['MEMBER_JOINED', 'MEMBER_LEFT'].includes(e.event_type) && 
      e.created_at >= sevenDaysAgo
    )
    .reduce((sum, e) => sum + (e.event_type === 'MEMBER_JOINED' ? 1 : -1), 0);
  
  const points_7d_growth = events
    .filter(e => e.event_type === 'POINTS_DEPOSITED' && e.created_at >= sevenDaysAgo)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const treasury_7d_growth = events
    .filter(e => 
      ['POINTS_DEPOSITED', 'POINTS_CLAIMED'].includes(e.event_type) && 
      e.created_at >= sevenDaysAgo
    )
    .reduce((sum, e) => {
      const delta = e.event_type === 'POINTS_DEPOSITED' ? (e.amount || 0) : -(e.amount || 0);
      return sum + delta;
    }, 0);

  // 6. Aggregate Totals
  const total_members = Math.max(0, runningTotal);
  const total_deposits = events
    .filter(e => e.event_type === 'POINTS_DEPOSITED')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const total_claims = events
    .filter(e => e.event_type === 'POINTS_CLAIMED')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const treasury_balance = total_deposits - total_claims;
  const avg_points_per_member = total_members > 0 ? Math.floor(total_deposits / total_members) : 0;

  // Upsert to cache
  await supabase
    .from('guild_analytics_cache')
    .upsert({
      guild_id: guildId,
      total_members,
      total_deposits,
      total_claims,
      treasury_balance,
      avg_points_per_member,
      members_7d_growth,
      points_7d_growth,
      treasury_7d_growth,
      top_contributors: JSON.stringify(top_contributors),
      member_growth_series: JSON.stringify(member_growth_series),
      treasury_flow_series: JSON.stringify(treasury_flow_series),
      activity_timeline: JSON.stringify(activity_timeline),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
}
```

---

## Frontend Consumption Example

```typescript
// app/api/guild/[guildId]/analytics/route.ts

export async function GET(req: Request, { params }: { params: { guildId: string } }) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('guild_analytics_cache')
    .select('*')
    .eq('guild_id', params.guildId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Analytics not found' }, { status: 404 });
  }

  // Parse JSONB fields
  return NextResponse.json({
    guild_id: data.guild_id,
    total_members: data.total_members,
    total_deposits: data.total_deposits,
    total_claims: data.total_claims,
    treasury_balance: data.treasury_balance,
    avg_points_per_member: data.avg_points_per_member,
    growth: {
      members_7d: data.members_7d_growth,
      points_7d: data.points_7d_growth,
      treasury_7d: data.treasury_7d_growth
    },
    charts: {
      top_contributors: JSON.parse(data.top_contributors || '[]'),
      member_growth: JSON.parse(data.member_growth_series || '[]'),
      treasury_flow: JSON.parse(data.treasury_flow_series || '[]'),
      activity: JSON.parse(data.activity_timeline || '[]')
    },
    last_synced_at: data.last_synced_at
  });
}
```

---

## Performance Considerations

1. **JSONB Size Limits:**
   - Keep time-series arrays to 30-90 days max
   - Truncate old data points in cron job
   - Typical size: 1-10 KB per JSONB column

2. **Date Formatting:**
   - Use ISO 8601 dates (`YYYY-MM-DD`) for consistency
   - Frontend can easily parse with `new Date(dateStr)`

3. **Null Handling:**
   - Default empty arrays to `[]` (not `null`)
   - Frontend doesn't need null checks

4. **Sorting:**
   - Always sort time-series arrays by date ascending
   - Frontend expects chronological order

---

## Testing Checklist

- [ ] Top contributors array has max 10 items
- [ ] Member growth series is sorted by date
- [ ] Treasury flow series has cumulative balance
- [ ] Activity timeline includes all event types
- [ ] Growth metrics match 7-day window
- [ ] JSONB fields parse correctly in frontend
- [ ] Charts render without errors
- [ ] Data updates every 6 hours

---

**Next Step:** Implement this logic in `app/api/cron/sync-guilds/route.ts`
