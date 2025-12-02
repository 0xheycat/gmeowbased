'use client'

/**
 * Select Component - Professional dropdown select
 */

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  selectClassName?: string
  labelClassName?: string
  fullWidth?: boolean
  options?: Array<{ value: string; label: string }>
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      selectClassName,
      labelClassName,
      fullWidth = true,
      required,
      disabled,
      options,
      children,
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

        <select
          ref={ref}
          required={required}
          disabled={disabled}
          className={cn(
            'block w-full rounded-lg border bg-white px-4 py-2.5 sm:py-3 text-sm text-gray-900',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'appearance-none bg-no-repeat bg-right',
            'pr-10', // Space for chevron icon
            // Border states
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/30',
            // Disabled state
            disabled &&
              'bg-gray-50 dark:bg-gray-900 text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-800',
            // Dark mode
            'dark:bg-dark-bg dark:text-gray-100',
            selectClassName
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1.5em 1.5em',
          }}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>

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

Select.displayName = 'Select'
export { Select }
