'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/forms/input'
import { Textarea } from '@/components/ui/forms/textarea'
import { Select } from '@/components/ui/forms/select'
import { Button } from '@/components/ui/button'
import { ChevronRight } from '@/components/icons/chevron-right'
import { ImageUploader } from './ImageUploader'
import type { QuestDraft } from '@/lib/quests/types'

interface QuestBasicsFormProps {
  draft: Partial<QuestDraft>
  onUpdate: (data: Partial<QuestDraft>) => void
  onNext: () => void
  onBack: () => void
  className?: string
}

const CATEGORIES = [
  { value: 'social', label: 'Social (Farcaster)' },
  { value: 'onchain', label: 'Onchain (Base)' },
  { value: 'hybrid', label: 'Hybrid (Social + Onchain)' },
]

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const TIME_ESTIMATES = [
  { value: '5min', label: '5 minutes' },
  { value: '15min', label: '15 minutes' },
  { value: '30min', label: '30 minutes' },
  { value: '1hr', label: '1 hour' },
  { value: '2hr', label: '2 hours' },
  { value: '4hr+', label: '4+ hours' },
]

export function QuestBasicsForm({
  draft,
  onUpdate,
  onNext,
  onBack,
  className = '',
}: QuestBasicsFormProps) {
  const [formData, setFormData] = useState({
    title: draft.title || '',
    description: draft.description || '',
    category: draft.category || 'social',
    difficulty: draft.difficulty || 'beginner',
    estimated_time: draft.estimated_time || '15min',
    starts_at: draft.starts_at || '',
    ends_at: draft.ends_at || '',
    max_participants: draft.max_participants || '',
    cover_image_url: draft.cover_image_url || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title || formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters'
    }
    if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }

    if (!formData.description || formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    if (!formData.ends_at) {
      newErrors.ends_at = 'End date is required'
    } else {
      const endDate = new Date(formData.ends_at)
      const startDate = formData.starts_at ? new Date(formData.starts_at) : new Date()
      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 90)

      if (endDate <= startDate) {
        newErrors.ends_at = 'End date must be after start date'
      }
      if (endDate > maxDate) {
        newErrors.ends_at = 'End date cannot be more than 90 days from now'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validate()) {
      // Convert max_participants to number if provided
      const dataToSubmit = {
        ...formData,
        max_participants: formData.max_participants 
          ? Number(formData.max_participants) 
          : undefined,
      }
      onUpdate(dataToSubmit)
      onNext()
    }
  }

  // Calculate min/max dates
  const minStartDate = new Date().toISOString().split('T')[0]
  const minEndDate = formData.starts_at || minStartDate
  const maxEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quest Basics</h2>
        <p className="text-muted-foreground">
          Provide the core details for your quest
        </p>
      </div>

      <div className="grid gap-6 rounded-lg border border-border bg-card p-6">
        {/* Title */}
        <Input
          label="Quest Title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter a catchy quest title"
          required
          error={errors.title}
          helperText={`${formData.title.length}/100 characters`}
        />

        {/* Description */}
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe what users need to do and what they'll learn"
          rows={4}
          required
          error={errors.description}
          helperText={`${formData.description.length}/500 characters`}
        />

        {/* Category & Difficulty */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            required
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </Select>

          <Select
            label="Difficulty"
            value={formData.difficulty}
            onChange={(e) => handleChange('difficulty', e.target.value)}
            required
          >
            {DIFFICULTIES.map((diff) => (
              <option key={diff.value} value={diff.value}>
                {diff.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Estimated Time */}
        <Select
          label="Estimated Time"
          value={formData.estimated_time}
          onChange={(e) => handleChange('estimated_time', e.target.value)}
          required
          helperText="How long will it take to complete?"
        >
          {TIME_ESTIMATES.map((time) => (
            <option key={time.value} value={time.value}>
              {time.label}
            </option>
          ))}
        </Select>

        {/* Dates */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="Start Date (Optional)"
            type="date"
            value={formData.starts_at}
            onChange={(e) => handleChange('starts_at', e.target.value)}
            min={minStartDate}
            helperText="Leave empty to start immediately"
          />

          <Input
            label="End Date"
            type="date"
            value={formData.ends_at}
            onChange={(e) => handleChange('ends_at', e.target.value)}
            min={minEndDate}
            max={maxEndDate}
            required
            error={errors.ends_at}
            helperText="Maximum 90 days from start"
          />
        </div>

        {/* Max Participants */}
        <Input
          label="Max Participants (Optional)"
          type="number"
          value={formData.max_participants}
          onChange={(e) => handleChange('max_participants', e.target.value)}
          placeholder="Leave empty for unlimited"
          min="1"
          helperText="Limit the number of users who can join"
        />

        {/* Cover Image */}
        <ImageUploader
          label="Cover Image"
          value={formData.cover_image_url}
          onChange={(url) => handleChange('cover_image_url', url)}
          description="Hero image for your quest (recommended: 1200x675px, 16:9 aspect ratio)"
          aspectRatio="16:9"
          maxSizeMB={5}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
