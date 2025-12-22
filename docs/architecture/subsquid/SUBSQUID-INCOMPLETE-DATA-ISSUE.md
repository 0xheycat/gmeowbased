# 🚨 SUBSQUID INCOMPLETE DATA ISSUE

**Date**: December 20, 2025
**Discovered by**: User testing with address `0x8870c155666809609176260f2b65a626c000d773`

## Problem

### Issue 1: Subsquid Only Has Partial History

**Subsquid Query**:
```graphql
{ users(where: {id_eq: "0x8870c155666809609176260f2b65a626c000d773"}) {
    totalPoints    # Returns: "1"
    lifetimeGMs    # Returns: 1
    gmEvents { timestamp pointsAwarded }  # Returns: 1 event
  }
}
```

**Result**: Only 1 GM event, totalPoints = 1

**Why**: Subsquid indexer started at **block 39270005** (December 10, 2025)
- Missing all user activity BEFORE Dec 10
- User has MUCH more activity in Supabase `gmeow_rank_events` table

### Issue 2: FID Mapping Missing

**API Response**:
```json
{
  "address": "0x8870c155666809609176260f2b65a626c000d773",
  "farcaster_fid": null,   // ❌ Should have FID
  "base_points": 1,        // ❌ Should be ~hundreds or thousands
  "total_score": 1         // ❌ Wrong
}
```

**Why**: 
- `user_profiles.verified_addresses` doesn't contain these wallet addresses
- Hybrid pattern tries to lookup FID, finds nothing, sets null

## Root Cause Analysis

### Subsquid Indexer Configuration

```typescript
// gmeow-indexer/src/processor.ts
processor.setBlockRange({
  from: 39270005  // ⚠️ STARTS FROM DEC 10, 2025
})
```

**Impact**:
- ✅ Correctly indexes NEW events (Dec 10 onwards)
- ❌ Missing ALL historical events (before Dec 10)
- ❌ `User.totalPoints` only reflects post-Dec 10 activity

### Supabase Has Full History

**`gmeow_rank_events` table**:
- Has events dating back to project launch
- Includes GM, Quest, Tip events with `delta` (XP/points awarded)
- Contains wallet_address, fid, event_type, tier_name

**This is the source of truth for historical data!**

## Correct Data Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  HISTORICAL DATA (Before Dec 10, 2025)                      │
├─────────────────────────────────────────────────────────────┤
│  ✅ Supabase: gmeow_rank_events (FULL HISTORY)              │
│     • All GM/Quest/Tip events                               │
│     • SUM(delta) = total points earned                      │
│     • wallet_address → fid mapping                          │
│     • Used for: base_points calculation                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CURRENT DATA (Dec 10, 2025 onwards)                        │
├─────────────────────────────────────────────────────────────┤
│  ✅ Subsquid: On-chain events (REAL-TIME)                   │
│     • GM events from blockchain                             │
│     • Badge mints, guild events                             │
│     • Used for: NEW activity tracking                       │
│     • Eventually: Replace Supabase entirely                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  OFF-CHAIN METADATA (Always)                                │
├─────────────────────────────────────────────────────────────┤
│  ✅ Supabase: user_profiles, badge_casts                    │
│     • FID ↔ wallet mapping                                  │
│     • Viral bonus XP                                        │
│     • Display names, avatars                                │
└─────────────────────────────────────────────────────────────┘
```

## Corrected Hybrid Pattern

### For Leaderboard (TEMPORARY - Until Re-indexing)

```typescript
// ✅ CORRECT: Use Supabase for total points (has full history)
const { data: events } = await supabase
  .from('gmeow_rank_events')
  .select('wallet_address, delta, fid')
  .order('created_at', { ascending: false })

// Aggregate total points per wallet
const walletPoints = new Map()
const walletToFid = new Map()

events?.forEach(event => {
  const addr = event.wallet_address.toLowerCase()
  walletPoints.set(addr, (walletPoints.get(addr) || 0) + (event.delta || 0))
  if (event.fid) walletToFid.set(addr, event.fid)
})

// Convert to leaderboard entries
const data = Array.from(walletPoints.entries())
  .sort((a, b) => b[1] - a[1])  // Sort by points DESC
  .map(([wallet, points], index) => ({
    address: wallet,
    farcaster_fid: walletToFid.get(wallet) || null,
    base_points: points,  // ✅ CORRECT: Full history from Supabase
    total_score: points + viral_bonus,
    global_rank: index + 1,
    // ... calculate level, tier, etc.
  }))
```

### Future: After Re-indexing from Genesis

```typescript
// ✅ IDEAL: Use Subsquid for everything (after re-indexing from block 0)
processor.setBlockRange({
  from: 0  // Start from genesis/deployment block
})

// Then Subsquid will have full history
const rawUsers = await client.getLeaderboard()
// rawUsers[0].totalPoints will be accurate
```

## Immediate Fix Options

### Option 1: **Use Supabase for Base Points** (Quick Fix)

**Pros**:
- Works immediately
- Has full historical data
- No re-indexing required

**Cons**:
- Not using Subsquid for its designed purpose
- Temporary solution

**Implementation**: Update `lib/leaderboard/leaderboard-service.ts` to query `gmeow_rank_events`

### Option 2: **Re-index Subsquid from Genesis** (Proper Fix)

**Pros**:
- Subsquid becomes source of truth
- Future-proof architecture
- Matches documentation

**Cons**:
- Requires finding genesis block number
- Re-indexing takes time (~30-60 min)
- Need to clear PostgreSQL database first

**Implementation**:
```bash
# Find contract deployment block
# Update processor.setBlockRange({ from: <genesis_block> })
cd gmeow-indexer
npx sqd db drop
npx sqd db create
npx sqd db migrate
npx sqd process  # Re-index from genesis
```

### Option 3: **Hybrid Transition** (Balanced)

**Use**:
- Supabase `gmeow_rank_events` for historical points (before Dec 10)
- Subsquid for new events (Dec 10 onwards)
- Merge both sources

**Pros**:
- Accurate data immediately
- Leverages Subsquid for new activity
- Smooth transition path

**Cons**:
- More complex query logic
- Need to merge two data sources

## FID Mapping Fix

**Issue**: `user_profiles.verified_addresses` missing wallets

**Solution**: Populate from `gmeow_rank_events`:

```sql
-- Get all wallet → FID mappings from events
SELECT DISTINCT wallet_address, fid
FROM gmeow_rank_events
WHERE fid IS NOT NULL;

-- Update user_profiles.verified_addresses
-- (Need migration script to add missing wallets)
```

## Recommended Action Plan

1. **Immediate** (Next 30 min):
   - ✅ Use Supabase `gmeow_rank_events` for base_points calculation
   - ✅ Fix FID mapping from events table
   - ✅ Update leaderboard-service.ts

2. **Short-term** (This week):
   - 🔄 Find contract genesis block
   - 🔄 Re-index Subsquid from genesis
   - 🔄 Verify totalPoints matches Supabase totals

3. **Long-term** (Next sprint):
   - 🔄 Deprecate `gmeow_rank_events` for points
   - 🔄 Use Subsquid as single source of truth for on-chain data
   - 🔄 Keep Supabase only for off-chain metadata

---

**Status**: Issue documented, ready for fix implementation
**Priority**: HIGH - Affects all leaderboard/profile endpoints
**Next**: Implement Option 1 (Use Supabase for base points)
