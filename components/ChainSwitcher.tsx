'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChainKey } from '@/lib/gm-utils'

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
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const isBusy = busyChain === selected
  const label = CHAIN_BRAND[selected].title

  const pick = async (c: ChainKey) => {
    setOpen(false)
    onSelect(c)
    if (autoSwitch && ensureChainAsync) await ensureChainAsync(c)
  }

  return (
    <div className={`px-switch ${size}`} ref={ref}>
      <button type="button" className={`px-switch-btn ${isBusy ? 'busy' : ''}`} onClick={() => setOpen((v) => !v)}
        title={label} aria-haspopup="listbox" aria-expanded={open}>
        <ChainIcon chain={selected} size={size === 'sm' ? 12 : 14} />
        <span className="px-switch-label">{label}</span>
        <span className={`px-caret ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-menu px-menu-enter" role="listbox" aria-label="Select chain">
          {(['base','unichain','celo','ink','op'] as ChainKey[]).map((c) => (
            <button key={c} role="option" aria-selected={c === selected}
              className={`px-menu-item ${c === selected ? 'active' : ''}`} onClick={() => pick(c)}>
              <ChainIcon chain={c} size={12} />
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