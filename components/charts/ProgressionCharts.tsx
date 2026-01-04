/**
 * ProgressionCharts Component
 * @template music/charts (adapted 40%)
 * @description Historical level/rank progression with professional loading states
 * 
 * Data Flow:
 * 1. Fetch historical events from Subsquid GraphQL (useUserHistory hook)
 * 2. Client-side filtering by time period (7d/30d/all)
 * 3. Recharts renders interactive charts with professional UX
 * 
 * Professional Patterns (from music template):
 * - GPU-optimized loading states (Skeleton component with aria-live)
 * - Accessible error/empty states (role, aria-label, semantic SVG icons)
 * - Professional button groups (shadow, transitions, aria-pressed)
 * - Responsive design (mobile + desktop adaptive)
 * 
 * Usage:
 * <ProgressionCharts userAddress="0x..." />
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useUserHistory } from '@/hooks/useUserHistory'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { format } from 'date-fns'

interface ProgressionChartsProps {
  userAddress: `0x${string}`
}

type TimeFilter = '7d' | '30d' | 'all'

const TIER_NAMES = [
  'Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 
  'Diamond', 'Master', 'Grandmaster', 'Champion', 
  'Legend', 'Mythic', 'Immortal'
]

export default function ProgressionCharts({ userAddress }: ProgressionChartsProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d')
  
  // Fetch historical data from Subsquid GraphQL
  const { levelUps, rankUps, loading, error } = useUserHistory(userAddress)

  // Performance monitoring (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !loading) {
      const dataSize = (levelUps?.length || 0) + (rankUps?.length || 0)
      if (dataSize > 0) {
        console.log('[ProgressionCharts] Rendered with', dataSize, 'events')
      }
    }
  }, [loading, levelUps, rankUps])

  // Filter data by time period (client-side for performance)
  const filteredLevelUps = useMemo(() => {
    if (!levelUps || levelUps.length === 0) return []
    
    const now = Date.now()
    const cutoffMs = timeFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 
                    : timeFilter === '30d' ? 30 * 24 * 60 * 60 * 1000
                    : Infinity

    const withinTimeRange = (event: any) => {
      const eventTime = new Date(event.timestamp).getTime()
      return timeFilter === 'all' || (now - eventTime <= cutoffMs)
    }

    return levelUps
      .filter(withinTimeRange)
      .map(event => ({
        timestamp: new Date(event.timestamp).getTime(),
        level: event.newLevel,
        date: format(new Date(event.timestamp), 'MMM d, yyyy'),
        time: format(new Date(event.timestamp), 'HH:mm')
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [levelUps, timeFilter])

  const filteredRankUps = useMemo(() => {
    if (!rankUps || rankUps.length === 0) return []
    
    const now = Date.now()
    const cutoffMs = timeFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 
                    : timeFilter === '30d' ? 30 * 24 * 60 * 60 * 1000
                    : Infinity

    const withinTimeRange = (event: any) => {
      const eventTime = new Date(event.timestamp).getTime()
      return timeFilter === 'all' || (now - eventTime <= cutoffMs)
    }

    return rankUps
      .filter(withinTimeRange)
      .map(event => ({
        timestamp: new Date(event.timestamp).getTime(),
        tier: event.newTier,
        tierName: TIER_NAMES[event.newTier] || `Tier ${event.newTier}`,
        date: format(new Date(event.timestamp), 'MMM d, yyyy'),
        time: format(new Date(event.timestamp), 'HH:mm')
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [rankUps, timeFilter])

  // Professional loading state (music template pattern)
  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading progression charts">
        <div className="flex items-center justify-between">
          <Skeleton variant="rect" className="h-8 w-48" animation="wave" />
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rect" className="h-10 w-16 rounded-lg" animation="wave" />
            ))}
          </div>
        </div>
        <Skeleton variant="rect" className="h-64 rounded-lg" animation="wave" />
        <Skeleton variant="rect" className="h-64 rounded-lg" animation="wave" />
      </div>
    )
  }

  // Professional error state (music template pattern)
  if (error) {
    return (
      <div 
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <svg 
            className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
              Unable to Load Progression Charts
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">
              Failed to fetch historical data. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const hasLevelData = filteredLevelUps.length > 0
  const hasRankData = filteredRankUps.length > 0

  // Professional empty state (music template pattern)
  if (!hasLevelData && !hasRankData) {
    return (
      <div 
        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center"
        role="status"
        aria-label="No progression data available"
      >
        <svg 
          className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
          />
        </svg>
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
          No Progression Data Yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-500">
          Level up or rank up to see your progression charts here!
        </p>
      </div>
    )
  }

  return (
    <motion.div 
      className="space-y-6" 
      role="region" 
      aria-label="Progression charts"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header with time filters (music template button group) */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Progression History</h2>
        
        <div className="flex gap-2" role="group" aria-label="Time period filter">
          {(['7d', '30d', 'all'] as const).map((filter) => (
            <motion.button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                timeFilter === filter
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
              }`}
              aria-pressed={timeFilter === filter}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : 'All Time'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Level Progression Chart */}
      <AnimatePresence mode="wait">
        {hasLevelData && (
          <motion.div 
            className="bg-white/5 border border-white/10 rounded-lg p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Level Progression</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredLevelUps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff60"
                  tick={{ fill: '#ffffff80', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#ffffff60"
                  tick={{ fill: '#ffffff80', fontSize: 12 }}
                  label={{ value: 'Level', angle: -90, position: 'insideLeft', fill: '#ffffff80' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #ffffff20',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                  labelStyle={{ color: '#ffffff80' }}
                  formatter={(value: any) => [`Level ${value}`, 'Level']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3B82F6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rank Tier Progression Chart */}
      <AnimatePresence mode="wait">
        {hasRankData && (
          <motion.div 
            className="bg-white/5 border border-white/10 rounded-lg p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Rank Progression</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredRankUps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff60"
                  tick={{ fill: '#ffffff80', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#ffffff60"
                  tick={{ fill: '#ffffff80', fontSize: 12 }}
                  domain={[0, 11]}
                  tickFormatter={(value) => TIER_NAMES[value] || ''}
                  label={{ value: 'Tier', angle: -90, position: 'insideLeft', fill: '#ffffff80' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #ffffff20',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                  labelStyle={{ color: '#ffffff80' }}
                  formatter={(value: any) => [TIER_NAMES[value] || `Tier ${value}`, 'Rank']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="tier" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#8B5CF6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
