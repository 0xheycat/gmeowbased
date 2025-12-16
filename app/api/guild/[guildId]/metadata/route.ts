/**
 * GET /api/guild/[guildId]/metadata
 * 
 * Purpose: Fetch guild metadata (name, description, banner) from database
 * Method: GET
 * Auth: Public
 * Rate Limit: 60 requests/hour
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateRequestId } from '@/lib/request-id'

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

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
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('guild_metadata')
      .select('*')
      .eq('guild_id', guildId)
      .single()

    if (error) {
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
