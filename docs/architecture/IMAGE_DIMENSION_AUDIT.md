# Image Dimension Audit Report - VIOLATIONS FOUND

**Date:** November 19, 2025  
**Status:** 🚨 CRITICAL VIOLATIONS DETECTED  
**Action Required:** IMMEDIATE FIX NEEDED

---

## Critical Violations

### 1. ❌ og-image.png - WRONG DIMENSIONS
- **Current:** 1376 x 768  
- **Ratio:** 1.79:1  
- **Required:** 1200 x 630 (1.91:1) OR maintain 3:2 ratio for frames
- **Status:** ❌ **FAIL** - Not standard OG ratio, not frame ratio
- **Impact:** May render incorrectly in social media previews and frames

### 2. ❌ splash.png - WRONG SIZE
- **Current:** 1024 x 1024
- **Required:** 200 x 200 (exact)
- **Status:** ❌ **FAIL** - 512% too large
- **Impact:** **CRITICAL** - Mobile miniapp may not display splash screen correctly

### 3. ❌ icon.png - WRONG SIZE  
- **Current:** 408 x 612
- **Required:** 1024 x 1024 (square, no alpha)
- **Status:** ❌ **FAIL** - Wrong aspect ratio and size
- **Impact:** Manifest non-compliant, app store listing may fail

### 4. ❌ hero.png - POTENTIALLY WRONG RATIO
- **Current:** 1280 x 720
- **Ratio:** 1.78:1 (16:9)
- **Required (if used in frames):** 3:2 ratio (1.5:1)
- **Status:** ⚠️ **WARNING** - Check usage context
- **Impact:** May not render correctly if used in frame embeds

---

## Passing Images

### ✅ Badge Images
- **Size:** 1024 x 1024
- **Format:** WebP
- **Status:** ✅ PASS (square badges)

### ✅ Chain Icons
- **celo.png:** 2000 x 2000 (square)
- **Status:** ✅ PASS

---

## Required Actions

### Priority 1: IMMEDIATE (Breaks Mobile)
1. **Replace splash.png**
   - Resize from 1024x1024 → 200x200
   - Maintain PNG format
   - Remove alpha channel
   - Path: `/public/splash.png`

### Priority 2: HIGH (Non-Compliant)
2. **Replace icon.png**
   - Resize from 408x612 → 1024x1024
   - Crop to square aspect ratio
   - Remove alpha channel
   - Path: `/public/icon.png`

3. **Replace og-image.png**
   - Option A: Resize to 1200x630 (standard OG)
   - Option B: Resize to 1200x800 (3:2 for frames)
   - Recommend: Generate BOTH
     - `og-image.png` = 1200x630 (for social)
     - `frame-image.png` = 1200x800 (for frame embeds)

### Priority 3: MEDIUM (Audit Needed)
4. **Check hero.png usage**
   - If used in frames: Regenerate at 3:2 ratio (1200x800)
   - If used for marketing only: Current size OK

---

## Image Generation Script

```bash
#!/bin/bash
# Fix image dimensions using ImageMagick

# 1. Generate 200x200 splash image
convert public/logo.png -resize 200x200 -background "#0B0A16" -flatten public/splash.png

# 2. Generate 1024x1024 icon (square, no alpha)
convert public/logo.png -resize 1024x1024 -gravity center -extent 1024x1024 -background white -flatten public/icon.png

# 3. Generate 1200x630 OG image
convert public/logo.png -resize 1200x630 -gravity center -extent 1200x630 public/og-image.png

# 4. Generate 1200x800 frame image (NEW)
convert public/logo.png -resize 1200x800 -gravity center -extent 1200x800 public/frame-image.png
```

---

## Verification Checklist

After regenerating images:
- [ ] Run: `file public/splash.png` → Must show "200 x 200"
- [ ] Run: `file public/icon.png` → Must show "1024 x 1024"
- [ ] Run: `file public/og-image.png` → Must show "1200 x 630"
- [ ] Run: `file public/frame-image.png` → Must show "1200 x 800"
- [ ] Verify all PNG images have no alpha channel
- [ ] Test splash screen on mobile Warpcast
- [ ] Test frame rendering in feed

---

## Impact Assessment

| Image | Current | Required | Impact Level | User Visible |
|-------|---------|----------|--------------|--------------|
| splash.png | 1024x1024 | 200x200 | 🔴 CRITICAL | Yes - mobile loading |
| icon.png | 408x612 | 1024x1024 | 🟠 HIGH | Yes - app store |
| og-image.png | 1376x768 | 1200x630 | 🟡 MEDIUM | Yes - social previews |
| hero.png | 1280x720 | Check usage | 🟡 MEDIUM | Depends on usage |

---

## Next Steps

1. ✅ Document created - violations identified
2. ⏳ Generate corrected images
3. ⏳ Replace files in /public directory
4. ⏳ Update frame routes to use correct images
5. ⏳ Test on mobile devices
6. ⏳ Verify Warpcast rendering

**Estimated Fix Time:** 30 minutes  
**Testing Time:** 15 minutes  
**Total:** 45 minutes to full compliance
