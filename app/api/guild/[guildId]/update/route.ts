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
 *   "address": string (0x... wallet address - REQUIRED),
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
import { z } from 'zod'
import { generateRequestId } from '@/lib/middleware/request-id'
import { getGuild } from '@/lib/contracts/guild-contract'
import { getSupabaseAdminClient } from '@/lib/supabase/edge'
import { type Address } from 'viem'
import { logGuildEvent } from '@/lib/guild/event-logger'
import { invalidateCachePattern } from '@/lib/cache/server'

// Validation schema
const GuildUpdateSchema = z.object({
  address: z.union([
    z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
    z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1).max(10) // Support multi-wallet (cachedWallets)
  ]).transform(val => Array.isArray(val) ? val : [val]), // Normalize to array
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  banner: z.string().url().max(500).optional().or(z.literal('')),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const requestId = generateRequestId()
  
  try {
    const { guildId } = await params

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
    
    // Normalize addresses to lowercase (validation.data.address is now always an array)
    const addresses = validation.data.address.map(addr => addr.toLowerCase() as Address)

    // 4. Verify guild exists on contract
    const guild = await getGuild(guildIdBigInt)
    if (!guild) {
      return NextResponse.json(
        { success: false, message: 'Guild not found' },
        { status: 404, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 5. AUTHENTICATION - Check if ANY wallet is guild leader (multi-wallet support)
    const leaderLowercase = guild.leader.toLowerCase()
    const isLeader = addresses.some(addr => leaderLowercase === addr)
    const matchingAddress = addresses.find(addr => leaderLowercase === addr) || addresses[0]
    
    if (!isLeader) {
      console.warn('[guild-update] Authorization failed:', {
        requestedBy: addresses,
        guildLeader: leaderLowercase,
        guildId,
        timestamp: new Date().toISOString(),
      })
      
      return NextResponse.json(
        { success: false, message: 'Only guild leader can update settings' },
        { status: 403, headers: { 'X-Request-ID': requestId } }
      )
    }

    // 6. Update guild metadata in database
    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Database error' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
    
    // Check if guild metadata exists
    const { data: existing } = await supabase
      .from('guild_off_chain_metadata')
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
        .from('guild_off_chain_metadata')
        .update(updateData)
        .eq('guild_id', guildId)

      if (error) throw error
    } else {
      // Insert new record
      const { error } = await supabase
        .from('guild_off_chain_metadata')
        .insert({ ...updateData, created_at: new Date().toISOString() })

      if (error) throw error
    }

    // 7. AUDIT LOGGING - Log the update event
    const metadata: Record<string, any> = { 
      guild_name: name || guild.name,
      all_verified_addresses: addresses // Multi-wallet audit trail
    }
    if (name) metadata.new_name = name
    if (description) metadata.new_description = description
    if (banner) metadata.new_banner = banner
    
    logGuildEvent({
      guild_id: guildId,
      event_type: 'GUILD_UPDATED',
      actor_address: matchingAddress,
      metadata,
    }).catch((error) => {
      console.error('[guild-update] Failed to log event:', error)
    })

    // CACHE INVALIDATION - Clear stale guild data after mutation
    invalidateCachePattern('guild', `${guildId}:*`).catch((error) => {
      console.error('[guild-update] Failed to invalidate cache:', error)
    })
    // Also invalidate guild list caches
    invalidateCachePattern('guild', 'leaderboard:*').catch((error) => {
      console.error('[guild-update] Failed to invalidate leaderboard cache:', error)
    })
    invalidateCachePattern('guild', 'list:*').catch((error) => {
      console.error('[guild-update] Failed to invalidate list cache:', error)
    })

    // 8. Fetch updated data
    const { data: updatedGuild, error: fetchError } = await supabase
      .from('guild_off_chain_metadata')
      .select('guild_id, name, description, banner')
      .eq('guild_id', guildId)
      .single()

    if (fetchError || !updatedGuild) {
      throw new Error('Failed to fetch updated guild data')
    }

    return NextResponse.json(
      {
        success: true,
        guild: {
          id: guildId,
          name: updatedGuild.name || guild.name,
          description: updatedGuild.description || '',
          banner: updatedGuild.banner || '',
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
