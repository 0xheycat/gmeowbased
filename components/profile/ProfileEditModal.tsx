'use client'

/**
 * ProfileEditModal Component
 * 
 * Template Strategy: music/ui/forms + trezoadmin-41/form-layout-01
 * Adaptation: 35%
 * Platform Reference: Twitter settings modal
 * 
 * Features:
 * - Display name editing (2-50 chars)
 * - Bio editing (150 char limit with counter)
 * - Avatar upload with preview
 * - Cover image upload with preview
 * - Social links (Twitter, GitHub, Website)
 * - Form validation with Zod
 * - Auto-save draft to localStorage
 * - Success/error notifications
 * 
 * Security:
 * - Input sanitization via API
 * - Owner-only access (checked by parent)
 * - File size limits (10MB per image)
 * - URL validation for social links
 * 
 * @module components/profile/ProfileEditModal
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import Image from 'next/image'
import { useDialog } from '@/lib/hooks/use-dialog'
import ErrorDialog from '@/components/ui/error-dialog'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import type { ProfileData } from '@/lib/profile/types'

// Validation schema matching API
const ProfileEditSchema = z.object({
  display_name: z.string().min(2, 'Name too short').max(50, 'Name too long').optional(),
  bio: z.string().max(150, 'Bio exceeds 150 characters').optional(),
  avatar_url: z.string().url('Invalid avatar URL').max(500).optional().or(z.literal('')),
  cover_image_url: z.string().url('Invalid cover URL').max(500).optional().or(z.literal('')),
  social_links: z.object({
    twitter: z.string().url('Invalid Twitter URL').max(200).optional().or(z.literal('')),
    github: z.string().url('Invalid GitHub URL').max(200).optional().or(z.literal('')),
    website: z.string().url('Invalid website URL').max(200).optional().or(z.literal('')),
  }).optional(),
})

type ProfileEditData = z.infer<typeof ProfileEditSchema>

interface ProfileEditModalProps {
  profile: ProfileData
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProfileEditData) => Promise<void>
}

export function ProfileEditModal({ profile, isOpen, onClose, onSave }: ProfileEditModalProps) {
  const [formData, setFormData] = useState<ProfileEditData>({
    display_name: profile.display_name,
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || '',
    cover_image_url: profile.cover_image_url || '',
    social_links: {
      twitter: profile.social_links.twitter || '',
      github: profile.social_links.github || '',
      website: profile.social_links.website || '',
    },
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  
  // Error dialog
  const errorDialog = useDialog()
  const [errorDialogConfig, setErrorDialogConfig] = useState<{
    title: string
    message: string
    type?: 'error' | 'warning' | 'info'
  }>({ title: '', message: '' })
  
  // Confirmation dialog for unsaved changes
  const confirmDialog = useDialog()
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    onConfirm: () => void
  }>({ onConfirm: () => {} })
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  // Auto-save draft to localStorage
  useEffect(() => {
    if (isOpen) {
      const draft = localStorage.getItem(`profile-edit-draft-${profile.fid}`)
      if (draft) {
        try {
          setFormData(JSON.parse(draft))
        } catch (e) {
          console.error('Failed to load draft:', e)
        }
      }
    }
  }, [isOpen, profile.fid])

  const saveDraft = useCallback(() => {
    localStorage.setItem(`profile-edit-draft-${profile.fid}`, JSON.stringify(formData))
  }, [formData, profile.fid])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(saveDraft, 1000)
      return () => clearTimeout(timer)
    }
  }, [formData, isOpen, saveDraft])

  const handleInputChange = (field: keyof ProfileEditData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleSocialLinkChange = (platform: 'twitter' | 'github' | 'website', value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value,
      },
    }))
    setErrors(prev => ({ ...prev, [`social_links.${platform}`]: '' }))
  }

  const handleImageUpload = async (field: 'avatar_url' | 'cover_image_url', file: File) => {
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [field]: 'File size must be less than 10MB' }))
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, [field]: 'File must be an image' }))
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      if (field === 'avatar_url') {
        setAvatarPreview(preview)
      } else {
        setCoverPreview(preview)
      }
    }
    reader.readAsDataURL(file)

    // Upload to Supabase Storage (Professional Pattern: Stripe/AWS S3)
    try {
      const type = field === 'avatar_url' ? 'avatar' : 'cover'
      
      // Step 1: Request signed upload URL
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: profile.fid,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          type,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        const errorMsg = responseData.error || 'Failed to get upload URL'
        const detailsMsg = responseData.details ? `\n\nDetails: ${responseData.details}` : ''
        console.error('[Upload] API error:', responseData)
        throw new Error(errorMsg + detailsMsg)
      }

      const { uploadUrl, publicUrl } = responseData

      // Validate response has required fields
      if (!uploadUrl || !publicUrl) {
        console.error('Invalid upload response:', responseData)
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
        console.error('Storage upload failed:', uploadResponse.status, uploadResponse.statusText)
        throw new Error('Failed to upload image to storage')
      }

      // Step 3: Set the public URL
      handleInputChange(field, publicUrl)
      
      // Clear any previous errors
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image'
      
      // Show error dialog
      setErrorDialogConfig({
        title: 'Upload Failed',
        message: errorMessage === 'Failed to generate upload URL' 
          ? 'Storage service is not configured. Please contact support or try again later.'
          : errorMessage,
        type: 'error'
      })
      errorDialog.open()
      
      // Also set inline error
      setErrors(prev => ({ ...prev, [field]: errorMessage }))
    }
  }

  const validateForm = (): boolean => {
    try {
      ProfileEditSchema.parse(formData)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
      await onSave(formData)
      // Clear draft on successful save
      localStorage.removeItem(`profile-edit-draft-${profile.fid}`)
      onClose()
    } catch (error) {
      console.error('Failed to save profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes'
      
      setErrorDialogConfig({
        title: 'Save Failed',
        message: errorMessage,
        type: 'error'
      })
      errorDialog.open()
      
      setErrors({ submit: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Ask to save draft if there are changes
    const hasChanges = JSON.stringify(formData) !== JSON.stringify({
      display_name: profile.display_name,
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      cover_image_url: profile.cover_image_url || '',
      social_links: {
        twitter: profile.social_links.twitter || '',
        github: profile.social_links.github || '',
        website: profile.social_links.website || '',
      },
    })

    if (hasChanges) {
      // Show confirmation dialog with new ConfirmDialog component
      setConfirmDialogConfig({
        onConfirm: () => {
          saveDraft()
          confirmDialog.close()
          onClose()
        }
      })
      confirmDialog.open()
      return
    }

    onClose()
  }

  const bioCharsRemaining = 150 - (formData.bio?.length || 0)

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={handleCancel}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0c1427] rounded-xl shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0c1427]">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
                <button
                  onClick={handleCancel}
                  className="p-2 text-gray-600 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cover Image
                  </label>
                  <div className="relative h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {(coverPreview || formData.cover_image_url) && (
                      <Image
                        src={coverPreview || formData.cover_image_url || ''}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload('cover_image_url', file)
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      aria-label="Upload cover image"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors">
                      <div className="text-white text-center">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium">Click to upload cover image</p>
                        <p className="text-xs text-white/70">Max 10MB</p>
                      </div>
                    </div>
                  </div>
                  {errors.cover_image_url && (
                    <p className="mt-1 text-sm text-red-500">{errors.cover_image_url}</p>
                  )}
                </div>

                {/* Avatar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {(avatarPreview || formData.avatar_url) && (
                        <Image
                          src={avatarPreview || formData.avatar_url || ''}
                          alt="Avatar preview"
                          fill
                          className="object-cover"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('avatar_url', file)
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        aria-label="Upload avatar"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload a new avatar (max 10MB)
                      </p>
                      {errors.avatar_url && (
                        <p className="mt-1 text-sm text-red-500">{errors.avatar_url}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="display_name"
                    value={formData.display_name || ''}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    placeholder="Your display name"
                    maxLength={50}
                  />
                  {errors.display_name && (
                    <p className="mt-1 text-sm text-red-500">{errors.display_name}</p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                    placeholder="Tell us about yourself..."
                    rows={4}
                    maxLength={150}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {errors.bio && (
                      <p className="text-sm text-red-500">{errors.bio}</p>
                    )}
                    <p className={`text-sm ml-auto ${bioCharsRemaining < 20 ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                      {bioCharsRemaining} characters remaining
                    </p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Social Links</h3>

                  {/* Twitter */}
                  <div>
                    <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Twitter
                    </label>
                    <input
                      type="url"
                      id="twitter"
                      value={formData.social_links?.twitter || ''}
                      onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="https://twitter.com/username"
                    />
                    {errors['social_links.twitter'] && (
                      <p className="mt-1 text-sm text-red-500">{errors['social_links.twitter']}</p>
                    )}
                  </div>

                  {/* GitHub */}
                  <div>
                    <label htmlFor="github" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GitHub
                    </label>
                    <input
                      type="url"
                      id="github"
                      value={formData.social_links?.github || ''}
                      onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="https://github.com/username"
                    />
                    {errors['social_links.github'] && (
                      <p className="mt-1 text-sm text-red-500">{errors['social_links.github']}</p>
                    )}
                  </div>

                  {/* Website */}
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={formData.social_links?.website || ''}
                      onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="https://yourwebsite.com"
                    />
                    {errors['social_links.website'] && (
                      <p className="mt-1 text-sm text-red-500">{errors['social_links.website']}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Sticky on mobile for better UX */}
                <div className="sticky bottom-0 left-0 right-0 flex items-center justify-end gap-3 pt-4 pb-4 md:pb-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0c1427] -mx-4 md:-mx-6 px-4 md:px-6 mt-6">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                    disabled={saving}
                  >
                    Cancel
                  </button>
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
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
      
    {/* Error Dialog */}
    <ErrorDialog
      isOpen={errorDialog.isOpen}
      onClose={errorDialog.close}
      title={errorDialogConfig.title}
      message={errorDialogConfig.message}
      type={errorDialogConfig.type || 'error'}
    />
    
    {/* Confirmation Dialog for Unsaved Changes */}
    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      onClose={() => {
        confirmDialog.close()
        onClose()
      }}
      onConfirm={confirmDialogConfig.onConfirm}
      title="Unsaved Changes"
      message="You have unsaved changes. Would you like to save them as a draft before closing?"
      variant="warning"
      confirmLabel="Save Draft"
      cancelLabel="Discard Changes"
    />
  </>
  )
}
