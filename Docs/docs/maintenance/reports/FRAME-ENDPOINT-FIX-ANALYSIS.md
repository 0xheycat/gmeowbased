# Frame Endpoint Fix Analysis — Why Our Frames Don't Work

**Date:** November 19, 2025  
**Issue:** Our frame buttons don't work in Warpcast casts  
**Root Cause:** Using wrong action type and missing required fields

---

## Working Example (Farville)

```json
{
  "version": "next",  // Note: They use "next" (non-standard, but works)
  "imageUrl": "https://farville.farm/api/og/...",
  "button": {
    "title": "Join my Feud 🧑‍🌾",
    "action": {
      "type": "launch_frame",      // ✅ Launches mini app
      "name": "Farville",            // ✅ Required field
      "url": "https://farville.farm/flex-card/...",
      "splashImageUrl": "https://farville.farm/images/splash.png",
      "splashBackgroundColor": "#f7f7f7"
    }
  }
}
```

---

## Our Current Implementation (BROKEN)

```typescript
// app/api/frame/badge/route.ts
const badgeEmbed = {
  version: '1',  // ✅ Correct per MCP spec
  imageUrl: `${getBaseUrl(request)}/api/frame/badge/image?fid=${fid}...`,
  button: {
    title: 'View Badge Inventory',
    action: {
      type: 'link',  // ❌ WRONG - just opens URL, doesn't launch mini app
      url: `${getBaseUrl(request)}/profile/${fid}/badges`
      // ❌ MISSING: name field (REQUIRED for launch_frame)
    }
  }
}
```

---

## The Problem

### Issue #1: Wrong Action Type
**Current:** `type: 'link'`  
**Problem:** This just opens an external URL in a browser, NOT in the mini app  
**Fix:** Change to `type: 'launch_frame'` to launch mini app

### Issue #2: Missing Required Field
**Current:** No `name` field  
**Problem:** MCP spec REQUIRES `action.name` field for launch_frame  
**Fix:** Add `name: 'Gmeowbased'`

### Issue #3: Missing Splash Screen
**Current:** No splash screen properties  
**Problem:** Better UX to show splash screen while loading  
**Fix:** Add `splashImageUrl` and `splashBackgroundColor`

---

## Correct Implementation

```typescript
const badgeEmbed = {
  version: '1',  // Per MCP spec
  imageUrl: `${getBaseUrl(request)}/api/frame/badge/image?fid=${fid}&badgeId=${latestBadge.badgeId}`,
  button: {
    title: 'View Badge Inventory',
    action: {
      type: 'launch_frame',  // ✅ Launches mini app
      name: 'Gmeowbased',     // ✅ Required field
      url: `${getBaseUrl(request)}/profile/${fid}/badges`,
      splashImageUrl: `${getBaseUrl(request)}/logo.png`,  // 200x200px
      splashBackgroundColor: '#000000'
    }
  }
}
```

---

## Files That Need Fixing

1. `app/api/frame/badge/route.ts` - Badge showcase frame
2. `app/api/frame/badgeShare/route.ts` - Badge share frame
3. `app/api/frame/identify/route.ts` - Identity frame (if exists)
4. Any other frame endpoints

---

## Action Items

### Priority 1: Fix Action Types
- [ ] Change all `type: 'link'` to `type: 'launch_frame'`
- [ ] Add required `name: 'Gmeowbased'` to all actions
- [ ] Ensure URLs point to valid mini app pages

### Priority 2: Add Splash Screens
- [ ] Create 200x200px splash image at `/public/splash.png`
- [ ] Add `splashImageUrl` to all embeds
- [ ] Add `splashBackgroundColor` (use brand color)

### Priority 3: Test in Warpcast
- [ ] Deploy fixes to staging
- [ ] Create test cast with frame
- [ ] Verify button launches mini app (not external browser)
- [ ] Verify splash screen displays
- [ ] Test on mobile and desktop

---

## MCP Spec Reference

**Official Specification:** https://miniapps.farcaster.xyz/docs/specification

**Mini App Embed Schema:**
```json
{
  "version": "1",  // String "1"
  "imageUrl": "string",  // Max 1024 chars, 3:2 ratio
  "button": {
    "title": "string",  // Max 32 chars
    "action": {
      "type": "launch_frame" | "view_token",  // ONLY these 2
      "name": "string",  // REQUIRED - Mini App name
      "url": "string",   // Optional, max 1024 chars
      "splashImageUrl": "string",  // Max 32 chars, 200x200px
      "splashBackgroundColor": "string"  // Hex color
    }
  }
}
```

**Key Requirements:**
- ✅ `version: "1"` (string)
- ✅ `action.type` must be `launch_frame` or `view_token`
- ✅ `action.name` is REQUIRED (Mini App name)
- ✅ `action.url` is optional (defaults to current page)
- ✅ Splash screen properties are optional but recommended

---

## Why Farville Uses "next"

Farville uses `"version": "next"` which is NOT in the official spec. This may be:
- An experimental version they're testing
- A non-standard extension that Warpcast accepts
- Legacy code from before spec was finalized

**Our approach:** Use `"version": "1"` per official spec, but fix the action types and required fields which are the real issues.

---

**Status:** Ready to implement fixes  
**Next Step:** Update frame endpoints with correct action types and required fields
