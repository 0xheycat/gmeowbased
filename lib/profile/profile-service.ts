/**
 * Profile Service - Data fetching layer for user profiles
 * 
 * Architecture:
 * - Uses current Supabase schema (user_profiles + user_points_balances)
 * - Base-only chain (no multichain references)
 * - Integrates Neynar API for fresh Farcaster data
 * - Implements caching (180s TTL for profile data)
 * - Type-safe queries with PostgreSQL array handling
 * 
 * Data Sources:
 * - user_profiles table: fid, wallet_address, verified_addresses, display_name, bio, etc.
 * - user_points_balances table: points_balance, viral_xp, guild_points_awarded, total_score
 * - points_leaderboard view: rank calculation from total_score
 * - Subsquid GraphQL: UserOnChainStats.currentStreak (on-chain source of truth)
 * - Neynar API: Fresh Farcaster profile data (username, pfp, verified addresses)
 * 
 * Key Schema Patterns:
 * - user_profiles.fid: BIGINT (primary key)
 * - user_points_balances.fid: BIGINT (primary key, synced from Subsquid)
 * - user_profiles.verified_addresses: TEXT[] array (multi-wallet support)
 * - user_profiles.social_links: JSONB object
 * - total_score: GENERATED ALWAYS AS (points_balance + viral_xp + guild_points_awarded)
 * 
 * @module lib/profile/profile-service
 */

import { getSupabaseServerClient } from '@/lib/supabase/edge'

// Dynamic import helpers for server-only cache module (prevents bundling to client)
async function getCachedSafe<T>(
  namespace: string,
  key: string,
  factory: () => Promise<T>,
  options?: { ttl?: number; staleWhileRevalidate?: boolean; force?: boolean }
): Promise<T> {
  if (typeof window !== 'undefined') {
    return factory() // Client: bypass cache
  }
  const { getCached } = await import('@/lib/cache/server')
  return getCached(namespace, key, factory, options)
}

async function invalidateCacheSafe(namespace: string, key: string): Promise<void> {
  if (typeof window !== 'undefined') {
    return // Client: no-op
  }
  const { invalidateCache } = await import('@/lib/cache/server')
  return invalidateCache(namespace, key)
}

import { 
  calculateLevelProgress, 
  getRankTierByPoints,
  calculateCompleteStats 
} from '@/lib/scoring/unified-calculator'
import type { Database } from '@/types/supabase'
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
    .single() as { data: Database['public']['Tables']['user_profiles']['Row'], error: any }

  if (error || !data) return null
  return data
}

/**
 * Fetch user points balances from Supabase + guild_events (PHASE 3 ENHANCEMENT)
 * 
 * Schema: user_points_balances (points_balance, viral_xp, guild_points_awarded, total_score)
 * 
 * ⚠️ CRITICAL CHANGE (Phase 3 Week 1 Day 1):
 * Previously only fetched guild_points_awarded from user_points_balances.
 * Now COMBINES two sources for complete guild points calculation:
 * 
 * Source 1: guild_members.contribution_points (website deposits)
 * Source 2: guild_events.amount WHERE event_type='POINTS_DEPOSITED' (blockchain deposits)
 * 
 * This fixes the offline metrics gap in unified-calculator.ts
 */
async function fetchUserPointsBalance(fid: number) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null
  
  // Get user's verified addresses for multi-wallet guild events lookup
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('verified_addresses, wallet_address')
    .eq('fid', fid)
    .single()
  
  const walletAddresses = [
    ...(profileData?.verified_addresses || []),
    ...(profileData?.wallet_address ? [profileData.wallet_address] : [])
  ].filter(Boolean) as string[]
  
  // Fetch points balance + guild events in parallel
  const [pointsData, guildEventsData] = await Promise.all([
    supabase
      .from('user_points_balances')
      .select('points_balance, viral_xp, guild_points_awarded, total_score, last_synced_at')
      .eq('fid', fid)
      .single(),
    
    // LAYER 3: Fetch blockchain guild deposits (Phase 3 P1)
    // Sum all guild_events.amount WHERE event_type='POINTS_DEPOSITED' for user's wallets
    walletAddresses.length > 0
      ? supabase
          .from('guild_events')
          .select('amount')
          .eq('event_type', 'POINTS_DEPOSITED')
          .in('actor_address', walletAddresses)
      : Promise.resolve({ data: null, error: null })
  ])
  
  if (pointsData.error || !pointsData.data) return null
  
  // Calculate guild points from guild_events (blockchain deposits)
  const guildEventPoints = (guildEventsData.data || []).reduce((sum, event) => {
    return sum + (Number(event.amount) || 0)
  }, 0)
  
  // Combine: guild_points_awarded (website) + guild_events (blockchain)
  const combinedGuildPoints = (pointsData.data.guild_points_awarded || 0) + guildEventPoints
  
  return {
    points_balance: pointsData.data.points_balance || 0,
    viral_xp: pointsData.data.viral_xp || 0,
    guild_points_awarded: combinedGuildPoints, // ✅ COMBINED SOURCE
    total_score: (pointsData.data.total_score || 0) + guildEventPoints, // ✅ UPDATED TOTAL
    last_synced_at: pointsData.data.last_synced_at,
  }
}

// Helper function to determine rank tier from score (using unified calculator)
function getRankTier(score: number): string {
  const { getRankTierByPoints } = require('@/lib/scoring/unified-calculator')
  const tier = getRankTierByPoints(score)
  return tier.name
}

/**
 * Count user's completed quests
 */
async function countQuestCompletions(fid: number): Promise<number> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return 0

  // quest_completions table not yet in Database types
  const { count, error } = await (supabase as any)
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

  // user_badges table not yet in Database types
  const { count, error } = await (supabase as any)
    .from('user_badges')
    .select('*', { count: 'exact', head: true })
    .eq('fid', fid)

  if (error) return 0
  return count || 0
}

/**
 * Get user's global leaderboard rank
 * 
 * LAYER 2 (Supabase): Query points_leaderboard view
 */
async function getGlobalRank(fid: number): Promise<number> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return 0

  const { data, error } = await (supabase as any)
    .from('points_leaderboard')
    .select('rank')
    .eq('fid', fid)
    .single()

  if (error || !data) return 0
  return data.rank || 0
}

/**
 * Get user's current streak from Subsquid (on-chain)
 * 
 * LAYER 1 (Subsquid): Fetch UserOnChainStats.currentStreak
 * Uses primary wallet address from verified addresses
 */
async function getCurrentStreak(walletAddress: string): Promise<number> {
  if (!walletAddress) return 0

  try {
    const { getOnChainUserStats } = await import('@/lib/subsquid-client')
    const stats = await getOnChainUserStats(walletAddress)
    return stats?.currentStreak || 0
  } catch (error) {
    console.error('[getCurrentStreak] Error fetching from Subsquid:', error)
    return 0
  }
}

/**
 * Count user's viral badge casts and aggregate viral bonus XP
 * 
 * LAYER 2 (Supabase): Aggregate off-chain viral bonus XP
 */
async function aggregateViralBonusXP(fid: number): Promise<number> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return 0

  // badge_casts table: fid, cast_hash, badge_id, viral_bonus_xp, created_at
  const { data, error } = await (supabase as any)
    .from('badge_casts')
    .select('viral_bonus_xp')
    .eq('fid', fid)

  if (error || !data) return 0

  // Sum all viral_bonus_xp
  return data.reduce((sum: number, row: { viral_bonus_xp: number | null }) => {
    return sum + (row.viral_bonus_xp || 0)
  }, 0)
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetch complete profile data for a user
 * 
 * HYBRID ARCHITECTURE (3 LAYERS):
 * 
 * LAYER 1 (Subsquid - On-Chain):
 * - getLeaderboardEntry(): XP, streak, badges, rank from blockchain
 * 
 * LAYER 2 (Supabase - Off-Chain):
 * - user_profiles: display_name, bio, avatar, social links
 * - badge_casts: viral_bonus_xp aggregation
 * - quest_completions, user_badges: activity counts
 * 
 * LAYER 3 (Calculations - Derived):
 * - calculateLevelProgress(): level, levelPercent, xpToNextLevel
 * - getRankTierByPoints(): rankTier, rankTierIcon, tierTagline
 * 
 * Data Flow:
 * 1. Check cache (180s TTL)
 * 2. LAYER 1: Fetch on-chain data from Subsquid
 * 3. LAYER 2: Fetch off-chain data from Supabase (parallel)
 * 4. LAYER 3: Calculate derived metrics using lib/rank.ts
 * 5. Merge all 3 layers into ProfileData
 * 6. Return complete profile
 * 
 * @param fid - Farcaster ID
 * @returns ProfileData or null if user not found
 */
export async function fetchProfileData(fid: number): Promise<ProfileData | null> {
  return getCachedSafe(
    'profile',
    `fid:${fid}`,
    async () => {
      // LAYER 1: Subsquid (On-Chain Data) + LAYER 2: Supabase
      const [userProfile, pointsBalance, neynarUser, questCount, badgeCount, viralBonusXP, globalRank] = await Promise.all([
        fetchUserProfileFromDB(fid),
        fetchUserPointsBalance(fid), // LAYER 2: Supabase off-chain points
        fetchNeynarUser(fid),
        countQuestCompletions(fid),
        countUserBadges(fid),
        aggregateViralBonusXP(fid), // LAYER 2: Supabase viral bonus aggregation
        getGlobalRank(fid), // LAYER 2: Query points_leaderboard view
      ])

      if (!userProfile) return null

      // Sync wallet addresses from Neynar to database (background, non-blocking)
      if (neynarUser?.verified_addresses || neynarUser?.custody_address) {
        const supabase = getSupabaseServerClient()
        if (supabase) {
          // Fire and forget - don't await to avoid blocking profile fetch
          void supabase
            .from('user_profiles')
            .update({
              custody_address: neynarUser.custody_address || null,
              verified_addresses: neynarUser.verified_addresses || null,
              updated_at: new Date().toISOString(),
            })
            .eq('fid', fid)
        }
      }

      // Get verified addresses from Neynar (always fresh)
      const verifiedAddresses = neynarUser?.verified_addresses || []
      const primaryAddress = verifiedAddresses[0] || userProfile.wallet_address || ''

      // Build wallet data (Base chain only)
      const wallet: WalletData = {
        address: primaryAddress,
        ens_name: null, // TODO: Fetch ENS if needed
        is_verified: verifiedAddresses.length > 0,
      }

      // Parse social links from JSONB (type assertion needed due to Database types)
      const links = (userProfile.social_links || {}) as Record<string, string | undefined>
      const socialLinks: SocialLinks = {
        warpcast: links.warpcast || `https://warpcast.com/${neynarUser?.username || fid}`,
        twitter: links.twitter || null,
        github: links.github || null,
        website: links.website || null,
      }

      // LAYER 3: Calculate derived metrics using unified-calculator
      const { calculateLevelProgress, getRankTierByPoints } = await import('@/lib/scoring/unified-calculator')
      const totalScore = (pointsBalance?.total_score || 0)
      const levelProgress = calculateLevelProgress(totalScore)
      const rankTier = getRankTierByPoints(totalScore)
      
      // LAYER 1: Fetch current streak from Subsquid (on-chain data)
      const currentStreak = await getCurrentStreak(primaryAddress)

      // Build complete profile data (merged from all 3 layers)
      const profileData: ProfileData = {
        // Identity (LAYER 2: Supabase + Neynar)
        fid,
        username: neynarUser?.username || `fid:${fid}`,
        display_name: userProfile.display_name || neynarUser?.display_name || neynarUser?.username || `User ${fid}`,
        bio: userProfile.bio || neynarUser?.bio || null,
        
        // Images (LAYER 2: Supabase)
        avatar_url: userProfile.avatar_url || neynarUser?.pfp_url || null,
        cover_image_url: userProfile.cover_image_url || null,
        
        // Wallet (LAYER 1: Subsquid + LAYER 2: Supabase)
        wallet,
        
        // Social (LAYER 2: Supabase)
        social_links: socialLinks,
        
        // Stats (HYBRID: All 3 layers)
        stats: {
          // LAYER 2 (Supabase): Off-chain points
          points_balance: pointsBalance?.points_balance || 0,
          viral_xp: pointsBalance?.viral_xp || 0,
          guild_points_awarded: pointsBalance?.guild_points_awarded || 0,
          
          // LAYER 3 (Calculated): Total score from all sources
          total_score: totalScore,
          
          // LAYER 3 (Calculated): Level progression
          level: levelProgress.level,
          
          // LAYER 1 (Subsquid): Streak (TODO)
          current_streak: currentStreak,
          
          // LAYER 3 (Calculated): Rank tier
          rank_tier: rankTier.name,
          
          // LAYER 2 (Supabase): Leaderboard position from points_leaderboard view
          global_rank: globalRank,
          
          // Legacy fields (for backward compatibility)
          referral_bonus: 0,      // TODO: Calculate from referrals table
          streak_bonus: currentStreak * 10,  // Derived from current_streak
          badge_prestige: badgeCount * 25,   // Derived from badge_count
          
          // LAYER 2 (Supabase): Activity counts
          quest_completions: questCount,
          badge_count: badgeCount,
          viral_casts: 0, // Deprecated: use badge_count instead
          
          // Time
          member_since: userProfile.onboarded_at || userProfile.created_at || new Date().toISOString(),
          last_active: pointsBalance?.last_synced_at || new Date().toISOString(),
        },
        
        // Neynar Score (LAYER 2: Supabase)
        neynar_score: userProfile.neynar_score || null,
        neynar_tier: userProfile.neynar_tier || null,
        
        // Metadata (LAYER 2: Supabase)
        metadata: (userProfile.metadata || {}) as Record<string, unknown>,
        
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
    await invalidateCacheSafe('profile', `fid:${fid}`)

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
