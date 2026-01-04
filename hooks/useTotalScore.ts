/**
 * useTotalScore - Get total score from ScoringModule contract
 * 
 * Phase 3.2B (Dec 31, 2025)
 * 
 * Lightweight hook for just total score (no breakdown).
 * Uses direct contract call to totalScore() function.
 * 
 * Features:
 * - ✅ Minimal data fetching (1 uint256 vs full struct)
 * - ✅ Auto-refresh every 60 seconds
 * - ✅ React Query caching (30s stale time)
 * - ✅ BigInt → Number conversion
 * 
 * @example
 * const { totalScore, loading } = useTotalScore(address)
 * console.log(totalScore) // 15000
 */

import { useReadContract } from 'wagmi'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { SCORING_ABI } from '@/lib/contracts/abis'

type UseTotalScoreReturn = {
  totalScore: number | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useTotalScore(
  address?: `0x${string}`,
  options?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
): UseTotalScoreReturn {
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
    functionName: 'totalScore',
    args: address ? [address] : undefined,
    chainId: 8453, // Base chain
    query: {
      enabled: !!address && enabled,
      refetchInterval,
      staleTime,
    },
  })

  return {
    totalScore: rawData ? Number(rawData) : null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}
