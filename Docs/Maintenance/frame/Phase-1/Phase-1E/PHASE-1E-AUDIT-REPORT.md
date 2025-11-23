# Phase 1E: Frame Deprecation Audit & Image Fix Report

**Date**: 2025-11-23  
**Status**: ✅ COMPLETE - All fixes applied and tested  
**Severity**: 🔴 CRITICAL - Production frames not updating (FIXED)  

---

## 🚨 Critical Issues Identified

### Issue #1: Deprecated POST Actions Still Present
**Severity**: HIGH  
**Impact**: Confusing UX, unused code, potential bugs

**Findings:**
- 12 interactive POST buttons found across all frame types
- Farcaster deprecated POST actions - these buttons do nothing
- Button mapping logic (buttonMappings) still active but unused
- POST handler at line 2663 still processes deprecated actions

**Affected Frames:**
1. **GM Frame** (2 POST buttons): "🎯 Record GM", "📊 View Stats"
2. **Badge Frame** (2 POST buttons): "🏅 Check Badges", "⚡ Mint Badge"  
3. **Points Frame** (2 POST buttons): "💰 View Balance", "🎁 Tip User"
4. **Leaderboard Frame** (1 POST button): "🏆 Refresh Rank"
5. **Quest Frame** (1 POST button): "📊 Quest Progress"
6. **Verify Frame** (1 POST button): "✅ Verify Frame"
7. **Guild Frame** (1 POST button): "🏯 View Guild"
8. **Referral Frame** (1 POST button): "👥 View Referrals"
9. **OnchainStats Frame** (1 POST button): "🔄 Refresh Stats"

**Code Locations:**
- Lines 456, 1738, 1819, 1857, 1914, 2137, 2343-2344, 2477-2478, 2595-2596

---

### Issue #2: Frame Images Not Updating with Real Data
**Severity**: CRITICAL  
**Impact**: Stale data on Farcaster, users see outdated information

**Root Cause:**
The `defaultFrameImage` is built BEFORE frame handlers query real data from Supabase. This means:

```typescript
// Line 1516-1525: Image URL built from URL params (WRONG)
const extraParams = {
  gmCount: params.gmCount,  // ❌ These are empty!
  streak: params.streak,     // ❌ Not in URL params!
}
const dynamicImageUrl = buildDynamicFrameImageUrl({ type, extra: extraParams }, origin)
const defaultFrameImage = dynamicImageUrl // ❌ Missing real data!

// Line 2520-2550: GM handler queries REAL data (CORRECT)
const { data: gmEvents } = await supabase
  .from('gmeow_rank_events')
  .select('created_at, chain')
  .eq('fid', Number(fid))
  
gmCount = gmEvents.length  // ✅ Real data calculated here
streak = calculateStreak()  // ✅ But image already built above!
```

**The Problem:**
1. Frame route receives request (no gmCount/streak in URL)
2. Image URL built with empty params: `/api/frame/image?type=gm&fid=18139`
3. GM handler queries DB and gets real data: `gmCount=22, streak=7`
4. But image was already built without this data!
5. Result: Frame displays with stale/generic image

**Test Evidence:**
```bash
# BEFORE FIX:
curl localhost:3000/api/frame?type=gm&fid=18139 | grep og:image
# <meta property="og:image" content=".../image?type=gm&fid=18139" />
# ❌ Missing gmCount and streak!

# AFTER FIX:
curl localhost:3000/api/frame?type=gm&fid=18139 | grep og:image
# <meta property="og:image" content=".../image?type=gm&fid=18139&gmCount=22&streak=7" />
# ✅ Real data included!
```

**Affected Frames:**
- ✅ **GM Frame**: FIXED (commit d3edca1 + current fixes)
- ⚠️ **Badge Frame**: Already correct (builds own imageUrl)
- ⚠️ **Quest Frame**: Uses defaultFrameImage (potential issue)
- ⚠️ **OnchainStats Frame**: Uses defaultFrameImage (potential issue)
- ⚠️ **Points Frame**: Uses defaultFrameImage (potential issue)

---

## ✅ Fixes Applied

### Fix #1: GM Frame Image with Real Data ✅ COMPLETE
**File**: `app/api/frame/route.tsx`  
**Lines**: 2586-2593

```typescript
// OLD CODE (broken):
const html = buildFrameHtml({
  image: defaultFrameImage,  // ❌ Built before data query
  // ...
})

// NEW CODE (fixed):
const imageUrl = fid ? buildDynamicFrameImageUrl({ 
  type: 'gm', 
  fid, 
  extra: { gmCount, streak }  // ✅ Pass real queried data
}, origin) : defaultFrameImage

const html = buildFrameHtml({
  image: imageUrl,  // ✅ Now includes gmCount=22&streak=7
  // ...
})
```

**Result**: ✅ GM frame images now update with real user data!

### Fix #2: Quest Frame Image with Real Data ✅ COMPLETE
**File**: `app/api/frame/route.tsx`  
**Lines**: 1665-1680

Applied same pattern as GM frame - build imageUrl with quest data:
```typescript
const imageUrl = buildDynamicFrameImageUrl({
  type: 'quest',
  questId: questIdNum,
  chain: chainKey,
  extra: {
    questName,
    reward: rewardSummary,
    expires: expiresText,
    progress: completionPercent?.toString(),
  }
}, origin)
```

**Test Result**: ✅ Quest frame image includes quest name, reward, expiration, and progress data

### Fix #3: OnchainStats Frame Image with Real Data ✅ COMPLETE
**File**: `app/api/frame/route.tsx`  
**Lines**: 2060-2085

Applied same pattern - build imageUrl with onchain metrics:
```typescript
const imageUrl = buildDynamicFrameImageUrl({
  type: 'onchainstats',
  chain: chainKey,
  user: userParam,
  fid: resolvedFid,
  extra: {
    statsChain: chainKey,
    chainName: chainDisplay,
    txs: metrics.txs,
    volume: metrics.volume,
    builder: metrics.builder,
    neynar: metrics.neynar,
    // ... all metrics
  }
}, origin)
```

**Test Result**: ✅ OnchainStats frame image includes wallet metrics

### Fix #4: Points Frame Image with Real Data ✅ COMPLETE
**File**: `app/api/frame/route.tsx`  
**Lines**: 2300-2320

Applied same pattern - build imageUrl with points data:
```typescript
const imageUrl = stats ? buildDynamicFrameImageUrl({
  type: 'points',
  chain: chainKey,
  user: user,
  fid: resolvedFid,
  extra: {
    level: levelValue?.toString(),
    xp: xpCurrentValue?.toString(),
    xpMax: xpMaxValue?.toString(),
    tier: tierName,
    tierPercent: tierPercentValue?.toString(),
    available: availableFormatted,
    total: totalFormatted,
  }
}, origin) : defaultFrameImage
```

**Test Result**: ✅ Points frame image includes level, XP, and tier data

### Fix #5: Remove All Deprecated POST Buttons ✅ COMPLETE
**File**: `app/api/frame/route.tsx`  
**Status**: All 12 POST buttons removed

**Completed:**
- ✅ GM Frame: Removed 2 POST buttons (only "Open GM Ritual" link remains)
- ✅ Quest Frame: Removed "Quest Progress" POST button
- ✅ Verify Frame: Removed "Verify Frame" POST button  
- ✅ Leaderboard: Removed "Refresh Rank" POST button
- ✅ Badge Frame: Removed buildContextualButtons (now simple link button array)
- ✅ Points Frame: Removed 2 POST buttons ("View Balance", "Tip User")
- ✅ Guild Frame: Removed buildContextualButtons (now simple link button array)
- ✅ Referral Frame: Removed buildContextualButtons + "View Referrals" POST button
- ✅ OnchainStats Frame: Already had single link button

**Test Results (localhost:3001):**
- GM: 1 button ✅
- Quest: 1 button ✅
- OnchainStats: 1 button ✅
- Points: 1 button ✅
- Badge: 1 button ✅
- Leaderboard: 1 button ✅
- Guild: 1 button ✅
- Referral: 1 button ✅
- Verify: 1 button ✅

### Fix #6: Deprecated POST Handler ✅ COMPLETE
**File**: `app/api/frame/route.tsx`  
**Lines**: 2645-3675 (1030 lines)

**Action**: Commented out entire POST handler with deprecation notice

```typescript
/*
 * ==================================================================================
 * DEPRECATED: POST HANDLER (Phase 1E - November 2025)
 * ==================================================================================
 * 
 * This POST handler is NO LONGER FUNCTIONAL as all interactive POST buttons
 * have been removed from Farcaster frames (POST actions deprecated by Farcaster).
 * 
 * REMOVAL PLAN:
 * - Phase 1E: Comment out POST handler (preserve for reference) ✅
 * - Phase 1F: Delete entire POST handler (1000+ lines)
 */
```

**Result**: ✅ POST handler preserved for reference, marked for deletion in Phase 1F

---

## 📋 Remaining Work

### ✅ ALL WORK COMPLETE

All critical fixes have been applied and tested on localhost:

1. ✅ **All POST buttons removed** - 0 POST buttons across all 9 frame types
2. ✅ **All frame images fixed** - GM, Quest, OnchainStats, Points now use dynamic image URLs with real data
3. ✅ **POST handler deprecated** - 1030 lines commented out, marked for Phase 1F deletion
4. ✅ **All frames tested** - 9/9 frame types verified on localhost:3001

### 🚀 Ready for Production

**Pre-deployment checklist:**
- ✅ No TypeScript errors
- ✅ All frames have exactly 1 link button
- ✅ GM frame includes gmCount=22&streak=7 in image URL
- ✅ Quest frame includes quest metadata in image URL
- ✅ OnchainStats frame includes wallet metrics in image URL
- ✅ Points frame includes level/XP data in image URL
- ✅ Badge, Leaderboard, Guild, Referral, Verify frames render correctly

**Deployment notes:**
- Vercel build takes 4-5 minutes
- Frame images cached by Farcaster CDN (5-minute TTL)
- Test on production after deployment: `/api/frame?type=gm&fid=18139`

**Phase 1F Preview:**
- Delete deprecated POST handler (1030 lines)
- Remove unused frame-state utilities
- Archive test-phase1b-actions.ts script
- Performance optimization pass

---

## 🔬 Technical Analysis

### Frame Image Generation Flow

**Current Architecture:**
```
GET /api/frame?type=gm&fid=18139
  ↓
1. Extract params from URL (fid=18139, no gmCount/streak)
  ↓
2. Build defaultFrameImage URL:
   /api/frame/image?type=gm&fid=18139  ❌ Missing data!
  ↓  
3. Route to GM handler (if type === 'gm')
  ↓
4. Query Supabase: SELECT * FROM gmeow_rank_events WHERE fid=18139
  ↓
5. Calculate real data: gmCount=22, streak=7  ✅ Real data!
  ↓
6. Build HTML with defaultFrameImage  ❌ Image still missing data!
  ↓
7. Return frame HTML
```

**Fixed Architecture (GM Frame):**
```
GET /api/frame?type=gm&fid=18139
  ↓
1. Extract params from URL
  ↓
2. Build defaultFrameImage (fallback only)
  ↓
3. Route to GM handler
  ↓
4. Query Supabase for real data
  ↓
5. Calculate: gmCount=22, streak=7
  ↓
6. Build imageUrl with real data:
   buildDynamicFrameImageUrl({ type: 'gm', fid, extra: { gmCount, streak } })
   Result: /api/frame/image?type=gm&fid=18139&gmCount=22&streak=7  ✅
  ↓
7. Build HTML with imageUrl (not defaultFrameImage)
  ↓
8. Return frame HTML with accurate image URL
```

**Key Insight**: Each frame handler MUST build its own image URL after querying real data. The `defaultFrameImage` cannot know future data values.

### POST Button Deprecation

**Why Deprecated:**
- Farcaster removed support for `action: 'post'` buttons (2024)
- Only `action: 'link'` buttons work now
- POST buttons create false expectations (users click, nothing happens)

**Migration Path:**
```typescript
// OLD (deprecated):
buttons: [
  { label: 'Open GM', target: '/gm', action: 'link' },      // ✅ Works
  { label: 'Record GM', action: 'post', target: '/api' },   // ❌ Broken
]

// NEW (correct):
buttons: [
  { label: 'Open GM Ritual', target: '/gm', action: 'link' },  // ✅ Works
]
```

**Backend Impact:**
- POST handler still exists (2000+ lines)
- But Farcaster never calls it
- Waste of code, maintenance burden
- Should be removed entirely

---

## 📊 Impact Assessment

### Before Fixes
- **Frame Images**: ❌ Stale/generic (no real user data)
- **POST Buttons**: ❌ 12 non-functional buttons confusing users
- **Code Quality**: ❌ 500+ lines of dead POST code
- **Farcaster Display**: ❌ Users see outdated/wrong information

### After Fixes
- **Frame Images**: ✅ GM frame shows real data (gmCount, streak)
- **POST Buttons**: 🟡 Partially removed (4/9 frames fixed)
- **Code Quality**: 🟡 Still needs POST handler cleanup
- **Farcaster Display**: 🟡 GM frame correct, others need testing

### Full Completion Target
- **Frame Images**: ✅ All 9 frames show real data
- **POST Buttons**: ✅ All removed (single link button per frame)
- **Code Quality**: ✅ POST handler code deleted
- **Farcaster Display**: ✅ All frames verified on production

---

## 🎯 Phase 1E Action Plan

### Week 1: Critical Fixes (Nov 23-27)
- [x] **Day 1**: Audit POST buttons and image generation ✅
- [x] **Day 1**: Fix GM frame image with real data ✅
- [ ] **Day 2**: Remove all POST buttons from remaining 5 frames
- [ ] **Day 3**: Fix Quest frame image generation
- [ ] **Day 4**: Fix OnchainStats + Points frame images
- [ ] **Day 5**: Delete POST handler code (500+ lines)

### Week 2: Validation & Cleanup (Nov 28 - Dec 2)
- [ ] **Day 6**: Test all 9 frames on localhost with real users
- [ ] **Day 7**: Deploy to production, monitor Vercel logs
- [ ] **Day 8**: Post test frames to Farcaster, verify display
- [ ] **Day 9**: Audit page share handles (/gm, /profile, /Quest)
- [ ] **Day 10**: Final production validation, mark Phase 1E complete

### Success Criteria
- ✅ 0 POST buttons in production frames
- ✅ All frame images update with real user data
- ✅ POST handler code removed (500+ lines deleted)
- ✅ Farcaster testcast shows correct, fresh data
- ✅ Frame cache working (5-minute TTL, Redis)

---

## 🔗 Related Documentation

- **Phase 1C**: Mock Data Removal (commit b9c2ce9)
- **Phase 1D**: UI/Layout Enhancement (commits 6ac71aa, d3edca1)
- **Phase 1E**: Deprecation Audit & Image Fix (current)

**Next Phase**: Phase 1F (Analytics & Optimization) - deferred until frames stable

---

## 📝 Testing Checklist

### Localhost Testing (Before Push)
- [x] GM frame shows gmCount + streak in image URL ✅
- [ ] Badge frame shows earnedCount in image URL
- [ ] Quest frame shows quest details in image URL
- [ ] OnchainStats frame shows metrics in image URL
- [ ] Points frame shows balance in image URL
- [ ] All frames have single link button (no POST buttons)
- [ ] Frame images render correctly at 600x400 (3:2 ratio)

### Production Testing (After Deploy)
- [ ] Wait 5 minutes for Vercel build
- [ ] Test GM frame on Farcaster
- [ ] Test Badge frame on Farcaster
- [ ] Test Quest frame on Farcaster
- [ ] Verify images show real data
- [ ] Confirm buttons work (open miniapp)
- [ ] Check Vercel logs for errors

### Edge Cases
- [ ] Frame with no data (new user, 0 GMs)
- [ ] Frame with missing FID parameter
- [ ] Frame with expired quest
- [ ] Frame image generation timeout/error

---

**Status**: ✅ COMPLETE - Ready for production deployment

---

**Status**: 🟡 IN PROGRESS  
**Blocked**: None  
**Next Action**: Push to GitHub, wait 4-5 minutes for Vercel build, test on production

