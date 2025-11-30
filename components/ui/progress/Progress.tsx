'use client'

import React from 'react'
import clsx from 'clsx'

export interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'success' | 'danger'
  showLabel?: boolean
  label?: string
  className?: string
}

/**
 * Progress bar component for loading, XP, quest completion
 * 
 * @example
 * <Progress value={75} max={100} variant="primary" showLabel />
 * <Progress value={xp} max={nextLevel} label="Level Progress" />
 */
export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const containerStyles = clsx(
    'w-full overflow-hidden rounded-full bg-white/10',
    
    // Size variants
    {
      'h-1': size === 'sm',
      'h-2': size === 'md',
      'h-3': size === 'lg',
    },
    
    className
  )

  const barStyles = clsx(
    'h-full transition-all duration-500 ease-out rounded-full',
    
    // Variant styles
    {
      'bg-gradient-to-r from-white/40 to-white/60': variant === 'default',
      'bg-gradient-to-r from-gmeow-purple to-gmeow-purple-dark': variant === 'primary',
      'bg-gradient-to-r from-green-500 to-green-600': variant === 'success',
      'bg-gradient-to-r from-red-500 to-red-600': variant === 'danger',
    }
  )

  return (
    <div className="w-full">
      {(label || showLabel) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-white/80">{label}</span>
          )}
          {showLabel && (
            <span className="text-sm font-medium text-white/60">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className={containerStyles}>
        <div
          className={barStyles}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
