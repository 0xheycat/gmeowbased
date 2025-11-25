'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="theme-toggle inline-flex items-center justify-center rounded-full"
        aria-label="Toggle theme"
        disabled
      >
        <Sun size={20} weight="fill" className="text-current opacity-50" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="theme-toggle inline-flex items-center justify-center rounded-full transition-transform hover:scale-110"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={20} weight="fill" className="text-current" />
      ) : (
        <Moon size={20} weight="fill" className="text-current" />
      )}
    </button>
  )
}
