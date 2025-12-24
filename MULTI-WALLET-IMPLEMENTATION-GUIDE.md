# Multi-Wallet Implementation Guide

**Status:** Infrastructure Ready | Implementation Deferred to Future Phase  
**Last Updated:** December 23, 2025  
**Related:** MULTI-WALLET-CACHE-ARCHITECTURE.md

## Overview

The multi-wallet infrastructure is complete (cachedWallets in AuthContext), but implementation across the codebase is deferred. This guide documents the patterns for when multi-wallet support is activated.

## Current State

### ✅ Infrastructure Complete
- AuthContext provides `cachedWallets[]` array
- Neynar API syncs verified addresses
- Database stores `verified_addresses` in user_profiles
- React hook: `useWallets()` available
- 3-layer sync system operational

### 🔵 Implementation Deferred
- Activity feed aggregation
- Quest completion checks across all wallets
- Transaction scanning across multiple addresses
- Multi-wallet points aggregation

## Implementation Patterns

### Pattern 1: Activity Aggregation

**Current (Single Wallet):**
```typescript
// lib/profile/activity-service.ts
export async function getUserActivity(fid: number) {
  const profile = await getUserProfile(fid)
  const transactions = await getPointsTransactions(profile.wallet_address)
  return transactions
}
```

**Multi-Wallet Pattern:**
```typescript
// Future implementation
export async function getUserActivity(fid: number) {
  const profile = await getUserProfile(fid)
  const wallets = profile.verified_addresses || [profile.wallet_address]
  
  // Parallel scan all wallets
  const allTransactions = await Promise.all(
    wallets.map(wallet => getPointsTransactions(wallet))
  )
  
  // Merge and deduplicate
  const merged = allTransactions.flat()
  const deduplicated = deduplicateByTxHash(merged)
  
  // Sort by timestamp
  return deduplicated.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

function deduplicateByTxHash(transactions: Transaction[]) {
  const seen = new Set<string>()
  return transactions.filter(tx => {
    if (seen.has(tx.hash)) return false
    seen.add(tx.hash)
    return true
  })
}
```

### Pattern 2: Quest Completion Check

**Current (Single Wallet):**
```typescript
// lib/quests/verification.ts
export async function hasCompletedQuest(fid: number, questId: string) {
  const profile = await getUserProfile(fid)
  return checkWalletCompletion(profile.wallet_address, questId)
}
```

**Multi-Wallet Pattern:**
```typescript
// Future: Any verified wallet can complete quest
export async function hasCompletedQuest(fid: number, questId: string) {
  const profile = await getUserProfile(fid)
  const wallets = profile.verified_addresses || [profile.wallet_address]
  
  // Check if ANY wallet completed the quest
  const completions = await Promise.all(
    wallets.map(wallet => checkWalletCompletion(wallet, questId))
  )
  
  return completions.some(completed => completed === true)
}
```

### Pattern 3: Transaction History

**Current (Single Wallet):**
```typescript
// app/api/activity/[fid]/route.ts
export async function GET(req: Request, { params }: { params: { fid: string } }) {
  const fid = parseInt(params.fid)
  const profile = await getUserProfile(fid)
  
  const transactions = await db
    .from('points_transactions')
    .select('*')
    .eq('wallet_address', profile.wallet_address)
    .order('created_at', { ascending: false })
  
  return Response.json(transactions)
}
```

**Multi-Wallet Pattern:**
```typescript
// Future: Aggregate from all wallets
export async function GET(req: Request, { params }: { params: { fid: string } }) {
  const fid = parseInt(params.fid)
  const profile = await getUserProfile(fid)
  const wallets = profile.verified_addresses || [profile.wallet_address]
  
  // Query all wallets in single query using IN clause
  const transactions = await db
    .from('points_transactions')
    .select('*')
    .in('wallet_address', wallets)
    .order('created_at', { ascending: false })
  
  return Response.json({
    fid,
    wallets_scanned: wallets.length,
    transactions
  })
}
```

### Pattern 4: Component Hook Usage

**Current (Single Wallet):**
```typescript
// components/activity/ActivityFeed.tsx
export function ActivityFeed({ fid }: { fid: number }) {
  const [activities, setActivities] = useState([])
  
  useEffect(() => {
    fetch(`/api/activity/${fid}`)
      .then(res => res.json())
      .then(data => setActivities(data))
  }, [fid])
  
  return <ActivityList items={activities} />
}
```

**Multi-Wallet Pattern:**
```typescript
// Future: Use cached wallets for instant access
export function ActivityFeed({ fid }: { fid: number }) {
  const { cachedWallets } = useAuthContext()
  const [activities, setActivities] = useState([])
  
  useEffect(() => {
    fetch(`/api/activity/${fid}`)
      .then(res => res.json())
      .then(data => setActivities(data))
  }, [fid])
  
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-4">
        Tracking {cachedWallets.length} wallet{cachedWallets.length !== 1 ? 's' : ''}
      </div>
      <ActivityList items={activities} />
    </div>
  )
}
```

## Performance Considerations

### Parallel Processing
```typescript
// ✅ GOOD: Parallel Promise.all()
const results = await Promise.all(
  wallets.map(w => fetchData(w))
)

// ❌ BAD: Sequential await in loop
for (const wallet of wallets) {
  const data = await fetchData(wallet)  // Blocks each iteration
}
```

### Query Optimization
```typescript
// ✅ GOOD: Single query with IN clause
const txs = await db
  .from('transactions')
  .select('*')
  .in('wallet_address', wallets)

// ❌ BAD: Multiple queries
const txs = []
for (const wallet of wallets) {
  const data = await db
    .from('transactions')
    .select('*')
    .eq('wallet_address', wallet)
  txs.push(...data)
}
```

### Caching Strategy
```typescript
// Use React Query for multi-wallet data
const { data: activities } = useQuery({
  queryKey: ['activities', fid, cachedWallets],
  queryFn: () => fetchMultiWalletActivities(fid),
  staleTime: 60000, // 1 minute
  cacheTime: 300000, // 5 minutes
})
```

## Database Schema Support

### Current Schema (Ready for Multi-Wallet)
```sql
-- user_profiles.verified_addresses already supports multiple wallets
CREATE TABLE user_profiles (
  fid BIGINT PRIMARY KEY,
  wallet_address TEXT,  -- Primary wallet
  custody_address TEXT, -- Farcaster custody
  verified_addresses TEXT[], -- Multi-wallet array ✅
  ...
);

-- Points are indexed by FID, not wallet ✅
CREATE TABLE user_points_balances (
  fid BIGINT PRIMARY KEY,  -- One record per user
  points_balance BIGINT,
  viral_points BIGINT,
  guild_points_awarded BIGINT,
  total_score BIGINT GENERATED ALWAYS AS (
    points_balance + viral_points + guild_points_awarded
  ) STORED,
  ...
);

-- Transactions can reference any wallet
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY,
  fid BIGINT REFERENCES user_profiles(fid),
  wallet_address TEXT,  -- Which wallet made transaction
  amount BIGINT,
  ...
);
```

## Migration Checklist

When implementing multi-wallet support:

### Phase 1: Read Operations (Safe)
- [ ] Update activity feeds to scan all wallets
- [ ] Update transaction history API
- [ ] Update quest completion checks
- [ ] Add wallet count indicators to UI
- [ ] Test with users who have 2+ verified wallets

### Phase 2: Write Operations (Careful)
- [ ] Ensure transactions record source wallet
- [ ] Update quest completion to handle multi-wallet
- [ ] Add wallet selection UI for transactions
- [ ] Implement wallet priority (primary vs verified)

### Phase 3: Optimization
- [ ] Add database indexes for wallet arrays
- [ ] Implement query result caching
- [ ] Add parallel request batching
- [ ] Monitor API performance

## Testing Strategy

### Test Cases
```typescript
describe('Multi-Wallet Support', () => {
  it('aggregates activities from all verified wallets', async () => {
    const user = await createTestUser({
      fid: 12345,
      verified_addresses: [
        '0xprimary...',
        '0xverified1...',
        '0xverified2...'
      ]
    })
    
    // Create transactions from different wallets
    await createTransaction({ fid: 12345, wallet: '0xprimary...', amount: 100 })
    await createTransaction({ fid: 12345, wallet: '0xverified1...', amount: 50 })
    
    const activities = await getUserActivity(12345)
    
    expect(activities).toHaveLength(2)
    expect(activities[0].amount + activities[1].amount).toBe(150)
  })
  
  it('deduplicates transactions by hash', async () => {
    // Test that same transaction from multiple sources isn't counted twice
  })
  
  it('falls back to primary wallet if verified_addresses is null', async () => {
    // Test backward compatibility
  })
})
```

## API Response Format

### Current Format
```json
{
  "fid": 18139,
  "wallet_address": "0x7539...",
  "activities": [...]
}
```

### Future Multi-Wallet Format
```json
{
  "fid": 18139,
  "primary_wallet": "0x7539...",
  "verified_wallets": [
    "0x7539...",
    "0x8a30...",
    "0x07fc..."
  ],
  "wallets_scanned": 3,
  "activities": [
    {
      "id": "...",
      "wallet_address": "0x8a30...",
      "amount": 100,
      "timestamp": "..."
    }
  ],
  "aggregated_stats": {
    "total_transactions": 25,
    "total_points_earned": 5000
  }
}
```

## Naming Convention

**Field Names:**
- `cachedWallets` - React state array
- `verified_addresses` - Database column (PostgreSQL TEXT[])
- `wallet_address` - Primary wallet (legacy single wallet)
- `custody_address` - Farcaster custody wallet

**Functions:**
- `useWallets()` - React hook
- `getAllWalletsForFID()` - Database query
- `syncWalletsFromNeynar()` - API sync

## Related Documentation

- [MULTI-WALLET-CACHE-ARCHITECTURE.md](./MULTI-WALLET-CACHE-ARCHITECTURE.md) - Infrastructure details
- [POINTS-NAMING-CONVENTION.md](./POINTS-NAMING-CONVENTION.md) - Field naming standards
- AuthContext implementation: `contexts/AuthContext.tsx`
- Neynar sync: `lib/integrations/neynar-wallet-sync.ts`

## Future Considerations

### V2 API Design
When removing backward-compat aliases (V2 API), consider:
- Always return wallet arrays (never single wallet_address)
- Include source wallet in all transaction responses
- Aggregate stats by wallet and total
- Provide wallet metadata (custody, verified, primary)

### Smart Contract Integration
- Future contract upgrades may track balances per wallet
- Current: Balances by FID (user identity)
- Consider: Hybrid model with wallet-level + FID-level tracking

### Privacy
- Users may want to hide certain verified wallets
- Add wallet_visibility settings in future
- Allow users to designate "active" wallets for point tracking

---

**Implementation Status:** Deferred to Phase 4  
**Infrastructure Status:** Complete and Ready  
**Next Step:** Activate when user demand requires multi-wallet activity tracking
