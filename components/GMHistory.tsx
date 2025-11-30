'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAccount, useConfig } from 'wagmi'
import { getPublicClient } from '@wagmi/core'
import { parseAbiItem } from 'viem' // add
import {
  GM_CONTRACT_ABI,
  getContractAddress,
  CHAIN_IDS,
  type ChainKey,
} from '@/lib/gmeow-utils'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'
import { chainStateCache } from '@/lib/cache-storage'

type UserStatsTuple = readonly [
  bigint,          // lastGMTime
  bigint,          // streak
  bigint,          // totalPoints
  bigint,          // frozenUntil
  `0x${string}`,   // referrer
  bigint,          // teamId
  bigint,          // stakedPoints
  bigint,          // stakingMultiplier
  boolean          // registered
]

interface GMHistoryProps {
  user: {
    fid: number
    username?: string
    displayName?: string
  }
  address?: `0x${string}` | null
}

const SUPPORTED_CHAINS: ChainKey[] = ['base', 'unichain', 'celo', 'ink', 'op']
const CHAIN_LABEL: Record<ChainKey, string> = {
  base: 'Base',
  unichain: 'Unichain',
  celo: 'Celo',
  ink: 'Ink',
  op: 'Optimism',
}
const EXPLORER_TX: Record<ChainKey, (h: `0x${string}`) => string> = {
  base: (h) => `https://basescan.org/tx/${h}`,
  unichain: (h) => `https://uniscan.xyz/tx/${h}`,
  celo: (h) => `https://celoscan.io/tx/${h}`,
  ink: (h) => `https://explorer.inkonchain.com/tx/${h}`,
  op: (h) => `https://optimistic.etherscan.io/tx/${h}`,
}

type GMRecord = {
  date: string
  timestamp?: number
  txHash?: `0x${string}`
  streak: number
  chain: ChainKey
}

export function GMHistory({ user, address: propAddress }: GMHistoryProps) {
  const { address: connectedAddress } = useAccount()
  const wagmiConfig = useConfig()
  const [history, setHistory] = useState<GMRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const pushNotification = useLegacyNotificationAdapter()
  const lastAddressRef = useRef<string | null>(null)
  const [autoHydrate, setAutoHydrate] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const trackedAddress = useMemo<`0x${string}` | null>(() => {
    if (propAddress) return propAddress
    return connectedAddress ?? null
  }, [propAddress, connectedAddress])

  const formatDate = (value: number | string) => {
    const d = typeof value === 'number' ? new Date(value) : new Date(value)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const loadHistory = useCallback(async (address?: `0x${string}` | null) => {
    const normalized = address ? (address.toLowerCase() as `0x${string}`) : null
    if (!normalized) {
      setHistory([])
      setHasLoaded(false)
      return
    }

    const cacheKey = `gmhistory:${normalized}`
    const cached = chainStateCache.get(cacheKey) as GMRecord[] | null
    if (cached) {
      setHistory(cached)
      setHasLoaded(true)
      return
    }

    setIsLoading(true)
    try {
      const combined: GMRecord[] = []
      const SPAN_BLOCKS = 120_000n // ~30-40 days on Base; keeps RPC pressure light
      const MAX_PER_CHAIN = 40

      const evtGMSent = parseAbiItem('event GMSent(address indexed user, uint256 streak, uint256 pointsEarned)')

      // 1) Pull GMSent logs per chain (sequential with bounded windows)
      const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
        ])

      for (const chain of SUPPORTED_CHAINS) {
        try {
          const chainId = CHAIN_IDS[chain]
          const client = getPublicClient(wagmiConfig, { chainId })
          if (!client) continue

          const latest = await rpcTimeout(client.getBlockNumber(), 0n)
          if (!latest) continue
          const fromBlock = latest > SPAN_BLOCKS ? latest - SPAN_BLOCKS : 0n

          const logs = await rpcTimeout(
            client.getLogs({
              address: getContractAddress(chain),
              event: evtGMSent,
              args: { user: normalized },
              fromBlock,
              toBlock: latest,
            }),
            []
          )

          if (!logs.length) continue

          const uniqueBlocks = Array.from(new Set(logs.map((lg) => lg.blockNumber?.toString() || ''))).filter(Boolean)
          const blockTimeMap = new Map<string, number>()
          await Promise.all(
            uniqueBlocks.slice(0, 120).map(async (bnStr) => {
              try {
                const bn = BigInt(bnStr)
                const blk = await rpcTimeout(client.getBlock({ blockNumber: bn }), null)
                if (blk) blockTimeMap.set(bnStr, Number(blk.timestamp) * 1000)
              } catch {}
            })
          )

          for (const lg of logs.slice(-MAX_PER_CHAIN)) {
            const args: any = (lg as any).args || {}
            const streak = Number(args?.streak ?? 0n)
            const blockNumberStr = lg.blockNumber?.toString() || ''
            const ts = blockTimeMap.get(blockNumberStr)
            combined.push({
              chain,
              streak,
              txHash: (lg.transactionHash || undefined) as `0x${string}` | undefined,
              timestamp: ts,
              date: ts ? new Date(ts).toISOString().split('T')[0] : '',
            })
          }
        } catch (e: any) {
          console.warn(`GMSent logs failed on ${CHAIN_LABEL[chain]}:`, e?.message || String(e))
        }
      }

      // 2) Fallback: getUserStats if no on-chain logs returned
      if (!combined.length) {
        for (const chain of SUPPORTED_CHAINS) {
          try {
            const chainId = CHAIN_IDS[chain]
            const client = getPublicClient(wagmiConfig, { chainId })
            if (!client) continue

            const res = await rpcTimeout(
              client.readContract({
                address: getContractAddress(chain),
                abi: GM_CONTRACT_ABI,
                functionName: 'getUserStats',
                args: [normalized],
              }),
              null
            )
            if (!res) continue
            const stats = res as unknown as UserStatsTuple
            const lastGMTime = Number(stats[0] || 0n)
            const streak = Number(stats[1] || 0n)
            if (!streak || !lastGMTime) continue

            const lastDate = new Date(lastGMTime * 1000)
            const daysToSync = Math.min(streak, 30)
            for (let i = 0; i < daysToSync; i++) {
              const gmDate = new Date(lastDate)
              gmDate.setDate(gmDate.getDate() - i)
              combined.push({
                chain,
                streak: streak - i,
                txHash: undefined,
                timestamp: gmDate.getTime(),
                date: gmDate.toISOString().split('T')[0],
              })
            }
          } catch (e: any) {
            console.warn(`getUserStats fallback failed on ${CHAIN_LABEL[chain]}:`, e?.message || String(e))
          }
        }
      }

      combined.sort((a, b) => {
        const at = a.timestamp || 0
        const bt = b.timestamp || 0
        if (bt !== at) return bt - at
        if (a.chain !== b.chain) return a.chain.localeCompare(b.chain)
        return (b.streak || 0) - (a.streak || 0)
      })

      const cacheKey = `gmhistory:${normalized}`
      chainStateCache.set(cacheKey, combined)
      setHistory(combined)
      setHasLoaded(true)

      if (!combined.length) {
        pushNotification({ type: 'info', title: 'No GM history yet', message: 'We could not find on-chain GM activity.' })
      }
    } catch (e: any) {
      console.error('Failed to load GM history:', e?.message || String(e))
      pushNotification({ type: 'error', title: 'GM history load failed', message: e?.message || 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }, [pushNotification, wagmiConfig])

  useEffect(() => {
    if (!trackedAddress) {
      setHistory([])
      setHasLoaded(false)
      setAutoHydrate(false)
      return
    }

    const normalized = trackedAddress.toLowerCase() as `0x${string}`
    const isNewAddress = lastAddressRef.current !== normalized
    lastAddressRef.current = normalized

    const cacheKey = `gmhistory:${normalized}`
    const cached = chainStateCache.get(cacheKey) as GMRecord[] | null
    if (cached) {
      setHistory(cached)
      setHasLoaded(true)
      return
    }

    if (isNewAddress) {
      if (autoHydrate) {
        setAutoHydrate(false)
      }
      setHistory([])
      setHasLoaded(false)
      return
    }

    if (autoHydrate) {
      void loadHistory(trackedAddress)
    } else {
      setHistory([])
      setHasLoaded(false)
    }
  }, [autoHydrate, loadHistory, trackedAddress])

  if (!trackedAddress) {
    return (
      <div className="relative profile-surface">
        <div className="pixel-card text-center">
          <div className="text-6xl mb-2">📅</div>
          <h3 className="pixel-heading mb-1">No GM History Yet</h3>
          <p className="text-[var(--px-sub)]">Connect your wallet or select a Farcaster-linked address to view GMs.</p>
        </div>
      </div>
    )
  }

  if (!autoHydrate && !hasLoaded) {
    return (
      <div className="relative profile-surface">
        <div className="pixel-card text-center">
          <div className="text-6xl mb-2">⏳</div>
          <h3 className="pixel-heading mb-1">Load GM History on Demand</h3>
          <p className="text-[var(--px-sub)]">
            Fetching multi-chain GM logs can take a moment. Load history only when you need it to keep the miniapp snappy.
          </p>
          <button
            className="btn-primary btn-sm mt-3"
            onClick={() => {
              if (!trackedAddress) return
              setAutoHydrate(true)
              void loadHistory(trackedAddress)
            }}
          >
            {isLoading ? 'Loading…' : 'Load GM History'}
          </button>
        </div>
      </div>
    )
  }

  if (history.length === 0 && !isLoading) {
    return (
      <div className="relative profile-surface">
        <div className="pixel-card text-center">
          <div className="text-6xl mb-2">📅</div>
          <h3 className="pixel-heading mb-1">No GM History Yet</h3>
          <p className="text-[var(--px-sub)]">Start your daily GM journey today!</p>
          <button
            className="btn-secondary btn-sm mt-2"
            onClick={() => {
              if (!trackedAddress) return
              void loadHistory(trackedAddress)
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative profile-surface">
      <div className="pixel-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="pixel-heading">GM History</h3>
          <button
            className="btn-secondary btn-sm"
            onClick={() => {
              if (!trackedAddress) return
              void loadHistory(trackedAddress)
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="profile-history-scroll space-y-2 overflow-y-auto">
          {isLoading && history.length === 0 ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="profile-history-skeleton animate-pulse px-3 py-2" />
            ))
          ) : (
            history.map((record, idx) => (
              <div
                key={`${record.chain}-${record.timestamp || record.date}-${idx}`}
                className="profile-history-entry"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="profile-history-streak" title={`Streak day ${record.streak}`}>
                    {record.streak}
                  </div>

                  <div className="profile-history-meta">
                    <div className="profile-history-date truncate">
                      {record.timestamp ? formatDate(record.timestamp) : formatDate(record.date)}
                    </div>
                    <div className="profile-history-subtitle">
                      Day {record.streak} • {CHAIN_LABEL[record.chain]}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-green-400" aria-hidden>✅</span>
                  <span className="pixel-pill profile-history-pill">{CHAIN_LABEL[record.chain]}</span>
                  {record.txHash && (
                    <a
                      className="pixel-pill profile-history-pill"
                      href={EXPLORER_TX[record.chain](record.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View TX ↗
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <>
            <div className="profile-divider" />
            <div className="text-center text-xs text-[var(--px-sub)]">
              Total GM entries: <span className="font-semibold">{history.length}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}