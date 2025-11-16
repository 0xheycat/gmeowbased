# Neynar Influence Scoring

**Automatic Badge Assignment via Neynar API**

Version: 2.0  
Last Updated: January 15, 2025  
**Spec Audit**: ✅ Compliant (Neynar API v2, Jan 2025)

---

## Overview

The Neynar Influence Scoring system automatically calculates a user's influence score (0-1.0+) based on their Farcaster profile data. This score determines which tier badge the user receives during onboarding, eliminating manual tier assignment.

## Score Calculation

### Formula

```typescript
influenceScore = baseScore + powerBadgeBonus + engagementBonus + activeBonus + verificationBonus
```

### Score Components

| Component | Range | Weight | Calculation |
|-----------|-------|--------|-------------|
| **Base Score** | 0 - 0.5 | 50% | `followerCount / 2000` (capped at 0.5) |
| **Power Badge Bonus** | 0 or 0.3 | 30% | +0.3 if user has Farcaster power badge |
| **Engagement Ratio** | 0 - 0.2 | 20% | `followerCount / followingCount * 0.2` (capped at 0.2) |
| **Active Status** | 0 or 0.05 | 5% | +0.05 if user posted in last 30 days |
| **Verified Addresses** | 0 - 0.15 | 15% | +0.05 per verified address (max 3) |

**Total Maximum Score**: 1.2 (capped at highest tier threshold)

---

## API Integration

### Neynar API Endpoint

**Endpoint**: `GET /v2/farcaster/user/bulk`

**Documentation**: https://docs.neynar.com/reference/user-bulk

**Authentication**: Bearer token (API key)

### Request

```typescript
const response = await fetch(
  `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
  {
    headers: {
      'accept': 'application/json',
      'api_key': process.env.NEYNAR_API_KEY!,
    },
  }
)
```

### Response Schema

```typescript
interface NeynarUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  follower_count: number
  following_count: number
  verifications: string[]           // Array of verified addresses
  active_status: string             // 'active' | 'inactive'
  power_badge: boolean              // Farcaster power badge status
}
```

---

## Score Calculation Implementation

### API Route

**Location**: `/app/api/neynar/score/route.ts`

**Method**: `POST`

**Body**:
```typescript
{
  fid: number
}
```

**Response**:
```typescript
{
  fid: number
  score: number                      // 0 - 1.2
  tier: TierType                     // mythic, legendary, epic, rare, common
  metrics: {
    followerCount: number
    followingCount: number
    hasPowerBadge: boolean
    activeStatus: string
    verificationCount: number
    engagementRatio: number
  }
  breakdown: {
    baseScore: number               // 0 - 0.5
    powerBadgeBonus: number         // 0 or 0.3
    engagementBonus: number         // 0 - 0.2
    activeBonus: number             // 0 or 0.05
    verificationBonus: number       // 0 - 0.15
  }
}
```

### Calculation Logic

```typescript
async function calculateNeynarScore(fid: number): Promise<ScoreResult> {
  // Fetch user data from Neynar
  const user = await fetchBulkUsers([fid])
  
  // Base score (0 - 0.5): Follower count
  const baseScore = Math.min(user.follower_count / 2000, 0.5)
  
  // Power badge bonus (0 or 0.3)
  const powerBadgeBonus = user.power_badge ? 0.3 : 0
  
  // Engagement ratio (0 - 0.2): Follower/following ratio
  const engagementRatio = user.following_count > 0
    ? Math.min((user.follower_count / user.following_count) * 0.2, 0.2)
    : 0
  
  // Active status bonus (0 or 0.05)
  const activeBonus = user.active_status === 'active' ? 0.05 : 0
  
  // Verification bonus (0 - 0.15): +0.05 per verified address (max 3)
  const verificationBonus = Math.min(user.verifications.length * 0.05, 0.15)
  
  // Total score
  const totalScore = baseScore + powerBadgeBonus + engagementRatio + activeBonus + verificationBonus
  
  // Determine tier
  const tier = calculateTier(totalScore)
  
  return {
    fid,
    score: totalScore,
    tier,
    metrics: {
      followerCount: user.follower_count,
      followingCount: user.following_count,
      hasPowerBadge: user.power_badge,
      activeStatus: user.active_status,
      verificationCount: user.verifications.length,
      engagementRatio: user.follower_count / user.following_count,
    },
    breakdown: {
      baseScore,
      powerBadgeBonus,
      engagementBonus: engagementRatio,
      activeBonus,
      verificationBonus,
    },
  }
}
```

---

## Tier Mapping

### Score to Tier Conversion

```typescript
function calculateTier(score: number): TierType {
  if (score >= 1.0) return 'mythic'
  if (score >= 0.8) return 'legendary'
  if (score >= 0.5) return 'epic'
  if (score >= 0.3) return 'rare'
  return 'common'
}
```

### Tier Thresholds

| Tier | Min Score | Max Score | Points Bonus | Badge Example |
|------|-----------|-----------|--------------|---------------|
| **Mythic** | 1.0 | ∞ | +1000 | Gmeow Vanguard |
| **Legendary** | 0.8 | 0.99 | +400 | Warp Navigator |
| **Epic** | 0.5 | 0.79 | +200 | Signal Luminary |
| **Rare** | 0.3 | 0.49 | +100 | Pulse Runner |
| **Common** | 0.0 | 0.29 | +0 | Neon Initiate |

---

## Onboarding Integration

### Onboarding Flow

```
User completes onboarding
       ↓
Calculate Neynar score
       ↓
Determine tier
       ↓
Assign tier badge
       ↓
Award tier points bonus
       ↓
Queue badge mint
       ↓
(Mythic only) Queue OG NFT mint
```

### Onboarding API

**Location**: `/app/api/onboard/complete/route.ts`

**Method**: `POST`

**Body**:
```typescript
{
  fid: number
  address?: string                   // Optional wallet address
}
```

**Response**:
```typescript
{
  success: boolean
  tier: TierType
  neynarScore: number
  scoreBreakdown: {
    baseScore: number
    powerBadgeBonus: number
    engagementBonus: number
    activeBonus: number
    verificationBonus: number
  }
  rewards: {
    baselinePoints: number          // 50
    baselineXp: number              // 30
    tierBonus: number               // Tier-specific bonus
    totalPoints: number
  }
  badge: {
    id: string
    badgeId: string
    badgeType: string
    tier: TierType
    assignedAt: string
    minted: boolean
    metadata: object
  }
  ogNftEligible: boolean            // true for Mythic only
}
```

### Code Example

```typescript
// Calculate Neynar score
const { score, tier } = await calculateNeynarScore(fid)

// Assign tier badge
const badge = await assignBadgeToUser(fid, getTierBadgeType(tier))

// Award rewards
const rewards = {
  baselinePoints: 50,
  baselineXp: 30,
  tierBonus: getTierBonus(tier),
  totalPoints: 50 + getTierBonus(tier),
}

await awardPoints(fid, rewards.totalPoints)
await awardXp(fid, rewards.baselineXp)

// Queue badge mint
await queueBadgeMint(badge.id, 'base')

// Queue OG NFT mint (Mythic only)
if (tier === 'mythic') {
  await queueOgNftMint(fid)
}
```

---

## Score Examples

### Example 1: Mythic User

**Metrics**:
- Followers: 5,000
- Following: 500
- Power Badge: Yes
- Active: Yes
- Verified Addresses: 3

**Calculation**:
```typescript
baseScore = min(5000 / 2000, 0.5) = 0.5
powerBadgeBonus = 0.3
engagementBonus = min((5000 / 500) * 0.2, 0.2) = 0.2
activeBonus = 0.05
verificationBonus = min(3 * 0.05, 0.15) = 0.15

totalScore = 0.5 + 0.3 + 0.2 + 0.05 + 0.15 = 1.2
tier = mythic
```

### Example 2: Legendary User

**Metrics**:
- Followers: 2,000
- Following: 1,000
- Power Badge: Yes
- Active: Yes
- Verified Addresses: 1

**Calculation**:
```typescript
baseScore = min(2000 / 2000, 0.5) = 0.5
powerBadgeBonus = 0.3
engagementBonus = min((2000 / 1000) * 0.2, 0.2) = 0.2
activeBonus = 0.05
verificationBonus = min(1 * 0.05, 0.15) = 0.05

totalScore = 0.5 + 0.3 + 0.2 + 0.05 + 0.05 = 1.1  → capped at 1.0 threshold
tier = mythic (score ≥ 1.0)
```

### Example 3: Epic User

**Metrics**:
- Followers: 800
- Following: 600
- Power Badge: No
- Active: Yes
- Verified Addresses: 2

**Calculation**:
```typescript
baseScore = min(800 / 2000, 0.5) = 0.4
powerBadgeBonus = 0
engagementBonus = min((800 / 600) * 0.2, 0.2) = 0.2
activeBonus = 0.05
verificationBonus = min(2 * 0.05, 0.15) = 0.1

totalScore = 0.4 + 0 + 0.2 + 0.05 + 0.1 = 0.75
tier = epic
```

### Example 4: Common User

**Metrics**:
- Followers: 50
- Following: 200
- Power Badge: No
- Active: No
- Verified Addresses: 0

**Calculation**:
```typescript
baseScore = min(50 / 2000, 0.5) = 0.025
powerBadgeBonus = 0
engagementBonus = min((50 / 200) * 0.2, 0.2) = 0.05
activeBonus = 0
verificationBonus = 0

totalScore = 0.025 + 0 + 0.05 + 0 + 0 = 0.075
tier = common
```

---

## Error Handling

### Neynar API Errors

**Fallback Strategy**: If Neynar API fails, assign common tier badge.

```typescript
try {
  const { score, tier } = await calculateNeynarScore(fid)
  return { tier, score }
} catch (error) {
  console.error('Neynar API error:', error)
  return { tier: 'common', score: 0 }  // Fallback to common
}
```

**Common Errors**:
- `401 Unauthorized`: Invalid API key
- `404 Not Found`: FID not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Neynar service down

### Rate Limiting

**Neynar API Limits**:
- Free tier: 100 requests/hour
- Pro tier: 10,000 requests/hour

**Caching Strategy**:
```typescript
// Cache score for 1 hour
const cachedScore = await redis.get(`neynar:score:${fid}`)
if (cachedScore) return JSON.parse(cachedScore)

const score = await calculateNeynarScore(fid)
await redis.setex(`neynar:score:${fid}`, 3600, JSON.stringify(score))
return score
```

---

## Testing

### Manual Testing

Test score calculation with different FIDs:

```bash
curl -X POST https://gmeowbased.com/api/neynar/score \
  -H "Content-Type: application/json" \
  -d '{"fid": 12345}'
```

### Mock Data

For testing without Neynar API:

```typescript
const MOCK_USER: NeynarUser = {
  fid: 12345,
  username: 'testuser',
  display_name: 'Test User',
  pfp_url: 'https://example.com/pfp.png',
  follower_count: 1000,
  following_count: 500,
  verifications: ['0x1234...'],
  active_status: 'active',
  power_badge: false,
}
```

---

## Score Recalculation

### When to Recalculate

Scores should be recalculated:
- **Never** (onboarding only) - Badge tier is permanent
- **Optional**: Allow tier upgrade via admin panel

### Manual Recalculation

Admin can manually trigger recalculation:

```typescript
// In admin panel
const newScore = await calculateNeynarScore(fid)
const newTier = calculateTier(newScore.score)

if (newTier !== currentTier) {
  await upgradeBadgeTier(fid, newTier)
}
```

---

## Future Enhancements

### Dynamic Scoring

- **Real-time updates**: Recalculate score on profile changes
- **Score history**: Track score changes over time
- **Tier upgrades**: Allow automatic tier upgrades
- **Decay mechanism**: Reduce score if user becomes inactive

### Advanced Metrics

- **Cast engagement**: Factor in likes, recasts, replies
- **Channel influence**: Weight by channel membership
- **Network effects**: Factor in follower quality
- **Content quality**: NLP analysis of casts

---

## Related Documentation

- [Badge Registry](./registry-format.md) - Badge metadata specification
- [Admin Panel](./admin-panel.md) - Manual badge assignment
- [Mint Queue System](./mint-queue.md) - Badge minting infrastructure

---

**Version**: 2.0  
**Last Updated**: January 15, 2025  
**Status**: Production Ready
