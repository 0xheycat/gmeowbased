'use client'

/**
 * Checkbox Component - Professional checkbox with label
 */

import { forwardRef } from 'react'
import CheckIcon from '@mui/icons-material/Check'
import { cn } from '@/lib/utils/utils'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  size?: 'sm' | 'md' | 'lg'
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      error,
      helperText,
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

    const iconSizes = {
      sm: 12,
      md: 16,
      lg: 20,
    }

    return (
      <div className={cn('text-sm', className)}>
        <label className="flex items-start gap-2 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              disabled={disabled}
              className={cn(
                sizeClasses[size],
                'peer appearance-none rounded border-2 bg-white transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                error
                  ? 'border-red-500 focus:ring-red-500/30'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-primary/30',
                'checked:bg-primary checked:border-primary',
                'hover:border-primary dark:hover:border-primary',
                disabled &&
                  'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 cursor-not-allowed',
                'dark:bg-dark-bg'
              )}
              {...props}
            />
            <CheckIcon
              sx={{ fontSize: iconSizes[size] }}
              className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none'
              )}
            />
          </div>

          {label && (
            <span
              className={cn(
                'text-gray-900 dark:text-gray-100',
                disabled && 'text-gray-500 cursor-not-allowed'
              )}
            >
              {label}
            </span>
          )}
        </label>

        {error && (
          <p className="mt-1.5 ml-7 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 ml-7 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
export { Checkbox }
