'use client'

/**
 * ConfirmDialog Component - Professional confirmation dialog
 * 
 * Template Strategy: Hybrid pattern (originally from dialog-examples.tsx)
 * - DestructiveDialog pattern (40% adaptation)
 * - ErrorDialog pattern (20% adaptation)
 * Platform Reference: GitHub confirmation modals
 * 
 * Features:
 * - Destructive actions (delete, remove, etc.)
 * - Confirmation actions (save, submit, etc.)
 * - Custom icons and colors per action type
 * - Keyboard shortcuts (Enter to confirm, Escape to cancel)
 * - Loading state during async actions
 * - Focus management (auto-focus confirm button)
 * 
 * @module components/ui/confirm-dialog
 */

import { useEffect, useRef } from 'react'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../base/dialog'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { ICON_SIZES } from '@/lib/utils/icon-sizes'

export type ConfirmDialogVariant = 'destructive' | 'warning' | 'info'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  variant?: ConfirmDialogVariant
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}

const VARIANT_CONFIG: Record<ConfirmDialogVariant, {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  confirmButtonClass: string
}> = {
  destructive: {
    icon: <WarningIcon sx={{ fontSize: ICON_SIZES.xl }} />,
    iconBg: 'bg-red-500/10 dark:bg-red-500/20',
    iconColor: 'text-red-600 dark:text-red-400',
    confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: <WarningIcon sx={{ fontSize: ICON_SIZES.xl }} />,
    iconBg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    confirmButtonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  info: {
    icon: <CheckCircleIcon sx={{ fontSize: ICON_SIZES.xl }} />,
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'info',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant]
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Auto-focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle Enter key to confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen && !loading) {
        e.preventDefault()
        handleConfirm()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, loading])

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('[ConfirmDialog] Confirm action failed:', error)
      // Error handling should be done by the caller
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogBackdrop blur="md" />
      <DialogContent size="sm" showCloseButton={false}>
        <div className="p-6">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${config.iconBg} ${config.iconColor} mb-4`}>
            {config.icon}
          </div>

          {/* Title & Message */}
          <DialogHeader>
            <DialogTitle className={variant === 'destructive' ? 'text-red-600 dark:text-red-500' : ''}>
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {message}
            </DialogDescription>
          </DialogHeader>

          {/* Actions */}
          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${config.confirmButtonClass}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
