/**
 * Base Dialog Components
 * 
 * Core dialog system using custom Dialog with Framer Motion animations.
 * Provides Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogBody, DialogFooter.
 * 
 * Usage:
 * ```tsx
 * import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
 * ```
 */

export { 
  Dialog, 
  DialogBackdrop, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter,
  useDialogContext 
} from './dialog'

export { default as ErrorDialog } from './error-dialog'
export type { ErrorDialogProps, DialogType } from './error-dialog'
