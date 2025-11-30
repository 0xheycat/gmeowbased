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
  Moon,
  Sun,
  Bell,
  Desktop,
  type IconProps,
} from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useNotificationCount } from '@/hooks/useNotificationCount'

export function MobileNavigation() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { count: notificationCount } = useNotificationCount()

  // Avoid hydration mismatch for theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    // Cycle through: dark → light → system → dark
    const themeOrder = ['dark', 'light', 'system']
    const currentIndex = themeOrder.indexOf(theme as string)
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]
    setTheme(nextTheme)
  }

  type NavItem = {
    href: string
    label: string
    icon: ComponentType<IconProps>
  }

  const items: NavItem[] = [
    { href: '/', label: 'Home', icon: HouseLine },
    { href: '/Quest', label: 'Quests', icon: Scroll },
    { href: '/Dashboard', label: 'Dash', icon: Gauge },
    { href: '/Guild', label: 'Guild', icon: UsersThree },
    { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  ]

  const getThemeIcon = () => {
    if (!mounted) return Moon
    if (theme === 'light') return Sun
    if (theme === 'system') return Desktop
    return Moon
  }

  const ThemeIcon = getThemeIcon()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 theme-bg-raised border-t theme-border-default pb-safe z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== '/' && pathname?.startsWith(it.href))
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all',
                active ? 'text-primary' : 'theme-text-secondary hover:text-primary'
              )}
            >
              <div className="relative">
                <Icon size={24} weight={active ? 'fill' : 'regular'} />
              </div>
              <span className="text-xs font-medium">{it.label}</span>
            </Link>
          )
        })}

        {/* Notifications Button */}
        <Link
          href="/app/notifications"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all theme-text-secondary hover:text-primary relative"
        >
          <div className="relative">
            <Bell size={24} weight="regular" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-danger rounded-full">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Notif</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all theme-text-secondary hover:text-primary"
          aria-label={mounted ? `Toggle theme (current: ${theme})` : 'Toggle theme'}
          disabled={!mounted}
        >
          <div className="relative">
            <ThemeIcon size={24} weight="regular" />
          </div>
          <span className="text-xs font-medium">Theme</span>
        </button>
      </div>
    </nav>
  )
}