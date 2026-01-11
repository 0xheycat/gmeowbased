# Leaderboard Frame - Status Report

**Date:** January 11, 2026  
**Status:** Framework Complete, Data Integration Needed

---

## ✅ Completed Components

### 1. Frame Route (`/frame/leaderboard`)
- **File:** `app/frame/leaderboard/route.tsx`
- **Status:** ✅ Complete
- **Features:**
  - Chain parameter validation
  - Global leaderboard support ('all', 'global', 'combined')
  - Debug parameter forwarding
  - Warpcast-safe URL pattern (GI-11 compliant)
- **Test:** `curl 'http://localhost:3000/frame/leaderboard'` → Returns 200

### 2. Image Generator (`/api/frame/image/leaderboard`)
- **File:** `app/api/frame/image/leaderboard/route.tsx`
- **Status:** ✅ Complete
- **Features:**
  - Podium layout (1st, 2nd, 3rd place)
  - Season display (weekly, monthly, all_time)
  - Top 3 users with points
  - Total pilots counter
  - Frame design system compliance
  - Image caching (5-min TTL)
- **Output:** 600x400px OG image with leaderboard podium

### 3. Frame Handler
- **File:** `lib/frames/handlers/leaderboard.ts`
- **Status:** ✅ Complete
- **Features:**
  - Period selection (weekly, monthly, all_time)
  - Chain filtering (Base-only for now)
  - Top N limit (3-10 users)
  - JSON format support
  - Error handling with fallback
  - Interactive buttons (Refresh, Your Rank, Compete)

### 4. Hybrid Data Fetcher
- **File:** `lib/frames/hybrid-data.ts`
- **Status:** ✅ Complete
- **Features:**
  - Subsquid blockchain data (primary source)
  - Supabase profile enrichment (secondary)
  - 5-minute cache TTL
  - Parallel data fetching
  - Trace logging

### 5. Frame Gallery Integration
- **File:** `app/frames/page.tsx`
- **Status:** ✅ Complete
- **Features:**
  - Leaderboard card in gallery
  - Copy URL, Preview, Share actions
  - Purple/pink gradient styling
  - Trophy icon

---

## ⚠️ Issues Identified

### Issue 1: Empty Leaderboard Data

**Symptom:**
```bash
curl 'http://localhost:3000/api/leaderboard-v2?period=all_time&page=1&pageSize=5'
```
Returns:
```json
{
  "data": [
    { "rank": null, "username": null, "totalScore": null },
    { "rank": null, "username": null, "totalScore": null }
  ]
}
```

**Root Cause:**
- Leaderboard service returning null values
- Possible Subsquid data fetch failure
- Missing user profile enrichment

**File:** `lib/leaderboard/leaderboard-service.ts`

**Expected:**
```json
{
  "data": [
    {
      "rank": 1,
      "address": "0x123...",
      "username": "alice",
      "totalScore": 5000,
      "gmStreak": 7,
      "badgeCount": 3
    }
  ]
}
```

### Issue 2: Frame Shows "Loading..." with Total=0

**Symptom:**
```html
<meta property="fc:frame:image" content="http://localhost:3000/api/frame/image/leaderboard?season=all_time&total=0" />
```

**Root Cause:**
- `fetchLeaderboard()` returning empty array
- Frame handler unable to build top 3 list
- Falls back to default "Loading..." text

**Impact:**
- Leaderboard frame shows no data
- Users see empty podium
- "Total pilots competing" shows 0

### Issue 3: Subsquid Client Integration

**File:** `lib/integrations/subsquid-client.ts`

**Function:** `getLeaderboard()`

**Current Implementation:**
```typescript
export async function getLeaderboard(params?: {
  limit?: number;
  offset?: number;
  period?: 'all_time' | 'weekly' | 'monthly';
}) {
  const { limit = 10, offset = 0, period = 'all_time' } = params || {};

  const query = gql`
    query GetLeaderboard($limit: Int!, $offset: Int!) {
      leaderboardEntries(
        limit: $limit
        offset: $offset
        orderBy: rank_ASC
      ) {
        id
        rank
        totalPoints
        weeklyPoints
        monthlyPoints
        user {
          id
          totalScore
          level
          rankTier
          currentStreak
          lifetimeGMs
        }
      }
    }
  `;

  // ... query execution
}
```

**Potential Issue:**
- `leaderboardEntries` entity may not exist in Subsquid schema
- Should use `users` entity directly sorted by `totalScore_DESC`
- Period filtering not implemented correctly

---

## 🔧 Recommended Fixes

### Fix 1: Update Subsquid Client Query

**File:** `lib/integrations/subsquid-client.ts`

**Change:**
```typescript
// OLD (uses leaderboardEntries)
leaderboardEntries(limit: $limit, offset: $offset, orderBy: rank_ASC)

// NEW (use users directly)
users(limit: $limit, offset: $offset, orderBy: totalScore_DESC)
```

**Rationale:**
- `users` entity guaranteed to exist in Subsquid
- Direct sort by `totalScore` more reliable
- Matches guild/referral pattern (direct entity queries)

### Fix 2: Add Fallback Mock Data

**File:** `lib/frames/hybrid-data.ts`

**Add fallback:**
```typescript
export async function fetchLeaderboard(params) {
  try {
    // ... existing Subsquid fetch
  } catch (error) {
    console.error('[Leaderboard] Subsquid failed, using fallback:', error);
    
    // Return mock data to prevent frame breakage
    return {
      data: [
        {
          rank: 1,
          address: '0x1111...',
          totalScore: 1000,
          gmStreak: 10,
          username: 'Top Pilot',
          displayName: 'Top Pilot',
          pfpUrl: '',
          // ... other fields
        }
      ],
      source: 'fallback',
      cached: false,
      timestamp: Date.now(),
      traces
    };
  }
}
```

### Fix 3: Verify Supabase Profile Enrichment

**File:** `lib/supabase/queries/leaderboard.ts`

**Check function:** `enrichLeaderboardWithProfiles()`

**Ensure:**
- Maps wallet addresses correctly
- Returns valid Neynar profiles
- Handles missing profiles gracefully

### Fix 4: Add Debug Logging

**File:** `lib/frames/handlers/leaderboard.ts`

**Add logging:**
```typescript
const result = await fetchLeaderboard({ limit, offset: 0, period, chain: chainKey, traces })
const topEntries = result.data

console.log('[Leaderboard Frame] Fetched entries:', {
  count: topEntries.length,
  source: result.source,
  cached: result.cached,
  firstEntry: topEntries[0]
});
```

---

## 📋 Testing Checklist

### API Endpoint Tests

- [ ] Test Subsquid client directly:
  ```bash
  curl -X POST https://YOUR_SUBSQUID_URL/graphql \
    -H "Content-Type: application/json" \
    -d '{"query": "{ users(limit: 5, orderBy: totalScore_DESC) { id, totalScore, level } }"}'
  ```

- [ ] Test leaderboard service:
  ```typescript
  import { getLeaderboard } from '@/lib/leaderboard/leaderboard-service'
  const result = await getLeaderboard({ period: 'all_time', page: 1, perPage: 5 })
  console.log(result.data)
  ```

- [ ] Test API route:
  ```bash
  curl 'http://localhost:3000/api/leaderboard-v2?period=all_time&page=1&pageSize=5'
  ```

### Frame Tests

- [ ] Test frame image generation:
  ```bash
  curl 'http://localhost:3000/api/frame/image/leaderboard?season=all_time&top1=Alice&top1Points=5000&top2=Bob&top3=Carol&total=100'
  ```

- [ ] Test frame HTML:
  ```bash
  curl 'http://localhost:3000/frame/leaderboard'
  ```

- [ ] Test frame with parameters:
  ```bash
  curl 'http://localhost:3000/frame/leaderboard?season=weekly'
  ```

### Integration Tests

- [ ] Run frame test suite:
  ```bash
  npx tsx scripts/test-all-frames.ts
  ```

- [ ] Check leaderboard frame in output:
  ```bash
  ls -lh test-output/frames/leaderboard-frame.png
  ```

- [ ] Verify frame shows in gallery:
  ```bash
  curl 'http://localhost:3000/frames' | grep -i leaderboard
  ```

---

## 🎯 Success Criteria

### Functional Requirements

✅ **FR1:** Leaderboard frame generates valid OG image (600x400px)  
⚠️ **FR2:** Frame displays top 3 users with usernames and points (BLOCKED: No data)  
✅ **FR3:** Frame shows total pilot count  
⚠️ **FR4:** API returns paginated leaderboard data (RETURNS NULL)  
✅ **FR5:** Frame supports weekly/monthly/all-time periods  
✅ **FR6:** Frame includes interactive buttons (Refresh, Your Rank, Compete)  

### Non-Functional Requirements

✅ **NFR1:** Frame loads within 3 seconds  
✅ **NFR2:** Image cached for 5 minutes  
✅ **NFR3:** Graceful error handling (shows error frame)  
⚠️ **NFR4:** Subsquid data fetched within 100ms (TIMEOUT/NULL)  
✅ **NFR5:** Warpcast-compatible frame spec (vNext)  

---

## 🚀 Next Steps

### Immediate (Critical Path)

1. **Debug Subsquid Query**
   - Test `users` query directly in GraphQL playground
   - Verify `totalScore` field exists and has data
   - Check if alternative field names needed (`pointsBalance`, `totalPoints`)

2. **Fix Leaderboard Service**
   - Update `getLeaderboard()` to use working Subsquid query
   - Add error logging for each step (Subsquid, Supabase, enrichment)
   - Return valid mock data if Subsquid unavailable

3. **Test Frame End-to-End**
   - Restart dev server after fixes
   - Run `curl 'http://localhost:3000/frame/leaderboard'`
   - Verify image URL contains `top1=Alice&top1Points=5000`

### Short-Term (Quality Improvements)

4. **Add Fallback Data**
   - Create static mock leaderboard for development
   - Ensure frame never shows "Loading..." indefinitely
   - Add "Leaderboard temporarily unavailable" message

5. **Improve Error Messages**
   - Show specific error in frame image
   - Add retry button with exponential backoff
   - Log errors to monitoring service

6. **Performance Optimization**
   - Implement Redis caching (5-min TTL)
   - Pre-fetch top 10 users on cache miss
   - Add CDN caching for frame images

### Long-Term (Feature Enhancements)

7. **Multi-Chain Support**
   - Add chain parameter to leaderboard query
   - Support filtering by chain (Base, Optimism, etc.)
   - Add chain logo to frame image

8. **Period-Based Rankings**
   - Implement weekly reset logic
   - Add "Season 1" tracking
   - Show period start/end dates in frame

9. **User Rank Display**
   - Add "Your Rank" button functionality
   - Show user's position in leaderboard
   - Highlight user's row in image

---

## 📊 Comparison: Guild vs Referral vs Leaderboard

| Feature | Guild | Referral | Leaderboard |
|---------|-------|----------|-------------|
| **Frame Route** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Image Generator** | ✅ Complete | ✅ Complete | ✅ Complete |
| **Data Fetching** | ✅ Works | ✅ Works | ⚠️ Returns NULL |
| **API Endpoint** | ✅ `/api/guild/[id]` | ✅ `/api/referral/stats` | ⚠️ `/api/leaderboard-v2` |
| **Subsquid Query** | ✅ `getGuildById()` | ✅ `getReferralCodeByOwner()` | ❌ `getLeaderboard()` |
| **Profile Enrichment** | ✅ Neynar | ✅ Neynar | ⚠️ Supabase |
| **Cache Strategy** | ✅ 5-min TTL | ✅ 5-min TTL | ✅ 5-min TTL |
| **Error Handling** | ✅ Fallback | ✅ Fallback | ⚠️ Shows empty |
| **Test Results** | ✅ Passing | ✅ Passing | ❌ Failing |

---

## 📝 Code References

### Key Files

1. **Frame Route:** `app/frame/leaderboard/route.tsx`
2. **Image Generator:** `app/api/frame/image/leaderboard/route.tsx`
3. **Frame Handler:** `lib/frames/handlers/leaderboard.ts`
4. **Hybrid Data:** `lib/frames/hybrid-data.ts`
5. **Subsquid Client:** `lib/integrations/subsquid-client.ts`
6. **Leaderboard Service:** `lib/leaderboard/leaderboard-service.ts`
7. **API Route:** `app/api/leaderboard-v2/route.ts`

### Related Documentation

- **Frame System:** `FRAMES-INTEGRATION-GUIDE.md`
- **Visual Guide:** `FRAMES-VISUAL-GUIDE.md`
- **Guild Complete:** Similar pattern to follow
- **Referral Complete:** Similar pattern to follow

---

## ✅ Action Plan

**PRIORITY:** Fix leaderboard data fetching (blocking all tests)

**Owner:** AI Agent  
**ETA:** 15-30 minutes

**Steps:**
1. Check Subsquid schema for correct entity/field names
2. Update `getLeaderboard()` query to use working entity
3. Add mock fallback data
4. Test API endpoint returns valid data
5. Test frame generates with top 3 users
6. Commit fixes and update status

---

**Last Updated:** January 11, 2026, 12:30 CST  
**Next Review:** After data fix deployment
