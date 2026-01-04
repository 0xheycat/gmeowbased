/**
 * Referral Subsquid Hooks
 * Phase 5 - Referral Pages Migration (Jan 3, 2026)
 * 
 * React hooks for fetching referral data from Subsquid GraphQL
 * 
 * @architecture Hybrid Data Layer
 * - Referral codes/uses: Subsquid GraphQL (on-chain events)
 * - Referral analytics: Supabase (aggregated stats)
 * - User scores: Subsquid GraphQL (from User entity)
 */

import { useQuery } from '@apollo/client'
import {
  GET_REFERRAL_CODE,
  GET_REFERRAL_CODES_BY_OWNER,
  GET_REFERRAL_USES_BY_CODE,
  GET_REFERRAL_USES_BY_REFERRER,
  GET_REFERRAL_USES_BY_REFEREE,
  GET_REFERRER_BY_USER,
  GET_REFERRALS_BY_REFERRER,
  GET_RECENT_REFERRAL_ACTIVITY,
  GET_REFERRAL_STATS_BY_OWNER,
  type GetReferralCodeVariables,
  type GetReferralCodesByOwnerVariables,
  type GetReferralUsesByCodeVariables,
  type GetReferralUsesByReferrerVariables,
  type GetReferralUsesByRefereeVariables,
  type GetReferrerByUserVariables,
  type GetReferralsByReferrerVariables,
  type GetRecentReferralActivityVariables,
  type GetReferralStatsByOwnerVariables,
  type ReferralCodeResponse,
  type ReferralUseResponse,
  type ReferrerSetResponse,
  type ReferralStatsResponse,
} from '@/lib/graphql/queries/referrals'

/**
 * Use Referral Code
 * Fetch a specific referral code with recent uses
 * 
 * @param codeId - Referral code string (null to skip)
 * 
 * @example
 * const { code, loading } = useReferralCode("GMEOW")
 */
export function useReferralCode(codeId: string | null) {
  const { data, loading, error, refetch } = useQuery<
    { referralCodes: ReferralCodeResponse[] },
    GetReferralCodeVariables
  >(GET_REFERRAL_CODE, {
    variables: { codeId: codeId || '' },
    skip: !codeId,
    pollInterval: 30000, // Poll every 30s for real-time updates
  })

  return {
    code: data?.referralCodes?.[0] || null,
    loading,
    error,
    refetch,
  }
}

/**
 * Use Referral Codes by Owner
 * Fetch all referral codes created by a specific address
 * 
 * @param owner - Wallet address (lowercase, null to skip)
 * @param limit - Maximum codes to return (default: 10)
 * 
 * @example
 * const { codes, loading } = useReferralCodesByOwner("0x123...", 5)
 */
export function useReferralCodesByOwner(
  owner: string | null,
  limit: number = 10
) {
  const { data, loading, error, refetch } = useQuery<
    { referralCodes: ReferralCodeResponse[] },
    GetReferralCodesByOwnerVariables
  >(GET_REFERRAL_CODES_BY_OWNER, {
    variables: { owner: owner || '', limit },
    skip: !owner,
    pollInterval: 30000,
  })

  return {
    codes: data?.referralCodes || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use Referral Uses by Code
 * Fetch all uses of a specific referral code
 * 
 * @param codeId - Referral code string
 * @param limit - Maximum uses to return (default: 20)
 * 
 * @example
 * const { uses, loading } = useReferralUsesByCode("GMEOW", 10)
 */
export function useReferralUsesByCode(
  codeId: string | null,
  limit: number = 20
) {
  const { data, loading, error, refetch } = useQuery<
    { referralUses: ReferralUseResponse[] },
    GetReferralUsesByCodeVariables
  >(GET_REFERRAL_USES_BY_CODE, {
    variables: { codeId: codeId || '', limit, orderBy: ['timestamp_DESC'] },
    skip: !codeId,
    pollInterval: 30000,
  })

  return {
    uses: data?.referralUses || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use Referral Uses by Referrer
 * Fetch all successful referrals made by a specific address
 * 
 * @param referrer - Referrer wallet address (lowercase)
 * @param limit - Maximum uses to return (default: 20)
 * 
 * @example
 * const { uses, loading, totalRewards } = useReferralUsesByReferrer("0x123...", 10)
 */
export function useReferralUsesByReferrer(
  referrer: string | null,
  limit: number = 20
) {
  const { data, loading, error, refetch } = useQuery<
    { referralUses: ReferralUseResponse[] },
    GetReferralUsesByReferrerVariables
  >(GET_REFERRAL_USES_BY_REFERRER, {
    variables: { referrer: referrer || '', limit },
    skip: !referrer,
    pollInterval: 30000,
  })

  // Calculate total rewards
  const totalRewards = data?.referralUses?.reduce(
    (sum, use) => sum + parseInt(use.reward, 10),
    0
  ) || 0

  return {
    uses: data?.referralUses || [],
    totalRewards,
    loading,
    error,
    refetch,
  }
}

/**
 * Use Referral Uses by Referee
 * Fetch all referrals used by a specific address
 * 
 * @param referee - Referee wallet address (lowercase)
 * @param limit - Maximum uses to return (default: 5)
 * 
 * @example
 * const { uses, loading } = useReferralUsesByReferee("0x123...")
 */
export function useReferralUsesByReferee(
  referee: string | null,
  limit: number = 5
) {
  const { data, loading, error, refetch } = useQuery<
    { referralUses: ReferralUseResponse[] },
    GetReferralUsesByRefereeVariables
  >(GET_REFERRAL_USES_BY_REFEREE, {
    variables: { referee: referee || '', limit },
    skip: !referee,
    pollInterval: 30000,
  })

  return {
    uses: data?.referralUses || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use Referrer by User
 * Fetch the referrer relationship for a specific user
 * 
 * @param user - User wallet address (lowercase)
 * 
 * @example
 * const { referrer, loading } = useReferrerByUser("0x123...")
 */
export function useReferrerByUser(user: string | null) {
  const { data, loading, error, refetch } = useQuery<
    { referrerSets: ReferrerSetResponse[] },
    GetReferrerByUserVariables
  >(GET_REFERRER_BY_USER, {
    variables: { user: user || '' },
    skip: !user,
    pollInterval: 60000, // Poll every 60s (referrer rarely changes)
  })

  return {
    referrer: data?.referrerSets?.[0]?.referrer || null,
    referrerSetEvent: data?.referrerSets?.[0] || null,
    loading,
    error,
    refetch,
  }
}

/**
 * Use Referrals by Referrer
 * Fetch all users who set a specific address as their referrer
 * 
 * @param referrer - Referrer wallet address (lowercase)
 * @param limit - Maximum referrals to return (default: 50)
 * 
 * @example
 * const { referrals, count, loading } = useReferralsByReferrer("0x123...")
 */
export function useReferralsByReferrer(
  referrer: string | null,
  limit: number = 50
) {
  const { data, loading, error, refetch } = useQuery<
    { referrerSets: ReferrerSetResponse[] },
    GetReferralsByReferrerVariables
  >(GET_REFERRALS_BY_REFERRER, {
    variables: { referrer: referrer || '', limit },
    skip: !referrer,
    pollInterval: 30000,
  })

  return {
    referrals: data?.referrerSets || [],
    count: data?.referrerSets?.length || 0,
    loading,
    error,
    refetch,
  }
}

/**
 * Use Recent Referral Activity
 * Fetch recent referral uses across all codes (for activity feed)
 * 
 * @param limit - Maximum uses to return (default: 20)
 * 
 * @example
 * const { activity, loading } = useRecentReferralActivity(10)
 */
export function useRecentReferralActivity(limit: number = 20) {
  const { data, loading, error, refetch } = useQuery<
    { referralUses: ReferralUseResponse[] },
    GetRecentReferralActivityVariables
  >(GET_RECENT_REFERRAL_ACTIVITY, {
    variables: { limit },
    pollInterval: 30000,
  })

  return {
    activity: data?.referralUses || [],
    loading,
    error,
    refetch,
  }
}

/**
 * Use Referral Stats by Owner
 * Fetch aggregate stats for all codes owned by an address
 * 
 * @param owner - Owner wallet address (lowercase)
 * 
 * @example
 * const { totalUses, totalRewards, loading } = useReferralStatsByOwner("0x123...")
 */
export function useReferralStatsByOwner(owner: string | null) {
  const { data, loading, error, refetch } = useQuery<
    { referralCodes: ReferralStatsResponse[] },
    GetReferralStatsByOwnerVariables
  >(GET_REFERRAL_STATS_BY_OWNER, {
    variables: { owner: owner || '' },
    skip: !owner,
    pollInterval: 60000,
  })

  // Aggregate stats across all codes
  const stats = data?.referralCodes?.reduce(
    (acc, code) => ({
      totalUses: acc.totalUses + code.totalUses,
      totalRewards: acc.totalRewards + parseInt(code.totalRewards, 10),
      codeCount: acc.codeCount + 1,
    }),
    { totalUses: 0, totalRewards: 0, codeCount: 0 }
  ) || { totalUses: 0, totalRewards: 0, codeCount: 0 }

  return {
    totalUses: stats.totalUses,
    totalRewards: stats.totalRewards,
    codeCount: stats.codeCount,
    loading,
    error,
    refetch,
  }
}

/**
 * Helper: Format Referral Rewards
 * Convert BigInt string to formatted number
 * 
 * @param rewards - BigInt as string
 * @returns Formatted rewards (e.g., "+50 points")
 */
export function formatReferralRewards(rewards: string): string {
  const num = parseInt(rewards, 10)
  return `+${num.toLocaleString()} points`
}

/**
 * Helper: Format Referral Timestamp
 * Convert BigInt timestamp to relative time
 * 
 * @param timestamp - BigInt timestamp (Unix seconds) as string
 * @returns Relative time (e.g., "2 hours ago")
 */
export function formatReferralTimestamp(timestamp: string): string {
  const ts = parseInt(timestamp, 10) * 1000 // Convert to milliseconds
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}
