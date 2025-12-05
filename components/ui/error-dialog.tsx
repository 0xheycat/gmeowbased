/**
 * Modern error dialog system for user interaction errors
 * Handles: missing fields, invalid input, form validation, confirmations
 */

'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { ICON_SIZES } from '@/lib/icon-sizes'

export type DialogType = 'error' | 'warning' | 'confirm' | 'info'

export interface ErrorDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
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
  message,
  type = 'error',
  primaryAction,
  secondaryAction,
}: ErrorDialogProps) {
  const config = TYPE_CONFIG[type]

  const handlePrimaryAction = () => {
    primaryAction?.onClick()
    onClose()
  }

  const handleSecondaryAction = () => {
    secondaryAction?.onClick()
    onClose()
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop with blur */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Dialog container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-gray-800 shadow-2xl transform transition-all">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close dialog"
              >
                <CloseIcon sx={{ fontSize: ICON_SIZES.md }} />
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${config.iconBg} ${config.iconColor} mb-4`}>
                  {config.icon}
                </div>

                {/* Title */}
                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {title}
                </Dialog.Title>

                {/* Message */}
                <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {message}
                </Dialog.Description>

                {/* Actions */}
                <div className="mt-6 flex gap-3 justify-end">
                  {secondaryAction && (
                    <button
                      onClick={handleSecondaryAction}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {secondaryAction.label}
                    </button>
                  )}
                  {primaryAction && (
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
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
