/**
 * GuildLeaderboard Component (WCAG AA Compliant)
 * 
 * Purpose: Ranking of guilds with time filters
 * Template: trezoadmin-41/leaderboard (40%) + gmeowbased0.6 layout (10%)
 * 
 * Features:
 * - Top guilds ranked by points/treasury
 * - Time filters (keyboard accessible)
 * - Medal icons for top 3
 * - Responsive table (desktop) and cards (mobile)
 * - Click to view guild profile (Enter/Space support)
 * - WCAG AA contrast ratios
 * - ARIA labels for rankings
 * 
 * Usage:
 * <GuildLeaderboard />
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EmojiEventsIcon, MilitaryTechIcon, LeaderboardIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import { Button } from '@/components/ui/button'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/utils/accessibility'

export interface GuildRank {
  rank: number
  id: string
  name: string
  chain: 'base'
  points: number
  level?: number
  memberCount: number
  owner: string
  avatarUrl?: string
}

type TimeFilter = '24h' | '7d' | '30d' | 'all'

export default function GuildLeaderboard() {
  const router = useRouter()
  const [guilds, setGuilds] = useState<GuildRank[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [dialogMessage, setDialogMessage] = useState('')
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)

  const loadLeaderboard = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Map frontend filter to API period format
      const periodMap: Record<TimeFilter, string> = {
        '24h': 'week',
        '7d': 'week',
        '30d': 'month',
        'all': 'all-time'
      }
      const period = periodMap[timeFilter]
      const response = await fetch(`/api/guild/leaderboard?period=${period}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setDialogMessage(errorData.message || 'Failed to load leaderboard. Please try again.')
        setErrorDialogOpen(true)
        setError('Failed to load leaderboard')
        return
      }
      const data = await response.json()
      
      // Map API response to component format
      const mappedGuilds = (data.leaderboard || data.guilds || []).map((g: any) => ({
        rank: g.rank,
        id: g.id,
        name: g.name,
        chain: g.chain || 'base',
        points: parseInt(g.totalPoints || g.points || '0'),
        level: g.level || 1,
        memberCount: parseInt(g.memberCount || '0'),
        owner: g.leader || g.owner || ''
      }))
      
      setGuilds(mappedGuilds)
    } catch (err) {
      // Error handled by dialog display
      setDialogMessage('Failed to load leaderboard. Please try again.')
      setErrorDialogOpen(true)
      setError('Failed to load leaderboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [timeFilter])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <MilitaryTechIcon className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <MilitaryTechIcon className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <MilitaryTechIcon className="w-6 h-6 text-amber-700" />
    return <span className="text-lg font-bold text-gray-500 dark:text-gray-400">#{rank}</span>
  }

  const handleGuildClick = (guildId: string) => {
    router.push(`/guild/${guildId}`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl" role="status" aria-live="polite" aria-label="Loading leaderboard">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-4">
          <Skeleton variant="rect" className="h-12 w-64" animation="wave" />
          <Skeleton variant="rect" className="h-6 w-96" animation="wave" />
        </div>

        {/* Filters Skeleton */}
        <div className="mb-6 flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="rect" className="h-10 w-20 rounded-lg" animation="wave" />
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="rect" className="h-20 rounded-lg" animation="wave" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Error Loading Leaderboard
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">Unable to load leaderboard. Please try again.</p>
            <Button
              onClick={() => {
                setError(null)
                loadLeaderboard()
              }}
              variant="default"
            >
              Retry
            </Button>
          </div>
        </div>

        {/* Error Dialog */}
        <Dialog isOpen={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
          <DialogBackdrop />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Error Loading Leaderboard</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-gray-700 dark:text-gray-300">{dialogMessage}</p>
            </DialogBody>
            <DialogFooter>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setErrorDialogOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => setErrorDialogOpen(false))}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setError(null)
                    setErrorDialogOpen(false)
                    loadLeaderboard()
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => {
                    setError(null)
                    setErrorDialogOpen(false)
                    loadLeaderboard()
                  })}
                >
                  Retry
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <EmojiEventsIcon className="w-10 h-10 text-yellow-500" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Guild Leaderboard
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Top guilds ranked by total points, level, and member count
        </p>
      </div>

      {/* Time Filters (WCAG AA) */}
      <div className="mb-6 flex flex-wrap gap-3" role="group" aria-label="Time period filters">
        {(['24h', '7d', '30d', 'all'] as TimeFilter[]).map(filter => {
          const isActive = timeFilter === filter
          const label = filter === 'all' ? 'All Time' : filter.toUpperCase()
          const keyboardProps = createKeyboardHandler(() => setTimeFilter(filter))
          
          return (
            <button
              key={filter}
              {...keyboardProps}
              aria-pressed={isActive}
              aria-label={`Filter by ${label}`}
              className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg font-medium transition-all duration-200 ${FOCUS_STYLES.ring} ${
                isActive
                  ? 'bg-wcag-info-light dark:bg-wcag-info-dark text-white'
                  : `bg-gray-100 dark:bg-gray-800 ${WCAG_CLASSES.text.onLight.secondary} hover:bg-gray-200 dark:hover:bg-gray-700`
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Empty State */}
      {guilds.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <LeaderboardIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Guilds Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Be the first to create a guild and appear on the leaderboard!
          </p>
          <button
            onClick={() => router.push('/guild')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Discover Guilds
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${WCAG_CLASSES.text.onLight.secondary}`}>
                    Rank
                  </th>
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${WCAG_CLASSES.text.onLight.secondary}`}>
                    Guild
                  </th>
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${WCAG_CLASSES.text.onLight.secondary}`}>
                    Chain
                  </th>
                  <th className={`text-right py-4 px-4 text-sm font-semibold ${WCAG_CLASSES.text.onLight.secondary}`}>
                    Points
                  </th>
                  <th className={`text-right py-4 px-4 text-sm font-semibold ${WCAG_CLASSES.text.onLight.secondary}`}>
                    Level
                  </th>
                  <th className={`text-right py-4 px-4 text-sm font-semibold ${WCAG_CLASSES.text.onLight.secondary}`}>
                    Members
                  </th>
                </tr>
              </thead>
              <tbody>
                {guilds.map(guild => {
                  const keyboardProps = createKeyboardHandler(() => handleGuildClick(guild.id))
                  const ariaLabel = `Rank ${guild.rank}: ${guild.name} guild. ${guild.points.toLocaleString()} points, Level ${guild.level || 1}, ${guild.memberCount} members. Press Enter to view guild.`
                  
                  return (
                    <tr
                      key={guild.id}
                      {...keyboardProps}
                      role="button"
                      tabIndex={0}
                      aria-label={ariaLabel}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-fast transition-smooth ${FOCUS_STYLES.ring}`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center w-10" aria-hidden="true">
                          {getRankIcon(guild.rank)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0" aria-hidden="true">
                            {guild.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`font-semibold ${WCAG_CLASSES.text.onLight.primary}`}>
                            {guild.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-wcag-text-link-light dark:text-wcag-text-link-dark text-xs font-medium rounded">
                          {guild.chain.toUpperCase()}
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-right font-semibold ${WCAG_CLASSES.text.onLight.primary}`}>
                        {guild.points.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                          Level {guild.level || 1}
                        </span>
                      </td>
                      <td className={`py-4 px-4 text-right font-semibold ${WCAG_CLASSES.text.onLight.primary}`}>
                        {guild.memberCount}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (WCAG AA) */}
          <div className="md:hidden space-y-4">
            {guilds.map(guild => {
              const keyboardProps = createKeyboardHandler(() => handleGuildClick(guild.id))
              const ariaLabel = `Rank ${guild.rank}: ${guild.name} guild. ${guild.points.toLocaleString()} points, Level ${guild.level || 1}, ${guild.memberCount} members.`
              
              return (
                <button
                  key={guild.id}
                  {...keyboardProps}
                  aria-label={ariaLabel}
                  className={`w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-wcag-focus-ring dark:hover:border-wcag-focus-ring-dark transition-all duration-200 hover:shadow-lg text-left ${FOCUS_STYLES.ring}`}
                >
                  {/* Rank & Guild */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center justify-center w-10">
                      {getRankIcon(guild.rank)}
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {guild.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate mb-1">
                        {guild.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                        {guild.chain.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Points
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {guild.points.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Level
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {guild.level || 1}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Members
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {guild.memberCount}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
