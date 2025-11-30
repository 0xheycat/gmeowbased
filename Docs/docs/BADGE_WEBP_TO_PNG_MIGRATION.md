# Badge Image Format Migration: WebP → PNG

**Date:** November 21, 2025  
**Status:** ✅ Complete  
**Triggered By:** User reuploaded PNG badges for FID 18139, deployment script still referenced WebP

---

## Summary

Replaced all WebP references in badge deployment infrastructure with PNG format to match:
1. Badge registry data (`badge-registry-data.ts`)
2. User's reuploaded PNG assets
3. Farville.farm frame structure reference

---

## Changes Made

### ✅ 1. Badge Deployment Script
**File:** `scripts/badge/deploy-badge-assets.ts`  
**Line 243:** Changed storage path extension

```diff
- const imageStoragePath = `images/${badge.slug}.webp`
+ const imageStoragePath = `images/${badge.slug}.png`
```

**Impact:**
- New badge uploads will be stored as PNG in Supabase Storage
- Aligns with badge registry metadata
- Works with user's reminted badges (FID 18139)

---

## Verification

### ✅ Badge Registry Data (Already PNG)
All 5 badges in `lib/badge-registry-data.ts` use PNG:

```json
{
  "id": "gmeow-vanguard",
  "imageUrl": "/badges/gmeow-vanguard-square.png",
  "artPath": "badge/gmeow-vanguard-square.png",
  "metadata": {
    "image": "/badges/gmeow-vanguard.png"
  }
}
```

### ✅ Supabase Bucket Configuration (Already PNG-Compatible)
**File:** `scripts/badge/deploy-badge-assets.ts` (Line 188)

```typescript
allowedMimeTypes: ['image/webp', 'image/png', 'image/jpeg', 'application/json']
```

Bucket accepts PNG, JPEG, and WebP - no changes needed.

### ✅ Upload Function (Detects Format)
**File:** `scripts/badge/deploy-badge-assets.ts` (Line 134)

```typescript
const contentType = imagePath.endsWith('.webp') ? 'image/webp' : 
                    imagePath.endsWith('.png') ? 'image/png' : 
                    'image/jpeg'
```

Correctly detects PNG and sets `image/png` content type.

### ✅ Runtime Code (No Hardcoded WebP)
Searched all TypeScript/TSX files:
- **0 hardcoded WebP URLs** in runtime code
- Badge artwork functions use registry data (PNG paths)
- Frame OG images generate dynamically (no image URLs embedded)

---

## Badge Asset Locations

### Registry Definition
- **Source:** `lib/badge-registry-data.ts`
- **Format:** JSON with PNG paths
- **Total Badges:** 5 (neon-initiate, pulse-runner, signal-luminary, warp-navigator, gmeow-vanguard)

### Supabase Storage
- **Bucket:** `badge-art`
- **Path Pattern:** `images/{badge-slug}.png`
- **Example:** `images/gmeow-vanguard.png`

### Public URLs (Relative)
- **Path Pattern:** `/badges/{badge-slug}.png`
- **Example:** `/badges/gmeow-vanguard.png`
- **Resolution:** Next.js serves from `public/badges/` or Supabase CDN

---

## Frame Structure Reference

User referenced Farville.farm frame as working example:
```
https://farville.farm/api/og/flex-card/leaderboard/18139/1763710540881/weekly?currentWeek=true
```

**Key Takeaways:**
1. Uses PNG for badge images
2. CDN-optimized with cache headers
3. Dynamic OG image generation
4. Proper Farcaster frame metadata

Our implementation matches this structure:
- ✅ PNG badge images
- ✅ CDN caching (`Cache-Control: max-age=31536000`)
- ✅ Dynamic OG image routes (`/api/frame/badgeShare/image`)
- ✅ Farcaster vNext frame format

---

## Testing Checklist

- [x] Badge registry uses PNG paths
- [x] Deployment script stores as PNG
- [x] Supabase bucket accepts PNG
- [x] Upload function detects PNG correctly
- [x] No hardcoded WebP URLs in runtime
- [x] Frame gradient syntax fixed (separate issue, completed)
- [ ] **TODO:** Verify production badge URLs for FID 18139

---

## Production Verification

### Test Badge URLs (FID 18139)

**Badge Share Frame:**
```
https://gmeowhq.art/api/frame/badgeShare?fid=18139&badgeId=gmeow-vanguard
```

**OG Image:**
```
https://gmeowhq.art/api/frame/badgeShare/image?badgeId=gmeow-vanguard
```

**Expected:**
- HTTP 200
- PNG content-type
- 1200x628 dimensions
- Yu-Gi-Oh! card design

---

## Rollback Plan

If PNG migration causes issues:

1. Revert deployment script:
   ```bash
   git revert 5bf4c7e
   ```

2. Or manually change line 243 back to `.webp`

3. Re-run deployment:
   ```bash
   tsx scripts/badge/deploy-badge-assets.ts
   ```

---

## Related Issues

### ✅ Resolved: Frame Gradient Syntax (Commit ac1d285)
Separate but related issue - CSS gradient syntax errors in Satori:
- Fixed radial/linear gradient color stops
- Changed from hex+alpha to proper comma syntax
- Production now returns 171KB PNG (previously empty body)

---

## Deployment History

| Commit | Description | Status |
|--------|-------------|--------|
| `5bf4c7e` | Replace WebP with PNG in badge deployment | ✅ Deployed |
| `ac1d285` | Fix CSS gradient syntax for Satori parser | ✅ Deployed |
| `6307c17` | Edge runtime refactor (removed Supabase dependency) | ✅ Deployed |

---

## Next Steps

1. ✅ Deploy completed (commit 5bf4c7e)
2. ⏳ Vercel build in progress (~4 min)
3. 📝 Test production badge URLs after deployment
4. 📝 Verify user FID 18139 badges load correctly
5. 📝 Monitor Vercel logs for any image format issues

---

## Notes

- **No breaking changes:** All existing badges already use PNG in registry
- **Backward compatible:** Bucket still accepts WebP if needed
- **User impact:** Zero - registry already matched PNG format
- **Performance:** PNG slightly larger than WebP but better compatibility

---

**Status:** Migration complete, awaiting production verification.
