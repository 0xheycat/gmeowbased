# 🧪 Migration Browser Testing Guide
**Date**: January 2, 2026  
**Server**: http://localhost:3000

## ✅ API Test Results

**Passed**: 9/12 endpoints (75%)
- ✅ Leaderboard APIs (Phase 1-2)
- ✅ Dashboard APIs (Phase 1-2)
- ✅ Guild List & Leaderboard (Phase 3)
- ✅ Guild Members (Phase 3)
- ✅ Quest APIs (Phase 4)
- ✅ Referral Leaderboard (Phase 5)

**Expected Failures** (Auth Required):
- ⚠️ User Profile (needs authenticated user)
- ⚠️ Guild Detail (timeout/slow query)
- ⚠️ Referral Stats (401 - needs auth)

---

## 📋 Browser Testing Checklist

### Phase 1-2: Leaderboard, Dashboard, Profile

**1. Leaderboard Page**
- URL: http://localhost:3000/leaderboard
- ✅ Check: Leaderboard table loads with users
- ✅ Check: TierBadge components render
- ✅ Check: ScoreDetailsModal opens on click
- ✅ Check: No console errors (F12)
- ✅ Check: GraphQL query <100ms (Network tab)

**2. Dashboard Page**
- URL: http://localhost:3000/dashboard
- ✅ Check: 4 widgets load:
  - DashboardStatsWidget (level, tier, score, multiplier)
  - LevelProgress (XP progress bar)
  - TierProgress (points progress bar)
  - RecentActivity (level ups, rank ups)
- ✅ Check: Skeleton wave loading appears
- ✅ Check: Data updates from Subsquid

**3. Profile Page (Own)**
- URL: http://localhost:3000/profile
- ✅ Check: Connect wallet first
- ✅ Check: ProfileStats widget shows data
- ✅ Check: Charts display (if Phase 2.5 complete)
- ✅ Check: ClaimHistory shows

**4. Profile Page (Other User)**
- URL: http://localhost:3000/profile/3
- ✅ Check: Can view other user's profile
- ✅ Check: Stats display correctly
- ✅ Check: Uses profile wallet (not connected wallet)

---

### Phase 3: Guild Pages

**5. Guild List Page**
- URL: http://localhost:3000/guilds
- ✅ Check: Guild cards display
- ✅ Check: Treasury amounts show
- ✅ Check: Member counts visible
- ✅ Check: Level badges display
- ✅ Check: Sort/filter works

**6. Guild Detail Page**
- URL: http://localhost:3000/guilds/1
- ✅ Check: Guild stats load
- ✅ Check: Member list displays
- ✅ Check: Treasury breakdown shows
- ✅ Check: Guild level progression visible
- ✅ Check: Join/Leave buttons work

---

### Phase 4: Quest Pages

**7. Quest List Page**
- URL: http://localhost:3000/quests
- ✅ Check: Quest cards display
- ✅ Check: Completion stats show
- ✅ Check: Filters work (category, difficulty)
- ✅ Check: Quest images load
- ✅ Check: "Start Quest" buttons visible

**8. Quest Detail Page**
- URL: http://localhost:3000/quests/daily-engage
- ✅ Check: Quest details display
- ✅ Check: Completion status shows
- ✅ Check: Task list renders
- ✅ Check: Reward information visible
- ✅ Check: "Complete Quest" flow works

**9. Quest Create Page**
- URL: http://localhost:3000/quests/create
- ✅ Check: Template selector works
- ✅ Check: Wizard steps navigate
- ✅ Check: Cost calculator updates
- ✅ Check: Auto-save drafts work
- ✅ Check: Publish quest succeeds

**10. Quest Manage Page**
- URL: http://localhost:3000/quests/manage
- ✅ Check: Quest table loads
- ✅ Check: Filters work
- ✅ Check: Bulk actions show confirmations
- ✅ Check: Analytics dashboard displays
- ✅ Check: Code splitting works (lazy load)

---

### Phase 5: Referral Pages

**11-12. Referral Dashboard**
- URL: http://localhost:3000/referral
- ✅ Check: Tabs render (Dashboard, Leaderboard, Activity, Analytics)
- ✅ Check: Stats cards display:
  - Code count
  - Total uses
  - Total rewards
  - Tier badge
- ✅ Check: Referral code registration works
- ✅ Check: Link generator creates shareable links
- ✅ Check: QR code displays
- ✅ Check: Activity feed shows recent referrals
- ✅ Check: Skeleton wave loading

---

## 🔍 Developer Tools Monitoring

### Network Tab (F12 → Network)

**GraphQL Queries to Check**:
```
user-stats.graphql         →  50-100ms  ✅
leaderboard.graphql        →  80-150ms  ✅
guild-stats.graphql        →  60-120ms  ✅
quest-completions.graphql  →  70-130ms  ✅
referral-stats.graphql     →  60-110ms  ✅
```

**Cache Headers**:
- First load: Full query
- Navigation back: `X-Cache-Hit: true`
- After 30s/60s poll: Background refresh

### Console Tab (F12 → Console)

**Expected**:
- ✅ No errors (red text)
- ✅ Apollo Client cache logs (if enabled)
- ✅ Authentication messages

**Warnings OK**:
- ⚠️ React dev warnings (normal in dev mode)
- ⚠️ Next.js fast refresh messages

---

## 📊 Performance Targets

**Page Load (Lighthouse)**:
- Target: LCP <2.5s
- Target: FID <100ms
- Target: CLS <0.1

**GraphQL Queries**:
- Target: <100ms (95% of queries)
- Max: <500ms

**Cache Hit Rate**:
- Target: >80% on navigation
- Apollo Client caching configured

---

## ✅ Success Criteria

### Data Display
- [ ] All 12 pages load without errors
- [ ] Data displays from Subsquid/Supabase
- [ ] Loading skeletons appear and transition smoothly
- [ ] Error boundaries catch failures
- [ ] Retry functionality works

### Performance
- [ ] GraphQL queries <100ms (Network tab)
- [ ] Page loads <2.5s (Lighthouse)
- [ ] Smooth animations (60fps)
- [ ] No memory leaks (DevTools Performance)

### Functionality
- [ ] Real-time polling works (30s/60s)
- [ ] User interactions work (click, hover, scroll)
- [ ] Forms submit correctly
- [ ] Navigation works smoothly
- [ ] Auth flows work properly

---

## 🐛 Common Issues & Fixes

**Issue**: GraphQL query timeout
- **Fix**: Check Subsquid endpoint is reachable
- **Check**: https://squid.subsquid.io/gmeow-index/graphql

**Issue**: 401 Unauthorized on referral stats
- **Fix**: Connect wallet first (top right)
- **Expected**: Auth required for user-specific data

**Issue**: Skeleton loading forever
- **Fix**: Check console for GraphQL errors
- **Fix**: Verify environment variables (.env.local)

**Issue**: Data not updating
- **Fix**: Polling might be paused (check Apollo DevTools)
- **Fix**: Refresh page to force refetch

---

## 📝 Test Results Template

```
Date: January 2, 2026
Tester: [Your Name]

Phase 1-2:
✅ Leaderboard: PASS
✅ Dashboard: PASS
✅ Profile (Own): PASS
✅ Profile (Other): PASS

Phase 3:
✅ Guild List: PASS
✅ Guild Detail: PASS

Phase 4:
✅ Quest List: PASS
✅ Quest Detail: PASS
✅ Quest Create: PASS
✅ Quest Manage: PASS

Phase 5:
✅ Referral Dashboard: PASS

Performance:
- GraphQL avg: [X]ms
- Page load avg: [X]s
- Cache hit rate: [X]%

Issues Found:
1. [Issue description]
2. [Issue description]

Overall Status: ✅ PASS / ⚠️ ISSUES / ❌ FAIL
```

---

**Ready to Test**: Open http://localhost:3000 and start with the leaderboard! 🚀
