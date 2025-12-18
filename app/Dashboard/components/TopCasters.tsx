/**
 * Top Casters Component
 * 3-column grid with avatars + usernames + follower counts
 * 
 * ✅ Data Caching: Shows "Updated X ago" with 30s TTL
 * ✅ Retry Logic: 3 attempts with exponential backoff (1s, 2s, 4s)
 * ✅ Professional Patterns: LinkedIn-style relevance badges, activity indicators
 */

import { getTopCasters, formatTimeAgo } from '@/lib/api/neynar-dashboard'
import { formatNumber } from '@/lib/utils/formatters'
import { withRetry, RetryStrategies } from '@/lib/api/retry'
import { ContextBadge, ActivityIndicator } from '@/components/dashboard-patterns'
import { PeopleIcon } from '@/components/icons/people-icon'
import Image from 'next/image'

export async function TopCasters() {
  const response = await withRetry(
    () => getTopCasters(),
    RetryStrategies.standard
  )
  const casters = response.data
  const lastUpdated = formatTimeAgo(response.cached_at)

  if (casters.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PeopleIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Top Casters (7d)</h3>
        </div>
        
        {/* Enhanced Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
            <PeopleIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No Top Casters Yet</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm">
            Start casting and engaging to appear in the top casters leaderboard!
          </p>
          <a
            href="https://warpcast.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Start Casting on Warpcast
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <PeopleIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Top Casters (7d)</h3>
        </div>
        <ContextBadge>Popular on Farcaster</ContextBadge>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {casters.map((caster, index) => (
          <div
            key={caster.fid}
            className="flex items-center gap-3 p-4 rounded-lg border hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
          >
            {/* Avatar */}
            <div className="relative w-12 h-12 flex-shrink-0">
              {/* GitHub-style activity dot for top 3 */}
              {index < 3 && (
                <div className="absolute -top-1 -left-1">
                  <ActivityIndicator pulse={index === 0} size="sm" />
                </div>
              )}
              <Image
                src={caster.avatar}
                alt={caster.username}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
              {caster.powerBadge && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                  ⚡
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">@{caster.username}</div>
              <div className="text-xs text-gray-500">
                {formatNumber(caster.followerCount)} followers
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with Cache Info */}
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
        <span>Powered by Neynar Users API</span>
        <span className="font-medium">Updated {lastUpdated}</span>
      </div>
    </div>
  )
}
