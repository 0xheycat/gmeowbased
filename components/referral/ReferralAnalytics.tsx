/**
 * ReferralAnalytics Component
 * 
 * Purpose: Analytics dashboard for referral performance tracking
 * Template: trezoadmin-41/dashboard-analytics (40%) + ProfileStats pattern (25%)
 * 
 * Features:
 * - Referral timeline chart (last 30 days)
 * - Conversion rate metrics
 * - Top performing periods
 * - Tier distribution visualization
 * - Performance comparison
 * - Responsive grid layout
 * 
 * Analytics Metrics:
 * 1. Total Referrals Over Time (line chart)
 * 2. Conversion Rate (percentage)
 * 3. Average Time to Convert
 * 4. Tier Distribution (badge tiers)
 * 5. Peak Performance Days
 * 6. Growth Rate (week over week)
 * 
 * Usage:
 * <ReferralAnalytics fid={12345} />
 */

'use client'

import { useState, useEffect } from 'react'
import { TrendingUpIcon, PeopleIcon, EmojiEventsIcon, CalendarIcon, ErrorIcon } from '@/components/icons'

export interface ReferralAnalyticsProps {
  /** User's Farcaster ID */
  fid: number
  /** Custom CSS class */
  className?: string
}

interface AnalyticsData {
  // Timeline data (last 30 days)
  timeline: Array<{
    date: string
    referrals: number
    points: number
  }>
  
  // Performance metrics
  metrics: {
    totalReferrals: number
    conversionRate: number // Percentage
    averageTimeToConvert: number // Hours
    growthRate: number // Percentage change week over week
    peakDay: {
      date: string
      count: number
    }
  }
  
  // Tier distribution
  tierDistribution: {
    bronze: number
    silver: number
    gold: number
  }
  
  // Period comparison
  comparison: {
    thisWeek: number
    lastWeek: number
    thisMonth: number
    lastMonth: number
  }
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  change?: number
  colorClass?: string
  description?: string
}

function StatCard({ label, value, icon, change, colorClass = 'text-blue-600', description }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            change >= 0 
              ? 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200' 
              : 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200'
          }`}>
            {change >= 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {value}
        </p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-700 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function TimelineChart({ data }: { data: AnalyticsData['timeline'] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No referral data available yet</p>
      </div>
    )
  }

  // Simple bar chart visualization
  const maxReferrals = Math.max(...data.map(d => d.referrals), 1)
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span>Last 30 Days</span>
        <span className="text-xs">Referrals per day</span>
      </div>
      <div className="flex items-end gap-1 h-40">
        {data.map((day, index) => {
          const height = (day.referrals / maxReferrals) * 100
          const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6
          
          return (
            <div
              key={index}
              className="flex-1 group relative"
              title={`${day.date}: ${day.referrals} referrals, ${day.points} points`}
            >
              <div 
                className={`w-full rounded-t transition-all ${
                  isWeekend 
                    ? 'bg-blue-500 dark:bg-blue-600' 
                    : 'bg-blue-600 dark:bg-blue-500'
                } group-hover:bg-blue-600 dark:group-hover:bg-blue-400`}
                style={{ height: `${height}%` }}
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-gray-700 dark:border-gray-600">
                <div className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div>{day.referrals} referrals</div>
                <div className="text-gray-300 dark:text-gray-400">{day.points} pts</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TierDistribution({ distribution }: { distribution: AnalyticsData['tierDistribution'] }) {
  const total = distribution.bronze + distribution.silver + distribution.gold
  
  if (total === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No tier data available</p>
      </div>
    )
  }

  const tiers = [
    { name: 'Bronze', count: distribution.bronze, color: 'bg-amber-800 dark:bg-amber-500', textColor: 'text-amber-800 dark:text-amber-400' },
    { name: 'Silver', count: distribution.silver, color: 'bg-gray-700 dark:bg-gray-500', textColor: 'text-gray-800 dark:text-gray-400' },
    { name: 'Gold', count: distribution.gold, color: 'bg-yellow-800 dark:bg-yellow-400', textColor: 'text-yellow-800 dark:text-yellow-400' },
  ]

  return (
    <div className="space-y-4">
      {tiers.map((tier) => {
        const percentage = total > 0 ? (tier.count / total) * 100 : 0
        
        return (
          <div key={tier.name}>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className={`font-medium ${tier.textColor}`}>{tier.name}</span>
              <span className="text-gray-600 dark:text-gray-400">
                {tier.count} ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`${tier.color} h-2 rounded-full transition-all`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ReferralAnalytics({ fid, className = '' }: ReferralAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/referral/${fid}/analytics`)
        
        if (!response.ok) {
          throw new Error('Failed to load analytics')
        }

        const result = await response.json()
        setData(result.data)
      } catch (err) {
        console.error('Failed to load referral analytics:', err)
        setError('Failed to load analytics. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [fid])

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading Skeleton */}
        <div className="animate-pulse space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-32" />
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64" />
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-64" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <ErrorIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
              Error Loading Analytics
            </h3>
            <p className="text-red-700 dark:text-red-300">
              {error || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const weeklyGrowth = data.comparison.lastWeek > 0
    ? ((data.comparison.thisWeek - data.comparison.lastWeek) / data.comparison.lastWeek) * 100
    : 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Referral Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Track your referral performance and growth trends
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Referrals"
          value={data.metrics.totalReferrals}
          icon={<PeopleIcon className="w-6 h-6" />}
          change={weeklyGrowth}
          colorClass="text-blue-600 dark:text-blue-400"
          description="All-time referrals"
        />
        
        <StatCard
          label="Conversion Rate"
          value={`${Number(data.metrics.conversionRate ?? 0).toFixed(1)}%`}
          icon={<TrendingUpIcon className="w-6 h-6" />}
          colorClass="text-green-800 dark:text-green-400"
          description="Success rate"
        />
        
        <StatCard
          label="Avg. Convert Time"
          value={`${Number(data.metrics.averageTimeToConvert ?? 0).toFixed(0)}h`}
          icon={<CalendarIcon className="w-6 h-6" />}
          colorClass="text-purple-700 dark:text-purple-200"
          description="Time to first action"
        />
        
        <StatCard
          label="Peak Performance"
          value={data.metrics.peakDay.count}
          icon={<EmojiEventsIcon className="w-6 h-6" />}
          colorClass="text-yellow-800 dark:text-yellow-400"
          description={new Date(data.metrics.peakDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Referral Timeline
          </h3>
          <TimelineChart data={data.timeline} />
        </div>

        {/* Tier Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tier Distribution
          </h3>
          <TierDistribution distribution={data.tierDistribution} />
        </div>
      </div>

      {/* Period Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Period Comparison
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Week</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.comparison.thisWeek}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Week</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.comparison.lastWeek}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Month</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.comparison.thisMonth}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Month</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.comparison.lastMonth}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
