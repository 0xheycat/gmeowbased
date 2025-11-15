# Onboarding Flow Stage 5 Implementation

## Overview
Comprehensive onboarding system with Farcaster identity integration, Neynar score-based tiering, and blockchain rewards.

## Features Implemented

### 1. **Farcaster Profile Integration**
- Automatic profile loading (displayName, username, pfpUrl, FID)
- Never shows wallet addresses - Farcaster is primary identity
- Loads on component mount via `/api/user/profile`

### 2. **Neynar Tiering System**
Five-tier ranking based on Neynar influence score:

| Tier | Score Range | Color | Points Bonus |
|------|-------------|-------|--------------|
| **Mythic** | ≥1.0 | #9C27FF (violet) | +1000 points |
| **Legendary** | 0.8-1.0 | #FFD966 (gold) | +400 points |
| **Epic** | 0.5-0.8 | #61DFFF (aqua) | +200 points |
| **Rare** | 0.3-0.5 | #A18CFF (lavender) | +100 points |
| **Common** | <0.3 | #D3D7DC (silver) | 0 points |

### 3. **Baseline Rewards**
All users receive on first onboarding:
- **+50 points** (base reward)
- **+30 XP** (experience)
- **Tier-specific bonus** (0-1000 points)

### 4. **OG NFT Minting**
- **Mythic tier only** (score >1.0)
- Shows "Mint OG Badge" button after claiming rewards
- Auto-connects wallet on desktop via Wagmi
- Queued via `mint_queue` table for offline processing

### 5. **Stage Progression**
**Stages 1-4:** Educational cards explaining platform features
- Stage 1: Welcome & Quest System
- Stage 2: Farcaster Connection
- Stage 3: Streaks & Power Badges
- Stage 4: Guilds & Team Rewards

**Stage 5:** Final reveal card with user profile
- Shows Farcaster avatar as card artwork
- Displays calculated tier with color accent
- Breakdown of rewards (baseline + tier bonus)
- "Claim Rewards" button (all users)
- "Mint OG Badge" button (Mythic only, after claiming)

## API Endpoints

### `/api/onboard/status` (GET)
Check if user has completed onboarding
```json
{
  "onboarded": true,
  "tier": "mythic",
  "onboardedAt": "2025-01-12T00:00:00Z"
}
```

### `/api/onboard/complete` (POST)
Complete onboarding and award rewards
```json
{
  "fid": 123,
  "tier": "mythic",
  "neynarScore": 1.05,
  "address": "0x..."
}
```
**Response:**
```json
{
  "success": true,
  "tier": "mythic",
  "rewards": {
    "baselinePoints": 50,
    "baselineXP": 30,
    "tierPoints": 1000,
    "totalPoints": 1050,
    "totalXP": 30
  },
  "ogNftEligible": true
}
```

### `/api/neynar/score?fid=123` (GET)
Fetch Neynar influence score
```json
{
  "fid": 123,
  "score": 1.05,
  "followerCount": 5000,
  "followingCount": 500,
  "powerBadge": true
}
```

## Database Schema

### `user_profiles` (updated)
```sql
ALTER TABLE user_profiles ADD COLUMN:
- onboarded_at TIMESTAMPTZ
- neynar_score DECIMAL(3,2)
- neynar_tier VARCHAR(20)
- og_nft_eligible BOOLEAN
```

### `mint_queue` (new)
```sql
CREATE TABLE mint_queue (
  id BIGSERIAL PRIMARY KEY,
  fid BIGINT NOT NULL,
  wallet_address TEXT NOT NULL,
  badge_type VARCHAR(50),
  status VARCHAR(20),
  tx_hash TEXT,
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Yu-Gi-Oh Card Design
Stage 5 uses actual trading card template:
- Golden border with holographic shine
- User's Farcaster avatar as card artwork
- Tier-based color accent (border glow)
- ATK/DEF style stats footer showing rewards
- Parchment description box with breakdown

## Key Functions

### `getTierFromScore(score: number): TierType`
Maps Neynar score to tier using exact ranges from `TIER_CONFIG`

### `handleClaimRewards()`
- Calls `/api/onboard/complete` with FID, tier, score, address
- Awards baseline + tier-specific points
- Marks user as onboarded
- For Mythic: sets `og_nft_eligible = true`, queues mint

### Profile Loading Flow
1. Component mounts → `useEffect` triggered
2. Check `/api/onboard/status` - skip if already done
3. Fetch `/api/user/profile` - get Farcaster data
4. Fetch `/api/neynar/score?fid=X` - calculate tier
5. Set `farcasterProfile` state with all data
6. Stage 5 renders with dynamic user info

## Neynar Score Calculation
Influence score based on:
- **Follower count:** Up to 0.5 points (1000+ followers = max)
- **Power badge:** +0.3 points (verified status)
- **Engagement ratio:** +0.2 points (follower/following > 2)

**Example:**
```typescript
// User with 5000 followers, 500 following, power badge
const baseScore = Math.min(5000 / 2000, 0.5) // 0.5
const powerBonus = 0.3 // +0.3 for power badge
const engagementBonus = (5000 / 500 > 2) ? 0.2 : 0 // +0.2
const totalScore = 0.5 + 0.3 + 0.2 // 1.0 = Mythic tier!
```

## Error Handling
- Graceful fallback if Farcaster profile unavailable
- Default to `common` tier if score fetch fails
- Prevents duplicate claims via `onboarded_at` check
- Queues mint for offline wallet users

## Testing
Test scenarios:
1. ✅ New user with Mythic score (>1.0) → Should see OG mint button
2. ✅ Common tier user (<0.3) → Should get baseline only
3. ✅ Already onboarded → Should show "Rewards Claimed"
4. ✅ No wallet connected (Mythic) → Should show ConnectWallet
5. ✅ Wallet connected (Mythic) → Should enable mint button

## Files Modified/Created

### Components
- `components/intro/OnboardingFlow.tsx` (major update)

### API Routes
- `app/api/onboard/status/route.ts` (new)
- `app/api/onboard/complete/route.ts` (new)
- `app/api/neynar/score/route.ts` (new)

### Database
- `supabase/migrations/20250112000000_add_onboarding_tracking.sql` (new)

## Next Steps
1. Test onboarding flow with real Farcaster users
2. Implement actual OG NFT minting contract call
3. Add staged reveal animation with typewriter effect
4. Create admin dashboard for mint queue monitoring
5. Add notification when OG NFT mint completes
6. Implement retry logic for failed mints

## Configuration
All tier thresholds and rewards are centralized in constants:
```typescript
const TIER_CONFIG = { mythic: { min: 1.0, ... }, ... }
const BASELINE_REWARDS = { points: 50, xp: 30 }
```
Easy to adjust values without code changes.
