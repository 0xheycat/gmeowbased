# Frames Integration Guide

## Overview

The Frames feature allows users to share personalized achievement frames on Farcaster. Each frame is an interactive OG image that displays user stats, badges, quests, and other achievements.

**Route:** `/frames`

**Created:** January 11, 2026

## Available Frames

All frames are personalized with the user's FID (Farcaster ID) and update automatically as achievements are earned.

### 1. Badge Collection Frame
- **Route:** `/frame/badge/[fid]?badgeId=[id]`
- **Purpose:** Showcase earned badges and achievements
- **Data:** Badge metadata, earn date, rarity
- **Icon:** Award/Trophy

### 2. Leaderboard Frame
- **Route:** `/frame/leaderboard?fid=[fid]`
- **Purpose:** Display user rank and competitive stats
- **Data:** Global rank, points, quest completions
- **Icon:** Trophy

### 3. Points Balance Frame
- **Route:** `/frame/points?fid=[fid]`
- **Purpose:** Show total points and rewards breakdown
- **Data:** Total points, pending rewards, bonuses
- **Icon:** Target

### 4. GM Streak Frame
- **Route:** `/frame/gm?fid=[fid]`
- **Purpose:** Daily GM streak and consistency
- **Data:** Current streak, longest streak, points earned
- **Icon:** Sun

### 5. Guild Membership Frame
- **Route:** `/frame/guild?id=[guildId]&fid=[fid]`
- **Purpose:** Guild achievements and membership
- **Data:** Guild name, level, members, points
- **Icon:** Users

### 6. Referral Stats Frame
- **Route:** `/frame/referral?fid=[fid]`
- **Purpose:** Referral performance metrics
- **Data:** Total referrals, active referrals, points earned
- **Icon:** Gift

### 7. Onchain Stats Frame
- **Route:** `/frame/stats/[fid]`
- **Purpose:** Blockchain activity summary
- **Data:** Transactions, contracts, gas spent
- **Icon:** TrendingUp

### 8. Verify Account Frame
- **Route:** `/frame/verify?fid=[fid]`
- **Purpose:** Account verification status
- **Data:** Verified status, verification date
- **Icon:** CheckCircle

## User Journey

### Access Points

1. **Navigation Header**
   - "Frames" link in main navigation
   - Available to all authenticated users

2. **Profile Page**
   - "Share Frames" button in profile header (owner only)
   - Next to "Edit Profile" button
   - Direct link to `/frames`

3. **Direct URL**
   - Users can visit `/frames` directly
   - Redirects to login if not authenticated

### Frame Gallery Page (`/frames`)

**Features:**
- Grid layout of all 8 frame types
- Each card shows:
  - Icon and gradient background
  - Title and description
  - Copy URL button (copies frame link to clipboard)
  - Preview button (opens frame in new tab)
  - Share button (opens Warpcast composer with frame embedded)

**User Actions:**

1. **Copy URL**
   - Copies personalized frame URL to clipboard
   - Shows "Copied!" confirmation for 2 seconds
   - URL format: `https://gmeowbased.com/frame/[type]/[fid]`

2. **Preview**
   - Opens frame in new tab
   - Shows actual frame image and interactive buttons
   - Users can test before sharing

3. **Share to Farcaster**
   - Opens Warpcast composer
   - Pre-fills cast text: "Check out my [Frame Title]!"
   - Embeds frame URL (automatically renders as interactive frame)
   - User can edit text before posting

## Technical Implementation

### File Structure

```
/app/frames/page.tsx                     # Main gallery page
/app/frame/[type]/route.tsx             # Individual frame routes
/app/api/frame/[type]/image/route.tsx   # OG image generation
/components/profile/ProfileHeader.tsx    # Share button integration
/components/layout/Header.tsx            # Navigation link
/lib/api/share.ts                       # URL building utilities
```

### Key Functions

#### `buildFrameShareUrl(input: FrameShareInput)`
Generates the correct frame URL based on type and parameters.

```typescript
import { buildFrameShareUrl } from '@/lib/api/share'

// Example: Badge frame
const url = buildFrameShareUrl({
  type: 'badge',
  fid: '123456',
  badgeId: '1'
})
// Result: https://gmeowbased.com/frame/badge/123456?badgeId=1
```

### Authentication Flow

```
User visits /frames
  ↓
Check authentication (useAuth hook)
  ↓
If NOT authenticated → Redirect to /login?redirect=/frames
  ↓
If authenticated → Show frame gallery with user's FID
```

### Data Sources

- **User FID:** `useAuth()` hook
- **Frame URLs:** `buildFrameShareUrl()` from `/lib/api/share.ts`
- **Frame Images:** Generated via Next.js ImageResponse API
- **Frame Data:** Fetched from Supabase, Subsquid GraphQL, Neynar API

## Farcaster Integration

### Frame Specification

All frames follow Farcaster Frame v2 specification:

- **Image Size:** 1200x630px (OG standard)
- **Meta Tags:** `fc:frame`, `og:image`, `og:title`, etc.
- **Interactive Buttons:** Up to 4 buttons per frame
- **POST Handlers:** Handle button clicks and user interactions

### Warpcast Share URL Format

```
https://warpcast.com/~/compose?text=[encoded_text]&embeds[]=[encoded_frame_url]
```

**Example:**
```
https://warpcast.com/~/compose
  ?text=Check%20out%20my%20Badge%20Collection!
  &embeds[]=https%3A%2F%2Fgmeowbased.com%2Fframe%2Fbadge%2F123456
```

When posted, Warpcast automatically:
1. Fetches frame metadata from URL
2. Renders OG image as preview
3. Shows interactive buttons below image
4. Handles button POST requests

## Event Tracking

### Frame Views
- Tracked via frame route GET requests
- Logged in analytics dashboard

### Frame Shares
- Tracked when "Share" button clicked
- Destination: Warpcast (external, not tracked)

### Frame Interactions
- Button clicks tracked via POST handlers
- Examples: "View Profile", "Join Guild", "Complete Quest"

## Styling & Design

### Color Gradients

Each frame type has a unique gradient for visual distinction:

- Badge: `from-yellow-500/20 to-orange-500/20`
- Leaderboard: `from-purple-500/20 to-pink-500/20`
- Points: `from-blue-500/20 to-cyan-500/20`
- GM: `from-amber-500/20 to-yellow-500/20`
- Guild: `from-green-500/20 to-emerald-500/20`
- Referral: `from-pink-500/20 to-rose-500/20`
- Stats: `from-indigo-500/20 to-violet-500/20`
- Verify: `from-teal-500/20 to-cyan-500/20`

### Responsive Behavior

- **Desktop:** 3-column grid
- **Tablet:** 2-column grid
- **Mobile:** 1-column stack

### Animations

- **Card Entry:** Staggered fade-in (0.1s delay per card)
- **Hover:** Gradient opacity increases, shadow appears
- **Copy Confirmation:** Button changes to green with checkmark

## Testing

### Manual Testing

1. Visit `/frames` as authenticated user
2. Click "Copy URL" on each frame → Verify clipboard contains correct URL
3. Click "Preview" → Verify frame opens in new tab with correct image
4. Click "Share" → Verify Warpcast composer opens with embedded frame
5. Test on mobile → Verify responsive layout

### Automated Testing

See `/scripts/test-all-frames.ts` for comprehensive frame testing:

```bash
npx tsx scripts/test-all-frames.ts
```

**Expected Results:**
- All 8 frame types generate images successfully
- Images saved to `test-output/frames/`
- JSON report shows all frames passing

## Contract Event Alignment

All frames verified against December 31, 2025 contract deployment:

- **Core Contract:** `0x343829A6A613d51B4A81c2dE508e49CA66D4548d`
- **Guild Contract:** `0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097`

**Events Used:**
- QuestCompleted (Quest/Leaderboard frames)
- GMSent (GM frame)
- GuildJoined/GuildLeft (Guild frame)
- BadgeMinted (Badge frame)
- PointsTipped (Points frame)

See `/scripts/verify-frame-contract-alignment.ts` for verification.

## Troubleshooting

### Frame Not Generating Image

**Symptoms:** Blank image or 500 error

**Common Causes:**
1. Missing environment variables (`NEXT_PUBLIC_SUBSQUID_URL`, `SUPABASE_URL`)
2. Font files not found in `public/fonts/`
3. User has no data for that frame type

**Fix:** Check logs in `/app/api/frame/[type]/image/route.tsx`

### Copy URL Not Working

**Cause:** Clipboard API requires HTTPS or localhost

**Fix:** Ensure app running on HTTPS in production

### Share Button Opens Blank Warpcast

**Cause:** Frame URL not properly encoded

**Fix:** Verify `encodeURIComponent()` used for embed URL

### Frame Not Showing in Warpcast

**Cause:** Missing or incorrect meta tags

**Fix:** Check frame route returns proper `fc:frame` and `og:` tags

## Future Enhancements

### Planned Features

1. **Quest Frame**
   - Route: `/frame/quest/[questId]`
   - Show quest details and completion status
   - Share quest announcements

2. **Custom Frame Builder**
   - Allow users to customize frame appearance
   - Choose background colors/gradients
   - Add custom text overlays

3. **Frame Analytics Dashboard**
   - Track views per frame type
   - See which frames are most shared
   - Viral coefficient metrics

4. **Batch Sharing**
   - Select multiple frames to share at once
   - Create "achievement showcase" cast
   - Schedule frame posts

5. **Frame Templates**
   - Pre-designed layouts for different achievement types
   - Seasonal/event-specific templates
   - Guild-branded frames

## Support & Resources

- **Farcaster Frames Spec:** https://docs.farcaster.xyz/learn/what-is-farcaster/frames
- **Warpcast API:** https://docs.warpcast.com/
- **Next.js OG Images:** https://nextjs.org/docs/app/api-reference/functions/image-response
- **Subsquid GraphQL:** https://docs.subsquid.io/

## Changelog

### 2026-01-11 - Initial Release
- Created `/frames` gallery page
- Added navigation links (header + profile)
- Integrated all 8 frame types
- Added copy, preview, and share actions
- Verified contract event alignment
- Comprehensive testing suite
