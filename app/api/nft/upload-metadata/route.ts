/**
 * NFT Metadata Upload API
 * Uploads metadata to Supabase Storage for GmeowNFT (ERC-721 collectibles)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/edge'
import { generateRequestId } from '@/lib/middleware/request-id'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { metadata, tokenId } = await request.json()

    if (!metadata || typeof tokenId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { 
          status: 400,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Upload metadata JSON to Supabase Storage
    const metadataPath = `nft-metadata/${tokenId}.json`
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    })

    const { data, error } = await supabase.storage
      .from('nft-assets')
      .upload(metadataPath, metadataBlob, {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
      })

    if (error) {
      console.error('Supabase NFT metadata upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload NFT metadata' },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('nft-assets')
      .getPublicUrl(metadataPath)

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      path: metadataPath,
    }, {
      headers: { 'X-Request-ID': requestId }
    })
  } catch (error) {
    console.error('NFT metadata upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    )
  }
}
