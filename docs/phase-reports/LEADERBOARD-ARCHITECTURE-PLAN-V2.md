# 🏆 Leaderboard Architecture Plan V2

**Status**: ✅ **V2.2 Contract-Verified + Rank System Improved**  
**Date**: December 2, 2025  
**Author**: GMEOW Assistant Agent  
**Revision**: V2.2 (Improved rank tiers + viral integration)  
**Related Docs**:
- `/docs/analysis/CONTRACT-ANALYSIS-LEADERBOARD.md` - Contract event analysis
- `/docs/architecture/LEADERBOARD-SYSTEM-REVIEW.md` - XP/viral system deep review

**Changes in V2.2** (Dec 2):
- ✅ Expanded rank tier system from 6 to 12 tiers (with badge rewards)
- ✅ Added XP multiplier rewards (10% → 50% → 100% at milestones)
- ✅ Integrated viral XP bonus into leaderboard scoring
- ✅ Added template pattern references (Music DataTable + Trezoadmin)
- ✅ Added rank change indicators and time period selectors
- ✅ Comprehensive review of existing XP/viral systems (Phase 5.0/5.1)

**Changes in V2.1** (Dec 1):
- ✅ Verified against actual smart contract implementation
- ✅ Removed XP breakdown (contracts only emit total points)
- ✅ Removed frame interactions (not tracked on-chain)
- ✅ Removed viral metrics as on-chain (Phase 2 via off-chain tracking)

---

## 📋 Executive Summary

This plan outlines the complete rebuild of the Gmeowbased leaderboard system using **tested templates from `planning/template/` folder ONLY** (specifically the music DataTable system). The rebuild includes:

1. **Base-only support** (remove multi-chain selector)
2. **On-chain data only** supporting: Points, quests, guild, NFTs, referrals, badges, GM streaks
3. **Supabase MCP migrations** for new database schema (guild, referrals, NFTs, badges)
4. **Production-ready DataTable** with pagination, sorting, CSV export
5. **SVG icons ONLY** (NO emojis - using `components/icons/` library)
6. **WCAG AA contrast compliance** (maintain previous fixes)
7. **Mobile-first responsive design** using Tailwind utilities

**⚠️ Contract Limitations**: After deep analysis of proxy contracts, the following features are **NOT tracked on-chain**:
- ❌ XP breakdown by source (contracts only track total points)
- ❌ Frame interactions (no contract events)
- ❌ Viral metrics (no contract events)

These features are moved to Phase 2 roadmap. See #file:CONTRACT-ANALYSIS-LEADERBOARD.md for details.

---

## 🎯 Requirements Recap

### User Requirements (from rejection feedback):

✅ **Use tested templates from planning/template folder**  
- Selected: `music/common/resources/client/datatable/` (production-ready DataTable system)
- Alternative analyzed: `trezoadmin-41` (modern dashboard tables)

✅ **Base-only chain support**  
- Remove chain selector UI
- Remove `chain` parameter from API
- Filter aggregator to Base chain only

✅ **Comprehensive feature support** (REVISED based on contract analysis)  
- **On-Chain Data** (✅ Available):
  - Total points (from `QuestCompleted` events)
  - Quest completion count
  - Guild membership (name, role: leader/officer/member)
  - Referral count + rewards
  - NFT mint count
  - Badge count + types
  - GM streak bonuses
  - ERC20 rewards earned

- **Off-Chain Data** (❌ Not in contracts - Phase 2):
  - ❌ XP breakdown by source (contracts only track total points)
  - ❌ Frame interactions (not tracked on-chain)
  - ❌ Viral metrics (not tracked on-chain)

✅ **Supabase MCP for migrations**  
- Use Supabase MCP server tools
- Create new tables: `guild_members`, `referral_tracking`, `nft_holdings`, `badge_ownership`
- Update `leaderboard_snapshots` schema
- **Removed** (not tracked on-chain): `xp_breakdown`, `frame_interactions`, `viral_metrics`

✅ **NO emojis - SVG icons only**  
- Use icons from `components/icons/` (91 SVG icons available)
- Examples: `<Trophy />`, `<Star />`, `<StarFill />`, `<Verified />`, `<Level />`, `<Tag />`

✅ **Maintain CSS contrast fixes**  
- Use Tailwind utilities with `dark:` variants
- Test with: `pnpm exec playwright test light-mode-contrast-test`
- WCAG AA compliance (4.5:1 minimum contrast)

---

## 🏗️ Template Selection

### ✅ Selected Template: music/datatable

**Source**: `planning/template/music/common/resources/client/datatable/`

**Why Selected**:
1. **Production-ready**: Complete DataTable system with pagination, sorting, CSV export
2. **Comprehensive**: 2,647 components + 1,998 SVG icons (NO emojis)
3. **Mobile-first**: Responsive design with proper breakpoints
4. **Accessible**: Keyboard navigation, ARIA labels, screen reader support
5. **Tailwind-compatible**: Uses utility classes (matches our config)
6. **Proven patterns**: Used in production music streaming app

**Key Files**:
```
music/common/resources/client/datatable/
├── data-table.tsx                    # Main DataTable component
├── data-table-header.tsx             # Search + actions + filters
├── data-table-pagination-footer.tsx  # Page controls + per-page selector
├── data-table-export-csv-button.tsx  # CSV export functionality
├── selected-state-datatable-header.tsx # Bulk action support
├── column-config.tsx                 # Column definition types
└── filters/                          # Filter system (backend + URL params)
```

**Column Configuration Structure**:
```typescript
interface ColumnConfig<T extends TableDataItem> {
  key: string
  header: () => ReactElement
  hideHeader?: boolean
  align?: 'start' | 'center' | 'end'
  padding?: string
  className?: string
  body: (item: T, rowContext: RowContext) => ReactNode
  allowsSorting?: boolean
  sortingKey?: string
  width?: string
}
```

### ❌ Alternatives Considered

**trezoadmin-41 Tables** (`planning/template/trezoadmin-41/`):
- **Pros**: Modern dashboard patterns, Material-UI + Tailwind hybrid
- **Cons**: Less comprehensive than music DataTable, no built-in CSV export, heavier dependencies
- **Decision**: Music DataTable is more complete and matches our needs better

---

## 📊 Feature Matrix & Column Design

### Desktop Table View (Breakpoint: md/768px+)

| Column | Width | Sortable | Content | Icons Used |
|--------|-------|----------|---------|------------|
| **Rank** | 80px | ✅ | `#1`, `#2`, `#3`... Top 3 get special styling | `<Trophy />`, `<Star />` for top 3 |
| **Pilot** | 280px | ✅ (by name) | Avatar (40x40) + Name + FID badge | `<Verified />` for verified |
| **Points** | 120px | ✅ | `12,543` formatted number | `<StarFill />` |
| **Quests** | 100px | ✅ | `42 completed` | `<Check />` |
| **Guild** | 160px | ❌ | Guild name + role badge | `<Tag />` |
| **Referrals** | 100px | ✅ | `8 pilots` + rewards | `<Link />` |
| **NFTs** | 80px | ✅ | `12 owned` | `<Document />` |
| **Badges** | 100px | ✅ | `5 badges` + types | `<Star />` |
| **Rewards** | 120px | ✅ | ERC20 rewards earned | `<StarFill />` |

**Total width**: ~1,240px (fits well in 1280px/xl breakpoint)

**Removed Columns** (not tracked on-chain):
- ❌ **XP Total** (use Points instead - contracts only track total)
- ❌ **Frames** (no contract events for frame interactions)
- ❌ **Viral** (no contract events for viral engagement)

### Mobile Cards View (Breakpoint: <md/768px)

Stacked card layout showing:
- Top section: Rank + Avatar + Name
- Middle: Points + XP Total (horizontal)
- Bottom: Expandable accordion for detailed stats

### Tablet View (Breakpoint: md-lg/768-1024px)

Show priority columns only:
- Rank, Pilot, Points, Quests, Guild, Actions
- Hide: Referrals, NFTs, Badges, Rewards (show in details drawer)

---

## ⚠️ Contract Limitations Discovery

After analyzing the proxy smart contracts (`#file:contract`), **several planned features are NOT tracked on-chain**:

### What Exists in Contracts ✅

**Events Available**:
```solidity
// From BaseModule.sol + CoreModule.sol
event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount);
event GuildJoined(uint256 indexed guildId, address indexed member);
event GuildLeft(uint256 indexed guildId, address indexed member);
event ReferrerSet(address indexed user, address indexed referrer);
event ReferralRewardClaimed(address indexed referrer, address indexed referee, uint256 pointsReward, uint256 tokenReward);
event NFTMinted(address indexed to, uint256 indexed tokenId, string nftTypeId, string metadataURI, string reason);
event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType);
event GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak);
```

**Contract State** (can query):
```solidity
// Guild info
function getGuildInfo(uint256 guildId) returns (string name, address leader, uint8 level, ...);
mapping(address => uint256) public guildOf;  // User's guild ID
mapping(uint256 => mapping(address => bool)) public guildOfficers;  // Officer roles

// Referral stats
function getReferralStats(address user) returns (uint256 totalReferred, uint256 totalPointsEarned, ...);

// Points
mapping(address => uint256) public pointsBalance;
mapping(address => uint256) public userTotalEarned;

// GM streaks
mapping(address => uint256) public gmStreak;
```

### What's Missing ❌

1. **XP Breakdown by Source**
   - **Planned**: `xp: { quests, tips, stakes, viral, frames, referrals, guild }`
   - **Reality**: Only `pointsAwarded` (total) in `QuestCompleted` events
   - **Why**: Contracts track fungible points, not XP sources
   - **Solution**: Use total points only, add breakdown in Phase 2 with off-chain tracking

2. **Frame Interactions**
   - **Planned**: `frame_interactions` table with counts
   - **Reality**: No events emitted for frame interactions
   - **Why**: Frames are off-chain (Farcaster), not contract-tracked
   - **Solution**: Add Supabase tracking when frames call API (Phase 2)

3. **Viral Metrics**
   - **Planned**: `viral_metrics` table with tier/casts/XP
   - **Reality**: No events for viral activity
   - **Why**: Viral engagement happens on Farcaster, not on-chain
   - **Solution**: Integrate Neynar API for viral data (Phase 2)

**See**: `/docs/analysis/CONTRACT-ANALYSIS-LEADERBOARD.md` for complete analysis.

---

## 🗄️ Database Schema Design (REVISED)

### New Tables (using Supabase MCP)

#### 1. `guild_members`
```sql
CREATE TABLE guild_members (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  farcaster_fid INTEGER,
  
  guild_id INTEGER NOT NULL,
  guild_name TEXT NOT NULL,
  guild_role TEXT DEFAULT 'member', -- member, officer, leader
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(address, guild_id)
);

CREATE INDEX idx_guild_members_address ON guild_members(address);
CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX idx_guild_members_fid ON guild_members(farcaster_fid);
```
**Data Source**: Parse `GuildJoined`/`GuildLeft` events + query contract `getGuildInfo(guildId)` for name/role

#### 2. `referral_tracking`
```sql
CREATE TABLE referral_tracking (
  id BIGSERIAL PRIMARY KEY,
  referrer_address TEXT NOT NULL,
  referrer_fid INTEGER,
  
  referred_address TEXT NOT NULL,
  referred_fid INTEGER,
  
  referral_code TEXT,
  rewards_earned INTEGER DEFAULT 0,
  
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(referred_address)
);

CREATE INDEX idx_referral_referrer ON referral_tracking(referrer_address);
CREATE INDEX idx_referral_referred ON referral_tracking(referred_address);
CREATE INDEX idx_referral_fid ON referral_tracking(referrer_fid);

-- Aggregate view for referral stats per user
CREATE VIEW referral_stats AS
SELECT 
  referrer_address,
  referrer_fid,
  COUNT(*) as referral_count,
  SUM(rewards_earned) as total_rewards
FROM referral_tracking
GROUP BY referrer_address, referrer_fid;
```
**Data Source**: Parse `ReferrerSet` + `ReferralRewardClaimed` events

#### 3. `nft_holdings`
```sql
CREATE TABLE nft_holdings (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  farcaster_fid INTEGER,
  
  token_id INTEGER NOT NULL,
  nft_type_id TEXT NOT NULL,
  metadata_uri TEXT,
  
  minted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(token_id)
);

CREATE INDEX idx_nft_holdings_address ON nft_holdings(address);
CREATE INDEX idx_nft_holdings_fid ON nft_holdings(farcaster_fid);
CREATE INDEX idx_nft_holdings_type ON nft_holdings(nft_type_id);

-- Aggregate view for NFT counts per user
CREATE VIEW nft_counts AS
SELECT 
  address,
  farcaster_fid,
  COUNT(DISTINCT nft_type_id) as collection_count,
  COUNT(*) as total_nfts
FROM nft_holdings
GROUP BY address, farcaster_fid;
```
**Data Source**: Parse `NFTMinted` events

#### 4. `badge_ownership`
```sql
CREATE TABLE badge_ownership (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  farcaster_fid INTEGER,
  
  token_id INTEGER NOT NULL,
  badge_type TEXT NOT NULL,
  
  minted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(token_id)
);

CREATE INDEX idx_badge_ownership_address ON badge_ownership(address);
CREATE INDEX idx_badge_ownership_fid ON badge_ownership(farcaster_fid);
CREATE INDEX idx_badge_ownership_type ON badge_ownership(badge_type);

-- Aggregate view for badge counts per user
CREATE VIEW badge_counts AS
SELECT 
  address,
  farcaster_fid,
  COUNT(*) as total_badges,
  ARRAY_AGG(DISTINCT badge_type) as badge_types
FROM badge_ownership
GROUP BY address, farcaster_fid;
```
**Data Source**: Parse `BadgeMinted` events

**Badge Types** (from contract analysis):
- `"OG-Caster"` - FID < 50,000
- `"Guild Leader"` - Created a guild
- `"Bronze Recruiter"` - 1 referral
- `"Silver Recruiter"` - 5 referrals
- `"Gold Recruiter"` - 10 referrals

### ❌ Removed Tables (Not Tracked On-Chain)

These tables were removed from the original plan after contract analysis showed they are **not tracked on-chain**:

#### `xp_breakdown` - ❌ REMOVED
**Reason**: Contracts only emit total `pointsAwarded` in `QuestCompleted` events, NOT XP by source.

#### `frame_interactions` - ❌ REMOVED  
**Reason**: Frame interactions happen off-chain (Farcaster), no contract events emitted.

**Phase 2 Option**: Track via Supabase when frames call our API endpoints.

#### `viral_metrics` - ❌ REMOVED
**Reason**: Viral engagement happens on Farcaster, no contract events emitted.

**Phase 2 Option**: Integrate Neynar API to fetch viral cast data.

### Updated Table: `leaderboard_snapshots`

Add columns for on-chain metrics tracked by smart contracts:

```sql
-- Add new columns to existing table
ALTER TABLE leaderboard_snapshots
  -- Guild data (from GuildJoined/GuildLeft events + contract queries)
  ADD COLUMN IF NOT EXISTS guild_id INTEGER,
  ADD COLUMN IF NOT EXISTS guild_name TEXT,
  ADD COLUMN IF NOT EXISTS guild_role TEXT,
  
  -- Referral data (from ReferrerSet + ReferralRewardClaimed events)
  ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_rewards INTEGER DEFAULT 0,
  
  -- NFT data (from NFTMinted events)
  ADD COLUMN IF NOT EXISTS nft_count INTEGER DEFAULT 0,
  
  -- Badge data (from BadgeMinted events)
  ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS badge_count INTEGER DEFAULT 0,
  
  -- GM streak data (from GMEvent events)
  ADD COLUMN IF NOT EXISTS gm_streak INTEGER DEFAULT 0;

-- Create indexes for new sortable columns
CREATE INDEX IF NOT EXISTS idx_leaderboard_guild ON leaderboard_snapshots(guild_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_referrals ON leaderboard_snapshots(referral_count DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_nfts ON leaderboard_snapshots(nft_count DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_badges ON leaderboard_snapshots(badge_count DESC);

-- REMOVE multi-chain support (Base-only)
-- Note: Keep chain column for backward compatibility but always set to 'base'
-- Update default value
ALTER TABLE leaderboard_snapshots ALTER COLUMN chain SET DEFAULT 'base';
```

**❌ Removed Columns** (not tracked on-chain):
- `xp_*` columns - Contracts only emit total points, not XP by source
- `frame_interactions` - Frame activity is off-chain (Farcaster)
- `viral_*` columns - Viral metrics are off-chain (Farcaster)
- `nft_collections` - Contract tracks mint count only

---

## 🔌 API Upgrade Strategy

### Updated Type Definitions

**File**: `app/api/leaderboard/route.ts`

```typescript
// NEW: Comprehensive LeaderboardEntry type (contract-verified)
type LeaderboardEntry = {
  // Core identity
  rank: number
  address: `0x${string}`
  pfpUrl: string
  name: string
  farcasterFid: number
  
  // Core stats (existing - from QuestCompleted events)
  points: number          // Sum of all pointsAwarded
  completed: number       // Quest completion count
  rewards: number         // Token rewards earned
  seasonAlloc: number
  
  // Guild (NEW - from GuildJoined/GuildLeft events + contract queries)
  guild: {
    id: number | null
    name: string | null
    role: string | null   // member, officer, leader
  }
  
  // Referrals (NEW - from ReferrerSet + ReferralRewardClaimed events)
  referrals: {
    count: number
    rewards: number
  }
  
  // NFT holdings (NEW - from NFTMinted events)
  nfts: {
    count: number
  }
  
  // Badges (NEW - from BadgeMinted events)
  badges: {
    types: string[]       // ["OG-Caster", "Guild Leader", "Gold Recruiter"]
    count: number
  }
  
  // GM streak (NEW - from GMEvent events)
  gmStreak: number
}

// ❌ REMOVED FIELDS (not tracked on-chain):
// - xp.bySource - Contracts only emit total points, not XP breakdown
// - frameInteractions - Frame activity is off-chain (Farcaster)
// - viral.* - Viral metrics are off-chain (Farcaster)
// - nfts.collections - Contract tracks mint count only

type LeaderboardResponse = {
  ok: true
  // REMOVED: chain: ChainKey (Base-only now)
  global: boolean
  offset: number
  limit: number
  total: number
  top: LeaderboardEntry[]
  updatedAt: number
  seasonSupported: boolean
  profileSupported: boolean
}
```

### API Endpoint Changes

**Request Parameters** (BEFORE → AFTER):
```typescript
// BEFORE (multi-chain)
?chain=base&offset=0&limit=50&season=1

// AFTER (Base-only)
?offset=0&limit=50&season=1
// ❌ Removed: chain parameter
```

**Response Sorting** (NEW sortable fields - contract-verified):
- `?sortBy=points&order=desc` (total points from QuestCompleted events)
- `?sortBy=completed&order=desc` (quest count)
- `?sortBy=referral_count&order=desc` (from ReferrerSet events)
- `?sortBy=nft_count&order=desc` (from NFTMinted events)
- `?sortBy=badge_count&order=desc` (from BadgeMinted events)
- `?sortBy=gm_streak&order=desc` (from GMEvent events)

**❌ Removed Sortable Fields** (not tracked on-chain):
- `xp_total`, `xp_*` - No XP breakdown in contracts
- `frame_interactions` - Not tracked on-chain
- `viral_xp` - Not tracked on-chain

### Supabase Query Updates

```typescript
// OLD: Multi-chain filtering
query = query.eq(chainColumn, params.chain)

// NEW: Base-only filtering (always)
query = query.eq('chain', 'base')

// NEW: Join with aggregated data (from supporting tables)
const { data, error } = await supabase
  .from('leaderboard_snapshots')
  .select(`
    *,
    guild_members(*),
    referral_stats!inner(*),
    nft_counts!inner(*),
    badge_ownership(*)
````
  `)
  .eq('chain', 'base')
  .order(params.sortBy || 'points', { ascending: false })
  .range(params.offset, params.offset + params.limit - 1)
```

---

## 🔄 Aggregator Upgrade Strategy (Contract-Verified)

**File**: `lib/leaderboard-aggregator.ts`

### Changes Required

1. **Filter to Base chain only**:
```typescript
// OLD: Multi-chain support
const chains = Object.keys(CHAIN_CONFIG) as ChainKey[]
for (const chain of chains) { ... }

// NEW: Base-only
const chain: ChainKey = 'base'
const config = CHAIN_CONFIG[chain]
```

2. **Parse 8 event types** (instead of just QuestCompleted):
```typescript
// Event parsers needed (all from BaseModule.sol)
const eventParsers = {
  QuestCompleted: parseAbiItem('event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount)'),
  GuildJoined: parseAbiItem('event GuildJoined(uint256 indexed guildId, address indexed member, uint256 fid)'),
  GuildLeft: parseAbiItem('event GuildLeft(uint256 indexed guildId, address indexed member)'),
  ReferrerSet: parseAbiItem('event ReferrerSet(address indexed referee, address indexed referrer, string code)'),
  ReferralRewardClaimed: parseAbiItem('event ReferralRewardClaimed(address indexed referrer, address indexed referee, uint256 amount)'),
  NFTMinted: parseAbiItem('event NFTMinted(address indexed to, uint256 tokenId, uint256 nftTypeId, string metadataURI, string reason)'),
  BadgeMinted: parseAbiItem('event BadgeMinted(address indexed user, address indexed badge, string badgeType)'),
  GMEvent: parseAbiItem('event GMEvent(address indexed user, uint256 indexed fid, uint256 streakDays, uint256 bonusPoints, uint256 timestamp)'),
}
```

3. **Aggregate data per event type**:
```typescript
// Per-address aggregates
type UserAggregate = {
  address: `0x${string}`
  farcasterFid: number
  
  // From QuestCompleted events
  points: bigint
  completed: number
  rewards: bigint
  
  // From Guild events
  guildId: number | null
  
  // From Referral events
  referralCount: number
  referralRewards: bigint
  
  // From NFT events
  nftCount: number
  
  // From Badge events
  badgeTypes: string[]
  
  // From GM events
  gmStreak: number
  gmBonus: bigint
}
```

4. **Join with Supabase tables for enriched data**:
```typescript
// Fetch guild names, roles from guild_members table
const enrichedData = await Promise.all(
  aggregates.map(async (agg) => {
    const [guild, referrals, nfts, badges] = await Promise.all([
      supabase.from('guild_members').select('*').eq('address', agg.address).single(),
      supabase.from('referral_tracking').select('*').eq('referrer_address', agg.address),
      supabase.from('nft_holdings').select('*').eq('address', agg.address),
      supabase.from('badge_ownership').select('*').eq('address', agg.address),
    ])
    
    return {
      ...agg,
      guild: guild.data ? {
        id: guild.data.guild_id,
        name: guild.data.guild_name,
        role: guild.data.guild_role,
      } : { id: null, name: null, role: null },
      referrals: {
        count: referrals.data?.length || 0,
        rewards: agg.referralRewards,
      },
      nfts: {
        count: nfts.data?.length || 0,
      },
      badges: {
        types: badges.data?.map(b => b.badge_type) || [],
        count: badges.data?.length || 0,
      },
    }
  })
)
```

5. **Cache enriched data** (with correct columns):
```typescript
// Update leaderboard_snapshots with all new columns
await supabase
  .from('leaderboard_snapshots')
  .upsert(
    enrichedData.map(entry => ({
      address: entry.address,
      chain: 'base', // Always Base
      points: entry.points,
      completed: entry.completed,
      rewards: entry.rewards,
      season_alloc: entry.seasonAlloc,
      
      // Guild
      guild_id: entry.guild.id,
      guild_name: entry.guild.name,
      guild_role: entry.guild.role,
      
      // Referrals
      referral_count: entry.referrals.count,
      referral_rewards: entry.referrals.rewards,
      
      // NFTs
      nft_count: entry.nfts.count,
      
      // Badges
      badges: JSON.stringify(entry.badges.types),
      badge_count: entry.badges.count,
      
      // GM streak
      gm_streak: entry.gmStreak,
      
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'address,chain' }
  )
```

**❌ Removed Fields** (from aggregator):
- `xp_*` columns - Contracts don't track XP by source
- `frame_interactions` - Not tracked on-chain
- `viral_*` columns - Not tracked on-chain
- `nft_collections` - Contract only tracks mint count

---

## ⚡ Rank Tier System (Improved V2.2)

**Source**: `docs/architecture/LEADERBOARD-SYSTEM-REVIEW.md` Part 4

### Problem with Current System

Current implementation (`lib/rank.ts`):
- Only 6 tiers covering 0 - 15,000+ points
- No progression after "Mythic GM" (15K XP)
- No rewards for reaching new tiers
- Users at 100K+ XP still show same tier as 15K users

### ✅ Solution: 12-Tier System with Badge Rewards

**Reference**: Inspired by GitHub Achievements + Gaming RPG systems

| Tier | Name | Min Points | Max Points | Badge | Reward |
|------|------|------------|------------|-------|--------|
| 1 | Signal Kitten | 0 | 500 | 🐱 | Badge: "First Steps" |
| 2 | Warp Scout | 500 | 1,500 | 🔭 | Badge: "Explorer" |
| 3 | Beacon Runner | 1,500 | 4,000 | 📡 | **+10% Quest XP** |
| 4 | Night Operator | 4,000 | 8,000 | 🌙 | Badge: "Streak Master" |
| 5 | Star Captain | 8,000 | 15,000 | ⭐ | **+20% Quest XP** |
| 6 | Nebula Commander | 15,000 | 25,000 | 🌌 | Badge: "Guild Founder" |
| 7 | Quantum Navigator | 25,000 | 40,000 | ⚛️ | **+30% Quest XP** |
| 8 | Cosmic Architect | 40,000 | 60,000 | 🏗️ | Badge: "System Builder" |
| 9 | Void Walker | 60,000 | 100,000 | 👤 | **+50% Quest XP** |
| 10 | Singularity Prime | 100,000 | 250,000 | 💫 | Badge: "Legendary Pilot" |
| 11 | Infinite GM | 250,000 | 500,000 | ♾️ | **+100% Quest XP** |
| 12 | Omniversal Being | 500,000+ | ∞ | 🌟 | Custom Role + Discord |

**Benefits**:
1. ✅ Always next goal to reach
2. ✅ Meaningful rewards (XP multipliers at tiers 3, 5, 7, 9, 11)
3. ✅ Badge unlocks for prestige
4. ✅ Visual progression with color gradients
5. ✅ No cap (handles whale users)

### Leaderboard Score Calculation

**Total Score** = Base Points + Bonuses + Multipliers

```typescript
// Reference: docs/architecture/LEADERBOARD-SYSTEM-REVIEW.md Part 3
interface LeaderboardScore {
  basePoints: number        // From QuestCompleted events
  viralXP: number            // From viral_bonus_xp table (Phase 5.1)
  guildBonus: number         // guild_level * 100
  referralBonus: number      // referral_count * 50
  streakBonus: number        // gm_streak * 10
  badgePrestige: number      // badge_count * 25
  
  // Computed
  totalScore: number         // Sum of all above
  rankMultiplier: number     // 1.0 - 2.0 based on tier rewards
}

// Example Calculation
User with:
- 10,000 quest points
- 2,000 viral XP (8 viral casts)
- Level 3 guild (+300)
- 15 referrals (+750)
- 30-day GM streak (+300)
- 5 badges (+125)
= 13,475 total score
+ Tier 6 multiplier (+20%) = 16,170 effective score
```

### Implementation

**Update `lib/rank.ts`**:
```typescript
export const IMPROVED_RANK_TIERS = [
  // ... 12 tiers with rewards metadata
]

export function getNextTierReward(currentPoints: number): {
  nextTier: RankTier
  pointsNeeded: number
  reward: { type: 'badge' | 'multiplier' | 'exclusive', label: string }
  progress: number // 0-1
}

export function applyRankMultiplier(
  baseXP: number,
  userTier: RankTier
): number {
  const multiplier = userTier.reward?.value || 1.0
  return Math.floor(baseXP * multiplier)
}
```

**UI Components**:
- Next tier progress bar in profile
- Reward preview (badge icon + label)
- XP multiplier indicator (e.g., "1.2x ⚡")
- Tier badge display in leaderboard rows

---

## 🎨 Component Structure

### File Organization

```
app/leaderboard/
├── page.tsx                     # Main page (client component)
└── components/
    ├── LeaderboardContainer.tsx # Main wrapper with DataTable
    ├── LeaderboardColumns.tsx   # Column definitions
    ├── LeaderboardMobileCard.tsx # Mobile card view
    ├── LeaderboardFilters.tsx   # Season + search filters
    ├── LeaderboardHeader.tsx    # Title + actions
    ├── LeaderboardEmpty.tsx     # Empty state
    ├── LeaderboardError.tsx     # Error state
    ├── LeaderboardLoading.tsx   # Loading skeleton
    └── LeaderboardStats.tsx     # Top stats summary
```

### Component Patterns (from music template)

#### 1. LeaderboardContainer.tsx
```tsx
'use client'

import { DataTable } from '@/planning/template/music/common/resources/client/datatable/data-table'
import { LeaderboardColumns } from './LeaderboardColumns'
import { LeaderboardEmpty } from './LeaderboardEmpty'
import { LeaderboardMobileCard } from './LeaderboardMobileCard'
import { useMediaQuery } from '@/lib/hooks/use-media-query'

export function LeaderboardContainer() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  // Use DataTable for desktop, custom cards for mobile
  return (
    <div className="container mx-auto px-4 py-8">
      {isMobile ? (
        <LeaderboardMobileCard />
      ) : (
        <DataTable
          columns={LeaderboardColumns}
          endpoint="/api/leaderboard"
          searchPlaceholder={{ message: "Search pilots by name or address..." }}
          emptyStateMessage={<LeaderboardEmpty isFiltering={false} />}
          enableSelection={false}
          actions={<LeaderboardStats />}
        />
      )}
    </div>
  )
}
```

#### 2. LeaderboardColumns.tsx (Contract-Verified - 9 Columns)
```tsx
import { ColumnConfig } from '@/planning/template/music/common/resources/client/datatable/column-config'
import { Trophy, StarFill, Check, Tag, Document, Link, Zap, Shield } from '@/components/icons'

type LeaderboardItem = {
  id: string
  rank: number
  address: string
  name: string
  pfpUrl: string
  farcasterFid: number
  // Contract-verified fields only
  points: number
  completed: number
  rewards: number
  guild: { id: number | null; name: string | null; role: string | null }
  referrals: { count: number; rewards: number }
  nfts: { count: number }
  badges: { types: string[]; count: number }
  gmStreak: number
}

export const LeaderboardColumns: ColumnConfig<LeaderboardItem>[] = [
  // 1. Rank
  {
    key: 'rank',
    header: () => <span className="text-xs font-semibold uppercase tracking-label">Rank</span>,
    body: (item, ctx) => (
      <div className="flex items-center gap-2">
        {item.rank <= 3 && (
          <Trophy className={`w-4 h-4 ${
            item.rank === 1 ? 'text-yellow-500 dark:text-yellow-400' :
            item.rank === 2 ? 'text-gray-400 dark:text-gray-300' :
            'text-amber-600 dark:text-amber-500'
          }`} />
        )}
        <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
          #{item.rank}
        </span>
      </div>
    ),
    width: '80px',
    allowsSorting: true,
    sortingKey: 'rank',
  },
  
  // 2. Pilot
  {
    key: 'pilot',
    header: () => <span className="text-xs font-semibold uppercase tracking-label">Pilot</span>,
    body: (item, ctx) => (
      <div className="flex items-center gap-3">
        <img 
          src={item.pfpUrl} 
          alt={item.name}
          className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700"
        />
        <div className="flex flex-col">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {item.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            FID {item.farcasterFid}
          </span>
        </div>
      </div>
    ),
    width: '280px',
    allowsSorting: true,
    sortingKey: 'name',
  },
  
  // 3. Points (from QuestCompleted events)
  {
    key: 'points',
    header: () => (
      <div className="flex items-center gap-1">
        <StarFill className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />
        <span className="text-xs font-semibold uppercase tracking-label">Points</span>
      </div>
    ),
    body: (item, ctx) => (
      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
        {item.points.toLocaleString()}
      </span>
    ),
    width: '120px',
    align: 'end',
    allowsSorting: true,
    sortingKey: 'points',
  },
  
  // 4. Quests (count of completions)
  {
    key: 'quests',
    header: () => (
      <div className="flex items-center gap-1">
        <Check className="w-3 h-3 text-green-500 dark:text-green-400" />
        <span className="text-xs font-semibold uppercase tracking-label">Quests</span>
      </div>
    ),
    body: (item, ctx) => (
      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
        {item.completed}
      </span>
    ),
    width: '100px',
    align: 'center',
    allowsSorting: true,
    sortingKey: 'completed',
  },
  
  // 5. Guild (from GuildJoined events)
  {
    key: 'guild',
    header: () => (
      <div className="flex items-center gap-1">
        <Tag className="w-3 h-3 text-blue-500 dark:text-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-label">Guild</span>
      </div>
    ),
    body: (item, ctx) => (
      item.guild.name ? (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {item.guild.name}
          </span>
          <span className="text-2xs text-gray-500 dark:text-gray-400 capitalize">
            {item.guild.role}
          </span>
        </div>
      ) : (
        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
      )
    ),
    width: '160px',
  },
  
  // 6. Referrals (from ReferrerSet events)
  {
    key: 'referrals',
    header: () => (
      <div className="flex items-center gap-1">
        <Link className="w-3 h-3 text-teal-500 dark:text-teal-400" />
        <span className="text-xs font-semibold uppercase tracking-label">Referrals</span>
      </div>
    ),
    body: (item, ctx) => (
      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
        {item.referrals.count}
      </span>
    ),
    width: '100px',
    align: 'center',
    allowsSorting: true,
    sortingKey: 'referral_count',
  },
  
  // 7. NFTs (from NFTMinted events)
  {
    key: 'nfts',
    header: () => (
      <div className="flex items-center gap-1">
        <Document className="w-3 h-3 text-pink-500 dark:text-pink-400" />
        <span className="text-xs font-semibold uppercase tracking-label">NFTs</span>
      </div>
    ),
    body: (item, ctx) => (
      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
        {item.nfts.count}
      </span>
    ),
    width: '80px',
    align: 'center',
    allowsSorting: true,
    sortingKey: 'nft_count',
  },
  
  // 8. Badges (from BadgeMinted events)
  {
    key: 'badges',
    header: () => (
      <div className="flex items-center gap-1">
        <Shield className="w-3 h-3 text-purple-500 dark:text-purple-400" />
        <span className="text-xs font-semibold uppercase tracking-label">Badges</span>
      </div>
    ),
    body: (item, ctx) => (
      <div className="flex items-center gap-1">
        {item.badges.types.slice(0, 3).map((badge, i) => (
          <span 
            key={i}
            className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full"
            title={badge}
          >
            {badge === 'OG-Caster' ? 'OG' :
             badge === 'Guild Leader' ? 'GL' :
             badge === 'Gold Recruiter' ? 'GR' :
             badge === 'Silver Recruiter' ? 'SR' :
             badge === 'Bronze Recruiter' ? 'BR' : badge}
          </span>
        ))}
        {item.badges.count > 3 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{item.badges.count - 3}
          </span>
        )}
      </div>
    ),
    width: '150px',
    allowsSorting: true,
    sortingKey: 'badge_count',
  },
  
  // 9. Rewards (total token rewards)
  {
    key: 'rewards',
    header: () => (
      <div className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-label">Rewards</span>
      </div>
    ),
    body: (item, ctx) => (
      <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
        {item.rewards.toLocaleString()}
      </span>
    ),
    width: '120px',
    align: 'end',
    allowsSorting: true,
    sortingKey: 'rewards',
  },
]
```

**❌ Removed Columns** (not tracked on-chain):
- `xp` - Contracts only emit total points
- `frames` - Not tracked on-chain
- `viral` - Not tracked on-chain

**Total: 9 columns** (down from 11)

#### 3. LeaderboardMobileCard.tsx
```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, Trophy, StarFill, Level } from '@/components/icons'

export function LeaderboardMobileCard({ item }: { item: LeaderboardItem }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-3">
      {/* Top section: Rank + Avatar + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          {item.rank <= 3 && (
            <Trophy className={`w-5 h-5 ${
              item.rank === 1 ? 'text-yellow-500 dark:text-yellow-400' :
              item.rank === 2 ? 'text-gray-400 dark:text-gray-300' :
              'text-amber-600 dark:text-amber-500'
            }`} />
          )}
          <span className="font-mono text-base font-bold text-gray-900 dark:text-gray-100">
            #{item.rank}
          </span>
        </div>
        
        <img 
          src={item.pfpUrl} 
          alt={item.name}
          className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-gray-700"
        />
        
        <div className="flex-1">
          <h3 className="font-medium text-base text-gray-900 dark:text-gray-100">
            {item.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            FID {item.farcasterFid}
          </p>
        </div>
      </div>
      
      {/* Middle: Points + XP (horizontal) */}
      <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 mb-1">
            <StarFill className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />
            <span className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-label">
              Points
            </span>
          </div>
          <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
            {item.points.toLocaleString()}
          </span>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-1 mb-1">
            <Level className="w-3 h-3 text-purple-500 dark:text-purple-400" />
            <span className="text-2xs text-gray-500 dark:text-gray-400 uppercase tracking-label">
              XP Total
            </span>
          </div>
          <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
            {item.xp.total.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Bottom: Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mt-3 text-sm text-gray-600 dark:text-gray-400"
      >
        <span>{expanded ? 'Hide' : 'Show'} Details</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      
      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Quests:</span>
            <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">
              {item.quests.completed}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Guild:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {item.guild.name || '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Frames:</span>
            <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">
              {item.frameInteractions}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">NFTs:</span>
            <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">
              {item.nfts.count}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Referrals:</span>
            <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">
              {item.referrals.count}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Viral Tier:</span>
            <span className="ml-2 capitalize text-gray-900 dark:text-gray-100">
              {item.viral.tier}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 🎨 Styling Strategy

### Tailwind Utilities ONLY

**NO custom CSS in `globals.css`**. All styling uses Tailwind utilities from `tailwind.config.ts`.

**Available Utilities**:
```typescript
// Breakpoints (mobile-first)
xs: 500px   // Small phones
sm: 640px   // Large phones
md: 768px   // Tablets (desktop table breakpoint)
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
2xl: 1440px // Very large desktop

// Custom font sizes
text-2xs    // 0.625rem (10px)
text-11     // 0.6875rem (11px)
text-13px   // 13px

// Letter spacing
tracking-pill      // 0.18em
tracking-label     // 0.22em
tracking-section   // 0.12em
tracking-button    // 0.08em
tracking-subtle    // 0.04em
```

### Color Contrast Rules

**ALWAYS include dark mode variants**:
```tsx
// ✅ CORRECT
<span className="text-gray-900 dark:text-gray-100">Name</span>
<div className="bg-white dark:bg-gray-800">Content</div>
<button className="text-blue-600 dark:text-blue-400">Action</button>

// ❌ WRONG (missing dark: variant)
<span className="text-gray-900">Name</span>
<div className="bg-white">Content</div>
```

**WCAG AA Compliance** (4.5:1 minimum):
- Light mode text: `text-gray-900` (on white background)
- Dark mode text: `text-gray-100` (on gray-800/900 background)
- Secondary text light: `text-gray-500`
- Secondary text dark: `text-gray-400`
- Border light: `border-gray-200`
- Border dark: `border-gray-700`

### Icon Usage

**ALWAYS use SVG icons from `components/icons/`**:
```tsx
// ✅ CORRECT (SVG icon)
import { Trophy, Star } from '@/components/icons'
<Trophy className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />

// ❌ WRONG (emoji)
<span>🏆</span>
<span>⭐</span>
```

**Available Icons** (91 total):
- **Rank/Achievement**: `Trophy`, `Star`, `StarFill`, `Level`, `Verified`
- **Actions**: `Check`, `Plus`, `Copy`, `ExternalLink`, `Link`, `Upload`, `Export`
- **Navigation**: `ChevronDown`, `ChevronRight`, `ArrowRight`, `ArrowUp`
- **Features**: `Tag`, `Compass`, `Document`, `TrendArrowUp`, `Calendar`, `History`
- **Status**: `Info`, `Warning`, `Question`, `Lock`, `Unlocked`
- **UI**: `Close`, `Search`, `Eye`, `EyeSlash`, `More`, `Dots`, `Play`

---

## 🧪 Testing Strategy

### Contrast Testing

**Command**:
```bash
pnpm exec playwright test light-mode-contrast-test
```

**Requirements**:
- All text must pass WCAG AA (4.5:1 minimum contrast)
- Test both light and dark modes
- Verify no regressions from previous fixes

**Previous Issues Fixed** (must not regress):
- `.roster-stat strong`: Changed from `text-gray-100` to `text-gray-900 dark:text-gray-100`
- Removed `.roster-alert` custom class
- All text now uses Tailwind utilities with `dark:` variants

### Responsive Testing

**Breakpoints to test**:
```bash
# Mobile (xs/sm)
- 375px width (iPhone SE)
- 428px width (iPhone 14 Pro Max)
- 500px width (xs breakpoint)

# Tablet (md)
- 768px width (iPad vertical)
- 820px width (iPad Air)

# Desktop (lg/xl/2xl)
- 1024px width (small laptop)
- 1280px width (standard desktop)
- 1440px width (large desktop)
```

**Expected behavior**:
- `<768px`: Mobile card view with expandable details
- `768-1024px`: Tablet view (priority columns only)
- `1024px+`: Full desktop table view (all columns)

### Accessibility Testing

**Keyboard navigation**:
- Tab through table rows
- Sort columns with Enter key
- Open/close mobile card details with Space

**Screen reader**:
- Table headers must be announced
- Sort state must be announced
- Row selection must be announced

**ARIA labels**:
```tsx
<table aria-labelledby="leaderboard-title">
<button aria-label="Sort by points">Points</button>
<div role="status" aria-live="polite">Loading...</div>
```

---

## 📦 Implementation Phases

### Phase 1: Database Setup (using Supabase MCP) ⏱️ 1-2 hours

1. **Activate Supabase MCP tools**
2. **Create new tables**:
   - `xp_breakdown` (XP by source)
   - `guild_members` (guild membership)
   - `frame_interactions` (frame stats)
   - `nft_holdings` (NFT counts)
   - `referral_tracking` (referral metrics)
   - `viral_metrics` (viral engagement)
3. **Update existing table**:
   - Add new columns to `leaderboard_snapshots`
   - Create indexes for sortable columns
4. **Create views**:
   - `frame_interaction_totals` (aggregate)
   - `nft_counts` (aggregate)
   - `referral_stats` (aggregate)
5. **Test migrations locally**

### Phase 2: API Upgrade ⏱️ 2-3 hours

1. **Update type definitions** (`app/api/leaderboard/route.ts`):
   - Expand `LeaderboardEntry` type with new fields
   - Remove `chain` parameter (Base-only)
2. **Modify Supabase queries**:
   - Join with new tables/views
   - Add new sortable fields
   - Filter to Base chain only
3. **Update response mapping**:
   - Map database columns to API types
   - Format numbers, dates, badges
4. **Test API responses**:
   - Verify all fields present
   - Check sorting works
   - Validate pagination

### Phase 3: Aggregator Upgrade ⏱️ 2-3 hours

1. **Update `lib/leaderboard-aggregator.ts`**:
   - Filter to Base chain only
   - Parse XP source events
   - Join with Supabase tables
   - Aggregate XP by source
2. **Update caching logic**:
   - Cache all new fields
   - Upsert to `leaderboard_snapshots`
3. **Test aggregation**:
   - Verify on-chain data correct
   - Check Supabase joins work
   - Validate cache updates

### Phase 4: Component Implementation ⏱️ 3-4 hours

1. **Create base components**:
   - `LeaderboardContainer.tsx` (main wrapper)
   - `LeaderboardColumns.tsx` (column definitions)
   - `LeaderboardMobileCard.tsx` (mobile view)
2. **Adapt music DataTable**:
   - Copy necessary files from template
   - Adjust types for our data structure
   - Configure pagination (15 per page)
3. **Implement responsive views**:
   - Desktop: Full table (all columns)
   - Tablet: Priority columns only
   - Mobile: Card view with expandable details
4. **Add loading/error/empty states**:
   - Loading skeleton
   - Error message with retry
   - Empty state with illustration
5. **Test icon usage**:
   - Verify all icons are SVG (NO emojis)
   - Check icon colors in both modes

### Phase 5: Testing & Refinement ⏱️ 1-2 hours

1. **Run contrast tests**:
   ```bash
   pnpm exec playwright test light-mode-contrast-test
   ```
2. **Test responsive breakpoints**:
   - Mobile: 375px, 428px, 500px
   - Tablet: 768px, 820px
   - Desktop: 1024px, 1280px, 1440px
3. **Verify accessibility**:
   - Keyboard navigation
   - Screen reader support
   - ARIA labels
4. **Check performance**:
   - Initial load time
   - Sort performance
   - Pagination speed
5. **Visual QA**:
   - Dark mode consistency
   - Icon alignment
   - Typography hierarchy

### Phase 6: Documentation Update ⏱️ 30 minutes

1. **Update `CURRENT-TASK.md`** with completion status
2. **Update `FOUNDATION-REBUILD-ROADMAP.md`** with leaderboard progress
3. **Document API changes** in API reference
4. **Document schema changes** in database reference
5. **Add component usage examples** to Storybook (if applicable)

---

## 🚨 Risk Mitigation

### Risk 1: CSS Contrast Regression

**Risk**: New components might introduce contrast issues that we fixed previously.

**Mitigation**:
- ALWAYS use Tailwind utilities with `dark:` variants
- NO custom CSS in `globals.css`
- Run contrast tests after every component creation
- Use pre-approved color combinations from previous audit

### Risk 2: Emoji Usage

**Risk**: Accidentally using emoji characters instead of SVG icons.

**Mitigation**:
- Linter rule: Block emoji characters in JSX
- Code review checklist: Verify all icons are SVG
- Icon library documentation: Show correct usage patterns

### Risk 3: Performance Degradation

**Risk**: Joining multiple tables could slow down API responses.

**Mitigation**:
- Use Supabase views for aggregates (pre-computed)
- Index all sortable columns
- Cache results for 25 seconds (existing TTL)
- Monitor query performance with Supabase dashboard

### Risk 4: Mobile Responsiveness

**Risk**: Desktop-focused DataTable might not adapt well to mobile.

**Mitigation**:
- Build separate mobile card view (not force table on small screens)
- Test on real devices (iOS, Android)
- Use proper breakpoints (md/768px switch point)
- Progressive enhancement (mobile first)

### Risk 5: Data Migration Issues

**Risk**: Migrating existing data to new schema could fail.

**Mitigation**:
- Test migrations in local environment first
- Use Supabase MCP for safe, transaction-wrapped migrations
- Create rollback plan for each migration
- Backup existing `leaderboard_snapshots` data before migration

---

## ✅ Success Criteria

### Functional Requirements

- [ ] Leaderboard displays all pilots with rank, name, avatar
- [ ] Shows points, XP total, XP breakdown by source
- [ ] Shows quest stats (completed, active, rewards)
- [ ] Shows guild membership (name, role)
- [ ] Shows frame interactions count
- [ ] Shows NFT holdings (count, collections)
- [ ] Shows referral metrics (count, rewards)
- [ ] Shows viral engagement (tier, casts, XP)
- [ ] Sorting works for all sortable columns
- [ ] Pagination works (15 per page)
- [ ] Search works by name or address
- [ ] Season filter works
- [ ] Base-only support (no chain selector)

### Technical Requirements

- [ ] Uses music DataTable template patterns
- [ ] No references to codebase components (e.g., ViralLeaderboard)
- [ ] All icons are SVG (NO emojis)
- [ ] Tailwind utilities only (no custom CSS)
- [ ] Dark mode support with proper `dark:` variants
- [ ] WCAG AA contrast compliance (4.5:1 minimum)
- [ ] Responsive design (mobile cards, tablet columns, desktop full table)
- [ ] API returns all new fields
- [ ] Aggregator collects all new metrics
- [ ] Supabase schema has all new tables
- [ ] Database migrations created via Supabase MCP

### Performance Requirements

- [ ] Initial load < 2 seconds
- [ ] Sort operation < 500ms
- [ ] Pagination < 300ms
- [ ] API response < 1 second
- [ ] Lighthouse performance score > 90

### Accessibility Requirements

- [ ] Keyboard navigation works
- [ ] Screen reader announces table correctly
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] Color not sole indicator of meaning

---

## 📚 References

### Templates Used

- **music DataTable**: `planning/template/music/common/resources/client/datatable/`
  - `data-table.tsx` - Main component
  - `column-config.tsx` - Column types
  - `data-table-pagination-footer.tsx` - Pagination
  - `data-table-export-csv-button.tsx` - CSV export

### API Documentation

- **Current API**: `app/api/leaderboard/route.ts`
- **Aggregator**: `lib/leaderboard-aggregator.ts`
- **Supabase Types**: (to be generated after migrations)

### Tailwind Configuration

- **Config**: `tailwind.config.ts`
- **Breakpoints**: xs(500), sm(640), md(768), lg(1024), xl(1280), 2xl(1440)
- **Custom utilities**: Font sizes, letter spacing, extended spacing

### Icon Library

- **Location**: `components/icons/`
- **Count**: 91 SVG icons
- **Key icons**: Trophy, Star, StarFill, Level, Tag, Compass, Document, Link, TrendArrowUp, Check, Plus, ExternalLink

### Supabase Documentation

- **Generating TypeScript Types**: https://supabase.com/docs/guides/api/rest/generating-types
- **Tables and Data**: https://supabase.com/docs/guides/database/tables
- **Views**: For aggregate queries (frame_interaction_totals, nft_counts, referral_stats)

---

## 🎯 Next Steps

1. **Review & Approval**: User reviews this plan and approves approach
2. **Activate Supabase MCP**: Get database migration tools
3. **Phase 1 - Database Setup**: Create all new tables and views
4. **Phase 2 - API Upgrade**: Expand API types and queries
5. **Phase 3 - Aggregator Upgrade**: Update on-chain data collection
6. **Phase 4 - Component Implementation**: Build UI with music template patterns
7. **Phase 5 - Testing & Refinement**: Contrast, responsive, accessibility tests
8. **Phase 6 - Documentation Update**: Update all project docs

---

## 📝 Changelog

- **V2 (2025-01-XX)**: Complete rebuild plan using music template, Base-only support, comprehensive features
- **V1 (REJECTED)**: Used ViralLeaderboard from codebase (wrong reference source)

---

## ❓ Questions for Review

### **✅ Resolved via Contract Analysis + System Review**

1. **XP Breakdown**: ~~Are all XP sources tracked on-chain?~~
   - **Answer**: NO - Contracts only emit total `pointsAwarded` in `QuestCompleted` events. XP breakdown by source is NOT available on-chain.
   - **Resolution**: Removed XP breakdown feature from architecture plan.

2. **Frame Interactions**: ~~Do contracts emit frame interaction events?~~
   - **Answer**: NO - Frame interactions happen off-chain on Farcaster, no contract events emitted.
   - **Resolution**: Removed frame tracking feature from Phase 1. Can add in Phase 2 via Supabase tracking when frames call our API.

3. **Viral Metrics**: ~~Are viral engagement metrics tracked on-chain?~~
   - **Answer**: NO - Viral activity happens on Farcaster, no contract events emitted. **However**, we have a robust viral XP system in Supabase (Phase 5.0/5.1).
   - **Resolution**: Integrate viral XP from `badge_casts` table into leaderboard scoring (off-chain metric).

4. **Rank Tier Progression**: ~~Are 6 tiers enough for unlimited point growth?~~
   - **Answer**: NO - Users past 15K XP have no progression goals.
   - **Resolution**: Expanded to 12-tier system with badge rewards and XP multipliers (see V2.2 updates).

### **⏳ Still Need User Input**

1. **Template Selection**: Confirm music DataTable is the right choice? (Already tested by thousands of developers, highly recommended)

2. **Rank Tier Rewards**: Approve 12-tier system with XP multipliers (10% → 50% → 100%)?
   - Alternative: Keep 6 tiers but add multipliers
   - Recommended: 12 tiers for continuous progression

3. **Column Priority**: Are all 9 columns (Rank, Pilot, Points, Quests, Guild, Referrals, NFTs, Badges, Rewards) required for initial release?
   - Or reduce to core 6: Rank, Pilot, Points, Quests, Guild, Badges?

4. **Viral XP Integration**: Include viral XP in total leaderboard score?
   - **Recommended**: YES - incentivizes social engagement
   - Calculation: Total Score = Quest Points + Viral XP + Guild Bonus + Referral Bonus + Streak Bonus + Badge Prestige

5. **Time Period Selector**: Add time-based leaderboards (24h, 7d, 30d, all-time)?
   - **Recommended**: YES - follow Trezoadmin GainersLosersTable pattern
   - Requires daily snapshot table for historical ranks

6. **Rank Change Indicators**: Show rank change arrows (↑↓) from previous period?
   - **Recommended**: YES - creates competitive urgency
   - Stores: `rank_change` field in leaderboard calculations

7. **Mobile View**: Is expandable card with details accordion the right UX? Or prefer different approach?

8. **Pagination**: 15 items per page good default? Should we allow user to change (25, 50, 100)?

9. **CSV Export**: Should we include CSV export feature (available in music template)?

10. **Bulk Actions**: Should we support selecting multiple rows for bulk operations? (Available in music template, but may not be needed for leaderboard)

### **🚀 Phase 2 Roadmap (Future Features)**

These features are NOT in Phase 1 due to lack of on-chain data, but can be added later:

1. **Frame Tracking**: Add Supabase tracking when frames call `/api/frame/*` endpoints
2. **XP Breakdown UI**: Show detailed breakdown once we add separate XP event tracking
3. **Viral Metrics Dashboard**: Integrate Neynar Cast Engagement API for cast-level viral stats
4. **Guild Leaderboards**: Separate rankings for guild teams
5. **Category Leaderboards**: Quest-only, viral-only, referral-only rankings
6. **Seasonal Leaderboards**: Quarterly resets with prizes

---

**Status**: ✅ **V2.2 Architecture Ready - Awaiting User Approval**

**Next Steps**:
1. Review V2.2 changes (12-tier system, viral XP integration, template patterns)
2. Answer remaining questions above
3. Approve 12-tier rank system with rewards
4. Approve viral XP integration into total score
5. Confirm music DataTable template choice
6. Then proceed to Phase 1 (Database Setup using Supabase MCP)


