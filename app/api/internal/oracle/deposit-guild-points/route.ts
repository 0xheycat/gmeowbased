/**
 * Internal API: Guild Bonus Deposits
 * Called by cron job to automatically deposit guild bonuses
 */

import { NextResponse } from 'next/server'
import { ethers } from 'ethers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCORING_MODULE_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_SCORING!
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!

const SCORING_ABI = [
  'function addGuildPoints(address user, uint256 points) external',
  'function getStats(address user) external view returns (uint256 scoringPointsBalance, uint256 viralPoints, uint256 questPoints, uint256 guildPoints, uint256 referralPoints, uint256 totalScore)'
]

export async function POST() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org')
    const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider)
    const scoring = new ethers.Contract(SCORING_MODULE_ADDRESS, SCORING_ABI, wallet)

    // Query Subsquid for guild data
    const response = await fetch('https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          guildMembers(limit: 100) {
            id
            user { id }
            guild { id treasuryPoints }
            role
            pointsContributed
          }
        }`
      })
    })

    const { data } = await response.json()
    const deposits = []

    // Calculate bonuses for each member
    for (const member of data.guildMembers || []) {
      const userAddress = member.user.id
      const treasury = member.guild.treasuryPoints || 0
      const roleMultiplier = member.role === 'leader' ? 2.0 : member.role === 'officer' ? 1.5 : 1.0
      const bonus = Math.floor(treasury * roleMultiplier)

      if (bonus > 0) {
        // Check current on-chain value
        const stats = await scoring.getStats(userAddress)
        const currentGuildPoints = Number(stats.guildPoints)

        // Only deposit if different
        if (currentGuildPoints !== bonus) {
          const tx = await scoring.addGuildPoints(userAddress, bonus)
          await tx.wait()
          deposits.push({ address: userAddress, bonus, tx: tx.hash })
        }
      }
    }

    return NextResponse.json({
      success: true,
      deposited: deposits.length,
      deposits
    })
  } catch (error) {
    console.error('[Guild Oracle] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
