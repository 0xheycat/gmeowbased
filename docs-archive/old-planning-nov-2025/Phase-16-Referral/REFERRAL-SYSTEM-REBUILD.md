# Phase 16: Referral System Implementation Plan

**Status**: COMPLETE ✅  
**Started**: November 28, 2025  
**Completed**: November 28, 2025  
**Design System**: Tailwick v2.0 + Gmeowbased v0.1  
**Component Strategy**: No new pages - integrate components into existing pages  
**TypeScript Status**: 0 errors ✅

---

## Infrastructure Audit Results

### ✅ Contract Functions Available

Found in `lib/gm-utils.ts`:

```typescript
// Register referral code
createRegisterReferralCodeTx(code: string, chain: GMChainKey = 'base')
// Usage: Register custom referral code (e.g., "COSMIC", "GMEOW")

// Set referrer
createSetReferrerTx(code: string, chain: GMChainKey = 'base')
// Usage: New user sets their referrer using code
```

### ✅ Contract Events Available

Found in `lib/contract-events.ts`:

```typescript
// ReferralCodeRegistered event
{
  category: 'referrals',
  description: 'Pilot registered a custom referral code.',
  automations: ['Publish referral directory updates', 'Evaluate fraud heuristics'],
  notification: {
    title: 'Referral code minted',
    body: '@{owner} claimed referral code **{code}** inside Gmeow.',
    placeholders: ['owner', 'code'],
    preview: '@orbital claimed referral code **COSMIC** inside Gmeow.'
  }
}

// ReferrerSet event
{
  category: 'referrals',
  description: 'A new pilot attributed their account to a referrer.',
  automations: ['Reward both parties with bonuses', 'Track referral funnel metrics'],
  gmUtils: ['createSetReferrerTx'],
  notification: {
    title: 'Referral linked',
    body: '@{pilot} joined under @{referrer}. Referral bonuses inbound.',
    placeholders: ['pilot', 'referrer'],
    preview: '@pilotone joined under @guildmaster. Referral bonuses inbound.'
  }
}

// ReferralRewardClaimed event
{
  category: 'referrals',
  description: 'Referral program paid points or tokens to a recruiter.',
  automations: ['Reconcile referral ledgers', 'Send appreciation notifications'],
  notification: {
    title: 'Referral reward claimed',
    body: '@{referrer} claimed {points} points from @{referee} joining the crew.',
    placeholders: ['referrer', 'points', 'referee'],
    preview: '@guildmaster claimed 100 points from @pilotone joining the crew.'
  }
}
```

### ✅ Telemetry Event Available

Found in `lib/telemetry.ts`:

```typescript
export type RankTelemetryEventKind =
  | 'quest-create'
  | 'quest-claim'
  | 'gm'
  | 'tip'
  | 'badge-mint'
  | 'guild-join'
  | 'referral'       // ✅ Referral event already defined
  | 'onboard'
  | 'stats-query'
  | 'nft-mint'
```

### ✅ Existing Pages to Integrate

1. **Profile Page** (`app/app/profile/page.tsx`)
   - Current structure: ProfileHeader, Quick Actions (4 cards), ActivityFeed
   - **Best placement for ReferralCard**: After Quick Actions, before ActivityFeed
   - Uses Farcaster profile data (pfp + @username)
   - Integrated with wallet context

2. **Leaderboard Page** (`app/app/leaderboard/page.tsx`)
   - Current filters: Timeframe only (daily, weekly, monthly, all-time)
   - Uses mock data currently
   - **Needs enhancement**: Add event type filter (GM, Tips, Quests, Badges, Guilds, **Referrals**)
   - Leaderboard component: `components/features/LeaderboardComponents.tsx`

### ✅ QuestIcon Support

Found in `components/ui/QuestIcon.tsx`:

```typescript
export type QuestIconType =
  | 'referral_success'  // ✅ Icon already available
  | 'onboard_bonus'
  | 'quest_claim'
  // ... other types
```

Icon path: `/assets/gmeow-icons/Referral Icon.svg`

---

## Implementation Strategy

### 🎯 Component-Based Approach (No New Pages)

**Phase 16A**: ReferralCard Component (Profile Page Integration)  
**Phase 16B**: Leaderboard Event Filter Enhancement  
**Phase 16C**: Referral Bonus Flow with XP Overlay

---

## Feature 1: ReferralCard Component

**Location**: `components/features/ReferralCard.tsx` (NEW)  
**Placement**: Profile page after Quick Actions grid  
**Design Pattern**: Tailwick v2.0 Card with StatsCard components

### Component Structure

```tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody, CardFooter, Button, Badge, StatsCard } from '@/components/ui/tailwick-primitives'
import { QuestIcon } from '@/components/ui/QuestIcon'
import { useAccount } from 'wagmi'
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { wagmiConfig } from '@/lib/wagmi-config'
import { createRegisterReferralCodeTx, getGuildAddress, getGuildABI, normalizeToGMChain, type GMChainKey } from '@/lib/gm-utils'
import { emitRankTelemetryEvent } from '@/lib/telemetry'
import type { XpEventPayload } from '@/types/xp-overlay'

type ReferralStats = {
  code: string | null           // User's registered code
  totalReferrals: number        // Count of referred users
  bonusEarned: number           // Total XP from referrals
  activeReferrals: number       // Active referred users
}

export function ReferralCard({ chain = 'base' }: { chain?: GMChainKey }) {
  const { address } = useAccount()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)

  // Fetch referral stats on mount
  useEffect(() => {
    if (!address) return
    fetchReferralStats()
  }, [address])

  const fetchReferralStats = async () => {
    setLoading(true)
    try {
      // Read referral code from contract
      const code = await readContract(wagmiConfig, {
        address: getGuildAddress(chain),
        abi: getGuildABI(chain),
        functionName: 'referralCodeOf',
        args: [address]
      })

      // Count referrals from ReferrerSet events
      // (Scan events where referrer = user's code)
      const referrals = await countReferralsByCode(code)

      setStats({
        code: code || null,
        totalReferrals: referrals.total,
        bonusEarned: referrals.total * 500, // 500 XP per referral
        activeReferrals: referrals.active
      })
    } catch (error) {
      console.error('Failed to fetch referral stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterCode = async () => {
    if (!address || !codeInput.trim()) return

    setRegistering(true)
    try {
      // Validate code format (alphanumeric, 3-15 chars)
      const code = codeInput.trim().toUpperCase()
      if (!/^[A-Z0-9]{3,15}$/.test(code)) {
        toast.error('Code must be 3-15 alphanumeric characters')
        return
      }

      // Execute transaction
      const txCall = createRegisterReferralCodeTx(code, chain)
      const hash = await writeContract(wagmiConfig, {
        ...txCall,
        account: address,
        chainId: chainId
      })
      await waitForTransactionReceipt(wagmiConfig, { hash })

      toast.success(`Referral code ${code} registered!`)
      
      // Refresh stats
      await fetchReferralStats()
      setCodeInput('')
    } catch (error: any) {
      console.error('Failed to register code:', error)
      toast.error(error.message || 'Failed to register code')
    } finally {
      setRegistering(false)
    }
  }

  const handleCopyLink = () => {
    if (!stats?.code) return
    const link = `${window.location.origin}/onboard?ref=${stats.code}`
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
  }

  const handleCopyCode = () => {
    if (!stats?.code) return
    navigator.clipboard.writeText(stats.code)
    toast.success('Referral code copied!')
  }

  return (
    <>
      <Card className="theme-card-bg-primary">
        <CardHeader className="border-b theme-border-default">
          <div className="flex items-center gap-3">
            <QuestIcon type="referral_success" size={32} />
            <div>
              <h3 className="text-xl font-bold theme-text-primary">Referral System</h3>
              <p className="text-sm theme-text-secondary">Invite pilots and earn bonus XP</p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Stats Grid */}
          {stats?.code && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                icon="/assets/gmeow-icons/Referral Icon.svg"
                iconAlt="Total Referrals"
                label="Total Referrals"
                value={stats.totalReferrals}
                gradient="purple"
              />
              <StatsCard
                icon="/assets/gmeow-icons/Credits Icon.svg"
                iconAlt="Bonus Earned"
                label="Bonus Earned"
                value={`${stats.bonusEarned.toLocaleString()} XP`}
                gradient="blue"
              />
              <StatsCard
                icon="/assets/gmeow-icons/Active Icon.svg"
                iconAlt="Active Referrals"
                label="Active Referrals"
                value={stats.activeReferrals}
                gradient="green"
              />
            </div>
          )}

          {/* Referral Code Display or Registration */}
          {stats?.code ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Your Referral Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={stats.code}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-lg theme-bg-subtle theme-text-primary font-mono text-lg font-bold text-center border theme-border-default"
                  />
                  <Button variant="secondary" onClick={handleCopyCode}>
                    Copy Code
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Referral Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`gmeowbased.com/onboard?ref=${stats.code}`}
                    readOnly
                    className="flex-1 px-4 py-2 rounded-lg theme-bg-subtle theme-text-primary text-sm border theme-border-default"
                  />
                  <Button variant="primary" onClick={handleCopyLink}>
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const text = `Join Gmeowbased and use my referral code: ${stats.code}`
                    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank')
                  }}
                >
                  Share on Farcaster
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const text = `Join Gmeowbased and use my referral code: ${stats.code}`
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
                  }}
                >
                  Share on Twitter
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg theme-bg-subtle p-4 border theme-border-default">
                <h4 className="font-bold theme-text-primary mb-2">🎁 Register Your Referral Code</h4>
                <p className="text-sm theme-text-secondary mb-4">
                  Create a custom referral code and earn 500 XP for every pilot you invite!
                </p>
                <ul className="text-sm theme-text-secondary space-y-1">
                  <li>✓ 3-15 alphanumeric characters</li>
                  <li>✓ Automatically converted to uppercase</li>
                  <li>✓ Permanent once registered</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium theme-text-secondary mb-2">
                  Referral Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="COSMIC"
                    maxLength={15}
                    className="flex-1 px-4 py-3 rounded-lg theme-bg-subtle theme-text-primary font-mono text-lg border theme-border-default"
                  />
                  <Button 
                    variant="primary" 
                    onClick={handleRegisterCode}
                    disabled={registering || !codeInput.trim()}
                  >
                    {registering ? 'Registering...' : 'Register'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardBody>

        <CardFooter className="border-t theme-border-default">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm theme-text-secondary">
              Earn 500 XP per successful referral
            </p>
            {stats?.code && (
              <Badge variant="success">Code Active</Badge>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* XP Event Overlay */}
      {xpCelebration && (
        <XPEventOverlay
          {...xpCelebration}
          onClose={() => setXpCelebration(null)}
        />
      )}
    </>
  )
}
```

### Integration in Profile Page

**File**: `app/app/profile/page.tsx`

```tsx
import { ReferralCard } from '@/components/features/ReferralCard'

export default function ProfilePage() {
  // ... existing code ...

  return (
    <div className="page-bg-profile theme-text-primary p-8">
      <div className="max-w-4xl mx-auto">
        <ProfileHeader profile={profile} />

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* ... existing quick action cards ... */}
        </div>

        {/* NEW: Referral Card */}
        <div className="mb-8">
          <ReferralCard />
        </div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} />
      </div>
    </div>
  )
}
```

---

## Feature 2: Leaderboard Event Filter

**File**: `app/app/leaderboard/page.tsx`  
**Enhancement**: Add event type filter with referral option

### Enhanced Filter State

```tsx
type LeaderboardFilters = {
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time'
  eventType: 'all' | 'gm' | 'tips' | 'quests' | 'badges' | 'guilds' | 'referrals'
}

const [filters, setFilters] = useState<LeaderboardFilters>({
  timeframe: 'all-time',
  eventType: 'all'
})
```

### Event Type Filter UI

```tsx
<div className="mb-6 space-y-4">
  {/* Timeframe Filters (existing) */}
  <div className="flex flex-wrap gap-2">
    {timeframes.map(tf => (
      <button key={tf.value} onClick={() => setFilters(prev => ({ ...prev, timeframe: tf.value }))} className={/* ... */}>
        {tf.label}
      </button>
    ))}
  </div>

  {/* NEW: Event Type Filters */}
  <div className="flex flex-wrap gap-2">
    {eventTypes.map(et => (
      <button
        key={et.value}
        onClick={() => setFilters(prev => ({ ...prev, eventType: et.value }))}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
          filters.eventType === et.value
            ? 'bg-purple-600 text-white'
            : 'bg-default-100 text-default-700 hover:bg-default-200'
        }`}
      >
        <QuestIcon type={et.icon} size={16} />
        {et.label}
      </button>
    ))}
  </div>
</div>

const eventTypes = [
  { value: 'all', label: 'All Events', icon: 'onchain' },
  { value: 'gm', label: 'GM', icon: 'daily_gm' },
  { value: 'tips', label: 'Tips', icon: 'tip_received' },
  { value: 'quests', label: 'Quests', icon: 'quest_claim' },
  { value: 'badges', label: 'Badges', icon: 'badge_mint' },
  { value: 'guilds', label: 'Guilds', icon: 'guild_join' },
  { value: 'referrals', label: 'Referrals', icon: 'referral_success' }
]
```

### Leaderboard Data Fetching

```tsx
const fetchLeaderboard = async () => {
  setLoading(true)
  try {
    // Fetch from Supabase rank_telemetry table
    const { data, error } = await supabase
      .from('rank_telemetry')
      .select('fid, wallet_address, delta, tier_name')
      .eq(filters.eventType !== 'all' ? 'event' : '', filters.eventType)
      .gte('created_at', getTimeframeStart(filters.timeframe))
      .order('delta', { ascending: false })
      .limit(100)

    // Group by user and aggregate
    const leaderboard = aggregateUserStats(data)

    // Fetch Farcaster profiles for pfp + @username
    const profiles = await fetchFarcasterProfiles(leaderboard.map(u => u.fid))

    setEntries(leaderboard.map((user, index) => ({
      rank: index + 1,
      userId: user.fid.toString(),
      username: profiles[user.fid]?.username || `pilot${user.fid}`,
      avatar: profiles[user.fid]?.pfp_url,
      score: user.totalXP,
      level: user.level,
      change: 0 // TODO: Calculate from previous timeframe
    })))
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
  } finally {
    setLoading(false)
  }
}
```

---

## Feature 3: Referral Bonus Flow with XP Overlay

**Trigger**: New user enters referral code during onboarding  
**Flow**: setReferrer → XP overlay → telemetry emission

### Onboarding Integration

**File**: `app/onboard/page.tsx` (or wherever referral code entry exists)

```tsx
const handleSetReferrer = async (referralCode: string) => {
  if (!address || !profile?.fid) return

  try {
    // 1. Validate referral code exists
    const referrerAddress = await readContract(wagmiConfig, {
      address: getGuildAddress(chain),
      abi: getGuildABI(chain),
      functionName: 'referrerOf',
      args: [referralCode]
    })

    if (!referrerAddress || referrerAddress === '0x0000000000000000000000000000000000000000') {
      toast.error('Invalid referral code')
      return
    }

    // 2. Execute setReferrer transaction
    const txCall = createSetReferrerTx(referralCode, chain)
    const hash = await writeContract(wagmiConfig, {
      ...txCall,
      account: address,
      chainId
    })
    await waitForTransactionReceipt(wagmiConfig, { hash })

    // 3. Show XP overlay
    setXpCelebration({
      event: 'referral',
      chainKey: chain,
      xpEarned: 500,
      totalPoints: userStats.total_points + 500,
      progress: progress,
      headline: 'Referral Bonus!',
      visitUrl: '/app/profile',
      tierTagline: `Welcome to the crew! You earned 500 XP.`
    })

    // 4. Emit telemetry
    await emitRankTelemetryEvent({
      event: 'referral',
      chain: chain,
      walletAddress: address,
      fid: profile.fid,
      delta: 500,
      totalPoints: userStats.total_points + 500,
      level: progress.level,
      tierName: progress.currentTier.name,
      tierPercent: progress.percent,
      metadata: { referralCode, referrerAddress, txHash: hash }
    })

    toast.success('Referral code applied! You earned 500 XP.')
  } catch (error: any) {
    console.error('Failed to set referrer:', error)
    toast.error(error.message || 'Failed to apply referral code')
  }
}
```

---

## XP Overlay Integration

**Event Type**: `referral`  
**Icon**: `referral_success` (Gmeowbased v0.1)  
**XP Reward**: 500 points  
**Headline**: "Referral Bonus!"  
**Visit URL**: Profile page or referral stats

```tsx
<XPEventOverlay
  event="referral"
  chainKey="base"
  xpEarned={500}
  totalPoints={userStats.total_points + 500}
  progress={progress}
  headline="Referral Bonus!"
  visitUrl="/app/profile"
  tierTagline="Welcome to the crew! You earned 500 XP."
  onClose={() => setXpCelebration(null)}
/>
```

---

## Testing Checklist

### Contract Integration
- [ ] Register referral code transaction executes successfully
- [ ] Set referrer transaction executes successfully
- [ ] Read referralCodeOf returns correct code
- [ ] Read referrerOf returns correct referrer address
- [ ] ReferralCodeRegistered event emitted
- [ ] ReferrerSet event emitted

### ReferralCard Component
- [ ] Stats fetched correctly (total referrals, bonus earned, active referrals)
- [ ] Code registration validates format (3-15 alphanumeric)
- [ ] Copy code button copies to clipboard
- [ ] Copy link button copies full URL
- [ ] Share buttons open correct social platforms
- [ ] Loading states displayed correctly
- [ ] Empty state shown when no code registered

### Leaderboard Integration
- [ ] Event type filter includes referral option
- [ ] Filter by referrals shows only referral events
- [ ] Leaderboard aggregates XP by user correctly
- [ ] Farcaster profiles fetched (pfp + @username)
- [ ] Timeframe filter works with event filter
- [ ] Pagination handles large datasets

### XP Overlay
- [ ] XP overlay appears after setReferrer transaction
- [ ] Referral icon displays correctly
- [ ] 500 XP reward shows in overlay
- [ ] Visit URL redirects to profile page
- [ ] Tier tagline displays welcome message

### Telemetry
- [ ] Referral event emitted to rank_telemetry table
- [ ] Metadata includes referralCode, referrerAddress, txHash
- [ ] Delta set to 500
- [ ] Tier name and percent captured

---

## Design System Compliance

### ✅ Tailwick v2.0 Components Used
- Card, CardHeader, CardBody, CardFooter
- Button (primary, secondary variants)
- Badge (success variant)
- StatsCard (3 cards with gradients: purple, blue, green)

### ✅ Gmeowbased v0.1 Icons Used
- QuestIcon type `referral_success` (/assets/gmeow-icons/Referral Icon.svg)
- QuestIcon for event filter buttons

### ✅ Mobile-First Responsive
- Stats grid: 1 column (mobile) → 3 columns (desktop)
- Share buttons: Full width stacked (mobile) → Flex row (desktop)
- Event filter: Wrapped buttons with gap

### ✅ Theme System Integration
- `theme-card-bg-primary`
- `theme-text-primary`, `theme-text-secondary`
- `theme-bg-subtle`
- `theme-border-default`

---

## Next Steps (Post-Implementation)

1. **Phase 17**: NFT System Integration
   - NFT minting component
   - NFT gallery page
   - NFT marketplace integration

2. **Phase 18**: Analytics Dashboard
   - User analytics component
   - Guild analytics
   - Global stats dashboard

3. **Phase 19**: Final Polish & Testing
   - E2E testing all flows
   - Performance optimization
   - Accessibility audit

---

**Implementation Order**:
1. Create ReferralCard component (Feature 1)
2. Integrate ReferralCard in profile page
3. Add event filter to leaderboard (Feature 2)
4. Implement setReferrer flow with XP overlay (Feature 3)
5. TypeScript validation (0 errors)
6. Testing checklist completion
7. Documentation update

**TypeScript Status**: TBD (will validate after implementation)
