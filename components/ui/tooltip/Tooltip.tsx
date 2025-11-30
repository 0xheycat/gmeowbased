'use client'

import React, { type ReactNode } from 'react'
import clsx from 'clsx'

export interface TooltipProps {
  children: ReactNode
  content: string | ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * Tooltip component that shows on hover
 * Simple CSS-based implementation
 * 
 * @example
 * <Tooltip content="Click to copy" position="top">
 *   <button>Copy</button>
 * </Tooltip>
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className,
}) => {
  return (
    <div className={clsx('relative inline-block group', className)}>
      {children}
      
      {/* Tooltip bubble */}
      <div className={clsx(
        'absolute z-50 invisible group-hover:visible',
        'px-3 py-2 text-xs font-medium text-white',
        'bg-gray-900 rounded-lg shadow-lg',
        'opacity-0 group-hover:opacity-100',
        'transition-all duration-200',
        'pointer-events-none',
        'whitespace-nowrap',
        
        // Position variants
        {
          'bottom-full left-1/2 -translate-x-1/2 mb-2': position === 'top',
          'top-full left-1/2 -translate-x-1/2 mt-2': position === 'bottom',
          'right-full top-1/2 -translate-y-1/2 mr-2': position === 'left',
          'left-full top-1/2 -translate-y-1/2 ml-2': position === 'right',
        }
      )}>
        {content}
        
        {/* Arrow */}
        <div className={clsx(
          'absolute w-2 h-2 bg-gray-900 rotate-45',
          {
            'bottom-[-4px] left-1/2 -translate-x-1/2': position === 'top',
            'top-[-4px] left-1/2 -translate-x-1/2': position === 'bottom',
            'right-[-4px] top-1/2 -translate-y-1/2': position === 'left',
            'left-[-4px] top-1/2 -translate-y-1/2': position === 'right',
          }
        )} />
      </div>
    </div>
  )
}
