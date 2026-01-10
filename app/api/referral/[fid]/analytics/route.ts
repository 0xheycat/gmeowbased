/**
 * GET /api/referral/[fid]/analytics
 * 
 * Purpose: Fetch referral analytics data for performance tracking
 * Returns referral timeline, metrics, and performance stats from Subsquid
 * 
 * Response: { success, data: { timeline, metrics, comparison } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { getReferrerHistory } from '@/lib/subsquid-client'

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
    // Get wallet address from Supabase
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_address')
      .eq('fid', fid)
      .single()

    if (!profile?.wallet_address) {
      return NextResponse.json({
        success: true,
        data: {
          timeline: [],
          metrics: {
            totalReferrals: 0,
            conversionRate: 0,
            averageTimeToConvert: 0,
            growthRate: 0,
            peakDay: {
              date: new Date().toISOString().split('T')[0],
              count: 0,
            },
          },
          tierDistribution: {
            bronze: 0,
            silver: 0,
            gold: 0,
          },
          comparison: {
            thisWeek: 0,
            lastWeek: 0,
            thisMonth: 0,
            lastMonth: 0,
          },
        },
        fid,
        timestamp: new Date().toISOString(),
      })
    }

    // Get referral history from Subsquid
    const referralHistory = await getReferrerHistory(profile.wallet_address, 1000)
    
    // Build 30-day timeline
    const now = new Date()
    const timelineMap = new Map<string, { referrals: number; points: number }>()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - (29 - i))
      const dateKey = date.toISOString().split('T')[0]
      timelineMap.set(dateKey, { referrals: 0, points: 0 })
    }
    
    // Populate timeline with real data
    for (const ref of referralHistory) {
      const refDate = new Date(Number(ref.timestamp) * 1000).toISOString().split('T')[0]
      if (timelineMap.has(refDate)) {
        const day = timelineMap.get(refDate)!
        day.referrals += 1
        day.points += 50 // Referrer bonus
      }
    }
    
    const timeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      referrals: data.referrals,
      points: data.points,
    }))
    
    // Calculate metrics
    const totalReferrals = referralHistory.length
    const thisWeek = timeline.slice(-7).reduce((sum, day) => sum + day.referrals, 0)
    const lastWeek = timeline.slice(-14, -7).reduce((sum, day) => sum + day.referrals, 0)
    
    const growthRate = lastWeek > 0 
      ? Number(((thisWeek - lastWeek) / lastWeek * 100).toFixed(1))
      : 0
    
    const peakDayData = timeline.reduce((max, day) => 
      day.referrals > max.referrals ? day : max
    , timeline[0])

    return NextResponse.json({
      success: true,
      data: {
        timeline,
        metrics: {
          totalReferrals: Number(totalReferrals),
          conversionRate: 0, // Not tracked yet
          averageTimeToConvert: 0, // Not tracked yet
          growthRate: Number(growthRate),
          peakDay: {
            date: String(peakDayData.date),
            count: Number(peakDayData.referrals),
          },
        },
        tierDistribution: {
          bronze: totalReferrals >= 1 && totalReferrals < 5 ? 1 : 0,
          silver: totalReferrals >= 5 && totalReferrals < 10 ? 1 : 0,
          gold: totalReferrals >= 10 ? 1 : 0,
        },
        comparison: {
          thisWeek,
          lastWeek,
          thisMonth: totalReferrals,
          lastMonth: 0, // Would need historical data
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
