/**
 * Rewards Claim History API
 * 
 * GET /api/rewards/history?address=0x...
 * 
 * Returns all reward claims for a wallet address
 * 
 * Created: December 20, 2025
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      )
    }
    
    const supabase = createClient()
    
    const { data: claims, error } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .order('claimed_at', { ascending: false } as any)
      .limit(50) as any
    
    if (error) {
      console.error('[Claim History] Error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch claim history' },
        { status: 500 }
      )
    }
    
    // Calculate totals
    const totalClaimed = claims?.reduce((sum: number, claim: any) => sum + claim.total_claimed, 0) || 0
    const claimCount = claims?.length || 0
    
    return NextResponse.json({
      claims: claims || [],
      total_claimed: totalClaimed,
      claim_count: claimCount,
    })
    
  } catch (error) {
    console.error('[Claim History] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
