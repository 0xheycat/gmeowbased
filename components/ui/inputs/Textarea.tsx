'use client'

import React, { forwardRef, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

export type TextareaSize = 'sm' | 'md' | 'lg'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: TextareaSize
  error?: boolean
  helperText?: string
  label?: string
  fullWidth?: boolean
  maxLength?: number
  showCount?: boolean
}

/**
 * Textarea component with auto-resize, character count
 * Supports error states, helper text, labels
 * 
 * @example
 * <Textarea
 *   label="Description"
 *   maxLength={500}
 *   showCount
 *   helperText="Describe your quest"
 * />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'md',
      error = false,
      helperText,
      label,
      fullWidth = false,
      maxLength,
      showCount = false,
      className,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const wrapperStyles = clsx(
      'flex flex-col gap-1',
      fullWidth ? 'w-full' : 'w-auto'
    )

    const textareaStyles = clsx(
      'transition-all duration-200',
      'rounded-md',
      'outline-none resize-y',
      
      // Size variants
      {
        'px-3 py-2 text-xs min-h-[80px]': size === 'sm',
        'px-4 py-3 text-sm min-h-[100px]': size === 'md',
        'px-5 py-4 text-base min-h-[120px]': size === 'lg',
      },
      
      // Background styles
      'bg-white/5 border border-white/10',
      'hover:border-white/20',
      'placeholder:text-current/40',
      
      // Focus styles
      error
        ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
        : 'focus:ring-2 focus:ring-gmeow-purple/50',
      
      disabled && 'opacity-50 cursor-not-allowed',
      
      className
    )

    const characterCount = typeof value === 'string' ? value.length : 0

    return (
      <div className={wrapperStyles}>
        {label && (
          <label className="text-sm font-medium text-current/80">
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={textareaStyles}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          {...props}
        />
        
        <div className="flex justify-between items-start gap-2">
          {helperText && (
            <p className={clsx(
              'text-xs flex-1',
              error ? 'text-red-500' : 'text-current/60'
            )}>
              {helperText}
            </p>
          )}
          
          {showCount && maxLength && (
            <p className="text-xs text-current/60 flex-shrink-0">
              {characterCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
