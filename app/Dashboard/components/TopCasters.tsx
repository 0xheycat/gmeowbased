/**
 * Top Casters Component
 * 3-column grid with avatars + usernames + follower counts
 */

import { getTopCasters, formatNumber } from '@/lib/api/neynar-dashboard'
import PeopleIcon from '@mui/icons-material/People'
import Image from 'next/image'

export async function TopCasters() {
  const casters = await getTopCasters()

  if (casters.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PeopleIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Top Casters (7d)</h3>
        </div>
        <p className="text-gray-500 text-sm">No caster data available.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <PeopleIcon className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Top Casters (7d)</h3>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {casters.map((caster) => (
          <div
            key={caster.fid}
            className="flex items-center gap-3 p-4 rounded-lg border hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
          >
            {/* Avatar */}
            <div className="relative w-12 h-12 flex-shrink-0">
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

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500">
        Powered by Neynar Users API • Updated every 5 minutes
      </div>
    </div>
  )
}
