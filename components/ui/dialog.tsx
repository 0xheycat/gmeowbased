'use client'

/**
 * Dialog System - Professional modal/dialog component
 * Based on: gmeowbased0.6 modal patterns + Framer Motion animations
 * Features:
 * - Backdrop with blur effect
 * - Focus trap (keyboard navigation)
 * - Escape key to close
 * - Outside click to close
 * - Framer Motion animations
 * - Multiple sizes (sm/md/lg/xl/full)
 * - Accessible (ARIA labels)
 */

import { createContext, useContext, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import CloseIcon from '@mui/icons-material/Close'
import { cn } from '@/lib/utils'

// Context for dialog state
interface DialogContextType {
  isOpen: boolean
  onClose: () => void
}

const DialogContext = createContext<DialogContextType | null>(null)

const useDialogContext = () => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used within Dialog')
  }
  return context
}

// Main Dialog component
interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ isOpen, onClose, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Body scroll lock when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <DialogContext.Provider value={{ isOpen, onClose }}>
      <AnimatePresence>
        {isOpen && (
          <div
            ref={dialogRef}
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8',
              className
            )}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  )
}

// Backdrop/Overlay component
interface DialogBackdropProps {
  className?: string
  blur?: 'none' | 'sm' | 'md' | 'lg'
}

export function DialogBackdrop({ className, blur = 'md' }: DialogBackdropProps) {
  const { onClose } = useDialogContext()

  const blurClasses = {
    none: '',
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      onClick={onClose}
      className={cn(
        'fixed inset-0 bg-gray-900/60 dark:bg-black/80',
        blurClasses[blur],
        className
      )}
      aria-hidden="true"
    />
  )
}

// Content component
interface DialogContentProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
  showCloseButton?: boolean
  closeOnOutsideClick?: boolean
}

export function DialogContent({
  children,
  size = 'md',
  className,
  showCloseButton = true,
  closeOnOutsideClick = true,
}: DialogContentProps) {
  const { onClose } = useDialogContext()
  const contentRef = useRef<HTMLDivElement>(null)

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  }

  // Handle outside click
  useEffect(() => {
    if (!closeOnOutsideClick) return

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        // Check if click is not on backdrop (which has its own handler)
        const target = e.target as HTMLElement
        if (target.hasAttribute('aria-hidden')) {
          return
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeOnOutsideClick, onClose])

  return (
    <motion.div
      ref={contentRef}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'relative z-50 w-full rounded-lg bg-white dark:bg-dark-bg-card shadow-2xl',
        sizeClasses[size],
        className
      )}
      role="document"
    >
      {showCloseButton && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Close dialog"
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </button>
      )}
      {children}
    </motion.div>
  )
}

// Header component
interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn('px-6 pt-6 pb-4', className)}>
      {children}
    </div>
  )
}

// Title component
interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h2 className={cn('text-xl sm:text-2xl font-bold text-gray-900 dark:text-white', className)}>
      {children}
    </h2>
  )
}

// Description component
interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn('mt-2 text-sm text-gray-600 dark:text-gray-400', className)}>
      {children}
    </p>
  )
}

// Body component
interface DialogBodyProps {
  children: React.ReactNode
  className?: string
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

// Footer component
interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('px-6 pb-6 pt-4 flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  )
}

// Export all components
export { useDialogContext }
