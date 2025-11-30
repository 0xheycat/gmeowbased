'use client'

import React, { type ReactNode, type HTMLAttributes } from 'react'
import clsx from 'clsx'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  clickable?: boolean
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  action?: ReactNode
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  divider?: boolean
}

/**
 * Card component using our pixel-card styling
 * Supports headers, footers, hover effects
 * 
 * @example
 * <Card hover clickable>
 *   <CardHeader title="Quest Card" />
 *   <CardBody>Content here</CardBody>
 *   <CardFooter divider>Footer actions</CardFooter>
 * </Card>
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      hover = false,
      padding = 'md',
      clickable = false,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      // Base pixel-card styles from globals.css
      'pixel-card',
      'transition-all duration-200',
      
      // Padding variants
      {
        'p-0': padding === 'none',
        'p-4': padding === 'sm',
        'p-6': padding === 'md',
        'p-8': padding === 'lg',
      },
      
      // Variant styles
      {
        // Default uses pixel-card from globals.css
        'pixel-card': variant === 'default',
        
        // Elevated adds extra shadow
        'shadow-xl': variant === 'elevated',
        
        // Outlined reduces opacity
        'border-2 border-current/20': variant === 'outlined',
      },
      
      // Hover effects
      hover && 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer',
      clickable && 'cursor-pointer active:scale-[0.98]',
      
      className
    )

    return (
      <div ref={ref} className={baseStyles} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, title, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'flex items-center justify-between gap-4',
          'mb-4 pb-4 border-b border-current/10',
          className
        )}
        {...props}
      >
        <div className="flex-1">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {children}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx('flex-1', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'CardBody'

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, divider = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'mt-4',
          divider && 'pt-4 border-t border-current/10',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'
