'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/forms/input'
import { Button } from '@/components/ui/button'
import { ChevronRight } from '@/components/icons/chevron-right'
import { BadgeSelector } from './BadgeSelector'
import type { QuestDraft } from '@/lib/quests/types'

// Inline icons
function CoinsIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function BadgeIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  )
}

interface RewardsFormProps {
  draft: Partial<QuestDraft>
  estimatedCost: number
  onUpdate: (data: Partial<QuestDraft>) => void
  onNext: () => void
  onBack: () => void
  className?: string
}

export function RewardsForm({
  draft,
  estimatedCost,
  onUpdate,
  onNext,
  onBack,
  className = '',
}: RewardsFormProps) {
  const [formData, setFormData] = useState({
    reward_points_awarded: draft.reward_points_awarded || 10,
    reward_badge_ids: draft.reward_badge_ids || [],
    create_new_badge: draft.create_new_badge || false,
    announce_via_bot: draft.announce_via_bot || false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error
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

    if (formData.reward_points_awarded < 10) {
      newErrors.reward_points_awarded = 'Minimum reward is 10 POINTS'
    }
    if (formData.reward_points_awarded > 1000) {
      newErrors.reward_points_awarded = 'Maximum reward is 1000 POINTS'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validate()) {
      onUpdate(formData)
      onNext()
    }
  }

  // Calculate total cost including rewards
  const totalCost = estimatedCost + (formData.reward_points_awarded || 0)
  const badgeCreationCost = formData.create_new_badge ? 50 : 0
  const grandTotal = totalCost + badgeCreationCost

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quest Rewards</h2>
        <p className="text-muted-foreground">
          Configure what users earn for completing your quest
        </p>
      </div>

      {/* Cost Breakdown Card */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CoinsIcon className="h-5 w-5" />
          Cost Breakdown
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quest Creation Cost:</span>
            <span className="font-medium">{estimatedCost} BASE POINTS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reward Pool (Escrowed):</span>
            <span className="font-medium">{formData.reward_points_awarded} POINTS</span>
          </div>
          {badgeCreationCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Badge Creation:</span>
              <span className="font-medium">{badgeCreationCost} BASE POINTS</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-semibold">Total Cost:</span>
            <span className="font-bold text-lg">{grandTotal} BASE POINTS</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          * BASE POINTS will be escrowed until quest completion or expiry
        </p>
      </div>

      {/* Rewards Form */}
      <div className="grid gap-6 rounded-lg border border-border bg-card p-6">
        {/* POINTS Reward */}
        <div>
          <Input
            label="POINTS Reward"
            type="number"
            value={formData.reward_points_awarded}
            onChange={(e) => handleChange('reward_points_awarded', parseInt(e.target.value) || 0)}
            min="10"
            max="1000"
            required
            error={errors.reward_points_awarded}
            helperText="Points users earn on completion (10-1000)"
            prefix={<CoinsIcon className="h-4 w-4 text-muted-foreground" />}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            <strong>POINTS:</strong> Spendable currency from contract. XP is calculated automatically based on quest type.
          </p>
        </div>

        {/* Badge Rewards - Professional Gallery */}
        <div className="space-y-4">
          <BadgeSelector
            selectedBadgeIds={formData.reward_badge_ids}
            onChange={(badgeIds) => handleChange('reward_badge_ids', badgeIds)}
          />
        </div>

        {/* Post-Publish Options */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="font-semibold text-sm">Post-Publish Options</h3>
          
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.announce_via_bot}
              onChange={(e) => handleChange('announce_via_bot', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="font-medium text-sm">Announce via @gmeowbased Bot</div>
              <div className="text-xs text-muted-foreground mt-1">
                Share your quest announcement on Farcaster via the @gmeowbased bot. Your quest will be featured to the community with a shareable frame.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">
          Continue to Preview
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
