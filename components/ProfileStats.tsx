'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ChainSwitcher, CHAIN_BRAND } from '@/components/ChainSwitcher'
import { RankProgress } from '@/components/ui/RankProgress'
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

function formatNumber(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return '0'
  return value.toLocaleString('en-US')
}

function formatRelativeTime(timestamp?: number) {
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

function formatDateLabel(timestamp?: number) {
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
  const pushNotification = useLegacyNotificationAdapter()

  useEffect(() => {
    if (!data?.chainSummaries?.length) return
    setSelectedChain((prev) => {
      if (data.chainSummaries.some((c) => c.chain === prev)) return prev
      return data.chainSummaries[0].chain
    })
  }, [data?.chainSummaries])

  const selectedSummary = useMemo(() => {
    if (!data) return undefined
    return data.chainSummaries.find((c) => c.chain === selectedChain)
  }, [data, selectedChain])

  const rankSnapshot = useMemo(() => {
    if (!data) return null
    return calculateRankProgress(data.totalPoints)
  }, [data])

  const registeredLabel = useMemo(() => {
    if (!data?.registeredChains?.length) return 'No registrations yet'
    return data.registeredChains.map((chain) => CHAIN_LABEL[chain]).join(' • ')
  }, [data?.registeredChains])

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-sm text-[var(--px-sub)]">We couldn’t find on-chain activity for this wallet yet. Try sending a GM or joining a guild.</p>
        </div>
      ) : null}

      {data ? (
        <div className="grid w-full gap-6">
          <section className="pixel-card w-full">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="profile-avatar-frame">
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
                    <span className="text-2xl font-bold text-[var(--px-sub)]">
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
                    <button className="btn-primary" onClick={handleShareFrame} disabled={!data.frameUrl}>
                      Share points frame
                    </button>
                    <button className="btn-secondary" onClick={handleCopyFrame} disabled={!data.frameUrl}>
                      Copy frame link
                    </button>
                  </div>
                  {data.farcasterUser?.neynarScore != null ? (
                    <p className="mt-3 text-xs text-[var(--px-sub)]">Neynar score: {data.farcasterUser.neynarScore.toFixed(2)}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid flex-1 gap-3 sm:grid-cols-2">
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

          {data.badges.length ? (
            <section className="pixel-card w-full">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="pixel-section-title">Badges</h2>
                <span className="pixel-pill text-[10px]">{data.badges.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.badges.slice(0, MAX_BADGES_PREVIEW).map((badge) => (
                  <div
                    key={`${badge.chain}-${badge.badgeId}`}
                    className="profile-badge-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="profile-badge-icon">
                        {badge.image ? (
                          <Image src={badge.image} alt={badge.name || `Badge #${badge.badgeId}`} width={48} height={48} className="h-full w-full object-cover" unoptimized />
                        ) : (
                          <span className="text-xs text-[var(--px-sub)]">#{badge.badgeId}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{badge.name || `Badge #${badge.badgeId}`}</div>
                        <div className="text-xs text-[var(--px-sub)]">{CHAIN_LABEL[badge.chain]}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {data.badges.length > MAX_BADGES_PREVIEW ? (
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
