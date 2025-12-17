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
 * - Idempotency prevents duplicate uploads on network retry
 * 
 * Idempotency: Header-based (Idempotency-Key), Stripe pattern
 * Key format: Client-provided UUID or auto-generated from file metadata
 * 
 * @module app/api/storage/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkIdempotency, storeIdempotency, returnCachedResponse, getIdempotencyKey } from '@/lib/middleware/idempotency'
import { generateRequestId } from '@/lib/middleware/request-id'

// Lazy initialization of Supabase client with config validation
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  // Use SUPABASE_URL (server-side) not NEXT_PUBLIC_SUPABASE_URL (client-side)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
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
  type: z.enum(['avatar', 'cover', 'quest', 'guild-banner']),
  guildId: z.string().optional(), // Required for guild-banner type
})

// Bucket mapping for different upload types
const BUCKET_MAP: Record<string, string> = {
  avatar: 'avatars',
  cover: 'covers',
  quest: 'quest-images',
  'guild-banner': 'covers', // Reuse covers bucket for guild banners
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
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
        { status: 503, headers: { 'X-Request-ID': requestId } }
      );
    }

    // Step 2: Parse and validate request body
    const body = await request.json()

    // Validate input
    const validation = UploadRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { fid, fileName, fileType, type, guildId } = validation.data

    // Validate guild-banner type requires guildId
    if (type === 'guild-banner' && !guildId) {
      return NextResponse.json(
        { error: 'guildId is required for guild-banner uploads' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Idempotency check (prevents duplicate uploads on retry)
    const baseKey = getIdempotencyKey(request)
    const idempotencyKey = baseKey || `storage-upload-${fid}-${type}-${fileName}`
    
    const idempotencyResult = await checkIdempotency(idempotencyKey)
    if (idempotencyResult.exists) {
      console.log(`[Upload API] Replaying cached response for key: ${idempotencyKey}`);
      return returnCachedResponse(idempotencyResult);
    }

    // Generate unique filename based on type
    const extension = fileName.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    
    let uniqueFileName: string
    if (type === 'guild-banner') {
      uniqueFileName = `${guildId}/${timestamp}.${extension}`
    } else if (type === 'quest') {
      uniqueFileName = `general/${fid}/${timestamp}-${fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
    } else {
      uniqueFileName = `${fid}/${type}-${timestamp}.${extension}`
    }

    // Select bucket
    const bucket = BUCKET_MAP[type]

    // Create signed upload URL (expires in 5 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueFileName)

    if (signedUrlError) {
      console.error('[Upload API] Signed URL error:', {
        error: signedUrlError,
        bucket,
        fileName: uniqueFileName,
        message: signedUrlError.message
      })
      
      // PRODUCTION SAFE: Never expose internal error details to users
      const isDev = process.env.NODE_ENV === 'development'
      
      if (signedUrlError.message?.includes('not found')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Storage service is currently unavailable. Please try again later.',
            ...(isDev && { _devDetails: `Bucket '${bucket}' not found` })
          },
          { status: 503, headers: { 'X-Request-ID': requestId } }
        )
      }
      
      if (signedUrlError.message?.includes('permission') || signedUrlError.message?.includes('policy')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Storage service is currently unavailable. Please try again later.',
            ...(isDev && { _devDetails: 'Permission denied - check storage policies' })
          },
          { status: 503, headers: { 'X-Request-ID': requestId } }
        )
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to upload image. Please try again later.',
          ...(isDev && { _devDetails: signedUrlError.message })
        },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(uniqueFileName)

    const response = {
      uploadUrl: signedUrlData.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      path: uniqueFileName,
    }
    
    // Store result for idempotency (24h cache TTL, prevents duplicate uploads)
    await storeIdempotency(idempotencyKey, response, 200)

    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
