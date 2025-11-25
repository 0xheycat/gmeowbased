'use client'

import '@/app/styles/gmeow-header.css'   // ← NEW: import your header CSS

import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Scroll, Lightning } from '@phosphor-icons/react'

import { LayoutModeSwitch } from '@/components/ui/LayoutModeSwitch'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'

import {
  navIconLinks,
} from './nav-data'

export function GmeowHeader() {
  const pathname = usePathname()

  const [isSolid, setIsSolid] = useState(false)

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
        'theme-shell-header site-font sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between border-b px-3 sm:px-4 md:px-6 lg:px-10 transition-[background,box-shadow,border-bottom-color,color] duration-300',
        isSolid && 'theme-shell-header--solid'
      )}
    >
      {/* LEFT */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile: Quick actions (GM + Quests) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/Quest"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white dark:border-slate-700/10 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5/5 transition-colors hover:border-[var(--px-accent)]/60 hover:bg-[var(--px-accent)]/5 backdrop-blur-xl backdrop-saturate-150"
            aria-label="View Quests"
          >
            <Scroll size={18} weight="regular" />
          </Link>
          <Link
            href="/gm"
            className="flex h-9 items-center gap-1.5 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 text-sm font-medium transition-colors hover:border-accent-green/50 hover:bg-accent-green/15"
            aria-label="Daily GM"
          >
            <Lightning size={16} weight="fill" className="text-accent-green" />
            <span className="text-accent-green">GM</span>
          </Link>
        </div>

        {/* Desktop: Logo + text */}
        <Link href="/" className="hidden sm:flex items-center gap-2 sm:gap-3">
          <div className="theme-shell-icon theme-shell-icon--badge grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-lg border">
            <LayoutModeSwitch className="scale-90 sm:scale-100" />
          </div>

          <span className="flex flex-col leading-tight">
            <span className="theme-shell-label text-[10px] sm:text-xs uppercase tracking-[0.3em]">
              Gmeowbased
            </span>
            <span className="theme-shell-title text-xs sm:text-sm font-semibold">
              Flight Deck
            </span>
          </span>
        </Link>
      </div>

      {/* DESKTOP NAV */}
      <nav
        className="hidden h-full items-center gap-2 lg:flex lg:gap-3"
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
                'flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl border transition-all',
                active
                  ? 'border-[var(--px-accent)] bg-[var(--px-accent)]/10 text-[var(--px-accent)] shadow-[0_0_12px_rgba(124,255,122,0.25)]'
                  : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-500/70 dark:text-slate-700/70 dark:text-slate-950 dark:text-slate-700 dark:text-white/70 hover:border-[var(--px-accent)]/60 hover:text-[var(--px-accent)]'
              )}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} />
            </Link>
          )
        })}
      </nav>

      {/* MOBILE NAV - Removed per GI audit P0-2 */}
      {/* Mobile navigation now only at bottom via MobileNavigation component */}
      <div className="flex-1 lg:hidden" />

      {/* RIGHT */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        <ProfileDropdown />
        {/* Desktop only: Theme toggle */}
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
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
