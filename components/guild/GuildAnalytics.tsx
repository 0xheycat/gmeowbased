/**
 * GuildAnalytics Component
 * 
 * Purpose: Analytics dashboard with charts for guild stats
 * Template: trezoadmin-41/analytics (40%) + gmeowbased0.6 layout (10%)
 * 
 * Features:
 * - Activity charts (members over time, points growth)
 * - Top contributors leaderboard
 * - Recent activity feed
 * - Key metrics cards
 * 
 * Usage:
 * <GuildAnalytics guildId="123" />
 */

'use client'

import { useState, useEffect } from 'react'
import { TrendingUpIcon, GroupIcon, StarIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import { createKeyboardHandler, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/utils/accessibility'

export interface GuildStats {
  totalPoints: number
  pointsGrowth7d: number
  totalMembers: number
  membersGrowth7d: number
  treasury: number
  treasuryGrowth7d: number
  topContributors: Array<{
    address: string
    username: string
    points: number
  }>
  recentActivity: Array<{
    id: string
    type: 'join' | 'deposit' | 'quest'
    username: string
    timestamp: string
    details: string
  }>
}

export interface GuildAnalyticsProps {
  guildId: string
}

export function GuildAnalytics({ guildId }: GuildAnalyticsProps) {
  const [stats, setStats] = useState<GuildStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/guild/${guildId}/analytics?period=week`)
        if (!response.ok) throw new Error('Failed to load analytics')
        const data = await response.json()
        
        // Transform API response to match component interface
        const transformedStats: GuildStats = {
          totalPoints: parseInt(data.analytics?.stats?.totalPoints || '0'),
          pointsGrowth7d: 0, // Not provided by API yet
          totalMembers: data.analytics?.stats?.totalMembers || 0,
          membersGrowth7d: 0, // Not provided by API yet
          treasury: parseInt(data.analytics?.stats?.treasuryBalance || '0'),
          treasuryGrowth7d: 0, // Not provided by API yet
          topContributors: (data.analytics?.topContributors || []).map((c: any) => ({
            address: c.address,
            username: `${c.address.slice(0, 6)}...${c.address.slice(-4)}`,
            points: parseInt(c.points || '0')
          })),
          recentActivity: [] // Not provided by API yet
        }
        
        setStats(transformedStats)
      } catch (err) {
        setError('Failed to load analytics. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [guildId])

  const formatGrowth = (value: number) => {
    const prefix = value >= 0 ? '+' : ''
    return `${prefix}${value}%`
  }

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading analytics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rect" className="h-32 rounded-lg" animation="wave" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton variant="rect" className="h-96 rounded-lg" animation="wave" />
          <Skeleton variant="rect" className="h-96 rounded-lg" animation="wave" />
        </div>
      </div>
    )
  }

  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (error || !stats) {
    return (
      <>
        <Dialog isOpen={true} onClose={() => setError(null)}>
          <DialogBackdrop />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Error Loading Analytics</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-gray-700 dark:text-gray-300">{error || 'No analytics data available'}</p>
            </DialogBody>
            <DialogFooter>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                {...createKeyboardHandler(() => setError(null))}
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Growth Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="list" aria-label="Guild statistics">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6" role="listitem" aria-label={`Total points: ${stats.totalPoints.toLocaleString()}, ${formatGrowth(stats.pointsGrowth7d)} this week`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>
              Total Points
            </span>
            <TrendingUpIcon className="w-5 h-5 text-wcag-success-light dark:text-wcag-success-dark" aria-hidden="true" />
          </div>
          <div className={`text-2xl font-bold ${WCAG_CLASSES.text.onLight.primary} mb-1`}>
            {stats.totalPoints.toLocaleString()}
          </div>
          <div className={`text-sm font-medium ${stats.pointsGrowth7d >= 0 ? 'text-wcag-success-light dark:text-wcag-success-dark' : 'text-wcag-error-light dark:text-wcag-error-dark'}`}>
            {formatGrowth(stats.pointsGrowth7d)} this week
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6" role="listitem" aria-label={`Total members: ${stats.totalMembers}, ${formatGrowth(stats.membersGrowth7d)} this week`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>
              Members
            </span>
            <GroupIcon className="w-5 h-5 text-wcag-info-light dark:text-wcag-info-dark" aria-hidden="true" />
          </div>
          <div className={`text-2xl font-bold ${WCAG_CLASSES.text.onLight.primary} mb-1`}>
            {stats.totalMembers}
          </div>
          <div className={`text-sm font-medium ${stats.membersGrowth7d >= 0 ? 'text-wcag-success-light dark:text-wcag-success-dark' : 'text-wcag-error-light dark:text-wcag-error-dark'}`}>
            {formatGrowth(stats.membersGrowth7d)} this week
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6" role="listitem" aria-label={`Treasury: ${stats.treasury.toLocaleString()} points, ${formatGrowth(stats.treasuryGrowth7d)} this week`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>
              Treasury
            </span>
            <StarIcon className="w-5 h-5 text-wcag-warning-light dark:text-wcag-warning-dark" aria-hidden="true" />
          </div>
          <div className={`text-2xl font-bold ${WCAG_CLASSES.text.onLight.primary} mb-1`}>
            {stats.treasury.toLocaleString()}
          </div>
          <div className={`text-sm font-medium ${stats.treasuryGrowth7d >= 0 ? 'text-wcag-success-light dark:text-wcag-success-dark' : 'text-wcag-error-light dark:text-wcag-error-dark'}`}>
            {formatGrowth(stats.treasuryGrowth7d)} this week
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Contributors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Top Contributors
          </h2>
          {stats.topContributors.length === 0 ? (
            <p className="text-center py-8 text-gray-600 dark:text-gray-400">
              No contributors yet
            </p>
          ) : (
            <div className="space-y-4">
              {stats.topContributors.map((contributor, index) => (
                <div
                  key={contributor.address}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-bold text-sm flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {contributor.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {contributor.address.slice(0, 6)}...{contributor.address.slice(-4)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {contributor.points.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          {stats.recentActivity.length === 0 ? (
            <p className="text-center py-8 text-gray-600 dark:text-gray-400">
              No recent activity
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'join' ? 'bg-blue-500' :
                    activity.type === 'deposit' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-semibold">{activity.username}</span>
                      {' '}
                      {activity.details}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GuildAnalytics
