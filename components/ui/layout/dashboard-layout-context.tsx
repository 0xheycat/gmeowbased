'use client'

import { createContext, useContext } from 'react'

export type DashboardSidenavStatus = 'open' | 'closed' | 'compact'

interface DashboardLayoutContextValue {
  leftSidenavStatus: DashboardSidenavStatus
  setLeftSidenavStatus: (status: DashboardSidenavStatus) => void
  rightSidenavStatus: DashboardSidenavStatus
  setRightSidenavStatus: (status: DashboardSidenavStatus) => void
  leftSidenavCanBeCompact?: boolean
  name: string
  isMobileMode: boolean
}

export const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null)

export function useDashboardLayoutContext() {
  const context = useContext(DashboardLayoutContext)
  if (!context) {
    throw new Error('useDashboardLayoutContext must be used within DashboardLayout')
  }
  return context
}
