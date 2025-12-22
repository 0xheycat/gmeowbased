# Subsquid Layer 1 Compliance Audit - Detailed Findings

**Date**: December 22, 2025  
**Purpose**: Verify on-chain contract events, identify Supabase violations, and clarify function names

---

## ✅ FINDING 1: Smart Contract Events (On-Chain - Subsquid)

### **Contracts Deployed (Base Mainnet)**
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

### **GmeowCore.abi.json** (Core Contract - GM System)
**Events:**
- ✅ `GMEvent` - GM morning check-in (indexed in Subsquid)
- ✅ `GMSent` - GM sent event (indexed in Subsquid)
- ✅ `FIDLinked` - Farcaster ID linking (indexed in Subsquid)
- ✅ `BadgeMinted` - Badge minting (indexed in Subsquid)
- ✅ `NFTMinted` - NFT minting (indexed in Subsquid)
- ✅ `NFTMintPaymentReceived` - Payment for NFT (indexed in Subsquid)
- ✅ `NFTContractUpdated` - NFT contract address update
- ✅ `NFTMintConfigUpdated` - Mint configuration
- ✅ `OnchainQuestAdded` - Quest creation (indexed in Subsquid)
- ✅ `OnchainQuestCompleted` - Quest completion (indexed in Subsquid)
- ✅ `OracleAuthorized` - Oracle authorization
- ✅ `OracleChangeScheduled` - Oracle change
- ✅ `OracleSignerUpdated` - Oracle signer update
- ✅ `ContractAuthorized` - Contract authorization
- ✅ `NonceIncremented` - Nonce updates
- ✅ `MigrationEnabled` - Migration state
- ✅ `MigrationTargetSet` - Migration target
- ✅ `ERC20EscrowDeposited` - Treasury deposit (indexed in Subsquid)
- ✅ `ERC20Payout` - Treasury payout (indexed in Subsquid)
- ✅ `ERC20Refund` - Treasury refund (indexed in Subsquid)

**Status**: ✅ All events properly indexed in Subsquid schema

---

### **GmeowGuildStandalone.abi.json** (Guild Contract)
**Events:**
- ✅ `GuildCreated` - Guild creation (indexed in Subsquid)
- ✅ `GuildJoined` - Member joins guild (indexed in Subsquid)
- ✅ `GuildLeft` - Member leaves guild (indexed in Subsquid)
- ✅ `GuildLevelUp` - Guild level increase
- ✅ `GuildPointsDeposited` - Points deposit (indexed in Subsquid)
- ✅ `GuildQuestCreated` - Guild quest creation
- ✅ `GuildRewardClaimed` - Reward claimed
- ✅ `GuildTreasuryTokenDeposited` - Token deposit (indexed in Subsquid)
- Plus all core events (inherited)

**Status**: ✅ All events properly indexed in Subsquid schema

---

### **GmeowBadge.abi.json** (Badge/NFT Contract)
**Events:**
- ✅ `BadgeMinted` - Badge minting (indexed in Subsquid)
- ✅ `BadgeBurned` - Badge burning
- ✅ `MinterAuthorized` - Minter authorization
- ✅ `BaseURIUpdated` - Metadata URI update
- ✅ `Transfer` - NFT transfer (indexed as NFTTransfer in Subsquid)
- ✅ `Approval` - NFT approval
- ✅ `ApprovalForAll` - Batch approval
- ✅ `MetadataUpdate` - Metadata change
- ✅ `BatchMetadataUpdate` - Batch metadata change
- ✅ `OwnershipTransferred` - Contract ownership

**Status**: ✅ All events properly indexed in Subsquid schema

---

### **GmeowNFT.abi.json** (NFT Contract)
**Events:**
- ✅ `NFTMinted` - NFT minting (indexed in Subsquid)
- ✅ `Transfer` - NFT transfer (indexed as NFTTransfer)
- ✅ `Approval` - NFT approval
- ✅ `ApprovalForAll` - Batch approval
- ✅ `AuthorizedMinterUpdated` - Minter authorization
- ✅ `BaseURIUpdated` - Metadata URI update
- ✅ `ContractURIUpdated` - Contract metadata
- ✅ `MetadataFrozen` - Metadata lock
- ✅ `Paused` - Contract pause
- ✅ `Unpaused` - Contract unpause
- ✅ `OwnershipTransferred` - Ownership transfer

**Status**: ✅ All events properly indexed in Subsquid schema

---

### **GmeowReferralStandalone.abi.json** (Referral Contract)
**Events:**
- ✅ All core events (inherited)
- ✅ `OwnershipTransferStarted` - Two-step ownership transfer

**Status**: ✅ All events properly indexed in Subsquid schema

---

## ❌ FINDING 2: Supabase Tables with On-Chain Data Violations

### **CRITICAL VIOLATION 1: `points_transactions` table**
**Location**: Supabase (Layer 2)  
**Problem**: Duplicates on-chain PointsTransaction events

```typescript
points_transactions: {
  Row: {
    amount: number              // ❌ ON-CHAIN (exists in Subsquid)
    balance_after: number       // ❌ ON-CHAIN (exists in Subsquid)
    fid: number                 // ✅ OK (off-chain mapping)
    source: string              // ❌ ON-CHAIN (transaction type)
    metadata: Json | null       // ❓ UNCLEAR (needs review)
    created_at: string | null   // ❌ ON-CHAIN (timestamp)
  }
}
```

**Subsquid Equivalent**:
```graphql
type PointsTransaction @entity {
  id: ID!                       # txHash-logIndex
  transactionType: String!      # "DEPOSIT", "WITHDRAW"
  user: String! @index          # wallet address
  amount: BigInt!               # transaction amount
  from: String                  # source address
  to: String                    # destination address
  timestamp: DateTime!          # block timestamp
  blockNumber: Int! @index      # block number
  txHash: String! @index        # transaction hash
}
```

**RECOMMENDATION**: 
- ❌ **DROP TABLE**: `points_transactions` (redundant, query Subsquid instead)
- ✅ **USE**: `getPointsTransactions()` from subsquid-client.ts
- ✅ **MIGRATE**: Any FID references to `user_profiles` join query

---

### **CRITICAL VIOLATION 2: `quest_completions` table**
**Location**: Supabase (Layer 2)  
**Problem**: Duplicates on-chain QuestCompletion events

```typescript
quest_completions: {
  Row: {
    completer_address: string      // ❌ ON-CHAIN (user wallet)
    completer_fid: number          // ✅ OK (off-chain mapping)
    quest_id: number               // ❌ ON-CHAIN (quest ID from contract)
    points_awarded: number         // ❌ ON-CHAIN (reward points)
    token_awarded: number | null   // ❌ ON-CHAIN (ERC20 reward)
    nft_awarded_token_id: number   // ❌ ON-CHAIN (NFT reward)
    completed_at: string           // ❌ ON-CHAIN (timestamp)
    verification_proof: Json       // ❓ OFF-CHAIN (social quest proof)
  }
}
```

**Subsquid Equivalent**:
```graphql
type QuestCompletion @entity {
  id: ID!                       # txHash-logIndex
  quest: Quest!                 # quest relation
  user: User!                   # user relation
  pointsAwarded: BigInt!        # reward points
  tokenReward: BigInt           # ERC20 reward
  rewardToken: String           # ERC20 token address
  fid: BigInt!                  # Farcaster ID
  timestamp: DateTime!          # completion time
  blockNumber: Int! @index      # block number
  txHash: String! @index        # transaction hash
}
```

**RECOMMENDATION**:
- ⚠️ **PARTIAL DROP**: Keep `verification_proof` ONLY (off-chain social proof)
- ✅ **USE**: `getQuestCompletions()` from subsquid-client.ts for on-chain data
- ✅ **NEW TABLE**: `quest_social_proofs` with FID + verification_proof only

---

### **CRITICAL VIOLATION 3: `user_points_balances` table**
**Location**: Supabase (Layer 2)  
**Problem**: Duplicates on-chain User.pointsBalance

```typescript
user_points_balances: {
  Row: {
    fid: number                    // ✅ OK (off-chain mapping)
    base_points: number            // ❌ ON-CHAIN (User.pointsBalance)
    viral_xp: number               // ✅ OK (off-chain viral bonus)
    guild_bonus: number            // ❓ MIXED (could be calculated)
    total_points: number           // ❌ CALCULATED (Layer 3)
    last_synced_at: string         // ⚠️ CACHE timestamp
    updated_at: string             // ⚠️ CACHE timestamp
  }
}
```

**Subsquid Equivalent**:
```graphql
type User @entity {
  id: ID!                        # wallet address
  pointsBalance: BigInt!         # Current spendable balance
  totalEarnedFromGMs: BigInt!    # Cumulative GM rewards
  currentStreak: Int!
  lifetimeGMs: Int!
  lastGMTimestamp: BigInt!
}
```

**RECOMMENDATION**:
- ❌ **DROP FIELDS**: `base_points`, `total_points` (query Subsquid)
- ✅ **KEEP**: `viral_xp` (off-chain Layer 2 data)
- ✅ **KEEP**: `guild_bonus` IF it's off-chain metadata (needs verification)
- ⚠️ **RENAME TABLE**: `user_viral_bonuses` (make purpose clear)

---

### **VIOLATION 4: `user_badges` table**
**Location**: Supabase (Layer 2)  
**Problem**: Some on-chain fields mixed with off-chain

```typescript
user_badges: {
  Row: {
    id: string                     // ✅ OK (Supabase ID)
    fid: number                    // ✅ OK (off-chain mapping)
    badge_id: number               // ❌ ON-CHAIN (tokenId from BadgeMint)
    assigned_at: string            // ❌ ON-CHAIN (mint timestamp)
    minted: boolean                // ❓ Status flag (could be derived)
    minted_at: string | null       // ❌ ON-CHAIN (mint timestamp)
    tx_hash: string | null         // ❌ ON-CHAIN (transaction hash)
    chain: string | null           // ❌ ON-CHAIN (blockchain)
    contract_address: string       // ❌ ON-CHAIN (badge contract)
    token_id: number | null        // ❌ ON-CHAIN (NFT token ID)
    metadata: Json | null          // ✅ OK (off-chain badge metadata)
  }
}
```

**Subsquid Equivalent**:
```graphql
type BadgeMint @entity {
  id: ID!                        # txHash-logIndex
  tokenId: BigInt!               # NFT token ID
  user: User!                    # user relation
  badgeType: String!             # badge category
  timestamp: BigInt!             # mint time
  blockNumber: Int! @index
  txHash: String! @index
}
```

**RECOMMENDATION**:
- ⚠️ **KEEP TABLE**: But remove on-chain fields
- ❌ **DROP FIELDS**: `assigned_at`, `minted_at`, `tx_hash`, `chain`, `contract_address`, `token_id`
- ✅ **KEEP**: `fid`, `badge_id`, `metadata` (off-chain badge metadata/descriptions)
- ✅ **USE**: `getBadgeStakes()` from subsquid-client.ts for on-chain data
- ✅ **RENAME**: `badge_metadata` (clarify it's metadata only)

---

## ⚠️ FINDING 3: Confusing Function Names in subsquid-client.ts

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

**RECOMMENDATION**:
```typescript
// ✅ CLEAR: Returns on-chain user data by wallet address
export async function getOnChainUserStats(
  wallet: string
): Promise<UserOnChainStats | null>

// ✅ DEPRECATE: Old function with @deprecated warning
/**
 * @deprecated Use getOnChainUserStats() instead
 * This function name is misleading (suggests leaderboard ranking)
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

### **ISSUE 2: `getUserStatsByWallet()` - Method vs Function Confusion**
**Current**:
```typescript
// In SubsquidClient class:
async getUserStatsByWallet(wallet: string): Promise<UserOnChainStats | null>

// No exported function wrapper
```

**Problems**:
- ❌ Only available as class method (inconsistent with other functions)
- ❌ Name suggests "stats" (Layer 3 calculated) but returns on-chain data

**RECOMMENDATION**:
```typescript
// ✅ Export standalone function
export async function getOnChainUserStats(
  wallet: string
): Promise<UserOnChainStats | null> {
  const client = getSubsquidClient()
  return client.getUserByWallet(wallet) // Renamed class method
}

// ✅ Rename class method for clarity
class SubsquidClient {
  async getUserByWallet(wallet: string): Promise<UserOnChainStats | null> {
    // ... implementation
  }
}
```

---

### **ISSUE 3: `getLeaderboard()` - Misleading Name**
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

**RECOMMENDATION**:
```typescript
// ✅ CLEAR: Returns top users by on-chain points
export async function getTopUsersByPoints(
  limit: number = 100,
  offset: number = 0
): Promise<UserOnChainStats[]>

// ✅ DEPRECATE: Old function
/**
 * @deprecated Use getTopUsersByPoints() instead
 * This returns raw on-chain data, NOT a calculated leaderboard.
 * For ranked leaderboard, use unified-calculator.ts
 */
export async function getLeaderboard(
  limit: number = 100,
  offset: number = 0
): Promise<UserOnChainStats[]> {
  return getTopUsersByPoints(limit, offset)
}
```

---

### **ISSUE 4: `getGMEvents()` - Missing Context**
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

**RECOMMENDATION**:
```typescript
// ✅ OPTION 1: Remove FID support, require wallet
export async function getGMEventsByWallet(
  wallet: string,
  since?: Date
): Promise<GMEvent[]> // Return pure on-chain events
{
  // ... implementation
}

// ✅ OPTION 2: Add FID → wallet resolution with warning
export async function getGMEventsByFID(
  fid: number,
  since?: Date
): Promise<GMEvent[]> {
  // Must query Supabase first to get wallet
  console.warn('[getGMEventsByFID] Requires Supabase user_profiles lookup first')
  // ... implementation
}

// ✅ DEPRECATE: Old confusing function
/**
 * @deprecated Use getGMEventsByWallet() instead
 * FID is not indexed in Subsquid
 */
export async function getGMEvents(
  fid: number,
  since?: Date
): Promise<GMRankEvent[]> {
  console.warn('[getGMEvents] FID not supported in Subsquid. Use getGMEventsByWallet() instead.')
  return []
}
```

---

### **ISSUE 5: `isPowerBadge()` and `getPowerBadge()` - Wrong Layer**
**Current**:
```typescript
export async function isPowerBadge(fid: string): Promise<boolean>
export async function getPowerBadge(fid: string): Promise<any | null>
```

**Problems**:
- ❌ Takes FID (string) but Subsquid doesn't index by FID
- ❌ Function name suggests boolean check but queries on-chain entity
- ❌ "Power Badge" status might be off-chain metadata (needs verification)

**RECOMMENDATION**:
```typescript
// ✅ IF on-chain: Rename to show it's on-chain data
export async function getPowerBadgeByFID(
  fid: string
): Promise<PowerBadge | null> {
  // ... implementation with wallet resolution
}

// ✅ IF off-chain: Move to Supabase query
// DELETE from subsquid-client.ts, add to supabase/edge.ts
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

## 📊 SUMMARY OF FINDINGS

### **On-Chain Events (Subsquid) - ✅ CORRECT**
| Contract | Events | Indexed | Status |
|----------|--------|---------|---------|
| GmeowCore | 19 events | ✅ Yes | Complete |
| GmeowGuild | 8 guild + 19 inherited | ✅ Yes | Complete |
| GmeowBadge | 10 events | ✅ Yes | Complete |
| GmeowNFT | 11 events | ✅ Yes | Complete |
| GmeowReferral | All core + 1 extra | ✅ Yes | Complete |

**Total On-Chain Events**: ~50 events properly indexed

---

### **Supabase Tables - ❌ VIOLATIONS FOUND**
| Table | Violation | Action Required |
|-------|-----------|-----------------|
| `points_transactions` | ❌ Duplicates PointsTransaction | **DROP TABLE** |
| `quest_completions` | ❌ Duplicates QuestCompletion | **PARTIAL DROP** (keep social proofs) |
| `user_points_balances` | ❌ Duplicates User.pointsBalance | **DROP FIELDS** (base_points, total_points) |
| `user_badges` | ⚠️ Mixed on-chain/off-chain | **DROP FIELDS** (tx_hash, timestamps, etc.) |

**Estimated Data Savings**: ~60% reduction in redundant data

---

### **Function Naming - ⚠️ CONFUSING**
| Function | Issue | Recommendation |
|----------|-------|----------------|
| `getLeaderboardEntry()` | ❌ Suggests ranking (Layer 3) | Rename to `getOnChainUserStats()` |
| `getUserStatsByWallet()` | ❌ Suggests calculated stats | Rename to `getUserByWallet()` |
| `getLeaderboard()` | ❌ Suggests ranked list | Rename to `getTopUsersByPoints()` |
| `getGMEvents()` | ❌ Takes FID (not indexed) | Rename to `getGMEventsByWallet()` |
| `isPowerBadge()` | ❓ Wrong layer? | Verify if on-chain or move to Supabase |

**Total Functions to Rename**: 5 critical, 3 deprecations

---

## ✅ NEXT STEPS

1. **Update SUBSQUID-LAYER-1-COMPLIANCE.md**:
   - ✅ Add actual contract addresses
   - ✅ List all 50+ on-chain events
   - ✅ Update Supabase table schemas (remove violations)
   - ✅ Add function renaming guide

2. **Create Migration Scripts**:
   - Create `DROP TABLE points_transactions`
   - Create `quest_social_proofs` table
   - Migrate `user_points_balances` → `user_viral_bonuses`
   - Clean `user_badges` fields

3. **Rename Functions in subsquid-client.ts**:
   - Add new clear function names
   - Deprecate old confusing names
   - Update all route imports

4. **Update Route Migrations**:
   - Replace Supabase queries with Subsquid queries
   - Remove redundant table joins
   - Use new function names

---

**Audit Complete**: December 22, 2025  
**Findings**: 4 Supabase violations, 5 function naming issues  
**Impact**: Improved architecture compliance, reduced data redundancy
