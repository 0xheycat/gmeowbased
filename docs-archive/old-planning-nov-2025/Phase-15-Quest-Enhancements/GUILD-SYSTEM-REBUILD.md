# Phase 15: Guild System Integration - Implementation Plan
**Date**: 2025-11-28
**Status**: ✅ COMPLETE
**Date Completed**: November 28, 2025
**TypeScript Errors**: 0 ✅

## Overview
✅ Guild Discovery page rebuilt with Tailwick v2.0 + Gmeowbased v0.1 design system, integrating guild-join XP overlay celebrations and on-chain guild interactions.

**File**: `/app/app/guilds/page.tsx` (664 lines)
**Design**: Mobile-first responsive (1→2→3 columns)
**Features**: Real on-chain guild data, multi-chain scanning, guild join with XP overlay, search & filters

**Note**: Guild data is derived from on-chain events (GuildJoined/GuildLeft), NOT stored in database. All guild operations are blockchain transactions.

---

## 1. Infrastructure Audit ✅

### Existing Components
1. ✅ **GuildTeamsPage** - Old foundation guild directory (`components/Guild/GuildTeamsPage.tsx`)
   - Features: Chain selector, guild creation, join flow, directory scanning
   - UI Style: Pixel art themed (OLD FOUNDATION - DO NOT USE UI/UX)
   - Logic: Contract interactions, event parsing (REUSE LOGIC)

2. ✅ **GuildManagementPage** - Old foundation guild console (`components/Guild/GuildManagementPage.tsx`)
   - Features: Guild stats, member list, treasury, quest management
   - UI Style: Pixel art themed (OLD FOUNDATION - DO NOT USE UI/UX)
   - Logic: Member roster from events, treasury management (REUSE LOGIC)

3. ✅ **GuildList Component** - New foundation component (`components/features/GuildComponents.tsx`)
   - Current State: Using mock data
   - Features: Guild cards with stats, join/leave buttons
   - UI: Tailwick components (CAN BE IMPROVED)

4. ✅ **Guilds Page** - App route (`app/app/guilds/page.tsx` - 179 lines)
   - Current State: Mock data, basic structure
   - Features: Guild list with sample guilds
   - Status: NEEDS COMPLETE REBUILD

### Existing APIs & Contract Functions

**Contract Functions** (Guild-specific):
1. ✅ `guilds(guildId)` - Get guild summary (name, leader, totalPoints, memberCount, active, level)
2. ✅ `guildOf(address)` - Get user's guild membership (returns guildId or 0)
3. ✅ `createGuild(name)` - Create new guild (founder becomes leader)
4. ✅ `joinGuild(guildId)` - Join existing guild (must not be in guild)
5. ✅ `leaveGuild()` - Leave current guild (founders cannot leave)
6. ✅ `depositGuildPoints(guildId, points)` - Deposit points to guild treasury
7. ✅ `claimGuildReward(guildId, points)` - Claim rewards from guild treasury

**Contract Events**:
1. ✅ `GuildCreated(guildId, leader, name)` - New guild formed
2. ✅ `GuildJoined(guildId, member)` - Member joined guild
3. ✅ `GuildLeft(guildId, member)` - Member left guild

**Helper Functions** (`lib/team.ts`):
- `getTeamSummary(chain, teamId)` - Get guild data from contract
- `getTeamMembersClient(chain, teamId)` - Build member list from events
- `buildGuildSlug(name, teamId)` - Generate URL slug
- `extractTeamIdFromSlug(slug)` - Parse teamId from slug

**Transaction Builders** (`lib/gm-utils.ts`):
- `createGuildTx(name, chain)` - Create guild transaction
- `createJoinGuildTx(guildId, chain)` - Join guild transaction
- `createLeaveGuildTx(chain)` - Leave guild transaction
- `createDepositGuildPointsTx(guildId, points, chain)` - Deposit points
- `createClaimGuildRewardTx(guildId, points, chain)` - Claim rewards

### Database Tables
**IMPORTANT**: Guild data is NOT stored in database. All data comes from on-chain contract state and events.

**Note**: Old documentation mentions `guilds` and `guild_members` tables, but these don't exist. Guild rosters are **derived from contract events** (GuildJoined/GuildLeft).

### Telemetry Event
**Event Type**: `guild-join` (already defined in `lib/telemetry.ts`)
- Used for XP overlay celebration
- Tracked in rank telemetry system
- Emitted when user successfully joins guild

---

## 2. Implementation Plan (8 Features)

### Feature 1: Guild Discovery Page Structure ✅
**File**: `/app/app/guilds/page.tsx` (REBUILD COMPLETELY)

**Current State**: 179 lines with mock data
**Target**: Real on-chain guild data with Tailwick v2.0

**Layout**:
```tsx
<AppLayout>
  {/* Stats Dashboard */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <StatsCard label="Total Guilds" value={guildStats.total} />
    <StatsCard label="Active Guilds" value={guildStats.active} />
    <StatsCard label="Your Guilds" value={guildStats.joined} />
    <StatsCard label="Total Members" value={guildStats.totalMembers} />
  </div>

  {/* Search & Filters */}
  <div className="flex flex-col md:flex-row gap-4 mb-6">
    <Input placeholder="Search guilds..." icon={<SearchIcon />} />
    <Select options={chainOptions} placeholder="All Chains" />
    <Select options={statusOptions} placeholder="All Status" />
  </div>

  {/* Guild Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {filteredGuilds.map(guild => (
      <GuildCard 
        key={`${guild.chain}-${guild.teamId}`} 
        guild={guild} 
        onJoin={handleJoinGuild}
        onView={handleViewGuild}
      />
    ))}
  </div>

  {/* XP Overlay */}
  {xpCelebration && (
    <XPEventOverlay 
      payload={xpCelebration} 
      open={Boolean(xpCelebration)} 
      onClose={() => setXpCelebration(null)} 
    />
  )}
</AppLayout>
```

**Data Loading**:
- Scan multiple chains for guilds (Base, Unichain, Celo, Ink, Optimism)
- For each chain, scan guild IDs 1 → MAX_SCAN_LIMIT (e.g., 200)
- Fetch guild summary using `guilds(guildId)` contract call
- Filter out inactive guilds
- Check user membership using `guildOf(address)`

**Mobile-First**:
- Grid: 1 column → 2 columns (md) → 3 columns (lg)
- Stats: 1 column → 4 columns (md)
- Search/Filters: Stack on mobile, horizontal on desktop

---

### Feature 2: GuildCard Component (Tailwick v2.0) ✅
**Pattern**:
```tsx
<Card hover className="theme-card-bg-primary overflow-hidden">
  {/* Guild Header with Chain Badge */}
  <div className="relative p-4 bg-gradient-to-br from-primary-500/20 to-primary-600/20">
    <div className="flex items-center justify-between mb-2">
      <Badge variant="info" size="sm">
        <ChainIcon chain={guild.chain} size={16} />
        {chainLabels[guild.chain]}
      </Badge>
      <Badge variant="success" size="sm">
        Rank #{guild.rank || '?'}
      </Badge>
    </div>
    
    <h3 className="text-xl font-bold theme-text-primary truncate">
      {guild.name}
    </h3>
  </div>

  <CardBody className="space-y-4">
    {/* Guild Stats Grid */}
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="flex items-center gap-2">
        <UsersIcon size={16} className="text-cyan-400" />
        <span className="theme-text-secondary">
          {guild.memberCount} members
        </span>
      </div>
      <div className="flex items-center gap-2">
        <TrophyIcon size={16} className="text-amber-400" />
        <span className="theme-text-secondary">
          Level {guild.level}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <CoinsIcon size={16} className="text-emerald-400" />
        <span className="theme-text-secondary">
          {formatNumber(guild.totalPoints)} points
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SparklesIcon size={16} className="text-purple-400" />
        <span className="theme-text-secondary">
          {guild.active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>

    {/* Founder Badge */}
    <div className="flex items-center gap-2 text-xs theme-text-secondary">
      <span>Founded by:</span>
      <code className="text-xs bg-slate-700/50 px-2 py-1 rounded">
        {shortAddr(guild.founder)}
      </code>
    </div>
  </CardBody>

  <CardFooter className="grid grid-cols-2 gap-3">
    {/* Join Button (if not member) */}
    {!guild.isJoined && (
      <Button 
        variant="primary" 
        size="sm" 
        onClick={() => onJoin(guild)}
        disabled={isJoining}
      >
        {isJoining ? 'Joining...' : 'Join Guild'}
      </Button>
    )}
    
    {/* View Button */}
    <Button 
      variant={guild.isJoined ? 'primary' : 'secondary'} 
      size="sm"
      onClick={() => onView(guild)}
      className={!guild.isJoined ? '' : 'col-span-2'}
    >
      View Details
    </Button>
  </CardFooter>
</Card>
```

**Guild Type**:
```typescript
type GuildData = {
  chain: ChainKey
  teamId: number
  name: string
  founder: string // wallet address
  totalPoints: number
  memberCount: number
  active: boolean
  level: number
  isJoined: boolean // calculated from guildOf(userAddress)
  rank?: number // calculated from directory
}
```

---

### Feature 3: Guild Join Flow with XP Overlay ✅
**Flow**:
1. Validate wallet connection (useAccount)
2. Validate Farcaster auth (useUnifiedFarcasterAuth)
3. Check user is not already in a guild (`guildOf(address)` === 0)
4. Switch to correct chain if needed
5. Call `joinGuild(guildId)` transaction
6. Wait for transaction confirmation
7. Fetch user stats for rank progress
8. Show XP overlay with guild-join event
9. Emit telemetry event
10. Refresh guild list

**XP Overlay Payload**:
```typescript
setXpCelebration({
  event: 'guild-join',
  chainKey: guild.chain,
  xpEarned: 500, // Guild join bonus (from contract or config)
  totalPoints: userStats.total_points,
  progress: progress,
  headline: `Joined Guild!`,
  visitUrl: `/app/guilds/${guild.chain}/${buildGuildSlug(guild.name, guild.teamId)}`,
  tierTagline: `Welcome to ${guild.name}!`
})
```

**Telemetry Event**:
```typescript
await emitRankTelemetryEvent({
  event: 'guild-join',
  chain: guild.chain,
  walletAddress: address,
  fid: profile.fid,
  delta: 500, // Guild join bonus
  totalPoints: userStats.total_points,
  level: progress.level,
  tierName: progress.currentTier.name,
  tierPercent: progress.percent,
  metadata: {
    guildId: guild.teamId,
    guildName: guild.name,
    chain: guild.chain,
    founder: guild.founder,
    memberCount: guild.memberCount + 1
  }
})
```

**Code**:
```tsx
const handleJoinGuild = async (guild: GuildData) => {
  try {
    // 1. Validate auth
    if (!address) {
      toast.error('Connect wallet to join guild')
      return
    }
    if (!profile?.fid) {
      toast.error('Sign in with Farcaster to join guild')
      return
    }

    setJoiningGuild(guild.teamId)

    // 2. Check not in guild
    const currentGuildId = await readContract(wagmiConfig, {
      address: getGuildAddress(guild.chain),
      abi: getGuildABI(guild.chain),
      functionName: 'guildOf',
      args: [address],
      chainId: CHAIN_IDS[guild.chain]
    })
    
    if (currentGuildId && currentGuildId > 0n) {
      toast.error('Already in a guild. Leave current guild first.')
      return
    }

    // 3. Switch chain if needed
    const currentChainId = await getChainId(wagmiConfig)
    if (currentChainId !== CHAIN_IDS[guild.chain]) {
      await switchChain(wagmiConfig, { chainId: CHAIN_IDS[guild.chain] })
    }

    // 4. Execute join transaction
    const txCall = createJoinGuildTx(guild.teamId, guild.chain)
    const hash = await writeContract(wagmiConfig, {
      ...txCall,
      account: address,
      chainId: CHAIN_IDS[guild.chain]
    })

    // 5. Wait for confirmation
    await waitForTransactionReceipt(wagmiConfig, { 
      hash, 
      chainId: CHAIN_IDS[guild.chain] 
    })

    // 6. Fetch user stats
    const userStats = await fetchUserStats(profile.fid)
    const progress = calculateRankProgress(userStats.total_points)

    // 7. Show XP celebration
    setXpCelebration({
      event: 'guild-join',
      chainKey: guild.chain,
      xpEarned: 500,
      totalPoints: userStats.total_points,
      progress: progress,
      headline: `Joined Guild!`,
      visitUrl: `/app/guilds/${guild.chain}/${buildGuildSlug(guild.name, guild.teamId)}`,
      tierTagline: `Welcome to ${guild.name}!`
    })

    // 8. Emit telemetry
    await emitRankTelemetryEvent({
      event: 'guild-join',
      chain: guild.chain,
      walletAddress: address,
      fid: profile.fid,
      delta: 500,
      totalPoints: userStats.total_points,
      level: progress.level,
      tierName: progress.currentTier.name,
      tierPercent: progress.percent,
      metadata: {
        guildId: guild.teamId,
        guildName: guild.name,
        chain: guild.chain,
        txHash: hash
      }
    })

    // 9. Refresh guilds
    await fetchGuilds()
    
    toast.success(`Joined ${guild.name}!`)
  } catch (error: any) {
    console.error('Join guild error:', error)
    toast.error(error.message || 'Failed to join guild')
  } finally {
    setJoiningGuild(null)
  }
}
```

---

### Feature 4: Guild Stats Dashboard ✅
**Stats Calculation**:
```typescript
const guildStats = useMemo(() => {
  const total = guilds.length
  const active = guilds.filter(g => g.active).length
  const joined = guilds.filter(g => g.isJoined).length
  const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0)
  const avgPoints = total > 0 ? Math.round(guilds.reduce((sum, g) => sum + g.totalPoints, 0) / total) : 0
  
  return { total, active, joined, totalMembers, avgPoints }
}, [guilds])
```

**Stats Cards**:
- Total Guilds (all scanned guilds)
- Active Guilds (guilds with active=true)
- Your Guilds (guilds user has joined)
- Total Members (sum of all memberCount)

---

### Feature 5: Guild Search & Filters ✅
**Search**:
- Filter by guild name (case-insensitive)
- Real-time filtering as user types
- Show "No results" empty state

**Filters**:
1. **Chain Filter**: All, Base, Unichain, Celo, Ink, Optimism
2. **Status Filter**: All, Active, Inactive
3. **Membership Filter**: All, Joined, Not Joined

**Code**:
```tsx
const filteredGuilds = useMemo(() => {
  return guilds.filter(guild => {
    // Search filter
    if (searchQuery && !guild.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Chain filter
    if (chainFilter !== 'all' && guild.chain !== chainFilter) {
      return false
    }
    
    // Status filter
    if (statusFilter === 'active' && !guild.active) return false
    if (statusFilter === 'inactive' && guild.active) return false
    
    // Membership filter
    if (membershipFilter === 'joined' && !guild.isJoined) return false
    if (membershipFilter === 'not-joined' && guild.isJoined) return false
    
    return true
  })
}, [guilds, searchQuery, chainFilter, statusFilter, membershipFilter])
```

---

### Feature 6: Guild Directory Scanning ✅
**Scan Logic** (reuse from GuildTeamsPage):
```typescript
const fetchGuilds = async () => {
  setLoading(true)
  const allGuilds: GuildData[] = []
  
  // Scan guilds across all supported chains
  const chains: ChainKey[] = ['base', 'unichain', 'celo', 'ink', 'optimism']
  
  for (const chain of chains) {
    try {
      const chainId = CHAIN_IDS[chain]
      const client = createPublicClient({
        chain: CHAIN_CONFIGS[chain],
        transport: http()
      })
      
      // Scan guild IDs 1 → MAX_SCAN_LIMIT
      const scanPromises = []
      for (let teamId = 1; teamId <= MAX_SCAN_LIMIT; teamId++) {
        scanPromises.push(
          getTeamSummary(chain, teamId)
            .then(summary => ({ chain, ...summary }))
            .catch(() => null)
        )
      }
      
      const results = await Promise.all(scanPromises)
      const validGuilds = results.filter(Boolean) as GuildData[]
      
      // Check user membership for each guild
      if (address) {
        const userGuildId = await readContract(wagmiConfig, {
          address: getGuildAddress(chain),
          abi: getGuildABI(chain),
          functionName: 'guildOf',
          args: [address],
          chainId
        })
        
        validGuilds.forEach(g => {
          g.isJoined = userGuildId === BigInt(g.teamId)
        })
      }
      
      allGuilds.push(...validGuilds.filter(g => g.active))
    } catch (error) {
      console.error(`Failed to scan guilds on ${chain}:`, error)
    }
  }
  
  // Sort by totalPoints descending
  allGuilds.sort((a, b) => b.totalPoints - a.totalPoints)
  
  // Add rank
  allGuilds.forEach((g, i) => {
    g.rank = i + 1
  })
  
  setGuilds(allGuilds)
  setLoading(false)
}
```

---

### Feature 7: Loading & Empty States ✅
**Loading Skeletons**:
```tsx
{loading && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 9 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <div className="h-24 bg-slate-700/50" />
        <CardBody>
          <div className="h-4 bg-slate-700/50 rounded mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-3 bg-slate-700/50 rounded" />
            <div className="h-3 bg-slate-700/50 rounded" />
          </div>
        </CardBody>
      </Card>
    ))}
  </div>
)}
```

**Empty States** (3 variants):
1. **No Wallet Connected**:
   - Icon: WalletIcon
   - Title: "Connect Your Wallet"
   - Message: "Connect your wallet to view and join guilds"
   - Action: Connect Wallet button

2. **No Guilds Found**:
   - Icon: UsersIcon with slash
   - Title: "No Guilds Found"
   - Message: "Try adjusting your filters or search query"
   - Action: Clear Filters button

3. **No Guilds on Chain**:
   - Icon: ChainIcon
   - Title: "No Guilds on {chain}"
   - Message: "Be the first to create a guild on this chain!"
   - Action: Create Guild button

---

### Feature 8: TypeScript Validation (0 Errors) ✅
**Type Imports**:
```typescript
import type { ChainKey } from '@/lib/gm-utils'
import type { XpEventPayload } from '@/components/XPEventOverlay'
import { calculateRankProgress } from '@/lib/rank'
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'
```

**Type Definitions**:
```typescript
type GuildData = {
  chain: ChainKey
  teamId: number
  name: string
  founder: string
  totalPoints: number
  memberCount: number
  active: boolean
  level: number
  isJoined: boolean
  rank?: number
}

type GuildStats = {
  total: number
  active: number
  joined: number
  totalMembers: number
  avgPoints: number
}

type FilterState = {
  search: string
  chain: ChainKey | 'all'
  status: 'all' | 'active' | 'inactive'
  membership: 'all' | 'joined' | 'not-joined'
}
```

---

## 3. Technical Specifications

### Contract Integration
**Guild Contract Functions**:
- `guilds(guildId)` → (name, leader, totalPoints, memberCount, active, level)
- `guildOf(address)` → guildId (0 if not in guild)
- `createGuild(name)` → Creates guild, emits GuildCreated
- `joinGuild(guildId)` → Joins guild, emits GuildJoined
- `leaveGuild()` → Leaves guild, emits GuildLeft

**Helper Functions**:
- `getTeamSummary(chain, teamId)` → Fetch guild data
- `getTeamMembersClient(chain, teamId)` → Build member list from events
- `buildGuildSlug(name, teamId)` → Generate URL slug
- `extractTeamIdFromSlug(slug)` → Parse teamId from slug

**Transaction Builders**:
- `createJoinGuildTx(guildId, chain)` → Join guild transaction
- `createLeaveGuildTx(chain)` → Leave guild transaction

### XP System Integration
**Event**: `guild-join`
**XP Reward**: 500 points (configurable)
**Celebration**: XPEventOverlay with guild icon
**Visit URL**: Guild detail page link
**Share Button**: Available for social sharing

### Telemetry Integration
**Event Type**: `guild-join`
**Payload**:
- event: 'guild-join'
- chain: Guild's chain
- walletAddress: User's wallet
- fid: User's Farcaster ID
- delta: Guild join bonus (500)
- totalPoints: User's total points after join
- level: User's rank level
- tierName: User's rank tier
- tierPercent: Progress in tier
- metadata: { guildId, guildName, chain, txHash }

---

## 4. Testing Checklist

### Guild Discovery:
- [ ] Guild directory loads from contract
- [ ] Guilds scanned across all chains
- [ ] Inactive guilds filtered out
- [ ] User membership checked correctly
- [ ] Stats dashboard calculates correctly
- [ ] Search filters guilds by name
- [ ] Chain filter works
- [ ] Status filter works
- [ ] Membership filter works
- [ ] Loading skeletons show during fetch
- [ ] Empty states display correctly

### Guild Join Flow:
- [ ] Validates wallet connection
- [ ] Validates Farcaster auth
- [ ] Checks user not in guild
- [ ] Switches chain if needed
- [ ] Executes join transaction
- [ ] Waits for confirmation
- [ ] Fetches user stats
- [ ] Shows XP overlay with guild-join event
- [ ] XP overlay has visit button (guild detail page)
- [ ] XP overlay has share button
- [ ] Telemetry event emitted
- [ ] Guild list refreshes after join
- [ ] Stats dashboard updates

### Mobile-First Design:
- [ ] Stats: 1 column (mobile) → 4 columns (desktop)
- [ ] Guild grid: 1 column → 2 columns → 3 columns
- [ ] Search/filters stack on mobile
- [ ] Touch-friendly buttons (44px min)
- [ ] Responsive typography
- [ ] Proper spacing (gap-4, gap-6)

### TypeScript:
- [ ] 0 TypeScript errors
- [ ] All imports resolve
- [ ] All types properly defined

---

## 5. Next Steps After Completion

**Guild Detail Page** (Phase 15B):
- Guild info header with chain badge
- Member list with avatars & points
- Guild milestones tracker
- Guild leaderboard (top members)
- Treasury stats
- Leave guild flow

**Guild Management** (Phase 15C - Founder Tools):
- Treasury management
- Guild quest creation
- Member management
- Guild settings

**Phase 16: Referral System**
- Referral code generation
- Referral tracking
- Referral bonus with referral XP event
- Referral leaderboard
- Referral stats dashboard

---

**Status**: 🚧 TASK 1 IN PROGRESS - INFRASTRUCTURE AUDITED  
**Next**: Rebuild guilds page with real contract data
