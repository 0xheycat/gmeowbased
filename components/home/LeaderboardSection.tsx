'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface LeaderboardEntry {
  rank: number
  farcaster_fid: number
  username: string | null
  display_name: string | null
  pfp_url: string | null
  total_score: number
  badge_prestige: number
}

export function LeaderboardSection() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaders() {
      try {
        const res = await fetch('/api/leaderboard-v2?period=all_time&page=1&pageSize=5')
        if (!res.ok) throw new Error('Failed to fetch leaderboard')
        const result = await res.json()
        const entries = (result.data || []).map((entry: any, index: number) => ({
          ...entry,
          rank: index + 1
        }))
        setLeaders(entries)
      } catch (error) {
        console.error('Failed to load leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaders()
  }, [])

  if (loading) {
    return <LeaderboardSkeleton />
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
        Top cats 🏆
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  RANK
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  USER
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  POINTS
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  BADGES
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaders.map((leader) => (
                <tr key={leader.farcaster_fid} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {leader.rank <= 3 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-sm shadow-md">
                        {leader.rank}
                      </span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{leader.rank}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 dark:text-white font-medium">@{leader.username || leader.display_name || `User ${leader.farcaster_fid}`}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-primary-600 dark:text-primary-400 font-bold">
                      {(leader.total_score || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-gray-900 dark:text-white font-medium">{Math.floor((leader.badge_prestige || 0) / 25)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-center mt-8">
        <Link
          className="inline-flex items-center justify-center px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-semibold shadow-md hover:shadow-lg min-h-[44px]"
          href="/leaderboard"
        >
          VIEW FULL LEADERBOARD
        </Link>
      </div>
    </section>
  )
}

function LeaderboardSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-12" />
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
