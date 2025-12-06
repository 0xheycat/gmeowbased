'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import clsx from 'clsx'

// Quest completion data type
export interface QuestCompletion {
  id: string
  quest_id: number
  quest_slug: string
  quest_title: string
  quest_image_url?: string | null
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  xp_earned: number
  points_earned: number
  completed_at: string | null // ISO timestamp, null for in-progress
  status: 'completed' | 'in_progress' | 'failed'
}

export interface QuestActivityProps {
  quests: QuestCompletion[]
  loading?: boolean
  className?: string
}

// Filter & Sort types
type FilterType = 'all' | 'completed' | 'in_progress'
type SortType = 'recent' | 'oldest' | 'xp'

// Difficulty badge colors
const DIFFICULTY_COLORS = {
  easy: 'bg-green-500/20 text-green-100 border-green-400/60',
  medium: 'bg-yellow-500/20 text-yellow-100 border-yellow-400/60',
  hard: 'bg-orange-500/20 text-orange-100 border-orange-400/60',
  legendary: 'bg-purple-500/20 text-purple-100 border-purple-400/60',
}

/**
 * QuestActivity Component
 * 
 * Professional quest completion display for profile pages
 * Template: music/datatable + gmeowbased0.6/collection-card patterns
 * Adaptation: 35% (combined quest grid from gmeowbased with music filtering)
 * 
 * Features:
 * - Quest cards grid (completed quests)
 * - Filter: All / Completed / In Progress
 * - Sort: Recent / Oldest / XP Earned
 * - Empty state: "No quests yet"
 * - Mobile-responsive (1 col mobile, 2-3 cols desktop)
 * 
 * @example
 * ```tsx
 * <QuestActivity
 *   quests={userQuestCompletions}
 *   loading={loading}
 * />
 * ```
 */
export default function QuestActivity({
  quests,
  loading = false,
  className,
}: QuestActivityProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('recent')

  // Filter & Sort logic
  const filteredQuests = useMemo(() => {
    let filtered = quests

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter(q => q.status === filter)
    }

    // Apply sort with null-safe handling
    const sorted = [...filtered]
    if (sort === 'recent') {
      sorted.sort((a, b) => {
        // Handle null completed_at for in-progress quests
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0
        return bTime - aTime
      })
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => {
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : Date.now()
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : Date.now()
        return aTime - bTime
      })
    } else if (sort === 'xp') {
      sorted.sort((a, b) => (b.xp_earned || 0) - (a.xp_earned || 0))
    }

    return sorted
  }, [quests, filter, sort])

  // Loading skeleton
  if (loading) {
    return (
      <div className={clsx('space-y-4', className)}>
        {/* Filter skeleton */}
        <div className="flex items-center gap-2 flex-wrap">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
        {/* Quest cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (quests.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <span className="text-4xl" role="img" aria-label="Quest">
            ⚔️
          </span>
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">No quests yet</h3>
        <p className="mb-6 max-w-md text-sm text-white/60">
          Complete quests to earn XP and BASE Points. Your journey starts here!
        </p>
        <Link
          href="/Quest"
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Browse Quests
        </Link>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Filters & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-white/50">Filter:</span>
          {(['all', 'completed', 'in_progress'] as FilterType[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all',
                filter === f
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-white/50">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:border-white/20 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="recent">Recent</option>
            <option value="oldest">Oldest</option>
            <option value="xp">XP Earned</option>
          </select>
        </div>
      </div>

      {/* Quest Cards Grid */}
      {filteredQuests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuests.map(quest => (
            <Link
              key={quest.id}
              href={`/Quest/${quest.quest_slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/3 p-4 backdrop-blur transition-all duration-300 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-600/20"
            >
              {/* Quest Image */}
              {quest.quest_image_url && (
                <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-white/5">
                  <Image
                    src={quest.quest_image_url}
                    alt={quest.quest_title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}

              {/* Quest Title */}
              <h4 className="mb-2 line-clamp-2 text-sm font-semibold text-white group-hover:text-blue-100">
                {quest.quest_title}
              </h4>

              {/* Metadata */}
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                {/* Difficulty badge */}
                <span className={clsx(
                  'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  DIFFICULTY_COLORS[quest.difficulty]
                )}>
                  {quest.difficulty}
                </span>

                {/* Status badge */}
                {quest.status === 'in_progress' && (
                  <span className="rounded-full border border-yellow-400/60 bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-100">
                    In Progress
                  </span>
                )}
              </div>

              {/* Rewards */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-purple-300">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    +{quest.xp_earned} XP
                  </span>
                  <span className="flex items-center gap-1 text-blue-300">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    +{quest.points_earned} pts
                  </span>
                </div>

                {/* Completed date */}
                {quest.completed_at && (
                  <span className="text-white/40">
                    {new Date(quest.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Hover indicator */}
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-white/60">No quests match the selected filter</p>
        </div>
      )}

      {/* Results count */}
      <div className="text-center text-xs text-white/40">
        Showing {filteredQuests.length} of {quests.length} quest{quests.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// Export named for consistency
export { QuestActivity }
