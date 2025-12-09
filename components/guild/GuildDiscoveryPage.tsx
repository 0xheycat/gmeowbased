/**
 * GuildDiscoveryPage Component
 * 
 * Purpose: Browse, search, and filter guilds with detailed cards
 * Template: trezoadmin-41/discovery (40%) + gmeowbased0.6 layout (15%)
 * 
 * Features:
 * - Grid layout with guild cards (3 columns desktop, 1 mobile)
 * - Search by name/description
 * - Filter by chain (Base, Ethereum, All)
 * - Sort by members/treasury/activity
 * - Loading states and empty states
 * - Responsive design (375px → desktop)
 * 
 * Usage:
 * <GuildDiscoveryPage />
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon, FilterListIcon, UsersIcon, MonetizationOnIcon, TrendingUpIcon } from '@/components/icons'

export interface Guild {
  id: string
  name: string
  description: string
  chain: 'base'
  memberCount: number
  treasury: number
  owner: string
  createdAt: string
  avatarUrl?: string
}

type SortOption = 'members' | 'treasury' | 'activity'
type ChainFilter = 'base'

export default function GuildDiscoveryPage() {
  const router = useRouter()
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [chainFilter] = useState<ChainFilter>('base')
  const [sortBy, setSortBy] = useState<SortOption>('members')

  useEffect(() => {
    const loadGuilds = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/guild/list')
        if (!response.ok) throw new Error('Failed to load guilds')
        const data = await response.json()
        setGuilds(data.guilds || [])
      } catch (err) {
        console.error('Failed to load guilds:', err)
        setError('Failed to load guilds. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    loadGuilds()
  }, [])

  // Filter and sort guilds
  const filteredGuilds = guilds
    .filter(guild => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchName = guild.name.toLowerCase().includes(query)
        const matchDesc = guild.description.toLowerCase().includes(query)
        if (!matchName && !matchDesc) return false
      }
      
      // Base chain only - no filter needed
      
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'members':
          return b.memberCount - a.memberCount
        case 'treasury':
          return b.treasury - a.treasury
        case 'activity':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

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
        <div className="animate-pulse mb-8 flex flex-col sm:flex-row gap-4">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-12 flex-1" />
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-12 w-40" />
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-12 w-40" />
        </div>

        {/* Guild Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-64" />
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
            Error Loading Guilds
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
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Discover Guilds
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find and join guilds to collaborate with other players
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guilds..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
          />
        </div>

        {/* Base Chain Only */}
        <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px] flex items-center">
          <span className="font-medium">Base Network</span>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
        >
          <option value="members">Most Members</option>
          <option value="treasury">Highest Treasury</option>
          <option value="activity">Most Active</option>
        </select>
      </div>

      {/* Create Guild Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/guild/create')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Create Guild (100 BASE POINTS)
        </button>
      </div>

      {/* Guild Cards */}
      {filteredGuilds.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
            <FilterListIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Guilds Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Be the first to create a guild!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuilds.map(guild => (
            <button
              key={guild.id}
              onClick={() => handleGuildClick(guild.id)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-lg text-left focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
            >
              {/* Avatar & Name */}
              <div className="flex items-start gap-4 mb-4">
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

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {guild.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {guild.memberCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Members
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MonetizationOnIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {guild.treasury}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      BASE POINTS
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
