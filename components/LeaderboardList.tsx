'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { LeaderboardEntry } from '@/lib/types'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'
import { RankProgress } from '@/components/ui/RankProgress'

export function LeaderboardList() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const pushNotification = useLegacyNotificationAdapter()

  // Load leaderboard (mock)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        // Mock leaderboard data for demo
        const mockData: LeaderboardEntry[] = [
          { rank: 1, userFid: 3621, username: 'alice', displayName: 'Alice', pfpUrl: undefined, currentStreak: 42, totalGMs: 45 },
          { rank: 2, userFid: 6841, username: 'deodad', displayName: "Tony D'Addeo", pfpUrl: undefined, currentStreak: 38, totalGMs: 40 },
          { rank: 3, userFid: 9152, username: 'warpcast', displayName: 'Warpcast', pfpUrl: undefined, currentStreak: 35, totalGMs: 35 },
          { rank: 4, userFid: 1234, username: 'gmuser1', displayName: 'GM Enthusiast', pfpUrl: undefined, currentStreak: 28, totalGMs: 30 },
          { rank: 5, userFid: 5678, username: 'earlybird', displayName: 'Early Bird', pfpUrl: undefined, currentStreak: 21, totalGMs: 25 },
        ]
        await new Promise((r) => setTimeout(r, 800))
        if (cancelled) return
        setLeaderboard(mockData)
        pushNotification({ type: 'success', title: 'Leaderboard loaded', message: `${mockData.length} entries` })
      } catch (err: any) {
        console.error('Failed to load leaderboard:', err?.message || String(err))
        pushNotification({ type: 'error', title: 'Failed to load', message: 'Could not fetch leaderboard.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [pushNotification])

  const handleRefresh = async () => {
    pushNotification({ type: 'info', title: 'Refreshing…', message: 'Fetching latest leaderboard.' })
    // Reuse the same mock loading flow
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      pushNotification({ type: 'success', title: 'Up to date', message: 'Leaderboard refreshed.' })
    }, 600)
  }

  const RankBadge = ({ rank }: { rank: number }) => {
    const top = rank <= 3
    const label = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
    const style =
      rank === 1
        ? { background: 'linear-gradient(180deg,#facc15,#f59e0b)', color: '#0b0a16' }
        : rank === 2
        ? { background: 'linear-gradient(180deg,#e5e7eb,#9ca3af)', color: '#0b0a16' }
        : rank === 3
        ? { background: 'linear-gradient(180deg,#f59e0b,#b45309)', color: '#0b0a16' }
        : undefined

    return (
      <span
        className={`inline-flex items-center justify-center min-w-[3rem] text-center ${top ? 'pixel-badge' : 'pixel-pill'}`}
        style={style}
        title={`Rank ${rank}`}
      >
        {label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto site-font">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="pixel-card animate-pulse">
              <div className="flex items-center gap-4">
                <div
                  className="rounded-md"
                  style={{
                    width: 48,
                    height: 48,
                    boxShadow: '0 0 0 3px var(--px-outer), inset 0 0 0 3px var(--px-inner)',
                    background: 'rgba(138,99,210,0.15)',
                  }}
                />
                <div className="flex-1">
                  <div className="h-3 rounded mb-2" style={{ background: 'rgba(138,99,210,0.2)', width: '40%' }} />
                  <div className="h-2 rounded" style={{ background: 'rgba(138,99,210,0.15)', width: '30%' }} />
                </div>
                <div
                  className="h-6 rounded px-4"
                  style={{
                    background: 'rgba(138,99,210,0.18)',
                    boxShadow: '0 0 0 2px var(--px-outer), inset 0 0 0 2px var(--px-inner)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto site-font">
      <div className="flex items-center justify-between mb-3">
        <h2 className="pixel-heading">Top GM Streaks</h2>
        <button className="pixel-pill text-sm" onClick={handleRefresh}>Refresh</button>
      </div>

      <div className="space-y-3">
        {leaderboard.map((entry) => {
          const approxPoints = entry.totalGMs * 10
          return (
            <div key={entry.userFid} className="pixel-card hover:brightness-110 transition">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Rank + Avatar + User */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Rank */}
                  <RankBadge rank={entry.rank} />

                  {/* Avatar (pixel frame) */}
                  <div
                    className="grid place-items-center rounded-md overflow-hidden"
                    style={{
                      width: 48,
                      height: 48,
                      boxShadow: '0 0 0 3px var(--px-outer), inset 0 0 0 3px var(--px-inner)',
                      background: '#111042',
                    }}
                  >
                    {entry.pfpUrl ? (
                      <Image
                        src={entry.pfpUrl}
                        alt={entry.displayName || entry.username || 'User'}
                        width={44}
                        height={44}
                        className="pixelated"
                        style={{ objectFit: 'cover' }}
                        unoptimized
                        onError={(e) => {
                          console.error('Avatar failed to load:', entry.pfpUrl)

                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-sm text-[var(--px-sub)]">
                        {(entry.displayName || entry.username || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="min-w-0">
                    <h3 className="truncate" style={{ fontWeight: 700, textShadow: '0 2px 0 var(--px-outer)' }}>
                      {entry.displayName || entry.username || `User #${entry.userFid}`}
                    </h3>
                    {entry.username && (
                      <p className="text-xs text-[var(--px-sub)] truncate">@{entry.username}</p>
                    )}
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="text-right">
                  <div className="pixel-stat text-orange-300 leading-none">{entry.currentStreak}</div>
                  <div className="text-sm text-[var(--px-sub)]">{entry.totalGMs} total GMs</div>
                </div>
              </div>

              <RankProgress
                points={approxPoints}
                size="sm"
                variant="plain"
                showIcon={false}
                className="mt-3"
              />
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {leaderboard.length === 0 && !loading && (
        <div className="pixel-card text-center mt-6">
          <div className="text-5xl mb-2">🏁</div>
          <h3 className="mb-1" style={{ fontWeight: 700, textShadow: '0 2px 0 var(--px-outer)' }}>
            No GM streaks yet
          </h3>
          <p className="text-[var(--px-sub)] text-sm">Be the first to start your GM journey!</p>
        </div>
      )}
    </div>
  )
}