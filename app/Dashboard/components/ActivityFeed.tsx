/**
 * Activity Feed Component
 * Twitter-like feed with cast cards
 */

import { getActivityFeed, formatTimeAgo, truncateText } from '@/lib/api/neynar-dashboard'
import { Activity } from 'lucide-react'
import Image from 'next/image'

export async function ActivityFeed() {
  const casts = await getActivityFeed()

  if (casts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Activity Feed</h3>
        </div>
        <p className="text-gray-500 text-sm">No activity available.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Activity Feed</h3>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {casts.map((cast) => (
          <div
            key={cast.hash}
            className="border-b last:border-0 pb-4 last:pb-0"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image
                  src={cast.author.avatar}
                  alt={cast.author.username}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                {cast.author.powerBadge && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-[10px]">
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
                      <button className="text-blue-500 hover:underline text-xs">
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
                  <span className="hover:text-blue-500 cursor-pointer">
                    💬 {cast.replies}
                  </span>
                  <span className="hover:text-red-500 cursor-pointer">
                    ❤️ {cast.likes}
                  </span>
                  <span className="hover:text-green-500 cursor-pointer">
                    🔄 {cast.recasts}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500">
        Powered by Neynar Feed API • Updated every 5 minutes
      </div>
    </div>
  )
}
