/**
 * Trending Tokens Component
 * Professional table with name/price/24h change (GainersLosers pattern)
 */

import { getTrendingTokens, formatVolume } from '@/lib/api/neynar-dashboard'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export async function TrendingTokens() {
  const tokens = await getTrendingTokens()

  if (tokens.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Trending Tokens (24h)</h3>
        </div>
        <p className="text-gray-500 text-sm">No trending tokens available at the moment.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Trending Tokens (24h)</h3>
        </div>
        <span className="text-xs text-gray-500">Base Chain</span>
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
            {tokens.map((token) => (
              <tr
                key={token.address}
                className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {/* Name & Symbol */}
                <td className="py-3">
                  <div className="font-semibold">{token.name}</div>
                  <div className="text-xs text-gray-500">{token.symbol}</div>
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500">
        Powered by Neynar Trending Fungibles API • Updated every 5 minutes
      </div>
    </div>
  )
}
