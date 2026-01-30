# Frontend Integration Guide: On-Chain Scoring System

## Overview
This guide covers updating the frontend to use on-chain scoring data from the deployed ScoringModule contract instead of the off-chain unified-calculator.

## 1. Update Contract Addresses

**File**: `lib/contracts/addresses.ts`

```typescript
// Add after deployment
export const SCORING_MODULE_ADDRESS = process.env.NEXT_PUBLIC_SCORING_MODULE_ADDRESS as `0x${string}`
export const GMEOW_CORE_ADDRESS = process.env.NEXT_PUBLIC_GMEOW_CORE_ADDRESS as `0x${string}`

// Validate addresses are set
if (!SCORING_MODULE_ADDRESS || !GMEOW_CORE_ADDRESS) {
  throw new Error('Missing contract addresses in environment')
}
```

**File**: `.env.local`

```bash
# Copy from .env.sepolia or .env after deployment
NEXT_PUBLIC_SCORING_MODULE_ADDRESS=0x...
NEXT_PUBLIC_GMEOW_CORE_ADDRESS=0x...
```

## 2. Add Contract ABIs

**Create**: `lib/contracts/scoringModuleABI.ts`

```typescript
// Copy from abi/ScoringModule.json after deployment
export const scoringModuleABI = [
  // ... full ABI here
] as const
```

## 3. Create On-Chain Data Hooks

**Create**: `hooks/useOnChainScoring.ts`

```typescript
import { useReadContract } from 'wagmi'
import { SCORING_MODULE_ADDRESS } from '@/lib/contracts/addresses'
import { scoringModuleABI } from '@/lib/contracts/scoringModuleABI'

export function useUserStats(address: `0x${string}` | undefined) {
  return useReadContract({
    address: SCORING_MODULE_ADDRESS,
    abi: scoringModuleABI,
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useLevelProgress(address: `0x${string}` | undefined) {
  return useReadContract({
    address: SCORING_MODULE_ADDRESS,
    abi: scoringModuleABI,
    functionName: 'getLevelProgress',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useRankProgress(address: `0x${string}` | undefined) {
  return useReadContract({
    address: SCORING_MODULE_ADDRESS,
    abi: scoringModuleABI,
    functionName: 'getRankProgress',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

export function useScoreBreakdown(address: `0x${string}` | undefined) {
  return useReadContract({
    address: SCORING_MODULE_ADDRESS,
    abi: scoringModuleABI,
    functionName: 'getScoreBreakdown',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })
}
```

## 4. Update API Routes

### 4.1 User Stats Route

**File**: `app/api/viral/stats/route.ts`

```typescript
// BEFORE (off-chain):
import { calculateLevelProgress } from '@/lib/scoring/unified-calculator'

const levelData = calculateLevelProgress(totalScore)

// AFTER (on-chain):
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { SCORING_MODULE_ADDRESS } from '@/lib/contracts/addresses'
import { scoringModuleABI } from '@/lib/contracts/scoringModuleABI'

const client = createPublicClient({
  chain: base,
  transport: http(),
})

const [level, tierIndex, totalScore, multiplier] = await client.readContract({
  address: SCORING_MODULE_ADDRESS,
  abi: scoringModuleABI,
  functionName: 'getUserStats',
  args: [userAddress],
})

// Convert on-chain data to response format
const stats = {
  level: Number(level),
  tier: Number(tierIndex),
  totalScore: Number(totalScore),
  multiplier: Number(multiplier) / 1000, // Convert from basis points (1100 → 1.1)
}
```

### 4.2 Leaderboard Route

**File**: `app/api/viral/leaderboard/route.ts`

```typescript
// Keep Supabase for leaderboard data, but enhance with on-chain stats
const users = await supabase
  .from('user_stats')
  .select('address, total_score')
  .order('total_score', { ascending: false })
  .limit(100)

// Batch fetch on-chain stats for top users
const onChainStats = await Promise.all(
  users.map(async (user) => {
    const [level, tierIndex, , multiplier] = await client.readContract({
      address: SCORING_MODULE_ADDRESS,
      abi: scoringModuleABI,
      functionName: 'getUserStats',
      args: [user.address as `0x${string}`],
    })
    
    return {
      ...user,
      level: Number(level),
      tier: Number(tierIndex),
      multiplier: Number(multiplier) / 1000,
    }
  })
)
```

## 5. Update Profile Page

**File**: `app/profile/page.tsx` (if it queries stats directly)

```typescript
'use client'

import { useUserStats, useLevelProgress, useRankProgress } from '@/hooks/useOnChainScoring'
import { useAccount } from 'wagmi'

export default function ProfilePage() {
  const { address } = useAccount()
  
  // Fetch on-chain data
  const { data: stats, isLoading: statsLoading } = useUserStats(address)
  const { data: levelProgress } = useLevelProgress(address)
  const { data: rankProgress } = useRankProgress(address)
  
  if (statsLoading) return <div>Loading stats...</div>
  if (!stats) return <div>No stats found</div>
  
  const [level, tierIndex, totalScore, multiplier] = stats
  
  return (
    <div>
      <h1>Level {level.toString()}</h1>
      <p>Total Score: {totalScore.toString()}</p>
      <p>Rank Tier: {tierIndex.toString()}</p>
      <p>Multiplier: {(Number(multiplier) / 1000).toFixed(1)}x</p>
      
      {levelProgress && (
        <div>
          <p>XP Progress: {levelProgress[1].toString()} / {levelProgress[2].toString()}</p>
          <p>To Next Level: {levelProgress[3].toString()} XP</p>
        </div>
      )}
      
      {rankProgress && (
        <div>
          <p>Rank Progress: {rankProgress[1].toString()} / {(rankProgress[1] + rankProgress[2]).toString()}</p>
          <p>Has Multiplier: {rankProgress[3] ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  )
}
```

## 6. Migration Strategy

### Phase 1: Dual Data Source (Recommended)
Keep both off-chain and on-chain systems running in parallel:

```typescript
const useStats = (address: `0x${string}` | undefined) => {
  const { data: onChainStats } = useUserStats(address)
  const offChainStats = calculateLevelProgress(totalScore) // from DB
  
  // Use on-chain data if available, fall back to off-chain
  return onChainStats || offChainStats
}
```

### Phase 2: Full Migration
Once on-chain is validated:
1. Update all API routes to query on-chain data
2. Remove unified-calculator.ts imports
3. Archive old scoring code
4. Monitor for discrepancies

## 7. Testing Checklist

- [ ] Deploy contracts to Sepolia testnet
- [ ] Verify contract addresses in .env.local
- [ ] Test getUserStats() returns correct data
- [ ] Test getLevelProgress() calculations
- [ ] Test getRankProgress() boundaries
- [ ] Compare on-chain vs off-chain calculations
- [ ] Load test with 100+ concurrent requests
- [ ] Monitor gas costs for read operations (should be free)
- [ ] Test fallback behavior if RPC is down
- [ ] Update error handling for contract calls

## 8. Rank Tier Names

Map tierIndex to human-readable names:

```typescript
const RANK_NAMES = [
  'Signal Kitten',        // 0: 0-500
  'Warp Scout',           // 1: 500-1.5K
  'Beacon Runner',        // 2: 1.5K-4K ⭐ 1.1x
  'Night Operator',       // 3: 4K-8K
  'Star Captain',         // 4: 8K-15K ⭐ 1.2x
  'Nebula Commander',     // 5: 15K-25K
  'Quantum Navigator',    // 6: 25K-40K ⭐ 1.3x
  'Cosmic Architect',     // 7: 40K-60K
  'Void Walker',          // 8: 60K-100K ⭐ 1.5x
  'Singularity Prime',    // 9: 100K-250K
  'Infinite GM',          // 10: 250K-500K ⭐ 2.0x
  'Omniversal Being',     // 11: 500K+ (mythic)
] as const

export function getRankName(tierIndex: number): string {
  return RANK_NAMES[tierIndex] || 'Unknown'
}

export function hasMultiplier(tierIndex: number): boolean {
  return [2, 4, 6, 8, 10].includes(tierIndex)
}
```

## 9. Performance Optimization

### Cache On-Chain Data
```typescript
// Use wagmi's built-in caching
import { useReadContract } from 'wagmi'

const { data: stats } = useReadContract({
  address: SCORING_MODULE_ADDRESS,
  abi: scoringModuleABI,
  functionName: 'getUserStats',
  args: [address],
  query: {
    staleTime: 60_000, // Cache for 1 minute
    gcTime: 5 * 60_000, // Keep in cache for 5 minutes
  },
})
```

### Batch Multiple Calls
```typescript
import { useReadContracts } from 'wagmi'

const { data } = useReadContracts({
  contracts: [
    {
      address: SCORING_MODULE_ADDRESS,
      abi: scoringModuleABI,
      functionName: 'getUserStats',
      args: [address],
    },
    {
      address: SCORING_MODULE_ADDRESS,
      abi: scoringModuleABI,
      functionName: 'getLevelProgress',
      args: [address],
    },
    {
      address: SCORING_MODULE_ADDRESS,
      abi: scoringModuleABI,
      functionName: 'getScoreBreakdown',
      args: [address],
    },
  ],
})
```

## 10. Monitoring

### Log All Contract Calls
```typescript
const { data: stats } = useReadContract({
  address: SCORING_MODULE_ADDRESS,
  abi: scoringModuleABI,
  functionName: 'getUserStats',
  args: [address],
  query: {
    onSuccess: (data) => {
      console.log('[On-Chain Stats]', { address, data })
    },
    onError: (error) => {
      console.error('[On-Chain Stats Error]', { address, error })
      // Send to error tracking (Sentry, etc.)
    },
  },
})
```

### Compare Results
```typescript
const onChainLevel = Number(stats[0])
const offChainLevel = calculateLevelProgress(totalScore).level

if (onChainLevel !== offChainLevel) {
  console.error('[Level Mismatch]', {
    address,
    onChain: onChainLevel,
    offChain: offChainLevel,
    totalScore,
  })
}
```

## 11. Deployment Checklist

- [ ] Run `./scripts/deploy-scoring-system.sh sepolia`
- [ ] Verify contracts on BaseScan Sepolia
- [ ] Test all contract functions manually with cast
- [ ] Update .env.local with Sepolia addresses
- [ ] Deploy frontend to staging (Vercel preview)
- [ ] Run full integration test suite
- [ ] Compare Sepolia vs mainnet gas costs
- [ ] Get approval from team
- [ ] Run `./scripts/deploy-scoring-system.sh mainnet`
- [ ] Update production .env with mainnet addresses
- [ ] Deploy frontend to production
- [ ] Monitor error rates for 24 hours
- [ ] Verify calculations match off-chain for sample users

## 12. Rollback Plan

If issues arise:

1. **Quick Fix**: Revert API routes to use off-chain calculator
2. **Partial Rollback**: Use feature flag to toggle on-chain vs off-chain
3. **Full Rollback**: Deploy previous contract version

```typescript
// Feature flag approach
const USE_ONCHAIN_SCORING = process.env.NEXT_PUBLIC_USE_ONCHAIN_SCORING === 'true'

const stats = USE_ONCHAIN_SCORING 
  ? await getOnChainStats(address)
  : await getOffChainStats(address)
```

## Questions?

Contact the dev team or check:
- Contract source: `contract/modules/ScoringModule.sol`
- Test suite: `test/ScoringModule.t.sol`
- Original calculator: `lib/scoring/unified-calculator.ts`
