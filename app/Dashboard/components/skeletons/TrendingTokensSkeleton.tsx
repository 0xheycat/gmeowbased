'use client'

/**
 * Trending Tokens Loading Skeleton
 * Professional shimmer animation (LinkedIn/GitHub pattern)
 * Shows 3 token card skeletons in table format
 */

export function TrendingTokensSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Table Header Skeleton */}
      <div className="flex justify-between border-b pb-2 mb-3">
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Token Rows (3 shimmer cards) */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b last:border-0">
            {/* Name & Symbol */}
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 shimmer" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
            </div>

            {/* Price */}
            <div className="text-right">
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="mt-4 flex justify-between items-center">
        <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded shimmer" />
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
