'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import type { ComponentType } from 'react'
import {
  HouseLine,
  ChartLine,
  Scroll,
  Trophy,
  UsersThree,
  Cat,
  type IconProps,
} from '@phosphor-icons/react'

export function MobileNavigation() {
  const pathname = usePathname()

  type NavItem = {
    href: string
    label: string
    icon: ComponentType<IconProps>
  }

  const items: NavItem[] = [
    { href: '/', label: 'Home', icon: HouseLine },
    { href: '/Dashboard', label: 'Dashboard', icon: ChartLine },
    { href: '/Quest', label: 'Quests', icon: Scroll },
    { href: '/leaderboard', label: 'Ranks', icon: Trophy },
    { href: '/Guild', label: 'Guild', icon: UsersThree },
    { href: '/profile', label: 'Me', icon: Cat },
  ]

  return (
    <nav className="pixel-nav">
      <div className="pixel-frame">
        <div className="pixel-nav-grid" />
        <ul className="flex items-center justify-between gap-1 px-2 py-2">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== '/' && pathname?.startsWith(it.href))
            const Icon = it.icon
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={clsx('pixel-tab nav-link site-font', active && 'pixel-tab-active')}
                  data-active={active ? 'true' : 'false'}
                >
                  <span className="nav-glow" aria-hidden />
                  <Icon size={22} weight={active ? 'fill' : 'regular'} className="nav-icon" aria-hidden />
                  <span className="text-[11px] leading-none">{it.label}</span>
                  {active ? <span className="pixel-pill text-[9px] mt-0.5">ON</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* detail: styling lives in app/styles.css → MOBILE NAVIGATION */}
    </nav>
  )
}