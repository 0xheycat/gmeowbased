/**
 * Quick Actions Panel - Layer3-Inspired
 * 
 * Provides 1-tap actions for common tasks
 * Inspired by Layer3's activation cards
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'

interface QuickAction {
  id: string
  icon: string
  label: string
  description: string
  href?: string
  onClick?: () => void
  disabled?: boolean
  badge?: string
  reward?: string
  gradient?: string
}

interface QuickActionsPanelProps {
  actions: QuickAction[]
}

export function QuickActionsPanel({ actions }: QuickActionsPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold theme-text-primary">⚡ Quick Actions</h2>
          <p className="text-sm theme-text-secondary mt-1">One-tap shortcuts to level up faster</p>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => {
          const ActionWrapper = action.href ? Link : 'button'
          const wrapperProps = action.href 
            ? { href: action.href }
            : { onClick: action.onClick, disabled: action.disabled, type: 'button' as const }

          return (
            <ActionWrapper
              key={action.id}
              {...wrapperProps}
              onMouseEnter={() => setHoveredId(action.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                group relative p-6 rounded-2xl text-left transition-all duration-300
                ${action.gradient || 'bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-sky-500/10 dark:from-purple-500/20 dark:via-purple-600/10 dark:to-sky-500/20'}
                ${action.disabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/10 cursor-pointer'
                }
                border border-purple-500/20 dark:border-purple-500/30
                ${hoveredId === action.id ? 'border-purple-500/50 dark:border-purple-500/60' : ''}
              `}
            >
              {/* Gradient Overlay on Hover */}
              <div className={`
                absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
                bg-gradient-to-br from-purple-500/5 to-sky-500/5 dark:from-purple-500/10 dark:to-sky-500/10
              `} />

              {/* Badge */}
              {action.badge && (
                <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg">
                  {action.badge}
                </div>
              )}

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </div>

                {/* Label */}
                <h3 className="font-bold text-lg theme-text-primary mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {action.label}
                </h3>

                {/* Description */}
                <p className="text-xs theme-text-secondary mb-3 line-clamp-2">
                  {action.description}
                </p>

                {/* Reward */}
                {action.reward && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
                      {action.reward}
                    </span>
                  </div>
                )}
              </div>

              {/* Arrow Indicator */}
              {!action.disabled && (
                <div className="absolute bottom-4 right-4 text-purple-500 dark:text-purple-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                  →
                </div>
              )}
            </ActionWrapper>
          )
        })}
      </div>
    </div>
  )
}
