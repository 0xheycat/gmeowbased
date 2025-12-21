/**
 * Trending Channels Component
 * 3-column grid with icons + names + member counts
 * 
 * ✅ Data Caching: Shows "Updated X ago" with 30s TTL
 * ✅ Retry Logic: 3 attempts with exponential backoff (1s, 2s, 4s)
 * ✅ Professional Patterns: Twitter trending badges, GitHub activity dots, LinkedIn context
 */

import { getTrendingChannels, truncateText, formatTimeAgo } from '@/lib/api/neynar-dashboard'
import { formatNumber } from '@/lib/utils/formatters'
import { withRetry, RetryStrategies } from '@/lib/api/retry'
import { TrendingBadge, ActivityIndicator, ContextBadge } from '@/components/dashboard-patterns'
import { TagIcon } from '@/components/icons/tag-icon'
import Image from 'next/image'

export async function TrendingChannels() {
  const response = await withRetry(
    () => getTrendingChannels(),
    RetryStrategies.standard
  )
  const channels = response.data
  const lastUpdated = formatTimeAgo(response.cached_at)

  if (channels.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Trending Channels (24h)</h3>
        </div>
        
        {/* Enhanced Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
            <TagIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No Trending Channels Yet</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm">
            Create a channel or join existing ones to see trending communities!
          </p>
          <a
            href="https://warpcast.com/~/channels"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Explore Channels
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
          <TagIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Trending Channels (24h)</h3>
        </div>
        <ContextBadge>Communities on Warpcast</ContextBadge>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel, index) => {
          // Twitter-style trending logic (top 3 get badges)
          const trendingBadge = index === 0 ? 'hot' : index === 1 ? 'rising' : index === 2 ? 'new' : null
          
          return (
            <div
              key={channel.id}
              className="flex items-start gap-3 p-4 rounded-lg border hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer"
            >
              {/* Icon */}
              <div className="relative w-12 h-12 flex-shrink-0">
                {/* GitHub-style activity dot for top 3 */}
                {index < 3 && (
                  <div className="absolute -top-1 -left-1">
                    <ActivityIndicator pulse={index === 0} size="sm" />
                  </div>
                )}
                <Image
                  src={channel.image}
                  alt={channel.name}
                  width={48}
                  height={48}
                  className="rounded object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate flex items-center gap-2">
                  /{channel.id}
                  {trendingBadge && <TrendingBadge variant={trendingBadge as 'hot' | 'rising' | 'new'} />}
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {formatNumber(channel.memberCount)} members
                </div>
                {channel.description && (
                  <div className="text-xs text-gray-400 line-clamp-2">
                    {truncateText(channel.description, 100)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer with Cache Info */}
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
        <span>Powered by Neynar Channels API</span>
        <span className="font-medium">Updated {lastUpdated}</span>
      </div>
    </div>
  )
}
