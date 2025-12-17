/**
 * ErrorDialog Component - Error display with retry option
 * Based on: DIALOG-INTEGRATION-PLAN.md (Phase 6)
 * Date: December 13, 2025
 * Refactored: January 2025 - Now uses custom Dialog system instead of HeadlessUI
 * 
 * Features:
 * - Error message display
 * - Optional details/stack trace
 * - Retry button (optional)
 * - Close button
 * - Error icon with red theme
 * - Accessible (ARIA labels)
 * - Backwards compatible with old API (type, primaryAction, secondaryAction)
 * 
 * New Usage (Phase 6):
 * ```tsx
 * <ErrorDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onRetry={handleRetry}
 *   title="Connection Failed"
 *   error="Unable to submit quest. Please check your connection."
 *   details={error.message}
 * />
 * ```
 * 
 * Legacy Usage (backwards compatible):
 * ```tsx
 * <ErrorDialog
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Error"
 *   message="Something went wrong"
 *   type="error"
 * />
 * ```
 */

'use client'

import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { ICON_SIZES } from '@/lib/utils/icons'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from './dialog'

export type DialogType = 'error' | 'warning' | 'confirm' | 'info'

export interface ErrorDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  
  // New API (Phase 6)
  error?: string              // Primary error message
  details?: string            // Optional details/stack trace
  onRetry?: () => void        // Optional retry callback
  retryText?: string          // Default: "Try Again"
  closeText?: string          // Default: "Close"
  
  // Legacy API (backwards compatible)
  message?: string
  type?: DialogType
  primaryAction?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'danger'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

const TYPE_CONFIG: Record<DialogType, { icon: React.ReactNode; iconBg: string; iconColor: string }> = {
  error: {
    icon: <WarningIcon sx={{ fontSize: ICON_SIZES.xl }} />,
    iconBg: 'bg-red-500/10 dark:bg-red-500/20',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: <WarningIcon sx={{ fontSize: ICON_SIZES.xl }} />,
    iconBg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  confirm: {
    icon: <InfoIcon sx={{ fontSize: ICON_SIZES.xl }} />,
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  info: {
    icon: <CheckCircleIcon sx={{ fontSize: ICON_SIZES.xl }} />,
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
}

export default function ErrorDialog({
  isOpen,
  onClose,
  title,
  
  // New API (Phase 6)
  error,
  details,
  onRetry,
  retryText = 'Try Again',
  closeText = 'Close',
  
  // Legacy API (backwards compatible)
  message,
  type = 'error',
  primaryAction,
  secondaryAction,
}: ErrorDialogProps) {
  const config = TYPE_CONFIG[type]
  
  // Use new API if provided, fallback to legacy
  const displayError = error || message || ''
  const hasRetry = !!onRetry

  const handlePrimaryAction = () => {
    if (onRetry) {
      onRetry()
      onClose()
    } else if (primaryAction) {
      primaryAction.onClick()
      onClose()
    }
  }

  const handleSecondaryAction = () => {
    secondaryAction?.onClick()
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogBackdrop />
      <DialogContent size="sm">
        <DialogHeader>
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${config.iconBg} ${config.iconColor} mb-4`}>
            {config.icon}
          </div>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Error Message (new API) or Message (legacy) */}
          {error ? (
            <>
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                {error}
              </p>
              {/* Optional Details */}
              {details && (
                <div className="mt-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                    {details}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {displayError}
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          {/* Close button (always shown) */}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {closeText}
          </button>
          
          {/* Retry button (new API) */}
          {hasRetry && (
            <button
              onClick={handlePrimaryAction}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {retryText}
            </button>
          )}
          
          {/* Legacy secondary action */}
          {secondaryAction && (
            <button
              onClick={handleSecondaryAction}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          
          {/* Legacy primary action */}
          {primaryAction && !hasRetry && (
            <button
              onClick={handlePrimaryAction}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                primaryAction.variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-brand hover:bg-brand/90'
              }`}
            >
              {primaryAction.label}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
