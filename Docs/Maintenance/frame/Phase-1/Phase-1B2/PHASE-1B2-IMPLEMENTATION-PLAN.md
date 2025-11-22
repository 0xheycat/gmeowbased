# Phase 1B.2 Implementation Plan
**Date**: November 22, 2025  
**Status**: 📋 READY TO START  
**Goal**: Add interactive POST buttons to frame GET responses

---

## Executive Summary

Phase 1B.2 builds on Phase 1B.1's POST action infrastructure by integrating interactive buttons directly into frame GET responses. Users will be able to click buttons within Farcaster frames that trigger server-side actions without leaving the frame context.

**Timeline**: 1-2 hours  
**Risk Level**: Low (non-breaking changes to button rendering)  
**Dependencies**: Phase 1B.1 complete ✅

---

## Objectives

### Primary Goal
Enable frame GET handlers to return interactive POST buttons alongside traditional link buttons, following the Farcaster Frames v2 specification.

### Success Criteria
1. ✅ All 9 frame types include interactive buttons
2. ✅ POST actions trigger correctly from frame clicks
3. ✅ Session state persists across button interactions
4. ✅ 4-button limit enforced (prioritize POST over link)
5. ✅ Backward compatibility maintained (existing link buttons work)
6. ✅ Production deployment successful

---

## Current State (Phase 1B.1)

### What We Have
✅ **13 POST action handlers** operational:
- GM: `recordGM`, `getGMStats`
- Quest: `questProgress`, `verifyQuest`
- Points: `viewBalance`, `tipUser`
- Leaderboards: `refreshRank`
- Badge: `checkBadges`, `mintBadge`
- OnchainStats: `refreshStats`
- Guild: `viewGuild`, `joinGuild`
- Referral: `viewReferrals`, `createReferral`

✅ **Frame GET handlers** return HTML with link buttons only:
```typescript
buttons: [
  { label: 'Open App', target: 'https://gmeowhq.art/...' }
]
```

### What's Missing
❌ Interactive POST buttons not included in frame responses  
❌ Users must navigate to external URLs instead of in-frame actions  
❌ No visual distinction between interactive vs. link buttons  

---

## Target State (Phase 1B.2)

### Frame Response Structure
```typescript
// Example: GM Frame
buttons: [
  {
    label: 'Send Daily GM',
    action: 'post',
    target: '/api/frame',
    post_url: 'https://gmeowhq.art/api/frame'
  },
  {
    label: 'View GM Stats',
    action: 'post',
    target: '/api/frame',
    post_url: 'https://gmeowhq.art/api/frame'
  },
  {
    label: 'Open App',
    action: 'link',
    target: 'https://gmeowhq.art/gm'
  }
]
```

### Button Mapping by Frame Type
(Per SYSTEM-AUDIT.md section 10.3)

| Frame Type | Button 1 (POST) | Button 2 (POST) | Button 3 (POST/Link) | Button 4 (Link) |
|------------|----------------|----------------|---------------------|----------------|
| **gm** | Send Daily GM (recordGM) | View GM Stats (getGMStats) | - | Open App |
| **quest** | Continue Quest (questProgress) | Verify Quest (verifyQuest) | - | Open Quests |
| **badge** | Check Badges (checkBadges) | Mint Badge (mintBadge) | - | Open Badges |
| **guild** | Join Guild (joinGuild) | View Guild (viewGuild) | - | Open Guilds |
| **referral** | View Referrals (viewReferrals) | Register Code (createReferral) | - | Open Referrals |
| **leaderboards** | Refresh Rank (refreshRank) | - | - | Open Leaderboard |
| **points** | View Balance (viewBalance) | Tip User (tipUser) | - | Open Points |
| **onchainstats** | Refresh Stats (refreshStats) | - | - | Open Stats |
| **verify** | Verify Quest (verifyQuest) | - | - | Open Verify |

---

## Implementation Steps

### Step 1: Update `buildFrameHtml()` Function
**File**: `app/api/frame/route.tsx` (lines ~1010-1150)

**Current Signature**:
```typescript
function buildFrameHtml(params: {
  title: string
  description: string
  image?: string
  url?: string
  buttons?: FrameButton[]  // Only supports link buttons
  // ...
})
```

**Updated Signature**:
```typescript
function buildFrameHtml(params: {
  title: string
  description: string
  image?: string
  url?: string
  buttons?: EnhancedFrameButton[]  // Supports POST + link buttons
  // ...
})

type EnhancedFrameButton = {
  label: string
  action?: 'post' | 'link' | 'post_redirect'
  target?: string
  post_url?: string  // Required for action: 'post'
}
```

**Changes Required**:
1. Update type definition to support `action` field
2. Modify button rendering logic to handle POST actions
3. Add `fc:frame:button:${idx}:action` meta tags
4. Add `fc:frame:button:${idx}:target` for POST URLs
5. Maintain backward compatibility for link-only buttons

---

### Step 2: Update Frame GET Handlers

**Files to Modify**: `app/api/frame/route.tsx` (lines 1332-2292)

#### 2.1 GM Frame (line ~2225)
```typescript
// BEFORE (Phase 1B.1)
buttons: [
  { label: 'Send GM', target: `${origin}/gm` }
]

// AFTER (Phase 1B.2)
buttons: [
  { 
    label: 'Send Daily GM', 
    action: 'post',
    target: '/api/frame',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'View GM Stats', 
    action: 'post',
    target: '/api/frame',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open App', 
    action: 'link',
    target: `${origin}/gm` 
  }
]
```

#### 2.2 Quest Frame (line ~1620)
```typescript
buttons: [
  { 
    label: 'Continue Quest', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Verify Quest', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open Quests', 
    action: 'link',
    target: frameBtnUrl 
  }
]
```

#### 2.3 Badge Frame (line ~2150)
```typescript
buttons: [
  { 
    label: 'Check Badges', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Mint Badge', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'View Badges', 
    action: 'link',
    target: href 
  }
]
```

#### 2.4 Points Frame (line ~1990)
```typescript
buttons: [
  { 
    label: 'View Balance', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Tip User', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open Points', 
    action: 'link',
    target: `${origin}/points` 
  }
]
```

#### 2.5 Leaderboards Frame (line ~977)
```typescript
buttons: [
  { 
    label: 'Refresh Rank', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open Leaderboard', 
    action: 'link',
    target: `${origin}/leaderboard` 
  }
]
```

#### 2.6 Guild Frame (line ~1655)
```typescript
buttons: [
  { 
    label: 'Join Guild', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'View Guild', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open Guilds', 
    action: 'link',
    target: guildUrl 
  }
]
```

#### 2.7 Referral Frame (line ~1720)
```typescript
buttons: [
  { 
    label: 'View Referrals', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Register Code', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open Referrals', 
    action: 'link',
    target: shareUrl 
  }
]
```

#### 2.8 OnchainStats Frame (line ~1770)
```typescript
buttons: [
  { 
    label: 'Refresh Stats', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open Stats', 
    action: 'link',
    target: hubUrl 
  }
]
```

#### 2.9 Verify Frame (line ~2260)
```typescript
buttons: [
  { 
    label: 'Verify Quest', 
    action: 'post',
    post_url: `${origin}/api/frame`,
  },
  { 
    label: 'Open Verify', 
    action: 'link',
    target: `${origin}/Quest` 
  }
]
```

---

### Step 3: Button Payload Handling

When a POST button is clicked, Farcaster will send:
```json
{
  "untrustedData": {
    "fid": 12345,
    "buttonIndex": 1,
    "castId": { ... },
    "inputText": ""
  },
  "trustedData": {
    "messageBytes": "..."
  }
}
```

**POST Handler Updates Required**:
1. Extract `buttonIndex` to determine which action triggered
2. Map button index → action name (recordGM, getGMStats, etc.)
3. Route to appropriate action handler
4. Return updated frame state or success message

**Example Mapping**:
```typescript
// GM Frame button index mapping
const gmButtonActions = {
  1: 'recordGM',     // Button 1: Send Daily GM
  2: 'getGMStats',   // Button 2: View GM Stats
  3: null            // Button 3: Open App (link, no action)
}

// In POST handler
const buttonIndex = payload.untrustedData?.buttonIndex
const frameType = payload.untrustedData?.frameType // Need to track this
const action = getActionForButton(frameType, buttonIndex)
```

---

## Testing Strategy

### Local Testing (localhost:3000)
1. Start dev server: `npm run dev`
2. Access frame: `http://localhost:3000/api/frame?type=gm`
3. Inspect HTML output:
   - Verify `fc:frame:button:1` meta tags present
   - Check `fc:frame:button:1:action` = "post"
   - Confirm `fc:frame:button:1:target` set correctly
4. Test POST endpoint receives button clicks
5. Verify session state persists

### Frame Validator Testing
Use Farcaster Frame Validator:
- URL: https://warpcast.com/~/developers/frames
- Paste frame URL: `https://gmeowhq.art/api/frame?type=gm`
- Verify buttons render correctly
- Test button clicks trigger POST actions
- Check response updates frame state

### Production Testing
1. Deploy to Vercel (wait 4-5 min)
2. Test each frame type on gmeowhq.art
3. Click interactive buttons, verify actions execute
4. Confirm link buttons still work
5. Check Vercel logs for errors

---

## Risk Assessment

### Low Risk
✅ Non-breaking change (adds buttons, doesn't remove functionality)  
✅ Backward compatible (existing link buttons unchanged)  
✅ POST handlers already tested (Phase 1B.1)  
✅ Can rollback by reverting button additions  

### Potential Issues
⚠️ **Button payload parsing**: Ensure `buttonIndex` correctly maps to actions  
⚠️ **Frame state tracking**: Need to pass frame context in POST requests  
⚠️ **4-button limit**: Prioritize most important actions if >4 buttons  

### Mitigation
- Test button index mapping thoroughly on localhost
- Add `frameType` to POST payload for context
- Follow priority order: Interactive POST > Link buttons
- Extensive validation before production push

---

## Success Metrics

**Phase 1B.2 Complete When**:
- [ ] All 9 frame types include interactive POST buttons
- [ ] Button clicks trigger correct POST actions
- [ ] Session state persists across interactions
- [ ] 4-button limit enforced correctly
- [ ] Backward compatibility confirmed (link buttons work)
- [ ] Production deployment successful
- [ ] Warpcast/Farcaster frame validator passes
- [ ] No errors in Vercel logs
- [ ] Response times remain under 1.5s

---

## Timeline Estimate

| Task | Duration | Status |
|------|----------|--------|
| Update buildFrameHtml() type definitions | 15 min | Not Started |
| Modify button rendering logic | 30 min | Not Started |
| Update GM frame buttons | 10 min | Not Started |
| Update Quest frame buttons | 10 min | Not Started |
| Update Badge frame buttons | 10 min | Not Started |
| Update remaining 6 frame types | 30 min | Not Started |
| Local testing (all frames) | 20 min | Not Started |
| Production deployment | 5 min | Not Started |
| Production testing | 20 min | Not Started |
| **Total** | **~2.5 hours** | **0% Complete** |

---

## Code Change Summary

**Files Modified**: 1
- `app/api/frame/route.tsx`

**Lines Changed**: ~200-300 lines
- Type definitions: ~20 lines
- buildFrameHtml() updates: ~50 lines
- Frame handler updates (9 types): ~150 lines

**New Files**: 0 (GI-13 compliance)

**Breaking Changes**: None

---

## Dependencies

### Phase 1B.1 Prerequisites (✅ Complete)
- POST action handlers for all 13 actions
- Session state management via frame_sessions table
- Rate limiting and input validation (GI-8)
- Supabase integration operational

### External Dependencies
- Farcaster Frames v2 specification
- Warpcast frame rendering engine
- Vercel deployment pipeline

---

## Rollback Plan

**If issues arise**:
1. Revert button additions: `git revert <commit-sha>`
2. Push to trigger Vercel redeployment (5 min)
3. POST handlers remain functional (Phase 1B.1 intact)
4. Link buttons continue working (backward compatibility)

**Zero downtime**: Both interactive and link buttons coexist, so removing interactive buttons doesn't break existing functionality.

---

## Next Steps After 1B.2

**Phase 1C Options**:
1. **Frame URL Restructure**: Implement clean URLs from FRAME-RESTRUCTURE-PLAN.md
2. **Real Data Integration**: Replace mock data with actual database/contract queries
3. **FID→Address Resolution**: Integrate Neynar API for automatic address lookup
4. **Enhanced UI**: Add dynamic OG images with user-specific data
5. **Performance Optimization**: Implement Redis caching for frequently accessed data

---

## References

- [SYSTEM-AUDIT.md](../Phase-1B1/SYSTEM-AUDIT.md) - Section 10.2 & 10.3 (button specifications)
- [Phase 1B.1 Completion Report](../Phase-1B1/PHASE-1B1-COMPLETION-REPORT.md) - Current state
- [Farcaster Frames Docs](https://docs.farcaster.xyz/reference/frames/spec) - Official specification
- [GI-13 Safe Patching Rules](../../../../planning/GI-13-SAFE-PATCHING.md) - Development guidelines

---

**Prepared by**: GitHub Copilot  
**Ready to Start**: ✅ Yes  
**Awaiting**: Approval to proceed  
**Date**: November 22, 2025
