# 🔍 Smart Contract Deep Analysis - XP, Events, Rankings System

**Date**: December 2, 2025  
**Purpose**: Understand contract architecture before implementing leaderboard  
**Status**: Analysis Complete ✅

---

## 📋 Executive Summary

After reviewing the proxy smart contracts and current aggregator implementation, I've identified **critical gaps** between the architecture plan and actual contract capabilities:

### ✅ What Exists in Contracts
- Quest completion system with points + ERC20 rewards
- Referral system with tiered badges
- Guild system with levels and treasury
- NFT minting with payment/allowlist support
- GM streak system with bonuses
- Badge staking system
- Onchain quest verification (ERC20/ERC721/Stake/Badge)

### ❌ What's Missing (Planned in Architecture)
- ❌ **NO XP breakdown by source** (contracts only track total points)
- ❌ **NO frame interaction events** (not in contracts)
- ❌ **NO viral metrics tracking** (not in contracts)
- ❌ **NO on-chain XP sources** (tips, stakes, viral not separate)

### 🚨 Critical Findings

**The architecture plan assumes features that DON'T EXIST in the smart contracts.**

---

## 🔬 Contract Event Analysis

### 1. Quest Completion Event (PRIMARY DATA SOURCE)

**Contract**: `CoreModule.sol` → `CoreLogicLib.sol`

```solidity
event QuestCompleted(
  uint256 indexed questId,
  address indexed user,
  uint256 pointsAwarded,    // ✅ Total points only (NOT broken down by source)
  uint256 fid,              // ✅ Farcaster FID
  address rewardToken,      // ✅ ERC20 token address (if any)
  uint256 tokenAmount       // ✅ Token amount paid
);
```

**What We Actually Get**:
- Total points awarded (NOT XP by source)
- Quest ID (can track quest type, but not XP source)
- User address + FID
- ERC20 reward details

**What We DON'T Get**:
- ❌ XP breakdown (quests vs tips vs stakes vs viral)
- ❌ Frame interaction counts
- ❌ Viral engagement metrics

**Current Aggregator** (`lib/leaderboard-aggregator.ts`):
```typescript
type RawAggregate = {
  address: `0x${string}`
  chain: ChainKey
  points: bigint        // ✅ Total only (from QuestCompleted events)
  completed: number     // ✅ Quest count
  farcasterFid: number  // ✅ FID
}
```

**Reality**: The aggregator only tracks total points and quest completions, NOT XP sources.

---

### 2. Guild System Events

**Contract**: `GuildModule.sol`

```solidity
event GuildCreated(uint256 indexed guildId, address indexed leader, string name);
event GuildJoined(uint256 indexed guildId, address indexed member);
event GuildLeft(uint256 indexed guildId, address indexed member);
event GuildLevelUp(uint256 indexed guildId, uint8 newLevel);
event GuildPointsDeposited(uint256 indexed guildId, address indexed from, uint256 amount);
```

**What We Get**:
- ✅ Guild membership (join/leave events)
- ✅ Guild ID per user
- ✅ Guild levels (1-5 based on total points)
- ✅ Guild treasury deposits

**What We DON'T Get**:
- ❌ Guild roles (leader/officer stored on-chain but no role in events)
- ❌ XP earned from guild activities

**State Variables** (can query via contract):
```solidity
mapping(address => uint256) public guildOf;           // ✅ User's guild ID
mapping(uint256 => mapping(address => bool)) public guildOfficers; // ✅ Officer status
struct Guild {
  string name;
  address leader;
  uint256 totalPoints;
  uint256 memberCount;
  bool active;
  uint8 level;  // ✅ 1-5 levels
}
```

**Implementation Strategy**:
- ✅ Can track guild membership via events OR direct contract queries
- ✅ Can get guild name/role by querying `guilds(guildId)` and `guildOfficers(guildId, address)`

---

### 3. Referral System Events

**Contract**: `ReferralModule.sol`

```solidity
event ReferralCodeRegistered(address indexed user, string code);
event ReferrerSet(address indexed user, address indexed referrer);
event ReferralRewardClaimed(address indexed referrer, address indexed referee, uint256 pointsReward, uint256 tokenReward);

struct ReferralStats {
  uint256 totalReferred;      // ✅ Count of referrals
  uint256 totalPointsEarned;  // ✅ Total points from referrals
  uint256 totalTokenEarned;   // ✅ Total tokens from referrals
}
```

**What We Get**:
- ✅ Referral code registration
- ✅ Referrer-referee relationships
- ✅ Referral rewards (points + tokens)
- ✅ Total referral stats per user

**Implementation Strategy**:
- ✅ Parse `ReferrerSet` events to count referrals per user
- ✅ Parse `ReferralRewardClaimed` events to sum rewards
- ✅ Can query `referralStats(address)` for totals

---

### 4. NFT Minting Events

**Contract**: `NFTModule.sol`

```solidity
event NFTMinted(
  address indexed to,
  uint256 indexed tokenId,
  string nftTypeId,
  string metadataURI,
  string reason
);
```

**What We Get**:
- ✅ NFT mint events per user
- ✅ NFT type ID (e.g., "Season1Pass", "QuestReward")
- ✅ Metadata URI

**What We DON'T Get**:
- ❌ Total NFT count per user (need to aggregate events)
- ❌ Collection names (only nftTypeId strings)

**Implementation Strategy**:
- ✅ Parse `NFTMinted` events to count NFTs per user
- ✅ Group by unique `nftTypeId` for collection count

---

### 5. Badge System Events

**Contract**: `BaseModule.sol` + `SoulboundBadge.sol`

```solidity
event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType);
event StakedForBadge(address indexed who, uint256 points, uint256 badgeId);
event UnstakedForBadge(address indexed who, uint256 points, uint256 badgeId);
```

**Badge Types** (from contract analysis):
- `"OG-Caster"` - FID < 50,000
- `"Guild Leader"` - Created a guild
- `"Bronze/Silver/Gold Recruiter"` - Referral milestones (1/5/10 referrals)

**What We Get**:
- ✅ Badge minting events with types
- ✅ Points staked for badges

**Implementation Strategy**:
- ✅ Parse `BadgeMinted` events to track badge ownership
- ✅ Can display badge counts or specific badges earned

---

### 6. GM Streak System Events

**Contract**: `CoreLogicLib.sol`

```solidity
event GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak);
event GMSent(address indexed user, uint256 streak, uint256 pointsEarned);
```

**GM System** (from `sendGM()` function):
```solidity
// Streak bonuses:
// - 7 days:  +15% (default)
// - 30 days: +30% (default)
// - 100 days: +60% (default)
// Base reward: 10 points (default)
```

**What We Get**:
- ✅ GM events with points earned
- ✅ Current streak count

**What We DON'T Get**:
- ❌ Separate XP tracking for GM (counted in total points)

---

## 🚫 Missing Features (Not in Contracts)

### 1. Frame Interactions
**Status**: ❌ NOT TRACKED ON-CHAIN

**Why**:
- Frame interactions happen off-chain (Farcaster frames)
- No events emitted from contracts
- Would need separate tracking system

**Options**:
1. Track frame interactions in Supabase (when frames call our API)
2. Skip frame stats for leaderboard launch
3. Add frame tracking events in future contract upgrade

**Recommendation**: Skip for now, add in Phase 2

---

### 2. XP Breakdown by Source
**Status**: ❌ NOT TRACKED ON-CHAIN

**Contract Reality**:
- Only tracks total `pointsAwarded` in QuestCompleted events
- No separate fields for quest XP vs tip XP vs stake XP
- All points are fungible (no source tracking)

**Why Architecture Plan Was Wrong**:
```typescript
// ❌ PLANNED (doesn't exist):
xp: {
  total: number
  bySource: {
    quests: number    // ❌ Not tracked
    tips: number      // ❌ Not tracked
    stakes: number    // ❌ Not tracked
    viral: number     // ❌ Not tracked
    frames: number    // ❌ Not tracked
    referrals: number // ❌ Not tracked
    guild: number     // ❌ Not tracked
  }
}

// ✅ REALITY (what exists):
points: number  // Total only
completed: number  // Quest count
```

**Options**:
1. Infer XP sources from quest types (if quest metadata has type info)
2. Track XP sources off-chain in Supabase
3. Display total points only (simplest, matches contract)

**Recommendation**: Display total points only for launch, add detailed breakdown later

---

### 3. Viral Metrics
**Status**: ❌ NOT TRACKED ON-CHAIN

**Why**:
- Viral casts/engagement happen on Farcaster
- No on-chain events for viral activity
- Would need Neynar API + custom logic

**Options**:
1. Use Neynar API to track viral casts (off-chain)
2. Skip viral metrics for leaderboard
3. Add viral tracking in future

**Recommendation**: Skip for now, focus on on-chain data

---

## ✅ Revised Feature Matrix (Based on Actual Contracts)

### What We CAN Display (On-Chain Data)

| Feature | Data Source | Implementation |
|---------|-------------|----------------|
| **Rank** | Computed | Sort by total points |
| **Pilot** | Neynar API | Avatar + name + FID |
| **Points** | QuestCompleted events | Sum `pointsAwarded` |
| **Quest Completions** | QuestCompleted events | Count events per user |
| **Guild** | GuildJoined/Left events + contract query | Guild ID → query `guilds(id)` for name/level |
| **Guild Role** | Contract query | Check `guildOfficers(guildId, address)` |
| **Referrals** | ReferrerSet events | Count events where user is referrer |
| **Referral Rewards** | ReferralRewardClaimed events | Sum `pointsReward` |
| **NFTs** | NFTMinted events | Count unique `nftTypeId` per user |
| **Badges** | BadgeMinted events | Count badges + show types |
| **GM Streak** | GMEvent events | Latest streak value |
| **Rewards** | QuestCompleted events | Sum `tokenAmount` where `rewardToken != 0x0` |

### What We CANNOT Display (Not On-Chain)

| Feature | Reason | Alternative |
|---------|--------|-------------|
| ❌ **XP Breakdown** | Only total points tracked | Show total points only |
| ❌ **Frame Interactions** | Not tracked on-chain | Add Supabase tracking later |
| ❌ **Viral Metrics** | Not tracked on-chain | Use Neynar API separately |
| ❌ **Active Quests** | No event for quest acceptance | Can query contract state |
| ❌ **Quest Rewards Breakdown** | Only total per completion | Show total quest count |

---

## 📊 Revised Architecture Recommendations

### Leaderboard Columns (Updated for Reality)

**Desktop View**:

| Column | Width | Data Source | Notes |
|--------|-------|-------------|-------|
| **Rank** | 80px | Computed | Based on total points |
| **Pilot** | 280px | Neynar API | Avatar + name + FID badge |
| **Points** | 120px | QuestCompleted events | ✅ Sum pointsAwarded |
| **Quests** | 100px | QuestCompleted events | ✅ Count completions |
| **Guild** | 160px | Guild events + contract | ✅ Name + role badge |
| **Referrals** | 100px | ReferrerSet events | ✅ Count referrals |
| **NFTs** | 80px | NFTMinted events | ✅ Count mints |
| **Badges** | 80px | BadgeMinted events | ✅ Count badges |
| **Rewards** | 120px | QuestCompleted events | ✅ Sum tokenAmount |

**Removed Columns** (not supported by contracts):
- ❌ XP Total (use Points instead)
- ❌ XP Breakdown (not tracked)
- ❌ Frame Interactions (not tracked)
- ❌ Viral Tier (not tracked)

---

## 🔄 Database Schema Changes Needed

### What to Keep from Architecture Plan

#### ✅ guild_members table
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
```
**Data Source**: Parse `GuildJoined` events + query contract for guild details

#### ✅ referral_tracking table
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
```
**Data Source**: Parse `ReferrerSet` + `ReferralRewardClaimed` events

#### ✅ nft_holdings table
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
```
**Data Source**: Parse `NFTMinted` events

### What to Remove/Skip

#### ❌ xp_breakdown table (NOT TRACKED ON-CHAIN)
```sql
-- SKIP THIS - contracts only track total points
-- No way to get XP by source from events
```

#### ❌ frame_interactions table (NOT TRACKED ON-CHAIN)
```sql
-- SKIP THIS - frames don't emit contract events
-- Would need separate Supabase tracking via API
```

#### ❌ viral_metrics table (NOT TRACKED ON-CHAIN)
```sql
-- SKIP THIS - viral activity not in contracts
-- Would need Neynar API integration
```

### Updated leaderboard_snapshots table

```sql
-- Update existing table (keep backward compatible)
ALTER TABLE leaderboard_snapshots
  -- Core stats (existing)
  -- points, completed, rewards, season_alloc already exist
  
  -- Quest stats (NEW)
  ADD COLUMN quest_count INTEGER DEFAULT 0,  -- Same as 'completed'
  
  -- Guild (NEW)
  ADD COLUMN guild_id INTEGER,
  ADD COLUMN guild_name TEXT,
  ADD COLUMN guild_role TEXT,
  
  -- Referrals (NEW)
  ADD COLUMN referral_count INTEGER DEFAULT 0,
  ADD COLUMN referral_rewards INTEGER DEFAULT 0,
  
  -- NFT holdings (NEW)
  ADD COLUMN nft_count INTEGER DEFAULT 0,
  
  -- Badges (NEW)
  ADD COLUMN badge_count INTEGER DEFAULT 0,
  ADD COLUMN badges TEXT[], -- Array of badge types
  
  -- GM Streak (NEW)
  ADD COLUMN gm_streak INTEGER DEFAULT 0;

-- Create indexes for new sortable columns
CREATE INDEX idx_leaderboard_quest_count ON leaderboard_snapshots(quest_count DESC);
CREATE INDEX idx_leaderboard_referrals ON leaderboard_snapshots(referral_count DESC);
CREATE INDEX idx_leaderboard_nfts ON leaderboard_snapshots(nft_count DESC);
CREATE INDEX idx_leaderboard_badges ON leaderboard_snapshots(badge_count DESC);

-- REMOVE from plan (not tracked):
-- ❌ xp_total, xp_quests, xp_tips, xp_stakes, xp_viral, xp_frames, xp_referrals, xp_guild
-- ❌ frame_interactions
-- ❌ viral_casts, viral_tier, viral_xp
```

---

## 🔧 Aggregator Upgrade Strategy (Revised)

### Event Parsers Needed

**File**: `lib/leaderboard-aggregator.ts`

```typescript
// ✅ ALREADY EXISTS
const EVT_QUEST_COMPLETED = parseAbiItem(
  'event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount)'
)

// ✅ ADD THESE
const EVT_GUILD_JOINED = parseAbiItem(
  'event GuildJoined(uint256 indexed guildId, address indexed member)'
)

const EVT_GUILD_LEFT = parseAbiItem(
  'event GuildLeft(uint256 indexed guildId, address indexed member)'
)

const EVT_REFERRER_SET = parseAbiItem(
  'event ReferrerSet(address indexed user, address indexed referrer)'
)

const EVT_REFERRAL_REWARD_CLAIMED = parseAbiItem(
  'event ReferralRewardClaimed(address indexed referrer, address indexed referee, uint256 pointsReward, uint256 tokenReward)'
)

const EVT_NFT_MINTED = parseAbiItem(
  'event NFTMinted(address indexed to, uint256 indexed tokenId, string nftTypeId, string metadataURI, string reason)'
)

const EVT_BADGE_MINTED = parseAbiItem(
  'event BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType)'
)

const EVT_GM_EVENT = parseAbiItem(
  'event GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak)'
)
```

### Aggregation Logic

```typescript
export type EnrichedLeaderboardEntry = {
  address: `0x${string}`
  chain: ChainKey
  
  // Core stats (existing)
  points: number          // ✅ Sum from QuestCompleted
  completed: number       // ✅ Count of QuestCompleted events
  rewards: number         // ✅ Sum tokenAmount from QuestCompleted
  farcasterFid: number    // ✅ From QuestCompleted events
  
  // Guild (NEW)
  guild: {
    id: number | null     // ✅ Latest GuildJoined event
    name: string | null   // ✅ Query contract guilds(id)
    role: string | null   // ✅ Query contract guildOfficers(id, address)
  }
  
  // Referrals (NEW)
  referrals: {
    count: number         // ✅ Count ReferrerSet where address is referrer
    rewards: number       // ✅ Sum pointsReward from ReferralRewardClaimed
  }
  
  // NFTs (NEW)
  nfts: {
    count: number         // ✅ Count NFTMinted events for address
  }
  
  // Badges (NEW)
  badges: {
    count: number         // ✅ Count BadgeMinted events for address
    types: string[]       // ✅ List of badgeType strings
  }
  
  // GM Streak (NEW)
  gmStreak: number        // ✅ Latest streak from GMEvent
}
```

### Contract Queries for Guild Data

```typescript
// After aggregating events, query contract for guild details
async function enrichWithGuildData(entries: EnrichedLeaderboardEntry[]) {
  const guildIds = entries
    .filter(e => e.guild.id !== null)
    .map(e => e.guild.id!)
  
  const uniqueGuildIds = [...new Set(guildIds)]
  
  // Query contract for each guild
  for (const guildId of uniqueGuildIds) {
    const guildInfo = await contract.read.getGuildInfo([guildId])
    // Store in cache: { id, name, leader, totalPoints, memberCount, active, level }
  }
  
  // Check officer status for each user
  for (const entry of entries) {
    if (entry.guild.id !== null) {
      const isLeader = guildCache[entry.guild.id].leader === entry.address
      const isOfficer = await contract.read.guildOfficers([entry.guild.id, entry.address])
      
      entry.guild.role = isLeader ? 'leader' : isOfficer ? 'officer' : 'member'
      entry.guild.name = guildCache[entry.guild.id].name
    }
  }
}
```

---

## 📝 Updated Architecture Plan Document

### Changes Required

1. **Remove XP Breakdown Section**
   - Delete `xp_breakdown` table schema
   - Remove XP sources column from table design
   - Update API types to remove `xp: { bySource: {...} }`

2. **Remove Frame Interactions Section**
   - Delete `frame_interactions` table schema
   - Remove Frames column from table design
   - Note: Can add in Phase 2 with Supabase tracking

3. **Remove Viral Metrics Section**
   - Delete `viral_metrics` table schema
   - Remove Viral column from table design
   - Note: Can add in Phase 2 with Neynar API

4. **Update Column Matrix**
   ```
   Desktop Columns:
   - Rank (80px)
   - Pilot (280px) - Avatar + name + FID
   - Points (120px) - Total points from quests
   - Quests (100px) - Quest completion count
   - Guild (160px) - Guild name + role badge
   - Referrals (100px) - Referral count
   - NFTs (80px) - NFT count
   - Badges (80px) - Badge count
   - Rewards (120px) - ERC20 rewards earned
   
   Total: ~1,140px (fits 1280px/xl breakpoint)
   ```

5. **Update Database Migrations**
   - Keep: `guild_members`, `referral_tracking`, `nft_holdings`
   - Add: `badge_ownership` (track badge types)
   - Remove: `xp_breakdown`, `frame_interactions`, `viral_metrics`

6. **Update API Types**
   ```typescript
   type LeaderboardEntry = {
     rank: number
     address: `0x${string}`
     pfpUrl: string
     name: string
     farcasterFid: number
     
     // Core stats
     points: number        // ✅ Total only (not breakdown)
     completed: number     // ✅ Quest count
     rewards: number       // ✅ ERC20 rewards
     
     // Guild
     guild: {
       id: number | null
       name: string | null
       role: 'member' | 'officer' | 'leader' | null
     }
     
     // Referrals
     referrals: {
       count: number
       rewards: number
     }
     
     // NFTs
     nftCount: number
     
     // Badges
     badgeCount: number
     badges: string[]  // Badge types
     
     // GM
     gmStreak: number
     
     // Season
     seasonAlloc: number
   }
   ```

---

## ✅ Action Items

### 1. Update LEADERBOARD-ARCHITECTURE-PLAN-V2.md ⏱️ 30 minutes

**Changes**:
- Remove XP breakdown section (tables, columns, API types)
- Remove frame interactions section
- Remove viral metrics section
- Update column matrix (9 columns instead of 11)
- Update database schema (remove 3 tables, keep 3)
- Update API types (remove nested xp object)
- Add "Contract Limitations" section explaining missing features
- Add "Phase 2 Roadmap" for frame/viral tracking

### 2. Create Revised Database Migrations ⏱️ 1 hour

**New Tables**:
- `guild_members` (guild membership + roles)
- `referral_tracking` (referral relationships + rewards)
- `nft_holdings` (NFT mints)
- `badge_ownership` (badge types earned)

**Views**:
- `referral_stats` (aggregate referral counts)
- `nft_counts` (aggregate NFT counts per user)
- `badge_counts` (aggregate badge counts per user)

### 3. Upgrade Leaderboard Aggregator ⏱️ 3-4 hours

**Add Event Parsers**:
- `GuildJoined`, `GuildLeft`
- `ReferrerSet`, `ReferralRewardClaimed`
- `NFTMinted`
- `BadgeMinted`
- `GMEvent`

**Add Contract Queries**:
- `getGuildInfo(guildId)` for guild details
- `guildOfficers(guildId, address)` for role checks

**Aggregate Logic**:
- Sum points from `QuestCompleted` events
- Count quests from event count
- Track guild membership (join/leave)
- Count referrals from `ReferrerSet` events
- Sum referral rewards from `ReferralRewardClaimed`
- Count NFTs from `NFTMinted` events
- Count badges from `BadgeMinted` events
- Get latest GM streak from `GMEvent` events

### 4. Update API Endpoint ⏱️ 2 hours

**File**: `app/api/leaderboard/route.ts`

**Changes**:
- Update `LeaderboardEntry` type (remove xp breakdown, frames, viral)
- Add guild data to response
- Add referral stats to response
- Add NFT count to response
- Add badge data to response
- Add GM streak to response

### 5. Implement Components ⏱️ 3-4 hours

**Use music DataTable template**:
- 9 columns (not 11)
- Remove XP, Frames, Viral columns
- Add Badges column
- Keep mobile card view responsive

---

## 🎯 Success Criteria (Revised)

### Must Have (On-Chain Data)
- [x] Rank based on total points
- [x] Pilot name + avatar + FID
- [x] Total points (from quests)
- [x] Quest completion count
- [x] Guild name + role badge
- [x] Referral count + rewards
- [x] NFT count
- [x] Badge count + types
- [x] ERC20 rewards earned
- [x] GM streak

### Nice to Have (Phase 2)
- [ ] Frame interaction tracking (Supabase-based)
- [ ] Viral metrics (Neynar API integration)
- [ ] XP breakdown (off-chain estimation based on quest types)
- [ ] Active quest tracking

---

## 📚 Contract Reference

### Key Functions to Query

```solidity
// Guild info
function getGuildInfo(uint256 guildId) external view returns (
  string memory name,
  address leader,
  uint256 totalPoints,
  uint256 memberCount,
  bool active,
  uint8 level
);

// Guild membership
mapping(address => uint256) public guildOf;  // User's guild ID
mapping(uint256 => mapping(address => bool)) public guildOfficers;

// Referral stats
function getReferralStats(address user) external view returns (
  uint256 totalReferred,
  uint256 totalPointsEarned,
  uint256 totalTokenEarned
);

// Points balance
mapping(address => uint256) public pointsBalance;
mapping(address => uint256) public userTotalEarned;

// FID linking
mapping(address => uint256) public farcasterFidOf;

// GM streak
mapping(address => uint256) public gmStreak;
```

---

**Status**: ✅ **Analysis Complete - Ready to Update Architecture Plan**

**Next Step**: Update `LEADERBOARD-ARCHITECTURE-PLAN-V2.md` with revised schema based on actual contract capabilities.
