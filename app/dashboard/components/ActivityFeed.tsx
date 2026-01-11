/**
 * Activity Feed Component
 * Twitter-like feed with cast cards
 * 
 * ✅ Data Caching: Shows "Updated X ago" with 30s TTL
 * ✅ Retry Logic: 3 attempts with exponential backoff (1s, 2s, 4s)
 * ✅ Professional Patterns: Twitter trending, GitHub activity dots, real-time indicators
 */

import { getActivityFeed, formatTimeAgo, truncateText } from '@/lib/api/neynar-dashboard'
import { formatNumber } from '@/lib/utils/formatters'
import { withRetry, RetryStrategies } from '@/lib/api/retry'
import { ActivityIndicator, ContextBadge } from '@/components/dashboard-patterns'
import { TimelineIcon } from '@/components/icons/timeline-icon'
import Image from 'next/image'

export async function ActivityFeed() {
  const response = await withRetry(
    () => getActivityFeed(),
    RetryStrategies.standard
  )
  const casts = response.data
  const lastUpdated = formatTimeAgo(response.cached_at)

  if (casts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TimelineIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Activity Feed</h3>
        </div>
        
        {/* Enhanced Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <TimelineIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No Activity Yet</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm">
            Complete quests, earn badges, and join the community to see activity!
          </p>
          <a
            href="/quests"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Complete Your First Quest
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
          <ActivityIndicator pulse />
          <TimelineIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Activity Feed</h3>
        </div>
        <ContextBadge>Trending Globally</ContextBadge>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {casts.map((cast, index) => (
          <div
            key={cast.hash}
            className="border-b last:border-0 pb-4 last:pb-0"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative w-10 h-10 flex-shrink-0">
                {/* GitHub-style activity dot for top 5 casts */}
                {index < 5 && (
                  <div className="absolute -top-1 -left-1">
                    <ActivityIndicator pulse={index === 0} size="sm" />
                  </div>
                )}
                <Image
                  src={cast.author.avatar}
                  alt={cast.author.username}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                {cast.author.powerBadge && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-700 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-[10px]">
                    ⚡
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Author & Time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm truncate">
                    @{cast.author.username}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTimeAgo(cast.timestamp)}
                  </span>
                </div>

                {/* Cast Text */}
                <p className="text-sm mb-2 break-words">
                  {cast.text.length > 280 ? (
                    <>
                      {truncateText(cast.text, 280)}{' '}
                      <button className="text-gray-600 dark:text-gray-400 hover:underline text-xs">
                        Read more
                      </button>
                    </>
                  ) : (
                    cast.text
                  )}
                </p>

                {/* Embeds Preview */}
                {cast.embeds.length > 0 && (
                  <div className="text-xs text-gray-500 mb-2">
                    {cast.embeds.length === 1 ? '1 embed' : `${cast.embeds.length} embeds`}
                  </div>
                )}

                {/* Engagement Stats */}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                    💬 {cast.replies}
                  </span>
                  <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                    ❤️ {cast.likes}
                  </span>
                  <span className="hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">
                    🔄 {cast.recasts}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with Cache Info */}
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
        <span>Powered by Neynar Feed API</span>
        <span className="font-medium">Updated {lastUpdated}</span>
      </div>
    </div>
  )
}
