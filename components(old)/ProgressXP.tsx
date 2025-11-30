'use client'

/**
 * ProgressXP - XP Celebration Modal
 * Mobile-first design with Tailwick v2.0 patterns
 * Reuses accessibility & animation logic from old foundation
 * Uses Gmeowbased v0.1 icons and modern UI/UX
 * 
 * Features:
 * - Mobile-optimized layout (portrait + landscape)
 * - Smooth animations with prefers-reduced-motion support
 * - Keyboard navigation & focus trap
 * - Screen reader friendly
 * - Rich typography from 5 template references
 * - Chain-specific badge display
 */

import Image from 'next/image'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { CHAIN_LABEL, type ChainKey } from '@/lib/gmeow-utils'
import { getChainIconUrl } from '@/lib/chain-icons'
import { Card, CardHeader, CardBody, Button, Badge } from 'components(old)/ui/tailwick-primitives'
import { QuestIcon, type QuestIconType } from 'components(old)/ui/QuestIcon'

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
  visitUrl?: string | null  // null = hide visit button
  onVisit?: () => void
  shareLabel?: string
  visitLabel?: string
  headline?: string
  eventIconType?: QuestIconType  // Changed from eventIcon emoji to QuestIconType
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
  eventIconType,  // Changed from eventIcon emoji
  glyph,
  badgeLabel,
}: ProgressXPProps) {
  // Accessibility - modal focus management
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

  // Progress bar animation
  const targetPercent = useMemo(() => {
    if (!xpForLevel || xpForLevel <= 0) return 0
    return Math.min(100, Math.max(0, Math.round((xpIntoLevel / xpForLevel) * 100)))
  }, [xpForLevel, xpIntoLevel])

  const [animatedPercent, setAnimatedPercent] = useState(0)
  const [animatedXp, setAnimatedXp] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Detect reduced motion preference
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

  // Animate progress bar and XP counter
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

  // Focus trap & keyboard navigation
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Animated background - subtle */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-cyan-600/10" />
      </div>

      <div
        ref={dialogRef}
        className="relative w-full max-w-lg focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={tierTagline ? descriptionId : undefined}
        tabIndex={-1}
      >
        {/* Close button */}
        <div className="absolute -top-12 right-0 z-10">
          <button
            ref={closeButtonRef}
            type="button"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <Card className="overflow-hidden border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20">
          <CardBody className="p-0">
            {/* Header with event icon & headline */}
            <div className="bg-gradient-to-r from-purple-600 to-cyan-600 p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {eventIconType && (
                  <div className="animate-bounce" aria-hidden style={{ animationDuration: '2s' }}>
                    <QuestIcon type={eventIconType} size={48} className="drop-shadow-lg" />
                  </div>
                )}
                <h2 id={titleId} className="text-2xl sm:text-3xl font-bold text-white">
                  {headline || 'XP Earned!'}
                </h2>
              </div>
              <div className="text-5xl sm:text-6xl font-black text-white mt-4">
                +{formatInt(animatedXp)} XP
              </div>
            </div>

            {/* Main content */}
            <div className="p-6 space-y-6">
              {/* Chain Badge & Level */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {glyph ? (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500">
                      <span className="text-2xl font-bold">{glyph}</span>
                    </div>
                  ) : chainIcon ? (
                    <div className="relative w-12 h-12">
                      <Image src={chainIcon} alt={chainLabel} width={48} height={48} className="rounded-full" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500">
                      <span className="text-xl font-bold text-white">{chainLabel?.slice(0, 2) ?? 'XP'}</span>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Chain</div>
                    <div className="text-lg font-bold theme-text-primary">{chainLabel}</div>
                    {badgeLabel && <div className="text-xs text-slate-500">{badgeLabel}</div>}
                  </div>
                </div>

                <div>
                  <Badge variant="primary" size="md" className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Level</span>
                      <span className="text-2xl font-black">{level}</span>
                    </div>
                  </Badge>
                </div>
              </div>

              {/* Tier & Rank */}
              <div className="text-center py-4 px-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
                <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">Current Tier</div>
                <div className="text-2xl font-bold theme-text-primary">{tierName || 'Adventurer'}</div>
                {tierTagline && (
                  <div id={descriptionId} className="text-sm text-slate-500 mt-2">
                    {tierTagline}
                  </div>
                )}
              </div>

              {/* XP Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Progress to Next Level</span>
                  <span className="font-bold theme-text-primary">{Math.round(animatedPercent)}%</span>
                </div>
                
                <div className="relative h-4 overflow-hidden rounded-full bg-slate-800 border border-slate-700">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(4, animatedPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{formatInt(xpIntoLevel)} XP</span>
                  <span>{formatInt(xpForLevel)} XP</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center py-3 px-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">XP Earned</div>
                  <div className="text-lg font-bold text-emerald-400">+{formatInt(xpEarned)}</div>
                </div>
                <div className="text-center py-3 px-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Points</div>
                  <div className="text-lg font-bold theme-text-primary">{formatInt(totalPoints || 0)}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {canShare && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      if (onShare) {
                        onShare()
                        return
                      }
                      if (shareUrl) window.open(shareUrl, '_blank', 'noopener')
                    }}
                  >
                    {shareLabel}
                  </Button>
                )}
                {visitUrl && (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={() => {
                      if (onVisit) onVisit()
                      else window.open(visitUrl, '_blank', 'noopener')
                    }}
                  >
                    {visitLabel}
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
