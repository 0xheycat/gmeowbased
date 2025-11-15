import { NextResponse } from 'next/server'
import { getNeynarServerClient } from '@/lib/neynar-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/neynar/score?fid=123
 * Fetch Neynar score for a given FID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fid = searchParams.get('fid')

    if (!fid) {
      return NextResponse.json(
        { error: 'Missing fid parameter' },
        { status: 400 }
      )
    }

    const fidNumber = parseInt(fid, 10)
    if (isNaN(fidNumber)) {
      return NextResponse.json(
        { error: 'Invalid fid parameter' },
        { status: 400 }
      )
    }

    const neynarClient = getNeynarServerClient()

    // Fetch user score from Neynar
    // Using the fetchBulkUsers endpoint to get user details
    const userBulk = await neynarClient.fetchBulkUsers({ fids: [fidNumber] })
    
    if (!userBulk?.users?.[0]) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = userBulk.users[0]
    
    // Calculate a simple influence score based on:
    // - Follower count
    // - Following count (engagement)
    // - Power badge (verified status)
    const followerCount = user.follower_count || 0
    const followingCount = user.following_count || 0
    const hasPowerBadge = user.power_badge || false

    // Normalized score (0 to 1.0+)
    // - 1000+ followers = 0.5 base
    // - Power badge = +0.3
    // - Engagement ratio = +0.2
    let score = Math.min(followerCount / 2000, 0.5)
    if (hasPowerBadge) score += 0.3
    
    const engagementRatio = followingCount > 0 ? followerCount / followingCount : 0
    if (engagementRatio > 2) score += 0.2
    else if (engagementRatio > 1) score += 0.1

    return NextResponse.json({
      fid: fidNumber,
      score: Math.round(score * 100) / 100, // Round to 2 decimals
      followerCount,
      followingCount,
      powerBadge: hasPowerBadge,
    })
  } catch (error) {
    console.error('Error fetching Neynar score:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score', score: 0 },
      { status: 500 }
    )
  }
}
