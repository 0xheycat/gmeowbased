'use client'

import { type ComponentPropsWithoutRef, useCallback, useMemo, useState, useEffect } from 'react'
import { DashboardLayoutContext, type DashboardSidenavStatus } from './dashboard-layout-context'
import { AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface DashboardLayoutProps extends ComponentPropsWithoutRef<'div'> {
  name: string
  leftSidenavCanBeCompact?: boolean
  leftSidenavStatus?: DashboardSidenavStatus
  onLeftSidenavChange?: (status: DashboardSidenavStatus) => void
  rightSidenavStatus?: DashboardSidenavStatus
  initialRightSidenavStatus?: DashboardSidenavStatus
  onRightSidenavChange?: (status: DashboardSidenavStatus) => void
  height?: string
}

export function DashboardLayout({
  children,
  leftSidenavStatus: leftSidenav,
  onLeftSidenavChange,
  rightSidenavStatus: rightSidenav,
  initialRightSidenavStatus,
  onRightSidenavChange,
  name,
  leftSidenavCanBeCompact,
  height = 'h-full',
  ...domProps
}: DashboardLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const isCompactModeInitially = useMemo(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(`${name}.sidenav.compact`)
    return stored === 'true'
  }, [name])

  const defaultLeftSidenavStatus = isCompactModeInitially ? 'compact' : 'open'
  const [leftSidenavStatus, setLeftSidenavStatus] = useState<DashboardSidenavStatus>(
    leftSidenav || (isMobile ? 'closed' : defaultLeftSidenavStatus)
  )

  const rightSidenavStatusDefault = useMemo(() => {
    if (typeof window === 'undefined') return 'closed'
    if (isMobile) return 'closed'
    if (initialRightSidenavStatus != null) return initialRightSidenavStatus
    const stored = localStorage.getItem(`${name}.sidenav.right.position`)
    return (stored as DashboardSidenavStatus) || 'closed'
  }, [isMobile, name, initialRightSidenavStatus])

  const [rightSidenavStatus, _setRightSidenavStatus] = useState<DashboardSidenavStatus>(
    rightSidenav || rightSidenavStatusDefault
  )

  const setRightSidenavStatus = useCallback(
    (status: DashboardSidenavStatus) => {
      _setRightSidenavStatus(status)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${name}.sidenav.right.position`, status)
      }
    },
    [name]
  )

  // Block body overflow when sidenav open on mobile
  useEffect(() => {
    if (isMobile && (leftSidenavStatus === 'open' || rightSidenavStatus === 'open')) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, leftSidenavStatus, rightSidenavStatus])

  const shouldShowUnderlay = isMobile && (leftSidenavStatus === 'open' || rightSidenavStatus === 'open')

  return (
    <DashboardLayoutContext.Provider
      value={{
        leftSidenavStatus,
        setLeftSidenavStatus,
        rightSidenavStatus,
        setRightSidenavStatus,
        leftSidenavCanBeCompact,
        name,
        isMobileMode: isMobile,
      }}
    >
      <div {...domProps} className={clsx('dashboard-grid relative isolate', height)}>
        {children}
        <AnimatePresence>
          {shouldShowUnderlay && (
            <div
              key="dashboard-underlay"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setLeftSidenavStatus('closed')
                setRightSidenavStatus('closed')
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayoutContext.Provider>
  )
}
