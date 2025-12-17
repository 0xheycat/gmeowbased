'use client'

/**
 * Textarea Component - Professional multiline text input
 * Based on: gmeowbased0.6 textarea patterns
 */

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  textareaClassName?: string
  labelClassName?: string
  fullWidth?: boolean
  rows?: number
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      textareaClassName,
      labelClassName,
      fullWidth = true,
      required,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('text-sm', fullWidth && 'w-full', className)}>
        {label && (
          <label className={cn('block', labelClassName)}>
            <span className="block mb-2 font-medium text-gray-900 dark:text-gray-100">
              {label}
              {required && (
                <sup className="inline-block text-red-500 ml-1">*</sup>
              )}
            </span>
          </label>
        )}

        <textarea
          ref={ref}
          rows={rows}
          required={required}
          disabled={disabled}
          className={cn(
            'block w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'resize-y',
            // Border states
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/30',
            // Disabled state
            disabled &&
              'bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-800',
            // Dark mode
            'dark:bg-dark-bg dark:text-gray-100 dark:placeholder-gray-500',
            textareaClassName
          )}
          {...props}
        />

        {error && (
          <p className="mt-1.5 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
export { Textarea }
