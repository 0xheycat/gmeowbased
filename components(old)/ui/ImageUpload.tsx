'use client'

/**
 * ImageUpload Component
 * Phase 15: Quest image upload from device
 * 
 * Features:
 * - File picker (device files only)
 * - Image preview
 * - Supabase Storage upload
 * - File validation (size, type)
 * - Remove image
 */

import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Button } from './tailwick-primitives'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ImageUploadProps {
  value?: string | null // Current image URL
  onChange: (url: string | null) => void // Callback with new URL
  onPathChange?: (path: string | null) => void // Callback with storage path
  maxSizeMB?: number
  acceptedTypes?: string[]
}

export function ImageUpload({
  value,
  onChange,
  onPathChange,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      return `File too large. Max size: ${maxSizeMB}MB (your file: ${sizeMB.toFixed(1)}MB)`
    }

    return null
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Generate unique filename
      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `quest-images/${fileName}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('quest-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quest-images')
        .getPublicUrl(filePath)

      // Set preview
      setPreview(publicUrl)

      // Notify parent
      onChange(publicUrl)
      if (onPathChange) {
        onPathChange(filePath)
      }
    } catch (err) {
      console.error('[ImageUpload] Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!value) return

    try {
      // If we have storage path, delete from storage
      // Note: We don't have path here, so just clear preview
      // Actual deletion can happen when quest is deleted
      setPreview(null)
      onChange(null)
      if (onPathChange) {
        onPathChange(null)
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('[ImageUpload] Remove error:', err)
      setError('Failed to remove image')
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Preview or Upload Button */}
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Quest image preview"
            className="w-full h-48 object-cover rounded-lg border-2 theme-border-default"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            disabled={uploading}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={uploading}
          className="w-full h-48 border-2 border-dashed theme-border-default rounded-lg flex flex-col items-center justify-center gap-3 hover:border-purple-500 hover:bg-purple-500/5 transition-colors"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
              <p className="text-sm theme-text-secondary">Uploading...</p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 theme-text-tertiary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium theme-text-primary">
                  Click to upload image
                </p>
                <p className="text-xs theme-text-tertiary mt-1">
                  {acceptedTypes.map(t => t.split('/')[1]).join(', ').toUpperCase()} up to {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
