'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import type { ChainKey } from '@/lib/gm-utils'
import { ICON_SIZES } from '@/lib/icon-sizes'

export const CHAIN_BRAND: Record<ChainKey, { bg: string; fg: string; label: string; title: string }> = {
  base: { bg: '#0052ff', fg: '#ffffff', label: 'B', title: 'Base' },
  unichain: { bg: '#8247e5', fg: '#ffffff', label: 'U', title: 'Unichain' },
  celo: { bg: '#35d07f', fg: '#0a0a0a', label: 'C', title: 'Celo' },
  ink: { bg: '#111111', fg: '#ffffff', label: 'I', title: 'Ink' },
  op: { bg: '#ff0420', fg: '#ffffff', label: 'OP', title: 'Optimism' },
} as const

export function ChainIcon({ chain, size = 14, rounded = true }: { chain: ChainKey; size?: number; rounded?: boolean }) {
  const b = CHAIN_BRAND[chain]
  const r = rounded ? size : 3
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label={b.title} role="img" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="2" y="2" width="20" height="20" rx={r} ry={r} fill={b.bg} />
      <text x="12" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill={b.fg}
        className="site-font">
        {b.label}
      </text>
    </svg>
  )
}

export function ChainSwitcher({
  selected,
  onSelect,
  busyChain,
  size = 'md',
  autoSwitch = false,
  ensureChainAsync,
}: {
  selected: ChainKey
  onSelect: (c: ChainKey) => void | Promise<void>
  busyChain?: ChainKey | null
  size?: 'sm' | 'md'
  autoSwitch?: boolean
  ensureChainAsync?: (c: ChainKey) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const announcementRef = useRef<HTMLDivElement>(null)

  // Static chains array to avoid dependency issues
  const chains = useMemo<ChainKey[]>(() => ['base', 'unichain', 'celo', 'ink', 'op'], [])

  // Screen reader announcements
  const announce = useCallback((message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message
      setTimeout(() => {
        if (announcementRef.current) announcementRef.current.textContent = ''
      }, 1000)
    }
  }, [])

  const pick = useCallback(async (c: ChainKey) => {
    setOpen(false)
    announce(`${CHAIN_BRAND[c].title} selected`)
    onSelect(c)
    if (autoSwitch && ensureChainAsync) await ensureChainAsync(c)
    buttonRef.current?.focus()
  }, [announce, onSelect, autoSwitch, ensureChainAsync])

  // Close dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

    // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % chains.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + chains.length) % chains.length)
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(chains.length - 1)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          pick(chains[focusedIndex])
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          buttonRef.current?.focus()
          announce('Dropdown closed')
          break
        case 'Tab':
          setOpen(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, focusedIndex, chains, pick, announce])

  // Reset focused index when opening
  useEffect(() => {
    if (open) {
      const currentIndex = chains.indexOf(selected)
      setFocusedIndex(currentIndex !== -1 ? currentIndex : 0)
      announce('Chain selector opened. Use arrow keys to navigate.')
    }
  }, [open, selected, chains, announce])

  const isBusy = busyChain === selected
  const label = CHAIN_BRAND[selected].title

  return (
    <div className={`px-switch ${size}`} ref={ref}>
      {/* Screen reader live region */}
      <div
        ref={announcementRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      <button type="button" ref={buttonRef} className={`px-switch-btn ${isBusy ? 'busy' : ''}`} onClick={() => setOpen((v) => !v)}
        title={label} aria-haspopup="listbox" aria-expanded={open}>
        <ChainIcon chain={selected} size={size === 'sm' ? 12 : 14} />
        <span className="px-switch-label">{label}</span>
        <span className={`px-caret ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-menu px-menu-enter" role="listbox" aria-label="Select chain">
          {chains.map((c, index) => (
            <button key={c} role="option" aria-selected={c === selected}
              data-chain-index={index}
              className={`px-menu-item ${c === selected ? 'active' : ''} ${index === focusedIndex ? 'focused' : ''}`}
              onClick={() => pick(c)}>
              <ChainIcon chain={c} size={ICON_SIZES.xs} />
              <span className="px-item-label">{CHAIN_BRAND[c].title}</span>
              {c === selected ? <span className="px-check">✓</span> : null}
            </button>
          ))}
        </div>
      )}

      {/* detail: styling lives in app/styles.css → CHAIN SWITCHER DROPDOWN */}
    </div>
  )
}