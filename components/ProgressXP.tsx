'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { CHAIN_LABEL, type ChainKey } from '@/lib/gm-utils'
import { getChainIconUrl } from '@/lib/chain-icons'

export type ProgressXPProps = {
  open: boolean
  onClose: () => void
  chainKey?: ChainKey | string
  xpEarned: number
  totalPoints?: number
  level: number
  xpIntoLevel: number
  xpForLevel: number
  tierName?: string
  tierTagline?: string
  shareUrl?: string
  onShare?: () => void
  visitUrl?: string
  onVisit?: () => void
  shareLabel?: string
  visitLabel?: string
  headline?: string
  eventIcon?: string
  glyph?: string
  badgeLabel?: string
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function formatInt(value: number | undefined): string {
  if (value === undefined || value === null) return '0'
  const safe = Math.round(value)
  return safe.toLocaleString('en-US')
}

export function ProgressXP({
  open,
  onClose,
  chainKey = 'base',
  xpEarned,
  totalPoints,
  level,
  xpIntoLevel,
  xpForLevel,
  tierName,
  tierTagline,
  shareUrl,
  onShare,
  visitUrl,
  onVisit,
  shareLabel = 'Share on Warpcast',
  visitLabel = 'Visit Quest',
  headline,
  eventIcon,
  glyph,
  badgeLabel,
}: ProgressXPProps) {
  // @edit-start 2025-11-11 — Modal accessibility upgrades
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  const handleBackdropMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )
  // @edit-end

  const targetPercent = useMemo(() => {
    if (!xpForLevel || xpForLevel <= 0) return 0
    return Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpForLevel) * 100)))
  }, [xpForLevel, xpIntoLevel])

  const [animatedPercent, setAnimatedPercent] = useState(0)
  const [animatedXp, setAnimatedXp] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(media.matches)
    update()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  useEffect(() => {
    if (!open) {
      setAnimatedPercent(0)
      setAnimatedXp(0)
      return
    }
    if (prefersReducedMotion) {
      setAnimatedPercent(targetPercent)
      setAnimatedXp(Math.round(xpEarned))
      return
    }

    let rafId: number
    const start = performance.now()
    const duration = 900

    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      setAnimatedPercent(targetPercent * progress)
      setAnimatedXp(Math.round(xpEarned * progress))
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      }
    }

    setAnimatedPercent(0)
    setAnimatedXp(0)
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [open, prefersReducedMotion, targetPercent, xpEarned])

  useEffect(() => {
    if (!open) return
    const dialogNode = dialogRef.current
    if (!dialogNode) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusFirstElement = () => {
      const focusable = Array.from(dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('data-focus-guard') && !element.hasAttribute('aria-hidden'),
      )
      if (focusable.length) {
        focusable[0].focus()
        return
      }
      dialogNode.focus()
    }

    focusFirstElement()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('data-focus-guard') && !element.hasAttribute('aria-hidden'),
      )
      if (!focusable.length) {
        event.preventDefault()
        dialogNode.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (activeElement === first || !activeElement) {
          event.preventDefault()
          last.focus()
        }
      } else if (activeElement === last || !activeElement) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [open, onClose])

  const chainLabel = useMemo(() => {
    const key = typeof chainKey === 'string' ? chainKey.toLowerCase() : 'base'
    return CHAIN_LABEL[key as ChainKey] || key.charAt(0).toUpperCase() + key.slice(1)
  }, [chainKey])

  const chainIcon = useMemo(() => {
    if (glyph) return ''
    return getChainIconUrl(typeof chainKey === 'string' ? chainKey : '')
  }, [chainKey, glyph])
  const canShare = Boolean(shareUrl) || Boolean(onShare)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-[#040510]/90 backdrop-blur-md p-6"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600/30 via-purple-500/20 to-transparent" />
      </div>
      <div
        ref={dialogRef}
        className="relative w-full max-w-3xl focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={tierTagline ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="absolute -top-12 right-0 flex gap-2 text-[11px] text-slate-300">
          <button
            ref={closeButtonRef}
            type="button"
            className="px-3 py-1 rounded-full border border-slate-600/60 bg-[#06091a]/80 hover:bg-[#0b0f2a] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="relative overflow-hidden rounded-[28px] border border-slate-700/70 bg-[#050b1c]/95 px-8 py-10 shadow-[0_40px_80px_rgba(12,18,56,0.75)]">
          <div className="absolute inset-0 opacity-40" aria-hidden>
            <div className="absolute -top-32 -left-20 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="absolute top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>
          <div className="relative z-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-500/30 via-purple-500/30 to-amber-400/20 blur-xl" aria-hidden />
                <div className="relative h-full w-full rounded-3xl border border-sky-400/40 bg-[#070f28]/90 shadow-[inset_0_1px_8px_rgba(190,220,255,0.2),0_20px_45px_rgba(8,20,58,0.65)] flex items-center justify-center">
                  {glyph ? (
                    <span className="text-5xl" aria-hidden>{glyph}</span>
                  ) : chainIcon ? (
                    <Image
                      src={chainIcon}
                      alt={`${chainLabel} icon`}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-2xl object-contain drop-shadow-[0_12px_24px_rgba(90,210,255,0.45)] transform transition-transform duration-500 ease-out hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <span className="text-4xl font-black text-sky-200">{chainLabel?.slice(0, 2) ?? 'XP'}</span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.34em] text-slate-300">Chain</div>
                <div className="text-lg font-semibold text-sky-200">{chainLabel}</div>
                {badgeLabel ? <div className="text-[11px] text-slate-400 mt-1">{badgeLabel}</div> : null}
              </div>
            </div>
            <div className="relative flex flex-col gap-6">
              <div>
                <div id={titleId} className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-slate-300">
                  {eventIcon ? <span className="text-xl leading-none" aria-hidden>{eventIcon}</span> : null}
                  <span>{headline || 'XP Boost Unlocked'}</span>
                </div>
                <div className="text-4xl font-black text-white drop-shadow-[0_16px_48px_rgba(5,15,46,0.65)]">
                  Level {level} • {tierName || 'Adventurer'}
                </div>
                {tierTagline ? (
                  <div id={descriptionId} className="mt-1 text-sm text-slate-300">{tierTagline}</div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>Progress to next tier</span>
                  <span>{Math.round(animatedPercent)}%</span>
                </div>
                <div className="relative h-4 overflow-hidden rounded-full border border-sky-300/40 bg-[#08122e]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300 shadow-[0_0_25px_rgba(90,210,255,0.45)]"
                    style={{ width: `${Math.max(8, animatedPercent)}%`, transition: 'width 0.4s ease-out' }}
                  />
                  <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent mix-blend-screen" aria-hidden />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{formatInt(animatedXp)} XP earned</span>
                  <span>
                    {formatInt(xpIntoLevel)} / {formatInt(xpForLevel)} XP
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/70 bg-[#070f25]/70 p-4 text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Current Rank</div>
                  <div className="mt-1 text-lg font-semibold text-sky-200">{tierName || 'Adventurer'}</div>
                </div>
                <div className="rounded-2xl border border-slate-700/70 bg-[#07122d]/70 p-4 text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">XP Earned</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-300">+{formatInt(xpEarned)}</div>
                </div>
                <div className="rounded-2xl border border-slate-700/70 bg-[#0a1535]/70 p-4 text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Total XP</div>
                  <div className="mt-1 text-lg font-semibold text-amber-200">{formatInt(totalPoints)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {canShare ? (
                  <button
                    className="pixel-button flex-1 min-w-[180px] justify-center border border-sky-500/60 bg-gradient-to-r from-sky-500 via-purple-500 to-amber-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#030611] shadow-[0_18px_36px_rgba(90,210,255,0.35)] transition hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    onClick={() => {
                      if (onShare) {
                        onShare()
                        return
                      }
                      if (shareUrl) window.open(shareUrl, '_blank', 'noopener')
                    }}
                  >
                    {shareLabel}
                  </button>
                ) : null}
                {visitUrl ? (
                  <button
                    className="pixel-button flex-1 min-w-[160px] justify-center border border-slate-600/70 bg-[#060b1d] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-[#0b132d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
                    onClick={() => {
                      if (onVisit) onVisit()
                      else window.open(visitUrl, '_blank', 'noopener')
                    }}
                  >
                    {visitLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// @edit-end
