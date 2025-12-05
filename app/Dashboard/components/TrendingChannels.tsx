/**
 * Trending Channels Component
 * 3-column grid with icons + names + member counts
 */

import { getTrendingChannels, formatNumber, truncateText } from '@/lib/api/neynar-dashboard'
import TagIcon from '@mui/icons-material/Tag'
import Image from 'next/image'

export async function TrendingChannels() {
  const channels = await getTrendingChannels()

  if (channels.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TagIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Trending Channels (24h)</h3>
        </div>
        <p className="text-gray-500 text-sm">No trending channels available.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TagIcon className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Trending Channels (24h)</h3>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="flex items-start gap-3 p-4 rounded-lg border hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer"
          >
            {/* Icon */}
            <div className="relative w-12 h-12 flex-shrink-0">
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
              <div className="font-semibold truncate">/{channel.id}</div>
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
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500">
        Powered by Neynar Channels API • Updated every 5 minutes
      </div>
    </div>
  )
}
