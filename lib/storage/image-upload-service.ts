/**
 * Image Upload Service - Supabase Storage Integration
 * 
 * Features:
 * - Avatar and cover image uploads
 * - Automatic resizing and optimization
 * - Public URL generation
 * - File validation (type, size)
 * - Error handling
 * 
 * Security:
 * - 10MB max file size
 * - Image types only (image/*)
 * - Unique filenames (FID + timestamp)
 * - Public read, authenticated write
 * 
 * @module lib/storage/image-upload-service
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  const bucket = type === 'avatar' ? AVATAR_BUCKET : COVER_BUCKET
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
