'use client'

import React, { type ReactNode } from 'react'
import clsx from 'clsx'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'solid' | 'dashed' | 'dotted'
  children?: ReactNode
  className?: string
}

/**
 * Divider for visual separation of content
 * Can include text label in the middle
 * 
 * @example
 * <Divider />
 * <Divider>OR</Divider>
 * <Divider orientation="vertical" className="h-20" />
 */
export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  children,
  className,
}) => {
  if (children && orientation === 'horizontal') {
    // Divider with text label
    return (
      <div className={clsx('flex items-center gap-4 my-4', className)}>
        <div className={clsx(
          'flex-1 h-px',
          variant === 'dashed' && 'border-t border-dashed border-white/20',
          variant === 'dotted' && 'border-t border-dotted border-white/20',
          variant === 'solid' && 'bg-white/20'
        )} />
        <span className="text-sm text-white/60 font-medium">
          {children}
        </span>
        <div className={clsx(
          'flex-1 h-px',
          variant === 'dashed' && 'border-t border-dashed border-white/20',
          variant === 'dotted' && 'border-t border-dotted border-white/20',
          variant === 'solid' && 'bg-white/20'
        )} />
      </div>
    )
  }

  // Simple divider (horizontal or vertical)
  const dividerStyles = clsx(
    {
      'w-full h-px my-4': orientation === 'horizontal',
      'w-px h-full mx-4': orientation === 'vertical',
    },
    variant === 'solid' && 'bg-white/20',
    variant === 'dashed' && 'border-t border-dashed border-white/20',
    variant === 'dotted' && 'border-t border-dotted border-white/20',
    className
  )

  return <div className={dividerStyles} role="separator" />
}
