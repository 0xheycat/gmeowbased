/**
 * Infrastructure Verification Test Endpoint
 * Tests: Subsquid + Supabase + Unified Calculator integration
 * 
 * Usage: GET /api/test-infrastructure
 * Expected: All validation checks pass (allSystemsGo: true)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOnChainUserStats } from '@/lib/subsquid-client'
import { calculateCompleteStats } from '@/lib/scoring/unified-calculator'

export async function GET(request: NextRequest) {
  const testFID = 18139 // heycat - known user with multi-wallet
  
  try {
    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 2: Get profile with multi-wallet fields
    // ═══════════════════════════════════════════════════════════════════════
    const supabase = createClient()
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('fid, wallet_address, verified_addresses, custody_address, created_at')
      .eq('fid', testFID)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        detail: profileError?.message 
      }, { status: 404 })
    }
    
    // UPDATE #1: Multi-wallet aggregation
    const allWallets = [
      profile.wallet_address,
      profile.custody_address,
      ...(profile.verified_addresses || [])
    ].filter(Boolean)
    
    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 1: Get on-chain data for all wallets using NEW function
    // ═══════════════════════════════════════════════════════════════════════
    const onChainResults = await Promise.all(
      allWallets.map(async (wallet) => {
        try {
          return await getOnChainUserStats(wallet) // ✅ NEW FUNCTION
        } catch (err) {
          console.error(`[Test] Failed to get stats for ${wallet}:`, err)
          return null
        }
      })
    )
    
    const validResults = onChainResults.filter(r => r !== null)
    const totalPoints = validResults.reduce((sum, r) => sum + (r?.pointsBalance || 0), 0)
    
    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 3: Calculate with unified calculator
    // ═══════════════════════════════════════════════════════════════════════
    const stats = calculateCompleteStats({
      blockchainPoints: totalPoints,
      viralXP: 0, // Not testing viral XP in this endpoint
      memberSince: profile.created_at || new Date().toISOString()
    })
    
    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICATION RESPONSE
    // ═══════════════════════════════════════════════════════════════════════
    return NextResponse.json({
      test: 'Infrastructure Verification (Dec 22, 2025)',
      timestamp: new Date().toISOString(),
      
      layers: {
        layer1_subsquid: {
          function: 'getOnChainUserStats()', // ✅ NEW FUNCTION
          walletsChecked: allWallets.length,
          walletsSuccessful: validResults.length,
          totalPoints: totalPoints,
          sampleWallet: allWallets[0],
          sampleData: validResults[0] ? {
            pointsBalance: validResults[0].pointsBalance,
            currentStreak: validResults[0].currentStreak,
            lifetimeGMs: validResults[0].lifetimeGMs
          } : null
        },
        
        layer2_supabase: {
          profileFound: true,
          fid: profile.fid,
          hasMultiWallet: allWallets.length > 1,
          walletCount: allWallets.length,
          wallets: allWallets,
          fields: {
            wallet_address: !!profile.wallet_address,
            custody_address: !!profile.custody_address,
            verified_addresses: Array.isArray(profile.verified_addresses)
          }
        },
        
        layer3_calculator: {
          function: 'calculateCompleteStats()',
          level: stats.level,
          rank: stats.rank,
          totalScore: stats.totalScore,
          pointsToNextLevel: stats.pointsToNextLevel
        }
      },
      
      validation: {
        subsquidWorking: validResults.length > 0,
        multiWalletWorking: allWallets.length > 1,
        calculatorWorking: stats.level > 0,
        allSystemsGo: validResults.length > 0 && allWallets.length > 1 && stats.level > 0
      },
      
      updates: {
        update1_multiWallet: allWallets.length > 1 ? '✅ WORKING' : '❌ FAILED',
        update2_unifiedCalculator: stats.level > 0 ? '✅ WORKING' : '❌ FAILED'
      }
    })
    
  } catch (error: any) {
    console.error('[Test Infrastructure] Error:', error)
    return NextResponse.json({
      error: 'Infrastructure test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
