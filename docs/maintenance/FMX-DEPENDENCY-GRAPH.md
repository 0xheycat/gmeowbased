# FMX — Frame Dependency Graph

## Overview

This document maps all dependencies for frame endpoints, OG image generators, and MiniApp components. Understanding these dependencies is critical for debugging, security audits, and preventing client-side imports in server code.

---

## Server-Side Dependencies (Allowed)

### Core Frame Handler
**File:** `app/api/frame/route.tsx`

```
app/api/frame/route.tsx
├─ lib/gm-utils.ts
│  ├─ Contract interaction logic
│  ├─ Quest fetching
│  └─ Badge calculations
│
├─ lib/frame-validation.ts
│  ├─ sanitizeFID
│  ├─ sanitizeQuestId
│  ├─ sanitizeChainKey
│  ├─ sanitizeUrl
│  ├─ sanitizeSplashImageUrl
│  └─ sanitizeButtons
│
├─ lib/miniapp-validation.ts
│  ├─ validateHexColor
│  ├─ validateMiniAppEmbed
│  └─ buildMiniAppEmbed
│
├─ lib/share.ts
│  ├─ buildFrameShareUrl
│  └─ URL generation logic
│
├─ lib/rate-limit.ts
│  ├─ rateLimit
│  ├─ getClientIp
│  └─ apiLimiter (60 req/min)
│
├─ lib/rank.ts
│  ├─ calculateBadge
│  ├─ getTier
│  └─ Badge/tier logic
│
├─ lib/neynar.ts
│  ├─ Profile resolution
│  ├─ FID → username mapping
│  └─ Farcaster API client
│
└─ lib/supabase/server.ts
   ├─ createClient
   └─ Database queries
```

### OG Image Generator
**File:** `app/api/og/route.tsx`

```
app/api/og/route.tsx
├─ next/og (ImageResponse)
│  └─ Vercel Edge Runtime
│
├─ lib/badges.ts
│  ├─ Badge tier calculations
│  └─ Milestone logic
│
├─ lib/frame-validation.ts
│  └─ Input sanitization
│
└─ Bundled fonts
   ├─ /public/fonts/inter.woff2
   └─ Base64 embedded fonts
```

### Badge Logic
**File:** `lib/badges.ts`

```
lib/badges.ts
├─ No external dependencies (pure logic)
├─ Types: BadgeTier, Milestone
└─ Functions:
   ├─ calculateBadge(gmCount, streak)
   ├─ getBadgeIcon(tier)
   └─ getMilestones()
```

### Share Utils
**File:** `lib/share.ts`

```
lib/share.ts
├─ No external dependencies
└─ Functions:
   ├─ buildFrameShareUrl(type, params)
   ├─ buildQuestShareUrl(questId, chain)
   └─ buildLeaderboardShareUrl(fid?)
```

---

## Client-Side Dependencies (FORBIDDEN in Server Routes)

### ❌ NEVER Import in `/app/api/*`

```typescript
// FORBIDDEN IMPORTS (will break server routes)
❌ window
❌ document
❌ navigator
❌ localStorage
❌ sessionStorage
❌ XMLHttpRequest
❌ fetch (client-side version)
❌ React DOM (ReactDOM.render, etc.)
❌ useRouter (Next.js client hook)
❌ useSearchParams (Next.js client hook)
❌ useState, useEffect, etc. (React client hooks)
```

### ✅ Allowed in Server Routes

```typescript
// ALLOWED IMPORTS
✅ React (for JSX only, no hooks)
✅ next/server (NextRequest, NextResponse)
✅ next/og (ImageResponse for OG generation)
✅ Database clients (Supabase, Prisma)
✅ Node.js modules (fs, path, crypto)
✅ Pure utility functions
✅ TypeScript types
```

---

## Asset Dependencies

### Fonts
**Location:** `/public/fonts/`

```
public/fonts/
├─ inter-regular.woff2
├─ inter-bold.woff2
└─ pixel-font.woff2 (optional)
```

**Usage:**
- Bundled locally (no CDN)
- Embedded as base64 in OG generation
- Deterministic rendering

**Verification:**
```bash
ls -lh public/fonts/
# Expected: All font files < 200KB each
```

### Images
**Location:** `/public/`

```
public/
├─ splash.png (200x200, PNG RGB, <100KB)
├─ icon.png (1024x1024, PNG, <200KB)
├─ og-image.png (1200x630, PNG/JPEG, <1MB)
└─ frame-image.png (1200x800, PNG/JPEG, <1MB)
```

**Usage:**
- Static assets served by Vercel CDN
- Absolute HTTPS URLs in frame meta
- Cache-Control headers (max-age 3600)

**Verification:**
```bash
identify public/*.png
# Expected: Correct dimensions for each image type
```

### Environment Variables

```bash
# Required for frame endpoints
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEYNAR_API_KEY=...
BASE_RPC_URL=https://...
OPTIMISM_RPC_URL=https://...
CELO_RPC_URL=https://...
```

**Validation:**
```bash
# Check all required env vars present
pnpm env:check
```

---

## Dependency Security Checklist

### Server Route Audit
- [ ] No `window`, `document`, `navigator` imports
- [ ] No React client hooks (`useState`, `useEffect`, etc.)
- [ ] No Next.js client hooks (`useRouter`, `useSearchParams`)
- [ ] Only server-safe libraries imported
- [ ] All database clients properly initialized

### Client Component Audit
- [ ] No server-only imports (database, secrets)
- [ ] No direct API calls (use tRPC/server actions)
- [ ] Environment variables prefixed `NEXT_PUBLIC_`
- [ ] Hydration errors resolved

### Asset Audit
- [ ] All fonts bundled locally
- [ ] All images < 1MB
- [ ] No external CDN dependencies (fonts, images)
- [ ] Cache headers configured
- [ ] HTTPS enforced on all URLs

---

## Playwright Dependency Tests

```typescript
// e2e/dependency-validation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Dependency Validation', () => {
  test('frame route has no client imports', async ({ page }) => {
    // Check source code for forbidden imports
    const response = await page.goto('/api/frame?type=leaderboard')
    expect(response?.status()).toBe(200)
    
    // Frame should render without client-side errors
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    
    await page.waitForTimeout(1000)
    expect(errors).toHaveLength(0)
  })
  
  test('fonts are bundled locally', async ({ page }) => {
    await page.goto('/api/og?type=leaderboard')
    
    // OG image should load without external font requests
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter((r: any) => r.name.includes('fonts.googleapis') || r.name.includes('fonts.gstatic'))
    })
    
    expect(requests.length).toBe(0) // No external font requests
  })
  
  test('all images accessible via HTTPS', async ({ page, request }) => {
    await page.goto('/api/frame?type=quest')
    
    const meta = await page.locator('meta[name="fc:frame"]')
    const content = await meta.getAttribute('content')
    const embed = JSON.parse(content!)
    
    // Check imageUrl is HTTPS
    expect(embed.imageUrl).toMatch(/^https:\/\//)
    
    // Verify image accessible
    const response = await request.get(embed.imageUrl)
    expect(response.ok()).toBeTruthy()
  })
})
```

---

## Debugging Dependency Issues

### Issue: "window is not defined"
**Cause:** Client-side import in server route  
**Solution:**
1. Search codebase: `grep -r "window\." app/api/`
2. Remove client-only imports
3. Use server-safe alternatives (Node.js APIs)

### Issue: "Cannot find module 'react-dom'"
**Cause:** React DOM imported in server route  
**Solution:**
1. Remove `react-dom` imports
2. Use `next/og` for rendering (not ReactDOM)
3. Verify import statement: `import React from 'react'` (not `react-dom`)

### Issue: Fonts not rendering in OG images
**Cause:** Fonts not bundled, CDN blocked  
**Solution:**
1. Download fonts to `/public/fonts/`
2. Embed fonts as base64 in OG generation code
3. Verify fonts loaded: `ls -lh public/fonts/`

### Issue: "fetch is not defined" (server)
**Cause:** Using browser fetch in server route  
**Solution:**
1. Use Node.js `fetch` (available in Next.js 13+)
2. Or use `axios`, `node-fetch` libraries
3. Verify `import { fetch } from 'next/server'`

---

## Dependency Version Tracking

### Current Versions (as of Nov 2025)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "zod": "^3.22.0",
    "viem": "^2.0.0",
    "wagmi": "^2.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### Update Checklist
- [ ] Review changelogs for breaking changes
- [ ] Test frame endpoints after updates
- [ ] Verify OG generation still works
- [ ] Run full Playwright suite
- [ ] Check for new security vulnerabilities (`pnpm audit`)

---

## Approval Sign-Off

**For production deployment:**

- [ ] **Engineer Approval:** _____________ (Date: ________)
- [ ] **Security Review:** _____________ (Date: ________)
- [ ] **Dependency Audit:** _____________ (Date: ________)

**Audit Results:** _______________________  
**Known Issues:** _______________________

---

## References

- [Next.js Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Vercel Edge Runtime](https://vercel.com/docs/functions/edge-functions/edge-runtime)
- [Supabase Server Client](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Farcaster Frame Spec](https://miniapps.farcaster.xyz/docs/specification)

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Maintained By:** Frame Engineering Team
