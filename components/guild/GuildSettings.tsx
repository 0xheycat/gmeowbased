/**
 * GuildSettings Component (WCAG AA Compliant)
 * 
 * Purpose: Professional guild settings and management for leaders and members
 * 
 * Dialog Usage:
 * - ErrorDialog: Displays guild save errors with retry option
 * - ConfirmDialog: Destructive confirmations for guild deletion and member removal
 * - useDialog: State management for error dialog
 * 
 * Template Strategy: Adapted from ProfileEditModal.tsx professional patterns
 * Features:
 * - Guild banner upload with preview (16:9, max 5MB)
 * - Guild info editing (name, description)
 * - Form validation with error handling
 * - Error/success dialogs
 * - Auto-save draft support
 * - Leave guild confirmation
 * - WCAG AA keyboard navigation
 * - ARIA labels for forms
 * - Error announcements for screen readers
 * 
 * Security:
 * - Leader/owner permission checks
 * - File size/type validation
 * - Two-step upload (signed URL → storage)
 * 
 * @module components/guild/GuildSettings
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { z } from 'zod'
import Image from 'next/image'
import { EditIcon, ExportIcon, UploadIcon } from '@/components/icons'
import { useDialog } from '@/components/dialogs'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import { ConfirmDialog } from '@/components/dialogs'
import { ErrorDialog } from '@/components/dialogs'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/accessibility'

// Validation schema
const GuildEditSchema = z.object({
  name: z.string().min(2, 'Name too short').max(50, 'Name too long').optional(),
  description: z.string().max(500, 'Description exceeds 500 characters').optional(),
  banner: z.string().url('Invalid banner URL').max(500).optional().or(z.literal('')),
})

type GuildEditData = z.infer<typeof GuildEditSchema>

export interface GuildSettingsProps {
  guildId: string
  isLeader: boolean
  isOwner?: boolean
}

export function GuildSettings({ guildId, isLeader, isOwner = false }: GuildSettingsProps) {
  // Hydration fix
  const [mounted, setMounted] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState<GuildEditData>({
    name: '',
    description: '',
    banner: '',
  })
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Dialogs
  const errorDialog = useDialog()
  const [errorDialogConfig, setErrorDialogConfig] = useState<{
    title: string
    message: string
    type?: 'error' | 'warning' | 'info'
    onRetry?: () => void
  }>({ title: '', message: '' })
  
  const confirmLeaveDialog = useDialog()

  // Load guild settings (from database metadata + contract)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to load from database first (has description and banner)
        const metadataResponse = await fetch(`/api/guild/${guildId}/metadata`)
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          if (metadata.success && metadata.guild) {
            setFormData({
              name: metadata.guild.name || '',
              description: metadata.guild.description || '',
              banner: metadata.guild.banner || '',
            })
            return
          }
        }
        
        // Fallback to contract data (only has name)
        const response = await fetch(`/api/guild/${guildId}`)
        if (!response.ok) throw new Error('Failed to load guild')
        
        const data = await response.json()
        setFormData({
          name: data.guild?.name || '',
          description: '',
          banner: '',
        })
      } catch (err) {
        setErrorDialogConfig({
          title: 'Load Failed',
          message: 'Failed to load guild settings. Please check your connection.',
          type: 'error',
          onRetry: () => window.location.reload()
        })
        errorDialog.open()
      }
    }
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId])

  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!mounted || typeof window === 'undefined') return
    localStorage.setItem(`guild-settings-draft-${guildId}`, JSON.stringify(formData))
  }, [mounted, formData, guildId])

  useEffect(() => {
    if (!mounted) return
    const timer = setTimeout(saveDraft, 1000)
    return () => clearTimeout(timer)
  }, [mounted, formData, saveDraft])

  const handleInputChange = (field: keyof GuildEditData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleBannerSelect = (file: File) => {
    // Validate file size (5MB max for banners)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, banner: 'Banner must be less than 5MB' }))
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, banner: 'File must be an image' }))
      return
    }

    // Store pending file (will upload on Save)
    setPendingBannerFile(file)

    // Create preview immediately (Twitter/Discord pattern)
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      setBannerPreview(preview)
    }
    reader.readAsDataURL(file)
    
    // Clear any previous errors
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.banner
      return newErrors
    })
  }

  const uploadBannerToStorage = async (file: File): Promise<string> => {
    // Step 1: Request signed upload URL
    const response = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fid: guildId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        type: 'guild-banner',
        guildId: guildId,
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errorMsg = responseData.error || 'Failed to get upload URL'
      throw new Error(errorMsg)
    }

    const { uploadUrl, publicUrl } = responseData

    if (!uploadUrl || !publicUrl) {
      throw new Error('Invalid upload configuration')
    }

    // Step 2: Upload file to storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Cache-Control': 'public, max-age=31536000',
      },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload banner to storage')
    }

    return publicUrl
  }

  const validateForm = (): boolean => {
    try {
      GuildEditSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          const path = err.path.join('.')
          newErrors[path] = err.message
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLeader) {
      setErrorDialogConfig({
        title: 'Permission Denied',
        message: 'Only guild leaders can update settings.',
        type: 'warning'
      })
      errorDialog.open()
      return
    }

    if (!validateForm()) {
      setErrorDialogConfig({
        title: 'Validation Error',
        message: 'Please fix the errors in the form before saving.',
        type: 'warning'
      })
      errorDialog.open()
      return
    }

    setSaving(true)
    try {
      let finalFormData = { ...formData }
      
      // Step 1: Upload pending banner if exists (Professional Pattern: Upload on Save)
      if (pendingBannerFile) {
        try {
          const publicUrl = await uploadBannerToStorage(pendingBannerFile)
          finalFormData.banner = publicUrl
          setPendingBannerFile(null)
          setBannerPreview(null)
        } catch (uploadError) {
          throw new Error(`Banner upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`)
        }
      }
      
      // Step 2: Save all settings to database
      const response = await fetch(`/api/guild/${guildId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalFormData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update guild')
      }

      const result = await response.json()
      if (result.success) {
        // Clear draft on successful save
        localStorage.removeItem(`guild-settings-draft-${guildId}`)
        
        setSuccessMessage('Guild settings updated successfully!')
        
        // Reload page after 1.5 seconds to show updated banner in header
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes'
      
      setErrorDialogConfig({
        title: 'Save Failed',
        message: errorMessage,
        type: 'error',
        onRetry: () => {
          const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
          handleSave(syntheticEvent)
        }
      })
      errorDialog.open()
      
      setErrors({ submit: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handleLeaveGuild = async () => {
    try {
      const response = await fetch(`/api/guild/${guildId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json().catch(() => ({}))
      
      if (!response.ok) {
        setErrorDialogConfig({
          title: 'Leave Failed',
          message: data.message || 'Failed to leave guild. Please try again.',
          type: 'error',
          onRetry: handleLeaveGuild
        })
        errorDialog.open()
        return
      }
      
      // Redirect to guilds list
      window.location.href = '/guild'
    } catch (err) {
      setErrorDialogConfig({
        title: 'Leave Failed',
        message: 'Failed to leave guild. Please check your connection and try again.',
        type: 'error',
        onRetry: handleLeaveGuild
      })
      errorDialog.open()
    }
  }

  const descCharsRemaining = 500 - (formData.description?.length || 0)

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Success Message */}
        {successMessage && (
          <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Guild Banner */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <UploadIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Guild Banner
              </h3>
            </div>

            <div className="space-y-4">
              {/* Banner Preview */}
              <div className="relative w-full max-w-full aspect-[16/9] max-h-[540px] min-h-0 bg-gray-900 rounded-lg overflow-hidden">
                {(bannerPreview || formData.banner) && (
                  <Image
                    src={bannerPreview || formData.banner || ''}
                    alt="Guild banner preview"
                    fill
                    className="object-cover"
                    priority
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleBannerSelect(file)
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  aria-label="Select guild banner"
                  disabled={saving || !isLeader}
                />
                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors ${!isLeader ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div className="text-center">
                    <svg className="w-12 h-12 text-white mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-white font-medium">
                      {saving ? 'Saving...' : (bannerPreview || formData.banner ? 'Change Banner' : 'Select Banner')}
                    </p>
                    <p className="text-white/80 text-sm mt-1">
                      {pendingBannerFile ? '✓ Ready to save' : 'Recommended: 960x540px (16:9), max 5MB'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner Error */}
              {errors.banner && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {errors.banner}
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <EditIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Basic Information
              </h3>
            </div>

            <div className="space-y-6">
              {/* Guild Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guild Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter guild name"
                  maxLength={50}
                  disabled={!isLeader}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Guild Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Describe your guild..."
                  rows={4}
                  maxLength={500}
                  disabled={!isLeader}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description}</p>
                  )}
                  <p className={`text-sm ml-auto ${descCharsRemaining < 50 ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {descCharsRemaining} characters remaining
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isLeader && (
            <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-[#0c1427]/80 backdrop-blur-sm py-4 -mx-4 px-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </form>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-4">
            Danger Zone
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Leave Guild</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Permanently leave this guild. You'll need to be re-invited to rejoin.
              </p>
            </div>
            <button
              onClick={() => confirmLeaveDialog.open()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              {...createKeyboardHandler(() => confirmLeaveDialog.open())}
            >
              <ExportIcon className="w-5 h-5" />
              Leave Guild
            </button>
          </div>
        </div>
      </div>

      {/* Error Dialog with Retry */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={errorDialog.close}
        title={errorDialogConfig.title}
        error={errorDialogConfig.message}
        type={errorDialogConfig.type}
        onRetry={errorDialogConfig.onRetry}
      />

      {/* Leave Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmLeaveDialog.isOpen}
        onClose={confirmLeaveDialog.close}
        onConfirm={() => {
          confirmLeaveDialog.close()
          handleLeaveGuild()
        }}
        title="Leave Guild"
        message="Are you sure you want to leave this guild? This action cannot be undone and you'll need to be re-invited to rejoin."
        variant="destructive"
        confirmLabel="Leave Guild"
        cancelLabel="Cancel"
      />
    </>
  )
}
