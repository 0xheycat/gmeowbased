import { NextResponse } from 'next/server'
import { getUserBadges } from '@/lib/badges'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'

export const dynamic = 'force-dynamic'

/**
 * GET /api/badges/list?fid=123
 * Get all badges assigned to a user
 */
export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const fid = searchParams.get('fid')

    if (!fid) {
      return NextResponse.json(
        { success: false, error: 'Missing fid parameter' },
        { status: 400 }
      )
    }

    const fidNumber = parseInt(fid, 10)
    const validation = FIDSchema.safeParse(fidNumber)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid fid parameter', details: validation.error.issues },
        { status: 400 }
      )
    }

    const badges = await getUserBadges(fidNumber)

    return NextResponse.json({
      success: true,
      fid: fidNumber,
      badges,
      count: badges.length,
    })
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user badges' 
      },
      { status: 500 }
    )
  }
}
