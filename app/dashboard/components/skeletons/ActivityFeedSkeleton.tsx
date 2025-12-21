'use client'

/**
 * Activity Feed Loading Skeleton
 * Professional shimmer animation (Twitter/GitHub timeline pattern)
 * Shows 10 cast cards with avatar + content skeletons
 */

export function ActivityFeedSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Timeline Feed (10 cast cards) */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
            <div className="flex items-start gap-3">
              {/* Avatar Circle */}
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 shimmer" />

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Author & Time */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                </div>

                {/* Cast Text (2-3 lines) */}
                <div className="space-y-2 mb-2">
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                  <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                  {i % 2 === 0 && (
                    <div className="h-3 w-3/5 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                  )}
                </div>

                {/* Engagement Stats */}
                <div className="flex gap-4">
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="mt-4 flex justify-between items-center">
        <div className="h-3 w-36 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
      </div>

      {/* Shimmer Animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        
        .shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(
            to right,
            rgb(229 231 235 / 1) 4%,
            rgb(243 244 246 / 1) 25%,
            rgb(229 231 235 / 1) 36%
          );
          background-size: 1000px 100%;
        }
        
        :global(.dark) .shimmer {
          background: linear-gradient(
            to right,
            rgb(55 65 81 / 1) 4%,
            rgb(75 85 99 / 1) 25%,
            rgb(55 65 81 / 1) 36%
          );
          background-size: 1000px 100%;
        }
      `}</style>
    </div>
  )
}
