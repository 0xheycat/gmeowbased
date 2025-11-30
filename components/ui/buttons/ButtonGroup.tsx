'use client'

import React, { type ReactNode } from 'react'
import clsx from 'clsx'

export interface ButtonGroupProps {
  children: ReactNode
  orientation?: 'horizontal' | 'vertical'
  fullWidth?: boolean
  className?: string
}

/**
 * ButtonGroup for segmented controls or grouped actions
 * Removes border radius between buttons for seamless look
 * 
 * @example
 * <ButtonGroup>
 *   <Button variant="outline">Left</Button>
 *   <Button variant="outline">Center</Button>
 *   <Button variant="outline">Right</Button>
 * </ButtonGroup>
 */
export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  fullWidth = false,
  className,
}) => {
  const containerStyles = clsx(
    'inline-flex',
    {
      'flex-row': orientation === 'horizontal',
      'flex-col': orientation === 'vertical',
    },
    fullWidth && 'w-full',
    
    // Remove border radius between buttons
    '[&>*:not(:first-child):not(:last-child)]:rounded-none',
    orientation === 'horizontal'
      ? '[&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none'
      : '[&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none',
    
    // Remove duplicate borders
    orientation === 'horizontal'
      ? '[&>*:not(:first-child)]:-ml-px'
      : '[&>*:not(:first-child)]:-mt-px',
    
    // Ensure proper stacking on hover/focus
    '[&>*:hover]:relative [&>*:hover]:z-10',
    '[&>*:focus]:relative [&>*:focus]:z-10',
    
    className
  )

  return (
    <div className={containerStyles} role="group">
      {children}
    </div>
  )
}
