'use client'

/**
 * Guild Leaderboard Page Route
 * Path: /guild/leaderboard
 * Features: Top guilds ranking with time filters
 */

import { Suspense } from 'react'
import GuildLeaderboard from '@/components/guild/GuildLeaderboard'
import Loader from '@/components/ui/loader'

export default function GuildLeaderboardPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Guild Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Top performing guilds across all chains
          </p>
        </div>
        
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader />
          </div>
        }>
          <GuildLeaderboard />
        </Suspense>
      </div>
    </div>
  )
}
