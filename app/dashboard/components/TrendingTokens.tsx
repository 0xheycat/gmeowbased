/**
 * Trending Tokens Component
 * Professional table with name/price/24h change (GainersLosers pattern)
 * 
 * ✅ Data Caching: Shows "Updated X ago" with 30s TTL
 * ✅ Retry Logic: 3 attempts with exponential backoff (1s, 2s, 4s)
 * ✅ Professional Patterns: Twitter trending badges, GitHub activity dots, LinkedIn context
 */

import { getTrendingTokens, formatTimeAgo } from '@/lib/api/neynar-dashboard'
import { formatNumber } from '@/lib/utils/formatters'
import { withRetry, RetryStrategies } from '@/lib/api/retry'
import { TrendingBadge, ActivityIndicator, ContextBadge } from '@/components/dashboard-patterns'
import { TrendingUpIcon } from '@/components/icons/trending-up-icon'
import { cn } from '@/lib/utils'

export async function TrendingTokens() {
  const response = await withRetry(
    () => getTrendingTokens(),
    RetryStrategies.standard
  )
  const tokens = response.data
  const lastUpdated = formatTimeAgo(response.cached_at)

  if (tokens.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUpIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Trending Tokens (24h)</h3>
        </div>
        
        {/* Enhanced Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <TrendingUpIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No Trending Tokens Yet</h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm">
            Be the first to discover and trade trending tokens on Base!
          </p>
          <a
            href="https://www.base.org/ecosystem"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Explore Base Tokens
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
          <TrendingUpIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Trending Tokens (24h)</h3>
        </div>
        <div className="flex items-center gap-2">
          <ContextBadge>Base Chain</ContextBadge>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-xs text-gray-500 border-b">
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-right py-2">Price (USD)</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token, index) => {
              // Twitter-style trending logic (top 3 get badges)
              const trendingBadge = index === 0 ? 'hot' : index === 1 ? 'rising' : index === 2 ? 'new' : null
              
              return (
                <tr
                  key={token.address}
                  className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {/* Name & Symbol */}
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {token.name}
                          {trendingBadge && <TrendingBadge variant={trendingBadge as 'hot' | 'rising' | 'new'} />}
                        </div>
                        <div className="text-xs text-gray-500">{token.symbol}</div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="text-right">
                    <div className="font-mono">
                      ${token.price < 0.01 
                        ? token.price.toFixed(8) 
                        : token.price < 1 
                        ? token.price.toFixed(6)
                        : token.price.toFixed(2)}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with Cache Info */}
      <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
        <span>Powered by Neynar Trending Fungibles API</span>
        <span className="font-medium">Updated {lastUpdated}</span>
      </div>
    </div>
  )
}
