'use client'

/**
 * useDialog Hook - Simplified dialog state management
 * Usage:
 * 
 * const { isOpen, open, close } = useDialog()
 * 
 * return (
 *   <>
 *     <Button onClick={open}>Open Dialog</Button>
 *     <Dialog isOpen={isOpen} onClose={close}>
 *       <DialogBackdrop />
 *       <DialogContent>
 *         <DialogHeader>
 *           <DialogTitle>Title</DialogTitle>
 *         </DialogHeader>
 *         <DialogBody>Content</DialogBody>
 *         <DialogFooter>
 *           <Button onClick={close}>Close</Button>
 *         </DialogFooter>
 *       </DialogContent>
 *     </Dialog>
 *   </>
 * )
 */

import { useState, useCallback } from 'react'

export function useDialog(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
