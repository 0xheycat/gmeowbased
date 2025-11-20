'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkle } from 'phosphor-react'
import { Progress } from '@/components/ui/progress'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'

type Row = {
  rank: number
  address: string
  points: number
  rewards: number
  completed: number
  fid?: number
  seasonAllocation?: number
  byChain?: Record<string, { points: number; rewards: number; completed: number }>
}

export function ContractLeaderboard() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [season, setSeason] = useState<string>('') // '', 'current', numeric id
  const [includeFid, setIncludeFid] = useState(false)
  const [error, setError] = useState('')

  async function fetchPage(off = 0, lim = 25, seasonParam = '') {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      qs.set('offset', String(off))
      qs.set('limit', String(lim))
      if (seasonParam) qs.set('season', seasonParam)
      if (includeFid) qs.set('includeFid', '1')

      // Use the correct route: /api/leaderboard
      const url = `/api/leaderboard?${qs.toString()}`
      const res = await fetch(url, { cache: 'no-store' })

      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        const text = await res.text()
        throw new Error(`API ${res.status} ${res.statusText}. Body: ${text.slice(0, 200)}`)
      }
      const j = await res.json()
      if (!j?.ok) throw new Error(j?.reason || 'failed')

      setRows(j.rows || [])
      setTotal(j.total || 0)
      setOffset(j.offset ?? off)
      setLimit(j.limit ?? lim)
    } catch (e: any) {
      setError(e?.message || 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage(offset, limit, season)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeFid, season])

  const handlePrev = () => {
    const n = Math.max(0, offset - limit)
    fetchPage(n, limit, season)
  }
  const handleNext = () => {
    const n = offset + limit
    if (n >= total) return
    fetchPage(n, limit, season)
  }

  const exportCsv = () => {
    const qs = new URLSearchParams()
    qs.set('offset', String(offset))
    qs.set('limit', String(limit))
    if (season) qs.set('season', season)
    if (includeFid) qs.set('includeFid', '1')
    qs.set('export', 'csv')
    // Corrected path (no /global)
    window.open(`/api/leaderboard?${qs.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs sm:text-sm text-gray-400">Season</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="pixel-input px-2 py-1"
            aria-label="Season"
          >
            <option value="">All time</option>
            <option value="current">Current season</option>
          </select>

          <label className="ml-2 text-xs sm:text-sm text-gray-400 flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeFid}
              onChange={(e) => setIncludeFid(e.target.checked)}
            />
            Resolve FID
          </label>

          <label className="ml-2 text-xs sm:text-sm text-gray-400 flex items-center gap-2">
            Per page
            <select
              value={limit}
              onChange={(e) => {
                const n = Math.max(1, Math.min(500, Number(e.target.value) || 25))
                setLimit(n)
                fetchPage(0, n, season)
              }}
              className="pixel-input px-2 py-1"
            >
              {[25, 50, 100, 200].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={exportCsv} className="pixel-btn pixel-btn-primary">
            Export CSV
          </button>
          <button onClick={() => fetchPage(0, limit, season)} className="pixel-btn">
            Refresh
          </button>
        </div>
      </div>

      {loading ? <p className="text-center text-gray-400 animate-pulse">Loading...</p> : null}
      {error ? <div className="text-red-400 break-words">{error}</div> : null}

      {/* Rows */}
      <div className="space-y-3">
        {rows.map((u, i) => {
          const top3 = i < 3 && offset === 0
          const nextGoal = Math.ceil((u.points || 0) / 100) * 100 + 100
          const progress = nextGoal > 0 ? Math.min(((u.points || 0) / nextGoal) * 100, 100) : 0
          return (
            <motion.div
              key={`${u.address}-${u.rank}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`relative flex justify-between items-center p-4 rounded border ${
                top3
                  ? 'border-yellow-400/40 bg-yellow-400/10'
                  : 'border-gray-800 bg-gray-900/60 hover:border-indigo-500/40'
              }`}
            >
              {top3 && (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="absolute -top-2 -left-2"
                >
                  <Sparkle size={22} className="text-yellow-400" />
                </motion.div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-lg text-emerald-400">#{u.rank}</div>
                  <div className="text-sm text-gray-300">
                    {u.address}
                    {u.fid ? ` • fid:${u.fid}` : ''}
                  </div>
                </div>

                <div className="mt-2">
                  <Progress value={progress} className="h-2 bg-gray-800" />
                  <div className="text-xs text-gray-400 mt-1">
                    {u.points} XP — next {nextGoal}
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-2 flex gap-4 flex-wrap">
                  <div>🏅 {u.rewards}</div>
                  <div>📜 {u.completed} completed</div>
                  {typeof u.seasonAllocation !== 'undefined' && (
                    <div>🔸 seasonAlloc: {u.seasonAllocation}</div>
                  )}
                </div>

                {u.byChain && (
                  <div className="mt-2 text-[11px] text-gray-500">
                    {Object.entries(u.byChain).map(([chain, d]) => (
                      <span key={chain} className="mr-3">
                        {chain.toUpperCase()}: {d.points} XP / {d.completed}Q
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ml-4">
                <button
                  type="button"
                  className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
                  onClick={() => {
                    const frameUrl = buildFrameShareUrl({ type: 'leaderboards', chain: 'base', extra: { rank: u.rank } })
                    if (!frameUrl) return
                    const text = `Flexing as #${u.rank} on the GMEOW leaderboard with ${u.points} XP.`
                    void openWarpcastComposer(text, frameUrl)
                  }}
                >
                  Flex
                </button>
              </div>

              {top3 && (
                <motion.div
                  initial={{ opacity: 0.1 }}
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-0 bg-yellow-400/5 blur-xl pointer-events-none"
                />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-400">
          Showing {total ? offset + 1 : 0} – {Math.min(offset + limit, total)} of {total}
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrev} disabled={offset === 0 || loading} className="pixel-btn disabled:opacity-50">
            Prev
          </button>
          <button
            onClick={handleNext}
            disabled={offset + limit >= total || loading}
            className="pixel-btn disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}