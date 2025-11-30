'use client'

import React, { forwardRef, type InputHTMLAttributes, type ReactElement } from 'react'
import clsx from 'clsx'

export type InputSize = 'sm' | 'md' | 'lg'
export type InputVariant = 'default' | 'filled' | 'outlined'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize
  variant?: InputVariant
  error?: boolean
  helperText?: string
  label?: string
  startIcon?: ReactElement
  endIcon?: ReactElement
  fullWidth?: boolean
}

/**
 * Input component with label, helper text, error states
 * Supports start/end icons (adornments)
 * 
 * @example
 * <Input
 *   label="Email"
 *   type="email"
 *   helperText="We'll never share your email"
 *   startIcon={<MailIcon />}
 * />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      variant = 'default',
      error = false,
      helperText,
      label,
      startIcon,
      endIcon,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const wrapperStyles = clsx(
      'flex flex-col gap-1',
      fullWidth ? 'w-full' : 'w-auto'
    )

    const inputContainerStyles = clsx(
      'flex items-center gap-2',
      'transition-all duration-200',
      'rounded-md',
      
      // Size variants
      {
        'h-8 px-3 text-xs': size === 'sm',
        'h-11 px-4 text-sm': size === 'md', // 44px touch target
        'h-12 px-5 text-base': size === 'lg',
      },
      
      // Variant styles
      {
        'bg-white/5 border border-white/10 hover:border-white/20':
          variant === 'default',
        'bg-white/10 border-0':
          variant === 'filled',
        'bg-transparent border-2 border-current/20':
          variant === 'outlined',
      },
      
      // State styles
      error
        ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/50'
        : 'focus-within:ring-2 focus-within:ring-gmeow-purple/50',
      disabled && 'opacity-50 cursor-not-allowed',
      
      className
    )

    const inputStyles = clsx(
      'flex-1 bg-transparent outline-none',
      'placeholder:text-current/40',
      'disabled:cursor-not-allowed'
    )

    return (
      <div className={wrapperStyles}>
        {label && (
          <label className="text-sm font-medium text-current/80">
            {label}
          </label>
        )}
        
        <div className={inputContainerStyles}>
          {startIcon && (
            <span className="flex-shrink-0 text-current/60">
              {startIcon}
            </span>
          )}
          
          <input
            ref={ref}
            className={inputStyles}
            disabled={disabled}
            {...props}
          />
          
          {endIcon && (
            <span className="flex-shrink-0 text-current/60">
              {endIcon}
            </span>
          )}
        </div>
        
        {helperText && (
          <p className={clsx(
            'text-xs',
            error ? 'text-red-500' : 'text-current/60'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
