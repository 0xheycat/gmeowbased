# Frame Implementation Comparison

## ✅ Working Example: Badge Share Frame

**File**: `app/api/frame/badgeShare/route.ts` (Fixed in Stage 5.5.5)

### Frame Metadata Generation
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fid = parseInt(searchParams.get('fid'), 10)
  const badgeId = searchParams.get('badgeId')
  
  // Query live data
  const badges = await getUserBadges(fid)
  const targetBadge = badges.find(b => b.badgeId === badgeId)
  
  // Generate dynamic image URL
  const ogImageUrl = `${baseUrl}/api/frame/badgeShare/image?fid=${fid}&badgeId=${badgeId}`
  const profileUrl = `${baseUrl}/profile/${fid}/badges`
  
  // ✅ CORRECT vNext JSON format
  const frameEmbed = {
    version: '1',  // ✅ Must be "1"
    imageUrl: ogImageUrl,
    button: {
      title: 'View Collection',
      action: { 
        type: 'link', 
        url: profileUrl 
      }
    }
  }
  
  // Generate HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="fc:frame" content='${JSON.stringify(frameEmbed).replace(/'/g, "&#39;")}' />
      <meta property="og:title" content="${badgeName}" />
      <meta property="og:image" content="${ogImageUrl}" />
    </head>
    <body>...</body>
    </html>
  `
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}
```

**Result**: ✅ Works perfectly in Farcaster feed

---

## ✅ Fixed Example: Main Frame Route

**File**: `app/api/frame/route.tsx` (Fixed in Stage 5.5.6)

### Frame Metadata Generation (buildFrameHtml function)

```typescript
function buildFrameHtml(params: {
  title: string
  description: string
  image?: string
  url?: string
  buttons?: FrameButton[]
  frameOrigin?: string
  // ... other params
}) {
  const { 
    title, 
    description, 
    image, 
    url, 
    buttons = [],
    frameOrigin 
  } = params
  
  // Resolve image with fallback
  const resolvedImage = image || `${frameOrigin}/og-image.png`
  
  // Get primary button
  const primaryButton = buttons[0]
  
  // ✅ CORRECT vNext JSON format (FIXED)
  const frameEmbedMeta = primaryButton && frameOrigin && resolvedImage ? {
    version: '1',  // ✅ Changed from 'next' to '1'
    imageUrl: resolvedImage,
    button: {
      title: primaryButton.label,
      action: {
        type: 'launch_frame',
        name: title,
        url: frameOrigin,
        splashImageUrl: `${frameOrigin}/splash.png`,
        splashBackgroundColor: '#0B0A16'
      }
    }
  } : null
  
  // Generate meta tag
  const frameJsonMetaTag = frameEmbedMeta 
    ? `<meta name="fc:frame" content='${JSON.stringify(frameEmbedMeta).replace(/'/g, "&#39;")}' />`
    : ''
  
  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${frameJsonMetaTag}
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${resolvedImage ? `<meta property="og:image" content="${escapeHtml(resolvedImage)}" />` : ''}
    <meta property="og:url" content="${escapeHtml(url || '')}" />
    <!-- ... rest of HTML ... -->
  </head>
  <body>...</body>
  </html>`
}
```

**Usage Example (Onchainstats)**:
```typescript
if (type === 'onchainstats') {
  const user = params.user || ''
  const chainKey = params.chain || 'base'
  const metrics = { /* ... user metrics ... */ }
  
  // Generate dynamic OG image
  const imageParams = new URLSearchParams()
  imageParams.set('title', `Onchain Stats — ${chainDisplay}`)
  imageParams.set('subtitle', user)
  imageParams.set('metric1Label', 'Transactions')
  imageParams.set('metric1Value', metrics.txs)
  // ... more metrics
  
  const image = `${origin}/api/frame/og?${imageParams.toString()}`
  const hubUrl = `${origin}/#onchain-hub`
  
  // Call buildFrameHtml with correct params
  const html = buildFrameHtml({
    title: `Onchain Stats — ${chainDisplay}`,
    description: `${user} • Chain ${chainDisplay} • Txs ${metrics.txs} • ...`,
    image,  // ✅ Dynamic image URL
    url: hubUrl,
    buttons: [{ label: 'Open Onchain Hub', target: hubUrl }],
    frameOrigin: origin,  // ✅ Required for frameEmbedMeta
    // ... other params
  })
  
  return new Response(html, { 
    headers: { 'Content-Type': 'text/html' } 
  })
}
```

**Result**: ✅ Now works correctly in Farcaster feed

---

## ⚠️ Common Pitfalls

### Pitfall 1: Wrong Version Number
```typescript
// ❌ WRONG
const frameEmbed = {
  version: 'next',  // Rejected by Farcaster
  // ...
}

// ❌ WRONG
const frameEmbed = {
  version: 'vNext',  // Invalid
  // ...
}

// ❌ WRONG
const frameEmbed = {
  version: 2,  // Must be string "1"
  // ...
}

// ✅ CORRECT
const frameEmbed = {
  version: '1',  // Must be string "1"
  // ...
}
```

### Pitfall 2: Missing frameOrigin
```typescript
// ❌ WRONG - frameEmbedMeta becomes null
const html = buildFrameHtml({
  title: 'My Frame',
  image: imageUrl,
  buttons: [{ label: 'Click me', target: url }],
  // frameOrigin: undefined  ← Missing!
})

// ✅ CORRECT - frameEmbedMeta generated
const html = buildFrameHtml({
  title: 'My Frame',
  image: imageUrl,
  buttons: [{ label: 'Click me', target: url }],
  frameOrigin: origin,  // ← Required!
})
```

### Pitfall 3: Missing Image
```typescript
// ⚠️ WARNING - Uses fallback image
const html = buildFrameHtml({
  title: 'My Frame',
  // image: undefined  ← Missing!
  buttons: [...],
  frameOrigin: origin,
})
// Falls back to: `${frameOrigin}/og-image.png`

// ✅ BETTER - Explicit dynamic image
const html = buildFrameHtml({
  title: 'My Frame',
  image: `${origin}/api/frame/og?title=My+Frame`,
  buttons: [...],
  frameOrigin: origin,
})
```

### Pitfall 4: No Buttons
```typescript
// ❌ WRONG - frameEmbedMeta becomes null (no primaryButton)
const html = buildFrameHtml({
  title: 'My Frame',
  image: imageUrl,
  buttons: [],  // ← Empty!
  frameOrigin: origin,
})

// ✅ CORRECT - At least one button
const html = buildFrameHtml({
  title: 'My Frame',
  image: imageUrl,
  buttons: [{ label: 'View', target: url }],
  frameOrigin: origin,
})
```

---

## 🔧 Debugging Checklist

When frame doesn't render in Farcaster:

### 1. Check HTML Output
```bash
curl -s https://gmeowhq.art/api/frame?type=onchainstats&user=0x... | grep 'fc:frame'
```

**Should see**:
```html
<meta name="fc:frame" content='{"version":"1","imageUrl":"https://...","button":{...}}' />
```

**Should NOT see**:
```html
<meta property="fc:frame" content="vNext" />  <!-- ❌ OLD FORMAT -->
```

### 2. Validate JSON
```bash
# Extract JSON
curl -s https://gmeowhq.art/api/frame?type=onchainstats&user=0x... | \
  grep -o 'name="fc:frame" content='"'"'[^'"'"']*'"'"'' | \
  sed "s/name=\"fc:frame\" content='//;s/'$//" | \
  sed 's/&#39;/'"'"'/g' | \
  jq '.'
```

**Should output**:
```json
{
  "version": "1",
  "imageUrl": "https://gmeowhq.art/api/frame/og?...",
  "button": {
    "title": "Open Onchain Hub",
    "action": {
      "type": "launch_frame",
      "name": "Onchain Stats — Base",
      "url": "https://gmeowhq.art",
      "splashImageUrl": "https://gmeowhq.art/splash.png",
      "splashBackgroundColor": "#0B0A16"
    }
  }
}
```

### 3. Check Image URL
```bash
# Test image URL directly
curl -I https://gmeowhq.art/api/frame/og?title=Test
```

**Should return**:
```
HTTP/2 200 
content-type: image/png
```

### 4. Test in Warpcast Composer

1. Open: `https://farcaster.xyz/~/compose?embeds[]=<YOUR_FRAME_URL>`
2. Should see image preview (not just button)
3. If no preview, check browser console for errors

### 5. Validate with Farcaster Tools

**Frame Validator** (if available):
- Input frame URL
- Should show version: "1"
- Should show image preview
- Should show button configuration

---

## 📊 Frame Type Comparison

| Frame Type | File | Fixed | Image Source | Button Action |
|------------|------|-------|--------------|---------------|
| Badge Share | `api/frame/badgeShare/route.ts` | ✅ Stage 5.5.5 | `/api/frame/badgeShare/image` | `link` |
| Onchainstats | `api/frame/route.tsx` | ✅ Stage 5.5.6 | `/api/frame/og` | `launch_frame` |
| Quest | `api/frame/route.tsx` | ✅ Stage 5.5.6 | `/api/frame/og` | `launch_frame` |
| Guild | `api/frame/route.tsx` | ✅ Stage 5.5.6 | `/api/frame/og` | `launch_frame` |
| Points | `api/frame/route.tsx` | ✅ Stage 5.5.6 | `/api/frame/og` | `launch_frame` |
| Leaderboard | `api/frame/route.tsx` | ✅ Stage 5.5.6 | `/api/frame/og` | `launch_frame` |
| Referral | `api/frame/route.tsx` | ✅ Stage 5.5.6 | `/api/frame/og` | `launch_frame` |
| Verify | `api/frame/route.tsx` | ✅ Stage 5.5.6 | fallback | `launch_frame` |

**All frames now use**: `version: '1'` ✅

---

## 🎯 Testing Commands

```bash
# Test badge share frame
curl -s http://localhost:3000/api/frame/badgeShare?fid=3&badgeId=pioneer_2024_01 | grep 'fc:frame'

# Test onchainstats frame
curl -s http://localhost:3000/api/frame?type=onchainstats&chain=base&user=0xB4F2fF92E8ccbbeAb7094cef5514A15aeBbbD11F | grep 'fc:frame'

# Test quest frame
curl -s http://localhost:3000/api/frame?type=quest&questId=1&chain=base | grep 'fc:frame'

# Test leaderboard frame
curl -s http://localhost:3000/api/frame?type=leaderboard&chain=base&limit=10 | grep 'fc:frame'

# Run automated test script
./scripts/test-onchainstats-frame.sh
```

---

## 📚 References

- **Farcaster Mini App Spec**: https://miniapps.farcaster.xyz/docs/specification
- **Frame Version Fix Docs**: `/docs/frame-version-fix.md`
- **Frame Implementation Guide**: `/docs/frame-implementation.md`
- **Dynamic Data Guide**: `/docs/frame-dynamic-data-explanation.md`
- **Test Script**: `/scripts/test-onchainstats-frame.sh`

---

**Status**: ✅ Both implementations working  
**Version**: `"1"` (spec-compliant)  
**Format**: vNext JSON embed  
**Ready for Production**: Yes
