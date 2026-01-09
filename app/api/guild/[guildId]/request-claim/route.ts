/**
 * POST /api/guild/[guildId]/request-claim
 * 
 * Purpose: Submit a claim request from guild treasury (pending approval)
 * Method: POST
 * Auth: Required (guild member)
 * 
 * Request Body:
 * {
 *   "address": string (0x... wallet address),
 *   "amount": number (points to claim)
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "timestamp": number
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/edge'
import { generateRequestId } from '@/lib/middleware/request-id'

const BodySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  amount: z.number().int().positive('Amount must be positive'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const requestId = generateRequestId()

  try {
    const { guildId } = await params
    const body = await req.json()
    
    const bodyResult = BodySchema.safeParse(body)
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid request: ${bodyResult.error.issues.map((i) => i.message).join(', ')}`,
        },
        { status: 400 }
      )
    }

    const { address, amount } = bodyResult.data

    // Verify guild membership
    const memberCheckResponse = await fetch(
      `${req.nextUrl.origin}/api/guild/${guildId}/is-member?address=${address}`
    )
    const memberData = await memberCheckResponse.json()
    
    if (!memberData.isMember) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only guild members can request claims',
        },
        { status: 403 }
      )
    }

    // Get username from address (truncated for display)
    const username = `${address.slice(0, 6)}...${address.slice(-4)}`

    // Insert claim request into treasury transactions
    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('guild_treasury_transactions')
      .insert({
        guild_id: guildId,
        user_address: address,
        username,
        type: 'claim',
        amount,
        status: 'pending',
        request_id: requestId,
      })

    if (insertError) {
      console.error('[request-claim] Database error:', insertError)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to submit claim request',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Claim request submitted successfully. Waiting for leader approval.',
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    console.error('[request-claim] Error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process claim request',
      },
      { status: 500 }
    )
  }
}
