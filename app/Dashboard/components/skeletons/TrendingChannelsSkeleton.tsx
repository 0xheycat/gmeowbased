'use client'

/**
 * Trending Channels Loading Skeleton
 * Professional shimmer animation (LinkedIn/GitHub pattern)
 * Shows 12 channel cards in 3-column grid with channel icons
 */

export function TrendingChannelsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-6 w-44 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Grid of 12 Channels (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
            {/* Channel Icon Square */}
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0 shimmer" />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-2 shimmer" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 shimmer" />
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="mt-4 flex justify-between items-center">
        <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
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
