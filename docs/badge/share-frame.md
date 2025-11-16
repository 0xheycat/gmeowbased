# Badge Share Frame System

**Phase 3C: Shareable Farcaster Frame V2 for Badges**

Version: 2.2.0  
Last Updated: January 15, 2025  
**Spec Audit**: ✅ Compliant (Farcaster Frames vNext, Jan 2025)

---

## Overview

The Badge Share Frame System enables users to share individual badges on Farcaster with rich frame previews. Each badge generates a unique Farcaster Frame V2 with a custom OG image (1200x628) featuring tier-specific gradients, badge details, and interactive buttons.

## Architecture

### Components

```
Badge Share Flow:
┌─────────────────────────────────────┐
│   User selects badge to share       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ buildBadgeShareFrameUrl(fid, badgeId) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  openWarpcastComposer(text, frameUrl) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Farcaster loads /api/frame/badgeShare │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Frame generates OG image (1200x628) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ User sees rich preview in Warpcast  │
└─────────────────────────────────────┘
```

### Files

| File | Purpose | Lines |
|------|---------|-------|
| `/app/api/frame/badgeShare/route.ts` | Frame endpoint | 220 |
| `/app/api/frame/badgeShare/image/route.tsx` | OG image generator | 395 |
| `/components/frame/BadgeShareCard.tsx` | React share component | 135 |
| `/lib/frame-badge.ts` | Helper utilities | 179 |

---

## API Reference

### Frame Endpoint

**Route**: `GET /api/frame/badgeShare`

**Query Parameters**:
- `fid` (required): Farcaster ID (positive integer)
- `badgeId` (required): Badge registry ID (lowercase-hyphen format)

**Response**: HTML with Farcaster Frame V2 meta tags

**Frame Buttons**:
1. **View Full Collection** → `/profile/{fid}/badges`
2. **View on Explorer** (if minted) → Block explorer TX URL
3. **Mint Badge** (if not minted) → Badge inventory page

**Cache**: `Cache-Control: public, max-age=300, s-maxage=300` (5 minutes)

**Example**:
```bash
curl https://gmeowbased.com/api/frame/badgeShare?fid=12345&badgeId=gmeow-vanguard
```

**Response Structure**:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="https://gmeowbased.com/api/frame/badgeShare/image?fid=12345&badgeId=gmeow-vanguard" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="View Full Collection" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="https://gmeowbased.com/profile/12345/badges" />
    <!-- ... more frame tags ... -->
  </head>
  <body>...</body>
</html>
```

---

### OG Image Generator

**Route**: `GET /api/frame/badgeShare/image`

**Query Parameters**:
- `fid` (required): Farcaster ID
- `badgeId` (required): Badge registry ID
- `state` (optional): Error state (`notfound`)

**Response**: PNG image (1200x628)

**Image Composition**:
- **Background**: Tier-specific radial gradient
- **Badge Image**: 280x280 with tier border + glow effect
- **Badge Name**: 56px, bold, white
- **Tier Pill**: 24px, uppercase, tier color with gradient border
- **Description**: 24px, 80% opacity
- **Earned Date**: 20px, 70% opacity (format: "Jan 15, 2025")
- **Minted Status**: Green checkmark if on-chain
- **Footer**: "@gmeowbased" branding (18px, 50% opacity)

**Tier Gradients**:
```typescript
{
  mythic: { start: '#9C27FF', end: '#7B1DD9' },      // Purple
  legendary: { start: '#FFD966', end: '#FFA500' },   // Gold
  epic: { start: '#61DFFF', end: '#3B82F6' },        // Blue
  rare: { start: '#A18CFF', end: '#7C5CFF' },        // Light Purple
  common: { start: '#D3D7DC', end: '#9CA3AF' },      // Gray
}
```

**Error States**:
- **Invalid FID/Badge ID**: ⚠️ icon + "Invalid FID/Badge ID"
- **Badge Not Found**: 🔍 icon + "Badge Not Found"

**Example**:
```bash
curl https://gmeowbased.com/api/frame/badgeShare/image?fid=12345&badgeId=gmeow-vanguard -o badge.png
```

---

## Helper Utilities

Located in `/lib/frame-badge.ts`:

### `buildBadgeShareFrameUrl()`

Generates frame URL for badge sharing.

**Signature**:
```typescript
function buildBadgeShareFrameUrl(
  fid: number | string,
  badgeId: string,
  originOverride?: string | null
): string
```

**Example**:
```typescript
const frameUrl = buildBadgeShareFrameUrl(12345, 'gmeow-vanguard')
// Returns: https://gmeowbased.com/api/frame/badgeShare?fid=12345&badgeId=gmeow-vanguard
```

### `buildBadgeShareImageUrl()`

Generates OG image URL for badge frame.

**Signature**:
```typescript
function buildBadgeShareImageUrl(
  fid: number | string,
  badgeId: string,
  originOverride?: string | null
): string
```

### `buildBadgeShareText()`

Generates share cast text for badge.

**Signature**:
```typescript
function buildBadgeShareText(
  badge: UserBadge,
  username?: string
): string
```

**Example**:
```typescript
const shareText = buildBadgeShareText(badge, 'alice')
// Returns: "Just earned the Gmeow Vanguard badge (Legendary tier) on @gmeowbased! 🎖️ Check out my collection!"
```

### `getBadgeExplorerUrl()`

Gets block explorer URL for minted badges.

**Signature**:
```typescript
function getBadgeExplorerUrl(badge: UserBadge): string | null
```

**Supported Chains**:
- **Base**: `https://basescan.org/tx/{txHash}`
- **Optimism**: `https://optimistic.etherscan.io/tx/{txHash}`
- **Celo**: `https://celoscan.io/tx/{txHash}`
- **Unichain**: `https://unichain.explorer.com/tx/{txHash}`
- **Ink**: `https://explorer.inkonchain.com/tx/{txHash}`

### Validators

**`isValidBadgeId(badgeId: string): boolean`**
- Validates badge ID format: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Examples: ✅ `gmeow-vanguard`, ❌ `GMEOW-VANGUARD`, ❌ `gmeow_vanguard`

**`isValidFid(fid: number | string): boolean`**
- Validates Farcaster ID is positive integer
- Examples: ✅ `12345`, ✅ `"12345"`, ❌ `0`, ❌ `"abc"`

### Formatters

**`formatBadgeDate(dateString: string): string`**
- Converts ISO date to "Jan 15, 2025" format

**`getTierGradient(tier: string): { start: string; end: string }`**
- Returns gradient colors for badge tier

---

## React Components

### BadgeShareCard

Displays a single badge with share functionality.

**Usage**:
```tsx
import { BadgeShareCard } from '@/components/frame/BadgeShareCard'

<BadgeShareCard
  badge={userBadge}
  fid={12345}
  username="alice"
  onShare={() => console.log('Badge shared!')}
  className="custom-class"
/>
```

**Props**:
```typescript
interface BadgeShareCardProps {
  badge: UserBadge           // Badge data from getUserBadges()
  fid: number | string       // Farcaster ID
  username?: string          // Optional username for personalized text
  onShare?: () => void       // Callback after successful share
  className?: string         // Additional CSS classes
}
```

**Features**:
- Badge image with tier glow effect
- Tier pill with gradient styling
- Earned date display
- Minted status indicator
- "Share on Warpcast" button
- Disables during sharing (prevents double-clicks)
- Code-splitting with dynamic imports

---

## Integration

### Badge Inventory Page

The badge inventory page (`/app/profile/[fid]/badges/page.tsx`) integrates badge sharing:

**Before** (Plain link):
```tsx
<a href={`https://warpcast.com/~/compose?text=...&embeds[]=${pageUrl}`}>
  Share on Warpcast
</a>
```

**After** (Frame integration):
```tsx
<button onClick={async () => {
  const { openWarpcastComposer } = await import('@/lib/share')
  const { buildBadgeShareFrameUrl, buildBadgeShareText } = await import('@/lib/frame-badge')
  
  const latestBadge = badges[0]
  const shareUrl = buildBadgeShareFrameUrl(fid, latestBadge.badgeId)
  const shareText = buildBadgeShareText(latestBadge)
  
  await openWarpcastComposer(shareText, shareUrl)
}}>
  Share on Warpcast
</button>
```

### Share Utilities

Updated `/lib/share.ts` to support badge frames:

**Type Addition**:
```typescript
export type FrameShareInput = {
  type: 'guild' | 'quest' | 'leaderboard' | 'referral' | 'points' | 'gm' | 'verify' | 'onchainstats' | 'badge'
  // ... other fields
  badgeId?: string  // New field for badge sharing
}
```

---

## Performance

### Caching Strategy

**Frame Endpoint**:
- Cache duration: 5 minutes
- Headers: `Cache-Control: public, max-age=300, s-maxage=300`
- CDN caching: Enabled
- Browser caching: Enabled

**OG Image**:
- Cache duration: 5 minutes
- Export: `revalidate = 300`
- CDN caching: Enabled
- Image generation: < 1 second

### Bundle Size

- `lib/frame-badge.ts`: ~5 KB (gzipped)
- `BadgeShareCard.tsx`: ~3 KB (gzipped)
- Frame routes: Server-side only (no client impact)
- Total client bundle increase: < 10 KB

### Optimization

**Code Splitting**:
```typescript
// Dynamic imports for share functionality
const { openWarpcastComposer } = await import('@/lib/share')
const { buildBadgeShareFrameUrl } = await import('@/lib/frame-badge')
```

**Image Generation**:
- Uses `ImageResponse` from `next/og` (Edge Runtime compatible)
- No external font downloads
- Efficient gradient rendering

---

## Testing

### Manual Testing

1. **Frame Endpoint**:
   ```bash
   curl https://gmeowbased.com/api/frame/badgeShare?fid=12345&badgeId=gmeow-vanguard
   ```
   - Verify HTML contains frame tags
   - Check OG image URL

2. **OG Image**:
   ```bash
   curl https://gmeowbased.com/api/frame/badgeShare/image?fid=12345&badgeId=gmeow-vanguard -o test.png
   ```
   - Verify 1200x628 dimensions
   - Check file size < 200 KB
   - Validate tier colors

3. **Share Flow**:
   - Visit `/profile/12345/badges`
   - Click "Share on Warpcast"
   - Verify composer opens with frame preview
   - Test frame buttons

### Automated Testing

Run verification script:
```bash
./scripts/qa/verify-phase-3c.sh
```

Tests covered:
- File existence checks
- TypeScript compilation
- Linting
- Frame endpoint responses
- OG image generation
- Helper function exports
- Share integration
- Component structure

---

## Security

### Input Validation

**FID Validation**:
```typescript
isValidFid(fid) // Must be positive integer
```

**Badge ID Validation**:
```typescript
isValidBadgeId(badgeId) // Must match ^[a-z0-9]+(?:-[a-z0-9]+)*$
```

### XSS Prevention

- React automatically escapes JSX values
- `ImageResponse` uses JSX (no HTML injection)
- Frame HTML uses safe string interpolation

### Rate Limiting

Recommended configuration (future enhancement):
```typescript
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
})

await limiter.check(request, 100, 'BADGE_FRAME')
```

---

## Troubleshooting

### Frame not displaying in Warpcast

1. **Validate frame HTML**:
   - Use [Farcaster Frame Validator](https://warpcast.com/~/developers/frames)
   - Check all meta tags present

2. **Check OG image**:
   ```bash
   curl -I https://gmeowbased.com/api/frame/badgeShare/image?fid=12345&badgeId=test
   ```
   - Verify 200 response
   - Check `Content-Type: image/png`

3. **Clear Warpcast cache**:
   - Add `?v=1` to frame URL
   - Warpcast will refetch frame

### OG image generation errors

1. **Check badge data**:
   ```bash
   curl https://gmeowbased.com/api/badges/list?fid=12345
   ```

2. **Verify badge ID format**:
   - Must be lowercase with hyphens
   - Example: `gmeow-vanguard`

3. **Check function logs**:
   ```bash
   vercel logs --follow | grep badgeShare
   ```

---

## Future Enhancements

### Phase 3C+ Features

1. **Individual Badge Sharing** (per badge in inventory)
2. **Frame Actions** (Mint Badge, Like Badge)
3. **Custom OG Images** (per-badge templates)
4. **Share Analytics** (track badge share counts)
5. **Social Graph Integration** (send badge as gift)

---

## Related Documentation

- [Mint Queue System](./mint-queue.md) - Phase 3A blockchain minting
- [Admin Panel](./admin-panel.md) - Phase 3B badge management
- [Badge Registry](./registry-format.md) - Badge metadata specification
- [Neynar Score](./neynar-score.md) - Automatic badge assignment

---

**Version**: 2.2.0  
**Last Updated**: January 15, 2025  
**Status**: Production Ready
