'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useState, useEffect } from 'react'
import { Moon, Sun, Desktop, Bell } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { useNotificationCount } from '@/hooks/useNotificationCount'

export function PixelSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { count: notificationCount } = useNotificationCount()

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

  const items = [
    { href: '/', label: 'Home', icon: '/assets/gmeow-icons/Newsfeed Icon.svg' },
    { href: '/Dashboard', label: 'Dashboard', icon: '/assets/gmeow-icons/Newsfeed Icon.svg' },
    { href: '/Quest', label: 'Quests', icon: '/assets/gmeow-icons/Quests Icon.svg' },
    { href: '/Guild', label: 'Guilds', icon: '/assets/gmeow-icons/Groups Icon.svg' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '/assets/gmeow-icons/Trophy Icon.svg' },
  ]

  const getThemeIcon = () => {
    if (!mounted) return null
    if (theme === 'light') return <Sun size={20} weight="regular" />
    if (theme === 'system') return <Desktop size={20} weight="regular" />
    return <Moon size={20} weight="regular" />
  }

  return (
    <aside className="hidden lg:fixed lg:top-0 lg:left-0 lg:flex lg:flex-col lg:w-64 lg:h-screen theme-bg-raised lg:border-r theme-border-default lg:z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b theme-border-subtle">
          <Image
            src="/logo.png"
            alt="Gmeowbased"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-xl font-bold theme-text-primary">Gmeowbased</h1>
            <p className="text-xs theme-text-secondary">Adventure awaits</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                  active
                    ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-2 border-primary'
                    : 'theme-text-secondary theme-hover-bg-subtle hover:theme-text-primary'
                )}
              >
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={24}
                  height={24}
                  className={active ? 'brightness-0 invert' : 'opacity-70'}
                />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle, Notifications - Desktop */}
        <div className="px-4 py-3 border-t theme-border-subtle space-y-2">
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all duration-200 hover:scale-105"
              aria-label={mounted ? `Toggle theme (current: ${theme})` : 'Toggle theme'}
              title={mounted ? `Theme: ${theme} • Click to cycle` : 'Toggle theme'}
            >
              {getThemeIcon()}
            </button>

            {/* Notifications Button */}
            <Link
              href="/app/notifications"
              className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all relative"
            >
              <Bell size={20} weight="regular" className="theme-text-secondary" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}
