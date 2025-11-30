'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Badge } from 'components(old)/ui/tailwick-primitives'
import { useMiniapp } from '@/hooks/useMiniapp'
import { useNotificationCount } from '@/hooks/useNotificationCount'
import { useLayoutContext } from 'contexts(old)/useLayoutContext'
import { ProfileDropdown } from 'components(old)/navigation/ProfileDropdown'
import { BaseWallet } from 'components(old)/base'

interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
  activePattern?: RegExp
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/app', icon: '/assets/gmeow-icons/Newsfeed Icon.svg', activePattern: /^\/app\/?$/ },
  { label: 'Daily GM', href: '/app/daily-gm', icon: '/assets/gmeow-icons/Success Box Icon.svg', activePattern: /^\/app\/daily-gm/ },
  { label: 'Quests', href: '/app/quests', icon: '/assets/gmeow-icons/Quests Icon.svg', activePattern: /^\/app\/quests/ },
  { label: 'Guilds', href: '/app/guilds', icon: '/assets/gmeow-icons/Groups Icon.svg', activePattern: /^\/app\/guilds/ },
  { label: 'Leaderboard', href: '/app/leaderboard', icon: '/assets/gmeow-icons/Trophy Icon.svg', activePattern: /^\/app\/leaderboard/ },
]

export function AppNavigation() {
  const pathname = usePathname()
  const { isMiniapp, context } = useMiniapp()
  const { count: notificationCount } = useNotificationCount()
  const { theme, updateSettings } = useLayoutContext()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only showing theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    // Cycle through: dark → light → system → dark
    const themeOrder = ['dark', 'light', 'system']
    const currentIndex = themeOrder.indexOf(theme as string)
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]
    updateSettings({ theme: nextTheme as 'light' | 'dark' | 'system' })
  }

  const isActive = (item: NavItem) => {
    if (item.activePattern) {
      return item.activePattern.test(pathname)
    }
    return pathname === item.href
  }

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'mythic': return 'from-purple-500 to-pink-500'
      case 'legendary': return 'from-yellow-500 to-orange-500'
      case 'epic': return 'from-blue-500 to-purple-500'
      case 'rare': return 'from-green-500 to-blue-500'
      default: return 'from-gray-500 to-gray-400'
    }
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:top-0 lg:left-0 lg:flex lg:flex-col lg:w-64 lg:h-screen theme-bg-raised lg:border-r theme-border-default lg:z-40">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 p-6 border-b border-default-200">
            <Image
              src="/logo.png"
              alt="Gmeowbased"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold theme-text-primary">Gmeowbased</h1>
              {isMiniapp && (
                <Badge variant="primary" size="sm">Miniapp</Badge>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {mainNavItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-l-2 border-primary' : 'theme-text-secondary theme-hover-bg-subtle theme-text-primary'}`}
                >
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={24}
                    height={24}
                    className={active ? 'brightness-0 invert' : 'opacity-70'}
                  />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="danger" size="sm" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Theme Toggle, Notifications, Wallet - Desktop */}
          <div className="px-4 py-3 border-t theme-border-subtle space-y-2">
            {/* BaseWallet Integration */}
            <div className="w-full">
              <BaseWallet.Compact />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all duration-200 hover:scale-105"
                aria-label={mounted ? `Toggle theme (current: ${theme})` : 'Toggle theme'}
                title={mounted ? `Theme: ${theme} • Click to cycle` : 'Toggle theme'}
              >
                {/* Sun icon (light mode) */}
                <svg
                  className={`w-5 h-5 theme-text-secondary absolute transition-all duration-200 ${mounted && theme === 'light' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {/* Moon icon (dark mode) */}
                <svg
                  className={`w-5 h-5 theme-text-secondary absolute transition-all duration-200 ${mounted && theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                {/* Monitor icon (system mode) */}
                <svg
                  className={`w-5 h-5 theme-text-secondary absolute transition-all duration-200 ${mounted && theme === 'system' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Notifications Button */}
              <Link
                href="/app/notifications"
                className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all relative"
              >
                <Image
                  src="/assets/gmeow-icons/Notifications Icon.svg"
                  alt="Notifications"
                  width={20}
                  height={20}
                  className="opacity-70"
                />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
                )}
              </Link>

              {/* Profile Dropdown Button - Desktop */}
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all relative"
                aria-label="Profile menu"
              >
                <Image
                  src="/assets/gmeow-icons/Profile Icon.svg"
                  alt="Profile"
                  width={24}
                  height={24}
                  className="opacity-70"
                />
              </button>
            </div>
          </div>

          {/* Profile Dropdown Menu - Desktop */}
          {showProfileDropdown && (
            <div className="absolute bottom-20 left-4 right-4 mb-2 theme-bg-raised backdrop-blur-lg rounded-lg theme-border-default shadow-xl overflow-hidden">
              <ProfileDropdown
                onClose={() => setShowProfileDropdown(false)}
                miniKitContext={context}
                isMiniAppSession={isMiniapp}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <header className="lg:hidden fixed top-0 left-0 right-0 theme-bg-raised theme-border-default z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/app" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Gmeowbased"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-bold theme-text-primary">Gmeowbased</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* BaseWallet - Mobile */}
            <div className="mr-1">
              <BaseWallet.Button variant="ghost" />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all relative"
              aria-label={mounted ? `Toggle theme (current: ${theme})` : 'Toggle theme'}
              title={mounted ? `Theme: ${theme} \u2022 Click to cycle` : 'Toggle theme'}
            >
              {/* Sun icon (light mode) */}
              <svg
                className={`w-5 h-5 theme-text-secondary absolute transition-all duration-200 ${mounted && theme === 'light' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {/* Moon icon (dark mode) */}
              <svg
                className={`w-5 h-5 theme-text-secondary absolute transition-all duration-200 ${mounted && theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              {/* Monitor icon (system mode) */}
              <svg
                className={`w-5 h-5 theme-text-secondary absolute transition-all duration-200 ${mounted && theme === 'system' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Notifications */}
            <Link
              href="/app/notifications"
              className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all relative"
            >
              <Image
                src="/assets/gmeow-icons/Notifications Icon.svg"
                alt="Notifications"
                width={20}
                height={20}
                className="opacity-70"
              />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-danger rounded-full">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all relative"
            >
              <Image
                src="/assets/gmeow-icons/Profile Icon.svg"
                alt="Profile"
                width={24}
                height={24}
                className="opacity-70"
              />
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="absolute top-full left-0 right-0 theme-bg-raised backdrop-blur-lg border-b theme-border-default shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
            <ProfileDropdown
              isMobile
              onClose={() => setShowMobileMenu(false)}
              miniKitContext={context}
              isMiniAppSession={isMiniapp}
            />
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 theme-bg-raised border-t theme-border-default pb-safe z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {mainNavItems.slice(0, 5).map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all ${active ? 'text-primary' : 'theme-text-secondary hover:text-primary'}`}
              >
                <div className="relative">
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={24}
                    height={24}
                    className={active ? 'brightness-0 invert' : 'opacity-70'}
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-danger rounded-full">
                      {item.badge > 9 ? '9' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="lg:ml-64">
        <div className="lg:hidden h-16" /> {/* Top nav spacer */}
        <div className="lg:hidden h-20" /> {/* Bottom nav spacer */}
      </div>
    </>
  )
}
