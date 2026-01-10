/**
 * API Route: /api/score/[address]
 * 
 * Purpose: Provide user scoring data for XP celebration overlays
 * Phase: XP Overlay On-Chain Migration (Jan 10, 2026)
 * 
 * Returns:
 * - totalScore: Number (from ScoringModule.getUserStats)
 * - progress: RankProgress object (tier, level, xp details)
 * 
 * Used by:
 * - components/XPEventOverlay.tsx (fetches real-time scoring data)
 * - All XP celebration flows (badge claim, quest complete, guild join, etc.)
 * 
 * Architecture:
 * - Layer 1: ScoringModule contract (source of truth)
 * - Layer 2: Subsquid indexer (primary, ~100ms latency)
 * - Layer 3: RPC fallback (~5s latency)
 * - Layer 4: Filesystem cache (5min TTL)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAddress } from 'viem'
import { getUserStats, getLevelProgressOnChain, getRankProgressOnChain } from '@/lib/contracts/scoring-module'

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params
    const { searchParams } = new URL(request.url)
    const chain = searchParams.get('chain') || 'base'

    // Validate address
    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address' },
        { status: 400 }
      )
    }

    // Only Base chain supported for ScoringModule
    if (chain !== 'base') {
      return NextResponse.json(
        { error: 'Only Base chain is supported' },
        { status: 400 }
      )
    }

    // Fetch on-chain data from ScoringModule
    // Uses Subsquid (primary) with RPC fallback, cached for 5min
    const [stats, levelProgress, rankProgress] = await Promise.all([
      getUserStats(address),
      getLevelProgressOnChain(address),
      getRankProgressOnChain(address)
    ])

    // Convert totalScore from BigInt to Number for JSON serialization
    const totalScore = Number(stats.totalScore)

    // Return format matches what XPEventOverlay expects
    return NextResponse.json({
      totalScore,
      progress: {
        level: levelProgress.level,
        tier: stats.rankTier,
        xpIntoLevel: Number(levelProgress.xpIntoLevel),
        xpForLevel: Number(levelProgress.xpForLevel),
        xpToNextLevel: Number(levelProgress.xpToNextLevel),
        progressPercent: levelProgress.progressPercent,
        tierIndex: rankProgress.tierIndex,
        pointsIntoTier: Number(rankProgress.pointsIntoTier),
        pointsToNext: Number(rankProgress.pointsToNext),
        hasMultiplier: rankProgress.hasMultiplier,
      }
    })

  } catch (error) {
    console.error('[API /api/score/[address]] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch scoring data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
