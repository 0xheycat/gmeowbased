# 📋 Route Migration Checklist (Updated Dec 22, 2025)

## Before Migrating Any Route, You MUST:

### 1. Read Documentation

**Primary References:**

- ✅ **SUBSQUID-LAYER-1-COMPLIANCE-V2.md** - Complete 3-layer architecture (actual contract events, corrected schemas)
- ✅ **LAYER-1-AUDIT-SUMMARY.md** - Executive summary (9 violations found, migration scripts)
- ✅ **SUBSQUID-LAYER-1-AUDIT-FINDINGS.md** - Detailed audit findings (contract ABIs, Supabase violations, function naming)
- ✅ **MULTI-WALLET-CACHE-ARCHITECTURE.md** - Multi-wallet cache system (3-layer sync, 99% hit rate) **← UPDATE #1**
- ✅ **UNIFIED-CALCULATION-BUG-FIXES-DEC-20-2025.md** - Bug fixes + 6 new functions (formatters, gamification) **← UPDATE #2**
- ✅ **HYBRID-IMPLEMENTATION-COMPLETE-PLAN.md** - Data source mapping
- ✅ **INFRASTRUCTURE-USAGE-QUICK-REF.md** - lib/ infrastructure patterns
- ✅ **COMPLETE-CALCULATION-SYSTEM.md** - 3-layer calculation architecture
- ✅ **UNIFIED-CALCULATOR-MIGRATION.md** - Unified calculator API

---

## 🔥 NEW: Key Infrastructure Updates (Dec 22, 2025)

### **UPDATE #1: Multi-Wallet Cache System**
- **What**: Auto-sync all verified wallets (custody + verified addresses) from Neynar
- **How**: `useWallets()` hook returns array of all user wallets from AuthContext
- **Why**: Aggregate on-chain activity across all wallets (99% cache hit rate, 3x faster)
- **Usage**: `const wallets = useWallets()` → `["0x7539...", "0x8a30...", "0x07fc..."]`
- **Impact**: Multi-wallet scanning for accurate points/badges/activity aggregation

### **UPDATE #2: Unified Calculator Enhancements**
- **What**: 6 new functions for viral engagement & display formatting
- **Critical**: `calculateIncrementalBonus()` - Prevents viral double-rewards (only NEW engagement)
- **Gamification**: `estimateNextTier()` - Shows "1 more recast to Popular tier"
- **Formatters**: `formatMemberAge()` ("3 months"), `formatLastActive()` ("2 hours ago"), `getMemberAgeDays()` (82)
- **Impact**: Accurate viral XP calculation + better UX with formatted dates

---

### 2. Identify Data Sources (3-Layer Architecture)

#### **Layer 1 (Subsquid): On-Chain Blockchain Data**

**Deployed Contracts (Base Mainnet, Block 39,236,809):**

```json
{
  "core": "0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73",
  "guild": "0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3",
  "nft": "0xCE9596a992e38c5fa2d997ea916a277E0F652D5C",
  "badge": "0x5Af50Ee323C45564d94B0869d95698D837c59aD2",
  "referral": "0x9E7c32C1fB3a2c08e973185181512a442b90Ba44"
}
```

**What to Query:**

- `User.pointsBalance` (NOT totalXP) - Current spendable balance
- `User.totalEarnedFromGMs` - Cumulative GM rewards
- `User.currentStreak`, `lifetimeGMs` - Streak data
- `GMEvent`, `PointsTransaction` - Event history
- `BadgeStake`, `QuestCompletion` - On-chain completions
- Guild deposits, referral events, tip events

**Available Functions (⚠️ Some names confusing, see audit):**

```typescript
// ⚠️ CONFUSING NAMES (use with caution):
getLeaderboardEntry(wallet)     // ⚠️ Misleading name (returns raw on-chain data, NOT ranking)
getLeaderboard(limit, offset)   // ⚠️ Misleading name (returns raw users, NOT ranked leaderboard)
getGMEvents(fid, since)         // ⚠️ FID not indexed (requires wallet, not FID)

// ✅ CLEAR NAMES (recommended):
getOnChainUserStats(wallet)     // ← Recommended replacement for getLeaderboardEntry()
getTopUsersByPoints(limit)      // ← Recommended replacement for getLeaderboard()
getGMEventsByWallet(wallet)     // ← Recommended replacement for getGMEvents()

// Other functions:
getPointsTransactions(user, options?)
getBadgeStakes(user, options?)
getQuestCompletions(options?)
```

**⚠️ CRITICAL NOTES:**

- FID queries NOT supported in Subsquid (resolve FID → wallet via Supabase first)
- Function naming audit found 5 confusing names (see SUBSQUID-LAYER-1-AUDIT-FINDINGS.md)
- Use recommended new function names for clarity

**🔥 UPDATE #1: Multi-Wallet Scanning Pattern**

```typescript
import { useWallets } from '@/lib/contexts/AuthContext'

// Get ALL wallets for authenticated user (custody + verified addresses)
const wallets = useWallets()  // ["0x7539...", "0x8a30...", "0x07fc..."]

// Aggregate on-chain activity across all wallets
const activities = await Promise.all(
  wallets.map(wallet => getPointsTransactions(wallet))
)
const totalActivity = activities.flat()

// For server-side routes (not React components):
const allWallets = [
  profile.wallet_address,
  profile.custody_address,
  ...(profile.verified_addresses || [])
].filter(Boolean)
```

**Why**: Users may have points/badges/GMs across multiple wallets (custody + verified)  
**Performance**: 3-layer sync (real-time < 200ms, on-demand, batch cron every 6hrs) = 99% cache hit

---

#### **Layer 2 (Supabase): Off-Chain Application Data**

**✅ CORRECT Tables (off-chain metadata only):**

```typescript
// Identity mapping
user_profiles {
  fid, wallet_address, username, display_name, pfp_url, 
  verified_addresses,  // ← Array of all verified wallets (UPDATE #1)
  custody_address      // ← Primary custody wallet (UPDATE #1)
}

// Viral engagement (off-chain calculation)
badge_casts {
  fid, cast_hash, viral_bonus_xp, viral_score, engagement_count
}

// Quest social proofs (off-chain verification) ← NEW TABLE
quest_social_proofs {
  fid, quest_id, verification_proof, verified_at
}

// Quest progress tracking (off-chain)
user_quest_progress {
  fid, quest_id, progress, completed, completed_at
}

// Referral stats (aggregated off-chain)
referral_stats {
  fid, total_referrals, total_rewards, last_referral_at
}

// Guild metadata (off-chain descriptions)
guild_metadata {
  guild_id, name, description, avatar_url
}

// Badge metadata (off-chain descriptions) ← RENAMED
badge_metadata {
  badge_id, name, description, image_url, metadata
}

// Viral bonuses (off-chain Layer 2 only) ← RENAMED
user_viral_bonuses {
  fid, viral_xp, guild_bonus, last_synced_at
}

// Notification preferences
notification_preferences {
  fid, badge_mints, quest_completions, viral_milestones, priority_settings
}
```

**❌ TABLES TO AVOID (redundant on-chain data):**

```typescript
// ❌ points_transactions → Use getPointsTransactions() from Subsquid instead
// ❌ quest_completions → Use getQuestCompletions() from Subsquid instead
// ❌ user_points_balances.base_points → Use User.pointsBalance from Subsquid instead
// ❌ user_badges (on-chain fields) → Use getBadgeStakes() from Subsquid instead
```

**Migration Status:** 4 table violations found, migration scripts in LAYER-1-AUDIT-SUMMARY.md

---

#### **Layer 3 (Calculated): Derived Metrics - USE UNIFIED CALCULATOR**

```typescript
import {
  // Complete profile stats (all layers combined)
  calculateCompleteStats,
  
  // Level progression
  calculateLevelProgress,     // Level from total score
  
  // Rank tiers
  getRankTierByPoints,        // Rank tier from total score
  
  // Viral engagement
  calculateEngagementScore,   // Viral engagement scoring
  calculateIncrementalBonus,  // 🔥 UPDATE #2: Prevent viral double-rewards
  estimateNextTier,           // 🔥 UPDATE #2: Gamification helper
  
  // Display formatters
  formatPoints,               // Display formatting (1234 → "1.2k")
  formatNumber,               // Number formatting (1000000 → "1.0M")
  formatXP,                   // XP/Points formatting (567 → "567 XP")
  formatMemberAge,            // 🔥 UPDATE #2: "15 days", "3 months", "1 year"
  formatLastActive,           // 🔥 UPDATE #2: "Just now", "2 hours ago", "Inactive"
  getMemberAgeDays,           // 🔥 UPDATE #2: Account age in days
} from '@/lib/scoring/unified-calculator'
```

**🔥 UPDATE #2: New Functions Usage**

```typescript
// 1. Prevent viral double-rewards (CRITICAL for webhooks)
const previousMetrics = { likes: 10, recasts: 2, replies: 1 }
const currentMetrics = { likes: 25, recasts: 5, replies: 3 }
const incrementalXP = calculateIncrementalBonus(currentMetrics, previousMetrics)
// Returns: 400 XP (only NEW engagement: +15 likes, +3 recasts, +2 replies)

// 2. Gamification helper (show progress to next tier)
const estimate = estimateNextTier(15, getViralTier(15))
// { nextTier: 'Popular', scoreNeeded: 5, suggestedEngagement: "1 more recast" }

// 3. Display formatters (better UX)
formatMemberAge("2024-10-01T00:00:00Z")  // "3 months"
formatLastActive("2025-12-22T10:00:00Z") // "2 hours ago"
getMemberAgeDays("2024-10-01T00:00:00Z") // 82
```

**⚠️ DO NOT USE DEPRECATED FILES:**

- ❌ `rank.ts` (deprecated Dec 20, 2025)
- ❌ `viral-bonus.ts` (deprecated Dec 20, 2025)
- ❌ `stats-calculator.ts` (deprecated Dec 20, 2025)

---

### 3. Check Available Functions

```bash
# Layer 1: Subsquid (On-Chain)
grep "^export async function" lib/subsquid-client.ts

# Layer 2: Supabase Tables (Off-Chain)
mcp_supabase_list_tables

# Layer 3: Calculations (Unified Calculator ONLY)
grep "^export" lib/scoring/unified-calculator.ts
```

---

### 4. Implement ALL Three Layers

```typescript
import { getOnChainUserStats } from '@/lib/subsquid-client'  // ✅ RECOMMENDED (not getLeaderboardEntry)
import { createClient } from '@/lib/supabase/edge'
import { 
  calculateCompleteStats,
  calculateIncrementalBonus,  // 🔥 UPDATE #2
  formatMemberAge,            // 🔥 UPDATE #2
  formatLastActive,           // 🔥 UPDATE #2
} from '@/lib/scoring/unified-calculator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fid = Number(searchParams.get('fid'))
  
  // Layer 2: Get wallet addresses from FID (Subsquid doesn't index by FID)
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('wallet_address, verified_addresses, custody_address, fid, username, created_at, last_active_at')
    .eq('fid', fid)
    .single()
  
  if (!profile?.wallet_address) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // 🔥 UPDATE #1: Multi-wallet aggregation
  const allWallets = [
    profile.wallet_address,
    profile.custody_address,
    ...(profile.verified_addresses || [])
  ].filter(Boolean)
  
  // Layer 1: Aggregate on-chain data across ALL wallets
  const onChainData = await Promise.all(
    allWallets.map(wallet => getOnChainUserStats(wallet))
  )
  
  const aggregatedOnChain = {
    pointsBalance: onChainData.reduce((sum, d) => sum + (d?.pointsBalance || 0), 0),
    currentStreak: Math.max(...onChainData.map(d => d?.currentStreak || 0)),
    lifetimeGMs: onChainData.reduce((sum, d) => sum + (d?.lifetimeGMs || 0), 0),
  }
  
  // Layer 2: Get off-chain viral XP
  const { data: viralBonuses } = await supabase
    .from('user_viral_bonuses')  // ✅ RENAMED TABLE
    .select('viral_xp, guild_bonus')
    .eq('fid', fid)
    .single()
  
  // ❌ DO NOT query points_transactions table (use Subsquid instead)
  
  // Layer 3: Calculate derived metrics (unified-calculator.ts ONLY)
  const stats = calculateCompleteStats({
    blockchainPoints: aggregatedOnChain.pointsBalance,
    viralXP: viralBonuses?.viral_xp || 0,
    questPoints: 0,
    guildPoints: viralBonuses?.guild_bonus || 0,
    referralPoints: 0,
    currentStreak: aggregatedOnChain.currentStreak,
    lifetimeGMs: aggregatedOnChain.lifetimeGMs,
    lastGMTimestamp: null,
  })
  
  return NextResponse.json({
    ok: true,
    data: {
      // Identity
      fid: profile.fid,
      username: profile.username,
      wallet: profile.wallet_address,
      allWallets,  // 🔥 UPDATE #1
      
      // Layer 1: On-chain (aggregated across wallets)
      onChain: {
        pointsBalance: aggregatedOnChain.pointsBalance,
        currentStreak: aggregatedOnChain.currentStreak,
        lifetimeGMs: aggregatedOnChain.lifetimeGMs,
      },
      
      // Layer 2: Off-chain
      offChain: {
        viralXP: viralBonuses?.viral_xp || 0,
        guildBonus: viralBonuses?.guild_bonus || 0,
      },
      
      // Layer 3: Calculated
      calculated: {
        level: stats.level.level,
        levelProgress: stats.level.levelPercent,
        rankTier: stats.rank.currentTier.name,
        totalScore: stats.scores.total,
      },
      
      // 🔥 UPDATE #2: Display formatters
      display: {
        memberAge: formatMemberAge(profile.created_at),      // "3 months"
        lastActive: formatLastActive(profile.last_active_at), // "2 hours ago"
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
      multiWallet: {
        enabled: true,
        walletCount: allWallets.length,  // 🔥 UPDATE #1
      },
      timestamp: new Date().toISOString(),
    },
  })
}
```

---

### 5. Use lib/ Infrastructure (MANDATORY)

```typescript
import { getCached } from '@/lib/cache'
import { apiLimiter, strictLimiter } from '@/lib/middleware/rate-limiter'
import { FIDSchema, AddressSchema } from '@/lib/validation/api-schemas'
import { createClient } from '@/lib/supabase/edge'
import { createErrorResponse } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'
```

**Caching Strategy:**

- User data: 1-2 minutes (stale-while-revalidate)
- Leaderboard: 2-5 minutes
- Analytics: 5-10 minutes

**Rate Limiting:**

- Standard APIs: 100 requests/min (`apiLimiter`)
- Critical endpoints: 10 requests/min (`strictLimiter`)

---

### 6. Verify Hybrid Pattern Compliance

**✅ Pre-Migration Checklist:**

- [ ] Uses Subsquid for on-chain data (Layer 1)
- [ ] Queries actual deployed contracts (see contract addresses above)
- [ ] Uses recommended function names (`getOnChainUserStats`, not `getLeaderboardEntry`)
- [ ] Resolves FID → wallet via Supabase first (Subsquid doesn't index FID)
- [ ] **🔥 UPDATE #1:** Uses multi-wallet aggregation (`allWallets` array)
- [ ] Uses Supabase for off-chain data (Layer 2)
- [ ] Queries correct tables (`user_profiles`, `badge_casts`, `user_viral_bonuses`, etc.)
- [ ] Avoids redundant tables (no `points_transactions`, `quest_completions` full data)
- [ ] Uses renamed tables (`user_viral_bonuses`, `badge_metadata`, `quest_social_proofs`)
- [ ] Uses `unified-calculator.ts` for ALL calculations (Layer 3)
- [ ] Imports from `unified-calculator.ts`
- [ ] Does NOT import from deprecated files (`rank.ts`, `viral-bonus.ts`, `stats-calculator.ts`)
- [ ] **🔥 UPDATE #2:** Uses new functions (`calculateIncrementalBonus`, `formatMemberAge`, etc.)
- [ ] Uses lib/ infrastructure (no inline code)
- [ ] Caching, rate limiting, validation, error handling
- [ ] 0 TypeScript errors
- [ ] Response includes `metadata.sources { subsquid, supabase, calculated }`
- [ ] Response field names match frontend component interface
- [ ] Uses `pointsBalance` (NOT `totalXP`) - correct Subsquid field name
- [ ] **🔥 UPDATE #1:** Multi-wallet metadata included (`metadata.multiWallet.walletCount`)

---

### 7. Post-Migration Verification

```bash
# Run TypeScript check
npm run type-check

# Test endpoint locally
curl http://localhost:3000/api/your-endpoint?fid=18139

# Verify response includes all 3 layers
# Expected: metadata.sources { subsquid: true, supabase: true, calculated: true }

# 🔥 UPDATE #1: Check multi-wallet aggregation
# Expected: metadata.multiWallet { enabled: true, walletCount: 3 }
# Expected console: "[AuthProvider] Cached 3 wallets for FID 18139"

# Check console for Layer 1 compliance warnings
# Watch for: "[getLeaderboardEntry] FID not supported" (if using old function names)
```

---

## 📚 Quick Reference

| Category | Documentation | Status |
|----------|--------------|--------|
| Contract Events | SUBSQUID-LAYER-1-COMPLIANCE-V2.md | ✅ Audited (~50 events) |
| Supabase Tables | LAYER-1-AUDIT-SUMMARY.md | ⚠️ 4 violations found |
| Function Naming | SUBSQUID-LAYER-1-AUDIT-FINDINGS.md | ⚠️ 5 confusing names |
| **Multi-Wallet Cache** | **MULTI-WALLET-CACHE-ARCHITECTURE.md** | **✅ UPDATE #1: 100% complete** |
| **Unified Calculator** | **UNIFIED-CALCULATION-BUG-FIXES-DEC-20-2025.md** | **✅ UPDATE #2: Bug fixes + 6 new functions** |
| 3-Layer Architecture | COMPLETE-CALCULATION-SYSTEM.md | ✅ Complete |
| Migration Scripts | LAYER-1-AUDIT-SUMMARY.md | ✅ SQL scripts ready |

**Migration Scripts Available:** See LAYER-1-AUDIT-SUMMARY.md for Supabase table cleanup SQL
