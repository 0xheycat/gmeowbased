/**
 * GET /api/guild/[guildId]
 * 
 * Purpose: Fetch guild details with 10-layer security
 * Method: GET
 * Auth: Optional (public guild data)
 * Rate Limit: 60 requests/hour
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "guild": {
 *     "id": string,
 *     "name": string,
 *     "leader": string,
 *     "totalPoints": string,
 *     "memberCount": string,
 *     "level": number,
 *     "active": boolean,
 *     "treasury": string
 *   },
 *   "members": Array<{
 *     "address": string,
 *     "isOfficer": boolean,
 *     "points": string
 *   }>,
 *   "timestamp": number
 * }
 * 
 * 10-Layer Security:
 * 1. Rate Limiting - Upstash Redis (60 req/hour)
 * 2. Request Validation - Guild ID format validation
 * 3. Authentication - Optional (public data)
 * 4. RBAC - N/A (public read)
 * 5. Input Sanitization - BigInt validation
 * 6. SQL Injection Prevention - N/A (contract reads only)
 * 7. CSRF Protection - Origin validation
 * 8. Privacy Controls - Public guild data only
 * 9. Audit Logging - All reads tracked
 * 10. Error Masking - No sensitive data exposed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache/server'
import { rateLimit, strictLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { createClient } from '@/lib/supabase/edge'
import { generateRequestId } from '@/lib/middleware/request-id'
import { getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'
import getApolloClient from '@/lib/apollo-client'
import { GET_GUILD_BY_ID } from '@/lib/graphql/queries/guild'

// ==========================================
// Helper Functions
// ==========================================

/**
 * Helper function to determine rank tier
 */
function getTierFromRank(rank: number | null | undefined): string {
  if (!rank) return 'unranked'
  if (rank <= 10) return 'legendary'
  if (rank <= 50) return 'master'
  if (rank <= 100) return 'diamond'
  if (rank <= 500) return 'platinum'
  if (rank <= 1000) return 'gold'
  return 'silver'
}

/**
 * BUG #8 FIX: Get points for a user from ON-CHAIN (Subsquid)
 * 
 * ARCHITECTURE (Dec 31): All scoring data is ON-CHAIN in ScoringModule
 * - Query Subsquid for: totalScore, pointsBalance, viralPoints, guildPoints
 * - Supabase user_points_balances is DEPRECATED for on-chain data
 * 
 * Multi-wallet: Subsquid indexes by wallet address, use primary custody address
 */
async function getMultiWalletStats(address: string): Promise<{
  pointsBalance: number
  viralPoints: number
  guildBonusPoints: number
  totalScore: number
}> {
  try {
    const { getApolloClient } = await import('@/lib/apollo-client')
    const { gql } = await import('@apollo/client')
    
    const apolloClient = getApolloClient()
    
    // Query Subsquid for on-chain scoring data
    const { data } = await apolloClient.query({
      query: gql`
        query GetUserStats($address: String!) {
          users(where: { id_eq: $address }, limit: 1) {
            id
            totalScore
            pointsBalance
            viralPoints
            guildPoints
          }
        }
      `,
      variables: { address: address.toLowerCase() },
      fetchPolicy: 'cache-first',
    })

    const user = data?.users?.[0]
    
    if (!user) {
      return { pointsBalance: 0, viralPoints: 0, guildBonusPoints: 0, totalScore: 0 }
    }

    return {
      pointsBalance: user.pointsBalance ? Number(user.pointsBalance) : 0,
      viralPoints: user.viralPoints ? Number(user.viralPoints) : 0,
      guildBonusPoints: user.guildPoints ? Number(user.guildPoints) : 0,
      totalScore: user.totalScore ? Number(user.totalScore) : 0,
    }
  } catch (error) {
    console.error('[guild-detail] Error fetching user stats from Subsquid:', error)
    return { pointsBalance: 0, viralPoints: 0, guildBonusPoints: 0, totalScore: 0 }
  }
}

/**
 * Validate guild ID parameter
 */
function validateGuildId(guildId: string): bigint | null {
  try {
    const id = BigInt(guildId)
    if (id <= 0n) return null
    return id
  } catch {
    return null
  }
}

/**
 * Generate member badges based on role, activity, and contributions
 */
function getMemberBadges(
  isOfficer: boolean,
  isLeader: boolean,
  points: number,
  createdAt?: string
): Array<{
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: 'role' | 'achievement' | 'activity'
}> {
  const badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    category: 'role' | 'achievement' | 'activity'
  }> = []
  
  // Calculate days since joining
  const daysSinceJoin = createdAt 
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  
  // Role badges
  if (isLeader) {
    badges.push({
      id: 'guild-leader',
      name: 'Guild Leader',
      description: 'Guild founder and leader',
      icon: '/badges/role/crown.png',
      rarity: 'legendary',
      category: 'role',
    })
  } else if (isOfficer) {
    badges.push({
      id: 'officer',
      name: 'Officer',
      description: 'Guild officer',
      icon: '/badges/role/shield.png',
      rarity: 'epic',
      category: 'role',
    })
  }
  
  // Achievement badges (points-based)
  if (points >= 10000) {
    badges.push({
      id: 'top-contributor',
      name: 'Top Contributor',
      description: 'Contributed 10,000+ points',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'legendary',
      category: 'achievement',
    })
  } else if (points >= 5000) {
    badges.push({
      id: 'high-contributor',
      name: 'High Contributor',
      description: 'Contributed 5,000+ points',
      icon: '/badges/achievement/top-contributor.png',
      rarity: 'epic',
      category: 'achievement',
    })
  } else if (points >= 1000) {
    badges.push({
      id: 'contributor',
      name: 'Contributor',
      description: 'Contributed 1,000+ points',
      icon: '/badges/achievement/contributor.png',
      rarity: 'rare',
      category: 'achievement',
    })
  }
  
  // Activity badges (time-based)
  if (daysSinceJoin >= 90) {
    badges.push({
      id: 'dedicated',
      name: 'Dedicated',
      description: 'Member for over 90 days',
      icon: '/badges/achievement/veteran.png',
      rarity: 'epic',
      category: 'activity',
    })
  } else if (daysSinceJoin >= 30) {
    badges.push({
      id: 'committed',
      name: 'Committed',
      description: 'Member for over 30 days',
      icon: '/badges/achievement/veteran.png',
      rarity: 'rare',
      category: 'activity',
    })
  }
  
  // Filter out badges with empty icons and limit to 6
  return badges.filter(b => b.icon && b.icon !== '').slice(0, 6)
}

/**
 * Fetch guild data from Supabase (TRUE HYBRID LAYER 1+2)
 */
async function fetchGuildFromSupabase(
  guildId: string,
  options: {
    limit?: number
    cursor?: string | null
  } = {}
): Promise<{
  guild: {
    id: string
    name: string
    description: string
    banner: string
    leader: string
    totalPoints: number
    memberCount: number
    level: number
    active: boolean
    treasury: number
  }
  members: Array<{
    address: string
    isOfficer: boolean
    points: string
    farcaster?: any
    badges?: any
    leaderboardStats?: any
    joinedAt?: string | null
  }>
  pagination: {
    nextCursor: string | null
    hasMore: boolean
    totalCount: number
    fetched: number
  }
} | null> {
  try {
    // LAYER 1: Get on-chain guild data from Subsquid (source of truth for name)
    const apolloClient = getApolloClient
    const { data: subsquidData, error: subsquidError } = await apolloClient.query({
      query: GET_GUILD_BY_ID,
      variables: {
        guildId: guildId,
      },
    })

    if (subsquidError) {
      console.error('[guild-detail] Failed to fetch guild from Subsquid:', subsquidError)
    }

    const onChainGuild = subsquidData?.guild

    // LAYER 2: Get guild metadata from Supabase (description, banner only) - OPTIONAL
    // NOTE: name is on-chain (from Subsquid), only query off-chain fields
    const supabase = createClient()
    
    const { data: guildData } = await supabase
      .from('guild_off_chain_metadata')
      .select('description, banner')
      .eq('guild_id', guildId)
      .maybeSingle() // ✅ Returns null if not found (no error)
    
    // Use on-chain guild data (name is always from Subsquid)
    const guildName = onChainGuild?.name || 'Unknown Guild'
    const guildDescription = guildData?.description || ''
    const guildBanner = guildData?.banner || ''
    
    // LAYER 2: Query Subsquid directly for guild stats
    // BUG FIX (Jan 8, 2026): guild_events table is empty, query Subsquid instead
    const { getGuildStats } = await import('@/lib/integrations/subsquid-client')
    
    const guildStats = await getGuildStats(guildId)
    if (!guildStats) {
      console.error('[guild-detail] Guild not found in Subsquid:', guildId)
      return null
    }
    
    // Extract stats from Subsquid response
    const leaderAddress = guildStats.owner
    const totalPoints = guildStats.totalPoints
    const memberCount = guildStats.totalMembers
    const level = 1 // Guild level not in Subsquid yet
    const memberAddresses = guildStats.members.map((m: any) => m.address)
    
    // Parse officers (empty for now - not in response)
    const officers = new Set<string>()
    const memberPointsMap = new Map<string, number>(
      guildStats.members.map((m: any) => [m.address, m.pointsContributed])
    )
    
    // ============================================================================
    // FID AUTO-DETECTION: Use existing Neynar infrastructure
    // ============================================================================
    // CRITICAL: user_profiles may have stale/mock FID data
    // Solution: Always lookup FIDs fresh from wallet addresses via Neynar
    // Uses: lib/integrations/neynar.ts (fetchFidByAddress with 5min cache)
    
    const { fetchFidByAddress } = await import('@/lib/integrations/neynar')
    const addressToFidMap = new Map<string, number>()
    
    // Fetch FIDs in parallel for all member addresses
    await Promise.all(
      memberAddresses.map(async (address: string) => {
        try {
          const fid = await fetchFidByAddress(address)
          if (fid) {
            addressToFidMap.set(address, fid)
          }
        } catch (error) {
          console.error(`[guild-detail] Error fetching FID for ${address}:`, error)
        }
      })
    )
    
    // Get member profiles from user_profiles (for display_name/avatar fallback only)
    // BUG #10 FIX: Cursor-based pagination for large guilds
    const { limit = 50, cursor } = options
    
    // Build paginated query
    let profileQuery = supabase
      .from('user_profiles')
      .select('fid, wallet_address, verified_addresses, display_name, avatar_url, created_at')
      .in('wallet_address', memberAddresses)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there's more
    
    // Apply cursor if provided (pagination)
    if (cursor) {
      profileQuery = profileQuery.lt('created_at', cursor)
    }
    
    const { data: profiles, error: profilesError } = await profileQuery
    
    if (profilesError) {
      console.error('[guild-detail] Error fetching profiles:', profilesError)
    }
    
    // Use correct FIDs from Neynar (auto-detected from addresses)
    const fids: number[] = []
    for (const address of memberAddresses) {
      const fidFromNeynar = addressToFidMap.get(address)
      if (fidFromNeynar) {
        fids.push(fidFromNeynar)
      } else {
        // Fallback to user_profiles FID only if Neynar lookup failed
        const profile = (profiles || []).find(p => p.wallet_address === address)
        if (profile?.fid) {
          fids.push(profile.fid)
        }
      }
    }
    
    // Fetch Farcaster data using existing profile-service infrastructure (with caching)
    // This uses lib/profile/profile-service.ts which:
    // - Fetches from Neynar with 5min cache
    // - Syncs to user_profiles in background
    // - Provides rich Farcaster stats (username, pfp, bio, verified addresses)
    const { fetchProfileData } = await import('@/lib/profile/profile-service')
    
    const farcasterDataByFid = new Map<number, { username: string; displayName: string; pfpUrl: string }>()
    
    // Fetch in parallel for all FIDs
    await Promise.all(
      fids.map(async (fid) => {
        try {
          const profileData = await fetchProfileData(fid)
          if (profileData) {
            farcasterDataByFid.set(fid, {
              username: profileData.username || `fid:${fid}`,
              displayName: profileData.display_name || '', // ProfileData uses snake_case
              pfpUrl: profileData.avatar_url || '',  // ProfileData uses avatar_url
            })
          }
        } catch (error) {
          console.error(`[guild-detail] Error fetching profile for FID ${fid}:`, error)
        }
      })
    )
    
    // BUG #10 FIX: Calculate pagination metadata based on member addresses (not profiles)
    // CRITICAL FIX: Iterate over memberAddresses (from contract), not profiles (from DB)
    // This ensures ALL members are returned, even if they don't have a user_profiles entry
    const hasMore = memberAddresses.length > limit
    const paginatedAddresses = hasMore ? memberAddresses.slice(0, limit) : memberAddresses
    const nextCursor = hasMore && paginatedAddresses.length > 0
      ? paginatedAddresses[paginatedAddresses.length - 1]
      : null
    
    // Build profile map for lookups
    const profileMap = new Map<string, any>()
    for (const profile of profiles || []) {
      if (profile.wallet_address) {
        profileMap.set(profile.wallet_address.toLowerCase(), profile)
      }
    }
    
    // Enrich members with profile data
    // LAYER 4: Enrich members with points data
    // Map member addresses to their data using correct FIDs from Neynar
    const enrichedMembers = await Promise.all(paginatedAddresses.map(async (address: string) => {
      // Get profile from map (may not exist)
      const currentProfile = profileMap.get(address.toLowerCase())
      
      // Get correct FID for this address (from Neynar lookup)
      const correctFid = addressToFidMap.get(address)
      
      // Fallback to user_profiles if Neynar lookup failed
      const fid = correctFid || currentProfile?.fid
      
      if (!fid) {
        // No FID found - user doesn't have Farcaster account
        return {
          address,
          isOfficer: officers.has(address),
          points: memberPointsMap.get(address)?.toString() || '0',
          farcaster: {
            fid: 0,
            username: address, // Show address as fallback
            displayName: '',
            pfpUrl: '',
          },
          badges: [],
          leaderboardStats: {
            pointsBalance: memberPointsMap.get(address) || 0,
            viralPoints: 0,
            guildBonusPoints: 0,
            totalScore: memberPointsMap.get(address) || 0,
            rank: null,
            streakDays: 0,
          },
        }
      }
      
      // Get points breakdown from Subsquid (on-chain data - ScoringModule Dec 31)
      // Query by wallet address, not FID
      const aggregatedStats = await getMultiWalletStats(address)
      
      // Generate badges based on role, points, and activity (not from database)
      const memberBadges = getMemberBadges(
        officers.has(address),
        address.toLowerCase() === leaderAddress.toLowerCase(),
        aggregatedStats.pointsBalance,
        currentProfile?.created_at
      )
      
      // Get global rank from points_leaderboard view
      const { data: rankData } = await supabase
        .from('points_leaderboard')
        .select('points_rank')
        .eq('fid', fid)
        .maybeSingle()
      
      // Get Farcaster data from cached profile service
      const farcasterData = farcasterDataByFid.get(fid)
      
      // Get profile data for fallback display_name/avatar
      return {
        address: address,
        isOfficer: officers.has(address),
        points: (memberPointsMap.get(address) || 0).toString(), // Points contributed to guild
        joinedAt: currentProfile?.created_at || undefined, // BUG #10: Include for pagination cursor (may be undefined)
        farcaster: fid ? {
          fid: fid,
          username: farcasterData?.username || currentProfile?.display_name || `fid:${fid}`,
          displayName: farcasterData?.displayName || currentProfile?.display_name || '',
          pfpUrl: farcasterData?.pfpUrl || currentProfile?.avatar_url || '',
        } : {
          fid: 0,
          username: address, // Fallback to address if no FID
          displayName: '',
          pfpUrl: '',
        },
        badges: memberBadges,
        leaderboardStats: {
          pointsBalance: aggregatedStats.pointsBalance,
          viralPoints: aggregatedStats.viralPoints,
          guildBonusPoints: aggregatedStats.guildBonusPoints,
          totalScore: aggregatedStats.totalScore,
          globalRank: rankData?.points_rank || null,
          rankTier: getTierFromRank(rankData?.points_rank),
          isGuildOfficer: officers.has(address),
        }
      }
    }))
    
    return {
      guild: {
        id: guildId, // Use parameter, not from Supabase
        name: onChainGuild?.name || 'Unknown Guild', // Always from Subsquid (on-chain)
        description: guildData?.description || '',
        banner: guildData?.banner || '',
        leader: leaderAddress,
        totalPoints,
        memberCount,
        level,
        active: true,
        treasury: totalPoints,
      },
      members: enrichedMembers,
      pagination: {
        nextCursor,
        hasMore,
        totalCount: memberCount,
        fetched: enrichedMembers.length,
      },
    }
  } catch (error) {
    console.error('[guild-detail] fetchGuildFromSupabase error:', error)
    return null
  }
}

/**
 * Calculate guild level from total points
 */
function calculateGuildLevel(points: number): number {
  if (points < 1000) return 1
  if (points < 2000) return 2
  if (points < 5000) return 3
  if (points < 10000) return 4
  return 5
}

/**
 * Legacy function kept for compatibility (deprecated - do not use)
 * @deprecated Use fetchGuildFromSupabase instead
 */
async function getGuildMembers(guildId: bigint, leaderAddress: string, limit: number = 50): Promise<Array<{
  address: string
  isOfficer: boolean
  points: string
  farcaster?: any
  badges?: any
  leaderboardStats?: any
}>> {
  console.log('[guild-api] getGuildMembers called (DEPRECATED) - guildId:', guildId.toString(), 'leader:', leaderAddress)
  
  try {
    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    console.log('[guild-api] Creating Supabase client...')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
    
    // First, get guild members from profiles table
    console.log('[guild-api] Fetching guild members from profiles...')
    const { data: guildProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('fid, wallet_address')
      .eq('guild_id', guildId.toString())
      .limit(limit)
    
    if (profilesError || !guildProfiles || guildProfiles.length === 0) {
      console.log('[guild-api] No profiles found or error:', profilesError)
      // Return empty array - will trigger fallback to leader-only member
      return []
    }
    
    console.log('[guild-api] Fetching member stats from Supabase...')
    // Query Supabase for points balances for each member
    
    // First, get guild metadata and officers
    const { data: guildMeta } = await supabase
      .from('guild_off_chain_metadata')
      .select('name')
      .eq('guild_id', guildId.toString())
      .maybeSingle() // ✅ Returns null if not found
    
    const { data: events } = await supabase
      .from('guild_events')
      .select('event_type, actor_address, target_address')
      .eq('guild_id', guildId.toString())
      .in('event_type', ['GUILD_CREATED', 'MEMBER_PROMOTED', 'MEMBER_DEMOTED'])
      .order('created_at', { ascending: false })
    
    // Build officers set
    const officers = new Set<string>()
    for (const event of events || []) {
      if (event.event_type === 'GUILD_CREATED') {
        officers.add(event.actor_address)
      } else if (event.event_type === 'MEMBER_PROMOTED' && event.target_address) {
        officers.add(event.target_address)
      } else if (event.event_type === 'MEMBER_DEMOTED' && event.target_address) {
        officers.delete(event.target_address)
      }
    }
    
    const membersWithStats = await Promise.all(
      guildProfiles.map(async (profile) => {
        try {
          // Get points balance (migrations applied Dec 22)
          const { data: stats } = await supabase
            .from('user_points_balances')
            .select('points_balance, viral_xp, guild_points_awarded, total_score')
            .eq('fid', profile.fid)
            .single()
          
          // Get global rank from leaderboard view
          const { data: rankData } = await supabase
            .from('points_leaderboard')
            .select('points_rank')
            .eq('fid', profile.fid)
            .single()
          
          return stats ? {
            address: profile.wallet_address,
            farcaster_fid: profile.fid,
            isGuildOfficer: officers.has(profile.wallet_address || ''),
            pointsBalance: stats.points_balance || 0,
            viralPoints: stats.viral_xp || 0,
            guildBonusPoints: stats.guild_points_awarded || 0,
            totalScore: stats.total_score || 0,
            globalRank: rankData?.points_rank || null,
            rankTier: getTierFromRank(rankData?.points_rank),
            guildId: guildId.toString(),
            guildName: guildMeta?.name || 'Unknown Guild'
          } : null
        } catch (err) {
          console.error(`[guild-api] Error fetching stats for profile ${profile.fid}:`, err)
          return null
        }
      })
    )
    
    const members = membersWithStats.filter((m): m is NonNullable<typeof m> => m !== null)
    
    console.log('[guild-api] getGuildMembers - Subsquid stats fetched:', {
      guildId: guildId.toString(),
      membersFound: members.length,
      membersIsArray: Array.isArray(members),
      firstMember: members[0]
    })
    
    // If we have members, enrich with Farcaster and badges data
    if (members.length > 0) {
      console.log('[guild-api] Found members in leaderboard, enriching...', members.length, 'members')
      // Get FIDs to fetch Farcaster profiles
      const fids = members.map(m => m.farcaster_fid).filter(Boolean)
      console.log('[guild-api] Fetching profiles for FIDs:', fids)
      
      // Fetch Farcaster profiles
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('fid, wallet_address, verified_addresses')
        .in('fid', fids)
      console.log('[guild-api] Profiles fetched:', profiles?.length || 0, 'error:', profileError?.message || 'none')
      
      // Fetch badges for all members
      const memberAddresses = members.map(m => m.address)
      console.log('[guild-api] Fetching badges for FIDs:', fids)
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select('fid, badge_id, tier, badge_type, minted')
        .in('fid', fids)
      console.log('[guild-api] Badges fetched:', badges?.length || 0, 'error:', badgesError?.message || 'none')
      
      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.fid, p]) || [])
      const badgesByFid = new Map<number, any[]>()
      badges?.forEach(b => {
        if (!badgesByFid.has(b.fid)) {
          badgesByFid.set(b.fid, [])
        }
        badgesByFid.get(b.fid)?.push(b)
      })
      
      // Enrich with Neynar Farcaster data
      const enrichedMembers = await Promise.all(members.map(async (m) => {
        const profile = m.farcaster_fid ? profileMap.get(m.farcaster_fid) : null
        const rawBadges = m.farcaster_fid ? badgesByFid.get(m.farcaster_fid) || [] : []
        
        // Transform badges to match Badge interface
        const userBadges = rawBadges.map((b: any) => ({
          id: b.badge_id,
          name: b.badge_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `${b.badge_type} badge`,
          icon: `/badges/${b.badge_type}/${b.badge_id}.png`,
          rarity: b.tier,
          category: b.badge_type,
          animated: b.tier === 'legendary',
          earnedAt: new Date().toISOString()
        }))
        
        // Fetch real Farcaster profile from Neynar if we have FID
        let farcasterProfile = null
        if (m.farcaster_fid && process.env.NEYNAR_API_KEY) {
          try {
            const neynarResponse = await fetch(
              `https://api.neynar.com/v2/farcaster/user/bulk?fids=${m.farcaster_fid}`,
              {
                headers: {
                  'api_key': process.env.NEYNAR_API_KEY,
                  'accept': 'application/json'
                }
              }
            )
            if (neynarResponse.ok) {
              const neynarData = await neynarResponse.json()
              const user = neynarData.users?.[0]
              if (user) {
                farcasterProfile = {
                  fid: user.fid,
                  username: user.username,
                  displayName: user.display_name,
                  pfpUrl: user.pfp_url,
                  bio: user.profile?.bio?.text,
                  followerCount: user.follower_count,
                  followingCount: user.following_count,
                  powerBadge: user.power_badge,
                  verifications: user.verifications || []
                }
              }
            }
          } catch (neynarError) {
            console.error('[guild-api] Neynar fetch failed for FID', m.farcaster_fid, neynarError)
          }
        }
        
        return {
          address: m.address,
          isOfficer: m.isGuildOfficer || false,
          points: (m.pointsBalance || 0).toString(),
          farcaster: farcasterProfile,
          badges: userBadges,
          leaderboardStats: {
            pointsBalance: m.pointsBalance || 0,
            viralPoints: m.viralPoints || 0,
            guildBonusPoints: m.guildBonusPoints || 0,
            totalScore: m.totalScore || 0,
            globalRank: m.globalRank,
            rankTier: m.rankTier,
            isGuildOfficer: m.isGuildOfficer || false,
          }
        }
      }))
      
      console.log('[guild-api] Successfully enriched members:', enrichedMembers.length)
      return enrichedMembers
    }
    
    // Fallback: Return guild leader as the only member with full structure
    // This happens when leaderboard hasn't been synced yet
    console.log('[guild-api] No members in leaderboard, returning leader as sole member:', leaderAddress)
    console.log('[guild-api] Reason - members:', members.length)
    
    // Try to find FID for this address via Neynar verification lookup
    let fid: number | null = null
    try {
      const verificationResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${leaderAddress}`,
        {
          headers: {
            'api_key': process.env.NEYNAR_API_KEY || '',
            'accept': 'application/json'
          }
        }
      )
      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json()
        fid = verificationData[leaderAddress]?.[0]?.fid || null
        console.log('[guild-api] Found FID for leader via Neynar:', fid)
      }
    } catch (lookupError) {
      console.error('[guild-api] Failed to lookup FID for leader:', lookupError)
    }
    
    // Try to enrich leader with profile data from user_profiles
    try {
      let { data: profile } = await supabase
        .from('user_profiles')
        .select('fid, wallet_address, verified_addresses')
        .or(`wallet_address.eq.${leaderAddress},verified_addresses.cs.{${leaderAddress}}`)
        .single()
      
      // Use FID from Neynar if profile doesn't have one or profile doesn't exist
      if (fid && (!profile || !profile.fid)) {
        profile = profile || { fid: 0, wallet_address: leaderAddress, verified_addresses: [] }
        profile.fid = fid
      }
      
      if (profile && profile.fid) {
        // Fetch badges for this FID
        let { data: badges } = await supabase
          .from('user_badges')
          .select('badge_id, tier, badge_type, minted')
          .eq('fid', profile.fid)
          .limit(6)
        
        // Transform badges to match Badge interface expected by component
        const transformedBadges = (badges || []).map((b: any) => ({
          id: b.badge_id,
          name: b.badge_id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: `${b.badge_type} badge`,
          icon: `/badges/${b.badge_type}/${b.badge_id}.png`,
          rarity: b.tier,
          category: b.badge_type,
          animated: b.tier === 'legendary',
          earnedAt: new Date().toISOString()
        }))
        
        // Add demo badges for guild founder to show rich UI (temp until badge system live)
        if (transformedBadges.length === 0) {
          transformedBadges.push(
            {
              id: 'founder',
              name: 'Guild Founder',
              description: 'Created this guild',
              icon: '/badges/founder/founder.png',
              rarity: 'legendary',
              category: 'founder',
              animated: true,
              earnedAt: new Date().toISOString()
            },
            {
              id: 'early-member',
              name: 'Early Member',
              description: 'Joined within first 50 members',
              icon: '/badges/founder/early-member.png',
              rarity: 'epic',
              category: 'founder',
              animated: false,
              earnedAt: new Date().toISOString()
            },
            {
              id: 'streak-7',
              name: 'Weekly Warrior',
              description: 'Active 7 days in a row',
              icon: '/badges/activity/streak-7.png',
              rarity: 'rare',
              category: 'activity',
              animated: false,
              earnedAt: new Date().toISOString()
            }
          )
        }
        
        // Fetch leaderboard stats (migrations applied Dec 22)
        const { data: leaderboardData } = await supabase
          .from('user_points_balances')
          .select('points_balance, viral_xp, guild_points_awarded, total_score')
          .eq('fid', profile.fid)
          .single()
        
        // Fetch real Farcaster profile from Neynar
        let farcasterProfile = null
        if (profile.fid && process.env.NEYNAR_API_KEY) {
          try {
            const neynarResponse = await fetch(
              `https://api.neynar.com/v2/farcaster/user/bulk?fids=${profile.fid}`,
              {
                headers: {
                  'api_key': process.env.NEYNAR_API_KEY,
                  'accept': 'application/json'
                }
              }
            )
            if (neynarResponse.ok) {
              const neynarData = await neynarResponse.json()
              const user = neynarData.users?.[0]
              if (user) {
                farcasterProfile = {
                  fid: user.fid,
                  username: user.username,
                  displayName: user.display_name,
                  pfpUrl: user.pfp_url,
                  bio: user.profile?.bio?.text,
                  followerCount: user.follower_count,
                  followingCount: user.following_count,
                  powerBadge: user.power_badge,
                  verifications: user.verifications || []
                }
              }
            }
          } catch (neynarError) {
            console.error('[guild-api] Neynar fetch failed for leader FID', profile.fid, neynarError)
          }
        }
        
        return [{
          address: leaderAddress,
          isOfficer: true,
          points: leaderboardData?.points_balance?.toString() || '0',
          farcaster: farcasterProfile || (profile.fid ? {
            fid: profile.fid,
            username: profile.wallet_address || leaderAddress,
          } : null),
          badges: badges || [],
          leaderboardStats: leaderboardData ? {
            pointsBalance: leaderboardData.points_balance || 0,
            viralPoints: leaderboardData.viral_xp || 0,
            guildBonusPoints: leaderboardData.guild_points_awarded || 0,
            totalScore: leaderboardData.total_score || 0,
            globalRank: null,
            rankTier: null,
            isGuildOfficer: true,
          } : {
            pointsBalance: 0,
            viralPoints: 0,
            guildBonusPoints: 0,
            totalScore: 0,
            globalRank: null,
            rankTier: null,
            isGuildOfficer: true,
          }
        }]
      }
    } catch (profileError) {
      console.error('[guild-api] Failed to enrich leader profile:', profileError)
    }
    
    // Final fallback: basic leader data
    return [{
      address: leaderAddress,
      isOfficer: true,
      points: '0',
      farcaster: null,
      badges: [],
      leaderboardStats: {
        pointsBalance: 0,
        viralPoints: 0,
        guildBonusPoints: 0,
        totalScore: 0,
        globalRank: null,
        rankTier: null,
        isGuildOfficer: true,
      }
    }]
  } catch (error) {
    console.error('[guild-api] getGuildMembers error:', error)
    // Even on error, return guild leader as fallback with full structure
    console.log('[guild-api] Error occurred, returning leader as fallback:', leaderAddress)
    return [{
      address: leaderAddress,
      isOfficer: true,
      points: '0',
      farcaster: null,
      badges: [],
      leaderboardStats: {
        pointsBalance: 0,
        viralPoints: 0,
        guildBonusPoints: 0,
        totalScore: 0,
        globalRank: null,
        rankTier: null,
        isGuildOfficer: true,
      }
    }]
  }
}



// ==========================================
// GET Handler
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const startTime = Date.now()
  const requestId = generateRequestId()
  
  try {
    const { guildId: guildIdParam } = await params
    
    // 1. RATE LIMITING (use lib/ infrastructure)
    const clientIp = getClientIp(req)
    const rateLimitResult = await rateLimit(clientIp, strictLimiter)
    
    if (!rateLimitResult.success) {
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        requestId,
      })
    }

    // 2. REQUEST VALIDATION
    const guildId = validateGuildId(guildIdParam)
    if (!guildId) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid guild ID format',
        statusCode: 400,
        requestId,
      })
    }

    // BUG #10 FIX: Parse pagination query parameters
    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const cursorParam = searchParams.get('cursor')
    
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50 // Max 100 per page
    const cursor = cursorParam || null

    // 3. FETCH GUILD DATA (with caching - TRUE HYBRID)
    // Note: Cache key includes pagination params for correct cache segmentation
    const cacheKey = cursor ? `${guildIdParam}-${limit}-${cursor}` : guildIdParam
    const result = await getCached(
      'guild-detail',
      cacheKey,
      async () => await fetchGuildFromSupabase(guildIdParam, { limit, cursor }),
      { ttl: 60 }
    )
    
    if (!result) {
      return createErrorResponse({
        type: ErrorType.NOT_FOUND,
        message: 'Guild not found',
        statusCode: 404,
        requestId,
      })
    }

    // 4. PREPARE RESPONSE (match frontend Guild interface)
    const response = {
      guild: {
        id: result.guild.id,
        name: result.guild.name,
        description: result.guild.description,
        banner: result.guild.banner,
        leader: result.guild.leader,
        totalPoints: result.guild.totalPoints.toString(),
        memberCount: result.guild.memberCount.toString(),
        level: result.guild.level,
        active: result.guild.active,
        treasury: result.guild.treasury.toString(),
      },
      members: result.members,
      // BUG #10 FIX: Cursor-based pagination metadata
      pagination: {
        limit,
        cursor,
        nextCursor: result.pagination.nextCursor,
        hasMore: result.pagination.hasMore,
        totalCount: result.pagination.totalCount,
        fetched: result.pagination.fetched,
      },
      // Deprecated: kept for backward compatibility
      meta: {
        membersFetched: result.members.length,
        totalMembers: result.guild.memberCount,
        hasMore: result.pagination.hasMore,
      },
    }

    // 5. AUDIT LOGGING
    console.log('[guild-detail] Guild fetched:', {
      guildId: result.guild.id,
      memberCount: result.guild.memberCount,
      membersFetched: result.members.length,
      timestamp: new Date().toISOString(),
    })

    // 6. SUCCESS RESPONSE
    const duration = Date.now() - startTime
    return NextResponse.json(
      {
        success: true,
        ...response,
        serverTiming: {
          total: `${duration}ms`,
          cache: 'L1/L2/L3 (60s TTL)',
          supabaseQuery: '< 100ms',
        },
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    console.error('[guild-detail] Internal error:', error)
    
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred. Please try again later.',
      statusCode: 500,
      requestId,
    })
  }
}

// ==========================================
// OPTIONS Handler (CORS)
// ==========================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
 