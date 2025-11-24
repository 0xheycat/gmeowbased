'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Image from 'next/image'
import { ChainSwitcher, CHAIN_BRAND } from '@/components/ChainSwitcher'
import { RankProgress } from '@/components/ui/RankProgress'
import { VirtualizedBadgeGrid } from '@/components/profile/VirtualizedBadgeGrid'
import { copyToClipboardSafe, openWarpcastComposer } from '@/lib/share'
import { calculateRankProgress, formatXp } from '@/lib/rank'
import type { ChainKey } from '@/lib/gm-utils'
import type { ProfileOverviewData } from '@/lib/profile-types'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'

const CHAIN_LABEL: Record<ChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  op: 'Optimism',
}

const MAX_BADGES_PREVIEW = 12

interface ProfileStatsProps {
  address?: `0x${string}`
  data: ProfileOverviewData | null
  loading: boolean
  error?: string | null
}

function shortAddress(addr?: string | null) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Memoize format functions
const formatNumber = (value: number | null | undefined) => {
  if (!value || Number.isNaN(value)) return '0'
  return value.toLocaleString('en-US')
}

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return '—'
  const now = Date.now()
  const delta = now - timestamp
  if (delta <= 0) return 'Just now'
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 6) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

const formatDateLabel = (timestamp?: number) => {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ProfileStats({ address, data, loading, error }: ProfileStatsProps) {
  const [selectedChain, setSelectedChain] = useState<ChainKey>('base')
  const [isMobile, setIsMobile] = useState(false)
  const pushNotification = useLegacyNotificationAdapter()
  
  // Milestone tracking refs
  const previousLevelRef = useRef<number | null>(null)
  const previousStreakRef = useRef<number | null>(null)
  const previousBadgeCountRef = useRef<number>(0)
  const previousRankRef = useRef<number | null>(null)
  const previousPointsRef = useRef<number>(0)
  const previousGmCountRef = useRef<number>(0)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!data?.chainSummaries?.length) return
    setSelectedChain((prev) => {
      if (data.chainSummaries.some((c) => c.chain === prev)) return prev
      return data.chainSummaries[0].chain
    })
  }, [data?.chainSummaries])

  // Memoize expensive calculations
  const selectedSummary = useMemo(() => {
    if (!data) return undefined
    return data.chainSummaries.find((c) => c.chain === selectedChain)
  }, [data, selectedChain])

  const rankSnapshot = useMemo(() => {
    if (!data?.totalPoints) return null
    return calculateRankProgress(data.totalPoints)
  }, [data])

  const registeredLabel = useMemo(() => {
    if (!data?.registeredChains?.length) return 'No registrations yet'
    return data.registeredChains.map((chain) => CHAIN_LABEL[chain]).join(' • ')
  }, [data?.registeredChains])

  // Memoize badge display
  const badgesToDisplay = useMemo(() => {
    return data?.badges || []
  }, [data?.badges])

  // Memoize breakpoint detection
  const badgeBreakpoint = useMemo(() => {
    if (isMobile) return 'mobile'
    return 'desktop'
  }, [isMobile])

  // Level up detection
  useEffect(() => {
    if (!rankSnapshot || !data) return
    
    const currentLevel = rankSnapshot.level
    const previousLevel = previousLevelRef.current
    
    if (previousLevel !== null && currentLevel > previousLevel) {
      pushNotification({
        type: 'success',
        title: `🎉 Level ${currentLevel} Reached!`,
        message: `You've advanced to Level ${currentLevel}. ${formatXp(rankSnapshot.xpForLevel - rankSnapshot.xpIntoLevel)} XP to next level.`,
        duration: 8000,
        linkHref: '/leaderboard',
        linkLabel: 'View Rank',
        category: 'level',
      })
    }
    
    previousLevelRef.current = currentLevel
  }, [rankSnapshot, data, pushNotification])
  
  // Streak milestone detection
  useEffect(() => {
    if (!data?.streak) return
    
    const MILESTONES = [7, 14, 30, 50, 100, 365]
    const currentStreak = data.streak
    const previousStreak = previousStreakRef.current
    
    if (previousStreak !== null && currentStreak > previousStreak) {
      const milestone = MILESTONES.find(m => currentStreak >= m && previousStreak < m)
      
      if (milestone) {
        pushNotification({
          type: 'success',
          title: `🔥 ${milestone} Day Streak!`,
          message: `Incredible! ${milestone} days of consistent GMing.`,
          duration: 10000,
          category: 'streak',
        })
      }
    }
    
    previousStreakRef.current = currentStreak
  }, [data?.streak, pushNotification])
  
  // Rank improvement detection
  useEffect(() => {
    if (!data?.globalRank) return
    
    const currentRank = data.globalRank
    const previousRank = previousRankRef.current
    
    if (previousRank !== null && currentRank < previousRank) {
      const improvement = previousRank - currentRank
      pushNotification({
        type: 'success',
        title: 'Rank Improved!',
        message: `You climbed ${improvement} ${improvement === 1 ? 'spot' : 'spots'} to #${currentRank}.`,
        duration: 6000,
        linkHref: '/leaderboard',
        linkLabel: 'View Leaderboard',
        category: 'reward',
      })
    }
    
    previousRankRef.current = currentRank
  }, [data?.globalRank, pushNotification])

  // Points milestone detection
  useEffect(() => {
    if (!data?.totalPoints) return
    
    const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]
    const currentPoints = data.totalPoints
    const previousPoints = previousPointsRef.current
    
    if (previousPoints > 0 && currentPoints > previousPoints) {
      const milestone = MILESTONES.find(m => currentPoints >= m && previousPoints < m)
      
      if (milestone) {
        const formatted = milestone >= 1000 ? `${(milestone / 1000).toLocaleString()}K` : milestone.toLocaleString()
        pushNotification({
          type: 'success',
          title: `💎 ${formatted} Points!`,
          message: `Congratulations! You've reached ${formatted} total points.`,
          duration: 10000,
          linkHref: '/leaderboard',
          linkLabel: 'View Rank',
          category: 'reward',
        })
      }
    }
    
    previousPointsRef.current = currentPoints
  }, [data?.totalPoints, pushNotification])

  // GM count milestone detection (using estimatedGMs)
  useEffect(() => {
    if (!data?.estimatedGMs) return
    
    const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
    const currentGms = data.estimatedGMs
    const previousGms = previousGmCountRef.current
    
    if (previousGms > 0 && currentGms > previousGms) {
      const milestone = MILESTONES.find(m => currentGms >= m && previousGms < m)
      
      if (milestone) {
        pushNotification({
          type: 'success',
          title: `🌅 ${milestone.toLocaleString()} GMs!`,
          message: `Amazing! You've said GM ${milestone.toLocaleString()} times.`,
          duration: 10000,
          category: 'quest',
        })
      }
    }
    
    previousGmCountRef.current = currentGms
  }, [data?.estimatedGMs, pushNotification])

  // Badge rarity milestone detection
  useEffect(() => {
    if (!data?.badges) return
    
    const currentCount = data.badges.length
    const previousCount = previousBadgeCountRef.current
    
    // First badge
    if (previousCount === 0 && currentCount === 1) {
      pushNotification({
        type: 'success',
        title: '🎖️ First Badge!',
        message: 'You earned your first badge! Keep collecting.',
        duration: 8000,
        category: 'badge',
      })
    }
    
    // Badge collection milestones
    const MILESTONES = [5, 10, 25, 50, 100]
    if (previousCount > 0 && currentCount > previousCount) {
      const milestone = MILESTONES.find(m => currentCount >= m && previousCount < m)
      
      if (milestone) {
        pushNotification({
          type: 'success',
          title: `🎖️ ${milestone} Badges Collected!`,
          message: `Impressive collection! You now have ${milestone} badges.`,
          duration: 10000,
          category: 'badge',
        })
      } else {
        // New badge notification (only if not a milestone)
        const newBadges = currentCount - previousCount
        pushNotification({
          type: 'success',
          title: `New Badge${newBadges > 1 ? 's' : ''}!`,
          message: `You earned ${newBadges} new badge${newBadges > 1 ? 's' : ''}.`,
          duration: 6000,
          category: 'badge',
        })
      }
    }
    
    previousBadgeCountRef.current = currentCount
  }, [data?.badges, pushNotification])

  const handleShareFrame = async () => {
    if (!data?.frameUrl) {
      pushNotification({ type: 'error', title: 'No frame available', message: 'Connect wallet or refresh to generate your points frame.' })
      return
    }
    const shareText = rankSnapshot
      ? `${data.displayName} reached Level ${rankSnapshot.level} (${formatXp(rankSnapshot.xpIntoLevel)} / ${formatXp(rankSnapshot.xpForLevel)} XP) on GMEOW.`
      : `${data.displayName} has ${formatNumber(data.totalPoints)} GM points on GMEOW.`
    try {
      const mode = await openWarpcastComposer(shareText, data.frameUrl)
      pushNotification({ type: 'success', title: mode === 'miniapp' ? 'Shared in-app' : 'Opened composer', message: 'Your profile frame is ready to cast.' })
    } catch (err: any) {
      pushNotification({ type: 'error', title: 'Share failed', message: err?.message || 'Unable to open Warpcast composer.' })
    }
  }

  const handleCopyFrame = async () => {
    if (!data?.frameUrl) {
      pushNotification({ type: 'error', title: 'No frame link', message: 'Refresh your profile to regenerate the frame URL.' })
      return
    }
    const ok = await copyToClipboardSafe(data.frameUrl)
    pushNotification({ type: ok ? 'success' : 'error', title: ok ? 'Copied frame link' : 'Copy failed', message: ok ? 'Frame URL copied to clipboard.' : 'Clipboard is unavailable in this context.' })
  }

  const showConnectCard = !address && !loading
  const showEmptyState = Boolean(address && !loading && !data && !error)
  const headlineName = data?.displayName || 'Your profile'
  const avatarUrl = data?.pfpUrl

  return (
    <div className="relative profile-surface flex w-full min-w-0 flex-col gap-6 sm:gap-7 lg:gap-8">
      {error ? (
        <div className="pixel-card w-full border border-red-500/50 bg-red-950/40 text-red-200">
          <h3 className="pixel-section-title">Profile load error</h3>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="pixel-card w-full animate-pulse">
          <div className="profile-skeleton-bar mb-4" />
          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="profile-skeleton-tile h-24" />
            ))}
          </div>
        </div>
      ) : null}

      {showConnectCard ? (
        <div className="pixel-card w-full">
          <h2 className="pixel-section-title">Connect your wallet</h2>
          <p className="text-sm text-[var(--px-sub)]">Link a wallet to view your multi-chain GM stats, referrals, and badges.</p>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="pixel-card w-full">
          <h2 className="pixel-section-title">No profile data yet</h2>
          <p className="text-base text-[var(--px-sub)]">We couldn&apos;t find on-chain activity for this wallet yet. Try sending a GM or joining a guild.</p>
        </div>
      ) : null}

      {data ? (
        <div className="grid w-full gap-6">
          <section className="pixel-card w-full">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="profile-avatar-frame w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={headlineName}
                      width={96}
                      height={96}
                      className="h-full w-full object-cover pixelated"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xl sm:text-2xl font-bold text-[var(--px-sub)]">
                      {headlineName?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="profile-headline text-2xl font-extrabold leading-tight">
                    {headlineName}
                  </h1>
                  {data.username ? (
                    <p className="mt-1 text-sm text-[var(--px-sub)]">@{data.username}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--px-sub)]">
                    {data.fid ? <span className="pixel-pill">FID {data.fid}</span> : null}
                    <span className="pixel-pill">{shortAddress(data.address)}</span>
                    {data.team ? <span className="pixel-pill">Guild #{data.team.teamId}</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button 
                      className="btn-primary min-h-[44px] px-4 py-2.5 text-sm sm:text-base" 
                      onClick={handleShareFrame} 
                      disabled={!data.frameUrl}
                    >
                      Share points frame
                    </button>
                    <button 
                      className="btn-secondary min-h-[44px] px-4 py-2.5 text-sm sm:text-base" 
                      onClick={handleCopyFrame} 
                      disabled={!data.frameUrl}
                    >
                      Copy frame link
                    </button>
                  </div>
                  {data.farcasterUser?.neynarScore != null ? (
                    <p className="mt-3 text-xs text-[var(--px-sub)]">Neynar score: {data.farcasterUser.neynarScore.toFixed(2)}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid flex-1 gap-2 sm:gap-3 sm:grid-cols-2">
                <MetricCard title="Total points" value={formatNumber(data.totalPoints)} hint="Lifetime earned across chains" />
                <MetricCard title="Estimated GMs" value={formatNumber(data.estimatedGMs)} hint="Based on per-chain GM reward" />
                <MetricCard title="Best streak" value={formatNumber(data.streak)} hint="Across all chains" />
                <MetricCard title="Global rank" value={data.globalRank ? `#${formatNumber(data.globalRank)}` : '—'} hint="Current leaderboard snapshot" />
                <RankProgress points={data.totalPoints} className="sm:col-span-2" variant="subtle" />
              </div>
            </div>
          </section>

          <section className="pixel-card w-full">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="pixel-section-title">Chain breakdown</h2>
              {data.chainSummaries.length ? (
                <ChainSwitcher selected={selectedChain} onSelect={setSelectedChain} size="sm" />
              ) : null}
            </div>

            {selectedSummary ? (
              <div className="profile-focus-card mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="pixel-pill flex items-center gap-2 text-xs">
                    <span>{CHAIN_BRAND[selectedSummary.chain].title}</span>
                    <span className="text-[var(--px-sub)]">Chain focus</span>
                  </span>
                  <span className="text-xs text-[var(--px-sub)]">
                    Last GM {formatRelativeTime(selectedSummary.lastGM)} • streak {formatNumber(selectedSummary.streak)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <StatRow label="Total points" value={`${formatNumber(selectedSummary.totalPoints)}`} />
                  <StatRow label="Available / locked" value={`${formatNumber(selectedSummary.availablePoints)} / ${formatNumber(selectedSummary.lockedPoints)}`} />
                  <StatRow label="Registered" value={selectedSummary.registered ? 'Yes' : 'No'} />
                  <StatRow label="Last GM timestamp" value={formatDateLabel(selectedSummary.lastGM)} />
                </div>
              </div>
            ) : null}

            {isMobile ? (
              <div className="grid gap-3">
                {data.chainSummaries.map((summary) => (
                  <div key={summary.chain} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{CHAIN_BRAND[summary.chain].title}</span>
                      <span className="pixel-pill text-[10px]">{summary.registered ? 'Registered' : 'Not registered'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[var(--px-sub)]">Points</div>
                        <div className="font-semibold mt-0.5">{formatNumber(summary.totalPoints)}</div>
                      </div>
                      <div>
                        <div className="text-[var(--px-sub)]">Streak</div>
                        <div className="font-semibold mt-0.5">{formatNumber(summary.streak)}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[var(--px-sub)]">Last GM</div>
                        <div className="font-semibold mt-0.5">{formatRelativeTime(summary.lastGM)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-[var(--px-sub)]">
                      <th className="px-3 py-2">Chain</th>
                      <th className="px-3 py-2 text-right">Points</th>
                      <th className="px-3 py-2 text-right">Streak</th>
                      <th className="px-3 py-2 text-right">Registered</th>
                      <th className="px-3 py-2 text-right">Last GM</th>
                    </tr>
                  </thead>
                  <tbody className="profile-table-body">
                    {data.chainSummaries.map((summary) => (
                      <tr key={summary.chain} className="profile-table-row">
                        <td className="px-3 py-2 font-semibold">{CHAIN_BRAND[summary.chain].title}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(summary.totalPoints)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(summary.streak)}</td>
                        <td className="px-3 py-2 text-right">{summary.registered ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 text-right text-xs text-[var(--px-sub)]">{formatRelativeTime(summary.lastGM)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pixel-card w-full">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="pixel-section-title">Identity & referrals</h2>
              <span className="pixel-pill text-[10px]">{registeredLabel}</span>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--px-sub)]">Wallet</span>
                <span className="font-semibold">{shortAddress(data.address)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--px-sub)]">Referrer</span>
                <span className="font-semibold">{shortAddress(data.referrer)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[var(--px-sub)]">Last GM</span>
                <span className="font-semibold">{formatRelativeTime(data.lastGM)}</span>
              </div>
            </div>
          </section>

          {data.team ? (
            <section className="pixel-card w-full">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="pixel-section-title">Guild</h2>
                <span className="pixel-pill text-[10px]">{CHAIN_LABEL[data.team.chain]}</span>
              </div>
              <div className="text-sm font-semibold">{data.team.name}</div>
              <div className="mt-1 text-xs text-[var(--px-sub)]">
                Team #{data.team.teamId} • {formatNumber(data.team.memberCount)} members
              </div>
              <div className="mt-1 text-xs text-[var(--px-sub)]">Founder {shortAddress(data.team.founder)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  className="btn-secondary btn-sm"
                  href={`/team/${data.team.chain}/${data.team.teamId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open team page
                </a>
              </div>
            </section>
          ) : null}

          {badgesToDisplay.length ? (
            <section className="pixel-card w-full">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="pixel-section-title">Badges</h2>
                <span className="pixel-pill text-[10px]">{badgesToDisplay.length}</span>
              </div>
              <VirtualizedBadgeGrid 
                badges={badgesToDisplay}
                maxPreview={MAX_BADGES_PREVIEW}
                breakpoint={badgeBreakpoint as 'mobile' | 'tablet' | 'desktop'}
              />
              {badgesToDisplay.length > MAX_BADGES_PREVIEW ? (
                <p className="mt-3 text-xs text-[var(--px-sub)]">Showing first {MAX_BADGES_PREVIEW} badges.</p>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="profile-metric-card">
      <div className="profile-metric-title">{title}</div>
      <div className="profile-metric-value">
        {value}
      </div>
      {hint ? <div className="profile-metric-hint">{hint}</div> : null}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-stat-row">
      <span className="profile-stat-label">{label}</span>
      <span className="profile-stat-value">{value}</span>
    </div>
  )
}
