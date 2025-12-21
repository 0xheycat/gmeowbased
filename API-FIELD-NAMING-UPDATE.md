# API Field Naming Update - December 20, 2025

## Summary

Updated Subsquid indexer and API responses to use clearer field names that better reflect the underlying smart contract data model and avoid confusion between current balance vs. cumulative statistics.

---

## Changes

### 1. Subsquid Schema (gmeow-indexer/schema.graphql)

**BEFORE** (Confusing - only tracked cumulative GM earnings):
```graphql
type User @entity {
  id: ID!
  totalPoints: BigInt!  # Only cumulative from GMs - NOT actual balance!
}
```

**AFTER** (Clear - tracks both balance and stats):
```graphql
type User @entity {
  id: ID!
  pointsBalance: BigInt!       # Current spendable balance (matches contract pointsBalance)
  totalEarnedFromGMs: BigInt!  # Cumulative earned from GM events only (for stats)
}
```

### 2. API Response Fields

**Leaderboard & Profile APIs** (`/api/leaderboard`, `/api/profile/*`):

```typescript
// API Response Structure
{
  // ✅ PRIMARY FIELD (use this)
  points_balance: number  // Current spendable balance from contract

  // ⚠️ DEPRECATED FIELD (backward compatibility only)
  base_points: number     // Same as points_balance - will be removed in future

  // Other fields (unchanged)
  viral_xp: number
  total_score: number     // Calculated: points_balance + viral_xp + bonuses
  level: number
  rank_tier: string
}
```

**Migration Guide**:
```typescript
// ❌ OLD CODE (still works but deprecated)
const points = response.base_points

// ✅ NEW CODE (recommended)
const points = response.points_balance
```

---

## Why This Change?

### Problem 1: Parameter Swap Bug
- Smart contract emits `GMSent(user, reward, newStreak)` 
- But ABI defines `GMSent(user, streak, pointsEarned)`
- Parameters were swapped causing GM rewards to show 1 instead of 10

**Fix**: Updated indexer to read parameters in correct (swapped) order

### Problem 2: Only Tracked Cumulative GM Earnings
- Old `totalPoints` field only tracked cumulative earnings from GM events
- Did **NOT** match contract's `pointsBalance` (current spendable balance)
- Missing: deposits, withdrawals, quest completions

**Fix**: Added `pointsBalance` field that tracks ALL balance changes

### Problem 3: Confusing Field Names
- API field `base_points` unclear - "base" could mean many things
- Contract uses `pointsBalance` - should match contract naming

**Fix**: 
- Primary field now `points_balance` (matches contract naming)
- Kept `base_points` for backward compatibility (deprecated)

---

## Data Model

```
┌──────────────────────────────────────────────────────────────┐
│ SMART CONTRACT (GmeowCore.sol)                              │
├──────────────────────────────────────────────────────────────┤
│ • pointsBalance[address]  → Current spendable balance       │
│ • userTotalEarned[address] → Lifetime total (never decreases)│
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ SUBSQUID INDEXER (schema.graphql)                           │
├──────────────────────────────────────────────────────────────┤
│ User {                                                       │
│   pointsBalance: BigInt       # Current spendable balance   │
│   totalEarnedFromGMs: BigInt  # Cumulative from GMs only    │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ API RESPONSE (JSON)                                          │
├──────────────────────────────────────────────────────────────┤
│ {                                                            │
│   points_balance: 10020,      # PRIMARY (current balance)   │
│   base_points: 10020,         # DEPRECATED (same value)     │
│   total_score: 10270,         # points_balance + bonuses    │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Balance Tracking

The indexer now tracks ALL balance changes:

```typescript
// Balance Increasing Events
- GMSent event           → +10 points (base reward)
- QuestCompleted event   → +points from quest
- PointsDeposited event  → +deposited amount

// Balance Decreasing Events  
- PointsWithdrawn event  → -withdrawn amount

// Statistics Only (doesn't affect balance)
- totalEarnedFromGMs     → Cumulative from GM events (never decreases)
```

**Example Flow**:
```
1. User deposits 10,000 points
   → pointsBalance = 10,000
   → totalEarnedFromGMs = 0

2. User sends 2 GMs (10 points each)
   → pointsBalance = 10,020 (current balance)
   → totalEarnedFromGMs = 20 (stats only)

3. User withdraws 5,000 points
   → pointsBalance = 5,020 (current balance decreased)
   → totalEarnedFromGMs = 20 (stats unchanged)
```

---

## GraphQL Query Examples

**Query Current Balance**:
```graphql
query GetUserBalance($wallet: String!) {
  users(where: { id_eq: $wallet }) {
    id
    pointsBalance         # Current spendable balance
    totalEarnedFromGMs    # Cumulative GM rewards (for stats)
    currentStreak
    lifetimeGMs
  }
}
```

**Query Leaderboard by Balance**:
```graphql
query GetTopUsers {
  users(
    limit: 10
    orderBy: pointsBalance_DESC
  ) {
    id
    pointsBalance
    currentStreak
  }
}
```

---

## API Endpoints Updated

| Endpoint | Status | Changes |
|----------|--------|---------|
| `GET /api/leaderboard` | ✅ Updated | Returns both `points_balance` and `base_points` (deprecated) |
| `GET /api/profile/{wallet}` | ✅ Updated | Returns both fields |
| `POST /api/frame` | ✅ Updated | Leaderboard frames use new data |
| GraphQL endpoint (port 4350) | ✅ Updated | Schema uses `pointsBalance` and `totalEarnedFromGMs` |

---

## Database Migration

**Status**: ✅ Completed December 20, 2025

- Database reset and re-indexed from block 39,270,005
- All historical data re-processed with correct field names
- Indexer caught up to latest block (39,728,025)

---

## Testing

**Verified Results**:
```json
// Query: users with GM activity
{
  "users": [
    {
      "id": "0x8870c155666809609176260f2b65a626c000d773",
      "pointsBalance": "10020",        // ✅ Current balance (10000 deposit + 20 from GMs)
      "totalEarnedFromGMs": "20",      // ✅ Cumulative from 2 GMs
      "lifetimeGMs": 2,
      "currentStreak": 1
    },
    {
      "id": "0x8a3094e44577579d6f41f6214a86c250b7dbdc4e",
      "pointsBalance": "10",           // ✅ Balance from 1 GM only
      "totalEarnedFromGMs": "10",      // ✅ Cumulative from 1 GM
      "lifetimeGMs": 1,
      "currentStreak": 1
    }
  ]
}
```

---

## Backward Compatibility

✅ **Fully Backward Compatible**

- API still returns `base_points` field (same value as `points_balance`)
- Existing frontend code will continue to work
- No breaking changes

**Deprecation Timeline**:
- **Now**: Both fields returned (`points_balance` + `base_points`)
- **Future**: `base_points` marked as deprecated in docs
- **Later**: Remove `base_points` after grace period (TBD)

---

## Updated Documentation

| Document | Status | Notes |
|----------|--------|-------|
| `COMPLETE-CALCULATION-SYSTEM.md` | ✅ Updated | All references updated to new field names |
| `lib/leaderboard/leaderboard-service.ts` | ✅ Updated | Returns both fields with comments |
| `lib/subsquid-client.ts` | ✅ Updated | Queries use new field names |
| `gmeow-indexer/schema.graphql` | ✅ Updated | Schema defines both fields |
| `gmeow-indexer/src/main.ts` | ✅ Updated | All event handlers updated |

---

## Questions?

**Q: Why both `pointsBalance` and `totalEarnedFromGMs`?**  
A: Different purposes:
- `pointsBalance` = Current spendable balance (can go up or down)
- `totalEarnedFromGMs` = Historical stats for leaderboards (only goes up)

**Q: Do I need to change my frontend code?**  
A: Not immediately. Both fields returned. But migrate to `points_balance` when convenient.

**Q: What about the parameter swap bug?**  
A: Fixed in indexer. GM rewards now correctly show 10 points instead of 1.

**Q: Is the database migration complete?**  
A: Yes. All historical data re-indexed with correct values.

---

## Technical Details

**Files Changed**:
```
gmeow-indexer/
  ├── schema.graphql              # Schema updated
  ├── src/main.ts                 # Event handlers updated
  └── src/processor.ts            # Unchanged

lib/
  ├── subsquid-client.ts          # Queries updated
  └── leaderboard/
      └── leaderboard-service.ts  # Response format updated

docs/
  └── COMPLETE-CALCULATION-SYSTEM.md  # Documentation updated
```

**Indexer Status**:
- Running on port 4350 (GraphQL)
- Processing blocks in real-time
- All historical data correct

**Contract**:
- Address: 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73
- No changes to contract (cannot change deployed contract)
- Bug was in indexer parameter reading, not contract
