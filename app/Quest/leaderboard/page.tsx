'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkle } from '@phosphor-icons/react'
import { buildFrameShareUrl, openWarpcastComposer, type FrameShareInput } from '@/lib/share'

type Row = {
  rank: number
  address: string
  chain: string
  points: number
  name?: string
  pfpUrl?: string
  farcasterFid?: number
  completed?: number
  rewards?: number
  seasonAlloc?: number
}

export default function QuestLeaderboardPage() {
  const { chain, id } = useParams()
  // Normalize params (Next.js types can be string | string[])
  const chainStr = (Array.isArray(chain) ? chain[0] : chain) || 'base'
  const idStr = Array.isArray(id) ? id[0] : id
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState('all')
  const [offset, setOffset] = useState(0)
  const [limit] = useState(20)
  const [seasons, setSeasons] = useState<any[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const [global, setGlobal] = useState(false)
  const prevRankRef = useRef<Record<string, number>>({})

  // Load seasons for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/seasons?chain=${chainStr}`)
        const j = await res.json()
        if (j.ok) {
          setSeasons(j.seasons || [])
          const cur = (j.seasons || []).find((s: any) => s.current)
          if (cur) setSelectedSeason(String(cur.id))
        }
      } catch {
        // ignore
      }
    })()
  }, [chainStr])

  // load leaderboard
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainStr, offset, selectedSeason, global])

  async function load() {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      q.set('chain', chainStr)
      q.set('limit', String(limit))
      q.set('offset', String(offset))
      if (selectedSeason) q.set('season', selectedSeason)
      if (global) q.set('global', '1')
      // quest id not used on server side here, but keep URL semantics
      const res = await fetch(`/api/leaderboard?${q.toString()}`)
      const j = await res.json()
      if (!j.ok) {
        setRows([])
      } else {
        const top = j.top as Row[]
        // compare prev ranks to show rankups
        const prev = prevRankRef.current
        const updated = top.map(r => {
          const prevRank = prev[r.address] ?? Infinity
          return { ...r, rankUp: prevRank > r.rank }
        })
        // store current ranks
        const map: Record<string, number> = {}
        top.forEach(t => (map[t.address] = t.rank))
        prevRankRef.current = map
        setRows(updated)
      }
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = rows.filter(r => {
    if (filter === 'all') return true
    if (filter === 'onchain') return (r.chain || '').toLowerCase().includes('base') === false ? false : true // just example
    return String(r.chain).toLowerCase().includes(filter)
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-gray-100 py-10 px-4">
      <style>{`
        .pixel-card { border:2px solid rgba(255,255,255,0.06); background: linear-gradient(180deg, rgba(12,6,20,0.6), rgba(6,4,10,0.5)); padding:12px; border-radius:10px }
        .pixel-pill { padding:6px 10px; border-radius:999px; background: rgba(255,255,255,0.03); font-weight:700; }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">🏆 Quest Leaderboard</h1>
            <p className="text-sm text-gray-400">Quest {idStr} — Chain: {chainStr} {global ? '(global)' : ''}</p>
          </div>

          <div className="flex items-center gap-2">
            <select className="pixel-pill" value={selectedSeason || ''} onChange={(e) => setSelectedSeason(e.target.value || null)} aria-label="Select season">
              <option value="">All seasons</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{`Season ${s.id} ${s.current ? '(current)' : ''}`}</option>
              ))}
            </select>

            <button className={`pixel-pill ${global ? 'bg-indigo-600 text-slate-900 dark:text-slate-950 dark:text-white' : ''}`} onClick={() => setGlobal(v => !v)}>
              {global ? 'Global' : 'Chain'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all','follow','recast','reply','like','frame','onchain'].map(f => (
            <button key={f} className={`px-3 py-1 rounded-md text-sm ${filter===f ? 'bg-indigo-600 text-slate-900 dark:text-slate-950 dark:text-white' : 'bg-slate-100/90 dark:bg-white/5'}`} onClick={() => setFilter(f)}>{f === 'all' ? 'All Types' : f}</button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(6)].map((_,i)=> <div key={i} className="h-16 rounded bg-gray-800/40" />)}
            </div>
          ) : filtered.length ? (
            filtered.map((r, i) => {
              const top3 = i < 3
              const progress = Math.min((r.points % 100) / 100 * 100, 100)
              return (
                <motion.div key={r.address} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={`relative pixel-card flex items-center justify-between gap-4`}>
                  {top3 && <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute -top-3 -left-3"><Sparkle size={26} weight="fill" className="text-yellow-400" /></motion.div>}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-md bg-gray-800 flex items-center justify-center overflow-hidden">
                      {r.pfpUrl ? (
                        <Image src={r.pfpUrl} alt="pfp" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="text-xs font-bold">{r.name ? r.name.slice(0,2).toUpperCase() : r.address.slice(2,6)}</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-bold">{r.name || `${r.address.slice(0,6)}…${r.address.slice(-4)}`}</div>
                        <div className="text-xs text-gray-400">#{r.rank}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">{r.chain}</div>
                      </div>
                      <div className="text-sm text-gray-400">XP: {r.points} • Quests: {r.completed ?? 0} • Rewards: {r.rewards ?? 0}</div>
                      <div className="mt-2 w-full bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 h-2 rounded overflow-hidden"><div style={{ width: `${progress}%` }} className={`h-full bg-gradient-to-r from-indigo-400 to-emerald-400`} /></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-sm text-emerald-400"
                      onClick={() => {
                        const shareChain = (global ? 'all' : chainStr) as FrameShareInput['chain']
                        const frameUrl = buildFrameShareUrl({
                          type: 'leaderboards',
                          chain: shareChain,
                          id: idStr,
                          extra: { rank: r.rank, quest: idStr },
                        })
                        if (!frameUrl) return
                        const text = `Flexing quest ${idStr || ''} rank #${r.rank} on GMEOW with ${r.points} XP.`
                        void openWarpcastComposer(text.trim(), frameUrl)
                      }}
                    >
                      Flex
                    </button>

                    {/* Rank up micro-pop */}
                    <AnimatePresence>
                      {/* show a transient bubble when rankUp true */}
                      {/* rankUp property is ephemeral from client load logic */}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center">No players yet — be the first!</div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">Showing {offset + 1}–{Math.min(offset + limit, rows.length)} of {rows.length}</div>
          <div className="flex gap-2">
            <button className="pixel-pill" onClick={() => setOffset(o => Math.max(0, o - limit))} disabled={offset === 0}>Prev</button>
            <button className="pixel-pill" onClick={() => setOffset(o => o + limit)} disabled={rows.length < limit}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
