/**
 * Leaderboard Supabase Queries
 * 
 * Purpose: FID→wallet batch lookup and metadata enrichment (5% of calculation)
 * Heavy lifting: Done by Subsquid LeaderboardEntry entities (95% of calculation)
 * 
 * Pattern: Hybrid Supabase + Subsquid
 * 1. Supabase: user_profiles (fid → wallet_address mapping + metadata)
 * 2. Subsquid: LeaderboardEntry (pre-computed rankings, points, stats)
 * 
 * Migration Status: Week 1 Day 2 - CRITICAL Phase 3 blocker
 */

import { getSupabaseServerClient } from '@/lib/supabase'

/**
 * Batch lookup: wallets → FIDs + metadata
 * Used by: Leaderboard Frame (to enrich wallet addresses with user info)
 */
export async function enrichLeaderboardWithProfiles(
  walletAddresses: string[]
): Promise<Map<string, { fid: number; username: string | null; displayName: string | null; pfpUrl: string | null }>> {
  const supabase = getSupabaseServerClient()
  const map = new Map()

  if (walletAddresses.length === 0) return map
  if (!supabase) {
    console.error('[enrichLeaderboardWithProfiles] Supabase client is null')
    return map
  }

  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('fid, wallet_address, display_name, pfp_url')
      .in('wallet_address', walletAddresses)

    if (error) {
      console.error('[enrichLeaderboardWithProfiles] Supabase error:', error)
      return map
    }

    if (!profiles || profiles.length === 0) {
      console.warn('[enrichLeaderboardWithProfiles] No profiles found for wallets:', walletAddresses.slice(0, 3))
      return map
    }

    // Build map: wallet → user metadata
    profiles.forEach((profile: any) => {
      const walletLower = profile.wallet_address?.toLowerCase()
      if (walletLower) {
        map.set(walletLower, {
          fid: profile.fid,
          username: profile.display_name || null, // Use display_name as username
          displayName: profile.display_name || null,
          pfpUrl: profile.pfp_url || null,
        })
      }
    })

    console.log(`[enrichLeaderboardWithProfiles] Enriched ${map.size}/${walletAddresses.length} wallets`)
    return map
  } catch (err) {
    console.error('[enrichLeaderboardWithProfiles] Error:', err)
    return map
  }
}

/**
 * Get user's leaderboard rank by wallet address
 * Used by: User profile pages, personal stats
 */
export async function getUserRankByWallet(walletAddress: string): Promise<{
  rank: number | null;
  totalPoints: number | null;
  weeklyPoints: number | null;
  monthlyPoints: number | null;
} | null> {
  // This will be queried from Subsquid, not Supabase
  // Supabase doesn't have leaderboard_calculations anymore (Phase 3 will drop it)
  // This is just a placeholder for the migration pattern
  
  console.warn('[getUserRankByWallet] Use Subsquid getLeaderboard() instead of this function')
  return null
}

/**
 * Get FID from wallet address (reverse lookup)
 * Used by: Leaderboard Frame (to get FID for frame interactions)
 */
export async function getFidFromWallet(walletAddress: string): Promise<number | null> {
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    console.error('[getFidFromWallet] Supabase client is null')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('fid')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle()

    if (error) {
      console.error('[getFidFromWallet] Error:', error)
      return null
    }

    return data?.fid || null
  } catch (err) {
    console.error('[getFidFromWallet] Error:', err)
    return null
  }
}
