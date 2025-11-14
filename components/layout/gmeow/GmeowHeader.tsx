'use client'

import '@/app/styles/gmeow-header.css'   // ← NEW: import your header CSS

import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { LayoutModeSwitch } from '@/components/ui/LayoutModeSwitch'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useLayoutMode } from '@/components/ui/layout-mode-context'

import {
  navIconLinks,
  navMobileShortcuts,
} from './nav-data'

export function GmeowHeader() {
  const pathname = usePathname()
  const { mode } = useLayoutMode()

  const [isSolid, setIsSolid] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const isMobile = mode === 'mobile' || isMobileViewport

  // Track mobile viewport
  useEffect(() => {
    if (typeof window === 'undefined') return;
  
    const mq: MediaQueryList = window.matchMedia('(max-width: 768px)');
  
    // Initial set
    setIsMobileViewport(mq.matches);
  
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };
  
    // Modern browsers
    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
  
    // Legacy Safari fallback
    const legacyListener = (e: MediaQueryListEvent) => handleChange(e);
    mq.addListener(legacyListener);
    return () => mq.removeListener(legacyListener);
  }, []);
  

  // Track scroll solidity
  useEffect(() => {
    const handleScroll = () => setIsSolid(window.scrollY > 12)
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={clsx(
        'theme-shell-header site-font sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 transition-[background,box-shadow,border-bottom-color,color] duration-300 md:px-6 lg:px-10',
        isSolid && 'theme-shell-header--solid'
      )}
    >
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="theme-shell-icon theme-shell-icon--badge grid h-10 w-10 place-items-center rounded-lg border text-base font-semibold">
            😺
          </span>

          <span className="hidden flex-col leading-tight sm:flex">
            <span className="theme-shell-label text-xs uppercase tracking-[0.3em]">
              Gmeow Adventure
            </span>
            <span className="theme-shell-title text-sm font-semibold">
              Flight Deck
            </span>
          </span>
        </Link>
      </div>

      {/* DESKTOP NAV */}
      <nav
        className="hidden h-full items-center gap-3 lg:flex"
        aria-label="Primary navigation"
      >
        {navIconLinks.map((link) => {
          const Icon = link.icon
          const active = isLinkActive(pathname, link.href)
          const external = link.href.startsWith('http')

          return (
            <Link
              key={link.id}
              href={link.href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              aria-label={link.label}
              data-active={active ? 'true' : undefined}
              className={clsx(
                'flex h-12 w-12 items-center justify-center rounded-xl border transition-all',
                active
                  ? 'border-[var(--px-accent)] bg-[var(--px-accent)]/10 text-[var(--px-accent)] shadow-[0_0_12px_rgba(124,255,122,0.25)]'
                  : 'border-white/10 text-white/70 hover:border-[var(--px-accent)]/60 hover:text-[var(--px-accent)]'
              )}
            >
              <Icon size={20} weight={active ? 'fill' : 'regular'} />
            </Link>
          )
        })}
      </nav>

      {/* MOBILE NAV */}
      <nav
        className={clsx(
          'flex-1 items-center justify-center lg:hidden',
          isMobile ? 'flex' : 'hidden'
        )}
        aria-label="Mobile quick navigation"
      >
        <div className="header-mobile-nav flex w-full max-w-[420px] items-center justify-center gap-1.5 overflow-x-auto px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          {navMobileShortcuts.map((link) => {
            const Icon = link.icon
            const active = isLinkActive(pathname, link.href)
            const external = link.href.startsWith('http')

            return (
              <Link
                key={`mobile-${link.id}`}
                href={link.href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noreferrer' : undefined}
                aria-label={link.label}
                data-active={active ? 'true' : undefined}
                className={clsx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all',
                  active
                    ? 'border-[var(--px-accent)] bg-[var(--px-accent)]/15 text-[var(--px-accent)] shadow-[0_0_10px_rgba(124,255,122,0.35)]'
                    : 'border-white/10 text-white/70 hover:border-[var(--px-accent)]/60 hover:text-[var(--px-accent)]'
                )}
              >
                <Icon size={18} weight={active ? 'fill' : 'regular'} />
                <span className="sr-only">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* RIGHT */}
      <div className="flex items-center gap-2 md:gap-3">
        <LayoutModeSwitch className="hidden md:inline-flex" />
        <ThemeToggle />
      </div>
    </header>
  )
}

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  if (href.startsWith('http')) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}
