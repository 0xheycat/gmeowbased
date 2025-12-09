/**
 * FRESH Dashboard Page
 * 100% Automated with Neynar API (NO manual curation!)
 * 5 Sections: Trending Tokens, Top Casters, Trending Channels, Featured Frames, Activity Feed
 * 
 * ✅ Error Boundaries: All components wrapped with DashboardErrorBoundary
 * ✅ Data Caching: 30s TTL with "Updated X ago" timestamps
 * ✅ Component-Specific Skeletons: Shimmer animations for each section
 */

import { Suspense } from 'react'
import { DashboardHero } from './components/DashboardHero'
import { TrendingTokens } from './components/TrendingTokens'
import { TopCasters } from './components/TopCasters'
import { TrendingChannels } from './components/TrendingChannels'
import { ActivityFeed } from './components/ActivityFeed'
import { DashboardErrorBoundary } from './components/DashboardErrorBoundary'
import { TrendingTokensSkeleton } from './components/skeletons/TrendingTokensSkeleton'
import { TopCastersSkeleton } from './components/skeletons/TopCastersSkeleton'
import { TrendingChannelsSkeleton } from './components/skeletons/TrendingChannelsSkeleton'
import { ActivityFeedSkeleton } from './components/skeletons/ActivityFeedSkeleton'

export default async function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Banner - No error boundary needed (static content) */}
      <DashboardHero />

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          {/* Trending Tokens - With Error Boundary & Specific Skeleton */}
          <DashboardErrorBoundary componentName="Trending Tokens">
            <Suspense fallback={<TrendingTokensSkeleton />}>
              <TrendingTokens />
            </Suspense>
          </DashboardErrorBoundary>

          {/* Top Casters - With Error Boundary & Specific Skeleton */}
          <DashboardErrorBoundary componentName="Top Casters">
            <Suspense fallback={<TopCastersSkeleton />}>
              <TopCasters />
            </Suspense>
          </DashboardErrorBoundary>

          {/* Trending Channels - With Error Boundary & Specific Skeleton */}
          <DashboardErrorBoundary componentName="Trending Channels">
            <Suspense fallback={<TrendingChannelsSkeleton />}>
              <TrendingChannels />
            </Suspense>
          </DashboardErrorBoundary>
        </div>

        {/* Right Column (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          {/* Activity Feed - With Error Boundary & Specific Skeleton */}
          <DashboardErrorBoundary componentName="Activity Feed">
            <Suspense fallback={<ActivityFeedSkeleton />}>
              <ActivityFeed />
            </Suspense>
          </DashboardErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Dashboard - GMEOW',
  description: 'Discover trending tokens, top casters, and trending channels on Base',
}
