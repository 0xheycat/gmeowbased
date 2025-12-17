'use client'

/**
 * Input Component - Professional form input
 * Based on: gmeowbased0.6 input patterns
 * Features:
 * - Label with required indicator
 * - Error states with validation
 * - Disabled states
 * - Prefix/suffix icons
 * - Multiple sizes
 * - Dark mode support
 */

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/utils'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  helperText?: string
  inputClassName?: string
  labelClassName?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      type = 'text',
      className,
      inputClassName,
      labelClassName,
      prefix,
      suffix,
      fullWidth = true,
      required,
      disabled,
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

        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {prefix}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            required={required}
            disabled={disabled}
            className={cn(
              'block w-full rounded-lg border bg-white px-4 py-2.5 sm:py-3 text-sm text-gray-900 placeholder-gray-400',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              // Border states
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/30',
              // Disabled state
              disabled &&
                'bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-800',
              // Dark mode
              'dark:bg-dark-bg dark:text-gray-100 dark:placeholder-gray-500',
              // Prefix/suffix padding
              prefix && 'pl-10',
              suffix && 'pr-10',
              inputClassName
            )}
            {...props}
          />

          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {suffix}
            </div>
          )}
        </div>

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

Input.displayName = 'Input'
export { Input }
