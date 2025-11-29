'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const config = JSON.parse(localStorage.getItem('__GMEOWBASED_LAYOUT_CONFIG__') || '{}')
      setTheme(config.theme || 'dark')
    } catch {
      setTheme('dark')
    }
  }, [])

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    let actualTheme: 'light' | 'dark' = 'dark'
    
    if (newTheme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      actualTheme = newTheme
    }
    
    document.documentElement.setAttribute('data-theme', actualTheme)
    
    // Save to localStorage
    const config = {
      theme: newTheme,
      sidenavColor: 'light',
      topbarColor: 'light'
    }
    localStorage.setItem('__GMEOWBASED_LAYOUT_CONFIG__', JSON.stringify(config))
    setTheme(newTheme)
  }

  // Cycle through themes: dark → light → system → dark
  const cycleTheme = () => {
    const themeOrder: Theme[] = ['dark', 'light', 'system']
    const currentIndex = themeOrder.indexOf(theme)
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]
    applyTheme(nextTheme)
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button 
        className="p-2 rounded-lg theme-card-bg-secondary theme-border-default border hover:theme-border-hover transition-colors"
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg theme-card-bg-secondary theme-border-default border hover:theme-border-hover transition-colors group"
      aria-label={`Switch theme (current: ${theme})`}
      title={`Current: ${theme} mode • Click to cycle`}
    >
      {theme === 'light' && (
        <Sun className="w-5 h-5 theme-text-primary group-hover:text-warning transition-colors" />
      )}
      {theme === 'dark' && (
        <Moon className="w-5 h-5 theme-text-primary group-hover:text-primary transition-colors" />
      )}
      {theme === 'system' && (
        <Monitor className="w-5 h-5 theme-text-primary group-hover:text-info transition-colors" />
      )}
    </button>
  )
}
