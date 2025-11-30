'use client'

import React, { forwardRef, type ButtonHTMLAttributes, type ReactElement } from 'react'
import clsx from 'clsx'

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize
  variant?: IconButtonVariant
  rounded?: boolean
  icon: ReactElement
}

/**
 * IconButton - Square or circular button for icon-only actions
 * Perfect for toolbars, nav, close buttons
 * 
 * @example
 * <IconButton icon={<CloseIcon />} rounded variant="ghost" />
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      size = 'md',
      variant = 'default',
      rounded = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      // Base styles
      'inline-flex items-center justify-center',
      'transition-all duration-200',
      'focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'select-none touch-manipulation',
      
      // Size variants (square by default)
      {
        'h-8 w-8 min-h-[44px] min-w-[44px]': size === 'xs', // Mobile touch target
        'h-10 w-10 min-h-[44px] min-w-[44px]': size === 'sm',
        'h-11 w-11 min-h-[44px] min-w-[44px]': size === 'md',
        'h-12 w-12': size === 'lg',
        'h-14 w-14': size === 'xl',
      },
      
      // Border radius
      rounded ? 'rounded-full' : 'rounded-md',
      
      // Variant styles
      {
        'bg-white/10 hover:bg-white/20 text-current': variant === 'default',
        'bg-gmeow-purple hover:brightness-110 text-white': variant === 'primary',
        'bg-transparent hover:bg-white/10 text-current': variant === 'ghost',
        'bg-red-600 hover:bg-red-700 text-white': variant === 'danger',
      },
      
      className
    )

    return (
      <button
        ref={ref}
        className={baseStyles}
        disabled={disabled}
        {...props}
      >
        {icon}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
