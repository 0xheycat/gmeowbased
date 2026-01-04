/**
 * useUserTier - Get user tier from ScoringModule contract
 * 
 * Phase 3.2B (Dec 31, 2025)
 * 
 * Lightweight hook for just user tier (0-11).
 * Uses direct contract call to getUserTier() function.
 * 
 * Features:
 * - ✅ Minimal data fetching (1 uint256)
 * - ✅ Auto-refresh every 60 seconds
 * - ✅ React Query caching (30s stale time)
 * - ✅ BigInt → Number conversion
 * - ✅ Tier name mapping (optional)
 * 
 * @example
 * const { tier, tierName, loading } = useUserTier(address)
 * console.log(tier) // 3
 * console.log(tierName) // "Galactic Kitty"
 */

import { useReadContract } from 'wagmi'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { SCORING_ABI } from '@/lib/contracts/abis'

// 12-tier rank system (matches unified-calculator.ts)
const TIER_NAMES = [
  'Signal Kitten',        // 0
  'Quantum Tabby',        // 1
  'Cosmic Cat',           // 2
  'Galactic Kitty',       // 3
  'Nebula Lynx',          // 4
  'Stellar Panther',      // 5
  'Constellation Tiger',  // 6
  'Void Walker',          // 7
  'Dimensional Prowler',  // 8
  'Ethereal Predator',    // 9
  'Celestial Guardian',   // 10
  'Omniversal Being',     // 11
]

type UseUserTierReturn = {
  tier: number | null
  tierName: string | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useUserTier(
  address?: `0x${string}`,
  options?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
): UseUserTierReturn {
  const {
    enabled = true,
    refetchInterval = 60000, // 60 seconds
    staleTime = 30000, // 30 seconds
  } = options || {}

  const { 
    data: rawData, 
    isLoading, 
    error,
    refetch,
  } = useReadContract({
    address: STANDALONE_ADDRESSES.base.scoringModule,
    abi: SCORING_ABI,
    functionName: 'getUserTier',
    args: address ? [address] : undefined,
    chainId: 8453, // Base chain
    query: {
      enabled: !!address && enabled,
      refetchInterval,
      staleTime,
    },
  })

  const tier = rawData ? Number(rawData) : null
  const tierName = tier !== null && tier >= 0 && tier < TIER_NAMES.length 
    ? TIER_NAMES[tier] 
    : null

  return {
    tier,
    tierName,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}
