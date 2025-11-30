'use client'

import React, { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
  labelPosition?: 'left' | 'right'
}

/**
 * Switch toggle component for on/off states
 * Similar to iOS toggle switch
 * 
 * @example
 * <Switch
 *   label="Enable notifications"
 *   checked={notificationsEnabled}
 *   onChange={(e) => setNotificationsEnabled(e.target.checked)}
 * />
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      helperText,
      size = 'md',
      labelPosition = 'right',
      className,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const wrapperStyles = clsx(
      'flex flex-col gap-1',
      disabled && 'opacity-50 cursor-not-allowed'
    )

    const containerStyles = clsx(
      'flex items-center gap-3',
      labelPosition === 'left' && 'flex-row-reverse justify-end',
      disabled ? 'cursor-not-allowed' : 'cursor-pointer'
    )

    const switchTrackStyles = clsx(
      'relative inline-flex items-center flex-shrink-0',
      'rounded-full transition-all duration-200',
      'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 focus-within:ring-gmeow-purple/50',
      
      // Size variants
      {
        'w-8 h-4': size === 'sm',
        'w-11 h-6': size === 'md',
        'w-14 h-7': size === 'lg',
      },
      
      // State styles
      checked
        ? 'bg-gmeow-purple'
        : 'bg-white/20',
      
      disabled && 'cursor-not-allowed'
    )

    const switchThumbStyles = clsx(
      'inline-block bg-white rounded-full shadow-md',
      'transform transition-transform duration-200',
      
      // Size variants
      {
        'w-3 h-3': size === 'sm',
        'w-5 h-5': size === 'md',
        'w-6 h-6': size === 'lg',
      },
      
      // Position based on checked state and size
      {
        'translate-x-4': checked && size === 'sm',
        'translate-x-5': checked && size === 'md',
        'translate-x-7': checked && size === 'lg',
        'translate-x-0.5': !checked,
      }
    )

    return (
      <div className={wrapperStyles}>
        <label className={containerStyles}>
          <span className={switchTrackStyles}>
            <input
              ref={ref}
              type="checkbox"
              className="sr-only"
              disabled={disabled}
              checked={checked}
              {...props}
            />
            <span className={switchThumbStyles} />
          </span>
          
          {label && (
            <span className="text-sm font-medium">{label}</span>
          )}
        </label>
        
        {helperText && (
          <p className="text-xs text-current/60">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Switch.displayName = 'Switch'
