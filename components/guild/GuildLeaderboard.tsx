/**
 * GuildLeaderboard Component
 * 
 * Purpose: Ranking of guilds with time filters
 * Template: trezoadmin-41/leaderboard (40%) + gmeowbased0.6 layout (10%)
 * 
 * Features:
 * - Top guilds ranked by points/treasury
 * - Time filters (24h, 7d, 30d, all)
 * - Medal icons for top 3
 * - Responsive table (desktop) and cards (mobile)
 * - Click to view guild profile
 * 
 * Usage:
 * <GuildLeaderboard />
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EmojiEventsIcon, MilitaryTechIcon, LeaderboardIcon } from '@/components/icons'

export interface GuildRank {
  rank: number
  id: string
  name: string
  chain: 'base'
  points: number
  treasury: number
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

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/guild/leaderboard?period=${timeFilter}`)
        if (!response.ok) throw new Error('Failed to load leaderboard')
        const data = await response.json()
        setGuilds(data.guilds || [])
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
        setError('Failed to load leaderboard. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Skeleton */}
        <div className="animate-pulse mb-8">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-12 w-64 mb-4" />
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-6 w-96" />
        </div>

        {/* Filters Skeleton */}
        <div className="animate-pulse mb-6 flex gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-10 w-20" />
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg h-20" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Error Loading Leaderboard
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
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
          Top guilds ranked by total points and treasury
        </p>
      </div>

      {/* Time Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        {(['24h', '7d', '30d', 'all'] as TimeFilter[]).map(filter => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              timeFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {filter === 'all' ? 'All Time' : filter.toUpperCase()}
          </button>
        ))}
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
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Rank
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Guild
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Chain
                  </th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Points
                  </th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Treasury
                  </th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Members
                  </th>
                </tr>
              </thead>
              <tbody>
                {guilds.map(guild => (
                  <tr
                    key={guild.id}
                    onClick={() => handleGuildClick(guild.id)}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(guild.rank)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                          {guild.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {guild.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                        {guild.chain.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                      {guild.points.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                      {guild.treasury.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                      {guild.memberCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {guilds.map(guild => (
              <button
                key={guild.id}
                onClick={() => handleGuildClick(guild.id)}
                className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg text-left focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                      Treasury
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {guild.treasury.toLocaleString()}
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}
