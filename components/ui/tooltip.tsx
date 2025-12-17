'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/utils'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ children, content, side = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-1.5 text-xs text-white bg-slate-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            positionClasses[side]
          )}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  )
}

// Legacy exports for compatibility
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
