'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Leaderboard, type LeaderboardEntry, type LeaderboardEventType } from '../../../components/features/LeaderboardComponents'
import { AppLayout } from '@/components/layouts/AppLayout'

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('all-time')
  const [eventType, setEventType] = useState<LeaderboardEventType>('all')

  // Fetch leaderboard data from API
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams()
        if (timeframe) params.set('timeframe', timeframe)
        if (eventType !== 'all') params.set('eventType', mapEventTypeToApi(eventType))
        params.set('limit', '50')
        
        const response = await fetch(`/api/leaderboard?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.ok || !data.top || !Array.isArray(data.top)) {
          throw new Error('Invalid leaderboard data format')
        }

        // Transform API response to component format
        const transformed: LeaderboardEntry[] = data.top.map((entry: any, index: number) => ({
          rank: entry.rank || index + 1,
          userId: entry.address || entry.farcasterFid?.toString() || `user-${index}`,
          username: entry.name || `User ${entry.farcasterFid || entry.address?.slice(0, 6)}`,
          avatar: entry.pfpUrl || undefined,
          score: entry.points || 0,
          level: Math.floor((entry.points || 0) / 1000), // 1000 XP = 1 level
          change: 0, // TODO: Track rank changes in future iteration
        }))
        
        setEntries(transformed)
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
        setEntries([])
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [timeframe, eventType])

  // Map frontend event types to API event types
  function mapEventTypeToApi(type: LeaderboardEventType): string {
    const mapping: Record<LeaderboardEventType, string> = {
      'all': 'all',
      'gm': 'gm',
      'tips': 'tip',
      'quests': 'quest-verify',
      'badges': 'badge-mint',
      'guilds': 'guild-join',
      'referrals': 'referral',
    }
    return mapping[type] || 'all'
  }

  const handleTimeframeChange = (newTimeframe: typeof timeframe) => {
    setTimeframe(newTimeframe)
  }

  const handleEventTypeChange = (newEventType: LeaderboardEventType) => {
    setEventType(newEventType)
  }

  // Loading state
  if (loading) {
    return (
      <AppLayout fullPage>
        <div className="page-bg-leaderboard p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header skeleton */}
            <div className="mb-6">
              <div className="h-6 w-32 theme-bg-subtle rounded animate-pulse mb-4"></div>
            </div>

            {/* Banner skeleton */}
            <div className="banner-season">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-8 w-64 theme-bg-muted rounded animate-pulse mb-3"></div>
                  <div className="h-4 w-96 theme-bg-muted rounded animate-pulse mb-3"></div>
                  <div className="flex gap-4">
                    <div className="h-4 w-32 theme-bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-32 theme-bg-muted rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="text-5xl opacity-50">🏅</div>
              </div>
            </div>

            {/* Leaderboard skeleton */}
            <div className="mt-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card">
                  <div className="card-body">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full theme-bg-muted animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 w-32 theme-bg-muted rounded animate-pulse mb-2"></div>
                        <div className="h-3 w-24 theme-bg-muted rounded animate-pulse"></div>
                      </div>
                      <div className="h-6 w-20 theme-bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <AppLayout fullPage>
        <div className="page-bg-leaderboard p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Link 
                href="/app" 
                className="inline-flex items-center gap-2 theme-text-tertiary hover:theme-text-primary transition-colors"
              >
                <span>←</span> Back to Home
              </Link>
            </div>

            <div className="card theme-bg-danger-subtle border-2 border-red-300">
              <div className="card-body text-center py-12">
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-red-700 mb-2">Failed to Load Leaderboard</h3>
                <p className="theme-text-secondary mb-6">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <AppLayout fullPage>
        <div className="page-bg-leaderboard p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Link 
                href="/app" 
                className="inline-flex items-center gap-2 theme-text-tertiary hover:theme-text-primary transition-colors"
              >
                <span>←</span> Back to Home
              </Link>
            </div>

            <div className="card">
              <div className="card-body text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-bold theme-text-primary mb-2">No Leaderboard Data Yet</h3>
                <p className="theme-text-secondary mb-6">
                  Be the first to earn XP and claim the top spot!
                </p>
                <Link href="/app/quests" className="btn btn-primary">
                  Start Completing Quests
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Success state with data
  return (
    <AppLayout fullPage>
      <div className="page-bg-leaderboard p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/app" 
            className="inline-flex items-center gap-2 theme-text-tertiary hover:theme-text-primary transition-colors mb-4"
          >
            <span>←</span> Back to Home
          </Link>
        </div>

        {/* Season Info Banner */}
        <div className="banner-season">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold theme-text-primary mb-2">🏆 Season 1: Genesis</h2>
              <p className="text-yellow-200/80 mb-3">
                Compete for the top spot and earn exclusive rewards!
              </p>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-yellow-300">Total Players:</span>
                  <span className="theme-text-primary font-bold ml-2">{entries.length}</span>
                </div>
                <div>
                  <span className="text-yellow-300">Top Score:</span>
                  <span className="theme-text-primary font-bold ml-2">{entries[0]?.score.toLocaleString() || '0'} XP</span>
                </div>
              </div>
            </div>
            <div className="text-5xl">🏅</div>
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard 
          entries={entries}
          currentUserId="current"
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          eventType={eventType}
          onEventTypeChange={handleEventTypeChange}
        />

        {/* Rewards Info */}
        <div className="mt-8 rounded-xl theme-bg-subtle border theme-border-default p-6">
          <h2 className="text-2xl font-bold theme-text-primary mb-4">Season Rewards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rank-card-gold">
              <div className="text-3xl mb-2">🥇</div>
              <h3 className="font-bold theme-text-primary mb-1">1st Place</h3>
              <p className="text-sm text-yellow-600">50,000 XP + Legendary Badge</p>
            </div>
            <div className="rank-card-silver">
              <div className="text-3xl mb-2">🥈</div>
              <h3 className="font-bold theme-text-primary mb-1">2nd Place</h3>
              <p className="text-sm theme-text-tertiary">30,000 XP + Epic Badge</p>
            </div>
            <div className="rank-card-bronze">
              <div className="text-3xl mb-2">🥉</div>
              <h3 className="font-bold theme-text-primary mb-1">3rd Place</h3>
              <p className="text-sm text-orange-600">20,000 XP + Rare Badge</p>
            </div>
          </div>
          <p className="text-sm theme-text-tertiary mt-4">
            Top 100 players will receive bonus XP rewards. Keep climbing the ranks!
          </p>
        </div>
      </div>
    </div>
    </AppLayout>
  )
}
