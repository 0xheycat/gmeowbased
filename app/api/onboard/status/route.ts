import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/onboard/status
 * Check if the current user has completed onboarding
 */
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json({ onboarded: false })
    }
    
    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ onboarded: false })
    }

    // Check if user has onboarding record
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('onboarded_at, neynar_tier')
      .eq('fid', user.user_metadata?.fid)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ onboarded: false })
    }

    return NextResponse.json({
      onboarded: !!profile.onboarded_at,
      tier: profile.neynar_tier || 'common',
      onboardedAt: profile.onboarded_at,
    })
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return NextResponse.json({ onboarded: false })
  }
}
