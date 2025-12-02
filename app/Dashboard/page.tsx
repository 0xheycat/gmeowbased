/**
 * FRESH Dashboard Page
 * 100% Automated with Neynar API (NO manual curation!)
 * 5 Sections: Trending Tokens, Top Casters, Trending Channels, Featured Frames, Activity Feed
 */

import { Suspense } from 'react'
import { DashboardHero } from './components/DashboardHero'
import { TrendingTokens } from './components/TrendingTokens'
import { TopCasters } from './components/TopCasters'
import { TrendingChannels } from './components/TrendingChannels'
import { ActivityFeed } from './components/ActivityFeed'

// Loading skeletons
function LoadingSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Banner */}
      <DashboardHero />

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          {/* Trending Tokens */}
          <Suspense fallback={<LoadingSkeleton />}>
            <TrendingTokens />
          </Suspense>

          {/* Top Casters */}
          <Suspense fallback={<LoadingSkeleton />}>
            <TopCasters />
          </Suspense>

          {/* Trending Channels */}
          <Suspense fallback={<LoadingSkeleton />}>
            <TrendingChannels />
          </Suspense>
        </div>

        {/* Right Column (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          {/* Activity Feed */}
          <Suspense fallback={<LoadingSkeleton />}>
            <ActivityFeed />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Dashboard - GMEOW',
  description: 'Discover trending tokens, top casters, and trending channels on Base',
}
