'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import PetsIcon from '@mui/icons-material/Pets'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileDropdown } from '@/components/layout/ProfileDropdown'
import { NotificationBell } from '@/components/notifications'
import { WalletCacheIndicator } from '@/components/WalletCacheDemo'

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Scroll effect: Add shadow when scrolled > 100px (pattern from trezoadmin-41)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const isActive = (path: string) => pathname === path

  return (
    <nav
      role="navigation"
      className={`sticky top-0 z-30 w-full transition-all duration-300 backdrop-blur-lg ${
        isScrolled
          ? 'bg-white/90 dark:bg-gray-900/90 shadow-sm'
          : 'bg-white/60 dark:bg-gray-900/60'
      }`}
    >
      {/* Safe area padding for iOS notch/Dynamic Island */}
      <div className="pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8 safe-x">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
          >
            <PetsIcon sx={{ fontSize: 28 }} />
            <span className="hidden sm:inline">Gmeowbased</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/quests"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/quests')
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              Quests
            </Link>
            <Link
              href="/leaderboard"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/leaderboard')
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              Leaderboard
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Multi-Wallet Cache Indicator */}
          <WalletCacheIndicator />

          {/* Notification Bell with Dropdown */}
          <NotificationBell />

          {/* Animated Theme Toggle */}
          {mounted && (
            <motion.button
              onClick={toggleTheme}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
              aria-label="Toggle theme"
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'dark' ? (
                    <LightModeIcon sx={{ fontSize: 18 }} className="text-yellow-500" />
                  ) : (
                    <DarkModeIcon sx={{ fontSize: 18 }} className="text-gray-700" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          )}

          {/* Profile Dropdown */}
          <ProfileDropdown />
        </div>
      </div>
      </div>
    </nav>
  )
}
