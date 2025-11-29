import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { getFarcasterFid } from '@/lib/auth/farcaster'

/**
 * Check onboarding status for current user
 * GET /api/user/onboarding-status?fid=123
 * 
 * Supports FID from:
 * 1. Query param (for miniapp context)
 * 2. Auth session/headers (for standard auth)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured', onboarded: false },
        { status: 500 }
      )
    }

    // Get FID from query param or auth
    const { searchParams } = new URL(request.url)
    const queryFid = searchParams.get('fid')
    const authFid = await getFarcasterFid(request)
    
    const fid = queryFid ? Number(queryFid) : authFid
    
    if (!fid || !Number.isFinite(fid) || fid <= 0) {
      return NextResponse.json(
        { error: 'Invalid or missing FID', onboarded: false },
        { status: 400 }
      )
    }

    // Check if user has onboarded_at timestamp
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('onboarded_at, fid, username')
      .eq('fid', fid)
      .single()

    if (profileError) {
      return NextResponse.json(
        { error: 'Profile not found', onboarded: false },
        { status: 404 }
      )
    }

    return NextResponse.json({
      onboarded: profile.onboarded_at !== null,
      onboardedAt: profile.onboarded_at,
      fid: profile.fid,
      username: profile.username,
    })
  } catch (error) {
    console.error('Onboarding status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error', onboarded: false },
      { status: 500 }
    )
  }
}
