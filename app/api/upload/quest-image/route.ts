import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const QUEST_IMAGE_BUCKET = 'quest-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  // Rate limiting
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter) // 10 per minute
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Note: Auth can be added later with proper frame verification
  // For now, allowing uploads with rate limiting
  const userFid = 'anonymous' // TODO: Get from frame verification

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Parse form data
  const form = await req.formData()
  const file = form.get('file')
  const folder = (form.get('folder') as string) || 'general'

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'File is required' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'File must be an image' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File size must be less than 5MB' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Ensure bucket exists
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database unavailable' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }

  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some((b) => b.name === QUEST_IMAGE_BUCKET)

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(QUEST_IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    })
    if (createError) {
      console.error('Failed to create quest-images bucket:', createError)
      return NextResponse.json(
        { error: 'Storage configuration failed' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }
  }

  // Upload file
  const arrayBuffer = await file.arrayBuffer()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const path = `${folder}/${userFid}/${randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(QUEST_IMAGE_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || `image/${extension}`,
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Get public URL
  const { data } = supabase.storage.from(QUEST_IMAGE_BUCKET).getPublicUrl(path)

  return NextResponse.json(
    {
      ok: true,
      url: data.publicUrl,
      path,
    },
    {
      headers: {
        'X-Request-ID': requestId,
      },
    }
  )
})
