# Frame & OG Image Standards - Official Specification

**Date:** November 19, 2025  
**Source:** Official Farcaster Miniapp Specification  
**Authority:** https://miniapps.farcaster.xyz/docs/specification  
**Status:** MCP-VERIFIED ✅

---

## Executive Summary

This document contains the **OFFICIAL** image and Open Graph requirements for Farcaster frames and miniapp embeds, verified against the authoritative Farcaster specification. All implementations MUST comply with these standards.

**⚠️ CRITICAL:** These specifications are sourced directly from MCP servers and official Farcaster documentation. Local code assumptions are NOT valid - always verify against this document.

---

## 1. Frame Embed Image Requirements

### 1.1 Image URL (`imageUrl`)
**Schema Field:** `imageUrl` (required)

| Requirement | Value |
|------------|--------|
| **Required** | ✅ Yes |
| **Max Length** | 1024 characters |
| **Aspect Ratio** | **3:2 (1.5:1)** |
| **Format** | PNG, JPEG, WebP, GIF |
| **Protocol** | HTTPS only |

**Example:** `https://gmeowhq.art/og-image.png`

### 1.2 Aspect Ratio Validation
```typescript
// CORRECT: 3:2 aspect ratio examples
1200 x 800   // ✅ 1200/800 = 1.5
900 x 600    // ✅ 900/600 = 1.5
1800 x 1200  // ✅ 1800/1200 = 1.5

// INCORRECT: Wrong aspect ratio
1200 x 630   // ❌ 1200/630 = 1.90 (16:9 OG standard, NOT frame standard)
1024 x 1024  // ❌ Square (1:1)
```

**⚠️ CRITICAL WARNING:** 
- Open Graph images are **1.91:1** (1200x630)
- Frame embed images are **3:2** (1200x800)
- These are **DIFFERENT** requirements!

---

## 2. Open Graph Image Requirements

### 2.1 Standard OG Image (`og:image`)
**Schema Field:** `og:image` meta tag

| Requirement | Value |
|------------|--------|
| **Required** | Recommended |
| **Aspect Ratio** | **1.91:1** (or 16:9) |
| **Recommended Size** | 1200 x 630 pixels |
| **Min Size** | 200 x 200 pixels |
| **Format** | PNG, JPEG |
| **Max File Size** | 8 MB |

**Example:**
```html
<meta property="og:image" content="https://gmeowhq.art/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

### 2.2 Manifest OG Image (`ogImageUrl`)
**Schema Field:** `ogImageUrl` (optional in manifest)

| Requirement | Value |
|------------|--------|
| **Required** | No (optional) |
| **Size** | 1200 x 630 pixels |
| **Aspect Ratio** | 1.91:1 |
| **Format** | PNG |

---

## 3. Splash Screen Image Requirements

### 3.1 Splash Image (`splashImageUrl`)
**Schema Field:** `splashImageUrl` (optional)

| Requirement | Value |
|------------|--------|
| **Required** | No (optional, but recommended) |
| **Size** | **200 x 200 pixels** (exact) |
| **Aspect Ratio** | 1:1 (square) |
| **Format** | PNG (no alpha) |
| **Max Path Length** | 32 characters (!!) |
| **Usage** | Loading screen during miniapp launch |

**Example:** `https://gmeowhq.art/splash.png`

**⚠️ CRITICAL:** 
- Must be **exactly 200x200px**
- Path length limit is only **32 characters** (very short!)
- Use short file names like `/splash.png`, `/icon.png`

### 3.2 Splash Background Color (`splashBackgroundColor`)
**Schema Field:** `splashBackgroundColor` (optional)

| Requirement | Value |
|------------|--------|
| **Required** | No (optional) |
| **Format** | Hex color code |
| **Example** | `#0B0A16`, `#f5f0ec` |

---

## 4. Manifest Icon Image Requirements

### 4.1 App Icon (`iconUrl`)
**Schema Field:** `iconUrl` (required in manifest)

| Requirement | Value |
|------------|--------|
| **Required** | ✅ Yes (in manifest) |
| **Size** | **1024 x 1024 pixels** (exact) |
| **Aspect Ratio** | 1:1 (square) |
| **Format** | PNG |
| **Alpha Channel** | **Not allowed** (no transparency) |
| **Max URL Length** | 1024 characters |

**Example:** `https://gmeowhq.art/icon.png`

---

## 5. Button Specifications

### 5.1 Button Title
**Schema Field:** `button.title`

| Requirement | Value |
|------------|--------|
| **Required** | ✅ Yes |
| **Max Length** | **32 characters** |
| **Format** | String (UTF-8, emojis allowed) |

**Examples:**
```typescript
"✨ Enter Gmeow"       // ✅ 13 chars (with emoji)
"🎮 Launch Game"       // ✅ 12 chars
"View Badge Inventory" // ✅ 21 chars
"This is a very long button text that exceeds limit" // ❌ 51 chars (TOO LONG)
```

### 5.2 Action Type
**Schema Field:** `button.action.type`

| Type | Use Case | When to Use |
|------|----------|-------------|
| `link` | Open external URL | Feed → miniapp, external links |
| `launch_frame` | Launch embedded miniapp | Miniapp → miniapp (within host) |
| `view_token` | View token details | Token-specific actions |

**⚠️ CRITICAL:** 
- Use `link` for opening miniapp from **external context** (feed, cast)
- Use `launch_frame` ONLY for **embedded miniapps** opening other miniapps

---

## 6. Complete Frame Embed Schema

### 6.1 Minimal Valid Frame Embed
```json
{
  "version": "1",
  "imageUrl": "https://example.com/image.png",
  "button": {
    "title": "Open App",
    "action": {
      "type": "link",
      "url": "https://example.com"
    }
  }
}
```

### 6.2 Full Frame Embed (with splash)
```json
{
  "version": "1",
  "imageUrl": "https://example.com/og-3-2.png",
  "button": {
    "title": "🚀 Launch",
    "action": {
      "type": "launch_frame",
      "name": "My App",
      "url": "https://example.com",
      "splashImageUrl": "https://example.com/splash.png",
      "splashBackgroundColor": "#0B0A16"
    }
  }
}
```

---

## 7. Image Generation Guidelines

### 7.1 Creating 3:2 Frame Images
```typescript
// Recommended sizes for frame images
const FRAME_IMAGE_SIZES = {
  small: { width: 600, height: 400 },    // 3:2
  medium: { width: 900, height: 600 },   // 3:2
  large: { width: 1200, height: 800 },   // 3:2
  xlarge: { width: 1800, height: 1200 }, // 3:2
}

// Calculate height from width
const frameHeight = Math.floor(width / 1.5) // 3:2 = 1.5 ratio
```

### 7.2 Creating OG Images
```typescript
// Standard OG image size
const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630, // 1.91:1 ratio
}

// Calculate height from width
const ogHeight = Math.floor(width / 1.91) // 1.91:1 ratio
```

### 7.3 Creating Splash Images
```typescript
// Splash image MUST be exact size
const SPLASH_IMAGE_SIZE = {
  width: 200,
  height: 200, // Always square (1:1)
}

// NO resizing - must be generated at exact size
```

---

## 8. Validation Checklist

### 8.1 Frame Embed Validation
- [ ] `imageUrl` present and HTTPS
- [ ] `imageUrl` length ≤ 1024 chars
- [ ] Image aspect ratio is 3:2 (1.5:1)
- [ ] `button.title` present
- [ ] `button.title` length ≤ 32 chars
- [ ] `button.action.type` is valid (`link`, `launch_frame`, `view_token`)
- [ ] `button.action.url` present for `link` type
- [ ] `version` is string `"1"`

### 8.2 Splash Screen Validation
- [ ] `splashImageUrl` is exactly 200x200px
- [ ] `splashImageUrl` path length ≤ 32 chars
- [ ] `splashBackgroundColor` is valid hex code
- [ ] PNG format with no alpha channel

### 8.3 Open Graph Validation
- [ ] `og:image` is 1200x630 or similar 1.91:1 ratio
- [ ] `og:title` present
- [ ] `og:description` present
- [ ] All OG tags use `property` attribute (not `name`)

---

## 9. Common Mistakes & Fixes

### 9.1 Wrong Image Aspect Ratio
**❌ WRONG:**
```json
{
  "imageUrl": "https://example.com/og-image.png" // 1200x630 (OG ratio)
}
```

**✅ CORRECT:**
```json
{
  "imageUrl": "https://example.com/frame-image.png" // 1200x800 (3:2 ratio)
}
```

### 9.2 Splash Image Too Large
**❌ WRONG:**
```json
{
  "splashImageUrl": "https://example.com/icon-1024.png" // 1024x1024
}
```

**✅ CORRECT:**
```json
{
  "splashImageUrl": "https://example.com/splash.png" // 200x200
}
```

### 9.3 Splash URL Too Long
**❌ WRONG:**
```json
{
  "splashImageUrl": "https://example.com/assets/images/splash-screen-loading.png" // 51 chars
}
```

**✅ CORRECT:**
```json
{
  "splashImageUrl": "https://example.com/splash.png" // 27 chars
}
```

### 9.4 Button Title Too Long
**❌ WRONG:**
```json
{
  "title": "Click Here To Launch Our Amazing Application" // 45 chars
}
```

**✅ CORRECT:**
```json
{
  "title": "🚀 Launch App" // 11 chars
}
```

---

## 10. Testing Recommendations

### 10.1 Image Validation Tests
```typescript
// Test 1: Validate frame image aspect ratio
function validateFrameImageRatio(width: number, height: number): boolean {
  const ratio = width / height
  return Math.abs(ratio - 1.5) < 0.01 // 3:2 = 1.5
}

// Test 2: Validate OG image aspect ratio
function validateOGImageRatio(width: number, height: number): boolean {
  const ratio = width / height
  return Math.abs(ratio - 1.91) < 0.05 // 1.91:1
}

// Test 3: Validate splash image size
function validateSplashImage(width: number, height: number): boolean {
  return width === 200 && height === 200
}
```

### 10.2 URL Validation Tests
```typescript
// Test 1: Validate splash URL length
function validateSplashUrlLength(url: string): boolean {
  return url.length <= 32
}

// Test 2: Validate HTTPS protocol
function validateHttps(url: string): boolean {
  return url.startsWith('https://')
}

// Test 3: Validate button title length
function validateButtonTitle(title: string): boolean {
  return title.length <= 32
}
```

---

## 11. Implementation Requirements

### 11.1 Image Storage Structure
```
public/
├── og-image.png          # 1200x630 (OG standard)
├── frame-image.png       # 1200x800 (3:2 for frames)
├── splash.png            # 200x200 (exact)
├── icon.png              # 1024x1024 (manifest)
└── logo.png              # Variable (branding)
```

### 11.2 Dynamic Image Generation
If generating images dynamically:
1. **Frame images:** Generate at 3:2 ratio (1200x800 recommended)
2. **OG images:** Generate at 1.91:1 ratio (1200x630 standard)
3. **Splash images:** Generate at exactly 200x200 (no scaling)
4. **Cache aggressively:** Use CDN with long cache times

### 11.3 CDN Configuration
```typescript
// Recommended CDN headers
const IMAGE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Content-Type': 'image/png', // or image/jpeg
  'Access-Control-Allow-Origin': '*',
}
```

---

## 12. Official Spec References

### 12.1 Primary Sources
1. **Farcaster Miniapp Spec:** https://miniapps.farcaster.xyz/docs/specification
2. **Frame Embed Schema:** https://miniapps.farcaster.xyz/docs/specification#schema
3. **Manifest Schema:** https://miniapps.farcaster.xyz/docs/specification#frame

### 12.2 Key Sections
- **Mini App Embed:** Image requirements for feed embeds
- **Manifest:** Icon and splash image requirements
- **Button Schema:** Title length and action types

---

## 13. Compliance Status

| Component | Spec Requirement | Status | Notes |
|-----------|------------------|--------|-------|
| Frame imageUrl | 3:2 aspect ratio | ⚠️ AUDIT | Verify all frame routes |
| OG image | 1.91:1 aspect ratio | ⚠️ AUDIT | Check og-image.png dimensions |
| Splash image | 200x200px | ⚠️ AUDIT | Verify splash.png size |
| Icon image | 1024x1024px | ✅ PASS | Manifest verified |
| Button title | ≤32 chars | ⚠️ AUDIT | Check all button labels |
| Splash URL length | ≤32 chars | ✅ PASS | `/splash.png` is 11 chars |

---

## 14. Audit Action Items

### Priority 1 (CRITICAL)
- [ ] Verify `og-image.png` dimensions (must be 1200x630 or similar 1.91:1)
- [ ] Verify `splash.png` dimensions (must be exactly 200x200)
- [ ] Audit all frame route `imageUrl` aspect ratios (must be 3:2)
- [ ] Check all button title lengths across all frame routes

### Priority 2 (HIGH)
- [ ] Generate dedicated frame-specific images (3:2 ratio)
- [ ] Validate all image URLs use HTTPS
- [ ] Test frame rendering on Warpcast mobile
- [ ] Test splash screen transitions

### Priority 3 (MEDIUM)
- [ ] Add automated tests for image aspect ratio validation
- [ ] Create image generation utilities for 3:2 and 1.91:1
- [ ] Document image requirements in README
- [ ] Set up CDN caching for static images

---

## 15. MCP Verification Statement

**This document was generated from official Farcaster specifications retrieved via MCP on November 19, 2025.**

Sources verified:
- ✅ Supabase MCP (Farcaster docs search)
- ✅ fetch_webpage (https://miniapps.farcaster.xyz/docs/specification)
- ✅ Official Farcaster specification v1

**⚠️ MANDATORY:** Before implementing ANY frame or image changes, re-query MCP servers to ensure specifications haven't changed. NEVER trust local code or assumptions.

**Next Update Due:** December 19, 2025 (monthly MCP audit)

---

**Document Version:** 1.0  
**Last MCP Sync:** November 19, 2025  
**Status:** ✅ MCP-VERIFIED  
**Authority Level:** OFFICIAL SPECIFICATION
