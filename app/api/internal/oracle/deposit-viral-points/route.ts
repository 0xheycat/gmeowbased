/**
 * Internal API: Viral XP Deposits
 * Called by cron job to automatically deposit viral XP
 */

import { NextResponse } from 'next/server'
import { ethers } from 'ethers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCORING_MODULE_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_SCORING!
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!

const SCORING_ABI = [
  'function setViralPoints(address user, uint256 points) external',
  'function getStats(address user) external view returns (uint256 scoringPointsBalance, uint256 viralPoints, uint256 questPoints, uint256 guildPoints, uint256 referralPoints, uint256 totalScore)'
]

export async function POST() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org')
    const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider)
    const scoring = new ethers.Contract(SCORING_MODULE_ADDRESS, SCORING_ABI, wallet)

    // Query Subsquid for viral XP data
    const response = await fetch('https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          users(where: { viralXp_gt: 0 }, limit: 100) {
            id
            viralXp
          }
        }`
      })
    })

    const { data } = await response.json()
    const deposits = []

    // Deposit viral XP for each user
    for (const user of data.users || []) {
      const userAddress = user.id
      const viralXp = user.viralXp || 0

      if (viralXp > 0) {
        // Check current on-chain value
        const stats = await scoring.getStats(userAddress)
        const currentViralPoints = Number(stats.viralPoints)

        // Only deposit if different
        if (currentViralPoints !== viralXp) {
          const tx = await scoring.setViralPoints(userAddress, viralXp)
          await tx.wait()
          deposits.push({ address: userAddress, viralXp, tx: tx.hash })
        }
      }
    }

    return NextResponse.json({
      success: true,
      deposited: deposits.length,
      deposits
    })
  } catch (error) {
    console.error('[Viral Oracle] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
