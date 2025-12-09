'use client'

import { useEffect, useState } from 'react'
import { useAnimatedCount } from '@/hooks/useAnimatedCount'

interface PlatformStatsData {
  activeUsers: number
  pointsEarnedWeek: number
  activeGuilds: number
  lastUpdated: string
}

export function PlatformStats() {
  const [stats, setStats] = useState<PlatformStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        const res = await fetch('/api/analytics/summary')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <PlatformStatsSkeleton />
  }

  if (error) {
    return null // Fail silently on homepage
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Cats"
          value={stats?.activeUsers || 0}
          description="Weekly unique users"
          gradient="from-primary-500 to-primary-600"
        />
        <StatCard
          title="Points Earned"
          value={stats?.pointsEarnedWeek || 0}
          description="Past 7 days"
          gradient="from-accent-500 to-accent-600"
        />
        <StatCard
          title="Guilds Competing"
          value={stats?.activeGuilds || 0}
          description="Active teams"
          gradient="from-green-500 to-green-600"
        />
      </div>
    </section>
  )
}

interface StatCardProps {
  title: string
  value: number
  description: string
  gradient: string
}

function StatCard({ title, value, description, gradient }: StatCardProps) {
  const animatedValue = useAnimatedCount(value, 1200)

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700">
      {/* Gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />

      <div className="relative z-10">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</h3>
        <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
          {animatedValue.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">{description}</p>
      </div>

      {/* Background decoration */}
      <div className={`absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-full`} />
    </div>
  )
}

function PlatformStatsSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
