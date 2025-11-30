'use client'

import React, { type ReactNode } from 'react'
import clsx from 'clsx'

export interface AlertProps {
  children: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  icon?: ReactNode
  onClose?: () => void
  className?: string
}

/**
 * Alert component for notifications, messages, errors
 * Can be dismissible with close button
 * 
 * @example
 * <Alert variant="success" title="Success!">
 *   Your quest has been created
 * </Alert>
 */
export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  icon,
  onClose,
  className,
}) => {
  const baseStyles = clsx(
    'relative p-4 rounded-lg border',
    'flex items-start gap-3',
    
    // Variant styles
    {
      'bg-blue-500/10 border-blue-500/30 text-blue-100': variant === 'info',
      'bg-green-500/10 border-green-500/30 text-green-100': variant === 'success',
      'bg-yellow-500/10 border-yellow-500/30 text-yellow-100': variant === 'warning',
      'bg-red-500/10 border-red-500/30 text-red-100': variant === 'danger',
    },
    
    className
  )

  return (
    <div className={baseStyles} role="alert">
      {icon && (
        <div className="flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1">{title}</h4>
        )}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Close alert"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}

const CloseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="4" x2="4" y2="12" />
    <line x1="4" y1="4" x2="12" y2="12" />
  </svg>
)
