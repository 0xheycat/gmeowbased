# Browser Testing Checklist - Phase 1 & 2 Migration
**Date**: January 2, 2026  
**Status**: Ready for manual browser testing

---

## ✅ Automated Tests Passed

```
✅ Dev server running on localhost:3000
✅ Subsquid production endpoint healthy
   Sample data: { id: "0x8870...", level: 3, totalScore: "910" }
✅ All Phase 1 files present (13 files)
✅ All Phase 2 files present (5 files)
✅ GraphQL queries structured correctly
✅ Hooks use Apollo Client
✅ Environment configured to production
✅ Offline columns removed
```

---

## 🌐 Manual Browser Tests

### Test 1: Leaderboard Page (Phase 1)
**URL**: http://localhost:3000/leaderboard

**Check**:
- [ ] Page loads without errors
- [ ] Leaderboard table shows user data
- [ ] TierBadge component displays correctly (colored badge with tier name)
- [ ] Total Score column displays numbers from GraphQL
- [ ] Level column displays numbers from GraphQL
- [ ] "View Details" button appears on each row
- [ ] Click "View Details" → ScoreDetailsModal opens
- [ ] Modal shows breakdown: GM Points, Viral Points, Quest Points, Guild Points, Referral Points
- [ ] Offline columns removed: Quest Points, Guild Bonus, Referrals, Viral XP, Badge Prestige
- [ ] Check DevTools Network tab: GraphQL query to Subsquid (GET_LEADERBOARD)
- [ ] Query completes in <100ms

**Expected GraphQL Query**:
```graphql
{
  leaderboardEntries(
    limit: 50
    offset: 0
    orderBy: totalPoints_DESC
  ) {
    id
    rank
    totalPoints
    user {
      id
      level
      rankTier
      totalScore
      gmPoints
      viralPoints
      questPoints
      guildPoints
      referralPoints
    }
  }
}
```

---

### Test 2: Dashboard Page (Phase 2)
**URL**: http://localhost:3000/dashboard

**Check**:
- [ ] Page loads without errors
- [ ] Navigate to "GM & Stats" tab
- [ ] **DashboardStatsWidget** displays:
  - [ ] Total Score number
  - [ ] Level number
  - [ ] Rank Tier badge/number
  - [ ] Multiplier percentage
- [ ] **LevelProgress** component shows:
  - [ ] Current level
  - [ ] XP progress bar
  - [ ] "X / Y XP to next level"
- [ ] **TierProgress** component shows:
  - [ ] Current tier badge
  - [ ] Points progress to next tier
  - [ ] "X / Y points to rank up"
- [ ] **RecentActivity** component shows:
  - [ ] Recent level ups (if any)
  - [ ] Recent rank ups (if any)
  - [ ] Timestamps
- [ ] Check DevTools Network tab: GraphQL queries to Subsquid
- [ ] Queries complete in <100ms
- [ ] No console errors

**Expected GraphQL Queries**:
```graphql
# Query 1: User Stats
{
  user(id: "0x...") {
    id
    level
    rankTier
    totalScore
    multiplier
    gmPoints
    viralPoints
    questPoints
    guildPoints
    referralPoints
    xpIntoLevel
    xpToNextLevel
    pointsIntoTier
    pointsToNextTier
  }
}

# Query 2: User History
{
  levelUpEvents(where: { user: { id_eq: "0x..." } }, orderBy: timestamp_DESC, limit: 5) {
    id
    fromLevel
    toLevel
    timestamp
  }
  rankUpEvents(where: { user: { id_eq: "0x..." } }, orderBy: timestamp_DESC, limit: 5) {
    id
    fromTier
    toTier
    timestamp
  }
}
```

---

### Test 3: Profile Page (Own) (Phase 2)
**URL**: http://localhost:3000/profile

**Check**:
- [ ] Page loads without errors
- [ ] **ProfileStats** component displays:
  - [ ] Total Score
  - [ ] Level
  - [ ] Tier badge
  - [ ] Multiplier
  - [ ] Viral Points
  - [ ] Quest Points
  - [ ] Current streak
  - [ ] Lifetime GMs
- [ ] Data matches dashboard (same GraphQL source)
- [ ] Check DevTools Network tab: GraphQL query (GET_USER_STATS)
- [ ] Query completes in <100ms
- [ ] No console errors

---

### Test 4: Profile Page (Other User) (Phase 2)
**URL**: http://localhost:3000/profile/[some_fid]

**Check**:
- [ ] Page loads without errors
- [ ] ProfileStats shows other user's data
- [ ] TierBadge displays other user's tier
- [ ] Scoring data loads from GraphQL
- [ ] Social data loads from Supabase (bio, avatar, links)
- [ ] No console errors

---

## 🔍 Performance Checks

### GraphQL Query Performance
Open DevTools → Network tab → Filter by "graphql"

**Expected**:
- [ ] GET_LEADERBOARD: <100ms
- [ ] GET_USER_STATS: <100ms
- [ ] GET_LEVEL_UPS: <100ms
- [ ] GET_RANK_UPS: <100ms

**Actual** (record below):
```
GET_LEADERBOARD: ___ ms
GET_USER_STATS: ___ ms
GET_LEVEL_UPS: ___ ms
GET_RANK_UPS: ___ ms
```

### Page Load Performance
Open DevTools → Lighthouse → Run

**Expected**:
- [ ] LCP (Largest Contentful Paint): <2.5s
- [ ] FID (First Input Delay): <100ms
- [ ] CLS (Cumulative Layout Shift): <0.1

---

## 🐛 Error Checks

### Console Errors (DevTools → Console)
**Check for**:
- [ ] No GraphQL query errors
- [ ] No "Cannot read property" errors
- [ ] No "undefined" errors
- [ ] No Apollo Client errors
- [ ] No network request failures

**Note**: Pre-existing API route errors (guild/member-stats, leaderboard-v2, quests) are **NOT** related to Phase 1/2 migration. These will be fixed in later phases.

---

## 📊 Data Validation

### Compare GraphQL vs Contract Read
1. Open /leaderboard
2. Note down a user's Total Score from the table
3. Open /score-test and check same user's score
4. Verify scores match (GraphQL == Contract)

**Result**:
- GraphQL Score: ___
- Contract Score: ___
- Match: [ ] Yes [ ] No

---

## ✅ Success Criteria

Phase 1 & 2 Migration is COMPLETE when:
- [x] Dev server runs without crashes
- [x] Subsquid production endpoint healthy
- [x] All Phase 1 & 2 files present
- [ ] Leaderboard shows data from GraphQL
- [ ] Dashboard shows data from GraphQL
- [ ] Profile shows data from GraphQL
- [ ] TierBadge component works
- [ ] ScoreDetailsModal opens
- [ ] No console errors on migrated pages
- [ ] GraphQL queries complete in <100ms
- [ ] 0 TypeScript errors in Phase 1/2 components

---

## 🚀 Next Steps After Testing

1. **If all tests pass**:
   - Mark Phase 1 & 2 as COMPLETE ✅
   - Update HYBRID-ARCHITECTURE-MIGRATION-PLAN.md
   - Proceed to Phase 2.5 (ProgressionCharts) or Phase 3 (Guild pages)

2. **If issues found**:
   - Document errors in HYBRID-ARCHITECTURE-MIGRATION-PLAN.md
   - Fix critical issues before proceeding
   - Re-run tests

---

**Test Execution Date**: _______________  
**Tested By**: _______________  
**Overall Result**: [ ] PASS [ ] FAIL  
**Notes**: _____________________________
