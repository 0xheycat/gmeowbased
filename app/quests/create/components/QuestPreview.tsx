'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'
import type { QuestDraft, TaskConfig } from '@/lib/quests/types'

interface QuestPreviewProps {
  draft: QuestDraft
  estimatedCost: number
  onPublish: () => void
  onBack: () => void
  isPublishing?: boolean
  className?: string
}

export function QuestPreview({
  draft,
  estimatedCost,
  onPublish,
  onBack,
  isPublishing = false,
  className = '',
}: QuestPreviewProps) {
  const [showValidation, setShowValidation] = useState(false)

  // Validation checks
  const validationChecks = [
    {
      label: 'Quest title provided',
      passed: !!draft.title && draft.title.length >= 10,
    },
    {
      label: 'Quest description provided',
      passed: !!draft.description && draft.description.length >= 20,
    },
    {
      label: 'At least one task configured',
      passed: draft.tasks && draft.tasks.length > 0,
    },
    {
      label: 'All tasks have titles',
      passed: draft.tasks?.every((task) => task.title) ?? false,
    },
    {
      label: 'End date is valid',
      passed: !!draft.ends_at,
    },
    {
      label: 'Rewards configured',
      passed: draft.reward_points_awarded && draft.reward_points_awarded >= 10,
    },
  ]

  const allChecksPassed = validationChecks.every((check) => check.passed)

  const handlePublish = () => {
    if (!allChecksPassed) {
      setShowValidation(true)
      return
    }
    onPublish()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Preview & Publish</h2>
        <p className="text-muted-foreground">
          Review your quest before publishing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quest Card Preview */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Quest Card Preview</h3>
          <QuestCardPreview draft={draft} />
        </div>

        {/* Quest Details Preview */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Quest Details</h3>
          <QuestDetailsPreview draft={draft} estimatedCost={estimatedCost} />
        </div>
      </div>

      {/* Validation Checklist */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Pre-Publish Checklist</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowValidation(!showValidation)}
          >
            {showValidation ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {showValidation && (
          <div className="space-y-2">
            {validationChecks.map((check, index) => (
              <div key={index} className="flex items-center gap-2">
                {check.passed ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <CancelIcon className="h-5 w-5 text-red-500" />
                )}
                <span
                  className={
                    check.passed ? 'text-foreground' : 'text-muted-foreground'
                  }
                >
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {!allChecksPassed && showValidation && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            Please fix the issues above before publishing
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isPublishing}>
          Back
        </Button>
        <Button
          onClick={handlePublish}
          disabled={isPublishing || !allChecksPassed}
          isLoading={isPublishing}
        >
          {isPublishing ? 'Publishing...' : 'Publish Quest'}
        </Button>
      </div>
    </div>
  )
}

// Quest Card Preview Component
function QuestCardPreview({ draft }: { draft: QuestDraft }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border transition-transform hover:-translate-y-1">
      {/* Cover Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {draft.cover_image_url ? (
          <Image
            src={draft.cover_image_url}
            alt={draft.title || 'Quest cover'}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No Cover Image
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-md">
            {draft.category || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-semibold truncate">
          {draft.title || 'Untitled Quest'}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {draft.description || 'No description provided'}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MonetizationOnIcon className="h-4 w-4" />
              <span>{draft.reward_points_awarded || 0} points</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AccessTimeIcon className="h-4 w-4" />
              <span>{draft.estimated_time || '15min'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Quest Details Preview Component
function QuestDetailsPreview({
  draft,
  estimatedCost,
}: {
  draft: QuestDraft
  estimatedCost: number
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <DetailRow label="Title" value={draft.title || 'Not set'} />
      <DetailRow label="Category" value={draft.category || 'Not set'} />
      <DetailRow label="Difficulty" value={draft.difficulty || 'Not set'} />
      <DetailRow
        label="Estimated Time"
        value={draft.estimated_time || 'Not set'}
      />
      <DetailRow
        label="Tasks"
        value={`${draft.tasks?.length || 0} task(s)`}
      />
      <DetailRow
        label="Rewards"
        value={`${draft.reward_points_awarded || 0} POINTS`}
      />
      <DetailRow label="Creation Cost" value={`${estimatedCost} POINTS`} />
      
      {draft.starts_at && (
        <DetailRow
          label="Start Date"
          value={new Date(draft.starts_at).toLocaleDateString()}
        />
      )}
      <DetailRow
        label="End Date"
        value={draft.ends_at ? new Date(draft.ends_at).toLocaleDateString() : 'Not set'}
      />
      
      {draft.max_participants && (
        <DetailRow label="Max Participants" value={draft.max_participants.toString()} />
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
