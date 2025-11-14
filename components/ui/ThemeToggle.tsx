'use client'
import { useEffect, useState } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (saved) setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} weight="fill" />
      ) : (
        <Moon size={20} weight="fill" />
      )}
    </button>
  )
}
