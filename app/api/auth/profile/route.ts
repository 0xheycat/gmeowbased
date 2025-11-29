import { NextRequest, NextResponse } from 'next/server'
import { getFarcasterFid } from '@/lib/auth/farcaster'
import { fetchUserByFid } from '@/lib/neynar'
import { getSupabaseServerClient } from '@/lib/supabase-server'

/**
 * User Profile Auto-Creation API
 * 
 * POST /api/auth/profile - Create user profile from Neynar data
 * GET /api/auth/profile - Get profile (with auto-creation)
 * 
 * Tier Calculation (based on Neynar Score 0.0-1.0+):
 * - mythic: >0.9 (OG NFT eligible)
 * - legendary: 0.7-0.9
 * - epic: 0.5-0.7
 * - rare: 0.3-0.5
 * - common: <0.3
 * 
 * Source: Reused from old foundation with improved tier logic
 * MCP Verified: January 12, 2025
 * Quality Gates: GI-7, GI-8, GI-11
 */

interface ProfileData {
  fid: number
  username: string | null
  display_name: string | null
  pfp_url: string | null
  bio: string | null
  neynar_score: number | null
  neynar_tier: string
  og_nft_eligible: boolean
}

/**
 * Calculate tier from Neynar score
 */
function calculateTier(score: number | null): string {
  if (!score || score < 0) return 'common'
  if (score >= 0.9) return 'mythic'
  if (score >= 0.7) return 'legendary'
  if (score >= 0.5) return 'epic'
  if (score >= 0.3) return 'rare'
  return 'common'
}

/**
 * Create user profile from Neynar data
 */
async function createProfileFromNeynar(fid: number): Promise<ProfileData | null> {
  try {
    // Fetch user data from Neynar
    const user = await fetchUserByFid(fid)

    if (!user) {
      console.error(`Failed to fetch Neynar data for FID ${fid}`)
      return null
    }

    // Calculate tier
    const tier = calculateTier(user.neynarScore ?? null)
    const ogEligible = tier === 'mythic'

    // Get Supabase client
    const supabase = getSupabaseServerClient()

    if (!supabase) {
      console.error('Supabase client not available')
      return null
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('fid', fid)
      .single()

    if (existingProfile) {
      console.log(`Profile already exists for FID ${fid}`)
      return existingProfile as ProfileData
    }

    // Create new profile
    const profileData: ProfileData = {
      fid,
      username: user.username || null,
      display_name: user.displayName || null,
      pfp_url: user.pfpUrl || null,
      bio: user.bio || null,
      neynar_score: user.neynarScore || null,
      neynar_tier: tier,
      og_nft_eligible: ogEligible
    }

    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create profile:', error)
      return null
    }

    console.log(`Created profile for FID ${fid} with tier ${tier}`)
    return newProfile as ProfileData

  } catch (error) {
    console.error('Profile creation error:', error)
    return null
  }
}

/**
 * Create user profile (manual)
 * POST /api/auth/profile
 */
export async function POST(request: NextRequest) {
  try {
    // Get FID from auth
    const fid = await getFarcasterFid(request)

    if (!fid) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Create profile
    const profile = await createProfileFromNeynar(fid)

    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile
    })

  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get user profile (with auto-creation)
 * GET /api/auth/profile?fid=123
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryFid = searchParams.get('fid')

    // Get FID from query or auth
    const authFid = await getFarcasterFid(request)
    const fid = queryFid ? Number(queryFid) : authFid

    if (!fid) {
      return NextResponse.json(
        { error: 'FID required' },
        { status: 400 }
      )
    }

    // Get Supabase client
    const supabase = getSupabaseServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      )
    }

    // Try to get existing profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('fid', fid)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        profile: existingProfile
      })
    }

    // Auto-create profile if doesn't exist
    const newProfile = await createProfileFromNeynar(fid)

    if (!newProfile) {
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      profile: newProfile,
      created: true
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
