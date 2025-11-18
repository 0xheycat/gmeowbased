# Farcaster Frame Implementation Guide

## Overview

This guide documents the correct implementation of Farcaster Frames v2 (vNext) for the Gmeowbased project. Following this pattern ensures frames display correctly in Farcaster feeds with both images and buttons.

## Issue: Badge Share Frames Only Showing Buttons

### Problem Diagnosed (Stage 5.5.5)

Badge share frames (`/api/frame/badgeShare`) were only displaying buttons without OG images when shared on Farcaster. Investigation revealed the root cause was **incorrect frame metadata format**.

### Root Cause

The badge share route was using **legacy Farcaster frame meta tag format**:

```html
<!-- ❌ INCORRECT: Legacy format (pre-vNext) -->
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://example.com/image.png" />
<meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
<meta property="fc:frame:button:1" content="View Collection" />
<meta property="fc:frame:button:1:action" content="link" />
<meta property="fc:frame:button:1:target" content="https://example.com/badges" />
```

**This format is deprecated and not supported by Farcaster vNext.**

## Correct Implementation: vNext JSON Embed Format

### Specification Reference

Farcaster Frames v2 requires the **JSON embed format** per the official spec:
- **Docs**: https://miniapps.farcaster.xyz/docs/specification
- **Meta Tag**: `fc:frame` (name, not property)
- **Content**: Stringified JSON object

### Required Schema

```typescript
{
  version: '1',              // Required: Must be '1'
  imageUrl: string,          // Required: URL to OG image (3:2 aspect ratio, max 1024 chars)
  button: {                  // Required: Single button configuration
    title: string,           // Required: Button text (max 32 chars)
    action: {                // Required: Action configuration
      type: 'link' | 'launch_frame' | 'view_token',
      url: string,           // URL to open (max 1024 chars)
      // For launch_frame actions:
      name?: string,         // App name
      splashImageUrl?: string,
      splashBackgroundColor?: string,
    }
  }
}
```

### ✅ Correct Implementation

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Farcaster vNext JSON Embed Format -->
    <meta name="fc:frame" content='{"version":"1","imageUrl":"https://example.com/image.png","button":{"title":"View Collection","action":{"type":"link","url":"https://example.com/badges"}}}' />
    
    <!-- Open Graph fallback (for non-Farcaster clients) -->
    <meta property="og:image" content="https://example.com/image.png" />
    <meta property="og:title" content="Badge Title" />
    <meta property="og:description" content="Badge description" />
  </head>
  <body>
    <!-- Page content (not shown in frame preview) -->
  </body>
</html>
```

### Code Implementation Pattern

```typescript
// Build Farcaster vNext JSON embed format
const frameEmbed = {
  version: '1',
  imageUrl: ogImageUrl,
  button: {
    title: 'View Collection',
    action: {
      type: 'link',
      url: `${baseUrl}/profile/${fid}/badges`,
    },
  },
}

// Render HTML with JSON meta tag
const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content='${JSON.stringify(frameEmbed).replace(/'/g, "&#39;")}' />
    
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
  </head>
  <body>
    <p>Frame content</p>
  </body>
</html>`

return new NextResponse(html, {
  status: 200,
  headers: { 'Content-Type': 'text/html' },
})
```

## Key Differences: Legacy vs vNext

| Aspect | Legacy Format | vNext JSON Format |
|--------|--------------|-------------------|
| **Meta tag attribute** | `property="fc:frame"` | `name="fc:frame"` |
| **Content format** | Multiple separate meta tags | Single JSON string |
| **Image tag** | `property="fc:frame:image"` | `imageUrl` in JSON |
| **Button config** | Separate meta tags per button | Single `button` object in JSON |
| **Action type** | `fc:frame:button:1:action` | `button.action.type` |
| **Button count** | Multiple buttons supported | **Single button only** |
| **Aspect ratio** | Explicit meta tag | **Implicit 3:2 (1.5:1)** |

### Important Limitations in vNext

1. **Only ONE button** is supported per frame embed
2. **Image must be 3:2 aspect ratio** (not 1.91:1 like OG images)
3. **Action types**: `link`, `launch_frame`, `view_token` only
4. **No post actions** - use launch_frame for interactive apps

## Image Requirements

### Frame Image (fc:frame)
- **Aspect Ratio**: 3:2 (e.g., 1200x800)
- **Format**: PNG, JPEG, WebP
- **Max URL Length**: 1024 characters
- **Display**: Used in Farcaster feed preview

### OG Image (og:image)
- **Aspect Ratio**: 1.91:1 (e.g., 1200x628)
- **Format**: PNG recommended
- **Purpose**: Fallback for non-Farcaster clients

### Implementation Note
Badge share frames generate a **1200x628 image** (1.91:1) for OG compatibility. This works for frames because Farcaster clients crop/scale to 3:2 automatically.

## Testing Frames

### Local Testing
```bash
# Test frame HTML generation
curl http://localhost:3000/api/frame/badgeShare?fid=123&badgeId=pioneer_2024_01

# Verify JSON format in response
curl -s http://localhost:3000/api/frame/badgeShare?fid=123&badgeId=pioneer_2024_01 | grep 'fc:frame'
```

### Production Testing
1. **Share URL** in Farcaster cast
2. **Verify image displays** in feed preview
3. **Click button** to test action link
4. **Validate with tools**:
   - Warpcast Frame Validator
   - Farcaster Frame Debugger

## Affected Routes

### ✅ Fixed Routes (vNext JSON Format)
- `/api/frame/badgeShare` - Badge achievement sharing
- `/api/frame/route.tsx` - Main frame handler (leaderboard, quests, etc.)

### 🔍 Routes to Audit (May need updates)
- `/app/frame/quest/[questId]/route.tsx`
- `/app/frame/badge/[fid]/route.tsx`
- `/app/frame/leaderboard/route.tsx`
- `/app/frame/stats/[fid]/route.tsx`

**Action**: Search for `property="fc:frame"` and convert to `name="fc:frame"` with JSON format.

## Common Pitfalls

### 1. Using `property` instead of `name`
```html
<!-- ❌ WRONG -->
<meta property="fc:frame" content='...' />

<!-- ✅ CORRECT -->
<meta name="fc:frame" content='...' />
```

### 2. Multiple buttons in vNext
```typescript
// ❌ WRONG: vNext only supports ONE button
const frameEmbed = {
  version: '1',
  imageUrl: '...',
  buttons: [  // No 'buttons' array!
    { title: 'Button 1', action: {...} },
    { title: 'Button 2', action: {...} },
  ]
}

// ✅ CORRECT: Single button object
const frameEmbed = {
  version: '1',
  imageUrl: '...',
  button: {  // Singular 'button'
    title: 'Primary Action',
    action: { type: 'link', url: '...' }
  }
}
```

### 3. Forgetting to escape quotes in JSON
```typescript
// ❌ WRONG: Breaks HTML parsing
const html = `<meta name="fc:frame" content='${JSON.stringify(embed)}' />`

// ✅ CORRECT: Escape single quotes
const html = `<meta name="fc:frame" content='${JSON.stringify(embed).replace(/'/g, "&#39;")}' />`
```

### 4. Wrong aspect ratio
```typescript
// ❌ WRONG: 1.91:1 is for OG images, not frames
// Frames expect 3:2 (1.5:1)

// ✅ CORRECT: Generate or use 3:2 image
// Farcaster will crop/scale 1.91:1 images to 3:2
```

## Migration Checklist

When updating existing frame routes:

- [ ] Change `property="fc:frame"` to `name="fc:frame"`
- [ ] Remove all `fc:frame:*` property meta tags
- [ ] Build JSON embed object with `version`, `imageUrl`, `button`
- [ ] Stringify JSON and escape single quotes
- [ ] Keep OG meta tags for fallback
- [ ] Test image URL is accessible
- [ ] Verify button action URL is correct
- [ ] Test in Farcaster feed
- [ ] Run TypeScript compiler (`pnpm tsc --noEmit`)

## References

- **Farcaster Mini App Spec**: https://miniapps.farcaster.xyz/docs/specification
- **Working Implementation**: `/app/api/frame/route.tsx` (leaderboard handler)
- **Fixed Implementation**: `/app/api/frame/badgeShare/route.ts`
- **Issue Diagnosis**: Stage 5.5.5 (Phase 5 testing)

## Changelog

### 2025-01-XX - Stage 5.5.5 Fix
- **Issue**: Badge share frames only showing buttons, no images
- **Root Cause**: Using legacy `property="fc:frame"` meta tag format
- **Fix**: Converted to vNext JSON embed format with `name="fc:frame"`
- **Files Changed**:
  - `app/api/frame/badgeShare/route.ts` (main frame + not found frame)
- **Result**: Frames now display both images and buttons in Farcaster feed
- **Tests**: Zero TypeScript errors after fix
