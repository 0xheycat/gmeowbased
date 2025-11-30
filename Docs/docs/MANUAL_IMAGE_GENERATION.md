# Manual Image Generation Guide

**Date:** November 19, 2025  
**Purpose:** Generate spec-compliant images for Farcaster frames  
**Status:** MANUAL STEPS REQUIRED

---

## Critical Violations to Fix

1. ❌ **splash.png** - Currently 1024x1024, needs to be 200x200
2. ❌ **icon.png** - Currently 408x612, needs to be 1024x1024 square
3. ❌ **og-image.png** - Currently 1376x768, needs to be 1200x630

---

## Option 1: Online Image Resizer (Easiest)

### Use: https://www.iloveimg.com/resize-image

**Step-by-Step:**

1. **Generate splash.png (200x200)**
   - Upload `public/logo.png`
   - Resize to 200x200 pixels
   - Select "Fit" mode with background color #0B0A16
   - Download as PNG
   - Save to `public/splash.png`

2. **Generate icon.png (1024x1024)**
   - Upload `public/logo.png`
   - Resize to 1024x1024 pixels
   - Select "Fit" mode with white background
   - Download as PNG (flatten to remove alpha)
   - Save to `public/icon.png`

3. **Generate og-image.png (1200x630)**
   - Upload `public/logo.png`  
   - Resize to 1200x630 pixels
   - Select "Fit" mode with background #0B0A16
   - Download as PNG
   - Save to `public/og-image.png`

4. **Generate frame-image.png (1200x800) - NEW**
   - Upload `public/logo.png`
   - Resize to 1200x800 pixels
   - Select "Fit" mode with background #0B0A16
   - Download as PNG
   - Save to `public/frame-image.png`

---

## Option 2: GIMP (Free Desktop App)

### Steps for each image:

1. Open GIMP
2. File → Open → Select `public/logo.png`
3. Image → Scale Image
4. Enter target dimensions (see specs below)
5. Select "Cubic" interpolation
6. Layer → Flatten Image (removes alpha)
7. File → Export As → PNG
8. Save to `public/[filename].png`

**Target Dimensions:**
- splash.png: 200 x 200
- icon.png: 1024 x 1024
- og-image.png: 1200 x 630
- frame-image.png: 1200 x 800

---

## Option 3: Figma/Canva (Design Tools)

### Figma:
1. Create new frame with exact dimensions
2. Import logo
3. Center and scale to fit
4. Set background fill to #0B0A16
5. Export as PNG

### Canva:
1. Create custom design with exact dimensions
2. Upload logo
3. Center and fit within canvas
4. Set background to #0B0A16
5. Download as PNG

---

## Option 4: ImageMagick (Command Line)

If ImageMagick is installed:

```bash
cd /home/heycat/Desktop/2025/Gmeowbased/public

# Generate splash.png (200x200)
convert logo.png -resize 200x200 -background "#0B0A16" -gravity center -extent 200x200 -flatten splash.png

# Generate icon.png (1024x1024)
convert logo.png -resize 1024x1024 -background white -gravity center -extent 1024x1024 -flatten icon.png

# Generate og-image.png (1200x630)
convert logo.png -resize 1200x630 -background "#0B0A16" -gravity center -extent 1200x630 -flatten og-image.png

# Generate frame-image.png (1200x800)
convert logo.png -resize 1200x800 -background "#0B0A16" -gravity center -extent 1200x800 -flatten frame-image.png
```

Install ImageMagick:
```bash
# Ubuntu/Debian
sudo apt-get install imagemagick

# macOS
brew install imagemagick

# Windows
# Download from https://imagemagick.org/script/download.php
```

---

## Verification Steps

After generating images, verify dimensions:

```bash
cd /home/heycat/Desktop/2025/Gmeowbased

# Check dimensions
file public/splash.png      # Should show: "200 x 200"
file public/icon.png        # Should show: "1024 x 1024"  
file public/og-image.png    # Should show: "1200 x 630"
file public/frame-image.png # Should show: "1200 x 800"

# Check for alpha channel (should show "RGB" not "RGBA")
file public/splash.png | grep -i "rgb"
file public/icon.png | grep -i "rgb"
```

---

## Quality Checklist

After generating, verify:

- [ ] splash.png is exactly 200x200
- [ ] icon.png is exactly 1024x1024 (square)
- [ ] og-image.png is 1200x630 (1.91:1 ratio)
- [ ] frame-image.png is 1200x800 (3:2 ratio)
- [ ] All images are PNG format
- [ ] No images have alpha channel (all flattened)
- [ ] Background color is #0B0A16 (dark purple)
- [ ] Logo is centered and properly scaled
- [ ] File sizes are reasonable (<500KB each)

---

## Testing After Generation

1. **Test splash screen:**
   - Open Warpcast mobile app
   - Launch miniapp
   - Verify splash.png displays during load

2. **Test OG preview:**
   - Share gmeowhq.art link on Twitter/Discord
   - Verify og-image.png renders correctly

3. **Test frame image:**
   - View frame in Warpcast feed
   - Verify frame-image.png displays (3:2 ratio)

4. **Test icon:**
   - Check manifest at /.well-known/farcaster.json
   - Verify icon.png loads in app stores

---

## Fallback: Use Existing Images Temporarily

If unable to generate immediately, create symlinks as temporary workaround:

```bash
cd /home/heycat/Desktop/2025/Gmeowbased/public

# Backup originals
mv splash.png splash.png.backup
mv icon.png icon.png.backup
mv og-image.png og-image.png.backup

# Use logo.png as temporary fallback (will be wrong size)
cp logo.png splash.png
cp logo.png icon.png  
cp logo.png og-image.png

# Document that these are temporary
echo "TEMPORARY: Need proper dimensions" > .image-generation-pending
```

**⚠️ WARNING:** This is NOT compliant and should only be used temporarily!

---

## Next Steps After Generation

1. Replace images in `/public` directory
2. Verify dimensions with `file` command
3. Update frame routes to use `frame-image.png` for embeds
4. Test on mobile Warpcast
5. Update todo list Stage 5.7.2 to completed
6. Commit changes with message:
   ```
   fix: Generate spec-compliant images (Stage 5.7.2)
   
   Per official Farcaster miniapp specification:
   - splash.png: 200x200 (exact)
   - icon.png: 1024x1024 (square, no alpha)
   - og-image.png: 1200x630 (1.91:1)
   - frame-image.png: 1200x800 (3:2, NEW)
   
   Source: https://miniapps.farcaster.xyz/docs/specification
   MCP-Verified: November 19, 2025
   ```

---

**Estimated Time:** 15-30 minutes depending on method chosen  
**Recommended:** Option 1 (Online) or Option 4 (ImageMagick) for best results
