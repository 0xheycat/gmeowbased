# Phase 4 Badge Features

**Version:** v2.3.0-alpha  
**Release Date:** 2025-11-16  
**Phase:** 4 (Badge System Enhancement)  
**Status:** In Development (Testing Required)

---

## Overview

Phase 4 introduces three major enhancements to the Gmeowbased badge system:

1. **Neynar NFT Minting** - 1-click badge minting via Neynar API
2. **Badge Award Notifications** - Push notifications to re-engage users
3. **Viral Share Mechanics** - Best friends tagging for organic growth

All features are **opt-in** and require environment variable configuration.

---

## 1. Neynar NFT Minting

### Feature Description

Users can now mint badge NFTs with a single click using Neynar's server wallet infrastructure. No wallet transaction required from the user.

### API Functions

#### `mintBadgeViaNeynar()`

Mint badge NFT directly to user's FID (no wallet address needed).

```typescript
import { mintBadgeViaNeynar } from '@/lib/badges'

const result = await mintBadgeViaNeynar(
  14206, // Farcaster ID
  '0x8F01e875C816eC2C9d94E62E47771EbDB82d9A8B', // Contract address
  'base', // Network: 'base' | 'base-sepolia' | 'optimism' | 'celo'
  undefined // Optional token ID for ERC-1155
)

if (result.success) {
  console.log('Minted!', result.transactionHash)
} else {
  console.error('Mint failed:', result.error, result.errorCode)
}
```

**Response:**
```typescript
{
  success: boolean
  transactionHash?: string // On success
  error?: string // On failure
  errorCode?: string // Error classification
}
```

**Error Codes:**
- `INVALID_FID` - Invalid Farcaster ID
- `INVALID_CONTRACT` - Invalid contract address format
- `MISSING_WALLET_ID` - `NEYNAR_SERVER_WALLET_ID` not configured
- `API_ERROR` - Neynar API returned error
- `NO_TRANSACTION` - No transaction hash in response
- `TX_FAILED` - Blockchain transaction failed
- `EXCEPTION` - Unexpected error

#### `batchMintBadgesViaNeynar()`

Mint badges to multiple users in sequence (with rate limit protection).

```typescript
const results = await batchMintBadgesViaNeynar([
  { fid: 14206, contractAddress: '0x...', network: 'base' },
  { fid: 14207, contractAddress: '0x...', network: 'base' },
  { fid: 14208, contractAddress: '0x...', network: 'base', tokenId: '42' },
])

results.forEach((result, index) => {
  if (result.success) {
    console.log(`User ${index + 1}: Minted!`, result.transactionHash)
  } else {
    console.error(`User ${index + 1}: Failed`, result.error)
  }
})
```

### Configuration

**Required Environment Variable:**
```bash
NEYNAR_SERVER_WALLET_ID=your_wallet_id_from_neynar_portal
```

**Setup Steps:**
1. Navigate to [dev.neynar.com/app](https://dev.neynar.com/app)
2. Create a new server wallet
3. Copy the wallet ID
4. Add to `.env` as `NEYNAR_SERVER_WALLET_ID`

### Supported Networks

| Network | Identifier | Mainnet | Testnet |
|---------|-----------|---------|---------|
| Base | `base` | ✅ Yes | ❌ No |
| Base Sepolia | `base-sepolia` | ❌ No | ✅ Yes |
| Optimism | `optimism` | ✅ Yes | ❌ No |
| Celo | `celo` | ✅ Yes | ❌ No |

### Usage Example (Badge Inventory)

```typescript
// app/profile/[fid]/badges/page.tsx
import { mintBadgeViaNeynar } from '@/lib/badges'

async function handleMintBadge(badge: UserBadge) {
  if (badge.minted) {
    alert('Badge already minted!')
    return
  }

  // Get badge contract info from registry
  const badgeRegistry = loadBadgeRegistry()
  const badgeDefinition = badgeRegistry.badges.find(b => b.badgeType === badge.badgeType)
  
  if (!badgeDefinition?.contractAddress) {
    alert('Contract address not configured')
    return
  }

  const result = await mintBadgeViaNeynar(
    badge.fid,
    badgeDefinition.contractAddress,
    badge.chain || 'base'
  )

  if (result.success) {
    // Update badge status in database
    await updateUserBadge(badge.id, {
      minted: true,
      mintedAt: new Date().toISOString(),
      txHash: result.transactionHash,
    })
    alert('Badge minted successfully!')
  } else {
    alert(`Minting failed: ${result.error}`)
  }
}
```

---

## 2. Badge Award Notifications

### Feature Description

Send push notifications to users when they earn new badges. Notifications appear in Farcaster clients (Warpcast, etc.) if the user has enabled notifications for the miniapp.

### API Functions

#### `sendBadgeAwardNotification()`

Send push notification on badge award.

```typescript
import { sendBadgeAwardNotification } from '@/lib/badges'

const result = await sendBadgeAwardNotification(
  14206, // Farcaster ID
  'Vanguard', // Badge name
  'mythic', // Tier: 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'
  'https://gmeowhq.art/profile/14206/badges' // Optional target URL
)

if (result.success) {
  console.log('Notification sent!')
} else {
  console.error('Notification failed:', result.error)
}
```

**Notification Format:**
- **Title:** "New Badge Earned! 🌟" (emoji varies by tier)
- **Body:** "You just earned the Vanguard badge (Mythic tier)"
- **Target URL:** Deep link to badge inventory (defaults to `/profile/{fid}/badges`)

**Tier Emoji Mapping:**
- Mythic: 🌟
- Legendary: 👑
- Epic: 💎
- Rare: ✨
- Common: 🎖️

#### `batchSendBadgeNotifications()`

Send notifications to multiple users (with rate limit protection).

```typescript
await batchSendBadgeNotifications([
  { fid: 14206, badgeName: 'Vanguard', badgeTier: 'mythic' },
  { fid: 14207, badgeName: 'Builder', badgeTier: 'legendary' },
])
```

### Configuration

**Required Environment Variable:**
```bash
NEYNAR_API_KEY=your_api_key_from_neynar_portal
```

**Rate Limits (Enforced by Farcaster Clients):**
- 1 notification per 30 seconds per token
- 100 notifications per day per token

**Setup Steps:**
1. Navigate to [dev.neynar.com](https://dev.neynar.com)
2. Get your API key
3. Add to `.env` as `NEYNAR_API_KEY`
4. Configure miniapp webhook URL (see below)

### Miniapp Configuration

For notifications to work, users must:
1. Add your miniapp to their Farcaster client
2. Enable notifications for your miniapp

**Webhook URL (for notification token management):**
```
https://api.neynar.com/f/app/<your_client_id>/event
```

Configure this in your `farcaster.json` manifest.

### Usage Example (Auto-Notify on Badge Assignment)

```typescript
// lib/badges.ts - assignBadgeToUser()
export async function assignBadgeToUser(
  fid: number,
  badgeType: string,
  tier: TierType
): Promise<UserBadge> {
  // Assign badge to user (existing logic)
  const badge = await createUserBadge({
    fid,
    badgeType,
    tier,
    assignedAt: new Date().toISOString(),
  })

  // NEW: Send push notification (Phase 4)
  const badgeName = badge.metadata?.name || badgeType
  await sendBadgeAwardNotification(fid, badgeName, tier)

  return badge
}
```

---

## 3. Viral Share Mechanics

### Feature Description

Enhanced badge share composer with best friends tagging for viral growth. Automatically tags up to 3 relevant followers when users share their badges.

### API Functions

#### `buildBadgeShareText()` (Enhanced)

Build share text with optional best friends tagging.

```typescript
import { buildBadgeShareText } from '@/lib/frame-badge'

const shareText = buildBadgeShareText(
  badge, // UserBadge
  'alice', // Optional username
  ['bob', 'charlie', 'dave'] // Optional best friend usernames (max 3 used)
)

// Returns: "Just earned the Vanguard badge (Mythic tier) on @gmeowbased! 🌟 Check it out @bob @charlie @dave!"
```

**Features:**
- Tier-specific emojis (🌟 mythic, 👑 legendary, 💎 epic, ✨ rare, 🎖️ common)
- Smart tag limiting (max 3 tags for optimal viral spread)
- Automatic `@` prefix handling (handles `@bob` or `bob`)

#### `fetchBestFriendsForSharing()`

Fetch user's best friends from Neynar API (relevant followers).

```typescript
import { fetchBestFriendsForSharing } from '@/lib/frame-badge'

const bestFriends = await fetchBestFriendsForSharing(14206)
// Returns: ['alice', 'bob', 'charlie', 'dave', 'eve'] (max 5)

// Use in share composer
const shareText = buildBadgeShareText(badge, username, bestFriends)
```

**API Details:**
- Endpoint: `GET /v2/farcaster/followers/relevant?target_fid={fid}&viewer_fid={fid}`
- Returns: Up to 5 relevant followers (Neynar's engagement algorithm)
- Fallback: Returns empty array if API unavailable

### Configuration

**Required Environment Variable:**
```bash
NEYNAR_API_KEY=your_api_key_from_neynar_portal
```

### Usage Example (Badge Share Button)

```typescript
// components/badge/BadgeShareButton.tsx
import { buildBadgeShareText, fetchBestFriendsForSharing } from '@/lib/frame-badge'
import { openWarpcastComposer } from '@/lib/share'

async function handleShareBadge(badge: UserBadge, fid: number, username: string) {
  // Fetch best friends for viral tagging
  const bestFriends = await fetchBestFriendsForSharing(fid)

  // Build share text with tags
  const shareText = buildBadgeShareText(badge, username, bestFriends)

  // Build frame embed URL
  const frameUrl = buildBadgeShareFrameUrl(fid, badge.badgeId)

  // Open Warpcast composer
  await openWarpcastComposer(shareText, frameUrl)
}
```

### Viral Mechanics (Best Practices)

**Why Best Friends Tagging Works:**
1. **Social Proof:** Tags 3 engaged followers (not random)
2. **Network Effect:** Tagged users see badge → Check app → Earn own badges
3. **Optimal Reach:** 3 tags = maximum engagement without spam feel
4. **Personal Connection:** Neynar's algorithm selects engaged followers (not just followers)

**Expected Viral Coefficient:**
- 3 tags per share × 20% engagement = 0.6 new users per share
- If 10% of new users share → 0.6 × 0.1 = 0.06 second-order reach
- **Total reach per share: 1.66x organic amplification**

---

## Environment Variables Summary

```bash
# Required for NFT Minting
NEYNAR_SERVER_WALLET_ID=your_wallet_id_from_neynar_portal

# Required for Notifications + Best Friends
NEYNAR_API_KEY=your_api_key_from_neynar_portal

# Optional: Frame origin for notification target URLs
NEXT_PUBLIC_FRAME_ORIGIN=https://gmeowhq.art
```

---

## Testing Checklist

### Phase 4.5: Testing & Release Gate

Before production merge, verify:

**NFT Minting:**
- [ ] `mintBadgeViaNeynar()` mints to Base mainnet
- [ ] Transaction hash returned and valid on BaseScan
- [ ] Error handling works (invalid FID, invalid contract, missing wallet ID)
- [ ] Batch minting works (3+ users)
- [ ] Rate limiting respected (500ms delay between batch mints)

**Notifications:**
- [ ] `sendBadgeAwardNotification()` sends notification
- [ ] Notification appears in Warpcast (requires user to enable notifications)
- [ ] Tier-specific emojis correct (🌟 mythic, 👑 legendary, etc.)
- [ ] Target URL deep link works (opens badge inventory)
- [ ] Rate limiting respected (1s delay between batch notifications)

**Viral Sharing:**
- [ ] `fetchBestFriendsForSharing()` returns relevant followers
- [ ] `buildBadgeShareText()` tags best friends correctly (max 3)
- [ ] Tier-specific emojis in share text (🌟 mythic, 💎 epic, etc.)
- [ ] Share composer opens with pre-filled text + tags
- [ ] Frame embed displays badge showcase

---

## GI-10 Release Readiness Gate

Per Global Instruction 10, run all 11 gates before production merge:

1. ✅ **API Compliance** - All APIs use correct Neynar endpoints
2. ✅ **Frame URL Compliance (GI-11)** - No direct frame URLs (backend-only)
3. ✅ **Frame Button Compliance (GI-12)** - No frame metadata changes
4. ⏳ **Error Handling** - All new functions have try/catch + error codes
5. ⏳ **Type Safety** - All functions properly typed (TypeScript)
6. ⏳ **Rate Limiting** - Batch functions respect rate limits (delays)
7. ⏳ **Env Var Validation** - Missing env vars handled gracefully
8. ⏳ **Documentation** - This file + code comments complete
9. ⏳ **Testing** - All Phase 4.5 checklist items verified
10. ⏳ **Git Hygiene** - Commit messages clear, no debug code
11. ⏳ **Zero Drift** - MCP validation passed (GI-7/GI-8)

---

## Rollout Plan

**Alpha (v2.3.0-alpha):**
- Deploy to staging branch
- Test with internal team (5-10 users)
- Verify notifications + minting work

**Beta (v2.3.0-beta):**
- Deploy to production (opt-in only)
- Monitor analytics (notification open rates, mint success rates)
- Gather user feedback

**Production (v2.3.0):**
- Enable for all users
- Monitor error rates (< 1% acceptable)
- Iterate on viral mechanics (A/B test tag counts)

---

## Future Enhancements (Phase 5+)

**Potential Features:**
1. **Notification Preferences** - User settings for notification types
2. **Mint Analytics** - Track mint rates, failure reasons, user cohorts
3. **Share Analytics** - Track viral coefficient, tag engagement, conversion rates
4. **Batch Mint UI** - Admin tool for bulk badge minting (events, campaigns)
5. **Dynamic Best Friends** - Update best friends list based on recent activity

---

**Documentation Version:** 1.0.0  
**Last Updated:** 2025-11-16  
**Maintainer:** GitHub Copilot (Claude Sonnet 4.5)
