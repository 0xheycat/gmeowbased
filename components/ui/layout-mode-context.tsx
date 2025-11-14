'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type LayoutMode = 'desktop' | 'mobile'

type LayoutModeContextValue = {
  mode: LayoutMode
  setMode: (next: LayoutMode) => void
  toggleMode: () => void
}

const STORAGE_KEY = 'gmeow:layout-mode'

const LayoutModeContext = createContext<LayoutModeContextValue | null>(null)

function applyDeviceAttributes(mode: LayoutMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.layoutMode = mode
  document.body.dataset.device = mode
  document.body.dataset.layoutMode = mode
  if (mode === 'mobile') {
    document.body.classList.add('device-mobile-preview')
    document.body.classList.remove('device-desktop-preview')
  } else {
    document.body.classList.remove('device-mobile-preview')
    document.body.classList.add('device-desktop-preview')
  }
}

function clearDeviceAttributes() {
  if (typeof document === 'undefined') return
  document.body.classList.remove('device-mobile-preview', 'device-desktop-preview')
  delete document.body.dataset.device
  delete document.body.dataset.layoutMode
  delete document.documentElement.dataset.layoutMode
}

export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<LayoutMode>('desktop')
  const hydrated = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'mobile' || stored === 'desktop') {
        setModeState(stored)
      } else {
        const prefersMobile = window.innerWidth < 768
        setModeState(prefersMobile ? 'mobile' : 'desktop')
      }
    } catch {
      // ignore storage read errors silently
    }
    hydrated.current = true
  }, [])

  useEffect(() => {
    applyDeviceAttributes(mode)
  }, [mode])

  useEffect(() => clearDeviceAttributes, [])

  useEffect(() => {
    if (!hydrated.current || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // ignore storage write errors silently
    }
  }, [mode])

  const setMode = useCallback((next: LayoutMode) => {
    setModeState((current) => (current === next ? current : next))
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((current) => (current === 'mobile' ? 'desktop' : 'mobile'))
  }, [])

  const value = useMemo<LayoutModeContextValue>(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode])

  return <LayoutModeContext.Provider value={value}>{children}</LayoutModeContext.Provider>
}

export function useLayoutMode(): LayoutModeContextValue {
  const context = useContext(LayoutModeContext)
  if (!context) {
    throw new Error('useLayoutMode must be used within a LayoutModeProvider')
  }
  return context
}
