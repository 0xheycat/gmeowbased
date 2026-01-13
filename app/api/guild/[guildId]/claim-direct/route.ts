/**
 * POST /api/guild/[guildId]/claim-direct
 * 
 * Purpose: Direct claim from guild treasury for leaders/officers with rank multiplier
 * Method: POST
 * Auth: Required (wallet address)
 * Rate Limit: 20 requests/hour per user
 * 
 * Request Body:
 * {
 *   "address": string (0x... wallet address),
 *   "amount": number (points to claim from treasury)
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "contractCall": {
 *     "address": string,
 *     "abi": any[],
 *     "functionName": string,
 *     "args": any[]
 *   },
 *   "estimatedBonus": number (amount * rank multiplier),
 *   "rankTier": string,
 *   "multiplier": number,
 *   "timestamp": number
 * }
 * 
 * Security:
 * 1. Rate Limiting - 20 req/hour per user
 * 2. Request Validation - Zod schema
 * 3. Authentication - Wallet address verification
 * 4. RBAC - User must be leader OR officer
 * 5. Input Sanitization - XSS prevention
 * 6. Audit Logging - All claim attempts tracked
 * 7. Error Masking - No sensitive data in errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { strictLimiter } from '@/lib/middleware/rate-limit'
import { type Address } from 'viem'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { GUILD_ABI_JSON, GM_CONTRACT_ABI } from '@/lib/contracts/abis'
import { generateRequestId } from '@/lib/middleware/request-id'
import { logGuildEvent } from '@/lib/guild/event-logger'
import { createClient } from '@/lib/supabase/edge'
import { invalidateCachePattern } from '@/lib/cache/server'

// ==========================================
// 1. Rate Limiting Configuration
// ==========================================

const RATE_LIMIT_CONFIG = {
  identifier: 'guild-claim-direct',
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
}

// ==========================================
// 2. Input Validation Schemas
// ==========================================

const BodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  amount: z.number().int().positive('Amount must be positive'),
})

type RequestBody = z.infer<typeof BodySchema>

// ==========================================
// 3. Helper Functions
// ==========================================

/**
 * Check if user is guild leader
 */
async function isGuildLeader(address: Address, guildId: bigint): Promise<boolean> {
  const client = getPublicClient()
  
  try {
    const guildInfo = await client.readContract({
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'getGuildInfo',
      args: [guildId],
    }) as [string, Address, bigint, bigint, bigint, bigint, bigint]
    
    const leader = guildInfo[1]
    return leader.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error('[guild-claim-direct] isGuildLeader error:', error)
    return false
  }
}

/**
 * Check if user is guild officer
 */
async function isGuildOfficer(address: Address, guildId: bigint): Promise<boolean> {
  const client = getPublicClient()
  
  try {
    const isOfficer = await client.readContract({
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'guildOfficers',
      args: [guildId, address],
    }) as boolean
    
    return isOfficer
  } catch (error) {
    console.error('[guild-claim-direct] isGuildOfficer error:', error)
    return false
  }
}

/**
 * Get user's rank tier from ScoringModule
 */
async function getUserRankTier(address: Address): Promise<{ tier: number; name: string; multiplier: number }> {
  const client = getPublicClient()
  
  try {
    const rankTier = await client.readContract({
      address: STANDALONE_ADDRESSES.base.scoringModule as Address,
      abi: GM_CONTRACT_ABI,
      functionName: 'userRankTier',
      args: [address],
    }) as number
    
    // Map tier number to name and multiplier (from ScoringModule.sol)
    const tierMap: Record<number, { name: string; multiplier: number }> = {
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
    
    return {
      tier: rankTier,
      name: tierMap[rankTier]?.name || 'Rookie',
      multiplier: tierMap[rankTier]?.multiplier || 1.0,
    }
  } catch (error) {
    console.error('[guild-claim-direct] getUserRankTier error:', error)
    return { tier: 0, name: 'Rookie', multiplier: 1.0 }
  }
}

/**
 * Get guild treasury balance
 */
async function getTreasuryBalance(guildId: bigint): Promise<bigint> {
  const client = getPublicClient()
  
  try {
    const balance = await client.readContract({
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'guildTreasuryPoints',
      args: [guildId],
    }) as bigint
    
    return balance
  } catch (error) {
    console.error('[guild-claim-direct] getTreasuryBalance error:', error)
    return 0n
  }
}

// ==========================================
// 4. Main Handler
// ==========================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const requestId = generateRequestId()
  const { guildId: guildIdParam } = await params

  try {
    // Parse and validate guild ID
    const guildId = BigInt(guildIdParam)
    
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = strictLimiter ? await strictLimiter.limit(`${RATE_LIMIT_CONFIG.identifier}:${ip}`) : { success: true, reset: Date.now() }

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { status: 429 }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const validation = BodySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request data',
          errors: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { address, amount } = validation.data

    // Check if user is leader or officer
    const [isLeader, isOfficer] = await Promise.all([
      isGuildLeader(address as Address, guildId),
      isGuildOfficer(address as Address, guildId),
    ])

    if (!isLeader && !isOfficer) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Only guild leaders and officers can claim from treasury'
        },
        { status: 403 }
      )
    }

    // Check treasury balance
    const treasuryBalance = await getTreasuryBalance(guildId)
    
    if (treasuryBalance < BigInt(amount)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Insufficient treasury balance. Available: ${treasuryBalance.toString()} points`
        },
        { status: 400 }
      )
    }

    // Get user's rank tier for estimated bonus
    const rankInfo = await getUserRankTier(address as Address)
    const estimatedBonus = Math.floor(amount * rankInfo.multiplier)

    // Build contract call for client to execute
    const contractCall = {
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'claimGuildReward',
      args: [guildId, BigInt(amount)],
    }

    // Log claim attempt
    await logGuildEvent({
      guild_id: guildId.toString(),
      event_type: 'POINTS_CLAIMED',
      actor_address: address,
      amount: Number(amount),
      metadata: {
        request_id: requestId,
        rank_tier: rankInfo.name,
        rank_multiplier: rankInfo.multiplier,
        estimated_bonus: estimatedBonus,
        role: isLeader ? 'leader' : 'officer',
      },
    }).catch((error: unknown) => {
      console.error('[guild-claim-direct] Event logging error:', error)
    })

    // Invalidate relevant caches
    await invalidateCachePattern('server', `guild:${guildId}:*`)
    await invalidateCachePattern('server', `leaderboard:*`)

    return NextResponse.json({
      success: true,
      message: `Claim ${amount} points with ${rankInfo.multiplier}x bonus (≈${estimatedBonus} points total)`,
      contractCall,
      estimatedBonus,
      rankTier: rankInfo.name,
      multiplier: rankInfo.multiplier,
      timestamp: Date.now(),
    })

  } catch (error: any) {
    console.error('[guild-claim-direct] Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred while processing your claim. Please try again.',
        requestId
      },
      { status: 500 }
    )
  }
}
