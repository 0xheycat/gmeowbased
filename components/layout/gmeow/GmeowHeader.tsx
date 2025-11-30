'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from 'next-themes'

import { ProfileDropdown } from '@/components/layout/ProfileDropdown'

export function GmeowHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
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
      className={`sticky top-0 z-30 w-full transition-all duration-300 backdrop-blur-lg ${
        isScrolled
          ? 'bg-white/80 dark:bg-gray-900/80 shadow-sm'
          : 'bg-white/60 dark:bg-gray-900/60'
      }`}
    >
      <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">😺</span>
            <span className="hidden sm:inline">Gmeowbased</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/Quest"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/Quest')
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
              href="/Dashboard"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/Dashboard')
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
          {/* Notification Button */}
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
            aria-label="Notifications"
          >
            <Bell size={18} weight="regular" className="text-gray-700 dark:text-gray-300" />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
          </Link>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun size={18} weight="regular" className="text-yellow-500" />
              ) : (
                <Moon size={18} weight="regular" className="text-gray-700" />
              )}
            </button>
          )}

          {/* Profile Dropdown */}
          <ProfileDropdown />
        </div>
      </div>
    </nav>
  )
}
