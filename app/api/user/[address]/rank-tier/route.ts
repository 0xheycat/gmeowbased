/**
 * GET /api/user/[address]/rank-tier
 * 
 * Purpose: Get user's rank tier and multiplier from ScoringModule
 * Method: GET
 * Auth: Public (read-only)
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "tier": number (0-11),
 *   "tierName": string (e.g., "Platinum"),
 *   "multiplier": number (e.g., 1.3),
 *   "nextTier": string | null,
 *   "nextMultiplier": number | null
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { type Address } from 'viem'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { GM_CONTRACT_ABI } from '@/lib/contracts/abis'

// ==========================================
// Rank Tier Mapping (from ScoringModule.sol)
// ==========================================

const TIER_MAP: Record<number, { name: string; multiplier: number }> = {
  0: { name: 'Rookie', multiplier: 1.0 },
  1: { name: 'Bronze', multiplier: 1.05 },
  2: { name: 'Silver', multiplier: 1.1 },
  3: { name: 'Gold', multiplier: 1.15 },
  4: { name: 'Platinum', multiplier: 1.3 },
  5: { name: 'Diamond', multiplier: 1.5 },
  6: { name: 'Master', multiplier: 1.75 },
  7: { name: 'Grandmaster', multiplier: 2.0 },
  8: { name: 'Challenger', multiplier: 2.5 },
  9: { name: 'Legend', multiplier: 3.0 },
  10: { name: 'Mythic', multiplier: 4.0 },
  11: { name: 'Immortal', multiplier: 5.0 },
}

// ==========================================
// Main Handler
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid wallet address format'
        },
        { status: 400 }
      )
    }

    const client = getPublicClient()
    
    // Query ScoringModule for user's rank tier
    const rankTier = await client.readContract({
      address: STANDALONE_ADDRESSES.base.scoringModule as Address,
      abi: GM_CONTRACT_ABI,
      functionName: 'userRankTier',
      args: [address as Address],
    }) as number
    
    // Get tier info
    const tierInfo = TIER_MAP[rankTier] || TIER_MAP[0]
    const nextTierInfo = rankTier < 11 ? TIER_MAP[rankTier + 1] : null

    return NextResponse.json({
      success: true,
      tier: rankTier,
      tierName: tierInfo.name,
      multiplier: tierInfo.multiplier,
      nextTier: nextTierInfo?.name || null,
      nextMultiplier: nextTierInfo?.multiplier || null,
    })

  } catch (error: any) {
    console.error('[rank-tier] Error:', error)
    
    // If contract call fails, return default tier
    return NextResponse.json({
      success: true,
      tier: 0,
      tierName: 'Rookie',
      multiplier: 1.0,
      nextTier: 'Bronze',
      nextMultiplier: 1.05,
    })
  }
}
