'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react'
import { CHAIN_KEYS, CHAIN_LABEL, type ChainKey } from '@/lib/gm-utils'
import { buildFrameShareUrl, openWarpcastComposer, type FrameShareInput } from '@/lib/share'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'

type FilterKey = 'all' | 'farcaster' | 'onchain'

type PlayerRow = {
  rank: number
  address: `0x${string}`
  name?: string
  chain: ChainKey
  points: number
  rewards?: number
  completed?: number
  farcasterFid?: number
  pfpUrl?: string
  seasonAlloc?: number
  rankUp?: boolean
}

type SeasonInfo = {
  id: number
  current: boolean
  startTime: number
  endTime: number
  totalRewards: string
  isActive: boolean
  rewardToken: string
  finalized: boolean
}

type LeaderboardMeta = {
  total: number
  updatedAt: number | null
}

const ROW_LIMIT = 20
const NEXT_MILESTONE = 1000

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All pilots' },
  { key: 'farcaster', label: 'Farcaster linked' },
  { key: 'onchain', label: 'Onchain earned' },
]

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'just now'
  const diff = Date.now() - timestamp
  if (diff <= 0) return 'just now'
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h ago`
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`
  return `${seconds}s ago`
}

function formatDisplayName(row: PlayerRow): string {
  if (row.name && row.name.trim().length > 0) return row.name
  const addr = row.address
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function MegaLeaderboard() {
  const [rows, setRows] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [global, setGlobal] = useState(true)
  const [selectedChain, setSelectedChain] = useState<ChainKey>('base')
  const [seasons, setSeasons] = useState<SeasonInfo[]>([])
  const [season, setSeason] = useState<string>('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [offset, setOffset] = useState(0)
  const [seasonSupported, setSeasonSupported] = useState<boolean | null>(null)
  const [profileSupported, setProfileSupported] = useState<boolean | null>(null)
  const [meta, setMeta] = useState<LeaderboardMeta>({ total: 0, updatedAt: null })
  const [error, setError] = useState<string | null>(null)
  const [xpOverlay, setXpOverlay] = useState<XpEventPayload | null>(null)
  const prevRankRef = useRef<Record<string, number>>({})

  const currentSeason = useMemo(() => seasons.find(s => s.current), [seasons])

  const loadLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (global) params.set('global', '1')
      else params.set('chain', selectedChain)
      if (season) params.set('season', season)
      params.set('limit', String(ROW_LIMIT))
      params.set('offset', String(offset))

      const res = await fetch(`/api/leaderboard?${params.toString()}`, { cache: 'no-store' })
      const j = await res.json()
      if (!j.ok) throw new Error(j.reason || 'leaderboard_unavailable')

      setSeasonSupported(Boolean(j.seasonSupported))
      setProfileSupported(Boolean(j.profileSupported))
      if (j.seasonSupported === false && season) setSeason('')

      setMeta({ total: Number(j.total ?? 0), updatedAt: Number(j.updatedAt ?? Date.now()) })

      const prevRanks = prevRankRef.current
      const nextRanks: Record<string, number> = {}
      const resolvedRows: PlayerRow[] = (j.top ?? []).map((entry: any) => {
        const address = (entry.address ?? '0x0000000000000000000000000000000000000000') as `0x${string}`
        const addressKey = address.toLowerCase()
        const rankNumber = Number(entry.rank ?? 0)
        if (addressKey) nextRanks[addressKey] = rankNumber
        return {
          rank: rankNumber,
          address,
          chain: (entry.chain ?? selectedChain) as ChainKey,
          name: entry.name ?? '',
          points: Number(entry.points ?? 0),
          rewards: entry.rewards != null ? Number(entry.rewards) : undefined,
          completed: entry.completed != null ? Number(entry.completed) : undefined,
          farcasterFid: entry.farcasterFid != null ? Number(entry.farcasterFid) : undefined,
          pfpUrl: entry.pfpUrl ?? '',
          seasonAlloc: entry.seasonAlloc != null ? Number(entry.seasonAlloc) : undefined,
          rankUp: prevRanks[addressKey] !== undefined ? prevRanks[addressKey] > rankNumber : false,
        }
      })

      prevRankRef.current = nextRanks
      setRows(resolvedRows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Leaderboards are offline'
      setError(message)
      setRows([])
      setMeta({ total: 0, updatedAt: null })
    } finally {
      setLoading(false)
    }
  }, [global, selectedChain, season, offset])

  useEffect(() => {
    void loadLeaderboard()
  }, [loadLeaderboard])

  useEffect(() => {
    setOffset(0)
  }, [global, selectedChain, season, filter])

  useEffect(() => {
    if (seasonSupported !== true) {
      setSeasons([])
      if (seasonSupported === false && season) setSeason('')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/seasons?chain=${selectedChain}`)
        const j = await res.json()
        if (!cancelled && j.ok) {
          const payload = (j.seasons ?? []) as SeasonInfo[]
          setSeasons(payload)
          if (!season) {
            const active = payload.find(s => s.current)
            if (active) setSeason('current')
          }
        }
      } catch (err) {
        if (!cancelled) console.error('season load fail', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedChain, seasonSupported, season])

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (filter === 'farcaster') return Boolean(row.farcasterFid)
      if (filter === 'onchain') return row.points > 0
      return true
    })
  }, [rows, filter])

  const canPageBackward = offset > 0
  const canPageForward = offset + ROW_LIMIT < meta.total

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05060f] via-[#0c1422] to-black text-gray-100 py-10 px-4 relative overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-extrabold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-[#7ef3c7] via-[#7c5cff] to-[#40baff]">🛰️ Command Roster</h1>
          <p className="text-sm text-gray-400">Track the fiercest GM pilots across every chain. Share your ascent when you breach the top ranks.</p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-3">
          {seasonSupported && (
            <select
              className="roster-chip roster-select text-sm text-gray-200 min-h-6"
              value={season}
              onChange={event => setSeason(event.target.value)}
              aria-label="Select season"
            >
              <option value="">All seasons</option>
              {currentSeason && <option value="current">Current season</option>}
              {seasons.map(s => (
                <option key={s.id} value={String(s.id)}>
                  {`Season ${s.id}${s.current ? ' · active' : ''}`}
                </option>
              ))}
            </select>
          )}

          <select
            className="roster-chip roster-select text-sm text-gray-200 min-h-6"
            value={selectedChain}
            onChange={event => setSelectedChain(event.target.value as ChainKey)}
            disabled={global}
            aria-label="Select blockchain network"
          >
            {CHAIN_KEYS.map(chainKey => (
              <option key={chainKey} value={chainKey}>
                {CHAIN_LABEL[chainKey]}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`roster-chip text-sm ${global ? 'is-active' : ''}`}
            onClick={() => setGlobal(value => !value)}
          >
            {global ? 'Global view' : 'Per-chain view'}
          </button>

          <div className="flex gap-2 ml-auto">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={`roster-chip text-xs sm:text-sm ${filter === option.key ? 'is-active' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-300">
          <div className="roster-stat">
            <span className="uppercase tracking-wide text-[10px] text-gray-500 dark:text-gray-400">Pilots tracked</span>
            <strong>{meta.total.toLocaleString()}</strong>
          </div>
          <div className="roster-stat">
            <span className="uppercase tracking-wide text-[10px] text-gray-500 dark:text-gray-400">Roster mode</span>
            <strong>{global ? 'All chains' : CHAIN_LABEL[selectedChain]}</strong>
          </div>
          <div className="roster-stat">
            <span className="uppercase tracking-wide text-[10px] text-gray-500 dark:text-gray-400">Synced</span>
            <strong>{formatRelativeTime(meta.updatedAt)}</strong>
          </div>
        </div>

        {seasonSupported === false && (
          <div className="roster-alert">
            Seasonal breakdowns are disabled on this contract. Switch back to “All seasons” to view the unified ledger.
          </div>
        )}

        {profileSupported === false && (
          <div className="roster-alert border-emerald-400/30 bg-emerald-950/40 text-emerald-200">
            Profile art enrichment is unavailable for this deployment. Addresses will display without avatars until the ABI exposes `getUserProfile`.
          </div>
        )}

        {error && <div className="roster-alert border-red-400/40 bg-red-950/40 text-red-200">{error}</div>}

        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-20 bg-slate-100/5 dark:bg-white/5 rounded-xl" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="roster-empty">
              <p className="text-sm text-gray-300">No pilots match this filter yet. Tune your scan or check back after the next quest wave.</p>
            </div>
          ) : (
            filteredRows.map((row, index) => {
              const topThree = row.rank <= 3
              const progress = Math.min(100, ((row.points % NEXT_MILESTONE) / NEXT_MILESTONE) * 100)
              const xpProgress = row.points % NEXT_MILESTONE
              const xpToNext = xpProgress === 0 ? NEXT_MILESTONE : NEXT_MILESTONE - xpProgress
              const shareChain = (global ? 'all' : selectedChain) as FrameShareInput['chain']
              const shareLabel = global ? 'across every chain' : `on ${CHAIN_LABEL[row.chain]}`
              const displayName = formatDisplayName(row)
              const milestoneBlurb = xpToNext === NEXT_MILESTONE ? 'Milestone cycle freshly reset.' : `${xpToNext.toLocaleString()} XP until the next milestone.`
              const flexText = `🛰️ Command Roster ping! ${displayName} is #${row.rank} ${shareLabel} with ${row.points.toLocaleString()} XP, ${row.completed ?? 0} quests, ${row.rewards ?? 0} rewards. ${milestoneBlurb} Join the sortie?`

              return (
                <motion.div
                  key={row.address}
                  className="roster-orbit-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  {topThree && (
                    <motion.div
                      className="absolute -top-3 -left-3"
                      animate={{ rotate: [0, 12, -12, 0] }}
                      transition={{ repeat: Infinity, duration: 3.4 }}
                    >
                      <Sparkle size={30} weight="fill" className="text-yellow-300 roster-sparkle" />
                    </motion.div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-black dark:bg-slate-950/60 border border-white dark:border-slate-700/10 overflow-hidden flex items-center justify-center">
                      {row.pfpUrl ? (
                        <Image src={row.pfpUrl} alt="pfp" width={56} height={56} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <span className="text-sm font-semibold text-gray-300">{displayName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-950 dark:text-white">{displayName}</span>
                        <span className="text-xs text-gray-400">#{row.rank}</span>
                        <span className="roster-chip text-[10px] uppercase tracking-wider bg-slate-100/10 dark:bg-white/5 text-gray-200">
                          {CHAIN_LABEL[row.chain]}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {row.points.toLocaleString()} XP · {row.completed ?? 0} quests · {row.rewards ?? 0} rewards
                      </div>
                      <div className="roster-progress-track">
                        <div className="roster-progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="roster-chip text-xs sm:text-sm"
                      onClick={() => {
                        const frameUrl = buildFrameShareUrl({
                          type: 'leaderboards',
                          chain: shareChain,
                          extra: { rank: row.rank },
                        })
                        if (!frameUrl) return
                        void openWarpcastComposer(flexText, frameUrl)
                      }}
                    >
                      Flex
                    </button>
                  </div>

                  <AnimatePresence>
                    {row.rankUp && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute -top-3 right-3 bg-emerald-400 text-black dark:text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                      >
                        Rank up
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-300 pt-6 gap-4">
          <div>
            Showing {filteredRows.length === 0 ? 0 : offset + 1}–{offset + filteredRows.length} of {meta.total.toLocaleString()}
          </div>
          <div className="roster-pagination">
            <button
              className="roster-chip"
              disabled={!canPageBackward || loading}
              onClick={() => setOffset(prev => Math.max(0, prev - ROW_LIMIT))}
            >
              Prev
            </button>
            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Offset {offset}</span>
            <button
              className="roster-chip"
              disabled={!canPageForward || loading}
              onClick={() => setOffset(prev => prev + ROW_LIMIT)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="roster-backdrop" />
      <XPEventOverlay open={Boolean(xpOverlay)} payload={xpOverlay} onClose={() => setXpOverlay(null)} />
    </div>
  )
}
