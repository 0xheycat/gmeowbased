'use client'

import { DeviceMobile, Monitor } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useLayoutMode } from './layout-mode-context'

type LayoutModeSwitchProps = {
  className?: string
}

export function LayoutModeSwitch({ className }: LayoutModeSwitchProps) {
  const { mode, toggleMode } = useLayoutMode()
  const Icon = mode === 'mobile' ? DeviceMobile : Monitor
  const nextMode = mode === 'mobile' ? 'desktop' : 'mobile'

  return (
    <button
      type="button"
      className={cn('layout-switch', className)}
      onClick={toggleMode}
      aria-label={`Switch to ${nextMode} layout preview`}
      title={`Switch to ${nextMode} layout preview`}
      aria-pressed={mode === 'mobile'}
      data-state={mode}
    >
      <Icon size={18} weight={mode === 'mobile' ? 'fill' : 'regular'} className="layout-switch__icon" aria-hidden />
      <span className="sr-only">Current layout: {mode}</span>
    </button>
  )
}
