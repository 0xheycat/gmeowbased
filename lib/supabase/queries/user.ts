/**
 * User Profile Queries (Supabase)
 * 
 * Purpose: Get user metadata for frame enrichment
 * Note: This is the 5% of data that comes from Supabase (off-chain profiles)
 * The 95% (on-chain stats) comes from Subsquid
 */

import { getSupabaseServerClient } from '@/lib/supabase'

export interface UserProfile {
  fid: number
  wallet_address: string
  display_name: string | null
  pfp_url: string | null
  username?: string | null
  // Additional enrichment fields (if available)
  questsCompleted?: number
  viralXP?: number
  tipsSent?: number
  tipsReceived?: number
}

/**
 * Get user profile by wallet address or FID
 * Used for frame enrichment to add display names and profile pictures
 */
export async function getUserProfile(
  walletAddress: string,
  fid?: number | null
): Promise<UserProfile | null> {
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    console.error('[getUserProfile] Supabase client is null')
    return null
  }

  try {
    let query = supabase
      .from('user_profiles')
      .select('fid, wallet_address, display_name, avatar_url')
    
    // Prefer wallet address lookup
    if (walletAddress && walletAddress !== '0x0') {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    } else if (fid) {
      query = query.eq('fid', fid)
    } else {
      return null
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('[getUserProfile] Error:', error)
      return null
    }

    if (!data) {
      console.warn(`[getUserProfile] No profile found for wallet ${walletAddress} / FID ${fid}`)
      return null
    }

    return {
      fid: data.fid,
      wallet_address: data.wallet_address || '',
      display_name: data.display_name,
      pfp_url: data.avatar_url,
      username: data.display_name || `user-${data.fid}`, // Use display_name as username fallback
    }
  } catch (err) {
    console.error('[getUserProfile] Error:', err)
    return null
  }
}

/**
 * Batch get user profiles by wallet addresses
 * More efficient than multiple single queries
 */
export async function getUserProfiles(
  walletAddresses: string[]
): Promise<Map<string, UserProfile>> {
  const supabase = getSupabaseServerClient()
  const map = new Map<string, UserProfile>()
  
  if (walletAddresses.length === 0) return map
  if (!supabase) {
    console.error('[getUserProfiles] Supabase client is null')
    return map
  }

  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('fid, wallet_address, display_name, pfp_url')
      .in('wallet_address', walletAddresses.map(w => w.toLowerCase()))

    if (error) {
      console.error('[getUserProfiles] Error:', error)
      return map
    }

    if (!profiles || profiles.length === 0) {
      return map
    }

    profiles.forEach((profile: any) => {
      const walletLower = profile.wallet_address?.toLowerCase()
      if (walletLower) {
        map.set(walletLower, {
          fid: profile.fid,
          wallet_address: profile.wallet_address,
          display_name: profile.display_name,
          pfp_url: profile.pfp_url,
          username: profile.display_name,
        })
      }
    })

    return map
  } catch (err) {
    console.error('[getUserProfiles] Error:', err)
    return map
  }
}
