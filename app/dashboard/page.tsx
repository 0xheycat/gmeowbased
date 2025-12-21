/**
 * FRESH Dashboard Page - Phase 8.1.5 UI Enhancement
 * 100% Automated with Neynar API (NO manual curation!)
 * 
 * NEW: Tabbed Interface for Better Organization
 * - GM & Stats: Daily GM + User stats
 * - Trending: Tokens, Casters, Channels (consolidated)
 * - Staking: Badge staking dashboard
 * - Activity: Live activity feed
 * 
 * ✅ Error Boundaries: All components wrapped with DashboardErrorBoundary
 * ✅ Data Caching: 30s TTL with "Updated X ago" timestamps
 * ✅ Component-Specific Skeletons: Shimmer animations for each section
 * ✅ Tab Navigation: Radix UI tabs for keyboard accessibility
 */

import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { DashboardGMSection } from '@/app/dashboard/components/DashboardGMSection'
import { StakingDashboard } from './components/StakingDashboard'

export default async function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Banner - No error boundary needed (static content) */}
      <DashboardHero />

      {/* Tabbed Content for Better Organization */}
      <Tabs defaultValue="gm" className="mt-6">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="gm">🌅 GM & Stats</TabsTrigger>
          <TabsTrigger value="trending">🔥 Trending</TabsTrigger>
          <TabsTrigger value="staking">💎 Staking</TabsTrigger>
          <TabsTrigger value="activity">📊 Activity</TabsTrigger>
        </TabsList>

        {/* GM & Stats Tab */}
        <TabsContent value="gm">
          <DashboardErrorBoundary componentName="Daily GM">
            <Suspense fallback={
              <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
            }>
              <DashboardGMSection />
            </Suspense>
          </DashboardErrorBoundary>
        </TabsContent>

        {/* Trending Tab - All trending content */}
        <TabsContent value="trending">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trending Tokens */}
            <DashboardErrorBoundary componentName="Trending Tokens">
              <Suspense fallback={<TrendingTokensSkeleton />}>
                <TrendingTokens />
              </Suspense>
            </DashboardErrorBoundary>

            {/* Top Casters */}
            <DashboardErrorBoundary componentName="Top Casters">
              <Suspense fallback={<TopCastersSkeleton />}>
                <TopCasters />
              </Suspense>
            </DashboardErrorBoundary>

            {/* Trending Channels - Full Width */}
            <div className="lg:col-span-2">
              <DashboardErrorBoundary componentName="Trending Channels">
                <Suspense fallback={<TrendingChannelsSkeleton />}>
                  <TrendingChannels />
                </Suspense>
              </DashboardErrorBoundary>
            </div>
          </div>
        </TabsContent>

        {/* Staking Tab - NEW */}
        <TabsContent value="staking">
          <DashboardErrorBoundary componentName="Badge Staking">
            <Suspense fallback={
              <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
            }>
              <StakingDashboard />
            </Suspense>
          </DashboardErrorBoundary>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <div className="max-w-4xl mx-auto">
            <DashboardErrorBoundary componentName="Activity Feed">
              <Suspense fallback={<ActivityFeedSkeleton />}>
                <ActivityFeed />
              </Suspense>
            </DashboardErrorBoundary>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const metadata = {
  title: 'Dashboard - GMEOW',
  description: 'Discover trending tokens, top casters, and trending channels on Base',
}
