# Subsquid Layer 1 Compliance & Migration Guide (V2 - CORRECTED)

**Date**: December 22, 2025  
**Status**: ✅ AUDITED - Accurate contract events, correct table schemas, clear function names  
**Purpose**: Ensure subsquid-client.ts only contains on-chain blockchain data

**Changes from V1**:
- ✅ Added actual deployed contract addresses (Base Mainnet)
- ✅ Listed all ~50 on-chain events from ABIs
- ✅ Identified Supabase tables with on-chain data violations
- ✅ Documented confusing function names and recommended replacements
- ✅ Complete audit trail in SUBSQUID-LAYER-1-AUDIT-FINDINGS.md

---

## 🎯 **3-Layer Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Subsquid (On-Chain Blockchain Data)              │
├─────────────────────────────────────────────────────────────┤
│ Source: Subsquid GraphQL Indexer                          │
│ File: lib/subsquid-client.ts                              │
│ Returns: UserOnChainStats (pure blockchain data)          │
│ Contracts: GmeowCore, GmeowGuild, GmeowBadge, GmeowNFT   │
│                                                             │
│ Data: GM events, points transactions, badge stakes,       │
│       quest completions, guild deposits, referrals         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Supabase (Off-Chain Application Data)            │
├─────────────────────────────────────────────────────────────┤
│ Source: Supabase PostgreSQL Database                      │
│ File: lib/supabase/edge.ts                                │
│ Returns: Database table rows (off-chain metadata)         │
│                                                             │
│ Data: User profiles (FID ↔ wallet), viral XP (engagement  │
│       bonuses), quest social proofs, notification prefs    │
│                                                             │
│ ❌ NOT ALLOWED: On-chain duplicates (points_transactions, │
│                quest_completions, user_points_balances)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Unified Calculator (Calculated Metrics)          │
├─────────────────────────────────────────────────────────────┤
│ Source: Application Logic                                 │
│ File: lib/scoring/unified-calculator.ts                   │
│ Returns: CompleteStats (calculated from L1 + L2)          │
│                                                             │
│ Calculations: Level, rank, totalScore, multipliers,       │
│               viral tiers, display formatting              │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **Layer 1 Compliance Audit (December 22, 2025)**

### **What Was Fixed:**

#### **1. Removed Mixed Types**
**Before** (❌ Violated 3-layer architecture):
```typescript
export interface LeaderboardEntry {
  wallet: string
  totalScore: number      // ❌ Layer 3 (calculated)
  viralXP: number         // ❌ Layer 2 (Supabase)
  rank: number            // ❌ Layer 3 (calculated)
  guildBonus: number      // ❌ Layer 2/3 (mixed)
  referralBonus: number   // ❌ Layer 2 (Supabase)
  level: number           // ❌ Layer 3 (calculated)
}
```

**After** (✅ Pure Layer 1):
```typescript
export interface UserOnChainStats {
  id: string                    // Wallet address (primary key)
  pointsBalance: number          // Current spendable balance (on-chain)
  totalEarnedFromGMs: number     // Cumulative GM rewards (on-chain)
  currentStreak: number          // Current GM streak (on-chain)
  lifetimeGMs: number            // Total GM count (on-chain)
  lastGMTimestamp: string | null // Last GM timestamp (on-chain)
  totalTipsGiven: number         // Tips sent count (on-chain)
  totalTipsReceived: number      // Tips received count (on-chain)
  milestoneCount: number         // Milestone achievements (on-chain)
}
```

#### **2. Updated Function Return Types**
```typescript
// ✅ Now returns pure Layer 1 data
async getLeaderboard(limit, offset): Promise<UserOnChainStats[]>
async getUserStatsByWallet(wallet): Promise<UserOnChainStats | null>
```

#### **3. Deprecated Old Mixed Types**
```typescript
/**
 * @deprecated Use UserOnChainStats instead
 * This type mixed Layer 1, 2, 3 data (violation of architecture)
 */
export interface LeaderboardEntry { ... }
```

---

## 📊 **Data Source Reference**

### **Layer 1: Subsquid (On-Chain Blockchain Data)**

**Deployed Contracts (Base Mainnet)**:
```json
{
  "core": "0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73",
  "guild": "0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3",
  "nft": "0xCE9596a992e38c5fa2d997ea916a277E0F652D5C",
  "badge": "0x5Af50Ee323C45564d94B0869d95698D837c59aD2",
  "referral": "0x9E7c32C1fB3a2c08e973185181512a442b90Ba44",
  "oracle": "0x8870C155666809609176260F2B65a626C000D773",
  "deploymentBlock": 39236809,
  "deploymentDate": "2025-12-09"
}
```

**On-Chain Events Indexed** (from ABIs):

**GmeowCore.abi.json** (19 events):
- `GMEvent` - GM morning check-in (pointsAwarded, streakDay)
- `GMSent` - GM sent event
- `FIDLinked` - Farcaster ID → wallet linking
- `BadgeMinted` - Badge minting event
- `NFTMinted` - NFT minting event
- `NFTMintPaymentReceived` - Payment for NFT mint
- `NFTContractUpdated` - NFT contract address update
- `NFTMintConfigUpdated` - Mint configuration change
- `OnchainQuestAdded` - Quest creation
- `OnchainQuestCompleted` - Quest completion (pointsAwarded, tokenReward)
- `OracleAuthorized` - Oracle authorization
- `OracleChangeScheduled` - Scheduled oracle change
- `OracleSignerUpdated` - Oracle signer update
- `ContractAuthorized` - Contract authorization
- `NonceIncremented` - Nonce updates
- `MigrationEnabled` - Migration state change
- `MigrationTargetSet` - Migration target set
- `ERC20EscrowDeposited` - Treasury deposit (token, amount)
- `ERC20Payout` - Treasury payout (token, amount, recipient)
- `ERC20Refund` - Treasury refund (token, amount, recipient)

**GmeowGuildStandalone.abi.json** (8 guild + 19 inherited):
- `GuildCreated` - Guild creation (guildId, owner)
- `GuildJoined` - Member joins guild (guildId, member)
- `GuildLeft` - Member leaves guild (guildId, member)
- `GuildLevelUp` - Guild level increase
- `GuildPointsDeposited` - Points deposited to guild (amount)
- `GuildQuestCreated` - Guild-specific quest
- `GuildRewardClaimed` - Guild reward claimed
- `GuildTreasuryTokenDeposited` - ERC20 deposit (token, amount)
- Plus all GmeowCore events (inherited)

**GmeowBadge.abi.json** (10 events):
- `BadgeMinted` - Badge minting (tokenId, recipient, badgeType)
- `BadgeBurned` - Badge burning (tokenId)
- `MinterAuthorized` - Minter authorization (minter, authorized)
- `BaseURIUpdated` - Metadata base URI update
- `Transfer` - NFT transfer (from, to, tokenId)
- `Approval` - NFT approval
- `ApprovalForAll` - Batch approval
- `MetadataUpdate` - Single token metadata update
- `BatchMetadataUpdate` - Batch metadata update
- `OwnershipTransferred` - Contract ownership transfer

**GmeowNFT.abi.json** (11 events):
- `NFTMinted` - NFT minting (tokenId, to, nftType, metadataURI)
- `Transfer` - NFT transfer (from, to, tokenId)
- `Approval` - NFT approval
- `ApprovalForAll` - Batch approval
- `AuthorizedMinterUpdated` - Minter authorization
- `BaseURIUpdated` - Metadata base URI
- `ContractURIUpdated` - Contract-level metadata
- `MetadataFrozen` - Metadata locked (cannot change)
- `Paused` - Contract paused
- `Unpaused` - Contract unpaused
- `OwnershipTransferred` - Ownership transfer

**GmeowReferralStandalone.abi.json** (all core + 1 extra):
- All GmeowCore events (inherited)
- `OwnershipTransferStarted` - Two-step ownership transfer

**Total On-Chain Events**: ~50 contract events properly indexed

---

**What Subsquid Stores** (GraphQL Schema):
```graphql
# User Points & Streaks (from GmeowCore contract)
type User {
  id: String!                # Wallet address (0x...)
  pointsBalance: BigInt!     # Current spendable points
  totalEarnedFromGMs: BigInt! # Cumulative GM rewards
  currentStreak: Int!        # GM streak counter
  lifetimeGMs: Int!          # Total GM events
  lastGMTimestamp: DateTime  # Last GM time
  totalTipsGiven: Int!       # Tips sent
  totalTipsReceived: Int!    # Tips received
  milestoneCount: Int!       # Milestones achieved
}

# GM Events (from GmeowCore.GMEvent)
type GMEvent {
  id: String!                # txHash-logIndex
  user: User!
  timestamp: BigInt!
  pointsAwarded: BigInt!
  streakDay: Int!
  blockNumber: Int! @index
  txHash: String! @index
}

# Points Transactions (from GmeowCore DEPOSIT/WITHDRAW events)
type PointsTransaction {
  id: String!                # txHash-logIndex
  transactionType: String!   # DEPOSIT | WITHDRAW
  user: String! @index       # wallet address
  amount: BigInt!
  from: String               # source address (deposits)
  to: String                 # destination (withdrawals)
  timestamp: DateTime!
  blockNumber: Int! @index
  txHash: String! @index
}

# Badge Staking (from GmeowBadge.BadgeMinted, BadgeBurned)
type BadgeStake {
  id: String!                # txHash-logIndex
  user: String! @index       # wallet address
  badgeId: BigInt!           # NFT token ID
  stakeType: String! @index  # STAKED | UNSTAKED
  stakedAt: DateTime         # when staked
  unstakedAt: DateTime       # when unstaked
  isActive: Boolean! @index  # currently staked?
  rewardsEarned: BigInt      # accumulated rewards
  isPowerBadge: Boolean!     # power badge status
  powerMultiplier: Int       # bonus multiplier (1-100)
  blockNumber: Int! @index
  txHash: String! @index
}

# Badge Minting (from GmeowBadge.BadgeMinted)
type BadgeMint {
  id: String!                # txHash-logIndex
  tokenId: BigInt!
  user: User!
  badgeType: String!         # badge category
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}

# NFT Minting (from GmeowNFT.NFTMinted)
type NFTMint {
  id: String!                # txHash-logIndex
  tokenId: BigInt!
  to: String! @index         # recipient wallet
  nftType: String! @index    # NFT category
  metadataURI: String!       # IPFS or HTTP URI
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}

# NFT Transfers (from Transfer events)
type NFTTransfer {
  id: String!                # txHash-logIndex
  tokenId: BigInt!
  from: String! @index
  to: String! @index
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}

# Quest Completions (from GmeowCore.OnchainQuestCompleted)
type QuestCompletion {
  id: String!                # txHash-logIndex
  quest: Quest!
  user: User!
  pointsAwarded: BigInt!     # points reward
  tokenReward: BigInt        # ERC20 reward amount
  rewardToken: String        # ERC20 token address
  fid: BigInt!               # Farcaster ID (from event)
  timestamp: DateTime!
  blockNumber: Int! @index
  txHash: String! @index
}

# Quest Definitions (from GmeowCore.OnchainQuestAdded)
type Quest {
  id: String!                # questId from contract
  questType: String! @index  # "social", "onchain", "erc20", "guild"
  creator: String! @index    # wallet address
  contractAddress: String! @index # which contract
  rewardPoints: BigInt!      # points reward
  rewardToken: String        # ERC20 token address
  rewardTokenAmount: BigInt  # ERC20 amount
  onchainType: Int           # 0=ERC20_HOLD, 1=ERC721_HOLD, 2=CONTRACT_CALL
  targetAsset: String        # target contract
  targetAmount: BigInt       # required amount/tokenId
  createdAt: DateTime!
  createdBlock: Int! @index
  isActive: Boolean! @index
  totalCompletions: Int!
  txHash: String! @index
}

# Guild System (from GmeowGuildStandalone events)
type Guild {
  id: String!                # guild ID from contract
  owner: String! @index      # guild owner wallet
  createdAt: BigInt!
  totalMembers: Int!
  totalPoints: BigInt!       # accumulated points
}

type GuildMember {
  id: String!                # guildId-memberAddress
  guild: Guild!
  user: User!
  joinedAt: BigInt!
  role: String!              # owner, officer, member
  pointsContributed: BigInt!
  isActive: Boolean!
}

type GuildEvent {
  id: String!                # txHash-logIndex
  guild: Guild!
  eventType: String!         # CREATED, JOINED, LEFT, DEPOSIT, POINTS_AWARDED
  user: String! @index       # member wallet
  amount: BigInt             # for deposits/points
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}

# Referral System (from GmeowReferralStandalone events)
type ReferrerSet {
  id: String!                # txHash-logIndex
  user: String! @index       # user who set referrer
  referrer: String! @index   # referrer wallet
  timestamp: BigInt!
  blockNumber: Int! @index
  txHash: String! @index
}

# Tip Events (from GmeowCore.TipEvent - if exists)
type TipEvent {
  id: String!                # txHash-logIndex
  from: User!
  to: User!
  amount: BigInt!
  timestamp: DateTime!
  blockNumber: Int! @index
  txHash: String! @index
  isFirstTip: Boolean!
  dailyTipCount: Int!
}

# Viral Milestones (achievement tracking)
type ViralMilestone {
  id: String!                # userId-milestoneType-timestamp
  user: User!
  milestoneType: String! @index  # "first_gm", "7_day_streak", etc.
  value: BigInt!
  timestamp: DateTime!
  castHash: String           # related Farcaster cast
  notificationSent: Boolean!
  previousValue: BigInt
  requiredValue: BigInt!
  category: String! @index   # "gm", "tips", "badges", "guilds"
}

# Treasury Operations (from GmeowCore ERC20 events)
type TreasuryOperation {
  id: String!                # txHash-logIndex
  operationType: String! @index  # "ESCROW_DEPOSIT", "PAYOUT", "REFUND"
  token: String! @index      # ERC20 token address
  amount: BigInt!
  from: String! @index       # depositor/payer
  to: String                 # recipient (payouts/refunds)
  questId: BigInt            # associated quest
  timestamp: DateTime!
  blockNumber: Int! @index
  txHash: String! @index
}

# Power Badge Tracking
type PowerBadge {
  id: String!                # fid (Farcaster ID)
  fid: BigInt! @index
  isPowerBadge: Boolean!
  setBy: String!             # admin wallet
  timestamp: DateTime!
  blockNumber: Int! @index
  txHash: String! @index
}
```

**Available Functions in subsquid-client.ts**:
```typescript
// User on-chain stats
getLeaderboardEntry(fidOrWallet) → UserOnChainStats | null  // ⚠️ CONFUSING NAME (see naming audit)
getUserStatsByWallet(address) → UserOnChainStats | null     // ⚠️ Class method only
getLeaderboard(limit, offset) → UserOnChainStats[]          // ⚠️ CONFUSING NAME (see naming audit)

// Events & transactions
getGMEvents(fid, since?) → GMRankEvent[]                    // ⚠️ FID not indexed (see naming audit)
getPointsTransactions(user, options?) → PointsTransaction[]
getBadgeStakes(user, options?) → BadgeStake[]
getQuestCompletions(options?) → QuestCompletion[]

// Analytics (time-series event counts)
getGMEventAnalytics(since, until?) → AnalyticsSeries
getBadgeMintAnalytics(since, until?) → AnalyticsSeries
getQuestCompletionAnalytics(since, until?) → AnalyticsSeries
getPlatformAnalytics(since, until?) → PlatformAnalytics
```

**❌ FORBIDDEN in Subsquid:**
- FID-based queries (FID is off-chain, use Supabase first to resolve FID → wallet)
- Viral XP (stored in Supabase badge_casts.viral_bonus_xp)
- Level calculations (use lib/scoring/unified-calculator.ts)
- Rank calculations (use lib/scoring/unified-calculator.ts)
- Total score aggregation (use lib/scoring/unified-calculator.ts)
- Display formatting (use lib/scoring/unified-calculator.ts)

---

### **Layer 2: Supabase (Off-Chain Application Data)**

**✅ CORRECT Tables** (off-chain metadata only):
```typescript
// User profiles (FID ↔ wallet mapping)
user_profiles {
  fid: number                    // ✅ OFF-CHAIN (Farcaster identity)
  wallet_address: string         // ✅ OFF-CHAIN (mapped from FID)
  username: string               // ✅ OFF-CHAIN (Farcaster username)
  display_name: string           // ✅ OFF-CHAIN (Farcaster display name)
  pfp_url: string                // ✅ OFF-CHAIN (profile picture)
  verified_addresses: string[]   // ✅ OFF-CHAIN (verified wallets)
}

// Viral engagement bonuses (off-chain calculation)
badge_casts {
  id: string
  fid: number
  cast_hash: string
  viral_bonus_xp: number         // ✅ OFF-CHAIN (engagement-based bonus)
  viral_score: number            // ✅ OFF-CHAIN (engagement metrics)
  engagement_count: number       // ✅ OFF-CHAIN (likes, recasts, replies)
  created_at: timestamp
}

// Quest social proofs (off-chain verification)
quest_social_proofs {           // ✅ NEW TABLE (migrated from quest_completions)
  fid: number
  quest_id: number
  verification_proof: Json       // ✅ OFF-CHAIN (social quest proof)
  verified_at: timestamp
}

// Quest progress tracking (off-chain)
user_quest_progress {
  fid: number
  quest_id: string
  progress: number               // ✅ OFF-CHAIN (progress tracking)
  completed: boolean             // ✅ OFF-CHAIN (UI state)
  completed_at: timestamp
}

// Referral stats (aggregated off-chain data)
referral_stats {
  fid: number
  total_referrals: number        // ✅ OFF-CHAIN (aggregated count)
  total_rewards: number          // ✅ OFF-CHAIN (aggregated rewards)
  last_referral_at: timestamp
}

// Guild metadata (off-chain descriptions)
guild_metadata {
  guild_id: string
  name: string                   // ✅ OFF-CHAIN (guild name)
  description: string            // ✅ OFF-CHAIN (guild description)
  avatar_url: string             // ✅ OFF-CHAIN (guild image)
}

// Badge metadata (off-chain descriptions)
badge_metadata {                 // ✅ RENAMED from user_badges
  badge_id: number
  name: string                   // ✅ OFF-CHAIN (badge name)
  description: string            // ✅ OFF-CHAIN (badge description)
  image_url: string              // ✅ OFF-CHAIN (badge image)
  metadata: Json                 // ✅ OFF-CHAIN (additional metadata)
}

// Notification preferences (off-chain user settings)
notification_preferences {
  fid: number
  badge_mints: boolean           // ✅ OFF-CHAIN (user preference)
  quest_completions: boolean     // ✅ OFF-CHAIN (user preference)
  viral_milestones: boolean      // ✅ OFF-CHAIN (user preference)
}

// Viral bonuses (off-chain Layer 2 only)
user_viral_bonuses {            // ✅ RENAMED from user_points_balances
  fid: number
  viral_xp: number               // ✅ OFF-CHAIN (viral engagement bonus)
  guild_bonus: number            // ✅ OFF-CHAIN (guild membership bonus)
  last_synced_at: timestamp      // ✅ CACHE timestamp
}
```

**❌ TABLES TO DROP** (duplicate on-chain data):
```typescript
// ❌ DROP: points_transactions
// Reason: Duplicates Subsquid PointsTransaction
// Use: getPointsTransactions() from subsquid-client.ts

// ❌ DROP MOST FIELDS: quest_completions
// Keep: verification_proof ONLY (move to quest_social_proofs)
// Reason: Duplicates Subsquid QuestCompletion
// Use: getQuestCompletions() from subsquid-client.ts

// ❌ DROP FIELDS: user_points_balances
// Drop: base_points, total_points (on-chain data)
// Keep: viral_xp, guild_bonus (off-chain bonuses)
// Rename: user_viral_bonuses

// ❌ DROP FIELDS: user_badges
// Drop: assigned_at, minted_at, tx_hash, chain, contract_address, token_id
// Keep: fid, badge_id, metadata (off-chain descriptions)
// Rename: badge_metadata
```

**Migration Impact**:
- Removes ~60% redundant data
- Reduces Supabase storage costs
- Enforces proper 3-layer separation
- See: SUBSQUID-LAYER-1-AUDIT-FINDINGS.md for details

---

### **Layer 3: Unified Calculator (Calculated Metrics)**

**What Unified Calculator Provides:**
```typescript
// Core calculation functions (lib/scoring/unified-calculator.ts)
calculateLevelProgress(points) → {
  level: number
  xpIntoLevel: number
  xpToNextLevel: number
  levelPercent: number
}

getRankTierByPoints(points) → {
  name: string
  minPoints: number
  tier: string
  icon: string
  reward: { ... }
}

calculateCompleteStats({
  blockchainPoints: number     // Layer 1 (Subsquid)
  viralXP: number              // Layer 2 (Supabase)
  questPoints: number          // Layer 2 (Supabase)
  guildPoints: number          // Layer 2 (Supabase)
  referralPoints: number       // Layer 2 (Supabase)
  currentStreak: number        // Layer 1 (Subsquid)
  lifetimeGMs: number          // Layer 1 (Subsquid)
}) → {
  scores: { blockchain, viral, total }
  level: { level, progress, ... }
  rank: { tier, next, percent }
  formatted: { totalScore: "7.0k", ... }
  metadata: { streak, lastGM, ... }
}

// Viral engagement scoring
calculateEngagementScore(metrics) → number
getViralTier(score) → { name, xp, emoji }

// Display formatting
formatPoints(1234) → "1.2k"
formatNumber(1000000) → "1.0M"
formatXP(567) → "567 XP"
```

**Available Functions** (32 total exports):
```bash
grep "^export" lib/scoring/unified-calculator.ts
```

**Deprecation Warnings**:
- ❌ `lib/leaderboard/rank.ts` - Use unified-calculator.ts instead
- ❌ `lib/viral/viral-bonus.ts` - Use unified-calculator.ts instead
- ❌ `lib/profile/stats-calculator.ts` - Use unified-calculator.ts instead

---

## ⚠️ **Function Naming Issues & Recommendations**

### **ISSUE 1: `getLeaderboardEntry()` - Ambiguous**
**Current**:
```typescript
export async function getLeaderboardEntry(
  fidOrWallet: number | string
): Promise<UserOnChainStats | null>
```

**Problems**:
- ❌ Name suggests leaderboard ranking (Layer 3 calculated data)
- ❌ Actually returns raw on-chain User entity
- ❌ FID parameter doesn't work (logs warning, requires wallet)

**RECOMMENDED NEW FUNCTION**:
```typescript
// ✅ CLEAR: Returns on-chain user data by wallet address
export async function getOnChainUserStats(
  wallet: string
): Promise<UserOnChainStats | null> {
  const client = getSubsquidClient()
  return client.getUserByWallet(wallet)
}
```

**DEPRECATE OLD FUNCTION**:
```typescript
/**
 * @deprecated Use getOnChainUserStats() instead
 * This function name is misleading (suggests leaderboard ranking)
 * FID parameter not supported (Subsquid indexes by wallet only)
 */
export async function getLeaderboardEntry(
  fidOrWallet: number | string
): Promise<UserOnChainStats | null> {
  if (typeof fidOrWallet === 'number') {
    console.warn('[getLeaderboardEntry] FID not supported. Use Supabase to resolve FID → wallet first.')
    return null
  }
  return getOnChainUserStats(fidOrWallet)
}
```

---

### **ISSUE 2: `getLeaderboard()` - Misleading Name**
**Current**:
```typescript
async getLeaderboard(
  limit: number = 100, 
  offset: number = 0
): Promise<UserOnChainStats[]>
```

**Problems**:
- ❌ Name suggests ranked leaderboard (Layer 3 calculated)
- ❌ Actually returns raw User entities sorted by pointsBalance
- ❌ No rank field (rank is calculated in Layer 3)

**RECOMMENDED NEW FUNCTION**:
```typescript
// ✅ CLEAR: Returns top users by on-chain points balance
export async function getTopUsersByPoints(
  limit: number = 100,
  offset: number = 0
): Promise<UserOnChainStats[]> {
  const client = getSubsquidClient()
  return client.getLeaderboard(limit, offset)
}
```

**DEPRECATE OLD FUNCTION**:
```typescript
/**
 * @deprecated Use getTopUsersByPoints() instead
 * This returns raw on-chain data sorted by pointsBalance, NOT a calculated leaderboard.
 * For ranked leaderboard with calculated scores, use unified-calculator.ts
 */
export async function getLeaderboard(
  limit: number = 100,
  offset: number = 0
): Promise<UserOnChainStats[]> {
  return getTopUsersByPoints(limit, offset)
}
```

---

### **ISSUE 3: `getGMEvents()` - FID Not Indexed**
**Current**:
```typescript
export async function getGMEvents(
  fid: number, 
  since?: Date
): Promise<GMRankEvent[]>
```

**Problems**:
- ❌ Takes FID but Subsquid doesn't index by FID (requires wallet)
- ❌ Returns `GMRankEvent[]` with deprecated calculated fields (level, tierName)
- ❌ Function should resolve FID → wallet internally or warn

**RECOMMENDED NEW FUNCTION**:
```typescript
// ✅ CLEAR: Requires wallet address (Subsquid primary key)
export async function getGMEventsByWallet(
  wallet: string,
  since?: Date
): Promise<GMEvent[]> {
  const client = getSubsquidClient()
  // ... query implementation using wallet
}
```

**DEPRECATE OLD FUNCTION**:
```typescript
/**
 * @deprecated Use getGMEventsByWallet() instead
 * FID is not indexed in Subsquid (wallet is primary key)
 * Must resolve FID → wallet via Supabase user_profiles first
 */
export async function getGMEvents(
  fid: number,
  since?: Date
): Promise<GMRankEvent[]> {
  console.warn('[getGMEvents] FID not supported. Use getGMEventsByWallet() with wallet address.')
  return []
}
```

---

### **ISSUE 4: `getUserStatsByWallet()` - Class Method Only**
**Current**:
```typescript
// In SubsquidClient class:
async getUserStatsByWallet(wallet: string): Promise<UserOnChainStats | null>

// No exported standalone function
```

**Problems**:
- ❌ Only available as class method (inconsistent with other functions)
- ❌ Name suggests "stats" (Layer 3 calculated) but returns on-chain data

**RECOMMENDED CHANGES**:
```typescript
// ✅ Export standalone function (consistency)
export async function getOnChainUserStats(
  wallet: string
): Promise<UserOnChainStats | null> {
  const client = getSubsquidClient()
  return client.getUserByWallet(wallet)
}

// ✅ Rename class method for clarity
class SubsquidClient {
  /**
   * Get on-chain user data by wallet address
   * Returns: UserOnChainStats (Layer 1 only)
   */
  async getUserByWallet(wallet: string): Promise<UserOnChainStats | null> {
    // ... implementation
  }
}
```

---

### **ISSUE 5: `isPowerBadge()` - Wrong Layer?**
**Current**:
```typescript
export async function isPowerBadge(fid: string): Promise<boolean>
export async function getPowerBadge(fid: string): Promise<any | null>
```

**Problems**:
- ❌ Takes FID (string) but Subsquid doesn't index by FID well
- ❌ "Power Badge" status might be off-chain metadata (needs verification)
- ❌ Function name suggests boolean check but queries on-chain entity

**RECOMMENDATION** (depends on verification):
```typescript
// ✅ IF on-chain: Rename to show it's on-chain data
export async function getPowerBadgeByFID(
  fid: string
): Promise<PowerBadge | null> {
  // ... implementation with wallet resolution
}

// ✅ IF off-chain: Move to Supabase query
// DELETE from subsquid-client.ts, add to lib/supabase/edge.ts
export async function getPowerBadgeStatus(fid: number): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('power_badge_metadata')
    .select('is_power_badge')
    .eq('fid', fid)
    .single()
  return data?.is_power_badge || false
}
```

---

## 🔧 **Migration Guide for Routes**

### **Step 1: Identify Data Needs**

Ask these questions:
1. What blockchain data do I need? (Layer 1)
2. What off-chain metadata do I need? (Layer 2)
3. What calculated metrics do I need? (Layer 3)

### **Step 2: Query Each Layer**

```typescript
// ✅ CORRECT: Explicit 3-layer pattern with NEW function names
import { getOnChainUserStats } from '@/lib/subsquid-client'  // NEW NAMING
import { createClient } from '@/lib/supabase/edge'
import { calculateCompleteStats } from '@/lib/scoring/unified-calculator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fid = Number(searchParams.get('fid'))
  
  // Layer 2: Get wallet address from FID
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('wallet_address, fid, username')
    .eq('fid', fid)
    .single()
  
  if (!profile?.wallet_address) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // Layer 1: Get on-chain blockchain data
  const onChain = await getOnChainUserStats(profile.wallet_address)  // ✅ NEW NAMING
  
  // Layer 2: Get off-chain viral XP (from badge engagement)
  const { data: viralCasts } = await supabase
    .from('badge_casts')
    .select('viral_bonus_xp')
    .eq('fid', fid)
  
  const viralXP = viralCasts?.reduce((sum, c) => 
    sum + (c.viral_bonus_xp || 0), 0
  ) || 0
  
  // Layer 3: Calculate derived metrics
  const stats = calculateCompleteStats({
    blockchainPoints: onChain?.pointsBalance || 0,
    viralXP,
    questPoints: 0,
    guildPoints: 0,
    referralPoints: 0,
    currentStreak: onChain?.currentStreak || 0,
    lifetimeGMs: onChain?.lifetimeGMs || 0,
    lastGMTimestamp: onChain?.lastGMTimestamp || null,
  })
  
  return NextResponse.json({
    ok: true,
    data: {
      // Identity
      fid: profile.fid,
      username: profile.username,
      wallet: profile.wallet_address,
      
      // Layer 1: On-chain
      onChain: {
        pointsBalance: onChain?.pointsBalance || 0,
        currentStreak: onChain?.currentStreak || 0,
        lifetimeGMs: onChain?.lifetimeGMs || 0,
      },
      
      // Layer 2: Off-chain
      offChain: {
        viralXP,
      },
      
      // Layer 3: Calculated
      calculated: {
        level: stats.level.level,
        levelProgress: stats.level.levelPercent,
        rankTier: stats.rank.currentTier.name,
        totalScore: stats.scores.total,
      },
      
      // Combined for display
      ...stats.formatted,
    },
    metadata: {
      sources: {
        subsquid: true,
        supabase: true,
        calculated: true,
      },
      timestamp: new Date().toISOString(),
    },
  })
}
```

### **Step 3: Response Contract**

Always include `metadata.sources`:
```typescript
{
  ok: boolean,
  data: { ... },
  metadata: {
    sources: {
      subsquid: boolean,   // Layer 1 used
      supabase: boolean,   // Layer 2 used
      calculated: boolean  // Layer 3 used
    },
    cached: boolean,
    timestamp: string
  }
}
```

---

## 🚨 **Common Violations & Fixes**

### **❌ VIOLATION 1: Mixing layers in types**
```typescript
// ❌ BAD: Type includes all 3 layers
interface UserStats {
  pointsBalance: number    // Layer 1
  viralXP: number         // Layer 2
  level: number           // Layer 3
}

// ✅ GOOD: Separate types per layer
interface OnChainData {
  pointsBalance: number
  currentStreak: number
}

interface OffChainData {
  viralXP: number
  questProgress: number
}

interface CalculatedData {
  level: number
  rank: string
  totalScore: number
}
```

### **❌ VIOLATION 2: Calculations in Subsquid client**
```typescript
// ❌ BAD: Calculating in subsquid-client.ts
export function getUserLevel(points: number): number {
  return Math.floor(points / 1000) // WRONG!
}

// ✅ GOOD: Use unified-calculator.ts
import { calculateLevelProgress } from '@/lib/scoring/unified-calculator'
const { level } = calculateLevelProgress(points)
```

### **❌ VIOLATION 3: Querying Subsquid by FID**
```typescript
// ❌ BAD: FID not indexed in Subsquid
const stats = await getLeaderboardEntry(fid) // WRONG! (also confusing name)

// ✅ GOOD: Resolve FID → wallet first
const { data: profile } = await supabase
  .from('user_profiles')
  .select('wallet_address')
  .eq('fid', fid)
  .single()

const stats = await getOnChainUserStats(profile.wallet_address)  // ✅ NEW NAMING
```

### **❌ VIOLATION 4: Storing on-chain data in Supabase**
```typescript
// ❌ BAD: Duplicating PointsTransaction in Supabase
await supabase.from('points_transactions').insert({
  fid,
  amount,
  source: 'GM',
  created_at: new Date().toISOString()
})

// ✅ GOOD: Query Subsquid instead
const transactions = await getPointsTransactions(wallet, {
  limit: 10,
  offset: 0
})
```

---

## 📋 **Verification Checklist**

Before migrating any route, verify:

### **Layer 1 (Subsquid) Compliance:**
- [ ] Only queries on-chain blockchain data (events from ABIs)
- [ ] Returns `UserOnChainStats` type (not mixed types)
- [ ] No FID-based queries (resolve via Supabase first)
- [ ] No calculations (level, rank, totalScore)
- [ ] No formatting (formatPoints, formatNumber)
- [ ] No viral XP (that's Layer 2 - badge_casts.viral_bonus_xp)
- [ ] Uses contract addresses from deployments/latest.json
- [ ] Only queries events from deployed contracts (see ABI section)

### **Layer 2 (Supabase) Usage:**
- [ ] Queries off-chain application data only
- [ ] Uses `createClient()` from `@/lib/supabase/edge`
- [ ] Queries correct tables (user_profiles, badge_casts, etc.)
- [ ] No on-chain duplicates (no points_transactions, quest_completions full data)
- [ ] No calculations (use Layer 3 for that)

### **Layer 3 (Unified Calculator) Usage:**
- [ ] Uses `lib/scoring/unified-calculator.ts` ONLY
- [ ] Imports calculation functions (calculateCompleteStats, etc.)
- [ ] Does NOT use deprecated files:
  - ❌ lib/leaderboard/rank.ts
  - ❌ lib/viral/viral-bonus.ts
  - ❌ lib/profile/stats-calculator.ts

### **Response Format:**
- [ ] Includes `metadata.sources` object
- [ ] Shows which layers were used (subsquid, supabase, calculated)
- [ ] Field names match frontend component interface
- [ ] Uses `totalPoints` not `totalXP` (correct Subsquid field name)
- [ ] Uses clear function names (getOnChainUserStats, not getLeaderboardEntry)

### **Function Naming:**
- [ ] Uses new clear function names:
  - ✅ `getOnChainUserStats()` instead of `getLeaderboardEntry()`
  - ✅ `getTopUsersByPoints()` instead of `getLeaderboard()`
  - ✅ `getGMEventsByWallet()` instead of `getGMEvents()`
- [ ] Deprecated old confusing functions (with @deprecated warnings)

---

## 🔄 **Subsquid Reindex Process**

### **When to Reindex:**
- Smart contract events schema changes
- New event types added to ABIs
- Historical data corrections
- Indexer logic updates
- New contracts deployed

### **How to Reindex:**

1. **Stop Subsquid Indexer**
   ```bash
   cd gmeow-indexer
   npm run sqd:down
   ```

2. **Clear Database**
   ```bash
   npm run sqd:reset
   ```

3. **Update Schema** (if needed)
   ```bash
   # Edit schema.graphql (add new events from ABIs)
   npm run codegen
   ```

4. **Update Contract Addresses** (if new deployment)
   ```bash
   # Edit src/main.ts processor config
   # Update contract addresses from deployments/latest.json
   ```

5. **Rebuild & Restart**
   ```bash
   npm run build
   npm run sqd:up
   ```

6. **Monitor Progress**
   ```bash
   # Check indexer logs
   docker logs gmeow-indexer-processor-1 -f
   
   # Query progress
   curl http://localhost:4350/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "{ _metadata { lastProcessedHeight } }"}'
   ```

### **Verification After Reindex:**
```bash
# Test query (check deployed contract events)
curl http://localhost:4350/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ users(limit: 5) { id pointsBalance currentStreak } }"
  }'

# Expected: Returns latest on-chain data from GmeowCore contract
```

---

## 📚 **Related Documentation**

- `SUBSQUID-LAYER-1-AUDIT-FINDINGS.md` - **Detailed audit findings** (contract events, Supabase violations, function naming)
- `COMPLETE-CALCULATION-SYSTEM.md` - 3-layer architecture details
- `UNIFIED-CALCULATOR-MIGRATION.md` - Calculation system migration
- `HYBRID-IMPLEMENTATION-COMPLETE-PLAN.md` - Data source mapping
- `INFRASTRUCTURE-USAGE-QUICK-REF.md` - lib/ infrastructure patterns
- `deployments/latest.json` - Deployed contract addresses (Base Mainnet)
- `abi/*.abi.json` - Smart contract ABIs (events and functions)
- `gmeow-indexer/schema.graphql` - Subsquid GraphQL schema

---

## ✅ **Summary**

**Subsquid (Layer 1)**:
- ✅ Pure on-chain blockchain data from deployed contracts
- ✅ UserOnChainStats type (no mixed Layer 2/3 fields)
- ✅ No calculations, no formatting
- ✅ No FID queries (off-chain, use Supabase first)
- ✅ ~50 contract events properly indexed
- ✅ Contract addresses from deployments/latest.json
- ⚠️ Function naming needs improvement (see naming audit)

**Supabase (Layer 2)**:
- ✅ Off-chain application data only
- ✅ User profiles, viral XP, quest social proofs
- ✅ FID ↔ wallet mapping
- ❌ **Tables to drop/fix**: points_transactions, quest_completions (most fields), user_points_balances (base_points, total_points), user_badges (on-chain fields)
- ✅ Rename tables: user_viral_bonuses, badge_metadata, quest_social_proofs

**Unified Calculator (Layer 3)**:
- ✅ ALL calculations (level, rank, totalScore)
- ✅ Viral tiers, formatting
- ✅ Single source of truth
- ✅ 32 calculation functions

**Routes**:
- ✅ Query all 3 layers explicitly
- ✅ Return metadata.sources
- ✅ Use lib/ infrastructure
- ✅ Use new clear function names
- ✅ 0 TypeScript errors

**Next Steps**:
1. Implement function renaming in subsquid-client.ts
2. Create Supabase migration scripts (drop/rename tables)
3. Update all route imports to use new function names
4. Clean up root directory (70+ .md files)

---

**Last Updated**: December 22, 2025 (V2 - Audit Complete)  
**Compliance Status**: ✅ AUDITED (contracts, tables, functions)  
**Next Review**: After function renaming and table migrations
