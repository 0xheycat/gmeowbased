# Route Migration Status

**Date**: December 21, 2025  
**Total Routes**: 149  
**TRUE HYBRID Routes**: 20 (13.4%)

---

## ✅ Migration Completed

### Supabase Client Migration: **100%**
All routes migrated from `@/lib/supabase/server` to `@/lib/supabase/edge`

### TRUE HYBRID Pattern Implementation: **20 routes**

Routes combining **Layer 1 (Subsquid)** + **Layer 2 (Supabase)** + **Layer 3 (Calculated)**:

#### Analytics (3 routes)
- ✅ `/api/analytics/badges` - On-chain mint stats + off-chain distribution
- ✅ `/api/guild/[guildId]/analytics` - Real-time deposits + cached metrics
- ✅ `/api/leaderboard-v2/stats` - Blockchain points + app engagement

#### User Data (6 routes)
- ✅ `/api/user/activity/[fid]` - Multi-wallet on-chain + viral XP
- ✅ `/api/user/badges/[fid]` - On-chain stakes + off-chain metadata
- ✅ `/api/user/quests/[fid]` - Blockchain completions + app tracking
- ✅ `/api/referral/[fid]/stats` - On-chain network + off-chain rewards
- ✅ `/api/referral/activity/[fid]` - On-chain events + app activity
- ✅ `/api/referral/leaderboard` - Network stats + Supabase rankings

#### Viral & Engagement (3 routes)
- ✅ `/api/viral/badge-metrics` - On-chain stakes + performance data
- ✅ `/api/viral/leaderboard` - Multi-source engagement metrics
- ✅ `/api/viral/stats` - Aggregated viral performance

#### Guilds (3 routes)
- ✅ `/api/guild/[guildId]/treasury` - On-chain balance + transactions
- ✅ `/api/guild/[guildId]/member-stats` - Blockchain + app contributions
- ✅ `/api/cron/sync-guilds` - On-chain sync + database updates

#### Quests & Rewards (3 routes)
- ✅ `/api/quests` - On-chain status + off-chain metadata
- ✅ `/api/quests/completions/[questId]` - Blockchain proofs + tracking
- ✅ `/api/rewards/claim` - On-chain eligibility + claim tracking

#### Staking (2 routes)
- ✅ `/api/staking/badges` - On-chain stakes + badge metadata
- ✅ `/api/staking/stakes` - Blockchain positions + performance

---

## 📊 Route Categories

### By Data Source

**Layer 1 Only (Blockchain)**: ~15 routes
- Pure on-chain queries (balances, transactions, events)
- Examples: Contract reads, transaction history

**Layer 2 Only (Database)**: ~95 routes  
- Traditional API routes (user profiles, settings, social)
- Examples: Profile updates, notifications, follows

**Layer 3 (Hybrid)**: 20 routes ✅
- **TRUE HYBRID**: Combines on-chain + off-chain data
- **Examples**: Activity feeds, leaderboards, analytics

**Infrastructure**: ~19 routes
- Webhooks, cron jobs, admin tools
- Examples: Neynar webhooks, sync jobs

---

## 🎯 Next Migration Priorities

### High-Impact Routes (Good Candidates)

1. **Stats Routes** (`/api/stats/*`)
   - Current: Database only
   - Opportunity: Add on-chain point balance verification
   - Impact: Real-time accuracy

2. **Badge Routes** (`/api/badges/*`)
   - Current: Partial hybrid
   - Opportunity: Full on-chain + metadata integration
   - Impact: NFT minting verification

3. **Achievement Routes** (`/api/achievements/*`)
   - Current: Database only
   - Opportunity: On-chain proof of achievements
   - Impact: Trustless verification

4. **Social Routes** (`/api/social/*`)
   - Current: Database only
   - Opportunity: On-chain social graph (if available)
   - Impact: Decentralized relationships

---

## 🚀 Implementation Patterns

### TRUE HYBRID Template

```typescript
export async function GET(request: NextRequest) {
  // LAYER 1: On-chain data from Subsquid
  const onChainData = await getFromSubsquid(address)
  
  // LAYER 2: Off-chain data from Supabase
  const offChainData = await getFromSupabase(fid)
  
  // LAYER 3: Calculate and merge
  const merged = mergeAndCalculate(onChainData, offChainData)
  
  return NextResponse.json({
    success: true,
    data: merged,
    metadata: {
      onChainCount: onChainData.length,
      offChainCount: offChainData.length,
      sources: ['blockchain', 'database']
    }
  })
}
```

### Multi-Wallet Pattern

```typescript
// Get all user's wallets (primary + custody + verified)
const wallets = await getAllWalletsForFID(fid)

// Query blockchain for ALL wallets in parallel
const onChainData = await Promise.all(
  wallets.map(wallet => getPointsTransactions(wallet))
)

// Flatten and merge results
const allActivities = onChainData.flat()
```

---

## ✅ Completed Infrastructure

- ✅ Supabase edge client migration (100%)
- ✅ Multi-wallet caching system
- ✅ Subsquid GraphQL client
- ✅ TRUE HYBRID utilities
- ✅ Cron job automation
- ✅ Error handling patterns
- ✅ Rate limiting
- ✅ Response formatting

---

## 📈 Progress Tracking

**Week 1 (Dec 16-21)**:
- Migrated 20 routes to TRUE HYBRID
- Built multi-wallet infrastructure
- Deployed cron automation
- Created reusable patterns

**Target Week 2**:
- Migrate 10-15 more high-impact routes
- Add filtering/sorting to hybrid routes
- Performance optimization
- Analytics dashboard

---

## 🎉 Success Metrics

Routes with TRUE HYBRID pattern:
- ✅ Show on-chain + off-chain badges in UI
- ✅ Link to blockchain explorer for verification
- ✅ Cache hybrid data appropriately
- ✅ Handle both data sources gracefully
- ✅ Provide metadata about sources

**Achievement**: 13.4% of routes now use TRUE HYBRID pattern, providing trustless, verifiable data while maintaining UX performance!
