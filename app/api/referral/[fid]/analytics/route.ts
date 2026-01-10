/**
 * GET /api/referral/[fid]/analytics
 * 
 * Purpose: Fetch referral analytics data for performance tracking
 * Returns referral timeline, metrics, and performance stats
 * 
 * Response: { success, data: { timeline, metrics, comparison } }
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  const resolvedParams = await params
  const fid = parseInt(resolvedParams.fid)

  if (isNaN(fid) || fid <= 0) {
    return NextResponse.json(
      { success: false, error: 'Invalid FID' },
      { status: 400 }
    )
  }

  try {
    // Return mock analytics data for now
    // TODO: Implement actual analytics from Subsquid
    const now = new Date()
    const timeline = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (29 - i))
      return {
        date: date.toISOString().split('T')[0],
        referrals: Math.floor(Math.random() * 5),
        points: Math.floor(Math.random() * 100),
      }
    })

    const totalReferrals = timeline.reduce((sum, day) => sum + day.referrals, 0)

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        metrics: {
          totalReferrals,
          conversionRate: totalReferrals > 0 ? 65 : 0,
          averageTimeToConvert: 60,
          growthRate: 15,
          peakDay: {
            date: timeline.reduce((max, day) => 
              day.referrals > max.referrals ? day : max
            ).date,
            count: timeline.reduce((max, day) => 
              day.referrals > max.referrals ? day : max
            ).referrals,
          },
        },
        tierDistribution: {
          bronze: Math.floor(totalReferrals * 0.6),
          silver: Math.floor(totalReferrals * 0.3),
          gold: Math.floor(totalReferrals * 0.1),
        },
        comparison: {
          thisWeek: timeline.slice(-7).reduce((sum, day) => sum + day.referrals, 0),
          lastWeek: timeline.slice(-14, -7).reduce((sum, day) => sum + day.referrals, 0),
          thisMonth: totalReferrals,
          lastMonth: Math.floor(totalReferrals * 0.8),
        },
      },
      fid,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Referral Analytics]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
