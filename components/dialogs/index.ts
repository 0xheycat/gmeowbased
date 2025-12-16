/**
 * Dialog System - Centralized Dialog Components
 * 
 * This folder contains all dialog-related components consolidated in one place.
 * All dialogs use the custom Dialog system (Framer Motion) for consistency.
 * 
 * Structure:
 * - base/           - Core Dialog components and ErrorDialog
 * - confirmation/   - ConfirmDialog with variants (destructive, warning, info)
 * - hooks/          - useDialog (state management) and useConfirmDialog (promise-based)
 * 
 * Quick Reference:
 * 
 * 1. Basic Dialog:
 * ```tsx
 * import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, useDialog } from '@/components/dialogs'
 * 
 * const { isOpen, open, close } = useDialog()
 * return (
 *   <Dialog isOpen={isOpen} onClose={close}>
 *     <DialogBackdrop />
 *     <DialogContent>
 *       <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
 *       <DialogBody>Content</DialogBody>
 *       <DialogFooter><button onClick={close}>Close</button></DialogFooter>
 *     </DialogContent>
 *   </Dialog>
 * )
 * ```
 * 
 * 2. Error Dialog:
 * ```tsx
 * import { ErrorDialog, useDialog } from '@/components/dialogs'
 * 
 * const { isOpen, open, close } = useDialog()
 * return (
 *   <ErrorDialog
 *     isOpen={isOpen}
 *     onClose={close}
 *     title="Error"
 *     error="Something went wrong"
 *     details={error.message}
 *     onRetry={handleRetry}
 *   />
 * )
 * ```
 * 
 * 3. Confirm Dialog:
 * ```tsx
 * import { useConfirmDialog } from '@/components/dialogs'
 * 
 * const { confirmDialog } = useConfirmDialog()
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirmDialog({
 *     title: 'Delete Item',
 *     message: 'Are you sure? This cannot be undone.',
 *     variant: 'destructive'
 *   })
 *   if (confirmed) {
 *     // Delete item
 *   }
 * }
 * ```
 */

// Base Dialog Components
export {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  useDialogContext,
  ErrorDialog,
} from './base'
export type { ErrorDialogProps, DialogType } from './base'

// Confirmation Dialogs
export { ConfirmDialog } from './confirmation'
export type { ConfirmDialogProps, ConfirmDialogVariant } from './confirmation'

// Hooks
export { useDialog, useConfirmDialog } from './hooks'
