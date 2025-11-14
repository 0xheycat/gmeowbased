'use client'

import { useState, useEffect } from 'react'
import { getAllCacheStats, clearAllCaches } from '@/lib/cache-storage'

/**
 * Cache Management Component
 * For development/debugging - shows cache stats and provides clear functionality
 * Can be added to admin panel or dev tools
 */
export function CacheManager() {
  const [stats, setStats] = useState<ReturnType<typeof getAllCacheStats> | null>(null)
  const [lastCleared, setLastCleared] = useState<Date | null>(null)

  const refreshStats = () => {
    setStats(getAllCacheStats())
  }

  const handleClearAll = () => {
    clearAllCaches()
    setLastCleared(new Date())
    refreshStats()
  }

  useEffect(() => {
    refreshStats()
    const interval = setInterval(refreshStats, 2000) // Update every 2s
    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}m`
  }

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Cache Manager</h3>
        <div className="flex gap-2">
          <button
            onClick={refreshStats}
            className="rounded-md bg-blue-600/20 px-3 py-1 text-xs text-blue-300 hover:bg-blue-600/30"
          >
            Refresh
          </button>
          <button
            onClick={handleClearAll}
            className="rounded-md bg-red-600/20 px-3 py-1 text-xs text-red-300 hover:bg-red-600/30"
          >
            Clear All
          </button>
        </div>
      </div>

      {lastCleared && (
        <div className="mb-3 rounded border border-green-500/30 bg-green-950/30 px-3 py-2 text-xs text-green-300">
          ✓ Caches cleared at {lastCleared.toLocaleTimeString()}
        </div>
      )}

      <div className="space-y-3">
        <CacheBlock
          name="Farcaster Verification"
          stats={stats.farcasterVerification}
          formatTime={formatTime}
        />
        <CacheBlock
          name="Profile Data"
          stats={stats.profileData}
          formatTime={formatTime}
        />
        <CacheBlock
          name="User Context"
          stats={stats.userContext}
          formatTime={formatTime}
        />
        <CacheBlock
          name="Quest Data"
          stats={stats.questData}
          formatTime={formatTime}
        />
        <CacheBlock
          name="Chain State"
          stats={stats.chainState}
          formatTime={formatTime}
        />
      </div>
    </div>
  )
}

function CacheBlock({
  name,
  stats,
  formatTime,
}: {
  name: string
  stats: { size: number; entries: Array<{ key: string; expiresIn: number }> }
  formatTime: (ms: number) => string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-md border border-white/5 bg-white/5 p-3">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{name}</span>
          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
            {stats.size} {stats.size === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <span className="text-xs text-slate-400">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && stats.entries.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {stats.entries.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="truncate text-slate-300" title={entry.key}>
                {entry.key.length > 30 ? `${entry.key.slice(0, 30)}...` : entry.key}
              </span>
              <span className="text-slate-500">
                {entry.expiresIn > 0 ? formatTime(entry.expiresIn) : 'expired'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
