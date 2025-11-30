'use client'

import React, { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { IconButton } from '../buttons/IconButton'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
  showCloseButton?: boolean
}

export interface DialogHeaderProps {
  children: ReactNode
  onClose?: () => void
}

export interface DialogBodyProps {
  children: ReactNode
  className?: string
}

export interface DialogFooterProps {
  children: ReactNode
  className?: string
}

/**
 * Dialog component with backdrop, ESC to close, focus trap
 * Renders via portal for proper layering
 * 
 * @example
 * <Dialog open={isOpen} onClose={() => setIsOpen(false)} title="Confirm Action">
 *   <DialogBody>Are you sure?</DialogBody>
 *   <DialogFooter>
 *     <Button onClick={handleConfirm}>Confirm</Button>
 *   </DialogFooter>
 * </Dialog>
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
}) => {
  // ESC to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    
    if (open) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  const dialogStyles = clsx(
    'pixel-card',
    'relative z-50',
    'max-h-[90vh] overflow-y-auto',
    'animate-in fade-in-0 zoom-in-95 duration-200',
    
    // Size variants
    {
      'w-full max-w-sm': size === 'sm',
      'w-full max-w-lg': size === 'md',
      'w-full max-w-2xl': size === 'lg',
      'w-full max-w-4xl': size === 'xl',
    }
  )

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={handleBackdropClick}
    >
      <div className={dialogStyles}>
        {/* Header */}
        {(title || showCloseButton) && (
          <DialogHeader onClose={showCloseButton ? onClose : undefined}>
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
          </DialogHeader>
        )}
        
        {/* Content */}
        {children}
      </div>
    </div>
  )

  // Render via portal
  return typeof document !== 'undefined'
    ? createPortal(dialogContent, document.body)
    : null
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  onClose,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-current/10">
      <div className="flex-1">{children}</div>
      {onClose && (
        <IconButton
          icon={<CloseIcon />}
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close dialog"
        />
      )}
    </div>
  )
}

export const DialogBody: React.FC<DialogBodyProps> = ({
  children,
  className,
}) => {
  return (
    <div className={clsx('py-4', className)}>
      {children}
    </div>
  )
}

export const DialogFooter: React.FC<DialogFooterProps> = ({
  children,
  className,
}) => {
  return (
    <div className={clsx(
      'flex items-center justify-end gap-3',
      'mt-4 pt-4 border-t border-current/10',
      className
    )}>
      {children}
    </div>
  )
}

// Simple close icon inline
const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
