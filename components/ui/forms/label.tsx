'use client'

/**
 * Label Component - Form label with required indicator
 */

import { cn } from '@/lib/utils'

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'block mb-2 text-sm font-medium text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
      {required && <sup className="inline-block text-red-500 ml-1">*</sup>}
    </label>
  )
}
