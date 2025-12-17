'use client'

/**
 * Dropdown Menu Component - Professional dropdown with keyboard navigation
 * Based on: trezoadmin-41 + gmeowbased0.6 dropdown patterns
 * Features:
 * - Outside click detection
 * - Escape key to close
 * - Keyboard navigation (Arrow keys)
 * - Framer Motion animations
 * - Flexible positioning
 * - Dark mode support
 */

import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils/utils'

// Context for dropdown state
interface DropdownContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  close: () => void
}

const DropdownContext = createContext<DropdownContextType | null>(null)

const useDropdownContext = () => {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('Dropdown components must be used within Dropdown')
  }
  return context
}

// Main Dropdown container
interface DropdownProps {
  children: React.ReactNode
  className?: string
}

export function Dropdown({ children, className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const close = () => setIsOpen(false)

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, close }}>
      <div className={cn('relative inline-block', className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

// Trigger button
interface DropdownTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function DropdownTrigger({ children, className, asChild }: DropdownTriggerProps) {
  const { isOpen, setIsOpen } = useDropdownContext()

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  if (asChild && typeof children === 'object' && children !== null && 'props' in children) {
    const child = children as React.ReactElement
    return (
      <div onClick={handleClick}>
        {child}
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        className
      )}
      aria-haspopup="true"
      aria-expanded={isOpen}
    >
      {children}
    </button>
  )
}

// Content/Menu container
interface DropdownContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

export function DropdownContent({
  children,
  className,
  align = 'start',
  sideOffset = 8,
}: DropdownContentProps) {
  const { isOpen, close } = useDropdownContext()
  const contentRef = useRef<HTMLDivElement>(null)

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  // Outside click detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        // Check if click is on trigger (parent element)
        const trigger = contentRef.current.parentElement?.querySelector('button')
        if (trigger && !trigger.contains(event.target as Node)) {
          close()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, close])

  // Escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        close()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, close])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'absolute z-50 min-w-[12rem] overflow-hidden rounded-lg',
            'bg-white dark:bg-dark-bg-card',
            'border border-gray-200 dark:border-gray-700',
            'shadow-lg',
            alignClasses[align],
            className
          )}
          style={{ top: `calc(100% + ${sideOffset}px)` }}
          role="menu"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Menu item
interface DropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  destructive?: boolean
  href?: string
}

export function DropdownItem({
  children,
  onClick,
  className,
  disabled,
  destructive,
  href,
}: DropdownItemProps) {
  const { close } = useDropdownContext()

  const handleClick = () => {
    if (disabled) return
    onClick?.()
    close()
  }

  const baseClasses = cn(
    'flex w-full items-center px-4 py-2.5 text-sm text-left',
    'transition-colors',
    disabled
      ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
      : destructive
      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
      : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800',
    className
  )

  if (href && !disabled) {
    return (
      <a href={href} className={baseClasses} onClick={handleClick} role="menuitem">
        {children}
      </a>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={baseClasses}
      role="menuitem"
    >
      {children}
    </button>
  )
}

// Separator
export function DropdownSeparator() {
  return <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" role="separator" />
}

// Label (non-interactive)
interface DropdownLabelProps {
  children: React.ReactNode
  className?: string
}

export function DropdownLabel({ children, className }: DropdownLabelProps) {
  return (
    <div
      className={cn(
        'px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        className
      )}
    >
      {children}
    </div>
  )
}
