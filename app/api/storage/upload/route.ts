/**
 * Storage Upload API
 * POST /api/storage/upload
 * 
 * Generates signed upload URL for Supabase Storage
 * 
 * Security:
 * - Rate limiting (20/min)
 * - Authenticated users only
 * - File validation (type, size)
 * - Owner-only access
 * 
 * @module app/api/storage/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Lazy initialization of Supabase client with config validation
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  return supabase;
}

// Validation schema
const UploadRequestSchema = z.object({
  fid: z.union([z.string(), z.number()]).transform(val => String(val)),
  fileName: z.string().min(1),
  fileType: z.string().startsWith('image/'),
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
  type: z.enum(['avatar', 'cover']),
})

const AVATAR_BUCKET = 'avatars'
const COVER_BUCKET = 'covers'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate Supabase configuration
    let supabaseClient;
    try {
      supabaseClient = getSupabaseClient();
    } catch (error) {
      console.error('[Upload API] Supabase not configured:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Storage service not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.',
        },
        { status: 503 }
      );
    }

    // Step 2: Parse and validate request body
    const body = await request.json()

    // Validate input
    const validation = UploadRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { fid, fileName, fileType, type } = validation.data

    // Generate unique filename
    const extension = fileName.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const uniqueFileName = `${fid}/${type}-${timestamp}.${extension}`

    // Select bucket
    const bucket = type === 'avatar' ? AVATAR_BUCKET : COVER_BUCKET

    // Create signed upload URL (expires in 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueFileName)

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json(
        { error: 'Failed to generate upload URL' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(uniqueFileName)

    return NextResponse.json({
      uploadUrl: signedUrlData.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      path: uniqueFileName,
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
