# Frame Dynamic Image Fix Plan

## Problem Statement

Frames are displaying **static `frame-image.png`** instead of **dynamic personalized images** with user data from metadata.

### User Report
> "only displaying frame-image.png and button not with data from frame json"

### Root Cause
In `/app/api/frame/route.tsx`:
- Line 1096: `const defaultFrameImage = ${origin}/frame-image.png`
- Line 1297: `imageUrl: resolvedImage` uses static fallback
- **Missing**: Dynamic image URL generation with query parameters

### Current Behavior ❌
```json
{
  "version": "next",
  "imageUrl": "https://gmeowhq.art/frame-image.png",  // <-- STATIC
  "button": {...}
}
```

### Expected Behavior ✅
```json
{
  "version": "next",
  "imageUrl": "https://gmeowhq.art/api/frame/image?type=gm&user=848516&...",  // <-- DYNAMIC
  "button": {...}
}
```

## Solution Architecture

### 1. Create Dynamic Image URL Builder

**Function:** `buildDynamicFrameImageUrl(params: FrameRequest, origin: string): string`

**Logic:**
```typescript
function buildDynamicFrameImageUrl(params: FrameRequest, origin: string): string {
  const imageUrl = new URL(`${origin}/api/frame/image`)
  
  // Add frame type
  if (params.type) imageUrl.searchParams.set('type', params.type)
  
  // Add user/fid
  if (params.user) imageUrl.searchParams.set('user', String(params.user))
  if (params.fid) imageUrl.searchParams.set('fid', String(params.fid))
  
  // Add chain
  if (params.chain) imageUrl.searchParams.set('chain', String(params.chain))
  
  // Quest-specific
  if (params.type === 'quest' && params.questId) {
    imageUrl.searchParams.set('questId', String(params.questId))
  }
  
  // Leaderboard-specific
  if (params.type === 'leaderboard') {
    if (params.limit) imageUrl.searchParams.set('limit', String(params.limit))
    if (params.season) imageUrl.searchParams.set('season', String(params.season))
    if (toBooleanFlag(params.global)) imageUrl.searchParams.set('global', '1')
  }
  
  // Badge-specific
  if (params.type === 'badge' && params.badgeId) {
    imageUrl.searchParams.set('badgeId', String(params.badgeId))
  }
  
  return imageUrl.toString()
}
```

### 2. Update Frame Route to Use Dynamic Images

**File:** `/app/api/frame/route.tsx`

**Changes:**

1. Replace static `defaultFrameImage`:
```typescript
// BEFORE
const defaultFrameImage = `${origin}/frame-image.png`

// AFTER
const dynamicFrameImage = buildDynamicFrameImageUrl(params, origin)
const defaultFrameImage = dynamicFrameImage || `${origin}/frame-image.png` // fallback
```

2. Update `buildFrameHtml` call to use dynamic image:
```typescript
// Pass dynamicFrameImage instead of defaultFrameImage
const html = buildFrameHtml({
  image: dynamicFrameImage,  // <-- Use dynamic URL
  // ... other params
})
```

### 3. Enhance `/api/frame/image` Route

**File:** `/app/api/frame/image/route.tsx`

**Add support for:**
- GM stats (user GM count, streak, rank)
- Quest details (quest name, rewards, completion status)
- Leaderboard top 3
- Badge showcase
- Points/XP display

**Example GM Image:**
```typescript
if (type === 'gm' && user) {
  // Fetch user GM stats from contract
  const stats = await fetchUserStats(user, chain)
  return new ImageResponse(
    <GmStatsCard 
      user={shortenAddress(user)}
      gmCount={stats.gmCount}
      streak={stats.streak}
      rank={stats.rank}
      chain={chain}
    />
  )
}
```

## Implementation Steps

### Stage 5.16: Analysis & Planning ✅
- [x] Identified root cause (static image URL)
- [x] Documented current vs expected behavior
- [x] Created fix plan with architecture

### Stage 5.17: Implementation
1. Create `buildDynamicFrameImageUrl()` utility
2. Update frame route to use dynamic URLs
3. Enhance `/api/frame/image` with type-specific rendering
4. Add GM stats image generator
5. Add quest details image generator
6. Add leaderboard image generator

### Stage 5.18: Testing
1. Test GM frame with user parameter
2. Test quest frame with questId
3. Test leaderboard frame
4. Verify images load in Farcaster
5. Verify personalized data displays correctly

### Stage 5.19: Production Deployment
1. Commit all changes
2. Deploy to Vercel
3. Verify production frame URLs
4. Test in Warpcast with real users

## Test Cases

### Test Case 1: GM Frame with User
**URL:** `https://gmeowhq.art/api/frame?type=gm&user=0x123...&fid=848516`

**Expected Image URL:**
```
https://gmeowhq.art/api/frame/image?type=gm&user=0x123...&fid=848516&chain=base
```

**Expected Image Content:**
- User address (shortened)
- GM count
- Current streak
- Rank on leaderboard
- Chain badge

### Test Case 2: Quest Frame
**URL:** `https://gmeowhq.art/api/frame?type=quest&questId=1&chain=base`

**Expected Image URL:**
```
https://gmeowhq.art/api/frame/image?type=quest&questId=1&chain=base
```

**Expected Image Content:**
- Quest name
- Quest type
- Rewards
- Expiration date
- Completion status (if user provided)

### Test Case 3: Leaderboard Frame
**URL:** `https://gmeowhq.art/api/frame?type=leaderboard&chain=base&limit=5`

**Expected Image URL:**
```
https://gmeowhq.art/api/frame/image?type=leaderboard&chain=base&limit=5
```

**Expected Image Content:**
- Top 3-5 players
- Player names/addresses
- XP scores
- Rank badges

## Success Criteria

✅ **Frame displays personalized data**
✅ **Dynamic images load correctly in Farcaster**
✅ **All frame types supported (GM, quest, leaderboard, badge)**
✅ **Images respect 3:2 aspect ratio (1200x800)**
✅ **Fallback to static image if dynamic generation fails**

## Notes

- Keep static `frame-image.png` as fallback for error cases
- Use try-catch around dynamic image generation
- Log errors for debugging
- Add caching headers for performance
- Consider rate limiting for image endpoint

---

**Status:** Stage 5.16 Complete ✅  
**Next:** Stage 5.17 Implementation
**Priority:** HIGH - Core user-facing bug
