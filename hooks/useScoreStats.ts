/**
 * useScoreStats - Get complete user scoring stats from ScoringModule contract
 * 
 * Phase 3.2B (Dec 31, 2025)
 * 
 * Features:
 * - ✅ Direct contract reads via wagmi
 * - ✅ Auto-refresh every 60 seconds
 * - ✅ React Query caching (30s stale time)
 * - ✅ BigInt → Number conversion
 * - ✅ Total score auto-calculated
 * - ✅ Base chain only
 * 
 * @example
 * const { stats, loading, error, refetch } = useScoreStats(address)
 * if (stats) {
 *   console.log(stats.totalScore) // 15000
 *   console.log(stats.tier) // 3 (Galactic Kitty)
 * }
 */

import { useReadContract } from 'wagmi'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { SCORING_ABI } from '@/lib/contracts/abis'

export type ScoreStats = {
  tier: number              // User tier (0-11)
  gmPoints: number          // GM rewards points
  questPoints: number       // Quest completion points
  viralPoints: number       // Viral engagement points
  guildPoints: number       // Guild activity points
  referralPoints: number    // Referral bonus points
  totalScore: number        // Total score sum
}

type UseScoreStatsReturn = {
  stats: ScoreStats | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export function useScoreStats(
  address?: `0x${string}`,
  options?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
): UseScoreStatsReturn {
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
    functionName: 'getUserStats',
    args: address ? [address] : undefined,
    chainId: 8453, // Base chain
    query: {
      enabled: !!address && enabled,
      refetchInterval,
      staleTime,
    },
  })

  // Convert BigInt tuple to ScoreStats object
  const stats: ScoreStats | null = rawData ? {
    tier: Number((rawData as any)[0]),
    gmPoints: Number((rawData as any)[1]),
    questPoints: Number((rawData as any)[2]),
    viralPoints: Number((rawData as any)[3]),
    guildPoints: Number((rawData as any)[4]),
    referralPoints: Number((rawData as any)[5]),
    totalScore: 
      Number((rawData as any)[1]) + 
      Number((rawData as any)[2]) + 
      Number((rawData as any)[3]) + 
      Number((rawData as any)[4]) + 
      Number((rawData as any)[5]),
  } : null

  return {
    stats,
    loading: isLoading,
    error: error as Error | null,
    refetch,
  }
}
