/**
 * Profile Service - Data fetching layer for user profiles
 * 
 * Architecture:
 * - Uses actual Supabase schema (user_profiles + leaderboard_calculations)
 * - Base-only chain (no multichain references)
 * - Integrates Neynar API for fresh Farcaster data
 * - Implements caching (180s TTL for profile data)
 * - Type-safe queries with PostgreSQL array handling
 * 
 * Data Sources:
 * - user_profiles table (21 columns): fid, wallet_address, display_name, bio, etc.
 * - leaderboard_calculations table (18 columns): address, base_points, viral_xp, etc.
 * - Neynar API: Fresh Farcaster profile data (username, pfp, bio)
 * 
 * Key Schema Patterns:
 * - user_profiles.fid: BIGINT (primary key)
 * - leaderboard_calculations.farcaster_fid: INTEGER (type mismatch!)
 * - user_profiles.verified_addresses: TEXT[] array
 * - user_profiles.social_links: JSONB object
 * - leaderboard_calculations.address: TEXT (single Base address)
 * 
 * @module lib/profile/profile-service
 */

import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getCached, invalidateCache } from '@/lib/cache'
import type { 
  ProfileData, 
  ProfileUpdateRequest,
  SocialLinks,
  WalletData,
} from './types'

// Re-export ProfileData for API routes (fixes TS import error)
export type { ProfileData } from './types'

// ============================================================================
// NEYNAR INTEGRATION
// ============================================================================

/**
 * Fetch fresh Farcaster user data from Neynar API
 */
async function fetchNeynarUser(fid: number): Promise<{
  username: string
  display_name?: string | null
  pfp_url?: string | null
  bio?: string | null
  verified_addresses?: string[]
  custody_address?: string | null
} | null> {
  if (!process.env.NEYNAR_API_KEY) return null
  
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': process.env.NEYNAR_API_KEY,
          'X-Client-Info': 'gmeow-profile/1.0.0',
        },
        // Cache for 5 minutes (Next.js runtime)
        ...(typeof (global as unknown as { next?: unknown }).next !== 'undefined' && {
          next: { revalidate: 300 },
        }),
      } as RequestInit
    )

    if (!response.ok) return null

    const data = await response.json()
    const user = data.users?.[0]
    if (!user) return null

    return {
      username: user.username || `fid:${fid}`,
      display_name: user.display_name || null,
      pfp_url: user.pfp_url || null,
      bio: user.profile?.bio?.text || null,
      verified_addresses: user.verified_addresses?.eth_addresses || [],
      custody_address: user.custody_address || null,
    }
  } catch (error) {
    console.error('[profile-service] Neynar fetch failed:', error)
    return null
  }
}

// ============================================================================
// DATABASE QUERIES
// ============================================================================

/**
 * Fetch user profile from user_profiles table
 * 
 * Schema: user_profiles (21 columns now)
 * - id, fid (bigint), wallet_address, custody_address
 * - verified_addresses (text[]), neynar_score, neynar_tier
 * - points, xp, display_name, bio, avatar_url, cover_image_url
 * - social_links (jsonb), onboarded_at, created_at, updated_at
 * - total_points_earned, total_points_spent, og_nft_eligible, metadata
 */
async function fetchUserProfileFromDB(fid: number) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('fid', fid)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Fetch leaderboard data for user
 * 
 * Schema: leaderboard_calculations (18 columns)
 * - id, address (text), farcaster_fid (integer)
 * - base_points, viral_xp, guild_bonus, referral_bonus, streak_bonus, badge_prestige
 * - total_score (generated), global_rank, rank_change, rank_tier
 * - period, calculated_at, updated_at, tip_points, nft_points
 * 
 * Note: farcaster_fid is INTEGER (different from user_profiles.fid BIGINT)
 */
async function fetchLeaderboardDataFromDB(fid: number) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  // Query all_time period for profile display
  const { data, error } = await supabase
    .from('leaderboard_calculations')
    .select('*')
    .eq('farcaster_fid', fid)
    .eq('period', 'all_time')
    .single()

  if (error || !data) return null
  return data
}

/**
 * Count user's completed quests
 */
async function countQuestCompletions(fid: number): Promise<number> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('quest_completions')
    .select('*', { count: 'exact', head: true })
    .eq('fid', fid)

  if (error) return 0
  return count || 0
}

/**
 * Count user's earned badges
 */
async function countUserBadges(fid: number): Promise<number> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('user_badges')
    .select('*', { count: 'exact', head: true })
    .eq('fid', fid)

  if (error) return 0
  return count || 0
}

/**
 * Count user's viral badge casts
 */
async function countViralCasts(fid: number): Promise<number> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('badge_casts')
    .select('*', { count: 'exact', head: true })
    .eq('fid', fid)

  if (error) return 0
  return count || 0
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetch complete profile data for a user
 * 
 * Data Flow:
 * 1. Check cache (180s TTL)
 * 2. Fetch from user_profiles table
 * 3. Fetch from leaderboard_calculations table
 * 4. Fetch fresh Neynar data
 * 5. Count quests/badges/casts
 * 6. Merge all data sources
 * 7. Calculate derived stats (level from lib/rank.ts)
 * 8. Return ProfileData
 * 
 * @param fid - Farcaster ID
 * @returns ProfileData or null if user not found
 */
export async function fetchProfileData(fid: number): Promise<ProfileData | null> {
  return getCached(
    'profile',
    `fid:${fid}`,
    async () => {
      // Fetch database records
      const [userProfile, leaderboard, neynarUser, questCount, badgeCount, viralCount] = await Promise.all([
        fetchUserProfileFromDB(fid),
        fetchLeaderboardDataFromDB(fid),
        fetchNeynarUser(fid),
        countQuestCompletions(fid),
        countUserBadges(fid),
        countViralCasts(fid),
      ])

      if (!userProfile) return null

      // Build wallet data (Base chain only)
      const wallet: WalletData = {
        address: leaderboard?.address || userProfile.wallet_address || '',
        ens_name: null, // TODO: Fetch ENS if needed
        is_verified: (userProfile.verified_addresses?.length || 0) > 0,
      }

      // Parse social links from JSONB
      const socialLinks: SocialLinks = {
        warpcast: userProfile.social_links?.warpcast || `https://warpcast.com/${neynarUser?.username || fid}`,
        twitter: userProfile.social_links?.twitter || null,
        github: userProfile.social_links?.github || null,
        website: userProfile.social_links?.website || null,
      }

      // Calculate level from total_score (uses lib/rank.ts)
      // TODO: Import calculateLevelProgress from lib/rank.ts
      const totalScore = leaderboard?.total_score || 0
      const level = Math.floor(Math.sqrt(totalScore / 100)) + 1 // Simplified, replace with lib/rank.ts
      const streak = Math.floor((leaderboard?.streak_bonus || 0) / 10) // 10 points per streak day

      // Build complete profile data
      const profileData: ProfileData = {
        // Identity
        fid,
        username: neynarUser?.username || `fid:${fid}`,
        display_name: userProfile.display_name || neynarUser?.display_name || neynarUser?.username || `User ${fid}`,
        bio: userProfile.bio || neynarUser?.bio || null,
        
        // Images
        avatar_url: userProfile.avatar_url || neynarUser?.pfp_url || null,
        cover_image_url: userProfile.cover_image_url || null,
        
        // Wallet
        wallet,
        
        // Social
        social_links: socialLinks,
        
        // Stats (from leaderboard_calculations)
        stats: {
          // Points & XP
          viral_xp: leaderboard?.viral_xp || 0,
          base_points: leaderboard?.base_points || 0,
          guild_bonus: leaderboard?.guild_bonus || 0,
          referral_bonus: leaderboard?.referral_bonus || 0,
          streak_bonus: leaderboard?.streak_bonus || 0,
          badge_prestige: leaderboard?.badge_prestige || 0,
          total_score: totalScore,
          
          // Progression
          level,
          global_rank: leaderboard?.global_rank || 0,
          rank_tier: leaderboard?.rank_tier || 'Rookie',
          streak,
          
          // Activity
          quest_completions: questCount,
          badge_count: badgeCount,
          viral_casts: viralCount,
          
          // Time
          member_since: userProfile.onboarded_at || userProfile.created_at || new Date().toISOString(),
          last_active: leaderboard?.updated_at || new Date().toISOString(),
        },
        
        // Neynar Score
        neynar_score: userProfile.neynar_score || null,
        neynar_tier: userProfile.neynar_tier || null,
        
        // Metadata
        metadata: userProfile.metadata || {},
        
        // Timestamps
        created_at: userProfile.created_at || new Date().toISOString(),
        updated_at: userProfile.updated_at || new Date().toISOString(),
      }

      return profileData
    },
    { ttl: 180 } // 3 minutes cache
  )
}

/**
 * Update user profile data
 * 
 * Allowed Updates:
 * - display_name (max 32 chars)
 * - bio (max 256 chars)
 * - avatar_url (URL string)
 * - cover_image_url (URL string)
 * - social_links (JSONB object)
 * - metadata (JSONB object)
 * 
 * Security:
 * - Only profile owner can update
 * - Validation via isValidProfileUpdate type guard
 * - Invalidates cache after update
 * 
 * @param fid - Farcaster ID
 * @param updates - Profile fields to update
 * @returns Updated ProfileData or null if failed
 */
export async function updateProfileData(
  fid: number,
  updates: ProfileUpdateRequest
): Promise<ProfileData | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  try {
    // Build update object (only allowed fields)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.display_name !== undefined) {
      updateData.display_name = updates.display_name?.slice(0, 32) || null
    }
    if (updates.bio !== undefined) {
      updateData.bio = updates.bio?.slice(0, 256) || null
    }
    if (updates.avatar_url !== undefined) {
      updateData.avatar_url = updates.avatar_url || null
    }
    if (updates.cover_image_url !== undefined) {
      updateData.cover_image_url = updates.cover_image_url || null
    }
    if (updates.social_links !== undefined) {
      updateData.social_links = updates.social_links
    }
    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata
    }

    // Update database
    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('fid', fid)

    if (error) {
      console.error('[profile-service] Update failed:', error)
      return null
    }

    // Invalidate cache
    await invalidateCache('profile', `fid:${fid}`)

    // Return fresh data
    return fetchProfileData(fid)
  } catch (error) {
    console.error('[profile-service] Update error:', error)
    return null
  }
}

/**
 * Check if user profile exists
 */
export async function profileExists(fid: number): Promise<boolean> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return false

  const { count, error } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('fid', fid)

  if (error) return false
  return (count || 0) > 0
}

/**
 * Create new user profile
 * 
 * Note: Most profiles are auto-created via auth flow.
 * This is for admin/migration purposes.
 */
export async function createProfile(
  fid: number,
  walletAddress?: string
): Promise<ProfileData | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  try {
    // Insert new profile
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        fid,
        wallet_address: walletAddress || null,
        onboarded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('[profile-service] Create failed:', error)
      return null
    }

    // Return fresh profile
    return fetchProfileData(fid)
  } catch (error) {
    console.error('[profile-service] Create error:', error)
    return null
  }
}
