import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'

/**
 * GET /api/onboard/status
 * Check if a user has completed onboarding
 * Query param: fid (required)
 */
export const GET = withErrorHandler(async (request: Request) => {
  const requestId = generateRequestId()
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const { searchParams } = new URL(request.url)
    const fid = searchParams.get('fid')

    if (!fid) {
      return NextResponse.json({
        onboarded: false,
        message: 'FID required'
      }, { headers: { 'X-Request-ID': requestId } })
    }

    // Validate FID
    const fidNumber = parseInt(fid)
    const validation = FIDSchema.safeParse(fidNumber)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid FID format', details: validation.error.issues },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      return NextResponse.json({ onboarded: false }, { headers: { 'X-Request-ID': requestId } })
    }

    // Check if user has onboarding record
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('onboarded_at, neynar_tier')
      .eq('fid', parseInt(fid))
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ onboarded: false }, { headers: { 'X-Request-ID': requestId } })
    }

    return NextResponse.json({
      onboarded: !!profile.onboarded_at,
      tier: profile.neynar_tier || 'common',
      onboardedAt: profile.onboarded_at,
    }, {
      headers: { 
        'X-Request-ID': requestId,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    })
})
