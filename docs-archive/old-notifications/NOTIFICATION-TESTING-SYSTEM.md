# Notification System - Automated Testing Suite

**Created:** December 15, 2025  
**Location:** `/notifications-test`  
**Purpose:** Comprehensive end-to-end validation of notification priority system

---

## 🧪 Features

### 1. Full System Test (NEW)
**Button:** "🧪 Test All Events"

Automatically tests all 27 notification event types:
- ✅ Sends each notification
- ✅ Waits 500ms for database write
- ✅ Queries database to verify existence
- ✅ Marks as PASS/FAIL based on actual DB state
- ✅ Shows detailed results with color coding
- ✅ Export results as JSON for documentation

### 2. Test Results Dashboard

**Visual Indicators:**
- ✅ Green checkmark = Test passed (saved + found in DB)
- ❌ Red X = Test failed (not saved or not found)
- 📊 Summary stats: Total, Passed, Failed, Success Rate

**Per-Event Details:**
- Event name + priority badge
- Category + event type
- Three validation checks:
  - ✓ Saved to DB (API response)
  - ✓ Found in DB (query verification)
  - ✓ Push Sent (Neynar notification)
- Error messages if any

### 3. Export Functionality
- Download full test results as JSON
- Includes all metadata (priority, category, timestamps)
- Useful for debugging and documentation

---

## 📋 Test Coverage

### Events Tested (27 total)

**Viral Tiers (5)** - Achievement category, varies priority:
- Mega Viral (critical) - 500 XP
- Viral (critical) - 100 XP
- Popular (high) - 75 XP
- Engaging (medium) - 50 XP
- Active (medium) - 25 XP

**Badge Tiers (5)** - Badge category, varies priority:
- Mythic Badge (critical) - 1000 XP
- Legendary Badge (high) - 500 XP
- Epic Badge (high) - 250 XP
- Rare Badge (medium) - 100 XP
- Common Badge (medium) - 50 XP

**Quests (3)** - Quest category, medium priority:
- Daily Quest - 50 XP
- Weekly Quest - 150 XP
- Special Quest - 300 XP

**Tips (2)** - Tip category, medium priority:
- Tip Received - 10 XP
- Tip Milestone - 100 XP

**Levels (2)** - Level category, high/critical:
- Level Up - 200 XP
- Level Milestone - 1000 XP

**Rewards (2)** - Reward category, high priority:
- Referral Reward - 100 XP
- Bonus Reward - 250 XP

**Social (2)** - Social category, low priority:
- New Follower - 20 XP
- Social Activity - 15 XP

**Mentions (2)** - Mention category, medium priority:
- Mentioned in Cast - 25 XP
- Mentioned by Leader - 50 XP

**Guild (2)** - Guild category, medium priority:
- Guild Member - 20 XP
- Guild Activity - 15 XP

**GM (2)** - GM category, low priority:
- GM Streak - 30 XP
- GM Reminder - 5 XP

---

## 🔍 Validation Logic

### Pass Criteria
A test PASSES if **both** conditions are met:
1. ✅ `inAppNotification.saved === true` (API confirms save)
2. ✅ Notification found in database query (actual existence verified)

### Fail Scenarios
A test FAILS if **any** of these occur:
- ❌ API returns `saved: false`
- ❌ Notification not found in recent DB query
- ❌ API error during send
- ❌ Database query error
- ❌ Timeout (500ms wait insufficient)

---

## 🎯 Use Cases

### 1. Development Validation
**Scenario:** After changing priority logic or adding new event types

**Steps:**
1. Run "🧪 Test All Events"
2. Check success rate (should be 100%)
3. Review any failures
4. Export results for commit message

### 2. RLS Policy Testing
**Scenario:** After modifying Supabase RLS policies

**Steps:**
1. Run full test with FID 18139
2. Verify all events can read from DB
3. Check for "permission denied" errors
4. Ensure UPDATE policies still secure

### 3. Priority Filter Verification
**Scenario:** Testing threshold filtering behavior

**Steps:**
1. Set threshold to "high" in `/settings`
2. Run full test
3. Verify medium/low events show: `Push Sent: ○` (filtered)
4. Verify high/critical events show: `Push Sent: ✓` (sent)

### 4. Database Migration Validation
**Scenario:** After applying schema changes

**Steps:**
1. Run full test before migration (baseline)
2. Apply migration
3. Run full test after migration
4. Compare results to ensure no regressions

---

## 📊 Interpreting Results

### Success Rate Targets
- **100%** = Perfect (all systems operational)
- **90-99%** = Good (minor issues, investigate failures)
- **70-89%** = Warning (significant issues, review logs)
- **<70%** = Critical (major system failure, rollback)

### Common Failure Patterns

**All Failed:**
- RLS policies blocking reads
- Database connection issue
- Supabase credentials invalid

**Specific Category Failed:**
- Priority map missing category
- Category spelling mismatch
- Event config error in TEST_EVENTS

**Random Failures:**
- Race condition (500ms insufficient)
- Database write latency
- Network timeout

---

## 🔧 Technical Details

### Test Flow
```
For each event in TEST_EVENTS:
  1. POST /api/notifications/test
     - Payload: { fid, eventType }
     - Returns: { inAppNotification, pushNotification }
  
  2. Wait 500ms (database write delay)
  
  3. GET /api/notifications/debug?fid=X
     - Returns: { recentNotifications, counts }
  
  4. Validate:
     - Check if event.name in recentNotifications[].title
     - Compare inAppNotification.saved with DB presence
  
  5. Record result:
     - passed: saved && foundInDB
     - Include all metadata for debugging
```

### Performance
- **Total time:** ~27 events × 500ms = ~13.5 seconds
- **API calls:** 54 (27 send + 27 verify)
- **Database queries:** 27 SELECT operations
- **Push attempts:** Varies by priority threshold

### Data Structure
```typescript
interface TestResult {
  event: string         // "Viral Cast"
  type: string          // "tier_viral"
  category: string      // "achievement"
  priority: string      // "critical"
  saved: boolean        // API response
  foundInDB: boolean    // Database verification
  passed: boolean       // saved && foundInDB
  pushSent: boolean     // Neynar notification
  error: string | null  // Error message if any
}
```

---

## 🚀 Future Enhancements

### Phase 6 (Future)
- [ ] Add timing metrics (avg response time per event)
- [ ] Add retry logic for transient failures
- [ ] Add diff comparison with previous test run
- [ ] Add automated daily cron test job
- [ ] Add Slack/Discord webhook for test results
- [ ] Add performance regression detection
- [ ] Add load testing (100 events simultaneously)

### Phase 7 (Analytics)
- [ ] Store test results in `test_history` table
- [ ] Build trend analysis dashboard
- [ ] Alert on success rate drops
- [ ] Track flaky tests (intermittent failures)

---

## 📝 Best Practices

### Before Every Deployment
1. Run full test suite
2. Verify 100% pass rate
3. Export results
4. Commit results file to repo

### After Every Migration
1. Run test immediately after apply
2. Compare with pre-migration baseline
3. Document any differences
4. Rollback if <90% success rate

### Weekly Maintenance
1. Run full test Monday morning
2. Review any failures
3. Update expected behavior if intentional changes
4. Archive results for historical tracking

---

## 🐛 Troubleshooting

### Test Hangs at "⏳ Testing..."
- Check browser console for errors
- Verify API endpoints are responding
- Check network tab for failed requests
- Restart development server

### All Tests Show "Not Found in DB"
- RLS policies blocking reads (check whoami)
- Wrong FID being tested
- Database connection lost
- Supabase project paused

### Inconsistent Results (Flaky Tests)
- Increase wait time from 500ms to 1000ms
- Add retry logic (1 retry after 1s delay)
- Check database performance metrics
- Review recent Supabase incidents

---

**Last Updated:** December 15, 2025  
**Status:** ✅ Production Ready  
**Maintainer:** Phase 4 Notification Team
