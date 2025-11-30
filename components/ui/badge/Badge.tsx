'use client'

import React, { type ReactNode } from 'react'
import clsx from 'clsx'

export interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  className?: string
}

/**
 * Badge component for status indicators, counts, labels
 * Can show just a dot or include text
 * 
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="primary" dot>3</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}) => {
  const baseStyles = clsx(
    'inline-flex items-center justify-center gap-1.5',
    'font-medium rounded-full',
    'transition-all duration-200',
    
    // Size variants
    {
      'px-2 py-0.5 text-xs': size === 'sm',
      'px-2.5 py-1 text-xs': size === 'md',
      'px-3 py-1.5 text-sm': size === 'lg',
    },
    
    // Variant styles
    {
      'bg-white/10 text-white': variant === 'default',
      'bg-gmeow-purple text-white': variant === 'primary',
      'bg-green-600 text-white': variant === 'success',
      'bg-yellow-600 text-black': variant === 'warning',
      'bg-red-600 text-white': variant === 'danger',
    },
    
    className
  )

  return (
    <span className={baseStyles}>
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          'animate-pulse',
          {
            'bg-white': variant === 'default',
            'bg-white': variant === 'primary',
            'bg-green-300': variant === 'success',
            'bg-yellow-300': variant === 'warning',
            'bg-red-300': variant === 'danger',
          }
        )} />
      )}
      {children}
    </span>
  )
}
