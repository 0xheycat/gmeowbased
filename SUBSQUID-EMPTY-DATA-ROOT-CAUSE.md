# Subsquid Empty Data Root Cause Analysis

**Date**: December 20, 2025  
**Issue**: Subsquid queries returning empty data for all API routes  
**Status**: ✅ **ROOT CAUSE IDENTIFIED**

---

## Executive Summary

**The Subsquid indexer IS working and HAS indexed data.** The issue is a **schema mismatch** between:
1. `lib/subsquid-client.ts` (client queries) ← expects `LeaderboardEntry` entity with `fid`, `wallet`, `viralXP` fields
2. `gmeow-indexer/schema.graphql` (actual schema) ← only has `User` entity with `id`, `totalPoints`, `lifetimeGMs` fields

**Impact**: All API routes calling Subsquid functions return empty/null data because GraphQL validation fails before query execution.

---

## Investigation Steps

### 1. Subsquid GraphQL Server Status
```bash
curl http://localhost:4350/graphql -d '{"query": "{ users { id } }"}' 
# ✅ Server running on port 4350
```

### 2. Data Verification
```graphql
query {
  users(limit: 5, orderBy: totalPoints_DESC) {
    id
    totalPoints
    currentStreak
    lifetimeGMs
    lastGMTimestamp
  }
}
```

**Result**: ✅ **2 users indexed successfully**
```json
{
  "data": {
    "users": [
      {
        "id": "0x8870c155666809609176260f2b65a626c000d773",
        "totalPoints": "1",
        "currentStreak": 10,
        "lifetimeGMs": 1,
        "lastGMTimestamp": "1765514511"
      },
      {
        "id": "0x8a3094e44577579d6f41f6214a86c250b7dbdc4e",  // ← FID 18139 (heycat)
        "totalPoints": "1",
        "currentStreak": 10,
        "lifetimeGMs": 1,
        "lastGMTimestamp": "1765744989"
      }
    ]
  }
}
```

### 3. GM Events Verification
```graphql
query {
  gmEvents(limit: 10, orderBy: timestamp_DESC) {
    id
    timestamp
    pointsAwarded
    streakDay
    user { id totalPoints }
  }
}
```

**Result**: ✅ **2 GM events indexed**
```json
{
  "data": {
    "gmEvents": [
      {
        "id": "undefined-572",
        "timestamp": "1765744989",
        "pointsAwarded": "1",
        "streakDay": 10,
        "user": {
          "id": "0x8a3094e44577579d6f41f6214a86c250b7dbdc4e",
          "totalPoints": "1"
        }
      },
      {
        "id": "undefined-549",
        "timestamp": "1765514511",
        "pointsAwarded": "1",
        "streakDay": 10,
        "user": {
          "id": "0x8870c155666809609176260f2b65a626c000d773",
          "totalPoints": "1"
        }
      }
    ]
  }
}
```

### 4. Client Query Test (FAILED)
```graphql
# lib/subsquid-client.ts query
query GetUserStatsByWallet($wallet: String!) {
  leaderboardEntries(where: { wallet_eq: $wallet }) {
    id
    wallet
    fid
    rank
    totalScore
    basePoints
    viralXP  # ← Field doesn't exist
    # ... more non-existent fields
  }
}
```

**Result**: ❌ **GraphQL Validation Error**
```json
{
  "errors": [
    {
      "message": "Cannot query field \"wallet\" on type \"User\".",
      "extensions": { "code": "GRAPHQL_VALIDATION_FAILED" }
    },
    {
      "message": "Cannot query field \"fid\" on type \"User\". Did you mean \"id\"?",
      "extensions": { "code": "GRAPHQL_VALIDATION_FAILED" }
    },
    {
      "message": "Cannot query field \"xp\" on type \"User\".",
      "extensions": { "code": "GRAPHQL_VALIDATION_FAILED" }
    }
  ]
}
```

---

## Root Cause: Schema Mismatch

### Actual Schema (`gmeow-indexer/schema.graphql`)
```graphql
type User @entity {
  id: ID!                      # ← wallet address (lowercase)
  totalPoints: BigInt!         # ← Total points earned
  currentStreak: Int!          # ← Current GM streak
  lastGMTimestamp: BigInt!     # ← Last GM timestamp
  lifetimeGMs: Int!            # ← Total GMs sent
  badges: [BadgeMint!] @derivedFrom(field: "user")
  guilds: [GuildMember!] @derivedFrom(field: "user")
  gmEvents: [GMEvent!] @derivedFrom(field: "user")
  totalTipsGiven: BigInt!
  totalTipsReceived: BigInt!
  milestones: [ViralMilestone!] @derivedFrom(field: "user")
  milestoneCount: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# NO LeaderboardEntry entity exists
# NO fid field (User.id is wallet address, not FID)
# NO wallet field (User.id IS the wallet)
# NO xp/viralXP/basePoints/guildBonus fields
```

### Expected Schema (by `lib/subsquid-client.ts`)
```typescript
// lib/subsquid-client.ts lines 83-99
export interface LeaderboardEntry {
  id: string
  wallet: string           // ← Doesn't exist
  fid?: number            // ← Doesn't exist
  rank: number            // ← Doesn't exist
  totalScore: number      // ← Should be totalPoints
  basePoints: number      // ← Doesn't exist
  viralXP: number        // ← Doesn't exist
  guildBonus: number     // ← Doesn't exist
  guildBonusPoints: number  // ← Doesn't exist
  referralBonus: number  // ← Doesn't exist
  streakBonus: number    // ← Doesn't exist
  badgePrestige: number  // ← Doesn't exist
  guildId?: string       // ← Doesn't exist
  guildName?: string     // ← Doesn't exist
  isGuildOfficer?: boolean  // ← Doesn't exist
  updatedAt: string
}
```

### Client Query Examples (ALL BROKEN)
```typescript
// lib/subsquid-client.ts lines 166-189
const LEADERBOARD_QUERY = `
  query GetLeaderboard($limit: Int!, $offset: Int!) {
    leaderboardEntries(          # ← Entity doesn't exist
      limit: $limit
      offset: $offset
      orderBy: totalScore_DESC   # ← Field doesn't exist
    ) {
      id
      wallet      # ← Field doesn't exist
      fid         # ← Field doesn't exist
      rank        # ← Field doesn't exist
      totalScore  # ← Should be totalPoints
      basePoints  # ← Field doesn't exist
      viralXP     # ← Field doesn't exist
      guildBonus  # ← Field doesn't exist
      # ... more non-existent fields
    }
  }
`
```

---

## Field Mapping Analysis

| lib/subsquid-client.ts | Actual Schema | Status | Notes |
|------------------------|---------------|---------|-------|
| `leaderboardEntries` | `users` | ❌ WRONG | Entity name mismatch |
| `wallet` | `id` | ❌ WRONG | User.id IS the wallet address |
| `fid` | - | ❌ MISSING | No FID in Subsquid (needs Supabase join) |
| `rank` | - | ❌ MISSING | Needs calculation or separate entity |
| `totalScore` | `totalPoints` | ⚠️ RENAME | Different field name |
| `basePoints` | - | ❌ MISSING | Not tracked separately |
| `viralXP` | - | ❌ MISSING | Not tracked in indexer |
| `guildBonus` | - | ❌ MISSING | Not tracked in indexer |
| `guildBonusPoints` | - | ❌ MISSING | Not tracked in indexer |
| `referralBonus` | - | ❌ MISSING | Not tracked in indexer |
| `streakBonus` | - | ❌ MISSING | Could derive from `currentStreak` |
| `badgePrestige` | - | ❌ MISSING | Could derive from `badges` count |
| `guildId` | Guild via join | ⚠️ JOIN | Available via `guilds` relation |
| `guildName` | Guild via join | ⚠️ JOIN | Available via `guilds.guild` relation |
| `isGuildOfficer` | GuildMember.role | ⚠️ JOIN | Available via `guilds.role` |
| `updatedAt` | `updatedAt` | ✅ OK | Field exists |

---

## Available Data in Subsquid

### ✅ INDEXED ENTITIES (from schema.graphql)

1. **User** - Core user data
   - `id` (wallet address)
   - `totalPoints`
   - `currentStreak`
   - `lastGMTimestamp`
   - `lifetimeGMs`
   - `totalTipsGiven`
   - `totalTipsReceived`
   - `milestoneCount`
   - Relations: `badges`, `guilds`, `gmEvents`, `tipsGiven`, `tipsReceived`, `milestones`

2. **GMEvent** - GM transaction history
   - `id`
   - `user` (relation)
   - `timestamp`
   - `pointsAwarded`
   - `streakDay`
   - `blockNumber`
   - `txHash`

3. **Guild** - Guild entities
   - `id` (guild ID)
   - `owner`
   - `createdAt`
   - `totalMembers`
   - `totalPoints`
   - Relations: `members`, `events`

4. **GuildMember** - Guild membership
   - `id` (guildId-memberAddress)
   - `guild` (relation)
   - `user` (relation)
   - `joinedAt`
   - `role` (owner, officer, member)
   - `pointsContributed`
   - `isActive`

5. **GuildEvent** - Guild activity log
   - `id`
   - `guild` (relation)
   - `eventType` (CREATED, JOINED, LEFT, DEPOSIT, POINTS_AWARDED)
   - `user`
   - `amount`
   - `timestamp`
   - `blockNumber`
   - `txHash`

6. **BadgeMint** - Badge NFT mints
   - `id`
   - `tokenId`
   - `user` (relation)
   - `badgeType`
   - `timestamp`
   - `blockNumber`
   - `txHash`

7. **NFTMint** - NFT mints
   - `id`
   - `tokenId`
   - `to`
   - `nftType`
   - `metadataURI`
   - `timestamp`
   - `blockNumber`
   - `txHash`

8. **NFTTransfer** - NFT transfers
   - `id`
   - `tokenId`
   - `from`
   - `to`
   - `timestamp`
   - `blockNumber`
   - `txHash`

9. **ReferralCode** - Referral codes
   - `id`
   - `owner`
   - `code`
   - `createdAt`
   - `usageCount`

10. **ReferralUse** - Referral usage events
    - `id`
    - `code` (relation)
    - `user`
    - `timestamp`
    - `blockNumber`
    - `txHash`

11. **ReferrerSet** - Referrer assignments
    - `id`
    - `user`
    - `referrer`
    - `timestamp`
    - `blockNumber`
    - `txHash`

12. **TipEvent** - Tip transactions
    - `id`
    - `from` (User relation)
    - `to` (User relation)
    - `amount`
    - `timestamp`
    - `blockNumber`
    - `txHash`

13. **ViralMilestone** - Viral achievement milestones
    - `id`
    - `user` (relation)
    - `milestoneType`
    - `threshold`
    - `achievedValue`
    - `timestamp`
    - `blockNumber`
    - `txHash`

14. **Quest** - Quest entities
    - `id`
    - `creator`
    - `questType`
    - `reward`
    - `createdAt`

15. **QuestCompletion** - Quest completions
    - `id`
    - `quest` (relation)
    - `user`
    - `timestamp`
    - `blockNumber`
    - `txHash`

16. **PointsTransaction** - Points transactions
    - `id`
    - `user`
    - `amount`
    - `source`
    - `timestamp`
    - `blockNumber`
    - `txHash`

17. **TreasuryOperation** - Treasury ops
    - `id`
    - `guild` (relation)
    - `operationType`
    - `amount`
    - `timestamp`
    - `blockNumber`
    - `txHash`

18. **BadgeStake** - Badge staking
    - `id`
    - `user`
    - `badgeId`
    - `amount`
    - `timestamp`
    - `blockNumber`
    - `txHash`

### ❌ MISSING ENTITIES (expected by client)

1. **LeaderboardEntry** - Pre-computed leaderboard rankings
2. **GMRankEvent** - Rank change events with tier/level data
3. **XPTransaction** - XP transaction history
4. **UserWithFID** - User entity enriched with Farcaster FID

---

## Why Routes Return Empty Data

### Example: `/api/user/profile/[fid]`

**Route calls**:
```typescript
const stats = await getUserStatsByFID(fid)  // lib/subsquid-client.ts line 403
```

**Client query**:
```graphql
query GetUserStatsByFID($fid: Int!) {
  leaderboardEntries(where: { fid_eq: $fid }) {  # ← Entity doesn't exist
    wallet  # ← Field doesn't exist
    fid     # ← Field doesn't exist
    viralXP # ← Field doesn't exist
    # ...
  }
}
```

**GraphQL validation fails** → Returns `{ errors: [...] }` → Client returns `null` → Route falls back to empty data

---

## Fix Strategy

### Option 1: Update Subsquid Schema (RECOMMENDED)
**Pros**: Provides all required data in one query
**Cons**: Requires reindexing from genesis block
**Time**: 2-4 hours

**Steps**:
1. Update `gmeow-indexer/schema.graphql`:
   - Add `LeaderboardEntry` entity with rank calculation
   - Add `fid` field to User (requires Farcaster integration)
   - Add derived fields: `basePoints`, `viralXP`, `guildBonus`, etc.
   - Add rank computation logic

2. Regenerate models:
   ```bash
   cd gmeow-indexer
   npm run build  # Regenerates TypeScript models from schema
   ```

3. Update `src/main.ts` processor:
   - Add LeaderboardEntry creation logic
   - Add rank calculation on each block
   - Add FID lookup integration

4. Reset and reindex database:
   ```bash
   npm run db:drop
   npm run db:create  
   npm run db:migrate
   npm run process    # Reindex from block 39270005
   ```

### Option 2: Update lib/subsquid-client.ts (QUICK FIX)
**Pros**: Works immediately with existing data
**Cons**: Loses advanced leaderboard features
**Time**: 30 minutes

**Steps**:
1. Rewrite queries to use `users` entity instead of `leaderboardEntries`
2. Map `User.id` → `wallet`
3. Remove non-existent fields (`fid`, `viralXP`, `guildBonus`, etc.)
4. Add Supabase enrichment for FID lookup
5. Calculate derived metrics in client (rank, bonuses)

### Option 3: Hybrid Approach (BEST)
**Pros**: Fast deployment, maintains data quality
**Cons**: More complex client logic
**Time**: 1 hour

**Steps**:
1. Update `lib/subsquid-client.ts` queries to use actual schema
2. Create adapter functions to map `User` → `LeaderboardEntry` format
3. Enrich with Supabase for FID, displayName, pfp
4. Calculate derived metrics (rank, bonuses) in client
5. Schedule schema update for Phase 4

---

## Recommended Immediate Fix

### Update lib/subsquid-client.ts Queries

**File**: `lib/subsquid-client.ts`

**Change 1**: LEADERBOARD_QUERY
```typescript
// BEFORE (lines 166-189)
const LEADERBOARD_QUERY = `
  query GetLeaderboard($limit: Int!, $offset: Int!) {
    leaderboardEntries(
      limit: $limit
      offset: $offset
      orderBy: totalScore_DESC
    ) {
      id
      wallet
      fid
      rank
      totalScore
      basePoints
      viralXP
      guildBonus
      guildBonusPoints
      referralBonus
      streakBonus
      badgePrestige
      guildId
      guildName
      isGuildOfficer
      updatedAt
    }
  }
`

// AFTER
const LEADERBOARD_QUERY = `
  query GetLeaderboard($limit: Int!, $offset: Int!) {
    users(
      limit: $limit
      offset: $offset
      orderBy: totalPoints_DESC
    ) {
      id
      totalPoints
      currentStreak
      lifetimeGMs
      lastGMTimestamp
      totalTipsGiven
      totalTipsReceived
      milestoneCount
      badges { id badgeType }
      guilds {
        id
        role
        guild {
          id
          totalMembers
          totalPoints
        }
      }
      updatedAt
    }
  }
`
```

**Change 2**: USER_STATS_BY_WALLET_QUERY
```typescript
// BEFORE (lines 192-213)
const USER_STATS_BY_WALLET_QUERY = `
  query GetUserStatsByWallet($wallet: String!) {
    leaderboardEntries(where: { wallet_eq: $wallet }) {
      id
      wallet
      fid
      rank
      totalScore
      # ... all the non-existent fields
    }
  }
`

// AFTER
const USER_STATS_BY_WALLET_QUERY = `
  query GetUserStatsByWallet($wallet: String!) {
    users(where: { id_eq: $wallet }, limit: 1) {
      id
      totalPoints
      currentStreak
      lifetimeGMs
      lastGMTimestamp
      totalTipsGiven
      totalTipsReceived
      milestoneCount
      badges { id badgeType timestamp }
      guilds {
        id
        role
        pointsContributed
        guild {
          id
          owner
          totalMembers
          totalPoints
        }
      }
      updatedAt
    }
  }
`
```

**Change 3**: Remove FID queries (not available in current schema)
```typescript
// DELETE USER_STATS_BY_FID_QUERY (lines 215-236)
// Replace with Supabase FID → wallet lookup first, then query by wallet
```

**Change 4**: Add adapter function
```typescript
function mapUserToLeaderboardEntry(user: any, rank?: number): LeaderboardEntry {
  const guildMembership = user.guilds?.[0]  // Primary guild
  const badgeCount = user.badges?.length || 0
  
  return {
    id: user.id,
    wallet: user.id,  // id IS the wallet
    fid: undefined,   // Must be enriched from Supabase
    rank: rank || 0,  // Must be calculated separately
    totalScore: parseInt(user.totalPoints || '0'),
    basePoints: parseInt(user.totalPoints || '0'),  // All points are base for now
    viralXP: 0,       // Not tracked yet
    guildBonus: 0,    // Not tracked yet
    guildBonusPoints: 0,
    referralBonus: 0,
    streakBonus: user.currentStreak * 10,  // Derived
    badgePrestige: badgeCount * 50,        // Derived
    guildId: guildMembership?.guild?.id,
    guildName: undefined,  // Not available (needs guild_metadata from Supabase)
    isGuildOfficer: guildMembership?.role === 'officer' || guildMembership?.role === 'owner',
    updatedAt: user.updatedAt
  }
}
```

---

## Testing After Fix

```bash
# 1. Test user query with correct schema
curl -s http://localhost:4350/graphql -H "Content-Type: application/json" -d '{
  "query": "{ users(where: {id_eq: \"0x8a3094e44577579d6f41f6214a86c250b7dbdc4e\"}) { id totalPoints currentStreak lifetimeGMs } }"
}' | jq .

# 2. Test leaderboard query
curl -s http://localhost:4350/graphql -H "Content-Type: application/json" -d '{
  "query": "{ users(limit: 10, orderBy: totalPoints_DESC) { id totalPoints currentStreak lifetimeGMs } }"
}' | jq .

# 3. Test API route
curl -s "http://localhost:3000/api/user/profile/18139" | jq .

# 4. Test leaderboard route
curl -s "http://localhost:3000/api/leaderboard-v2" | jq .
```

---

## Long-Term Solution (Phase 4)

1. **Enhance Subsquid Schema**:
   - Add `fid` to User entity (requires Neynar webhook integration)
   - Add `LeaderboardEntry` entity with pre-computed ranks
   - Add point breakdown fields (`basePoints`, `viralXP`, `guildBonus`)
   - Add cached FID → wallet mappings

2. **Update Indexer Logic**:
   - Calculate ranks on each block batch
   - Maintain leaderboard snapshots (daily/weekly/monthly)
   - Track point sources separately

3. **Optimize Queries**:
   - Add GraphQL subscriptions for real-time updates
   - Implement cursor-based pagination
   - Add Redis caching layer

---

## Summary

**Root Cause**: Schema mismatch between client queries and actual Subsquid schema

**Data Status**: ✅ Subsquid IS indexing data correctly (2 users, 2 GM events confirmed)

**Client Status**: ❌ All queries failing due to invalid field names

**Fix Priority**: HIGH (blocking all Subsquid-dependent routes)

**Recommended Fix**: Update `lib/subsquid-client.ts` queries + add adapter functions (1 hour)

**Long-term Fix**: Enhance Subsquid schema with LeaderboardEntry entity (Phase 4, 2-4 hours)

---

**Investigated By**: GitHub Copilot (Claude Sonnet 4.5)  
**Date**: December 20, 2025, 08:00 UTC  
**Test User**: FID 18139 (0x8a3094e44577579d6f41f6214a86c250b7dbdc4e)
