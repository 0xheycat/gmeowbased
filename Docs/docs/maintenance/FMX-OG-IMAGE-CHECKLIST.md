# FMX — OG Image Validation Checklist

## Overview

Open Graph (OG) images are the visual previews shown when sharing links on social media platforms. For Farcaster frames, proper OG image configuration is critical for user engagement and compliance.

---

## MCP-Verified Requirements

**Source:** https://miniapps.farcaster.xyz/docs/specification  
**Last Verified:** November 19, 2025

**✅ All image specifications below are MCP-verified and CORRECT.**
**⚠️ Note:** Button requirements have changed (see FMX-BUTTON-VALIDATION-CHECKLIST.md)

### Frame Images (3:2 ratio)
- **Dimensions:** 1200×800 pixels
- **Aspect Ratio:** 3:2 (1.5:1)
- **Format:** PNG or JPEG
- **Size:** < 1MB (ideally < 500KB)
- **URL:** HTTPS absolute, max 1024 chars
- **MIME Type:** `image/png` or `image/jpeg`
- **Usage:** Primary frame image shown in feed

### OG Images (1.91:1 ratio)
- **Dimensions:** 1200×630 pixels
- **Aspect Ratio:** 1.91:1
- **Format:** PNG or JPEG
- **Size:** < 1MB (ideally < 500KB)
- **URL:** HTTPS absolute, max 1024 chars
- **MIME Type:** `image/png` or `image/jpeg`
- **Usage:** Social sharing (Twitter, LinkedIn, etc.)

### Splash Images (square)
- **Dimensions:** 200×200 pixels
- **Aspect Ratio:** 1:1
- **Format:** PNG (RGB, no alpha)
- **Size:** < 100KB
- **URL:** Max 32 chars (relative or absolute)
- **MIME Type:** `image/png`
- **Usage:** MiniApp launch splash screen

### Icon Images (square)
- **Dimensions:** 1024×1024 pixels
- **Aspect Ratio:** 1:1
- **Format:** PNG
- **Size:** < 200KB
- **URL:** HTTPS absolute
- **MIME Type:** `image/png`
- **Usage:** App icons, badges

---

## Pre-Generation Checklist

### Design Validation
- [ ] Design mockup approved
- [ ] Text legibility verified (min 14px font)
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Branding consistent
- [ ] No sensitive/personal information

### Technical Requirements
- [ ] Fonts bundled locally (no external CDN)
- [ ] Background color deterministic
- [ ] No client-side dependencies
- [ ] Generation logic server-side only
- [ ] Fallback image configured

### Content Validation
- [ ] Text fits within safe zones
- [ ] No truncated text
- [ ] Emojis render correctly
- [ ] Dynamic content sanitized
- [ ] Placeholder logic tested

---

## Generation Checklist

### Image Creation Process
- [ ] Use server-side rendering (Vercel OG, Canvas, etc.)
- [ ] Embed fonts directly in code
- [ ] Set deterministic background colors
- [ ] Optimize image compression
- [ ] Test generation time (< 500ms target)

### File Output Validation
- [ ] Correct dimensions verified (`identify image.png`)
- [ ] File size within limits (`ls -lh image.png`)
- [ ] Format correct (PNG/JPEG)
- [ ] No alpha channel (for splash images)
- [ ] Compression applied

### URL Configuration
- [ ] Absolute HTTPS URL used
- [ ] URL length < 1024 chars
- [ ] Query parameters sanitized
- [ ] Cache headers set (max-age 3600+)
- [ ] CDN configured (if applicable)

---

## Testing Checklist

### Local Testing

```bash
# Verify dimensions
identify public/og-image.png
# Expected: public/og-image.png PNG 1200x630 ...

identify public/frame-image.png
# Expected: public/frame-image.png PNG 1200x800 ...

identify public/splash.png
# Expected: public/splash.png PNG 200x200 ...

# Check file size
ls -lh public/*.png
# All images should be < 1MB

# Test URL accessibility
curl -I https://yourdomain.com/og-image.png
# Expected: HTTP/2 200, Content-Type: image/png

# Test generation endpoint
curl -I https://yourdomain.com/api/og?type=leaderboard
# Expected: HTTP/2 200, Content-Type: image/png
```

### Frame Validation

```bash
# Test frame endpoint
curl https://yourdomain.com/api/frame?type=leaderboard | grep -o 'fc:frame'
# Expected: fc:frame (meta tag present)

# Extract image URL from frame
curl -s https://yourdomain.com/api/frame?type=quest | \
  grep -o '"imageUrl":"[^"]*"' | \
  cut -d'"' -f4
# Expected: https://... (absolute HTTPS URL)
```

### Visual Inspection
- [ ] Image renders correctly in browser
- [ ] Text readable on mobile
- [ ] Colors match brand guidelines
- [ ] No artifacts or compression issues
- [ ] Responsive layout works

### Warpcast Testing
- [ ] Frame displays image in feed
- [ ] Image aspect ratio correct (3:2)
- [ ] Image loads quickly (< 2s)
- [ ] Image fallback works if generation fails
- [ ] Splash screen displays on launch (if MiniApp)

---

## Performance Checklist

### Generation Performance
- [ ] Image generation time < 500ms
- [ ] No blocking database queries
- [ ] Caching implemented (Redis/memory)
- [ ] CDN configured for static images
- [ ] Error handling graceful

### Monitoring
- [ ] Generation time tracked (DataDog/Sentry)
- [ ] Error rate monitored
- [ ] Cache hit rate tracked
- [ ] Image size distribution logged

---

## Compliance Checklist

### Farcaster Requirements
- [ ] Image URL in frame meta tag
- [ ] HTTPS enforced
- [ ] Correct aspect ratio (3:2 for frames)
- [ ] Size limits enforced (< 1MB)
- [ ] Fallback image configured

### Security
- [ ] No sensitive data in images
- [ ] User input sanitized (XSS prevention)
- [ ] Rate limiting on OG endpoints
- [ ] CORS configured correctly
- [ ] CSP headers allow image domains

### Accessibility
- [ ] Alt text provided in meta tags
- [ ] Color contrast sufficient
- [ ] Text not embedded in images (when possible)
- [ ] Fallback text available

---

## Common Issues & Solutions

### Issue: Image Too Large (> 1MB)
**Solution:**
- Compress using ImageMagick: `convert input.png -quality 85 output.png`
- Use PNG for graphics, JPEG for photos
- Reduce dimensions if possible

### Issue: Generation Timeout
**Solution:**
- Optimize font loading
- Cache generated images
- Use simpler layouts
- Increase serverless timeout

### Issue: Wrong Aspect Ratio
**Solution:**
- Verify target dimensions (1200x800 for frames, 1200x630 for OG)
- Check CSS/SVG scaling logic
- Test with multiple browsers

### Issue: Fonts Not Rendering
**Solution:**
- Bundle fonts locally in `/public/fonts/`
- Embed fonts as base64 in generation code
- Verify font file paths correct
- Use fallback system fonts

### Issue: Dynamic Content Breaks Layout
**Solution:**
- Add text truncation logic
- Set max character limits
- Test with edge cases (very long text)
- Use ellipsis for overflow

---

## Approval Sign-Off

**For production deployment:**

- [ ] **Designer Approval:** _____________ (Date: ________)
- [ ] **Engineer Approval:** _____________ (Date: ________)
- [ ] **QA Approval:** _____________ (Date: ________)

**Staging URL:** _______________________  
**Test Results:** _______________________  
**Performance Benchmarks:** _______________________

---

## References

- [Farcaster MiniApp Spec](https://miniapps.farcaster.xyz/docs/specification)
- [Open Graph Protocol](https://ogp.me/)
- [Vercel OG Image Generation](https://vercel.com/docs/functions/edge-functions/og-image-generation)
- [ImageMagick Documentation](https://imagemagick.org/)

---

**Checklist Version:** 1.0  
**Last Updated:** November 19, 2025  
**Maintained By:** Frame Engineering Team
