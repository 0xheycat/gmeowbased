'use client'

/**
 * useConfirmDialog Hook - Promise-based confirmation dialog
 * Based on: DIALOG-INTEGRATION-PLAN.md (Phase 6)
 * Date: December 13, 2025
 * 
 * Features:
 * - Promise-based API (async/await pattern)
 * - Returns true for confirm, false for cancel
 * - Supports all AlertDialog variants
 * - Simple one-line usage
 * 
 * Usage:
 * ```tsx
 * const { confirm, Dialog } = useConfirmDialog()
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Quest?',
 *     description: 'This action cannot be undone.',
 *     confirmText: 'Delete',
 *     variant: 'destructive',
 *   })
 *   
 *   if (!confirmed) return
 *   
 *   // Proceed with deletion
 *   await deleteQuest(questId)
 * }
 * 
 * // In JSX
 * return (
 *   <>
 *     {Dialog}
 *     <Button onClick={handleDelete}>Delete</Button>
 *   </>
 * )
 * ```
 */

import { useState, useRef } from 'react'
import ConfirmDialog, { type ConfirmDialogVariant } from '../confirmation/confirm-dialog'

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
}

interface UseConfirmDialogReturn {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  Dialog: React.ReactNode
}

export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setIsOpen(true)
      resolveRef.current = resolve
    })
  }

  const handleClose = () => {
    setIsOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }

  const handleConfirm = () => {
    setIsOpen(false)
    resolveRef.current?.(true)
    resolveRef.current = null
  }

  const Dialog = options ? (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={options.title}
      message={options.description}
      confirmLabel={options.confirmText}
      cancelLabel={options.cancelText}
      variant={options.variant || 'destructive'}
    />
  ) : null

  return { confirm, Dialog }
}

// Export types for external usage
export type { ConfirmOptions, UseConfirmDialogReturn }
