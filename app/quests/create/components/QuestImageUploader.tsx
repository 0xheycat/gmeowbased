'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import UploadIcon from '@/components/icons/upload-icon'
import ImageIcon from '@/components/icons/image-icon'

// X icon inline (close button)
function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

interface QuestImageUploaderProps {
  value?: string // image URL or data URL
  fileName?: string
  onChange: (data: { imageUrl: string; fileName: string }) => void
  onClear: () => void
  className?: string
}

export function QuestImageUploader({
  value,
  fileName,
  onChange,
  onClear,
  className = '',
}: QuestImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file (PNG, JPG, GIF, WebP)')
        return
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        setError('Image must be less than 10MB')
        return
      }

      setError('')
      setIsUploading(true)

      try {
        // Convert to data URL for preview (Phase 4 uses localStorage, Phase 5 will add Supabase upload)
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          onChange({
            imageUrl: result,
            fileName: file.name,
          })
          setIsUploading(false)
        }
        reader.onerror = () => {
          setError('Failed to read image file')
          setIsUploading(false)
        }
        reader.readAsDataURL(file)
      } catch (err) {
        setError('Failed to upload image')
        setIsUploading(false)
      }
    },
    [onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  const handleClear = useCallback(() => {
    setError('')
    onClear()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onClear])

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload quest image"
      />

      {value ? (
        // Image preview with clear button
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950/40">
          <div className="relative aspect-video w-full">
            <Image
              src={value}
              alt="Quest banner"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
          <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/80 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-300">{fileName || 'Quest image'}</p>
              <p className="text-xs text-slate-500">Click to replace</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="shrink-0"
              aria-label="Remove image"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
          <div
            onClick={handleClick}
            className="absolute inset-0 cursor-pointer opacity-0 transition hover:bg-black/50 hover:opacity-100"
          >
            <div className="flex h-full items-center justify-center">
              <div className="rounded-lg bg-slate-900/90 px-4 py-2 text-sm text-white">
                Click to replace
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Drop zone
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition ${
            isDragOver
              ? 'border-sky-500 bg-sky-500/10'
              : 'border-white/20 bg-slate-950/40 hover:border-sky-500/50 hover:bg-slate-950/60'
          }`}
        >
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 px-6 py-8">
            {isUploading ? (
              <>
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500/20 border-t-sky-500" />
                <p className="text-sm text-slate-400">Uploading...</p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-slate-900/60 p-4">
                  <ImageIcon className="h-8 w-8 text-sky-500" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-white">
                    Drop quest image here or click to browse
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Recommended: 1280×720px (16:9 aspect ratio)
                  </p>
                  <p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF, WebP • Max 10MB</p>
                </div>
                <Button variant="secondary" size="sm" className="pointer-events-none">
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Select Image
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-3 rounded-lg bg-slate-900/40 border border-white/10 px-3 py-2">
        <p className="text-xs text-slate-400">
          <span className="font-medium text-slate-300">Pro tip:</span> Quest images appear on cards
          and frames. Use high-quality artwork with clear focus for best results.
        </p>
      </div>
    </div>
  )
}
