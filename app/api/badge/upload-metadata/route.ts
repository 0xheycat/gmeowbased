/**
 * Badge Metadata Upload API
 * Uploads metadata to Supabase Storage for badge NFTs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateRequestId } from '@/lib/middleware/request-id'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
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
    const metadataPath = `metadata/${tokenId}.json`
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    })

    const { data, error } = await supabase.storage
      .from('badge-assets')
      .upload(metadataPath, metadataBlob, {
        contentType: 'application/json',
        upsert: true, // Overwrite if exists
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload metadata' },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('badge-assets')
      .getPublicUrl(metadataPath)

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      path: metadataPath,
    }, {
      headers: { 'X-Request-ID': requestId }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    )
  }
}
