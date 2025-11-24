'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import type { ComponentType } from 'react'
import {
  HouseLine,
  Gauge,
  Scroll,
  Trophy,
  UsersThree,
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
    { href: '/Quest', label: 'Quests', icon: Scroll }, // Most used - left thumb easy
    { href: '/Dashboard', label: 'Dash', icon: Gauge }, // Center - both hands
    { href: '/Guild', label: 'Guild', icon: UsersThree },
    { href: '/leaderboard', label: 'Ranks', icon: Trophy },
    // Profile removed - accessible via header dropdown
  ]

  return (
    <nav className="pixel-nav safe-area-bottom">
      <div className="pixel-frame">
        <div className="pixel-nav-grid" />
        <ul className="flex items-center justify-around gap-1 px-2 py-2">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== '/' && pathname?.startsWith(it.href))
            const Icon = it.icon
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  className={clsx(
                    'pixel-tab nav-link site-font flex flex-col items-center justify-center gap-1 py-2',
                    active && 'pixel-tab-active'
                  )}
                  aria-current={active ? 'page' : undefined}
                  data-active={active ? 'true' : 'false'}
                >
                  <span className="nav-glow" aria-hidden />
                  <Icon size={20} weight={active ? 'fill' : 'regular'} className="nav-icon" aria-hidden />
                  <span className="text-[10px] leading-none">{it.label}</span>
                  {active ? <span className="pixel-pill text-[8px] mt-0.5 px-1.5 py-0.5" aria-hidden="true">ON</span> : null}
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