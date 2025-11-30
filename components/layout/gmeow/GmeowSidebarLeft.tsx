"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import {
  HouseLine,
  ChartLine,
  Scroll,
  Trophy,
  UsersThree,
  Cat,
  Lightning,
  CaretLeft,
  type IconProps,
} from '@phosphor-icons/react'
import clsx from 'clsx'

type NavItem = {
  href: string
  label: string
  description: string
  icon: ComponentType<IconProps>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', description: 'Mission control', icon: HouseLine },
  { href: '/Dashboard', label: 'Dashboard', description: 'Daily GM pulse', icon: ChartLine },
  { href: '/Quest', label: 'Quests', description: 'Active sorties', icon: Scroll },
  { href: '/leaderboard', label: 'Leaderboard', description: 'Top pilots', icon: Trophy },
  { href: '/Guild', label: 'Guild', description: 'Rally your crew', icon: UsersThree },
  { href: '/profile', label: 'Profile', description: 'Your dossier', icon: Cat },
]

type GmeowSidebarLeftProps = {
  onHide?: () => void
}

export function GmeowSidebarLeft({ onHide }: GmeowSidebarLeftProps) {
  const pathname = usePathname()

  // detail: gmeow layout utilities live in app/styles.css (gmeow-sidebar-shadow)
  return (
    <aside className="gmeow-sidebar-left theme-shell hidden w-72 shrink-0 flex-col border-r px-6 py-8 gmeow-sidebar-shadow site-font xl:flex">
      <div className="mb-8 flex items-center justify-between gap-3">
        <h2 className="theme-shell-heading text-xs">Navigation</h2>
        {onHide ? (
          <button
            type="button"
            onClick={onHide}
            className="gmeow-sidebar-toggle-button"
            aria-label="Hide sidebar"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
        ) : null}
      </div>
      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'theme-shell-nav group relative overflow-hidden rounded-xl border px-4 py-3',
                active ? 'theme-shell-nav--active' : 'theme-shell-nav--idle'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={clsx('theme-shell-icon grid h-10 w-10 place-items-center rounded-lg border', active && 'theme-shell-icon--active')}>
                  <Icon size={24} weight={active ? 'fill' : 'regular'} />
                </span>
                <div className="flex flex-col text-sm leading-tight">
                  <span className="theme-shell-title font-semibold tracking-wide">{item.label}</span>
                  <span className="theme-shell-label text-xs uppercase tracking-[0.25em]">{item.description}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </nav>
      <div className="theme-shell-card theme-shell-card--muted mt-10 rounded-xl border p-5 text-xs uppercase tracking-[0.3em]">
        <div className="mb-3 flex items-center gap-2">
          <Lightning size={20} weight="bold" />
          <span className="theme-shell-title text-sm font-semibold normal-case tracking-normal">Need the automation queue?</span>
        </div>
        <p className="theme-shell-copy leading-relaxed">
          Jump into dev tooling, lint routines, and planning docs to keep the Gmeow cockpit production-ready.
        </p>
        <Link
          href="/Dashboard"
          className="theme-shell-cta mt-4 inline-flex items-center justify-center rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em]"
        >
          Open Dashboard
        </Link>
      </div>
    </aside>
  )
}
