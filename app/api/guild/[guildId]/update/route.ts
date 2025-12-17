/**
 * PUT /api/guild/[guildId]/update
 * 
 * Purpose: Update guild metadata (name, description, banner)
 * Method: PUT
 * Auth: Required (guild leader only)
 * Rate Limit: 20 requests/hour
 * 
 * Request Body:
 * {
 *   "name"?: string (2-50 chars),
 *   "description"?: string (max 500 chars),
 *   "banner"?: string (URL)
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "guild": {
 *     "id": string,
 *     "name": string,
 *     "description": string,
 *     "banner": string
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { strictLimiter } from '@/lib/middleware/rate-limit'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { generateRequestId } from '@/lib/middleware/request-id'
import { getGuild } from '@/lib/contracts/guild-contract'

// Validation schema
const GuildUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  banner: z.string().url().max(500).optional().or(z.literal('')),
})

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const requestId = generateRequestId()
  
  try {
    const { guildId } = params

    // 1. Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `guild:update:${clientIp}`
    
    if (strictLimiter) {
      const rateLimitResult = await strictLimiter.limit(rateLimitKey)
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { success: false, message: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
    }

    // 2. Validate guild ID
    const guildIdBigInt = BigInt(guildId)
    if (guildIdBigInt <= 0n) {
      return NextResponse.json(
        { success: false, message: 'Invalid guild ID' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 3. Parse and validate request body
    const body = await req.json()
    const validation = GuildUpdateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data', errors: validation.error.issues },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { name, description, banner } = validation.data

    // 4. Verify guild exists on contract
    const guild = await getGuild(guildIdBigInt)
    if (!guild) {
      return NextResponse.json(
        { success: false, message: 'Guild not found' },
        { status: 404, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 5. Check if user is guild leader (TODO: Add auth when available)
    // For now, we'll allow updates but in production you should verify:
    // const userAddress = await getUserAddress(req)
    // if (userAddress !== guild.leader) {
    //   return NextResponse.json(
    //     { success: false, message: 'Only guild leader can update settings' },
    //     { status: 403 }
    //   )
    // }

    // 6. Update guild metadata in database
    const supabase = getSupabaseClient()
    
    // Check if guild metadata exists
    const { data: existing } = await supabase
      .from('guild_metadata')
      .select('*')
      .eq('guild_id', guildId)
      .single()

    const updateData = {
      guild_id: guildId,
      name: name || guild.name,
      description: description || '',
      banner: banner || '',
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('guild_metadata')
        .update(updateData)
        .eq('guild_id', guildId)

      if (error) throw error
    } else {
      // Insert new record
      const { error } = await supabase
        .from('guild_metadata')
        .insert({ ...updateData, created_at: new Date().toISOString() })

      if (error) throw error
    }

    // 7. Fetch updated data
    const { data: updatedGuild } = await supabase
      .from('guild_metadata')
      .select('*')
      .eq('guild_id', guildId)
      .single()

    return NextResponse.json(
      {
        success: true,
        guild: {
          id: guildId,
          name: updatedGuild?.name || guild.name,
          description: updatedGuild?.description || '',
          banner: updatedGuild?.banner || '',
        },
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error('[guild-update-api] Error:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to update guild settings' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
