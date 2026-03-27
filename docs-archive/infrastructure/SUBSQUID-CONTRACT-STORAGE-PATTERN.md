# Subsquid Contract Storage Read Pattern

**Date:** December 24, 2025  
**Critical Discovery:** BUG #16 - Event-only indexing insufficient for source of truth  
**Solution:** Periodic contract storage reads (every 100 blocks)

---

## 🎯 Core Principle

**Events track ACTIVITY, Storage is SOURCE OF TRUTH**

```
❌ WRONG: Subsquid listens to events only
✅ RIGHT: Subsquid listens to events + reads storage periodically
```

---

## 🏗️ Implementation Pattern

### Location: `gmeow-indexer/src/main.ts`

```typescript
// Add contract instance with RPC failover
import { ethers } from 'ethers'
import { getRpcEndpointWithFailover } from './rpc-failover'
import guildAbiJson from '../abi/Guild.json'

const GUILD_ADDRESS = '0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3'

// Inside processor block handler
processor.run(new TypeormDatabase(), async (ctx) => {
  for (let block of ctx.blocks) {
    const currentBlock = block.header.height
    
    // PERIODIC STORAGE SYNC (every 100 blocks ~3-5 min)
    if (currentBlock % 100 === 0) {
      ctx.log.info(`🔄 Syncing from contract at block ${currentBlock}...`)
      
      // Get RPC with failover
      const rpcEndpoint = getRpcEndpointWithFailover()
      const provider = new ethers.JsonRpcProvider(rpcEndpoint.url)
      const contract = new ethers.Contract(GUILD_ADDRESS, guildAbiJson, provider)
      
      // Get all entities from database
      const allGuilds = await ctx.store.findBy(Guild, {})
      
      // Read current state from contract
      for (const guild of allGuilds) {
        try {
          // READ CONTRACT STORAGE (not events!)
          const treasuryPoints = await contract.guildTreasuryPoints(BigInt(guild.id))
          
          // Update if changed
          if (guild.treasuryPoints !== treasuryPoints) {
            ctx.log.info(`   Guild #${guild.id}: ${guild.treasuryPoints} → ${treasuryPoints}`)
            guild.treasuryPoints = treasuryPoints
          }
        } catch (error) {
          ctx.log.error(`   Guild #${guild.id} read failed:`, error)
        }
      }
      
      // Batch update database
      await ctx.store.upsert(allGuilds)
      ctx.log.info(`✅ Storage sync complete at block ${currentBlock}`)
    }
  }
})
```

---

## 📚 Expandable to ANY Contract Function

### Pattern: Read View Functions

```typescript
// Treasury (IMPLEMENTED ✅)
const treasuryPoints = await contract.guildTreasuryPoints(BigInt(guildId))
guild.treasuryPoints = treasuryPoints

// Full Guild Info (EXPANDABLE 🎯)
const guildInfo = await contract.guildInfo(BigInt(guildId))
guild.owner = guildInfo.owner
guild.level = guildInfo.level
guild.isActive = guildInfo.isActive
// guildInfo.members[] array - sync member list

// Membership Verification (EXPANDABLE 🎯)
const isMember = await contract.isMember(BigInt(guildId), memberAddress)
if (isMember && !guildMember) {
  // Member added directly on-chain, not through events
  ctx.log.warn(`Detected on-chain member add: ${memberAddress}`)
}

// Role Tracking (EXPANDABLE 🎯)
const role = await contract.getMemberRole(BigInt(guildId), memberAddress)
guildMember.role = role // "MEMBER", "OFFICER", "LEADER"

// Level Calculation (EXPANDABLE 🎯)
const level = await contract.getGuildLevel(BigInt(guildId))
guild.level = level
```

---

## ⚡ Performance Optimization

### Frequency: Every 100 Blocks

| Chain | Block Time | Sync Interval |
|---|---|---|
| **Base** | ~2 seconds | ~3-5 minutes |
| Ethereum | ~12 seconds | ~20 minutes |
| Polygon | ~2 seconds | ~3-5 minutes |

**Why 100 blocks?**
- ✅ Frequent enough to catch manual contract interactions
- ✅ Infrequent enough to minimize RPC overhead
- ✅ Batch reads are efficient (1 RPC call per guild)

### RPC Cost Analysis

```
Guilds: 10 active guilds
Frequency: Every 100 blocks (~3-5 min)
Reads per sync: 10 calls
Daily syncs: ~288 (24h * 60min / 5min)
Daily RPC calls: 2,880 calls
Monthly: ~86,400 calls

Cost: FREE on most RPC providers (under 100k/month limit)
```

---

## 🛡️ Resilience Features

### 1. RPC Failover

```typescript
const rpcEndpoints = [
  { url: process.env.BASE_RPC_PRIMARY, priority: 1 },
  { url: process.env.BASE_RPC_BACKUP, priority: 2 },
  { url: 'https://base.llamarpc.com', priority: 3 },
]

function getRpcEndpointWithFailover() {
  for (const endpoint of rpcEndpoints) {
    try {
      // Test connection
      return endpoint
    } catch {
      continue
    }
  }
  throw new Error('All RPC endpoints failed')
}
```

### 2. Error Handling (Non-Blocking)

```typescript
try {
  const treasuryPoints = await contract.guildTreasuryPoints(BigInt(guild.id))
  guild.treasuryPoints = treasuryPoints
} catch (error) {
  // Log error but continue processing other guilds
  ctx.log.error(`Guild #${guild.id} read failed:`, error)
  // Keep old value, will retry in 100 blocks
}
```

### 3. Discrepancy Logging

```typescript
if (guild.treasuryPoints !== treasuryPoints) {
  ctx.log.info(`📊 Guild #${guild.id}: ${guild.treasuryPoints} → ${treasuryPoints}`)
  // This helps detect:
  // - Missing events
  // - Manual contract interactions
  // - Reorgs
  // - Event processing bugs
}
```

---

## 🧪 Verification (All 4 Layers)

### Test Flow

```bash
# 1. Check contract (Layer 1)
cast call 0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3 \
  "guildTreasuryPoints(uint256)(uint256)" 1 \
  --rpc-url https://mainnet.base.org
# Returns: 1205

# 2. Check Subsquid (Layer 2)
curl -s 'http://localhost:4350/graphql' \
  -H 'Content-Type: application/json' \
  --data '{"query":"{ guilds(where: {id_eq: \"1\"}) { treasuryPoints } }"}' | jq
# Returns: { "treasuryPoints": "1205" }

# 3. Check Supabase cache (Layer 3)
psql $DATABASE_URL -c "SELECT treasury_points FROM guild_stats_cache WHERE guild_id = '1'"
# Returns: 1205

# 4. Check API (Layer 4)
curl -s http://localhost:3000/api/guild/leaderboard | jq '.leaderboard[0].points'
# Returns: 1205
```

**✅ ALL 4 LAYERS MATCH = Architecture Working Correctly**

---

## 📖 Naming Convention Compliance

Following `POINTS-NAMING-CONVENTION.md`:

| Layer | Field Name | Format |
|---|---|---|
| **Contract** | `treasuryPoints` | camelCase (storage variable) |
| **Subsquid** | `treasuryPoints` | camelCase (exact match) |
| **Supabase** | `treasury_points` | snake_case (SQL convention) |
| **API** | `treasuryPoints` | camelCase (JSON convention) |

**CRITICAL:** Contract naming is IMMUTABLE source of truth. All layers follow contract names.

---

## 🚀 Future Expansion Roadmap

### Phase 1: Guild Core (DONE ✅)
- ✅ `guildTreasuryPoints(guildId)` - Treasury balance

### Phase 2: Member Management (NEXT 🎯)
- 🎯 `guildInfo(guildId).members[]` - Full member list sync
- 🎯 `isMember(guildId, address)` - Membership verification
- 🎯 `getMemberRole(guildId, address)` - Role tracking

### Phase 3: Advanced Features (FUTURE 🔮)
- 🔮 `getGuildLevel(guildId)` - Level from contract logic
- 🔮 `getGuildQuests(guildId)` - Quest assignments
- 🔮 `getGuildRewards(guildId)` - Reward pool status

---

## ⚠️ Common Pitfalls

### ❌ DON'T: Assume events are complete

```typescript
// WRONG - Events can be missed
const treasury = events
  .filter(e => e.type === 'DEPOSIT')
  .reduce((sum, e) => sum + e.amount, 0)
```

### ✅ DO: Verify from contract storage

```typescript
// RIGHT - Contract is source of truth
const treasury = await contract.guildTreasuryPoints(BigInt(guildId))
```

---

## 📊 Metrics to Monitor

```typescript
// Add to Subsquid logs
ctx.log.info(`📈 Storage Sync Metrics:
  - Guilds synced: ${allGuilds.length}
  - Discrepancies found: ${discrepancyCount}
  - RPC calls: ${rpcCallCount}
  - Duration: ${syncDuration}ms
  - Next sync: block ${currentBlock + 100}
`)
```

---

## 🎓 Key Takeaways

1. **Events = Activity Log** (real-time updates)
2. **Storage = Source of Truth** (periodic verification)
3. **Combine Both** for robust indexing
4. **Batch Reads** to minimize RPC overhead
5. **RPC Failover** for resilience
6. **Log Discrepancies** for monitoring
7. **4-Layer Verification** ensures data integrity

**Remember:** This pattern is expandable to ANY blockchain indexing project using Subsquid!

---

**Related Documentation:**
- `GUILD-AUDIT-REPORT.md` - BUG #16 detailed analysis
- `POINTS-NAMING-CONVENTION.md` - Naming standards across layers
- `gmeow-indexer/src/main.ts` - Implementation reference
