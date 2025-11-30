'use client'

import React, { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  helperText?: string
  error?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Checkbox component with label and helper text
 * Fully accessible with keyboard navigation
 * 
 * @example
 * <Checkbox
 *   label="Accept terms and conditions"
 *   checked={accepted}
 *   onChange={(e) => setAccepted(e.target.checked)}
 * />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText,
      error = false,
      size = 'md',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const wrapperStyles = clsx(
      'flex flex-col gap-1',
      disabled && 'opacity-50 cursor-not-allowed'
    )

    const containerStyles = clsx(
      'flex items-start gap-3',
      disabled ? 'cursor-not-allowed' : 'cursor-pointer'
    )

    const checkboxStyles = clsx(
      'flex-shrink-0 appearance-none',
      'border-2 rounded transition-all duration-200',
      'focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
      
      // Size variants
      {
        'w-4 h-4': size === 'sm',
        'w-5 h-5': size === 'md',
        'w-6 h-6': size === 'lg',
      },
      
      // State styles
      error
        ? 'border-red-500 focus:ring-red-500/50'
        : 'border-white/30 focus:ring-gmeow-purple/50',
      
      'checked:bg-gmeow-purple checked:border-gmeow-purple',
      'disabled:cursor-not-allowed',
      
      className
    )

    return (
      <div className={wrapperStyles}>
        <label className={containerStyles}>
          <input
            ref={ref}
            type="checkbox"
            className={checkboxStyles}
            disabled={disabled}
            {...props}
          />
          
          {label && (
            <div className="flex-1">
              <span className="text-sm font-medium">{label}</span>
            </div>
          )}
        </label>
        
        {helperText && (
          <p className={clsx(
            'text-xs ml-8',
            error ? 'text-red-500' : 'text-current/60'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
