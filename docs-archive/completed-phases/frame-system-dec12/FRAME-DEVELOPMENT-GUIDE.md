# Frame Development Guide - Custom Pattern

## Quick Start Template

### Step 1: Create Image Endpoint

`app/api/frame/[name]/image/route.tsx`

```typescript
import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

// MUST use nodejs runtime (not edge) for Next.js 15
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const param = searchParams.get('param') || 'default'
  
  // Fetch data from your API
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/your-endpoint`)
  const data = await response.json()
  
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#F9FAFB',
        padding: '40px',
      }}>
        {/* Your JSX content */}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
```

### Step 2: Create Frame Handler

`app/api/frame-simple/[name]/route.tsx`

```typescript
import { NextRequest, NextResponse } from 'next/server'

const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state') || 'initial'
  
  const imageUrl = `${baseUrl}/api/frame/[name]/image?state=${state}`
  
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:button:1" content="Button 1" />
  <meta property="fc:frame:button:1:action" content="post" />
  <meta property="fc:frame:button:1:target" content="${baseUrl}/api/frame-simple/[name]?state=state1" />
  <meta property="fc:frame:button:2" content="Button 2" />
  <meta property="fc:frame:button:2:action" content="post" />
  <meta property="fc:frame:button:2:target" content="${baseUrl}/api/frame-simple/[name]?state=state2" />
  <meta property="og:image" content="${imageUrl}" />
  <title>Your Frame Title</title>
</head>
<body>
  <h1>Frame Content</h1>
  <img src="${imageUrl}" alt="Frame Image" />
</body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const buttonIndex = body.untrustedData?.buttonIndex || 1
    const fid = body.untrustedData?.fid // Farcaster user ID
    
    // Handle button logic
    let state = 'initial'
    if (buttonIndex === 1) state = 'state1'
    if (buttonIndex === 2) state = 'state2'
    
    // Return updated frame (same as GET)
    const imageUrl = `${baseUrl}/api/frame/[name]/image?state=${state}`
    
    return new NextResponse(/* same HTML as GET */)
  } catch (error) {
    return NextResponse.json({ error: 'Frame error' }, { status: 500 })
  }
}
```

## Frame Specification Reference

### Button Actions

```typescript
// Post action (default) - stays in Frame
<meta property="fc:frame:button:1:action" content="post" />
<meta property="fc:frame:button:1:target" content="https://your-api.com/endpoint" />

// Link action - opens external URL
<meta property="fc:frame:button:2:action" content="link" />
<meta property="fc:frame:button:2:target" content="https://your-website.com" />

// Mint action - NFT minting
<meta property="fc:frame:button:3:action" content="mint" />
<meta property="fc:frame:button:3:target" content="eip155:8453:0xYourContract" />

// Transaction action - onchain transaction
<meta property="fc:frame:button:4:action" content="tx" />
<meta property="fc:frame:button:4:target" content="https://your-api.com/tx" />
```

### Input Fields

```typescript
// Text input
<meta property="fc:frame:input:text" content="Enter your message" />

// In POST handler:
const inputText = body.untrustedData?.inputText
```

### State Management

```typescript
// Pass state via URL query params
const state = searchParams.get('state')
const imageUrl = `${baseUrl}/api/frame/image?state=${encodeURIComponent(JSON.stringify(state))}`

// Or use fc:frame:state (advanced)
<meta property="fc:frame:state" content='{"key":"value"}' />
```

## User Verification with Neynar

```typescript
// In POST handler
const fid = body.untrustedData?.fid

// Verify with Neynar API
const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
  headers: {
    'api_key': process.env.NEYNAR_API_KEY!,
  },
})
const userData = await neynarResponse.json()

// Check if user follows, has badge, etc.
const isFollower = userData.result.user.viewer_context.following
```

## Image Styling Tips

```typescript
// Center content
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
}}>

// Responsive text
<div style={{
  fontSize: '48px', // Large for visibility
  fontWeight: 700,
  color: '#000',
}}>

// Cards/containers
<div style={{
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '12px',
  border: '2px solid #E5E7EB',
}}>

// Flex layouts work best
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
```

## Common Patterns

### Quest Frame
- Fetch quests from API
- Filter by category via buttons
- Display top 3 with XP rewards
- Link to full quest list

### NFT Minting Frame
- Show NFT preview
- Check if user owns NFT
- Mint button with transaction
- Success/error states

### Profile Frame
- Show user stats (XP, badges, rank)
- Fetch data by FID
- Share button
- View full profile link

### Voting Frame
- Display poll question
- Multiple choice buttons
- Track votes by FID
- Show results after voting

## Testing Checklist

- [ ] Frame HTML validates (all required meta tags)
- [ ] Image generates successfully (1200x630 PNG)
- [ ] Buttons trigger correct state changes
- [ ] FID verification works
- [ ] Error states handled gracefully
- [ ] Works in Framegear (https://framegear.xyz)
- [ ] Works in Warpcast
- [ ] Mobile layout looks good
- [ ] Load time < 3 seconds

## Debugging Tips

```bash
# Test Frame HTML
curl http://localhost:3000/api/frame-simple/quest | grep "fc:frame"

# Test image generation
curl -I http://localhost:3000/api/frame/quest/image

# Test POST button
curl -X POST http://localhost:3000/api/frame-simple/quest \
  -H "Content-Type: application/json" \
  -d '{"untrustedData":{"fid":12345,"buttonIndex":1}}'

# View logs
tail -f /tmp/nextjs-dev.log
```

## Migration Checklist

Migrating from hardcoded page to Frame:

- [ ] Create image endpoint (`/api/frame/[name]/image/route.tsx`)
- [ ] Create Frame handler (`/api/frame-simple/[name]/route.tsx`)
- [ ] Move data fetching logic to image endpoint
- [ ] Add button actions for all interactions
- [ ] Test with Framegear
- [ ] Update page to embed Frame (`<meta property="fc:frame" content="vNext" />`)
- [ ] Deploy and verify in production

## Known Issues & Solutions

**Issue**: Image generation slow
- **Solution**: Cache images in Redis or CDN

**Issue**: State management complex
- **Solution**: Use signed JWT tokens in state param

**Issue**: Button limit (4 max)
- **Solution**: Use pagination or "More" button pattern

**Issue**: No rich interactions
- **Solution**: Combine with tx action for onchain data

## Resources

- Frame Spec: https://warpcast.notion.site/Frame-Specification-v2
- Framegear Tester: https://framegear.xyz
- Neynar API Docs: https://docs.neynar.com
- @vercel/og Docs: https://vercel.com/docs/functions/og-image-generation
