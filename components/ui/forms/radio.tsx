'use client'

/**
 * Radio Component - Professional radio button with label
 */

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/utils'

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  description?: string
  error?: string
  size?: 'sm' | 'md' | 'lg'
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      error,
      className,
      size = 'md',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    }

    return (
      <div className={cn('text-sm', className)}>
        <label className="flex items-start gap-2 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={ref}
              type="radio"
              disabled={disabled}
              className={cn(
                sizeClasses[size],
                'peer appearance-none rounded-full border-2 bg-white transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                error
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary/30',
                'hover:border-primary dark:hover:border-primary',
                disabled &&
                  'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 cursor-not-allowed',
                'dark:bg-dark-bg',
                'after:content-[""] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2',
                'after:w-2 after:h-2 after:rounded-full after:bg-primary after:scale-0 after:transition-transform',
                'checked:after:scale-100 checked:border-primary'
              )}
              {...props}
            />
          </div>

          <div className="flex-1">
            {label && (
              <span
                className={cn(
                  'block text-gray-900 dark:text-gray-100',
                  disabled && 'text-gray-500 cursor-not-allowed'
                )}
              >
                {label}
              </span>
            )}
            {description && (
              <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {description}
              </span>
            )}
          </div>
        </label>

        {error && (
          <p className="mt-1.5 ml-7 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'
export { Radio }
