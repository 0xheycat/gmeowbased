# Phase 1 & 2 Migration - Testing Guide
**Date**: January 2, 2026  
**Dev Server**: http://localhost:3000  
**Status**: ✅ Ready for testing

---

## 🚀 Quick Start

The dev server is already running on **http://localhost:3000**. I've opened the leaderboard page in the browser for you.

### Test Pages in This Order:

1. **Leaderboard** (Phase 1) - Currently open
2. **Dashboard** (Phase 2)
3. **Profile** (Phase 2)

---

## 📋 Test 1: Leaderboard Page (Phase 1)

**URL**: http://localhost:3000/leaderboard

### What to Check:

✅ **Table Loads**
- [ ] Leaderboard table displays user data
- [ ] Rank column shows numbers (1, 2, 3, ...)
- [ ] Address/FID column shows wallet addresses or Farcaster IDs
- [ ] Level column shows numbers from GraphQL
- [ ] Total Score column shows numbers from GraphQL

✅ **TierBadge Component**
- [ ] Colored tier badges display (Bronze, Silver, Gold, etc.)
- [ ] Tier number matches user's rank tier (0-11)
- [ ] Badge has proper styling and colors

✅ **Offline Columns Removed**
- [ ] ❌ No "Quest Points" column (removed)
- [ ] ❌ No "Guild Bonus" column (removed)
- [ ] ❌ No "Referrals" column (removed)
- [ ] ❌ No "Viral XP" column (removed)
- [ ] ❌ No "Badge Prestige" column (removed)

✅ **Score Details Modal**
- [ ] "View Details" button appears on each row
- [ ] Click "View Details" → Modal opens
- [ ] Modal shows score breakdown:
  - GM Points
  - Viral Points
  - Quest Points
  - Guild Points
  - Referral Points
- [ ] Close modal works

### How to Test:

1. **Open DevTools** (F12 or Right-click → Inspect)
2. Go to **Network tab**
3. Filter by **"graphql"**
4. Refresh the page
5. Look for **GET_LEADERBOARD** query
6. Check query time: Should be **< 100ms** ✅

**Expected GraphQL Request**:
```
POST https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql
```

---

## 📋 Test 2: Dashboard Page (Phase 2)

**URL**: http://localhost:3000/dashboard

### What to Check:

✅ **Navigate to "GM & Stats" Tab**
- [ ] Click the "GM & Stats" tab
- [ ] Tab switches successfully

✅ **DashboardStatsWidget Component**
- [ ] Total Score displays (number)
- [ ] Level displays (number)
- [ ] Rank Tier displays (tier badge or number)
- [ ] Multiplier displays (percentage, e.g., "1.4x")

✅ **LevelProgress Component**
- [ ] Current level shown (e.g., "Level 3")
- [ ] XP progress bar displays
- [ ] Shows "X / Y XP to next level"
- [ ] Progress bar fills proportionally

✅ **TierProgress Component**
- [ ] Current tier badge shown
- [ ] Points progress to next tier
- [ ] Shows "X / Y points to rank up"
- [ ] Progress indicator displays

✅ **RecentActivity Component**
- [ ] Shows recent level ups (if any)
- [ ] Shows recent rank ups (if any)
- [ ] Timestamps display correctly
- [ ] Events ordered by most recent first

### How to Test:

1. **Open DevTools** → **Network tab**
2. Filter by **"graphql"**
3. Navigate to "GM & Stats" tab
4. Look for these queries:
   - **GET_USER_STATS** (for widgets)
   - **GET_LEVEL_UPS** (for recent activity)
   - **GET_RANK_UPS** (for recent activity)
5. Check query times: All should be **< 100ms** ✅

### Check Console for Errors:

1. Open **Console tab** in DevTools
2. Look for:
   - ❌ No GraphQL query errors
   - ❌ No "Cannot read property" errors
   - ❌ No Apollo Client errors
   - ✅ You may see pre-existing API route warnings (not from migration)

---

## 📋 Test 3: Profile Page (Phase 2)

**URL**: http://localhost:3000/profile

### What to Check:

✅ **ProfileStats Component**
- [ ] Total Score displays
- [ ] Level displays
- [ ] Tier badge displays
- [ ] Multiplier displays
- [ ] Viral Points displays
- [ ] Quest Points displays
- [ ] Current streak displays
- [ ] Lifetime GMs displays

✅ **Data Accuracy**
- [ ] Scores match dashboard
- [ ] Level matches dashboard
- [ ] Tier matches dashboard
- [ ] All data comes from GraphQL (check Network tab)

✅ **Supabase Data Still Works**
- [ ] Profile avatar loads (Supabase)
- [ ] Display name shows (Supabase)
- [ ] Bio displays (Supabase)
- [ ] Social links work (Supabase)

### How to Test:

1. **Open DevTools** → **Network tab**
2. Filter by **"graphql"**
3. Refresh profile page
4. Look for **GET_USER_STATS** query
5. Check response includes your scoring data

---

## 🔍 Performance Testing

### GraphQL Query Performance

Open **Network tab** → Filter by **"graphql"**

**Expected Times**:
- GET_LEADERBOARD: **< 100ms** ✅
- GET_USER_STATS: **< 100ms** ✅
- GET_LEVEL_UPS: **< 100ms** ✅
- GET_RANK_UPS: **< 100ms** ✅

**Record Actual Times**:
```
GET_LEADERBOARD: ___ ms
GET_USER_STATS: ___ ms
GET_LEVEL_UPS: ___ ms
GET_RANK_UPS: ___ ms
```

### Page Load Performance

1. Open **DevTools** → **Lighthouse tab**
2. Click **"Analyze page load"**
3. Check metrics:
   - **LCP** (Largest Contentful Paint): Target **< 2.5s**
   - **FID** (First Input Delay): Target **< 100ms**
   - **CLS** (Cumulative Layout Shift): Target **< 0.1**

---

## 🐛 Error Checking

### Console Errors (DevTools → Console)

**Expected**:
- ✅ No GraphQL query errors
- ✅ No "Cannot read property" errors
- ✅ No "undefined" errors on migrated pages
- ⚠️ You may see **pre-existing API route errors** (these are NOT from migration):
  - `guild/[guildId]/member-stats` - old LeaderboardEntry schema
  - `leaderboard-v2/stats` - old UserOnChainStats schema
  - `quests/*` - old completion schema

**What to Do**:
- ✅ Ignore pre-existing API route errors (will fix in Phase 3-5)
- ❌ Report any NEW errors on leaderboard/dashboard/profile pages

---

## 📊 Data Validation

### Compare GraphQL vs Contract Read

1. Open **/leaderboard**
2. Note a user's **Total Score** from table
3. Open DevTools → **Network tab** → Find GraphQL response
4. Verify score in response matches table

**Example**:
```json
{
  "data": {
    "leaderboardEntries": [{
      "user": {
        "id": "0x8870...",
        "totalScore": "910",  ← Should match table
        "level": 3,
        "rankTier": 1
      }
    }]
  }
}
```

---

## ✅ Success Checklist

After testing all 3 pages, verify:

- [ ] ✅ Leaderboard loads data from GraphQL
- [ ] ✅ Leaderboard shows 5 offline columns removed
- [ ] ✅ TierBadge component displays correctly
- [ ] ✅ ScoreDetailsModal opens and shows breakdown
- [ ] ✅ Dashboard "GM & Stats" tab loads
- [ ] ✅ Dashboard 4 widgets display data
- [ ] ✅ Profile page loads scoring data
- [ ] ✅ ProfileStats uses GraphQL
- [ ] ✅ No NEW console errors on migrated pages
- [ ] ✅ GraphQL queries complete in < 100ms
- [ ] ✅ Data matches between pages (dashboard ↔ profile)

---

## 🎯 Quick Test Commands

### Test GraphQL Endpoint Manually:
```bash
curl -X POST https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users(limit: 3, orderBy: totalScore_DESC) { id level totalScore rankTier } }"}'
```

### Check for TypeScript Errors:
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep "error TS" | head -20
```

### Run Automated Tests:
```bash
./test-phase1-2-migration.sh
```

---

## 📝 Report Issues

If you find any issues:

1. **Note the page**: Leaderboard, Dashboard, or Profile
2. **Note the error message**: Check Console tab
3. **Note the query**: Check Network tab for GraphQL request
4. **Screenshot**: Take a screenshot of the issue
5. **Report**: Describe what's broken vs expected behavior

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅:
1. Mark Phase 1 & 2 as **COMPLETE** in migration plan
2. Proceed to **Phase 2.5** (ProgressionCharts) or **Phase 3** (Guild pages)

### If Issues Found ❌:
1. Document errors clearly
2. Fix critical issues before proceeding
3. Re-run tests after fixes

---

## 📚 Reference

**Migration Plan**: [HYBRID-ARCHITECTURE-MIGRATION-PLAN.md](./HYBRID-ARCHITECTURE-MIGRATION-PLAN.md)  
**Browser Checklist**: [BROWSER-TEST-CHECKLIST.md](./BROWSER-TEST-CHECKLIST.md)  
**Test Script**: [test-phase1-2-migration.sh](./test-phase1-2-migration.sh)

---

**Happy Testing! 🎉**
