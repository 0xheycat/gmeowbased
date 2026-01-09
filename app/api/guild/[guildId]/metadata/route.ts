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
import apolloClient from '@/lib/apollo-client'
import { GET_GUILD_BY_ID } from '@/lib/graphql/queries/guild'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const requestId = generateRequestId()
  // Next.js 15: params must be awaited
  const { guildId } = await params
  
  try {
    // Validate guild ID
    const guildIdBigInt = BigInt(guildId)
    if (guildIdBigInt <= 0n) {
      return NextResponse.json(
        { success: false, message: 'Invalid guild ID' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // HYBRID ARCHITECTURE: Query Subsquid for on-chain guild name (source of truth)
    let onchainGuild = null
    try {
      const { data: subsquidData } = await apolloClient.query({
        query: GET_GUILD_BY_ID,
        variables: { guildId: guildId }, // ✅ Correct variable name
        fetchPolicy: 'network-only',
      })
      onchainGuild = subsquidData?.guild // ✅ Returns 'guild' not 'guilds'
    } catch (subsquidError) {
      console.error('[guild-metadata-api] Subsquid query failed:', subsquidError)
      // Continue without on-chain data - will return error below
    }

    if (!onchainGuild) {
      console.error('[guild-metadata-api] Guild not found on-chain for ID:', guildId)
      return NextResponse.json(
        { success: false, message: 'Guild not found on-chain' },
        { status: 404, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Fetch guild metadata from Supabase (description, banner) - OPTIONAL
    const supabase = getSupabaseAdminClient()
    let metadata = null
    
    if (supabase) {
      try {
        const { data } = await supabase
          .from('guild_off_chain_metadata')
          .select('description, banner')
          .eq('guild_id', guildId)
          .maybeSingle() // ✅ Returns null if not found (no error)
        
        metadata = data
      } catch (supabaseError) {
        console.error('[guild-metadata-api] Supabase query failed:', supabaseError)
        // Continue without metadata - will use empty strings
      }
    }

    // Use on-chain name as source of truth, Supabase for metadata (optional)
    return NextResponse.json(
      {
        success: true,
        guild: {
          id: guildId,
          name: onchainGuild.name, // ✅ On-chain source of truth
          description: metadata?.description || '',
          banner: metadata?.banner || '',
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
