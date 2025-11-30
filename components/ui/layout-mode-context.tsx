// Layout mode context - minimal implementation
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type LayoutMode = 'list' | 'grid' | 'compact'

interface LayoutModeContextType {
  mode: LayoutMode
  setMode: (mode: LayoutMode) => void
}

const LayoutModeContext = createContext<LayoutModeContextType | null>(null)

export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LayoutMode>('grid')

  return (
    <LayoutModeContext.Provider value={{ mode, setMode }}>
      {children}
    </LayoutModeContext.Provider>
  )
}

export function useLayoutMode() {
  const context = useContext(LayoutModeContext)
  if (!context) {
    return { mode: 'grid' as LayoutMode, setMode: () => {} }
  }
  return context
}
