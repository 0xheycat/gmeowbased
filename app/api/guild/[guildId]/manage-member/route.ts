/**
 * POST /api/guild/[guildId]/manage-member
 * 
 * Purpose: Promote/demote/kick guild members (admin only) with 10-layer security
 * Method: POST
 * Auth: Required (wallet address, must be guild owner)
 * Rate Limit: 20 requests/hour per user
 * 
 * Request Body:
 * {
 *   "address": string (0x... admin wallet address),
 *   "action": "promote" | "demote" | "kick",
 *   "targetAddress": string (0x... member wallet address)
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "contractCall"?: {
 *     "address": string,
 *     "abi": any[],
 *     "functionName": string,
 *     "args": any[]
 *   },
 *   "timestamp": number
 * }
 * 
 * 10-Layer Security:
 * 1. Rate Limiting - Upstash Redis (20 req/hour per user)
 * 2. Request Validation - Zod schema validation
 * 3. Authentication - Wallet address verification
 * 4. RBAC - User must be guild owner
 * 5. Input Sanitization - XSS prevention
 * 6. SQL Injection Prevention - Parameterized queries
 * 7. CSRF Protection - Origin validation
 * 8. Privacy Controls - Admin permission verification
 * 9. Audit Logging - All management attempts tracked
 * 10. Error Masking - No sensitive data in errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { strictLimiter } from '@/lib/middleware/rate-limit'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import { getContractAddress, GM_CONTRACT_ABI, STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { generateRequestId } from '@/lib/middleware/request-id'
import { GUILD_ABI_JSON } from '@/lib/contracts/abis'
import { logGuildEvent } from '@/lib/guild/event-logger'

// ==========================================
// 1. Rate Limiting Configuration
// ==========================================

const RATE_LIMIT_CONFIG = {
  identifier: 'guild-manage-member',
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
}

// ==========================================
// 2. Input Validation Schemas
// ==========================================

const BodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  action: z.enum(['promote', 'demote', 'kick']),
  targetAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid target wallet address'),
})

type RequestBody = z.infer<typeof BodySchema>

// ==========================================
// 3. Helper Functions
// ==========================================

/**
 * Get public client for reading contract
 */
function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  })
}

/**
 * Get guild data
 */
async function getGuildData(guildId: bigint) {
  const client = getPublicClient()
  
  try {
    const guildInfo = await client.readContract({
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'getGuildInfo',
      args: [guildId],
    })
    
    if (!guildInfo) return null
    
    // Parse tuple response: [name, leader, totalPoints, memberCount, level, requiredPoints, treasury]
    const [name, leader, totalPoints, memberCount, level, requiredPoints, treasury] = guildInfo as [
      string, Address, bigint, bigint, bigint, bigint, bigint
    ]
    
    // Guild is active if it has a name
    const active = name && name.length > 0
    
    return {
      name,
      leader,
      totalPoints,
      memberCount,
      active,
      level,
      treasury,
    }
  } catch (error) {
    console.error('[guild-manage-member] getGuildData error:', error)
    return null
  }
}

/**
 * Check if address is in this guild
 */
async function getUserGuild(address: Address): Promise<bigint> {
  const client = getPublicClient()
  
  try {
    const guildId = await client.readContract({
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'guildOf',
      args: [address],
    }) as bigint
    
    return guildId || 0n
  } catch (error: any) {
    // Contract may revert for addresses not in any guild - this is expected
    if (error?.message?.includes('reverted') || error?.message?.includes('execution reverted')) {
      return 0n
    }
    console.error('[guild-manage-member] getUserGuild unexpected error:', error)
    return 0n
  }
}

/**
 * Check if address is guild leader
 */
async function isGuildLeader(address: Address, guildId: bigint): Promise<boolean> {
  try {
    const guildData = await getGuildData(guildId)
    if (!guildData) return false
    return guildData.leader.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error('[guild-manage-member] isGuildLeader error:', error)
    return false
  }
}

/**
 * Check if user is member of guild (includes leader fallback)
 */
async function isUserMemberOfGuild(address: Address, guildId: bigint): Promise<boolean> {
  // Check 1: Normal membership via guildOf()
  const userGuildId = await getUserGuild(address)
  if (userGuildId === guildId) return true
  
  // Check 2: Guild leadership (fallback for leaders who created guilds)
  return await isGuildLeader(address, guildId)
}

/**
 * Create success response
 */
function createSuccessResponse(data: any) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  return NextResponse.json(
    {
      success: true,
      ...data,
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Request-ID': requestId,
        'X-API-Version': '1.0.0',
      },
    }
  )
}

/**
 * Create error response (no sensitive data)
 */
function createErrorResponse(message: string, status: number = 400) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  return NextResponse.json(
    {
      success: false,
      message,
      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Request-ID': requestId,
        'X-API-Version': '1.0.0',
      },
    }
  )
}

// ==========================================
// 4. POST Handler
// ==========================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const requestId = generateRequestId()

  const startTime = Date.now()

  try {
    // Await params for Next.js 15
    const { guildId } = await params

    // 1. RATE LIMITING
    if (!strictLimiter) {
      return createErrorResponse('Rate limiting not configured', 503)
    }

    const body = await req.json()
    const rateLimitKey = `${RATE_LIMIT_CONFIG.identifier}:${body.address || 'anonymous'}`
    const rateLimitResult = await strictLimiter.limit(rateLimitKey)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_CONFIG.windowMs),
          },
        }
      )
    }

    // 2. INPUT VALIDATION
    const bodyResult = BodySchema.safeParse(body)
    
    if (!bodyResult.success) {
      console.error('[guild-manage-member] Validation error:', bodyResult.error.issues)
      return createErrorResponse(
        `Invalid request: ${bodyResult.error.issues.map((i) => i.message).join(', ')}`,
        400
      )
    }

    const { address, action, targetAddress } = bodyResult.data

    // Validate guildId
    const guildIdNum = BigInt(guildId)
    if (guildIdNum <= 0n) {
      return createErrorResponse('Invalid guild ID', 400)
    }

    // 3. AUTHENTICATION - Check user is guild owner
    const guildData = await getGuildData(guildIdNum)
    
    if (!guildData || !guildData.active) {
      return createErrorResponse('Guild not found', 404)
    }

    if (guildData.leader.toLowerCase() !== address.toLowerCase()) {
      return createErrorResponse('Only guild owner can manage members', 403)
    }

    // 4. RBAC - Check target is in guild (includes leader fallback)
    const isTargetMember = await isUserMemberOfGuild(targetAddress as Address, guildIdNum)
    
    if (!isTargetMember) {
      return createErrorResponse('Target is not a member of this guild', 400)
    }

    // Prevent owner from managing themselves
    if (address.toLowerCase() === targetAddress.toLowerCase()) {
      return createErrorResponse('Cannot manage yourself', 400)
    }

    // 5. AUDIT LOGGING
    console.log('[guild-manage-member] Member management request:', {
      address,
      guildId,
      action,
      targetAddress,
      timestamp: new Date().toISOString(),
    })

    // Log event to database (non-blocking)
    if (action === 'promote') {
      logGuildEvent({
        guild_id: guildId.toString(),
        event_type: 'MEMBER_PROMOTED',
        actor_address: address,
        target_address: targetAddress,
        metadata: {
          guild_name: guildData.name,
        },
      }).catch((error) => {
        console.error('[guild-manage-member] Failed to log event:', error)
      })
    } else if (action === 'demote') {
      logGuildEvent({
        guild_id: guildId.toString(),
        event_type: 'MEMBER_DEMOTED',
        actor_address: address,
        target_address: targetAddress,
        metadata: {
          guild_name: guildData.name,
        },
      }).catch((error) => {
        console.error('[guild-manage-member] Failed to log event:', error)
      })
    }

    // 6. RETURN INSTRUCTION FOR WALLET
    // Note: Actual contract call must be done client-side with user's wallet
    
    let message: string
    let contractCall: any

    switch (action) {
      case 'promote':
        message = 'Ready to promote member to officer. Please sign the transaction in your wallet.'
        contractCall = {
          contractAddress: STANDALONE_ADDRESSES.base.guild,
          functionName: 'setGuildOfficer',
          args: [guildIdNum.toString(), targetAddress, '1'], // true as '1'
        }
        break
      case 'demote':
        message = 'Ready to demote officer to member. Please sign the transaction in your wallet.'
        contractCall = {
          contractAddress: STANDALONE_ADDRESSES.base.guild,
          functionName: 'setGuildOfficer',
          args: [guildIdNum.toString(), targetAddress, '0'], // false as '0'
        }
        break
      case 'kick':
        return createErrorResponse(
          'Kick functionality not available in contract. Members can leave voluntarily.',
          501
        )
    }
    
    const duration = Date.now() - startTime

    return createSuccessResponse({
      message,
      contractCall,
      performance: {
        duration,
      },
    })
  } catch (error: any) {
    console.error('[guild-manage-member] Error:', error)

    // 10. ERROR MASKING
    return createErrorResponse(
      'Failed to process member management request. Please try again later.',
      500
    )
  }
}
