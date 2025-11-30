'use client'

import React, { forwardRef, type ReactElement, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'
import Link from 'next/link'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  startIcon?: ReactElement
  endIcon?: ReactElement
  href?: string
  target?: '_blank' | '_self'
}

/**
 * Button component adapted from template library
 * Uses our CSS variables and pixel-button styling
 * 
 * @example
 * <Button variant="primary" size="md" startIcon={<HomeIcon />}>
 *   Click Me
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      startIcon,
      endIcon,
      href,
      target,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      // Base button styles
      'inline-flex items-center justify-center gap-2',
      'font-semibold transition-all duration-200',
      'focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'select-none touch-manipulation',
      
      // Size variants
      {
        'h-8 px-3 text-xs rounded': size === 'xs',
        'h-10 px-4 text-sm rounded-md': size === 'sm',
        'h-11 px-5 text-sm rounded-md': size === 'md',
        'h-12 px-6 text-base rounded-lg': size === 'lg',
        'h-14 px-8 text-lg rounded-lg': size === 'xl',
      },
      
      // Variant styles using our CSS variables
      {
        // Primary - purple gradient
        'bg-gradient-to-r from-gmeow-purple to-gmeow-purple-dark text-white hover:brightness-110 shadow-md':
          variant === 'primary',
        
        // Secondary - shell overlay
        'pixel-button': variant === 'secondary',
        
        // Outline - border only
        'border-2 border-current bg-transparent hover:bg-gmeow-purple/10':
          variant === 'outline',
        
        // Ghost - minimal
        'bg-transparent hover:bg-white/10 text-current':
          variant === 'ghost',
        
        // Danger - red
        'bg-red-600 text-white hover:bg-red-700 shadow-md':
          variant === 'danger',
      },
      
      // Full width
      fullWidth && 'w-full',
      
      className
    )

    const content = (
      <>
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!loading && startIcon && <span className="inline-flex">{startIcon}</span>}
        {children}
        {!loading && endIcon && <span className="inline-flex">{endIcon}</span>}
      </>
    )

    if (href) {
      return (
        <Link
          href={href}
          target={target}
          className={baseStyles}
        >
          {content}
        </Link>
      )
    }

    return (
      <button
        ref={ref}
        className={baseStyles}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    )
  }
)

Button.displayName = 'Button'
