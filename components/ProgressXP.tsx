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
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      style={{
        background: 'radial-gradient(ellipse at center, rgba(14, 20, 46, 0.95) 0%, rgba(4, 5, 16, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Animated background effects - Yu-Gi-Oh inspired */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(168,85,247,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(251,191,36,0.08),transparent_50%)]" />
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-sky-400/40 animate-pulse" />
        <div className="absolute top-2/3 right-1/3 h-1.5 w-1.5 rounded-full bg-purple-400/30 animate-pulse delay-300" />
        <div className="absolute bottom-1/3 left-2/3 h-2.5 w-2.5 rounded-full bg-amber-400/25 animate-pulse delay-700" />
      </div>
      <div
        ref={dialogRef}
        className="relative w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={tierTagline ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="absolute -top-12 right-0 flex gap-2 text-[11px] text-[#ffd700]/70">
          <button
            ref={closeButtonRef}
            type="button"
            className="px-3 py-2 min-h-[44px] rounded-full border-2 border-[#ffd700]/30 bg-[#06091a]/90 hover:bg-[#0b0f2a] hover:border-[#ffd700]/50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd700]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="relative overflow-hidden rounded-[32px] border shadow-[0_0_80px_rgba(14,165,233,0.3),0_0_40px_rgba(168,85,247,0.2)]"
          style={{
            borderColor: 'rgba(148, 163, 184, 0.3)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.92) 50%, rgba(15, 23, 42, 0.95) 100%)',
            backdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          {/* Glass morphism layers - Yu-Gi-Oh card inspired */}
          <div className="absolute inset-0 opacity-60" aria-hidden>
            {/* Holographic shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 via-transparent to-purple-500/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(14,165,233,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.12),transparent_50%)]" />
            {/* Animated shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shine" 
              style={{ animationDuration: '3s', animationIterationCount: 'infinite' }} />
          </div>
          
          {/* Content area with additional glass layer */}
          <div className="relative px-8 py-10 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
            }}
          >
          <div className="relative z-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32">
                {/* Holographic glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400/40 via-purple-400/30 to-amber-400/20 blur-2xl animate-pulse" aria-hidden />
                <div className="absolute inset-0 rounded-full border-2 border-sky-400/20 animate-spin-slow" aria-hidden 
                  style={{ animationDuration: '8s' }} />
                
                {/* Main badge container with glass effect */}
                <div className="relative h-full w-full rounded-full border-2 shadow-[inset_0_2px_12px_rgba(255,255,255,0.1),0_8px_32px_rgba(14,165,233,0.4)]"
                  style={{
                    borderColor: 'rgba(56, 189, 248, 0.5)',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-500/10 via-transparent to-purple-500/10" aria-hidden />
                  <div className="flex h-full w-full items-center justify-center">
                  {glyph ? (
                    <span className="text-3xl sm:text-4xl font-black text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">{glyph}</span>
                  ) : chainIcon ? (
                    <Image src={chainIcon} alt={chainLabel} width={48} height={48} className="drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-black text-[#ffd700] drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">{chainLabel?.slice(0, 2) ?? 'XP'}</span>
                  )}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.36em] text-[#ffd700]/60">Chain</div>
                <div className="text-xl font-bold text-[#ffd700] drop-shadow-[0_2px_12px_rgba(255,215,0,0.6)]">{ chainLabel}</div>
                {badgeLabel ? <div className="text-[11px] text-[#ffd700]/50 mt-1">{badgeLabel}</div> : null}
              </div>
            </div>
            <div className="relative flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.25em] text-[#ffd700]/80">
                  {eventIcon ? <span className="text-xl sm:text-2xl leading-none animate-pulse" aria-hidden style={{animationDuration: '2s'}}>{eventIcon}</span> : null}
                  <span className="drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">{headline || 'XP Boost Unlocked'}</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-[#ffd700] drop-shadow-[0_0_30px_rgba(255,215,0,0.8),0_4px_20px_rgba(0,0,0,0.9)]" style={{textShadow: '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.9)'}}>
                  Level {level} • {tierName || 'Adventurer'}
                </div>
                {tierTagline ? (
                  <div id={descriptionId} className="mt-1 text-sm text-slate-300">{tierTagline}</div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#ffd700]/70">
                  <span>Progress to next tier</span>
                  <span className="font-bold text-[#ffd700]">{Math.round(animatedPercent)}%</span>
                </div>
                <div className="relative h-3 sm:h-4 overflow-hidden rounded-full border-2 border-[#ffd700]/30 bg-[#08122e] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffd700] shadow-[0_0_30px_rgba(255,215,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.5)]"
                    style={{ width: `${Math.max(8, animatedPercent)}%`, transition: 'width 0.4s ease-out' }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-[#ffd700]/30 via-transparent to-transparent mix-blend-screen animate-pulse" aria-hidden style={{animationDuration: '2s'}} />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] animate-[shimmer_2s_ease-in-out_infinite]" aria-hidden />
                </div>
                <div className="flex items-center justify-between text-xs text-[#ffd700]/80 font-semibold">
                  <span className="drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">{formatInt(animatedXp)} XP earned</span>
                  <span className="text-[#ffd700]">
                    {formatInt(xpIntoLevel)} / {formatInt(xpForLevel)} XP
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border-2 border-[#ffd700]/25 bg-[#070f25]/80 p-4 text-center shadow-[0_4px_16px_rgba(255,215,0,0.15)]">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#ffd700]/50">Current Rank</div>
                  <div className="mt-1 text-lg font-semibold text-[#ffd700]">{tierName || 'Adventurer'}</div>
                </div>
                <div className="rounded-2xl border border-slate-700/70 bg-[#07122d]/70 p-4 text-center">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">XP Earned</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-300">+{formatInt(xpEarned)}</div>
                </div>
                <div className="rounded-2xl border-2 border-[#ffd700]/25 bg-[#070f25]/80 p-4 text-center shadow-[0_4px_16px_rgba(255,215,0,0.15)]">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#ffd700]/50">Total Points</div>
                  <div className="mt-1 text-lg font-semibold text-[#ffd700]">{formatInt(totalPoints || 0)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {canShare ? (
                  <button
                    className="pixel-button flex-1 min-w-[140px] sm:min-w-[180px] justify-center border-2 border-[#ffd700]/60 bg-gradient-to-r from-[#ffd700]/30 via-[#ffed4e]/20 to-[#ffd700]/30 px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd700] shadow-[0_8px_32px_rgba(255,215,0,0.4),0_0_40px_rgba(255,215,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)] transition hover:scale-[1.02] hover:shadow-[0_12px_48px_rgba(255,215,0,0.6),0_0_60px_rgba(255,215,0,0.3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd700]"
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
                    className="pixel-button flex-1 min-w-[120px] sm:min-w-[160px] justify-center border-2 border-[#ffd700]/30 bg-[#060b1d] px-3 sm:px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd700]/80 transition hover:bg-[#0b132d] hover:border-[#ffd700]/50 hover:text-[#ffd700] hover:shadow-[0_4px_16px_rgba(255,215,0,0.3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd700]"
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
    </div>
  )
}
// @edit-end
