import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Check onboarding status for current user
 * GET /api/user/onboarding-status
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

    // Get current user (from session or Farcaster context)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', onboarded: false },
        { status: 401 }
      )
    }

    // Check if user has onboarded_at timestamp
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('onboarded_at, fid, username')
      .eq('fid', user.id)
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
