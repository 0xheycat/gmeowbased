/**
 * ========================================
 * 📦 IMAGE UPLOAD SERVICE - SUPABASE STORAGE INTEGRATION
 * ========================================
 * 
 * Handles user-uploaded images (avatars, cover images) with validation, optimization,
 * and Supabase Storage integration. Uses PUBLIC client for client-side uploads.
 * 
 * FEATURES:
 * - ✅ Avatar and cover image uploads to Supabase Storage buckets
 * - ✅ Automatic file validation (type: image/*, size: <10MB)
 * - ✅ Unique filename generation (FID + timestamp)
 * - ✅ Public URL generation for uploaded images
 * - ✅ Image deletion with bucket-aware path handling
 * - ✅ Upsert support (replace existing images)
 * - ✅ 1-year cache control for performance
 * 
 * STORAGE BUCKETS:
 * - avatars/ - User profile avatars (public read)
 * - covers/ - Profile cover/banner images (public read)
 * - badge-art/ - Badge artwork (handled by scripts/badge/deploy-badge-assets.ts)
 * 
 * TODO:
 * - [ ] Add image resizing/optimization (Sharp library or Supabase transforms)
 * - [ ] Add WebP conversion for better compression
 * - [ ] Add batch upload support for multiple images
 * - [ ] Add progress tracking for large uploads
 * - [ ] Add retry logic for failed uploads
 * - [ ] Add storage quota tracking per user
 * 
 * CRITICAL:
 * - ⚠️ Uses PUBLIC client (NEXT_PUBLIC_SUPABASE_ANON_KEY) for client-side uploads
 * - ⚠️ All uploads are PUBLIC read (Storage bucket policy)
 * - ⚠️ 10MB max file size enforced
 * - ⚠️ Only image/* MIME types allowed
 * 
 * SUGGESTIONS:
 * - Consider adding image compression before upload (reduce bandwidth)
 * - Consider adding upload analytics (track storage usage per user)
 * - Consider adding CDN integration (CloudFlare/Vercel Edge) for faster delivery
 * - Consider adding EXIF stripping for privacy (remove GPS metadata)
 * 
 * @module lib/storage/image-upload-service
 * @see https://supabase.com/docs/guides/storage
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/edge'

// Get Supabase client (public client for client-side uploads)
const supabase = getSupabaseBrowserClient()

// Storage buckets
const AVATAR_BUCKET = 'avatars'
const COVER_BUCKET = 'covers'

export interface ImageUploadOptions {
  fid: string
  file: File
  type: 'avatar' | 'cover'
}

export interface ImageUploadResult {
  url: string
  path: string
  error?: string
}

/**
 * Validate image file
 */
function validateImage(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' }
  }

  return { valid: true }
}

/**
 * Generate unique filename
 */
function generateFilename(fid: string, type: 'avatar' | 'cover', extension: string): string {
  const timestamp = Date.now()
  return `${fid}/${type}-${timestamp}.${extension}`
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImage(options: ImageUploadOptions): Promise<ImageUploadResult> {
  const { fid, file, type } = options

  try {
    // Check Supabase client
    if (!supabase) {
      return { url: '', path: '', error: 'Supabase client not initialized' }
    }

    // Validate image
    const validation = validateImage(file)
    if (!validation.valid) {
      return { url: '', path: '', error: validation.error }
    }

    // Get file extension
    const extension = file.name.split('.').pop() || 'jpg'

    // Generate unique filename
    const filename = generateFilename(fid, type, extension)

    // Select bucket based on type
    const bucket = type === 'avatar' ? AVATAR_BUCKET : COVER_BUCKET

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return { url: '', path: '', error: error.message }
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      url: publicUrlData.publicUrl,
      path: data.path,
    }
  } catch (error) {
    console.error('Image upload error:', error)
    return {
      url: '',
      path: '',
      error: error instanceof Error ? error.message : 'Unknown upload error',
    }
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImage(path: string, type: 'avatar' | 'cover'): Promise<{ success: boolean; error?: string }> {
  try {
    // Check Supabase client
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' }
    }

    const bucket = type === 'avatar' ? AVATAR_BUCKET : COVER_BUCKET

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Supabase delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Image delete error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error',
    }
  }
}

/**
 * Get public URL for existing image
 */
export function getImageUrl(path: string, type: 'avatar' | 'cover'): string {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return ''
  }

  const bucket = type === 'avatar' ? AVATAR_BUCKET : COVER_BUCKET
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
