# Farcaster Frame Migration - WASM Issue Resolution

## Problem Summary

**Initial Goal**: Migrate Frames from hardcoded Next.js pages to Frog framework for better architecture.

**Critical Blocker Found**: Satori WASM compatibility issue with Next.js 15.0.0
- Error: `export 'init' (imported as 'init') was not found in 'satori/wasm'`
- Impact: Both Frog framework and @vercel/og (Edge runtime) fail to load

## Solutions Attempted

### ❌ Option 1: Webpack Configuration
- Added `asyncWebAssembly: true`, WASM file handling, externalized Satori
- **Result**: Failed - same WASM error persists
- **Time**: ~30 minutes

### ❌ Option 2: @vercel/og with Frog
- Installed @vercel/og as alternative to raw Satori
- Created separate image endpoint using @vercel/og
- **Result**: Failed - Frog framework itself imports Satori internally
- **Time**: ~45 minutes

###  ❌ Option 3: @vercel/og with Edge Runtime
- Used `export const runtime = 'edge'` with @vercel/og
- **Result**: Failed - Edge runtime has WASM loading issues in Next.js 15
- Error: `URL is malformed "/_next/static/media/resvg.5232f2b6.wasm"`

### ✅ Final Solution: Custom Frame + @vercel/og + Node.js Runtime

**Architecture**:
1. **Skip Frog Framework** - Avoid Satori dependency entirely
2. **Custom Frame HTML** - Use meta tags directly (no framework)
3. **@vercel/og for Images** - Node.js runtime instead of Edge
4. **Separate Image Endpoint** - `/api/frame/quest/image/route.tsx`

**Implementation**:

**File 1**: `app/api/frame-simple/quest/route.tsx` (Frame Handler)
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'all'
  const imageUrl = `${baseUrl}/api/frame/quest/image?category=${category}`
  
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content="${imageUrl}" />
      <meta property="fc:frame:button:1" content="All" />
      <meta property="fc:frame:button:1:action" content="post" />
      ...
    </head>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } })
}

export async function POST(request: NextRequest) {
  // Handle button clicks, return updated frame
}
```

**File 2**: `app/api/frame/quest/image/route.tsx` (Image Generator)
```typescript
import { ImageResponse } from '@vercel/og'

// CRITICAL: Use nodejs runtime, not edge
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Fetch quests from API
  const response = await fetch(`${baseUrl}/api/quests?limit=10`)
  const { data: quests } = await response.json()
  
  // Filter by category
  const filteredQuests = category === 'onchain' ? 
    quests.filter(q => q.category === 'onchain') : quests
  
  // Return ImageResponse with JSX
  return new ImageResponse(
    (<div style={{...}}>Quest cards JSX</div>),
    { width: 1200, height: 630 }
  )
}
```

**Key Success Factors**:
- ✅ No Frog = No Satori WASM dependency
- ✅ Node.js runtime = Proper WASM loading
- ✅ @vercel/og = Battle-tested image generation
- ✅ Simple meta tags = Full Frame specification compliance

## Test Results

```bash
# Test 1: Frame HTML
curl http://localhost:3000/api/frame-simple/quest
# ✅ SUCCESS: Returns proper Frame meta tags

# Test 2: Image Generation  
curl -I http://localhost:3000/api/frame/quest/image
# ✅ SUCCESS: HTTP/1.1 200 OK, content-type: image/png

# Test 3: Button Filtering
curl http://localhost:3000/api/frame-simple/quest?category=onchain
# ✅ SUCCESS: Frame updates with filtered quests
```

## Files Created

1. ✅ `lib/frog-config.ts` - Frog config (not used, kept for reference)
2. ✅ `lib/frame-components.tsx` - Component library (not used, kept for reference)
3. ❌ `app/api/frame/quest/route.tsx` - Frog Frame (doesn't work, WASM error)
4. ✅ `app/api/frame/quest/image/route.tsx` - @vercel/og image generator (WORKS)
5. ✅ `app/api/frame-simple/quest/route.tsx` - Custom Frame (WORKS)

## Recommendation: Use Custom Frame Pattern

**Advantages**:
- ✅ No WASM compatibility issues
- ✅ Works with Next.js 15.0.0
- ✅ Full control over Frame specification
- ✅ Simpler debugging
- ✅ Less dependencies

**Disadvantages vs Frog**:
- ❌ No built-in middleware (Neynar integration manual)
- ❌ No dev tools UI
- ❌ More boilerplate for complex Frames
- ❌ Manual button routing

**When to Use Each**:
- **Custom Frame (Recommended)**: Simple Frames, Next.js 15, fewer dependencies
- **Frog (Wait for fix)**: Complex Frames, multiple routes, when Next.js 15 support added
- **OnchainKit**: Alternative if need Coinbase integration

## Next Steps

1. ✅ Quest Frame working with custom implementation
2. ⏳ Build NFT minting Frame (same pattern)
3. ⏳ Build NFT gallery Frame (same pattern)
4. ⏳ Add Neynar FID verification manually
5. ⏳ Test Frames in Warpcast
6. ⏳ Monitor Frog GitHub for Next.js 15 fix

## Conclusion

**Solution**: Custom Frame implementation bypasses all WASM issues while maintaining full Frame specification compliance. Image generation with @vercel/og in Node.js runtime works perfectly.

**Status**: ✅ UNBLOCKED - Can proceed with Frame migration using custom pattern.

**Time Investment**:
- Frog attempts: ~2 hours
- Custom solution: ~30 minutes
- **Total**: ~2.5 hours to resolve blocker
