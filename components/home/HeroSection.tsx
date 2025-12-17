'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TimeEmoji } from '@/components/TimeEmoji'
import { useAnimatedCount } from '@/hooks/useAnimatedCount'
import type { HeroUser } from './types'
import { formatNumber } from '@/lib/formatters'
import { formatTimeUntilNextGM } from '@/lib/gmeow-utils'

const POWER_USER_HANDLES = new Set(['vbuterin', 'dwr', 'punk6529', 'far'])

type HeroSectionProps = {
  user: HeroUser
  statsLoading: boolean
  onRevealStats: () => void
  onReplayIntro: () => void
}

export function HeroSection({ user, statsLoading, onRevealStats, onReplayIntro }: HeroSectionProps) {
  const isPowerUser = Boolean(user.powerBadge) || (user.username ? POWER_USER_HANDLES.has(user.username.toLowerCase()) : false)
  const primaryCtaLabel = user.fid ? 'Resume Command' : 'Initiate GM Sequence'
  const [gmCountdown, setGmCountdown] = useState<string | null>(null)

  useEffect(() => {
    if (user.canGM) {
      setGmCountdown('Ready to GM')
      return
    }
    if (!user.lastGMTimestamp) {
      setGmCountdown(null)
      return
    }
    const update = () => setGmCountdown(formatTimeUntilNextGM(user.lastGMTimestamp!))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [user.lastGMTimestamp, user.canGM])

  const missionTicker = useMemo(() => {
    const pointsValue = user.points ?? 14200
    const streakValue = user.streak ?? 0
    const totalGmsValue = user.totalGMs ?? 2341
    const longestValue = user.longestStreak ?? 42
    return [
      {
        key: 'points',
        label: 'Gmeow Points Vault',
        value: `${formatNumber(pointsValue)} XP`,
        detail: pointsValue > 18000 ? 'Command vault primed' : 'Keep stacking multipliers',
        accent: 'accent-emerald',
      },
      {
        key: 'streak',
        label: 'GM Streak',
        value: streakValue > 0 ? `${streakValue}-day run` : 'Boot sequence',
        detail: gmCountdown ? gmCountdown : 'Log a GM to ignite',
        accent: 'accent-amber',
      },
      {
        key: 'total',
        label: 'GMs Logged',
        value: formatNumber(totalGmsValue),
        detail: `Longest ${longestValue || 42}-day arc`,
        accent: 'accent-indigo',
      },
    ]
  }, [user.points, user.streak, user.totalGMs, user.longestStreak, gmCountdown])

  const momentumSeries = useMemo(() => {
    const normalize = (value: number, max: number) => Math.max(18, Math.min(100, Math.round((value / max) * 100)))
    const xpValue = user.points ?? 14200
    const questClears = user.totalGMs ?? 2341
    const streakValue = user.streak ?? 0
    const guildBoost = user.powerBadge ? 92 : 64
    return [
      {
        key: 'xp',
        label: 'XP Vault',
        stat: `${formatNumber(xpValue)} XP`,
        percent: normalize(xpValue, 24000),
      },
      {
        key: 'quests',
        label: 'Quest Clears',
        stat: `${formatNumber(questClears)}`,
        percent: normalize(questClears, 4800),
      },
      {
        key: 'streak',
        label: 'Streak Sync',
        stat: streakValue > 0 ? `${streakValue} day streak` : 'Ignite today',
        percent: normalize(streakValue || 6, 28),
      },
      {
        key: 'boost',
        label: 'Guild Boost',
        stat: user.powerBadge ? 'x2.1 power badge' : 'x1.6 squad boost',
        percent: guildBoost,
      },
    ] as MomentumSlice[]
  }, [user.points, user.totalGMs, user.streak, user.powerBadge])

  return (
    <section className={`retro-hero ${isPowerUser ? 'is-power' : ''}`}>
      <div className="retro-hero-bg" aria-hidden />
      <div className="retro-hero-inner">
        <div className="retro-hero-copy">
          <span className="retro-hero-eyebrow">
            <TimeEmoji className="retro-hero-emoji" /> Command Update
          </span>
          <h1 className="retro-hero-title">
            {user.username ? `Welcome back, ${user.username}` : 'Launch your GM flight deck'}
          </h1>
          <p className="retro-hero-subtitle">
            {user.fid
              ? 'Sync your streak, rally the guild, and broadcast daily frames straight from the Gmeow command deck.'
              : 'Spin up the GMEOW ritual, earn Paw Points, and unlock onchain rewards without leaving Warpcast.'}
          </p>
          <div className="retro-hero-actions">
            <button type="button" className="retro-btn retro-btn-primary" onClick={onRevealStats} disabled={statsLoading}>
              {statsLoading ? 'Fetching telemetry…' : primaryCtaLabel}
            </button>
            {user.fid ? (
              <Link className="retro-btn retro-btn-secondary" href="/guild">
                Join a Guild Run
              </Link>
            ) : null}
            <button type="button" className="retro-btn retro-btn-ghost" onClick={onReplayIntro}>
              Replay Intro Cinema
            </button>
          </div>
          <div className="retro-hero-ticker">
            {missionTicker.map((item) => (
              <div key={item.key} className={`ticker-card ${item.accent}`}>
                <span className="ticker-label">{item.label}</span>
                <span className="ticker-value">{item.value}</span>
                <span className="ticker-detail">{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="retro-hero-panels">
          <div className="retro-hero-image">
            <div className="retro-hero-image-glow" aria-hidden />
            <Image
              src="/logo.png"
              alt="GMEOW Mascot"
              width={360}
              height={360}
              priority
              sizes="(max-width: 468px) 220px, 320px"
              style={{ objectFit: 'contain', objectPosition: 'right center', width: '85%', height: '85%' }}
            />
          </div>
          <div className="retro-hero-chart">
            <header className="retro-hero-chart-head">
              <span className="chart-badge">Momentum</span>
              <span className="chart-meta">Live telemetry</span>
            </header>
            <div className="retro-hero-chart-bars">
              {momentumSeries.map((slice, index) => (
                <MomentumBar key={slice.key} slice={slice} index={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

type MomentumSlice = {
  key: string
  label: string
  stat: string
  percent: number
}

function MomentumBar({ slice, index }: { slice: MomentumSlice; index: number }) {
  const numericPrefixMatch = useMemo(() => slice.stat.match(/^(\d[\d,]*)/), [slice.stat])
  const numericValue = useMemo(() => {
    if (!numericPrefixMatch) return null
    return Number.parseInt(numericPrefixMatch[0].replace(/,/g, ''), 10)
  }, [numericPrefixMatch])

  const animatedValue = useAnimatedCount(Number.isFinite(numericValue ?? NaN) ? numericValue ?? 0 : 0)

  const displayValue = useMemo(() => {
    if (numericValue == null) return slice.stat
    const suffix = slice.stat.slice(numericPrefixMatch?.[0].length ?? 0)
    return `${animatedValue}${suffix}`
  }, [animatedValue, numericPrefixMatch, numericValue, slice.stat])

  return (
    <div className="retro-hero-chart-bar">
      <div
        className="retro-hero-chart-bar-fill"
        style={{ '--bar-height': `${slice.percent}%` } as CSSProperties}
        data-index={index}
      />
      <span className="retro-hero-chart-value">{displayValue}</span>
      <span className="retro-hero-chart-label">{slice.label}</span>
    </div>
  )
}
