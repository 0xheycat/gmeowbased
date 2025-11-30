// LiveEventBridge - stub for event system
'use client'

import type { ReactNode } from 'react'

interface LiveEventBridgeProps {
  children: ReactNode
}

export function LiveEventBridge({ children }: LiveEventBridgeProps) {
  // Minimal event bridge - just pass through children
  return <>{children}</>
}
