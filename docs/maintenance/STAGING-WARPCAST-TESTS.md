# Staging Warpcast Tests — Manual Testing Guide

## Overview

This guide provides step-by-step manual testing procedures for validating Farcaster frames in Warpcast (mobile and desktop) before production deployment. These tests complement automated Playwright tests and ensure real-world user experience quality.

---

## Prerequisites

### Required Access
- [ ] Warpcast account (iOS/Android app + web)
- [ ] Staging deployment URL
- [ ] Frame cast creation permissions
- [ ] Test FID with GM activity (for badge testing)

### Test Environment
- **Staging URL:** `https://gmeowbased-staging.vercel.app`
- **Frame Types to Test:**
  - Leaderboard: `/api/frame?type=leaderboard`
  - Quest: `/api/frame?type=quest&questId=1&chain=base`
  - Profile: `/api/frame?type=profile&fid=123456`
  - Badge: `/api/frame?type=badge&fid=123456`

### Test Devices
- [ ] iPhone (iOS 16+)
- [ ] Android (Android 12+)
- [ ] Desktop browser (Chrome/Safari)

---

## Mobile Testing (iOS/Android)

### Test 1: Frame in Feed — Leaderboard

**Objective:** Verify leaderboard frame displays correctly in feed

**Steps:**
1. Open Warpcast mobile app
2. Create new cast with frame URL:
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=leaderboard
   ```
3. Add cast text: "Testing leaderboard frame 🏆"
4. Post cast
5. View cast in feed

**Expected Results:**
- [ ] Frame image displays (1200x800, 3:2 ratio)
- [ ] Image loads within 2 seconds
- [ ] Button visible: "View Leaderboard" or similar
- [ ] Button text readable (≤ 32 chars)
- [ ] No layout breaks or clipping
- [ ] Frame border/card renders correctly

**Screenshot:** Attach screenshot to test report

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

### Test 2: Launch Frame — Quest

**Objective:** Verify MiniApp launch with splash screen

**Steps:**
1. Create cast with quest frame URL:
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=quest&questId=1&chain=base
   ```
2. Post cast
3. Tap primary button ("Start Quest" or similar)
4. Observe splash screen
5. Wait for app to load

**Expected Results:**
- [ ] Splash screen displays (200x200 image)
- [ ] Splash background color matches brand (#f5f0ec)
- [ ] Splash duration 1-3 seconds
- [ ] App loads without errors
- [ ] Quest details visible after load
- [ ] Navigation works (back button, etc.)

**Screenshot:** Attach splash screen + loaded app

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

### Test 3: Button Interaction — Profile

**Objective:** Verify button tap navigation works

**Steps:**
1. Create cast with profile frame URL:
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=profile&fid=123456
   ```
2. Post cast
3. Tap button ("View Profile" or similar)
4. Verify navigation

**Expected Results:**
- [ ] Button responds to tap (visual feedback)
- [ ] Navigation occurs (opens link/frame)
- [ ] Target URL reachable (no 404)
- [ ] No console errors (if web view visible)
- [ ] Back navigation works

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

### Test 4: Light/Dark Mode — All Frames

**Objective:** Verify frame adapts to system theme

**Steps:**
1. Set device to light mode
2. View frame cast in feed
3. Toggle device to dark mode
4. View same cast again

**Expected Results:**
- [ ] Frame renders in light mode (good contrast)
- [ ] Frame renders in dark mode (good contrast)
- [ ] Text readable in both modes
- [ ] Buttons visible in both modes
- [ ] No white/black clipping issues
- [ ] Border/card adapts to theme

**Screenshots:** Attach light + dark mode screenshots

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

### Test 5: Network Conditions — Slow 3G

**Objective:** Verify frame loads on slow network

**Steps:**
1. Enable network throttling (iOS: Developer > Network Link Conditioner, Android: Developer Options)
2. Set to "Slow 3G" or similar
3. View frame cast in feed
4. Observe load time and behavior

**Expected Results:**
- [ ] Frame image loads (may be slower)
- [ ] Placeholder/loading state visible
- [ ] No timeout errors (< 10s load)
- [ ] Fallback image displays if timeout
- [ ] Button becomes interactive after load

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

## Desktop Testing (Warpcast Web)

### Test 6: Frame Modal — Desktop

**Objective:** Verify frame renders in desktop modal (424x695px)

**Steps:**
1. Open Warpcast web: https://warpcast.com
2. Find frame cast in feed
3. Click frame to open modal
4. Inspect frame rendering

**Expected Results:**
- [ ] Modal opens (424x695px viewport)
- [ ] Frame image scales correctly (3:2 ratio maintained)
- [ ] Button visible and clickable
- [ ] No horizontal/vertical scrollbars
- [ ] Close button (X) works
- [ ] Modal overlay dismissible

**Screenshot:** Attach desktop modal screenshot

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

### Test 7: Direct Frame URL — Browser

**Objective:** Verify frame meta tags present when accessed directly

**Steps:**
1. Open browser (Chrome/Safari)
2. Navigate directly to frame URL:
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=leaderboard
   ```
3. Open browser DevTools (F12)
4. Inspect HTML `<head>` section
5. Search for `fc:frame` meta tags

**Expected Results:**
- [ ] `<meta name="fc:frame">` or `<meta name="fc:miniapp:frame">` tag present
- [ ] Meta content is valid JSON
- [ ] `version: "1"` (string, not number)
- [ ] `imageUrl` is HTTPS absolute URL
- [ ] `button.title` ≤ 32 characters
- [ ] **Mini App Embed:** `button.action.type` is `launch_frame` or `view_token` ONLY
- [ ] **Mini App Embed:** `button.action.name` present (REQUIRED - Mini App name)
- [ ] **Legacy Frames v1:** `button.action.type` supports `link`, `launch_frame`, `view_token`, `post`, `mint`
- [ ] `button.action.url` is HTTPS absolute URL (optional, max 1024 chars)
- [ ] Optional: `splashImageUrl` max 32 chars
- [ ] Optional: `splashBackgroundColor` valid hex

**Screenshot:** Attach DevTools screenshot showing meta tags

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

### Test 8: OG Image Preview — Social Share

**Objective:** Verify Open Graph image displays correctly when shared

**Steps:**
1. Copy frame URL:
   ```
   https://gmeowbased-staging.vercel.app/frame/leaderboard
   ```
2. Paste URL in Twitter/LinkedIn/Slack
3. Observe preview card

**Expected Results:**
- [ ] OG image displays (1200x630 or 1200x800)
- [ ] Image correct aspect ratio (1.91:1 or 3:2)
- [ ] Image loads within 2 seconds
- [ ] Title and description visible
- [ ] No broken image icon
- [ ] Click preview → navigates to URL

**Screenshot:** Attach social preview screenshot

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

## Performance Testing

### Test 9: Frame Load Time — Mobile

**Objective:** Measure frame initial load time on mobile

**Steps:**
1. Open Warpcast mobile app
2. Clear app cache (Settings > Clear Cache)
3. Navigate to feed with frame cast
4. Use stopwatch to measure load time (from scroll into view → image visible)

**Expected Results:**
- [ ] Frame image loads < 2 seconds (good network)
- [ ] Frame image loads < 5 seconds (slow network)
- [ ] Button interactive < 3 seconds
- [ ] No "stuck loading" state

**Measured Time:** _________ seconds

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

### Test 10: OG Generation Time — Desktop

**Objective:** Measure OG image generation time on server

**Steps:**
1. Open terminal
2. Run curl command with timing:
   ```bash
   time curl -I https://gmeowbased-staging.vercel.app/api/og?type=leaderboard
   ```
3. Note response time

**Expected Results:**
- [ ] OG generation < 500ms
- [ ] HTTP 200 status
- [ ] Content-Type: image/png or image/jpeg
- [ ] Cache-Control header present (max-age 3600+)

**Measured Time:** _________ ms

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Command Output:**
```
_______________________________________
_______________________________________
```

---

## Regression Testing

### Test 11: All Frame Types — Smoke Test

**Objective:** Verify all frame types render without errors

**Frame URLs to Test:**

1. **Leaderboard:**
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=leaderboard
   ```
   - [ ] Renders correctly
   - [ ] Button works

2. **Quest (Base):**
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=quest&questId=1&chain=base
   ```
   - [ ] Renders correctly
   - [ ] Button works

3. **Quest (Optimism):**
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=quest&questId=2&chain=optimism
   ```
   - [ ] Renders correctly
   - [ ] Button works

4. **Profile:**
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=profile&fid=123456
   ```
   - [ ] Renders correctly
   - [ ] Button works

5. **Badge:**
   ```
   https://gmeowbased-staging.vercel.app/api/frame?type=badge&fid=123456
   ```
   - [ ] Renders correctly
   - [ ] Button works

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

## Edge Cases & Negative Tests

### Test 12: Invalid Parameters

**Objective:** Verify error handling for invalid inputs

**Test Cases:**

1. **Invalid FID:**
   ```
   /api/frame?type=profile&fid=invalid
   ```
   - [ ] Returns error or fallback
   - [ ] No crash/500 error

2. **Invalid Quest ID:**
   ```
   /api/frame?type=quest&questId=999999&chain=base
   ```
   - [ ] Returns error or fallback
   - [ ] No crash/500 error

3. **Invalid Chain:**
   ```
   /api/frame?type=quest&questId=1&chain=invalidchain
   ```
   - [ ] Returns error or fallback
   - [ ] No crash/500 error

4. **Missing Parameters:**
   ```
   /api/frame?type=quest
   ```
   - [ ] Returns error or fallback
   - [ ] No crash/500 error

**Pass/Fail:** ⬜ Pass ⬜ Fail

**Notes:**
_______________________________________
_______________________________________

---

## Test Report Summary

### Test Execution

**Test Date:** _______________________  
**Tester Name:** _______________________  
**Staging URL:** _______________________  
**Devices Used:**
- iOS: _____________ (version: _______)
- Android: _____________ (version: _______)
- Desktop: _____________ (browser: _______)

### Results

**Total Tests:** 12  
**Passed:** ______  
**Failed:** ______  
**Pass Rate:** ______%

### Critical Issues

| Test # | Issue Description | Severity | Screenshot |
|--------|------------------|----------|------------|
| _____ | ________________ | ________ | __________ |
| _____ | ________________ | ________ | __________ |

### Non-Critical Issues

| Test # | Issue Description | Severity | Screenshot |
|--------|------------------|----------|------------|
| _____ | ________________ | ________ | __________ |
| _____ | ________________ | ________ | __________ |

### Approval Sign-Off

**Ready for Production:** ⬜ Yes ⬜ No (if issues present)

**Signatures:**
- [ ] **QA Engineer:** _____________ (Date: ________)
- [ ] **Product Owner:** _____________ (Date: ________)
- [ ] **Tech Lead:** _____________ (Date: ________)

---

## Rollback Plan

**If critical issues found:**
1. Do NOT deploy to production
2. File bug reports with screenshots
3. Revert staging to previous version
4. Re-test after fixes deployed
5. Repeat manual testing

**Emergency Contact:** _______________________  
**Slack Channel:** #frame-engineering  
**Incident Response:** See FRAME-DEPLOYMENT-PLAYBOOK.md

---

## References

- [GI-15 Audit Specification](/docs/maintenance/GI-15-Deep-Frame-Audit.md)
- [Frame Deployment Playbook](/docs/maintenance/FRAME-DEPLOYMENT-PLAYBOOK.md)
- [Warpcast Documentation](https://docs.farcaster.xyz/)
- [Farcaster Frame Spec](https://miniapps.farcaster.xyz/docs/specification)

---

**Guide Version:** 1.0  
**Last Updated:** November 19, 2025  
**Maintained By:** QA Team + Frame Engineering
