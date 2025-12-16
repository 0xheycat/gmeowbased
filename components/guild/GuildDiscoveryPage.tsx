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
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/dialogs'
import { Button } from '@/components/ui/button'
import GuildLeaderboard from '@/components/guild/GuildLeaderboard'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/accessibility'

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [chainFilter] = useState<ChainFilter>('base')
  const [sortBy, setSortBy] = useState<SortOption>('members')

  const loadGuilds = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/guild/list')
      if (!response.ok) {
        setDialogMessage('Failed to load guilds. Please try again.')
        setDialogOpen(true)
        setError('Failed to load guilds')
        return
      }
      const data = await response.json()
      setGuilds(data.guilds || [])
    } catch (err) {
      setDialogMessage('Failed to load guilds. Please try again.')
      setDialogOpen(true)
      setError('Failed to load guilds')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
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
      <div className="container mx-auto px-4 py-8 max-w-7xl" role="status" aria-live="polite" aria-label="Loading guilds">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-4">
          <Skeleton variant="rect" className="h-12 w-64" animation="wave" />
          <Skeleton variant="rect" className="h-6 w-96" animation="wave" />
        </div>

        {/* Filters Skeleton */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <Skeleton variant="rect" className="h-12 flex-1" animation="wave" />
          <Skeleton variant="rect" className="h-12 w-40" animation="wave" />
          <Skeleton variant="rect" className="h-12 w-40" animation="wave" />
        </div>

        {/* Guild Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} variant="rect" className="h-64 rounded-xl" animation="wave" />
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
              Error Loading Guilds
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">Unable to load guilds. Please try again.</p>
            <Button
              onClick={() => {
                setError(null)
                loadGuilds()
              }}
              variant="default"
            >
              Retry
            </Button>
          </div>
        </div>

        {/* Error Dialog */}
        <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogBackdrop />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Error Loading Guilds</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-gray-700 dark:text-gray-300">{dialogMessage}</p>
            </DialogBody>
            <DialogFooter>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => setDialogOpen(false))}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setError(null)
                    loadGuilds()
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => {
                    setError(null)
                    loadGuilds()
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
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Discover Guilds
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find and join guilds to collaborate with other players
        </p>
      </div>

      {/* Guild Leaderboard Section */}
      <div className="mb-12">
        <GuildLeaderboard />
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <label htmlFor="guild-search" className="sr-only">Search guilds by name or description</label>
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
          <input
            id="guild-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guilds..."
            aria-label="Search guilds by name or description"
            className={`w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 ${WCAG_CLASSES.text.onLight.primary} placeholder-gray-500 ${FOCUS_STYLES.ring} transition-fast ${BUTTON_SIZES.md}`}
          />
        </div>

        {/* Base Chain Only */}
        <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px] flex items-center">
          <span className="font-medium">Base Network</span>
        </div>

        {/* Sort */}
        <label htmlFor="guild-sort" className="sr-only">Sort guilds by</label>
        <select
          id="guild-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort guilds by"
          className={`px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 ${WCAG_CLASSES.text.onLight.primary} ${FOCUS_STYLES.ring} transition-fast ${BUTTON_SIZES.md}`}
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
          {filteredGuilds.map(guild => {
            const ariaLabel = `${guild.name} guild on ${guild.chain} network. ${guild.memberCount} members, ${guild.treasury} treasury points. ${guild.description}. Press Enter to view guild.`
            const keyboardProps = createKeyboardHandler(() => handleGuildClick(guild.id))
            
            return (
              <button
                key={guild.id}
                {...keyboardProps}
                role="button"
                aria-label={ariaLabel}
                className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-wcag-focus-ring dark:hover:border-wcag-focus-ring-dark transition-smooth hover:shadow-lg text-left ${FOCUS_STYLES.ring} ${BUTTON_SIZES.md}`}
              >
              {/* Avatar & Name */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {guild.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold ${WCAG_CLASSES.text.onLight.primary} truncate mb-1`}>
                    {guild.name}
                  </h3>
                  <span className="inline-flex items-center px-2 py-1 bg-wcag-info-light dark:bg-wcag-info-dark text-white text-xs font-medium rounded">
                    {guild.chain.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className={`${WCAG_CLASSES.text.onLight.secondary} text-sm mb-4 line-clamp-2`}>
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
            )
          })}
        </div>
      )}
    </div>
  )
}
