# Frame Dynamic Image Fix - Deep Analysis & Status

**Date:** November 19, 2025  
**Production:** https://gmeow-adventure-6wxcp473j-0xheycat.vercel.app  
**Status:** 🟡 PARTIAL (1/4 working)

## Summary

User reported "blank image" issue with dynamic frame images. Investigation revealed **ImageResponse from `next/og` failing silently** in Next.js 15 due to:
1. Runtime incompatibility
2. Unsupported CSS properties (Satori limitations)
3. Complex JSX patterns

## Root Causes Identified

### 1. Runtime Configuration ❌→✅
**Problem:** `export const runtime = 'nodejs'`  
**Solution:** Changed to `export const runtime = 'edge'`  
**Why:** ImageResponse in Next.js 15 requires Edge Runtime, not Node.js runtime

### 2. Unsupported CSS Properties (Satori Limitations)

Satori (ImageResponse backend) **does NOT support:**

| Property | Status | Fix |
|----------|--------|-----|
| `mixBlendMode: 'screen'` | ❌ Not supported | Removed |
| `inset: 0` | ❌ Not supported | Expanded to `top/right/bottom/left` |
| `zIndex: 1` | ❌ Not supported | Removed |
| `display: 'grid'` | ❌ Not supported | Changed to `flexbox` + `flexWrap` |
| `gridTemplateColumns` | ❌ Not supported | Removed |

### 3. Emoji Handling
**Problem:** Emojis (🏆, 🌅, 🥇, 🎯, ⚡, 🌟) cause silent failures  
**Solution:** Removed all emojis (Satori needs explicit `graphemeImages` config)

### 4. Dimensions
**Problem:** `HEIGHT = 800` (non-standard)  
**Solution:** Changed to `HEIGHT = 630` (OG image standard 1200x630)

## Current Status by Frame Type

| Frame Type | Status | Image Size | Issue |
|------------|--------|------------|-------|
| Quest | ✅ **WORKING** | 172KB PNG | None |
| GM | ❌ Empty | 0 bytes | Conditional rendering or ternary operators |
| Onchainstats | ❌ Empty | 0 bytes | `.map()` + ternary + `flexWrap` |
| Leaderboard | ❌ Empty | 0 bytes | Complex layout |
| Test routes | ✅ **WORKING** | 12-24KB | Simple structure works |

## What Works

### ✅ Quest Frame (`/api/frame/image?type=quest&questId=1`)
```tsx
- Solid background colors
- Linear gradients (simple)
- Static text content
- No conditional rendering
- No .map() functions
- Direct variable interpolation: {questName}, {reward}
```

### ✅ Test Routes (`/api/test-image`, `/api/test-gm`)
```tsx
- Minimal JSX structure
- No radial gradients
- No absolute overlays
- No conditional operators
- Direct const values in JSX
```

## What Doesn't Work

### ❌ GM Frame
**Suspected Issues:**
1. Ternary operators: `{user ? shortenAddress(user) : 'Anonymous'}`
2. Nested ternaries: `{fid ? \`• FID ${fid}\` : ''}`
3. Function calls in JSX: `shortenAddress(user)`

### ❌ Onchainstats Frame
**Suspected Issues:**
1. `.map()` function: `shownMetrics.map((item) => ...)`
2. Conditional rendering: `{shownMetrics.length > 0 ? ... : ...}`
3. `flexWrap: 'wrap'` (might not be supported)
4. Complex data transformation before render

### ❌ Leaderboard Frame
**Suspected Issues:**
1. Nested flexbox layouts (3 levels deep)
2. `borderRadius: 999` (pill shape)
3. Complex opacity layers

## Commits Applied

1. **24650d6** - Change to edge runtime
2. **0dc1a0f** - Fix HEIGHT from 800 to 630
3. **f9f7158** - Remove mixBlendMode and inset
4. **7b487e4** - Remove zIndex
5. **27e52e3** - Remove emojis
6. **70fb9b7** - Replace grid with flexbox
7. **62206a4** - Simplify GM background (removed radial-gradient)

## Next Steps to Fix

### Option 1: Simplify JSX Patterns (RECOMMENDED)
```tsx
// GM Frame - Remove ternary operators
const userDisplay = user ? shortenAddress(user) : 'Anonymous'
const fidDisplay = fid || ''

// In JSX:
<div>{userDisplay} {fidDisplay && `• FID ${fidDisplay}`}</div>
```

### Option 2: Pre-calculate Everything
```tsx
// Onchainstats - Build array BEFORE render
const metricsToShow = READABLE_KEYS
  .map(({key, label}) => ({key, label, value: readParam(url, key)}))
  .filter(item => item.value && item.value !== '—')
  .slice(0, 6)

// Then render with simple map (no filter/slice in JSX)
{metricsToShow.map((item, index) => <MetricCard key={index} {...item} />)}
```

### Option 3: Use Static Data for Testing
Replace dynamic params with hardcoded values to isolate JSX structure issues.

### Option 4: Match Test Route Pattern Exactly
Copy working test-gm structure and incrementally add features.

## Technical Constraints (Satori/ImageResponse)

**Supported:**
- Flexbox layouts
- Static colors, linear gradients
- Basic transforms (translate, rotate, scale)
- Box shadows, text shadows
- Direct variable interpolation

**NOT Supported:**
- Grid layouts
- z-index layering
- Blend modes
- Emojis (without config)
- Advanced CSS (calc, custom properties)
- Conditional JSX patterns (unclear)
- `.map()` with filters (unclear)

## Vercel Deployments

| Commit | URL | Quest | GM | Onchainstats |
|--------|-----|-------|----|----|
| 62206a4 | gmeow-adventure-6wxcp473j | ✅ 172KB | ❌ 0 | ❌ 0 |
| bbeea5b | gmeow-adventure-66hgy95dk | ✅ | ❌ | ❌ |
| 70fb9b7 | gmeow-adventure-fneysqbte | ✅ | ❌ | ❌ |

## Recommendation

**IMMEDIATE ACTION:** Copy `/api/test-gm/route.tsx` structure (which works) and apply it to the main `/api/frame/image/route.tsx` GM frame section. Remove ALL ternary operators, function calls, and conditional rendering.

**Example Fix for GM Frame:**
```tsx
// BEFORE (doesn't work):
{user && <div>{shortenAddress(user)} {fid && `• FID ${fid}`}</div>}

// AFTER (should work):
const displayUser = user ? shortenAddress(user) : 'Anonymous'
const displayFid = fid ? `FID ${fid}` : ''
<div>{displayUser} {displayFid}</div>
```

The root issue is likely **Satori's JSX transpiler** doesn't handle complex JavaScript expressions well. Keep JSX as simple as possible - pure HTML-like structure with minimal logic.

---

**Production URL:** https://gmeow-adventure-6wxcp473j-0xheycat.vercel.app  
**Test Quest:** https://gmeow-adventure-6wxcp473j-0xheycat.vercel.app/api/frame/image?type=quest&questId=1 ✅  
**Test GM:** https://gmeow-adventure-6wxcp473j-0xheycat.vercel.app/api/frame/image?type=gm&gmCount=50 ❌  
**Test Simple GM:** https://gmeow-adventure-66hgy95dk-0xheycat.vercel.app/api/test-gm ✅
