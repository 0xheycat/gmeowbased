# Stage 5.9: Fix Main Frame Route (/api/frame)

**Date:** November 19, 2025  
**Status:** ✅ FIXED (Awaiting Deployment)  
**Priority:** CRITICAL

---

## Problem

The main frame endpoint `/api/frame/route.tsx` was still using the OLD broken specification:
- ❌ `version: "1"` (MCP spec value, but doesn't work)
- ❌ `type: "link"` (opens external browser, doesn't launch mini app)
- ❌ Missing `name` field (required by spec)
- ❌ Missing splash screen properties

**Live URL Tested:**
```
https://gmeowhq.art/api/frame?type=gm&user=0x7539472DAd6a371e6E152C5A203469aA32314130
```

**Result:** Button opens external browser instead of launching mini app in Warpcast ❌

---

## Root Cause

The code had an INCORRECT comment that said:
```tsx
// CRITICAL: Use 'link' action for opening miniapp from feed (external context)
// 'launch_frame' is ONLY for embedded miniapps opening other miniapps
```

This was **WRONG**. Based on the working Farville implementation:
- `launch_frame` should be used to launch mini app within Warpcast
- `link` just opens external browser tab

---

## Fix Applied

**File:** `app/api/frame/route.tsx`  
**Lines:** 1151-1168

### Before (BROKEN)
```tsx
const frameEmbedMeta = primaryButton && frameOrigin && imageEsc ? {
  version: '1',
  imageUrl: resolvedImage,
  button: {
    title: primaryButton.label,
    action: {
      type: 'link',
      url: primaryButton.target || frameOrigin
    }
  }
} : null
```

### After (FIXED)
```tsx
const frameEmbedMeta = primaryButton && frameOrigin && imageEsc ? {
  version: 'next',  // ✅ Farville working spec
  imageUrl: resolvedImage,
  button: {
    title: primaryButton.label,
    action: {
      type: 'launch_frame',  // ✅ Launches mini app
      name: 'Gmeowbased',    // ✅ Required field
      url: primaryButton.target || frameOrigin,
      splashImageUrl: frameOrigin ? `${frameOrigin}/logo.png` : undefined,
      splashBackgroundColor: '#000000'
    }
  }
} : null
```

---

## Changes Summary

| Component | Before | After | Status |
|-----------|--------|-------|--------|
| Version | `"1"` | `"next"` | ✅ Fixed |
| Action Type | `"link"` | `"launch_frame"` | ✅ Fixed |
| Name Field | Missing | `"Gmeowbased"` | ✅ Added |
| Splash Image | Missing | `/logo.png` | ✅ Added |
| Splash BG | Missing | `#000000` | ✅ Added |

---

## Verification

### TypeScript Compilation
```bash
$ pnpm tsc --noEmit
# Output: (empty - 0 errors) ✅
```

### Frame Endpoints Fixed

All 3 frame routes now use the working Farville specification:

1. ✅ `/api/frame/badge` (2 embeds) - Fixed in Stage 5.8.9
2. ✅ `/api/frame/badgeShare` (2 embeds) - Fixed in Stage 5.8.9
3. ✅ `/api/frame` (main route) - **Fixed in Stage 5.9**

---

## Testing Instructions

### 1. Deploy to Production
```bash
vercel --prod
# or
git push origin main  # if auto-deployment enabled
```

### 2. Test Frame URL
```
https://gmeowhq.art/api/frame?type=gm&user=0x7539472DAd6a371e6E152C5A203469aA32314130
```

### 3. Create Test Cast in Warpcast

**Compose URL:**
```
https://farcaster.xyz/~/compose?text=GM+sent+on+Base%21+Join+me+on+GMEOW.&embeds[]=https://gmeowhq.art/api/frame?type=gm&user=0x7539472DAd6a371e6E152C5A203469aA32314130
```

### 4. Critical Tests

**Visual Check:**
- [ ] Frame image displays (1200x800, 3:2 ratio)
- [ ] Button text visible: "Open GM Ritual"
- [ ] Button is clickable

**🚨 CRITICAL TEST - Button Behavior:**
- [ ] Click button and verify it **launches mini app** (NOT external browser)
- [ ] Splash screen displays (logo with black background)
- [ ] Mini app loads **within Warpcast** (not external tab)
- [ ] Can navigate back to cast

**Multi-Device Testing:**
- [ ] iPhone (iOS) - Test button launch
- [ ] Android - Test button launch
- [ ] Desktop (Warpcast web) - Test button launch

---
# convert public/splash.png -resize 1200x800! -quality 95 public/splash-new.png && mv public/splash-new.png public/splash.png && identify public/splash.png

## Expected Frame JSON After Deployment

```json
{
  "version": "next",
  "imageUrl": "https://gmeowhq.art/frame-image.png",
  "button": {
    "title": "Open GM Ritual",
    "action": {
      "type": "launch_frame",
      "name": "Gmeowbased",
      "url": "https://gmeowhq.art/gm",
      "splashImageUrl": "https://gmeowhq.art/logo.png",
      "splashBackgroundColor": "#000000"
    }
  }
}
```

---

## Current Status (Pre-Deployment)

**Live site still shows:**
```json
{
  "version": "1",
  "imageUrl": "https://gmeowhq.art/frame-image.png",
  "button": {
    "title": "Open GM Ritual",
    "action": {
      "type": "link",
      "url": "https://gmeowhq.art/gm"
    }
  }
}
```

❌ This is why the button doesn't work - needs deployment!

---

## Files Modified

- `app/api/frame/route.tsx` - Frame embed generation (lines 1151-1168)

---

## Related Stages

- **Stage 5.8.8:** Analyzed Farville working implementation
- **Stage 5.8.9:** Fixed badge/badgeShare frame endpoints
- **Stage 5.9:** Fixed main frame route (this stage)
- **Stage 5.10:** Production deployment & Warpcast testing (next)

---

## References

- Working Farville Frame: https://farville.farm
- MCP Specification: https://miniapps.farcaster.xyz/docs/specification
- Farville Analysis: `docs/maintenance/reports/FRAME-ENDPOINT-FIX-ANALYSIS.md`
- Stage 5.8.9 Completion: `docs/maintenance/reports/STAGE-5.8.9-COMPLETION-FARVILLE-SPEC.md`

---

## Next Steps

1. **Deploy to production** with `vercel --prod`
2. **Test frame in Warpcast** - verify button launches mini app
3. **If successful:** Move to Stage 5.11 (Playwright E2E Testing)
4. **If button still broken:** Debug and verify deployment

---

**Completion:** Stage 5.9 code changes complete ✅  
**Awaiting:** Production deployment and Warpcast testing  
**Success Criteria:** Button launches mini app within Warpcast (not external browser)
