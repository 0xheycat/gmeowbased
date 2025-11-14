'use client'

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { GmeowHeader } from './GmeowHeader'
import { GmeowSidebarLeft } from './GmeowSidebarLeft'
import { GmeowSidebarRight } from './GmeowSidebarRight'
import { SiteFooter } from './SiteFooter'
import { MobileNavigation } from '@/components/MobileNavigation'

// detail: gmeow layout helpers live in app/styles.css (gmeow-*)

export function GmeowLayout({ children }: { children: ReactNode }) {
  const [leftSidebarHidden, setLeftSidebarHidden] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="relative flex min-h-screen w-full site-font gmeow-shell-text">
      <div className="pointer-events-none absolute inset-0 -z-20 gmeow-page-overlay" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="hidden sm:block mix-blend-screen">
          <div className="absolute -left-20 top-[-90px] h-[360px] w-[360px] rounded-full blur-[120px] gmeow-orbit-primary" />
          <div className="absolute -right-16 top-[22%] h-[320px] w-[320px] rounded-full blur-[110px] gmeow-orbit-secondary" />
          <div className="absolute left-1/3 bottom-[-130px] h-[440px] w-[440px] rounded-full blur-[150px] gmeow-orbit-tertiary" />
        </div>
        <div className="sm:hidden">
          <div className="absolute inset-x-[-40%] top-[-120px] h-[260px] rounded-full blur-[120px] gmeow-orbit-mobile" />
        </div>
      </div>
      {!leftSidebarHidden ? (
        <GmeowSidebarLeft onHide={() => setLeftSidebarHidden(true)} />
      ) : null}
      {leftSidebarHidden ? (
        <div className="gmeow-sidebar-reveal hidden items-center xl:flex">
          <button
            type="button"
            className="gmeow-sidebar-toggle-button"
            onClick={() => setLeftSidebarHidden(false)}
            aria-label="Show sidebar"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      ) : null}
      <div className="gmeow-layout-main flex min-h-screen flex-1 flex-col">
        <GmeowHeader />
        <main className="flex-1 px-3 pb-24 pt-4 sm:px-6 sm:pb-28 sm:pt-6 lg:px-10 xl:px-12 2xl:px-16 2xl:pt-8">
          <div className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10 lg:space-y-12">{children}</div>
        </main>
        <SiteFooter />
        {isMobile && <MobileNavigation />}
      </div>
      <GmeowSidebarRight />
    </div>
  )
}
