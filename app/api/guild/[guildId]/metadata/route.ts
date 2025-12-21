/**
 * GET /api/guild/[guildId]/metadata
 * 
 * Purpose: Fetch guild metadata (name, description, banner) from database
 * Method: GET
 * Auth: Public
 * Rate Limit: 60 requests/hour
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateRequestId } from '@/lib/middleware/request-id'
import { getSupabaseAdminClient } from '@/lib/supabase/edge'

export async function GET(
  req: NextRequest,
  { params }: { params: { guildId: string } }
) {
  const requestId = generateRequestId()
  
  try {
    const { guildId } = params

    // Validate guild ID
    const guildIdBigInt = BigInt(guildId)
    if (guildIdBigInt <= 0n) {
      return NextResponse.json(
        { success: false, message: 'Invalid guild ID' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Fetch guild metadata from database
    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Database error' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { data, error } = await supabase
      .from('guild_metadata')
      .select('guild_id, name, description, banner')
      .eq('guild_id', guildId)
      .single()

    if (error || !data) {
      // Guild metadata doesn't exist yet
      return NextResponse.json(
        { success: false, message: 'Guild metadata not found' },
        { status: 404, headers: { 'X-Request-ID': requestId } }
      )
    }

    return NextResponse.json(
      {
        success: true,
        guild: {
          id: data.guild_id,
          name: data.name,
          description: data.description || '',
          banner: data.banner || '',
        },
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('[guild-metadata-api] Error:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to fetch guild metadata' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
