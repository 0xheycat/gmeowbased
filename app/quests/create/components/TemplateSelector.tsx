'use client'

import { useState } from 'react'
import Image from 'next/image'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Button } from '@/components/ui/button'
import type { QuestTemplate } from '@/lib/quests/types'

interface TemplateSelectorProps {
  templates: QuestTemplate[]
  onSelect: (template: QuestTemplate) => void
  className?: string
}

export function TemplateSelector({
  templates,
  onSelect,
  className = '',
}: TemplateSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = (template: QuestTemplate) => {
    setSelectedId(template.id)
    onSelect(template)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Choose a Template</h2>
        <p className="text-muted-foreground">
          Start with a pre-built template or create from scratch
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedId === template.id}
            onSelect={() => handleSelect(template)}
          />
        ))}
      </div>
    </div>
  )
}

interface TemplateCardProps {
  template: QuestTemplate
  isSelected: boolean
  onSelect: () => void
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const { name, description, category, difficulty, cost_points, usage_count, preview_image } = template

  // Category-based gradient colors (fallback when no preview_image)
  const categoryGradients: Record<string, string> = {
    social: 'from-blue-500 to-purple-600',
    onchain: 'from-green-500 to-emerald-600',
    creative: 'from-pink-500 to-rose-600',
    gaming: 'from-orange-500 to-red-600',
    learning: 'from-cyan-500 to-blue-600',
  }
  const gradientClass = categoryGradients[category] || 'from-gray-500 to-gray-600'

  return (
    <div
      className={`
        group relative overflow-hidden rounded-lg border-2 transition-all
        ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
        hover:-translate-y-1 cursor-pointer
      `}
      onClick={onSelect}
    >
      {/* Template Image or Gradient */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {preview_image ? (
          <Image
            src={preview_image}
            alt={name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} transition-transform group-hover:scale-105`} />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute top-4 right-4 rounded-full bg-primary p-2">
            <CheckCircleIcon className="h-5 w-5 text-primary-foreground" />
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-md">
            {category}
          </span>
        </div>

        {/* Difficulty Badge */}
        <div className="absolute top-4 left-4 mt-10">
          <span
            className={`
              inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide backdrop-blur-md
              ${difficulty === 'beginner' ? 'bg-green-500/20 text-green-100' : ''}
              ${difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-100' : ''}
              ${difficulty === 'advanced' ? 'bg-red-500/20 text-red-100' : ''}
            `}
          >
            {difficulty}
          </span>
        </div>
      </div>

      {/* Template Info */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MonetizationOnIcon className="h-4 w-4" />
              <span>{cost_points} points</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AccessTimeIcon className="h-4 w-4" />
              <span>{usage_count || 0} used</span>
            </div>
          </div>
        </div>

        {/* Select Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          variant={isSelected ? 'default' : 'outline'}
          size="sm"
          className="w-full"
        >
          {isSelected ? 'Selected' : 'Use Template'}
        </Button>
      </div>
    </div>
  )
}
