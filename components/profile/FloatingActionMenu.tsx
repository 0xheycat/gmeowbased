'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export type FloatingAction = {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
}

interface FloatingActionMenuProps {
  actions: FloatingAction[]
  className?: string
}

export function FloatingActionMenu({ actions, className }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(prev => !prev)

  return (
    <div className={cn('relative', className)}>
      {/* Action buttons - appear when open */}
      {isOpen && (
        <div className="absolute bottom-[calc(100%+0.75rem)] right-0 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick()
                setIsOpen(false)
              }}
              disabled={action.disabled}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl',
                'bg-slate-800/95 backdrop-blur border border-slate-700/50',
                'hover:bg-slate-700/95 hover:border-slate-600/50',
                'active:scale-95 transition-all duration-200',
                'min-h-[44px] min-w-[44px]',
                'shadow-lg shadow-black/20',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800/95'
              )}
              aria-label={action.label}
            >
              <span className="text-2xl leading-none">{action.icon}</span>
              <span className="text-sm font-semibold whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={toggleMenu}
        className={cn(
          'flex items-center justify-center',
          'w-12 h-12 rounded-full',
          'bg-gradient-to-br from-cyan-500 to-violet-600',
          'hover:from-cyan-400 hover:to-violet-500',
          'active:scale-95',
          'shadow-lg shadow-cyan-500/50',
          'transition-all duration-200',
          'border-2 border-slate-200 dark:border-white/10',
          isOpen && 'rotate-45'
        )}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        <span className="text-2xl leading-none transition-transform duration-200">
          {isOpen ? '✕' : '⚡'}
        </span>
      </button>

      {/* Backdrop - closes menu when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
