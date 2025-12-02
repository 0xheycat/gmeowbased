'use client'

/**
 * Dialog Examples - Reference implementation
 * Shows how to use the Dialog system with various configurations
 * Copy these patterns when building new dialogs
 */

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { useDialog } from '@/lib/hooks/use-dialog'

// Example 1: Simple confirmation dialog
export function SimpleDialog() {
  const { isOpen, open, close } = useDialog()

  return (
    <>
      <Button onClick={open}>Open Simple Dialog</Button>

      <Dialog isOpen={isOpen} onClose={close}>
        <DialogBackdrop />
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to proceed with this action?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={close}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Example 2: Dialog with form content
export function FormDialog() {
  const { isOpen, open, close } = useDialog()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    close()
  }

  return (
    <>
      <Button onClick={open}>Open Form Dialog</Button>

      <Dialog isOpen={isOpen} onClose={close}>
        <DialogBackdrop blur="lg" />
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please fill in your information to continue
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your email"
                />
              </div>
            </form>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Example 3: Large content dialog with scroll
export function LargeContentDialog() {
  const { isOpen, open, close } = useDialog()

  return (
    <>
      <Button onClick={open}>Open Large Dialog</Button>

      <Dialog isOpen={isOpen} onClose={close}>
        <DialogBackdrop />
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
            <DialogDescription>
              Please read and accept our terms
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <p>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco
                laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur.
              </p>
              {/* Add more content to demonstrate scroll */}
              <p>
                Excepteur sint occaecat cupidatat non proident, sunt in culpa
                qui officia deserunt mollit anim id est laborum.
              </p>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                accusantium doloremque laudantium.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Decline
            </Button>
            <Button onClick={close}>
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Example 4: Destructive action dialog
export function DestructiveDialog() {
  const { isOpen, open, close } = useDialog()

  const handleDelete = () => {
    // Handle delete action
    console.log('Item deleted')
    close()
  }

  return (
    <>
      <Button variant="destructive" onClick={open}>
        Delete Item
      </Button>

      <Dialog isOpen={isOpen} onClose={close}>
        <DialogBackdrop blur="md" />
        <DialogContent size="sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-500">
              Delete Item
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              item.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
