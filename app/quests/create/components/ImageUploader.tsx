'use client'

import { useState, useRef, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import UploadIcon from '@/components/icons/upload-icon'
import ImageIcon from '@/components/icons/image-icon'
import Image from 'next/image'

// Simple X icon inline
const XIcon = (props: React.SVGAttributes<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 6L6 18M6 6L18 18" />
  </svg>
)

interface ImageUploaderProps {
  label: string
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  acceptedFormats?: string
  maxSizeMB?: number
  aspectRatio?: string
  description?: string
  className?: string
}

export function ImageUploader({
  label,
  value,
  onChange,
  onRemove,
  acceptedFormats = 'image/png, image/jpeg, image/jpg, image/webp',
  maxSizeMB = 5,
  aspectRatio = '16:9',
  description,
  className = '',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [preview, setPreview] = useState<string>(value || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset error
    setError('')

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to server
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'quests')

      const response = await fetch('/api/upload/quest-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      onChange(data.url)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreview('')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onRemove?.()
    onChange('')
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Upload Area */}
      <div className="relative">
        {!preview ? (
          // Upload Button
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className="w-full border-2 border-dashed border-border rounded-lg p-8 hover:border-primary hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {uploading ? 'Uploading...' : 'Click to upload image'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: {aspectRatio} • Max {maxSizeMB}MB • PNG, JPG, WebP
                </p>
              </div>
            </div>
          </button>
        ) : (
          // Preview
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <Image
                src={preview}
                alt={label}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleClick}
                disabled={uploading}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Change
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                disabled={uploading}
              >
                <XIcon className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {error}
        </div>
      )}
    </div>
  )
}
