'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  useAccount,
  useConfig,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import {
  CHAIN_IDS,
  CHAIN_LABEL,
  type ChainKey,
  type GMChainKey,
  GM_CONTRACT_ABI,
  getContractAddress,
  canGMBasedOnTimestamp,
  formatTimeUntilNextGM,
  createStakeForBadgeTx,
  createUnstakeForBadgeTx,
  getTimeBasedGreeting,
  getTimeBasedShareText,
} from '@/lib/gmeow-utils'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { calculateRankProgress } from '@/lib/rank'
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'
import { DashboardNotificationCenter } from '@/components/dashboard/DashboardNotificationCenter'
import AnalyticsHighlights from '@/components/dashboard/AnalyticsHighlights'
import DashboardMobileTabs from '@/components/dashboard/DashboardMobileTabs'
import { TipMentionSummaryCard } from '@/components/dashboard/TipMentionSummaryCard'
import { ReminderPanel, type DashboardReminder } from '@/components/dashboard/ReminderPanel'
import { parseAbiItem } from 'viem'
import type { Abi } from 'viem'
// @edit-start 2025-02-15 — Restore wagmi core helpers for dashboard telemetry tx flows
import { getPublicClient, writeContract as coreWriteContract } from '@wagmi/core'
// @edit-end
import PointsGuide from '@/components/Points/PointsGuide'
import QuestLoadingDeck from '@/components/Quest/QuestLoadingDeck'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import type { TipBroadcast, TipMentionSummary } from '@/lib/tips-types'
import { useDashboardTelemetry } from '@/lib/dashboard-hooks'
import type { DashboardTelemetryPayload } from '@/lib/telemetry'
import { readStorageCache, writeStorageCache } from '@/lib/utils'
// Base chain only (GMChainKey)
const SUPPORTED_CHAINS: GMChainKey[] = ['base']
const EXPLORER_TX: Partial<Record<GMChainKey, (h: `0x${string}`) => string>> = {
  base: (h) => `https://basescan.org/tx/${h}`,
}

// Minimal ERC721 metadata ABI for tokenURI
const ERC721_METADATA_ABI = [
  {
    type: 'function',
    stateMutability: 'view',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
] as const

type LeaderboardEntry = { address: string; points: number }
type TeamInfo = { chain: GMChainKey; teamId: number; name: string; founder: string; memberCount: number }
type BadgeView = { chain: GMChainKey; badgeId: number; name?: string; image?: string }
type LoadStatsOptions = { force?: boolean; silent?: boolean }
type UserStatsSnapshot = {
  availablePoints: number
  lockedPoints: number
  totalPoints: number
  progress: ReturnType<typeof calculateRankProgress>
}

type MobileDashboardTab = 'overview' | 'missions' | 'social'

const CHAIN_BRAND: Record<GMChainKey, { bg: string; fg: string; label: string }> = {
  base: { bg: 'var(--dash-chain-base-bg)', fg: 'var(--dash-chain-base-fg)', label: 'B' },
}

const LEADERBOARD_CACHE_KEY = 'gmeowDashboardLeaderboard_v1'
const LEADERBOARD_CACHE_TTL_MS = 1000 * 60

const BADGES_CACHE_PREFIX = 'gmeowDashboardBadges_v1::'
const BADGES_CACHE_TTL_MS = 1000 * 60 * 5

const MOBILE_TAB_ITEMS: Array<{ id: MobileDashboardTab; label: string; icon: string }> = [
  { id: 'overview', label: 'GM & Points', icon: '☀️' },
  { id: 'missions', label: 'Quests & LB', icon: '🎯' },
  { id: 'social', label: 'Social & Badges', icon: '📣' },
]

function ChainIcon({ chain, size = 14, rounded = true }: { chain: GMChainKey; size?: number; rounded?: boolean }) {
  const brand = CHAIN_BRAND[chain]
  const r = rounded ? size : 3
  const title = CHAIN_LABEL[chain]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label={title} role="img" className="inline-block align-middle">
      <rect x="2" y="2" width="20" height="20" rx={r} ry={r} fill={brand.bg} />
      <text x="12" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill={brand.fg} fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
        {brand.label}
      </text>
    </svg>
  )
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" className="inline-block align-middle" aria-hidden="true">
      <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="0">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.9s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function formatAddress(raw: string): string {
  if (!raw) return '—'
  if (raw.length <= 10) return raw
  return `${raw.slice(0, 6)}...${raw.slice(-4)}`
}

function formatTipDonor(tip: TipBroadcast): string {
  if (tip.fromDisplay && tip.fromDisplay.trim()) return tip.fromDisplay.trim()
  if (tip.fromUsername && tip.fromUsername.trim()) return `@${tip.fromUsername.trim()}`
  if (tip.fromAddress) return formatAddress(tip.fromAddress)
  return 'Someone'
}

function formatTipAmount(tip: TipBroadcast): string {
  if (tip.amount != null) {
    const amount = tip.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })
    return tip.symbol ? `${amount} ${tip.symbol}` : amount
  }
  if (tip.points != null) return `${tip.points.toLocaleString()} pts`
  if (tip.usdValue != null) return `$${tip.usdValue.toFixed(2)}`
  if ((tip.kind ?? 'tip') === 'mention') return 'a shout-out'
  return 'Tip received'
}

function formatTipRecipient(tip: TipBroadcast): string {
  if (tip.toDisplay && tip.toDisplay.trim()) return tip.toDisplay.trim()
  if (tip.toUsername && tip.toUsername.trim()) return `@${tip.toUsername.replace(/^@/, '').trim()}`
  if (tip.toAddress) return formatAddress(tip.toAddress)
  if (typeof tip.toFid === 'number' && Number.isFinite(tip.toFid)) return `fid:${tip.toFid}`
  return 'the squad'
}

function ChainSwitcher({
  selected,
  onSelect,
  busyChain,
  size = 'md',
  autoSwitch = false,
  ensureChainAsync,
}: {
  selected: GMChainKey
  onSelect: (c: GMChainKey) => void | Promise<void>
  busyChain?: GMChainKey | null
  size?: 'sm' | 'md'
  autoSwitch?: boolean
  ensureChainAsync?: (c: GMChainKey) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current) return; if (!ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const sizeClass = size === 'sm' ? 'dash-switch--sm' : 'dash-switch--md'
  const isBusy = busyChain === selected
  const label = CHAIN_LABEL[selected]
  const pick = async (c: GMChainKey) => {
    setOpen(false)
    onSelect(c)
    if (autoSwitch && ensureChainAsync) await ensureChainAsync(c)
  }
  return (
    <div className={`dash-switch ${sizeClass}`} ref={ref}>
      <button
        type="button"
        className={`dash-switch-btn ${isBusy ? 'dash-switch-btn--busy' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ChainIcon chain={selected} size={size === 'sm' ? 12 : 14} />
        <span className="dash-switch-label">{label}</span>
        <span className={`dash-switch-caret ${open ? 'dash-switch-caret--open' : ''}`}>▾</span>
        {isBusy ? <Spinner size={12} /> : null}
      </button>
      {open && (
        <div className="dash-switch-menu dash-switch-menu--enter" role="listbox" aria-label="Select chain">
          {SUPPORTED_CHAINS.map((c) => (
            <button
              key={c}
              role="option"
              aria-selected={c === selected}
              className={`dash-switch-menu-item ${c === selected ? 'dash-switch-menu-item--active' : ''}`}
              onClick={() => pick(c)}
            >
              <ChainIcon chain={c} size={12} />
              <span className="dash-switch-item-label">{CHAIN_LABEL[c]}</span>
              {c === selected ? <span className="dash-switch-check">✓</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const wagmiConfig = useConfig()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()

  // Prevent SSR/CSR mismatch for wallet-dependent UI
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => { setHasMounted(true) }, [])
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // Chain selector for GM and stats card
  const [selectedChain, setSelectedChain] = useState<GMChainKey>('base')
  const targetChainId = CHAIN_IDS[selectedChain]
  const contractAddress = getContractAddress(selectedChain)

  // ---------------- User stats (per selected chain) ----------------
  const [statsLoading, setStatsLoading] = useState(false)
  const [availablePoints, setAvailablePoints] = useState<number>(0)
  const [lockedPoints, setLockedPoints] = useState<number>(0)
  const [totalEarned, setTotalEarned] = useState<number>(0)
  const totalPoints = useMemo(() => availablePoints + lockedPoints, [availablePoints, lockedPoints])
  const lastStatsAtRef = useRef(0)
  const lastKnownTotalRef = useRef(0)

  // Animated network switching state for UI
  const [switchingFor, setSwitchingFor] = useState<GMChainKey | null>(null)
  const ensureChain = useCallback(
    async (c: GMChainKey) => {
      const id = CHAIN_IDS[c]
      if (walletChainId === id) return true
      try {
        setSwitchingFor(c)
        await switchChainAsync({ chainId: id })
        return true
      } catch (e: any) {
        console.warn('Switch network failed:', e?.message || String(e))
        return false
      } finally {
        setSwitchingFor(null)
      }
    },
    [walletChainId, switchChainAsync],
  )

  // GM state
  const [streak, setStreak] = useState(0)
  const [lastGMTimestamp, setLastGMTimestamp] = useState(0)
  const [canGM, setCanGM] = useState(false)
  const [gmMessage, setGmMessage] = useState('')
  const [gmRewardBase, setGmRewardBase] = useState<number | null>(null)
  const [gmCooldownSeconds, setGmCooldownSeconds] = useState<number | null>(null)
  const [gmBonusConfig, setGmBonusConfig] = useState<{ bonus7: number; bonus30: number; bonus100: number }>({
    bonus7: 0,
    bonus30: 0,
    bonus100: 0,
  })
  const gmFrameUrl = useMemo(() => (address ? buildFrameShareUrl({ type: 'gm', user: address }) : ''), [address])
  const pointsFrameUrl = useMemo(
    () => (address ? buildFrameShareUrl({ type: 'points', user: address, chain: selectedChain }) : ''),
    [address, selectedChain]
  )
  const [gmShareReady, setGmShareReady] = useState(false)
  const [xpOverlay, setXpOverlay] = useState<XpEventPayload | null>(null)
  // @edit-start 2025-11-11 — Track linked Farcaster identity for telemetry
  const [linkedFid, setLinkedFid] = useState<number | null>(null)
  const fidFetchAbortRef = useRef<AbortController | null>(null)
  // @edit-end
  const [tipOptIn, setTipOptIn] = useState(false)
  const [tipFeed, setTipFeed] = useState<TipBroadcast[]>([])
  const [tipStreamStatus, setTipStreamStatus] = useState<'idle' | 'connecting' | 'open' | 'error'>('idle')
  const [tipConnectNonce, setTipConnectNonce] = useState(0)
  const tipStreamRef = useRef<EventSource | null>(null)
  const tipReconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mentionSummaryRequestRef = useRef(false)
  const [mentionSummary, setMentionSummary] = useState<TipMentionSummary | null>(null)
  const [mentionSummaryLoading, setMentionSummaryLoading] = useState(false)
  const [mentionSummaryError, setMentionSummaryError] = useState<string | null>(null)

  // Shared ABI and stat helpers (defined early so hooks can depend on them)
  const ABI = useMemo(() => GM_CONTRACT_ABI as unknown as Abi, [])

  const refreshMentionSummary = useCallback(async (options: { silent?: boolean } = {}) => {
    if (mentionSummaryRequestRef.current) return
    mentionSummaryRequestRef.current = true
    if (!options.silent) setMentionSummaryLoading(true)
    try {
      const response = await fetch('/api/tips/summary', { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const json = (await response.json()) as { ok?: boolean; summary?: TipMentionSummary }
      if (!json?.summary || json.ok === false) throw new Error('Invalid summary payload')
      setMentionSummary(json.summary)
      setMentionSummaryError(null)
    } catch (error) {
      setMentionSummaryError((error as Error)?.message ?? 'Failed to load summary')
    } finally {
      mentionSummaryRequestRef.current = false
      setMentionSummaryLoading(false)
    }
  }, [])

  const handleMentionSummaryRefresh = useCallback(() => {
    void refreshMentionSummary()
  }, [refreshMentionSummary])

  useEffect(() => {
    if (!hasMounted) return
    void refreshMentionSummary()
    const interval = setInterval(() => {
      void refreshMentionSummary({ silent: true })
    }, 60_000)
    return () => {
      clearInterval(interval)
    }
  }, [hasMounted, refreshMentionSummary])

  // @edit-start 2025-11-11 — Resolve Farcaster fid for connected wallet
  useEffect(() => {
    if (!hasMounted) return

    if (!address) {
      setLinkedFid(null)
      if (fidFetchAbortRef.current) {
        fidFetchAbortRef.current.abort()
        fidFetchAbortRef.current = null
      }
      return
    }

    const controller = new AbortController()
    fidFetchAbortRef.current?.abort()
    fidFetchAbortRef.current = controller
    let disposed = false

    const lookup = async () => {
      try {
        const res = await fetch(`/api/farcaster/fid?address=${address}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json().catch(() => null)) as { fid?: number } | null
        if (disposed) return
        const detected = typeof json?.fid === 'number' ? json.fid : Number(json?.fid ?? 0)
        if (Number.isFinite(detected) && detected > 0) {
          setLinkedFid(Math.trunc(detected))
        } else {
          setLinkedFid(null)
        }
      } catch (error) {
        if (disposed) return
        if ((error as Error)?.name !== 'AbortError') {
          console.warn('[dashboard] fid lookup failed', (error as Error)?.message || error)
        }
        setLinkedFid(null)
      }
    }

    void lookup()

    return () => {
      disposed = true
      controller.abort()
      if (fidFetchAbortRef.current === controller) {
        fidFetchAbortRef.current = null
      }
    }
  }, [address, hasMounted])
  // @edit-end

  const loadUserStats = useCallback(
    async (options: LoadStatsOptions = {}): Promise<UserStatsSnapshot | null> => {
      const { force = false, silent = false } = options
      if (!mountedRef.current) return null

      if (!hasMounted || !address) {
        if (mountedRef.current) {
          setAvailablePoints(0)
          setLockedPoints(0)
          setTotalEarned(0)
          setGmRewardBase(null)
          setGmCooldownSeconds(null)
          setGmBonusConfig({ bonus7: 0, bonus30: 0, bonus100: 0 })
          setStreak(0)
          setLastGMTimestamp(0)
        }
        lastKnownTotalRef.current = 0
        lastStatsAtRef.current = Date.now()
        return null
      }

      const now = Date.now()
      if (!force && now - lastStatsAtRef.current < 7_000) return null

      const applyLoading = !silent
      if (applyLoading && mountedRef.current) setStatsLoading(true)

      try {
        const client = getPublicClient(wagmiConfig, { chainId: targetChainId })
        if (!client) return null

        // Add 10s timeout to prevent hanging
        const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
          Promise.race([
            promise,
            new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
          ])

        const [statsRes, gmRewardRaw, gmCooldownRaw, bonus7Raw, bonus30Raw, bonus100Raw] = await Promise.all([
          rpcTimeout(client.readContract({ address: contractAddress, abi: ABI, functionName: 'getUserStats', args: [address] }), null as any),
          rpcTimeout(client.readContract({ address: contractAddress, abi: ABI, functionName: 'gmPointReward' }).catch(() => null), null),
          rpcTimeout(client.readContract({ address: contractAddress, abi: ABI, functionName: 'gmCooldown' }).catch(() => null), null),
          rpcTimeout(client.readContract({ address: contractAddress, abi: ABI, functionName: 'streak7BonusPct' }).catch(() => null), null),
          rpcTimeout(client.readContract({ address: contractAddress, abi: ABI, functionName: 'streak30BonusPct' }).catch(() => null), null),
          rpcTimeout(client.readContract({ address: contractAddress, abi: ABI, functionName: 'streak100BonusPct' }).catch(() => null), null),
        ])

        if (!mountedRef.current) return null

        let avail = 0n
        let locked = 0n
        let earned = 0n
        if (Array.isArray(statsRes)) {
          avail = BigInt(statsRes[0] ?? 0)
          locked = BigInt(statsRes[1] ?? 0)
          earned = BigInt(statsRes[2] ?? 0)
        } else if (statsRes && typeof statsRes === 'object') {
          avail = BigInt((statsRes as any).availablePoints ?? 0)
          locked = BigInt((statsRes as any).lockedPoints ?? 0)
          earned = BigInt((statsRes as any).totalEarned ?? 0)
        }

        const availableValue = Number(avail)
        const lockedValue = Number(locked)
        const earnedValue = Number(earned)
        const totalValue = availableValue + lockedValue
        const progress = calculateRankProgress(totalValue)

        if (mountedRef.current) {
          setAvailablePoints(availableValue)
          setLockedPoints(lockedValue)
          setTotalEarned(earnedValue)
          const rewardVal = gmRewardRaw !== null && gmRewardRaw !== undefined ? Number(gmRewardRaw) : null
          const cooldownVal = gmCooldownRaw !== null && gmCooldownRaw !== undefined ? Number(gmCooldownRaw) : null
          const bonus7Val = bonus7Raw !== null && bonus7Raw !== undefined ? Number(bonus7Raw) : 0
          const bonus30Val = bonus30Raw !== null && bonus30Raw !== undefined ? Number(bonus30Raw) : 0
          const bonus100Val = bonus100Raw !== null && bonus100Raw !== undefined ? Number(bonus100Raw) : 0
          setGmRewardBase(rewardVal)
          setGmCooldownSeconds(cooldownVal)
          setGmBonusConfig({ bonus7: bonus7Val, bonus30: bonus30Val, bonus100: bonus100Val })
        }

        const gm = await rpcTimeout(
          client.readContract({ address: contractAddress, abi: ABI, functionName: 'gmhistory', args: [address] }),
          null as any
        ).catch(() => null as any)

        if (mountedRef.current) {
          if (gm) {
            const last = Array.isArray(gm) ? Number(gm[0] ?? 0) : Number((gm as any).last ?? 0)
            const stk = Array.isArray(gm) ? Number(gm[1] ?? 0) : Number((gm as any).streak ?? 0)
            setLastGMTimestamp(last || 0)
            setStreak(stk || 0)
          } else {
            setLastGMTimestamp(0)
            setStreak(0)
          }
        }

        lastKnownTotalRef.current = totalValue
        lastStatsAtRef.current = Date.now()

        return { availablePoints: availableValue, lockedPoints: lockedValue, totalPoints: totalValue, progress }
      } catch (error) {
        if (!silent) console.warn('Failed to load user stats:', (error as Error)?.message || error)
        return null
      } finally {
        if (applyLoading && mountedRef.current) setStatsLoading(false)
      }
    },
    [address, hasMounted, wagmiConfig, targetChainId, contractAddress, ABI]
  )

  const normalizeChainKey = useCallback((value?: string | null): GMChainKey | undefined => {
    if (!value) return undefined
    const lower = value.toLowerCase() as GMChainKey
    return SUPPORTED_CHAINS.includes(lower) ? lower : undefined
  }, [])

  const buildExplorerLink = useCallback((chainHint: string | undefined, hash: string | undefined) => {
    if (!hash || !hash.startsWith('0x')) return undefined
    const normalized = normalizeChainKey(chainHint) ?? selectedChain
    const builder = EXPLORER_TX[normalized]
    return builder ? builder(hash as `0x${string}`) : undefined
  }, [normalizeChainKey, selectedChain])

  // Team + badges + leaderboard preview
  const [team] = useState<TeamInfo | null>(null)
  const [lbTop5, setLbTop5] = useState<LeaderboardEntry[]>([])
  const [lbLoading, setLbLoading] = useState<boolean>(true)
  const [badges, setBadges] = useState<BadgeView[]>([])
  const [badgesLoading, setBadgesLoading] = useState<boolean>(false)

  // Add missing referral-code state
  const [myRefCode, setMyRefCode] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileDashboardTab>('overview')

  const pushNotification = useLegacyNotificationAdapter()

  const {
    data: dashboardTelemetry,
    loading: telemetryLoading,
    error: telemetryError,
    stale: telemetryStale,
    lastUpdated: telemetryLastUpdated,
    refresh: refreshTelemetry,
  } = useDashboardTelemetry()

  const telemetryPrevRef = useRef<DashboardTelemetryPayload | null>(null)

  useEffect(() => {
    if (!dashboardTelemetry?.totals) return
    const prev = telemetryPrevRef.current
    telemetryPrevRef.current = dashboardTelemetry
    if (!prev?.totals) return

    const prevTips = prev.totals.tipsVolume24h ?? 0
    const nextTips = dashboardTelemetry.totals.tipsVolume24h ?? 0
    if (nextTips > prevTips) {
      const prevBucket = Math.floor(prevTips / 1000)
      const nextBucket = Math.floor(nextTips / 1000)
      if (nextBucket > prevBucket) {
        pushNotification.info(`Tip volume hit ${nextTips.toLocaleString()} pts in the last 24h.`)
      }
    }

    const prevMints = prev.totals.badgeMints24h ?? 0
    const nextMints = dashboardTelemetry.totals.badgeMints24h ?? 0
    if (nextMints > prevMints) {
      const prevBucket = Math.floor(prevMints / 10)
      const nextBucket = Math.floor(nextMints / 10)
      if (nextBucket > prevBucket) {
        pushNotification.success(`${nextMints.toLocaleString()} badges minted in the last 24h.`)
      }
    }
  }, [dashboardTelemetry, pushNotification])

  const badgesCacheKey = useMemo(() => (address ? `${BADGES_CACHE_PREFIX}${address.toLowerCase()}` : null), [address])

  useEffect(() => {
    const cachedLeaderboard = readStorageCache<LeaderboardEntry[]>(LEADERBOARD_CACHE_KEY, LEADERBOARD_CACHE_TTL_MS)
    if (cachedLeaderboard?.length) {
      setLbTop5(cachedLeaderboard)
      setLbLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!badgesCacheKey) {
      setBadges([])
      return
    }
    const cachedBadges = readStorageCache<BadgeView[]>(badgesCacheKey, BADGES_CACHE_TTL_MS)
    if (cachedBadges) setBadges(cachedBadges)
  }, [badgesCacheKey])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const stored = window.localStorage.getItem('gmeow.tipsOptIn')
      if (stored === '1') setTipOptIn(true)
    } catch {
      setTipOptIn(false)
    }
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem('gmeow.tipsOptIn', tipOptIn ? '1' : '0')
    } catch {
      /* ignore storage write errors */
    }
  }, [tipOptIn, hasMounted])

  useEffect(() => {
    if (!address) setGmShareReady(false)
  }, [address])

  useEffect(() => {
    if (canGM) setGmShareReady(false)
  }, [canGM])

  useEffect(() => {
    if (!hasMounted) return

    if (!tipOptIn || !address) {
      if (tipStreamRef.current) {
        tipStreamRef.current.close()
        tipStreamRef.current = null
      }
      if (tipReconnectTimeout.current) {
        clearTimeout(tipReconnectTimeout.current)
        tipReconnectTimeout.current = null
      }
      setTipStreamStatus('idle')
      return
    }

    setTipStreamStatus('connecting')
    const params = new URLSearchParams()
    params.set('address', address)
    const source = new EventSource(`/api/tips/stream?${params.toString()}`)
    tipStreamRef.current = source

    const handleOpen = () => setTipStreamStatus('open')

    const handleTip = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as TipBroadcast
        if (!parsed || typeof parsed !== 'object') return
        setTipFeed((prev) => {
          if (prev.some((t) => t.id === parsed.id)) return prev
          return [parsed, ...prev].slice(0, 10)
        })

        if ((parsed.kind ?? 'tip') === 'mention') {
          void refreshMentionSummary({ silent: true })
        }

        const tipKind = parsed.kind ?? 'tip'
        const donorLabel = formatTipDonor(parsed)
        const recipientLabel = formatTipRecipient(parsed)
        const amountLabel = formatTipAmount(parsed)
        const customMessage = typeof parsed.message === 'string' ? parsed.message.trim() : ''
        const defaultMessage = (() => {
          if (tipKind === 'mention') {
            if (amountLabel === 'a shout-out') return `${donorLabel} tipped ${recipientLabel}.`
            return `${donorLabel} tipped ${recipientLabel} with ${amountLabel}.`
          }
          return `Received ${amountLabel}.`
        })()

        const notifyMethod = tipKind === 'mention' ? pushNotification.info : pushNotification.success
        notifyMethod(customMessage || defaultMessage)

        if (tipKind === 'tip') {
          void (async () => {
            const beforeValue =
              typeof lastKnownTotalRef.current === 'number' && Number.isFinite(lastKnownTotalRef.current)
                ? lastKnownTotalRef.current
                : null
            const snapshot = await loadUserStats({ force: true, silent: true })
            let totalAfter = typeof snapshot?.totalPoints === 'number' ? snapshot.totalPoints : null
            if (!Number.isFinite(totalAfter as number)) {
              totalAfter = beforeValue
            }
            const chainHint = normalizeChainKey(parsed.chain) ?? selectedChain
            const shareText = parsed.shareText || `Huge thanks to ${donorLabel} for the tip!`
            const visitUrl = buildExplorerLink(chainHint, parsed.txHash)

            let progress = snapshot?.progress as ReturnType<typeof calculateRankProgress> | null
            if (!progress && typeof totalAfter === 'number') {
              progress = calculateRankProgress(totalAfter)
            }

            const fallbackPoints = Number.isFinite(parsed.points) ? Number(parsed.points) : 0
            const deltaFromTotals =
              beforeValue != null && typeof totalAfter === 'number' ? totalAfter - beforeValue : null
            const delta =
              deltaFromTotals != null && Number.isFinite(deltaFromTotals) && deltaFromTotals !== 0
                ? deltaFromTotals
                : fallbackPoints

            const previousTotal =
              beforeValue != null
                ? beforeValue
                : typeof totalAfter === 'number'
                  ? totalAfter - delta
                  : null
            const computedTotal =
              typeof totalAfter === 'number' && Number.isFinite(totalAfter)
                ? totalAfter
                : (previousTotal ?? 0) + delta

            if (!progress) {
              progress = calculateRankProgress(computedTotal)
            }

            const resolvedProgress = progress ?? calculateRankProgress(computedTotal)

            const xpEarned = delta > 0 ? delta : fallbackPoints > 0 ? fallbackPoints : 0

            setXpOverlay({
              event: 'tip',
              chainKey: chainHint,
              xpEarned,
              totalPoints: computedTotal,
              progress: resolvedProgress,
              shareUrl: parsed.frameUrl,
              onShare: parsed.frameUrl ? () => openWarpcastComposer(shareText, parsed.frameUrl!) : undefined,
              shareLabel: 'Thank your tipper',
              visitUrl,
              visitLabel: visitUrl ? 'View receipt' : undefined,
              headline: `Tip from ${donorLabel}`,
              tierTagline: parsed.message || undefined,
            })

            if (address && resolvedProgress && (delta !== 0 || xpEarned > 0)) {
              const fidCandidate =
                linkedFid ?? (typeof parsed.toFid === 'number' && Number.isFinite(parsed.toFid) ? parsed.toFid : null)
              const metadata: Record<string, unknown> = {
                source: 'dashboard-tip',
                tipId: parsed.id,
                donorHandle: parsed.fromUsername ? `@${parsed.fromUsername}` : parsed.fromDisplay,
                message: parsed.message,
                txHash: parsed.txHash,
                frameUrl: parsed.frameUrl,
              }
              for (const key of Object.keys(metadata)) {
                const value = metadata[key]
                if (value === undefined || value === null || value === '') delete metadata[key]
              }

              const level = resolvedProgress.level
              const tierName = resolvedProgress.currentTier.name
              const tierPercent = resolvedProgress.percent * 100

              void emitRankTelemetryEvent({
                event: 'tip',
                chain: chainHint,
                walletAddress: address,
                fid: fidCandidate ?? null,
                delta,
                totalPoints: computedTotal,
                previousTotal,
                level,
                tierName,
                tierPercent,
                metadata: Object.keys(metadata).length ? metadata : null,
              })
            }
          })()
        }
      } catch (error) {
        console.warn('Failed to parse tip event', error)
      }
    }

    const handleError = () => {
      setTipStreamStatus('error')
      source.close()
      tipStreamRef.current = null
      if (tipReconnectTimeout.current) clearTimeout(tipReconnectTimeout.current)
      tipReconnectTimeout.current = setTimeout(() => {
        setTipConnectNonce((v) => v + 1)
      }, 5_000)
    }

    source.addEventListener('open', handleOpen)
    source.addEventListener('tip', handleTip as EventListener)
    source.onerror = handleError

    return () => {
      source.removeEventListener('open', handleOpen)
      source.removeEventListener('tip', handleTip as EventListener)
      source.onerror = null
      source.close()
      if (tipReconnectTimeout.current) {
        clearTimeout(tipReconnectTimeout.current)
        tipReconnectTimeout.current = null
      }
      tipStreamRef.current = null
    }
  }, [
    tipOptIn,
    address,
    hasMounted,
    tipConnectNonce,
    loadUserStats,
    availablePoints,
    lockedPoints,
    normalizeChainKey,
    buildExplorerLink,
    selectedChain,
    pushNotification,
    refreshMentionSummary,
    linkedFid,
  ])

  // Contract write for GM
  const { writeContract, isPending: isWritePending, data: txHash, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash })
  // Throttle scan for expired quests: ≥10s between scans
  const lastExpiredScanAt = useRef(0)

  // ---------------- Expired quests with remaining escrow (creator view) ----------------
  type ExpiredQuestRow = {
    chain: GMChainKey
    questId: number
    name: string
    questType: number
    expiresAt: number
    isActive: boolean
    creator: `0x${string}`
    rewardPointsPerUser?: number
    escrowedPoints?: number
    remainingClaimsPoints?: number
    rewardToken?: `0x${string}` | null
    rewardTokenPerUser?: number
    tokenEscrowRemaining?: number
    remainingClaimsToken?: number
  }

  const [expiredLoading, setExpiredLoading] = useState(false)
  const [expiredQuests, setExpiredQuests] = useState<ExpiredQuestRow[]>([])
  const [expiredError, setExpiredError] = useState<string | null>(null)
  const [closeAllBusy, setCloseAllBusy] = useState(false)
  const hasClosableExpired = useMemo(() => expiredQuests.some((r) => r.isActive), [expiredQuests])

  const evtQuestAdded = useMemo(
    () => parseAbiItem('event QuestAdded(uint256 indexed questId, address indexed creator, uint8 questType, uint256 rewardPerUserPoints, uint256 maxCompletions)'),
    []
  )
  const evtQuestAddedERC20 = useMemo(
    () => parseAbiItem('event QuestAddedERC20(uint256 indexed questId, address indexed creator, address token, uint256 rewardPerUserToken, uint256 maxCompletions)'),
    []
  )

  const rowKey = (r: ExpiredQuestRow) => `${r.chain}:${r.questId}`

  async function scanExpiredQuests() {
    const now = Date.now()
    if (now - lastExpiredScanAt.current < 10_000) {
      setExpiredError('Please wait a few seconds before scanning again.')
      return
    }
    if (!address) {
      setExpiredQuests([])
      setExpiredError('Connect wallet to scan quests you created.')
      return
    }
    setExpiredError(null)
    setExpiredLoading(true)
    const rows: ExpiredQuestRow[] = []
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    try {
      for (const c of SUPPORTED_CHAINS) {
        try {
          const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[c] })
          if (!client) continue
          // Find your quest IDs on this chain via events
          const latest = await rpcTimeout(client.getBlockNumber(), 0n)
          if (!latest) continue
          const span = 2_000_000n
          const fromBlock = latest > span ? latest - span : 0n
          const ids = new Set<number>()
          const logs1 = await rpcTimeout(
            client.getLogs({
              address: getContractAddress(c),
              event: evtQuestAdded,
              args: { creator: address as `0x${string}` },
              fromBlock, toBlock: latest,
            }).catch(() => []),
            []
          )
          for (const lg of logs1) {
            const id = Number((lg as any).args?.questId ?? 0n)
            if (id > 0) ids.add(id)
          }
          const logs2 = await rpcTimeout(
            client.getLogs({
              address: getContractAddress(c),
              event: evtQuestAddedERC20,
              args: { creator: address as `0x${string}` },
              fromBlock, toBlock: latest,
            }).catch(() => []),
            []
          )
          for (const lg of logs2) {
            const id = Number((lg as any).args?.questId ?? 0n)
            if (id > 0) ids.add(id)
          }
          if (ids.size === 0) continue

          // Chain time
          const blk = await rpcTimeout(client.getBlock({ blockTag: 'latest' }).catch(() => null), null)
          const chainNow = Number((blk as any)?.timestamp ?? Math.floor(Date.now() / 1000))

          // Read each quest and compute escrow/expiry
          for (const id of ids) {
            try {
              const q: any = await rpcTimeout(
                client.readContract({
                  address: getContractAddress(c),
                  abi: ABI,
                  functionName: 'quests',
                  args: [BigInt(id)],
                }),
                null
              )
              if (!q) continue

              const name = String(q?.[0] || '')
              const questType = Number(q?.[1] ?? 0)
              const creator = (q?.[4] || '0x0000000000000000000000000000000000000000') as `0x${string}`
              if (String(creator).toLowerCase() !== String(address).toLowerCase()) continue

              const expiresAtRaw = Number(q?.[6] ?? 0n)
              const isActive = Boolean(q?.[8])

              const rewardPointsPerUser = Number(q?.[3] ?? 0n)
              const escrowedPoints = Number(q?.[9] ?? 0n)

              const rewardToken = (q?.[11] || '0x0000000000000000000000000000000000000000') as `0x${string}`
              const rewardTokenPerUser = Number(q?.[12] ?? 0n)
              const tokenEscrowRemaining = Number(q?.[13] ?? 0n)

              const expiresAt = expiresAtRaw > 0 && expiresAtRaw < 1_600_000_000 ? 0 : expiresAtRaw
              const isExpired = !!expiresAt && chainNow > expiresAt
              const closedOrExpired = !isActive || isExpired
              if (!closedOrExpired) continue

              const isToken = /^0x[0-9a-fA-F]{40}$/.test(rewardToken) && !/^0x0{40}$/i.test(rewardToken)
              const remainingClaimsPoints = !isToken && rewardPointsPerUser > 0 ? Math.floor((escrowedPoints || 0) / rewardPointsPerUser) : undefined
              const remainingClaimsToken = isToken && rewardTokenPerUser > 0 ? Math.floor((tokenEscrowRemaining || 0) / rewardTokenPerUser) : undefined

              const hasEscrow =
                (!isToken && (escrowedPoints || 0) > 0) ||
                (isToken && (tokenEscrowRemaining || 0) > 0)
              if (!hasEscrow) continue

              rows.push({
                chain: c,
                questId: id,
                name,
                questType,
                expiresAt: expiresAt || 0,
                isActive,
                creator,
                rewardPointsPerUser: !isToken ? rewardPointsPerUser || undefined : undefined,
                escrowedPoints: !isToken ? escrowedPoints || undefined : undefined,
                remainingClaimsPoints,
                rewardToken: isToken ? rewardToken : null,
                rewardTokenPerUser: isToken ? rewardTokenPerUser || undefined : undefined,
                tokenEscrowRemaining: isToken ? tokenEscrowRemaining || undefined : undefined,
                remainingClaimsToken,
              })
            } catch {}
          }
        } catch {}
      }
      rows.sort((a, b) => {
        if (a.chain !== b.chain) return SUPPORTED_CHAINS.indexOf(a.chain) - SUPPORTED_CHAINS.indexOf(b.chain)
        const av = (a.escrowedPoints || a.tokenEscrowRemaining || 0)
        const bv = (b.escrowedPoints || b.tokenEscrowRemaining || 0)
        return bv - av
      })
      setExpiredQuests(rows)
      lastExpiredScanAt.current = Date.now()
    } catch (e: any) {
      setExpiredError(e?.message || 'Scan failed')
    } finally {
      setExpiredLoading(false)
    }
  }

  const [refundBusyId, setRefundBusyId] = useState<string | null>(null)
  const [closeBusyId, setCloseBusyId] = useState<string | null>(null)

  async function handleCloseQuestRow(r: ExpiredQuestRow, opts: { skipRescan?: boolean } = {}): Promise<boolean> {
    const { skipRescan = false } = opts
    if (!address) {
      pushNotification.warning('Connect wallet.')
      return false
    }
    let success = false
    try {
      const ok = await ensureChain(r.chain)
      if (!ok) return false
      setCloseBusyId(rowKey(r))
      const txHash = await coreWriteContract(wagmiConfig, {
        address: getContractAddress(r.chain),
        abi: ABI,
        functionName: 'closeQuest',
        args: [BigInt(r.questId)],
        chainId: CHAIN_IDS[r.chain],
        account: address,
      })
      pushNotification.info(`Closing quest: ${r.name || `Quest #${r.questId}`}`)
      const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[r.chain] })
      await client!.waitForTransactionReceipt({ hash: txHash })
      pushNotification.success(`Quest #${r.questId} closed on ${CHAIN_LABEL[r.chain]}`)
      success = true
      if (!skipRescan) await scanExpiredQuests()
    } catch (e: any) {
      pushNotification.error(e?.shortMessage || e?.message || 'Tx failed')
    } finally {
      setCloseBusyId(null)
    }
    return success
  }

  async function handleCloseAllExpired() {
    if (!address) { pushNotification.warning('Connect wallet.'); return }
    const activeRows = expiredQuests.filter((r) => r.isActive)
    if (activeRows.length === 0) {
      pushNotification.info('No active expired quests detected.')
      return
    }
    setCloseAllBusy(true)
    let closedCount = 0
    for (const row of activeRows) {
      const ok = await handleCloseQuestRow(row, { skipRescan: true })
      if (ok) closedCount += 1
    }
    await scanExpiredQuests()
    setCloseAllBusy(false)
    const tone = closedCount === activeRows.length ? 'success' : closedCount > 0 ? 'info' : 'warn'
    pushNotification.notify(`Bulk close complete: ${closedCount}/${activeRows.length} quests closed`, tone as any)
  }

  async function handleRefundQuestRow(r: ExpiredQuestRow) {
    if (!address) { pushNotification.warning('Connect wallet.'); return }
    const hasPointEscrow = (r.escrowedPoints ?? 0) > 0
    const hasTokenEscrow = (r.tokenEscrowRemaining ?? 0) > 0
    if (!hasPointEscrow && !hasTokenEscrow) {
      pushNotification.info(`Quest #${r.questId} has no remaining escrow.`)
      return
    }
    if (!r.isActive) {
      pushNotification.info('Quest is already closed—escrow should have been returned on close.')
      return
    }
    try {
      const ok = await ensureChain(r.chain)
      if (!ok) return
      setRefundBusyId(rowKey(r))
      const txHash = await coreWriteContract(wagmiConfig, {
        address: getContractAddress(r.chain),
        abi: ABI,
        functionName: 'batchRefundQuests',
        args: [[BigInt(r.questId)]],
        chainId: CHAIN_IDS[r.chain],
        account: address,
      })
      pushNotification.info(`Refunding remaining escrow for #${r.questId}`)
      const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[r.chain] })
      await client!.waitForTransactionReceipt({ hash: txHash })
      pushNotification.success(`Refunded remaining escrow for #${r.questId}`)
      await scanExpiredQuests()
    } catch (e: any) {
      pushNotification.error((e?.shortMessage || e?.message || 'Tx failed') + ' — try Close first, then Claim.')
    } finally {
      setRefundBusyId(null)
    }
  }
  // Cross-chain stats loader (selectedChain)
  useEffect(() => {
    if (!mountedRef.current) return
    void loadUserStats({ force: true })
  }, [loadUserStats])

  // GM countdown tick
  useEffect(() => {
    const t = setInterval(() => {
      if (lastGMTimestamp === 0) {
        setCanGM(true)
        setGmMessage(getTimeBasedGreeting(true))
        return
      }
      const can = canGMBasedOnTimestamp(lastGMTimestamp)
      setCanGM(can)
      if (can) {
        setGmMessage(getTimeBasedGreeting(true))
      } else {
        setGmMessage(`Next GM in ${formatTimeUntilNextGM(lastGMTimestamp)}`)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [lastGMTimestamp])

  // Leaderboard preview: fetch from API instead of on-chain view
  useEffect(() => {
    let disposed = false
    const load = async () => {
      if (!disposed) setLbLoading(true)
      try {
        const res = await fetch('/api/leaderboard?chain=base&limit=50', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const list: LeaderboardEntry[] = (json?.top || []).slice(0, 5).map((r: any) => ({
          address: r.address,
          points: Number(r.points || 0),
        }))
        if (!disposed) {
          setLbTop5(list)
          writeStorageCache<LeaderboardEntry[]>(LEADERBOARD_CACHE_KEY, list)
        }
      } catch (error) {
        if (!disposed) console.warn('Leaderboard fetch failed:', (error as Error)?.message || error)
      } finally {
        if (!disposed) setLbLoading(false)
      }
    }
    load()
    return () => { disposed = true }
  }, [])

  // Badges showcase
  useEffect(() => {
    let disposed = false
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const httpFromIpfs = (uri?: string) => {
      if (!uri) return uri
      if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`
      return uri
    }
    const run = async () => {
      if (!address) {
        setBadges([])
        setBadgesLoading(false)
        return
      }
      if (!disposed) setBadgesLoading(true)
      try {
      type Raw = { chain: GMChainKey; badgeId: number; blockNumber: bigint }
      const raw: Raw[] = []
      const evtBadgeMinted = parseAbiItem('event BadgeMinted(address indexed to, uint256 tokenId, string badgeType)')
      for (const chain of SUPPORTED_CHAINS) {
        try {
          const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[chain] })
          if (!client) continue
          const latest = await rpcTimeout(client.getBlockNumber(), 0n)
          if (!latest) continue
          const span = 400_000n
          const fromBlock = latest > span ? latest - span : 0n
          const logs = await rpcTimeout(
            client.getLogs({
              address: getContractAddress(chain),
              event: evtBadgeMinted,
              args: { to: address as `0x${string}` },
              fromBlock,
              toBlock: latest,
            }),
            []
          )
          for (const lg of logs) {
            const badgeId = Number((lg as any).args?.tokenId ?? 0n)
            if (badgeId > 0) raw.push({ chain, badgeId, blockNumber: lg.blockNumber })
          }
        } catch {}
      }
      raw.sort((a, b) => Number(b.blockNumber - a.blockNumber))
      const latest3 = raw.slice(0, 3)
      const out: BadgeView[] = []
      for (const item of latest3) {
        try {
          const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[item.chain] })
          if (!client) continue
          const badgeAddr = await rpcTimeout(
            client.readContract({
              address: getContractAddress(item.chain),
              abi: ABI,
              functionName: 'badgeContract',
            }) as Promise<`0x${string}`>,
            '0x0' as `0x${string}`
          )
          if (!badgeAddr || badgeAddr === '0x0') continue
          const tokenUri = await rpcTimeout(
            client.readContract({
              address: badgeAddr,
              abi: ERC721_METADATA_ABI,
              functionName: 'tokenURI',
              args: [BigInt(item.badgeId)],
            }) as Promise<string>,
            ''
          )
          let name: string | undefined
          let image: string | undefined
          const url = httpFromIpfs(tokenUri)
          if (url && /^https?:\/\//i.test(url)) {
            try {
              const res = await fetch(url)
              if (res.ok) {
                const json = await res.json()
                name = json?.name
                image = httpFromIpfs(json?.image || json?.image_url)
              }
            } catch {}
          }
          out.push({ chain: item.chain, badgeId: item.badgeId, name, image })
        } catch {
          out.push({ chain: item.chain, badgeId: item.badgeId })
        }
      }
      if (!disposed) {
        setBadges(out)
        if (badgesCacheKey) writeStorageCache<BadgeView[]>(badgesCacheKey, out)
      }
    } catch (e: any) {
      console.warn('Badges load failed:', e?.message || String(e))
    } finally {
      if (!disposed) setBadgesLoading(false)
    }
  }
    run()
    return () => { disposed = true }
  }, [address, wagmiConfig, ABI, badgesCacheKey])

  // Load my referral code on the selected chain (ABI: referralCodeOf(address) -> string)
  useEffect(() => {
    let disposed = false
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const run = async () => {
      if (!address) { setMyRefCode(''); return }
      try {
        const client = getPublicClient(wagmiConfig, { chainId: targetChainId })
        if (!client) return
        const codeStr = await rpcTimeout(
          client.readContract({
            address: contractAddress,
            abi: ABI,
            functionName: 'referralCodeOf',
            args: [address],
          }) as Promise<string>,
          ''
        )
        if (!disposed) setMyRefCode(codeStr || '')
      } catch { if (!disposed) setMyRefCode('') }
    }
    run()
    return () => { disposed = true }
  }, [address, wagmiConfig, targetChainId, contractAddress, ABI])

  const sharePointsFrame = useCallback(
    async (context: 'stake' | 'unstake', amount: number) => {
      if (!address) {
        pushNotification.warning('Please connect your wallet.')
        return
      }
      if (!pointsFrameUrl) {
        pushNotification.error('Unable to build a points frame right now.')
        return
      }
      const safeAmount = Math.max(0, Math.round(amount))
      const amountLabel = safeAmount > 0 ? `${safeAmount.toLocaleString()} pts` : 'points'
      const descriptor = context === 'stake' ? 'Staked' : 'Unstaked'
      try {
        pushNotification.info('Opening Warpcast composer.')
        const text = `${descriptor} ${amountLabel} on ${CHAIN_LABEL[selectedChain]} via GMEOW.`
        const mode = await openWarpcastComposer(text, pointsFrameUrl)
        pushNotification.success(mode === 'miniapp' ? 'Your cast is live.' : 'Finish your cast in Warpcast.')
      } catch (e: any) {
        console.error('Share frame failed:', e?.message || String(e))
        pushNotification.error(`Share failed: ${e?.message || 'Could not open Warpcast'}`)
      }
    },
    [address, pointsFrameUrl, selectedChain, pushNotification]
  )

  const [stakeBusy, setStakeBusy] = useState(false)
  const [stakePoints, setStakePoints] = useState<number | string>('')     // amount to stake/unstake
  const [stakeBadgeId, setStakeBadgeId] = useState<number | string>('')  // badge id field
  const [stakePercent, setStakePercent] = useState<number>(10)            // 10..100 (% of totalPoints)
  const [linkToPercent, setLinkToPercent] = useState<boolean>(false)      // live-calc stakePoints from %

  // Stake handlers (ABI: stakeForBadge(points,badgeId) / unstakeForBadge(points,badgeId))
  const handleStakeForBadge = useCallback(async () => {
    if (!address) {
      pushNotification.warning('Please connect your wallet.')
      return
    }
    const stakeAmountRaw = Number(stakePoints || '0')
    const pts = BigInt(stakeAmountRaw)
    const bid = BigInt(Number(stakeBadgeId || '0'))
    if (pts <= 0n || bid <= 0n) {
      pushNotification.warning('Enter points and badge id.')
      return
    }
    try {
      const ok = await ensureChain(selectedChain)
      if (!ok) return
      setStakeBusy(true)
      const txHash = await coreWriteContract(wagmiConfig, {
        ...createStakeForBadgeTx(pts, bid, selectedChain),
        chainId: targetChainId,
        account: address,
      })
      pushNotification.info('Transaction sent.')
      const client = getPublicClient(wagmiConfig, { chainId: targetChainId })
      await client!.waitForTransactionReceipt({ hash: txHash })
      pushNotification.success(`Staked ${stakeAmountRaw.toLocaleString()} pts for badge #${stakeBadgeId}`)
      const before = lastKnownTotalRef.current
      const snapshot = await loadUserStats({ force: true, silent: true })
      const totalAfter = snapshot?.totalPoints ?? before
      const progress = snapshot?.progress ?? calculateRankProgress(totalAfter)
      const xpDelta = totalAfter - before
      const xpEarned = xpDelta > 0 ? xpDelta : 0
      const shareAmount = Math.max(xpEarned, Math.max(0, Math.round(stakeAmountRaw)))
      setXpOverlay({
        event: 'stake',
        chainKey: selectedChain,
        xpEarned,
        totalPoints: totalAfter,
        progress,
        visitLabel: 'Manage badges',
        visitUrl: '/profile',
        shareUrl: pointsFrameUrl || undefined,
        onShare: pointsFrameUrl ? () => sharePointsFrame('stake', shareAmount) : undefined,
        shareLabel: 'Share staking highlight',
      })
      if (address) {
        const previousTotal = Number.isFinite(before) ? before : null
        const resolvedTotal = Number.isFinite(totalAfter) ? totalAfter : (previousTotal ?? 0) + xpEarned
        const resolvedProgress = progress ?? calculateRankProgress(resolvedTotal)
        const delta = previousTotal != null ? resolvedTotal - previousTotal : xpEarned
        const metadata: Record<string, unknown> = {
          source: 'dashboard-stake',
          badgeId: stakeBadgeId ? Number(stakeBadgeId) : undefined,
          stakePoints: stakeAmountRaw,
          txHash,
        }
        for (const key of Object.keys(metadata)) {
          const value = metadata[key]
          if (value === undefined || value === null || value === '') delete metadata[key]
        }
        if (delta !== 0 || xpEarned > 0) {
          void emitRankTelemetryEvent({
            event: 'stake',
            chain: selectedChain,
            walletAddress: address,
            fid: linkedFid ?? null,
            delta,
            totalPoints: resolvedTotal,
            previousTotal,
            level: resolvedProgress.level,
            tierName: resolvedProgress.currentTier.name,
            tierPercent: resolvedProgress.percent * 100,
            metadata: Object.keys(metadata).length ? metadata : null,
          })
        }
      }
      setStakePoints('')
      setLastGMTimestamp(Math.floor(Date.now() / 1000))
    } catch (e: any) {
      pushNotification.error(e?.shortMessage || e?.message || 'Stake transaction failed')
    } finally { setStakeBusy(false) }
  }, [
    address,
    pushNotification,
    stakePoints,
    stakeBadgeId,
    ensureChain,
    selectedChain,
    wagmiConfig,
    targetChainId,
    pointsFrameUrl,
    sharePointsFrame,
    loadUserStats,
    linkedFid,
  ])

  const handleUnstakeForBadge = useCallback(async () => {
    if (!address) {
      pushNotification.warning('Please connect your wallet.')
      return
    }
    const unstakeAmountRaw = Number(stakePoints || '0')
    const pts = BigInt(unstakeAmountRaw)
    const bid = BigInt(Number(stakeBadgeId || '0'))
    if (pts <= 0n || bid <= 0n) {
      pushNotification.warning('Enter points and badge id.')
      return
    }
    try {
      const ok = await ensureChain(selectedChain)
      if (!ok) return
      setStakeBusy(true)
      const txHash = await coreWriteContract(wagmiConfig, {
        ...createUnstakeForBadgeTx(pts, bid, selectedChain),
        chainId: targetChainId,
        account: address,
      })
      pushNotification.info('Transaction sent.')
      const client = getPublicClient(wagmiConfig, { chainId: targetChainId })
      await client!.waitForTransactionReceipt({ hash: txHash })
      pushNotification.success(`Unstaked ${unstakeAmountRaw.toLocaleString()} pts from badge #${stakeBadgeId}`)
      const before = lastKnownTotalRef.current
      const snapshot = await loadUserStats({ force: true, silent: true })
      const totalAfter = snapshot?.totalPoints ?? before
      const progress = snapshot?.progress ?? calculateRankProgress(totalAfter)
      const xpDelta = totalAfter - before
      const xpEarned = xpDelta > 0 ? xpDelta : 0
      const shareAmount = Math.max(xpEarned, Math.max(0, Math.round(unstakeAmountRaw)))
      setXpOverlay({
        event: 'unstake',
        chainKey: selectedChain,
        xpEarned,
        totalPoints: totalAfter,
        progress,
        visitLabel: 'Manage badges',
        visitUrl: '/profile',
        shareUrl: pointsFrameUrl || undefined,
        onShare: pointsFrameUrl ? () => sharePointsFrame('unstake', shareAmount) : undefined,
        shareLabel: 'Share points update',
      })
      if (address) {
        const previousTotal = Number.isFinite(before) ? before : null
        const resolvedTotal = Number.isFinite(totalAfter) ? totalAfter : (previousTotal ?? 0) + xpDelta
        const resolvedProgress = progress ?? calculateRankProgress(resolvedTotal)
        const delta = previousTotal != null ? resolvedTotal - previousTotal : xpDelta
        const metadata: Record<string, unknown> = {
          source: 'dashboard-unstake',
          badgeId: stakeBadgeId ? Number(stakeBadgeId) : undefined,
          unstakePoints: unstakeAmountRaw,
          txHash,
        }
        for (const key of Object.keys(metadata)) {
          const value = metadata[key]
          if (value === undefined || value === null || value === '') delete metadata[key]
        }
        if (delta !== 0) {
          void emitRankTelemetryEvent({
            event: 'unstake',
            chain: selectedChain,
            walletAddress: address,
            fid: linkedFid ?? null,
            delta,
            totalPoints: resolvedTotal,
            previousTotal,
            level: resolvedProgress.level,
            tierName: resolvedProgress.currentTier.name,
            tierPercent: resolvedProgress.percent * 100,
            metadata: Object.keys(metadata).length ? metadata : null,
          })
        }
      }
      setStakePoints('')
    } catch (e: any) {
      pushNotification.error(e?.shortMessage || e?.message || 'Unstake transaction failed')
    } finally { setStakeBusy(false) }
  }, [
    address,
    pushNotification,
    stakePoints,
    stakeBadgeId,
    ensureChain,
    selectedChain,
    wagmiConfig,
    targetChainId,
    sharePointsFrame,
    pointsFrameUrl,
    loadUserStats,
    // @edit-start 2025-02-15 — Ensure unstake telemetry reacts to linked fid changes
    linkedFid,
    // @edit-end
  ])

  // Stake UI helpers: percent of total and APY display
  // Keep stakePoints in sync when linked to % and stats change
  useEffect(() => {
    if (!linkToPercent) return
    const base = totalPoints // use total for UI, but clamp to available
    const desired = Math.floor((base * stakePercent) / 100)
    const clamped = Math.min(desired, availablePoints)
    setStakePoints(String(clamped))
  }, [linkToPercent, stakePercent, totalPoints, availablePoints])

  const stakeAmountNumeric = useMemo(() => {
    const parsed = Number(stakePoints)
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return parsed
  }, [stakePoints])

  const fallbackStakeBase = useMemo(() => {
    if (stakeAmountNumeric > 0) return stakeAmountNumeric
    if (lockedPoints > 0) return lockedPoints
    if (availablePoints > 0) return availablePoints
    return 0
  }, [stakeAmountNumeric, lockedPoints, availablePoints])

  const gmBonusPct = useMemo(() => {
    if (streak >= 100) return gmBonusConfig.bonus100
    if (streak >= 30) return gmBonusConfig.bonus30
    if (streak >= 7) return gmBonusConfig.bonus7
    return 0
  }, [gmBonusConfig, streak])

  const gmDerivedYields = useMemo(() => {
    if (gmRewardBase == null || gmCooldownSeconds == null || gmCooldownSeconds <= 0) return null
    const baseReward = gmRewardBase
    const bonusReward = Math.floor((baseReward * gmBonusPct) / 100)
    const rewardPerGM = baseReward + bonusReward
    const gmsPerDay = 86400 / gmCooldownSeconds
    const gmsPerYear = gmsPerDay * 365
    const projectedAnnualPoints = rewardPerGM * gmsPerYear
    const apy = fallbackStakeBase > 0 ? (projectedAnnualPoints / fallbackStakeBase) * 100 : null
    return {
      rewardPerGM,
      gmsPerDay,
      gmsPerYear,
      projectedAnnualPoints,
      apy,
    }
  }, [gmRewardBase, gmCooldownSeconds, gmBonusPct, fallbackStakeBase])

  const gmCooldownHours = useMemo(() => {
    if (gmCooldownSeconds == null || gmCooldownSeconds <= 0) return null
    return gmCooldownSeconds / 3600
  }, [gmCooldownSeconds])

  const handleGM = useCallback(async () => {
    if (!isConnected) {
      pushNotification.warning('Please connect your wallet.')
      return
    }
    if (!canGM) {
      pushNotification.info('Come back after the reset window.')
      return
    }
    try {
      if (walletChainId !== targetChainId) {
        pushNotification.info(`Switching to ${CHAIN_LABEL[selectedChain]}`)
        await switchChainAsync({ chainId: targetChainId })
      }
      writeContract({
        address: contractAddress,
        abi: ABI,
        functionName: 'sendGM',
        chainId: targetChainId,
      })
      pushNotification.info('Broadcasting transaction.')
    } catch (e: any) {
      console.error('GM failed:', e?.message || String(e))
      pushNotification.error(e?.message || 'Unknown error')
    }
  }, [
    isConnected,
    pushNotification,
    canGM,
    walletChainId,
    targetChainId,
    switchChainAsync,
    selectedChain,
    writeContract,
    contractAddress,
    ABI,
  ])

  const handleShareGMFrame = useCallback(async () => {
    if (!address) {
      pushNotification.warning('Please connect your wallet.')
      return
    }
    if (!gmFrameUrl) {
      pushNotification.error('Unable to build a GM frame right now.')
      return
    }
    try {
      pushNotification.info('Opening Warpcast composer.')
      const text = getTimeBasedShareText(CHAIN_LABEL[selectedChain])
      const mode = await openWarpcastComposer(text, gmFrameUrl)
      pushNotification.success(mode === 'miniapp' ? 'Your GM cast is live.' : 'Finish your cast in Warpcast.')
    } catch (e: any) {
      console.error('Share frame failed:', e?.message || String(e))
      pushNotification.error(`Share failed: ${e?.message || 'Could not open Warpcast'}`)
    }
  }, [address, gmFrameUrl, selectedChain, pushNotification])

  // Post-GM success notification
  useEffect(() => {
    if (!isConfirmed || !txHash) return
    pushNotification.success(`GM sent on ${CHAIN_LABEL[selectedChain]}! Streak updated.`)

    const run = async () => {
      const before = lastKnownTotalRef.current
      const snapshot = await loadUserStats({ force: true, silent: true })
      const totalAfter = snapshot?.totalPoints ?? before
      const progress = snapshot?.progress ?? calculateRankProgress(totalAfter)
      const xpDelta = totalAfter - before
      const fallbackXp = gmRewardBase ?? 0
      const xpEarnedRaw = xpDelta > 0 ? xpDelta : fallbackXp
      const xpEarned = xpEarnedRaw > 0 ? xpEarnedRaw : 0

      setXpOverlay({
        event: 'gm',
        chainKey: selectedChain,
        xpEarned,
        totalPoints: totalAfter,
        progress,
        shareUrl: gmFrameUrl || undefined,
        onShare: gmFrameUrl ? handleShareGMFrame : undefined,
        shareLabel: 'Share GM victory',
      })

      // @edit-start 2025-11-11 — Emit telemetry for GM rank updates
      if (address && xpEarned > 0) {
        const previousTotal = Number.isFinite(before) && before > 0 ? before : null
        const computedTotal = totalAfter > 0 ? totalAfter : (previousTotal ?? 0) + xpEarned
        const telemetryProgress = computedTotal === totalAfter ? progress : calculateRankProgress(computedTotal)
        void emitRankTelemetryEvent({
          event: 'gm',
          chain: selectedChain,
          walletAddress: address,
          fid: linkedFid ?? null,
          delta: xpEarned,
          totalPoints: computedTotal,
          previousTotal,
          level: telemetryProgress.level,
          tierName: telemetryProgress.currentTier.name,
          tierPercent: telemetryProgress.percent * 100,
          metadata: {
            source: 'dashboard-gm',
            txHash,
            streak,
            gmRewardBase: gmRewardBase ?? undefined,
          },
        })
      }
      // @edit-end

      setGmShareReady(true)
      setLastGMTimestamp(Math.floor(Date.now() / 1000))
    }

    void run()
  }, [
    isConfirmed,
    txHash,
    selectedChain,
    pushNotification,
    loadUserStats,
    gmRewardBase,
    gmFrameUrl,
    handleShareGMFrame,
    address,
    linkedFid,
    streak,
  ])
  const tipStatusLabel = useMemo(() => {
    if (!tipOptIn) return 'Disabled'
    if (tipStreamStatus === 'connecting') return 'Connecting…'
    if (tipStreamStatus === 'open') return 'Live'
    if (tipStreamStatus === 'error') return 'Reconnecting…'
    return 'Idle'
  }, [tipOptIn, tipStreamStatus])
  const dailyBonus = useMemo(() => (streak > 0 ? Math.min(25, 10 + Math.floor(streak / 5)) : 10), [streak]) // simple UX bonus estimate

  // Active quests (UI-only progress for preview)
  const gmQuestProgress = useMemo(() => (canGM ? 0 : 1), [canGM]) // 1/1 if already GM'd today

  // Load my referral code on the selected chain
  useEffect(() => {
    let disposed = false
    const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
      ])

    const run = async () => {
      if (!address) { setMyRefCode(''); return }
      try {
        const client = getPublicClient(wagmiConfig, { chainId: targetChainId })
        if (!client) return
        const codeStr = await rpcTimeout(
          client.readContract({
            address: contractAddress,
            abi: ABI,
            functionName: 'referralCodeOf',
            args: [address],
          }) as Promise<string>,
          ''
        )
        if (!disposed) setMyRefCode(codeStr || '')
      } catch { if (!disposed) setMyRefCode('') }
    }
    run()
    return () => { disposed = true }
  }, [address, wagmiConfig, targetChainId, contractAddress, ABI])

  // Generate code (for legacy accounts)
  const ensureMyCode = useCallback(async () => {
    if (!address) {
      pushNotification.warning('Sign in to set a referral code.')
      return
    }
    if (typeof window === 'undefined') return

    const suggestion = myRefCode || `gmeow-${address.slice(2, 6)}`
    const input = window.prompt('Pick a referral code (3-32 chars, letters/numbers/-_.).', suggestion)
    if (!input) {
      pushNotification.info('Referral code unchanged.')
      return
    }
    const cleaned = input.trim()
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(cleaned)) {
      pushNotification.warning('Use 3-32 characters (letters, numbers, ._-).')
      return
    }
    try {
      if (walletChainId !== targetChainId) {
        pushNotification.info(`Switching to ${CHAIN_LABEL[selectedChain]}`)
        await switchChainAsync({ chainId: targetChainId })
      }
      const txHash = await coreWriteContract(wagmiConfig, {
        address: contractAddress,
        abi: ABI,
        functionName: 'registerReferralCode',
        args: [cleaned],
        chainId: targetChainId,
        account: address,
      })
      pushNotification.info('Transaction sent.')
      const client = getPublicClient(wagmiConfig, { chainId: targetChainId })
      await client!.waitForTransactionReceipt({ hash: txHash })
      setMyRefCode(cleaned)
      pushNotification.success(`@${cleaned} is ready to share.`)
    } catch (e: any) {
      pushNotification.error(e?.shortMessage || e?.message || 'Could not set code.')
    }
  }, [
    address,
    pushNotification,
    myRefCode,
    walletChainId,
    targetChainId,
    switchChainAsync,
    selectedChain,
    wagmiConfig,
    contractAddress,
    ABI,
  ])

  const reminders = useMemo<DashboardReminder[]>(() => {
    if (!hasMounted) return []
    const list: DashboardReminder[] = []

    if (address && canGM) {
      list.push({
        id: 'gm-ready',
        title: `Send GM on ${CHAIN_LABEL[selectedChain]}`,
        description:
          streak > 0
            ? `Keep your ${streak}-day streak alive and stack the bonus.`
            : 'Start your streak with a quick GM to unlock daily rewards.',
        tone: 'success',
        actionLabel: 'Send GM',
        onAction: () => {
          void handleGM()
        },
        icon: '☀️',
      })
    }

    if (address && expiredQuests.length) {
      const activeCount = expiredQuests.filter((row) => row.isActive).length
      const chainNames = Array.from(new Set(expiredQuests.map((row) => CHAIN_LABEL[row.chain])))
      const listedChains = chainNames.slice(0, 3).join(', ')
      const hasMoreChains = chainNames.length > 3
      const chainLabel = listedChains ? `${listedChains}${hasMoreChains ? '…' : ''}` : CHAIN_LABEL[selectedChain]
      list.push({
        id: 'expired-quests',
        title: 'Reclaim quest escrow',
        description: `You have ${expiredQuests.length} expired quest${expiredQuests.length === 1 ? '' : 's'} with escrow across ${chainLabel}. ${activeCount ? `${activeCount} still marked active—close them to stop claims.` : 'Refund any remaining escrow to recover rewards.'}`,
        tone: 'warn',
        actionLabel: 'Review quests',
        href: '#expired-quests',
        icon: '🛡️',
      })
    }

    if (address && !tipOptIn) {
      list.push({
        id: 'tip-stream',
        title: 'Enable tip alerts',
        description: 'Switch on the live tip stream to celebrate Warpcast boosts the moment they land.',
        tone: 'info',
        actionLabel: 'Enable stream',
        onAction: () => setTipOptIn(true),
        icon: '⚡',
      })
    }

    if (address && !myRefCode) {
      list.push({
        id: 'referral-code',
        title: 'Claim your referral code',
        description: `Secure a referral code on ${CHAIN_LABEL[selectedChain]} to track invites and earn guild boosts.`,
        tone: 'info',
        actionLabel: 'Set code',
        onAction: () => {
          void ensureMyCode()
        },
        icon: '🔗',
      })
    }

    return list
  }, [
    hasMounted,
    address,
    canGM,
    selectedChain,
    streak,
    expiredQuests,
    tipOptIn,
    myRefCode,
    handleGM,
    setTipOptIn,
    ensureMyCode,
  ])

  // Copy helpers
  const copyText = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      pushNotification.success(label ? `${label} copied.` : 'Copied.')
    } catch {
      pushNotification.error('Unable to copy to clipboard.')
    }
  }
  const inviteUrl = useMemo(() => {
    if (!myRefCode) return ''
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      return `${origin}/?ref=${encodeURIComponent(myRefCode)}`
    } catch { return '' }
  }, [myRefCode])

  const renderLeftColumn = () => (
    <>
      {/* GM Button */}
      <div className="pixel-card dash-gm-card">
        <div className="dash-gm-glow" aria-hidden />
        <div className="dash-gm-content">
          <div className="dash-gm-orb" aria-hidden>
            <span>☀️</span>
            <div className="dash-gm-pulse" />
          </div>
          <h2 className="dash-gm-title">GM on {CHAIN_LABEL[selectedChain]}</h2>
          <p className="dash-gm-message">{gmMessage}</p>
          <button
            onClick={handleGM}
            disabled={!hasMounted || !isConnected || !canGM || isWritePending || isConfirming || isSwitching}
            className="dash-gm-button"
          >
            {isSwitching
              ? 'Switching…'
              : isWritePending
              ? 'Sending GM…'
              : isConfirming
              ? 'Confirming…'
              : `Send GM (${streak}🔥)`}
          </button>
          <div className="dash-gm-stats">
            <div>
              <div className="dash-gm-stat-label">Base Reward</div>
              <div className="dash-gm-stat-value">{gmRewardBase != null ? `${gmRewardBase} pts` : '—'}</div>
            </div>
            <div>
              <div className="dash-gm-stat-label">Bonus</div>
              <div className="dash-gm-stat-value">{gmBonusPct ? `${gmBonusPct}%` : '0%'}</div>
            </div>
            <div>
              <div className="dash-gm-stat-label">Cooldown</div>
              <div className="dash-gm-stat-value">{gmCooldownHours != null ? `${gmCooldownHours.toFixed(1)}h` : '—'}</div>
            </div>
          </div>
          {gmShareReady && gmFrameUrl ? (
            <div className="dash-gm-share">
              <div className="dash-gm-share-text">Share your latest GM frame</div>
              <button onClick={handleShareGMFrame} className="dash-gm-share-button">Share Frame ↗</button>
            </div>
          ) : null}
          {writeError ? <p className="dash-gm-error">Error: {writeError.message}</p> : null}
        </div>
      </div>

      {/* Streak/Points Card */}
      <div className="pixel-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div>
            <div className="pixel-stat text-orange-300">{streak}</div>
            <div className="text-sm text-[var(--px-sub)]">Current Streak</div>
          </div>
          <div>
            <div className="pixel-stat text-cyan-300">{availablePoints.toLocaleString()}</div>
            <div className="text-sm text-[var(--px-sub)]">Points (available)</div>
          </div>
        </div>
        <div className="pixel-divider my-3" />
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-bold">{availablePoints.toLocaleString()}</div>
            <div className="text-[var(--px-sub)]">Available</div>
          </div>
          <div>
            <div className="font-bold">{lockedPoints.toLocaleString()}</div>
            <div className="text-[var(--px-sub)]">Locked</div>
          </div>
          <div>
            <div className="font-bold">{totalPoints.toLocaleString()}</div>
            <div className="text-[var(--px-sub)]">Total</div>
          </div>
        </div>
        <div className="pixel-divider my-4" />
        <div className="text-center text-sm">
          Daily Bonus: <span className="font-bold text-emerald-300">+{dailyBonus} pts</span>
        </div>
        <div className="pixel-divider my-3" />
        <div className="text-center text-sm text-[var(--px-sub)]">
          Lifetime earned:{' '}
          <span className="font-bold text-sky-300">{totalEarned.toLocaleString()} pts</span>
        </div>
      </div>

      {/* Teams Preview */}
      <div className="pixel-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="pixel-section-title">Team</h3>
        </div>
        {team ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{team.name}</div>
                <div className="text-sm text-[var(--px-sub)]">
                  {CHAIN_LABEL[team.chain]} • Members {team.memberCount}
                </div>
              </div>
              <div className="pixel-pill text-[10px]">#{team.teamId}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/team/${team.chain}/${team.teamId}`} className="btn-secondary btn-sm">
                View Team Page
              </Link>
              <button
                className="btn-secondary btn-sm disabled:opacity-50"
                disabled={!myRefCode || !inviteUrl}
                onClick={() => inviteUrl && copyText(inviteUrl, 'Invite link')}
              >
                Invite via Code
              </button>
            </div>
            <div className="text-sm text-[var(--px-sub)]">
              {myRefCode ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>Your code: <span className="font-bold">@{myRefCode}</span> — share it freely.</span>
                  <button className="btn-secondary btn-sm" onClick={ensureMyCode}>Update Code</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>No referral code on {CHAIN_LABEL[selectedChain]}.</span>
                  <button className="btn-secondary btn-sm" onClick={ensureMyCode}>Set Referral Code</button>
                  <Link href="/Guild" className="underline">Set custom code in Guild</Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--px-sub)]">
              You’re not in a team yet. Join or create one!
            </div>
            <Link href="/Guild" className="btn-secondary btn-sm">Open Guild</Link>
          </div>
        )}
      </div>

      {/* Stake for Badge */}
      <div className="pixel-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="pixel-section-title">Stake for Badge</h3>
          <span className="pixel-pill text-[10px]">{CHAIN_LABEL[selectedChain]}</span>
        </div>
        <div className="mb-2 text-sm text-[var(--px-sub)]">
          Stats on {CHAIN_LABEL[selectedChain]}: Avail {availablePoints.toLocaleString()} • Locked {lockedPoints.toLocaleString()} • Total {totalPoints.toLocaleString()}
          {statsLoading ? <span className="ml-2">(<span className="animate-pulse">updating…</span>)</span> : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm text-[var(--px-sub)] mb-1">Points</div>
            <input
              className="pixel-input w-full"
              inputMode="numeric"
              placeholder="e.g. 100"
              value={stakePoints}
              onChange={(e) => {
               const v = e.target.value.replace(/[^\d]/g, '')
               const n = Number(v || '0')
               const clamped = Math.min(n, availablePoints)
               setStakePoints(String(clamped))
               if (totalPoints > 0) {
                 const pct = Math.min(100, Math.max(0, Math.round((clamped / totalPoints) * 100)))
                 setStakePercent(pct)
               }
              }}
            />
          </div>
          <div>
            <div className="text-sm text-[var(--px-sub)] mb-1">Badge ID</div>
            <input
              className="pixel-input w-full"
              inputMode="numeric"
              placeholder="e.g. 1"
              value={stakeBadgeId}
              onChange={(e) => setStakeBadgeId(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <div className="flex items-center justify-between text-sm mb-1">
      <label htmlFor="stake-percent-range">Stake % of total</label>
      <span className="font-bold">{stakePercent}%</span>
    </div>
    <input
      id="stake-percent-range"
      type="range"
      min={10}
      max={100}
      step={5}
      value={stakePercent}
      onChange={(e) => setStakePercent(Number(e.target.value))}
      className="w-full"
      aria-label={`Stake percentage: ${stakePercent}%`}
    />
    <label className="mt-1 flex items-center gap-2 text-sm">
      <input
                type="checkbox"
                checked={linkToPercent}
                onChange={(e) => setLinkToPercent(e.target.checked)}
              />
              Link amount to % (auto-calc; capped by available)
            </label>
          </div>
          <div className="dash-apy-card">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Projected APY</span>
              <span className="font-bold">
                {gmDerivedYields?.apy != null ? `${gmDerivedYields.apy > 999 ? '999+' : gmDerivedYields.apy.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="text-sm text-[var(--px-sub)] leading-relaxed space-y-1">
              <div>
                Reward / GM:{' '}
                <span className="font-semibold">
                  {gmDerivedYields ? Math.round(gmDerivedYields.rewardPerGM).toLocaleString() : '—'} pts
                </span>
              </div>
              <div>
                Cooldown:{' '}
                <span className="font-semibold">
                  {gmCooldownSeconds ? `${(gmCooldownSeconds / 3600).toFixed(1)} h` : '—'}
                </span>
              </div>
              <div>
                Yearly points:{' '}
                <span className="font-semibold">
                  {gmDerivedYields ? Math.round(gmDerivedYields.projectedAnnualPoints).toLocaleString() : '—'}
                </span>
              </div>
            </div>
            <div className="dash-apy-meter" aria-hidden>
              <div
                className="dash-apy-meter-fill transition-all duration-300"
                style={{ width: `${gmDerivedYields?.apy != null ? Math.min(100, Math.max(0, gmDerivedYields.apy)) : 0}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--px-sub)] mt-1">
              Based on on-chain GM reward, streak bonus, and cooldown. Actual yield depends on maintaining streaks.
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            className="pixel-button"
            disabled={!hasMounted || !address || stakeBusy}
            onClick={handleStakeForBadge}
          >
            {stakeBusy ? 'Processing…' : 'Stake'}
          </button>
          <button
            className="btn-secondary"
            disabled={!hasMounted || !address || stakeBusy}
            onClick={handleUnstakeForBadge}
          >
            {stakeBusy ? 'Processing…' : 'Unstake'}
          </button>
        </div>
        <div className="text-sm text-[var(--px-sub)] mt-2">
          Burn points to mint or power-up badges. Unstake to retrieve points if supported.
        </div>
      </div>
    </>
  )

  const renderMiddleColumn = () => (
    <>
      <AnalyticsHighlights
        data={dashboardTelemetry}
        loading={telemetryLoading}
        error={telemetryError}
        stale={telemetryStale}
        lastUpdated={telemetryLastUpdated}
        onRefresh={refreshTelemetry}
      />

      {/* Leaderboard Preview */}
      <div className="pixel-card overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="pixel-section-title">Leaderboard</h3>
          <span className="pixel-pill text-[10px]">Top 5</span>
        </div>
        <div className="grid grid-cols-[2rem,1fr,6rem] sm:grid-cols-[2.5rem,1fr,7rem] gap-2 px-3 py-2 text-xs sm:text-sm text-[var(--px-sub)]">
          <div>#</div>
          <div>Name</div>
          <div className="text-right">Points</div>
        </div>
        <div className="dash-leaderboard-list">
          {lbLoading && !lbTop5.length ? (
            <div className="py-4">
              <QuestLoadingDeck columns="single" count={3} dense />
            </div>
          ) : lbTop5.length ? (
            lbTop5.map((e, i) => (
              <div
                key={`${i}-${e.address}`}
                className="grid grid-cols-[2rem,1fr,6rem] sm:grid-cols-[2.5rem,1fr,7rem] gap-2 px-3 py-2 items-center"
              >
                <div className="font-extrabold">{i + 1}</div>
                <div className="truncate">{formatAddress(e.address)}</div>
                <div className="text-right font-extrabold text-purple-300">{e.points.toLocaleString()}</div>
              </div>
            ))
          ) : (
            <div className="px-3 py-5 text-center text-sm text-[var(--px-sub)]">No entries yet</div>
          )}
        </div>
      </div>

      {/* Active Quests */}
      <div className="pixel-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="pixel-section-title">Active Quests</h3>
          <span className="pixel-pill text-[10px]">2</span>
        </div>
        {/* Quest 1: Daily GM */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm">
            <div className="font-bold">Daily GM</div>
            <div className="text-sm text-[var(--px-sub)]">{gmQuestProgress}/1</div>
          </div>
          <div className="dash-progress-track mt-1">
            <div className="dash-progress-fill bg-emerald-400 transition-all duration-300" style={{ width: `${(gmQuestProgress / 1) * 100}%` }} />
          </div>
          <div className="text-sm text-[var(--px-sub)] mt-1">Send GM on {CHAIN_LABEL[selectedChain]}</div>
        </div>

        {/* Quest 2: Join a Team (preview) */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <div className="font-bold">Join a Team</div>
            <div className="text-sm text-[var(--px-sub)]">{team ? '1/1' : '0/1'}</div>
          </div>
          <div className="dash-progress-track mt-1">
            <div className="dash-progress-fill bg-cyan-400 transition-all duration-300" style={{ width: `${team ? 100 : 0}%` }} />
          </div>
          <div className="text-sm text-[var(--px-sub)] mt-1">Join or create a team to unlock bonuses</div>
        </div>
      </div>

      {/* NEW: Expired Quests (Escrow) */}
      <div id="expired-quests" className="pixel-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="pixel-section-title">Expired Quests (Escrow)</h3>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="pixel-pill text-[10px]">{expiredQuests.length}</span>
            <button
              className="pixel-button btn-sm disabled:opacity-50"
              onClick={handleCloseAllExpired}
              disabled={!hasMounted || closeAllBusy || expiredLoading || !address || !hasClosableExpired}
              title="Close all expired quests that are still active"
            >
              {closeAllBusy ? 'Closing…' : 'Close All Active'}
            </button>
            <button
              className="btn-secondary btn-sm disabled:opacity-50"
              onClick={scanExpiredQuests}
              disabled={!hasMounted || expiredLoading || !address}
              title="Scan across chains"
            >
              {expiredLoading ? 'Scanning…' : 'Scan All Chains'}
            </button>
          </div>
        </div>
        {!hasMounted ? (
          <div className="text-[var(--px-sub)] text-sm">Loading…</div>
        ) : !address ? (
          <div className="text-[var(--px-sub)] text-sm">Connect wallet to find your expired quests with escrow.</div>
        ) : expiredError ? (
          <div className="text-red-400 text-sm">{expiredError}</div>
        ) : expiredLoading && !expiredQuests.length ? (
          <QuestLoadingDeck columns="single" count={3} dense />
        ) : expiredQuests.length === 0 ? (
          <div className="text-[var(--px-sub)] text-sm">No expired/closed quests with remaining escrow found.</div>
        ) : (
          <div className="space-y-3">
            {expiredQuests.map((r) => {
              const chainLabel = CHAIN_LABEL[r.chain]
              const isToken = !!r.rewardToken && r.rewardToken !== '0x0000000000000000000000000000000000000000'
              const claimsLeft = isToken ? r.remainingClaimsToken : r.remainingClaimsPoints
              return (
                <div key={rowKey(r)} className="dash-expired-row rounded-md p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="pixel-pill text-[10px]">{chainLabel}</span>
                      <div className="font-bold truncate">{r.name || `Quest #${r.questId}`}</div>
                    </div>
                    <div className="text-[10px] text-[var(--px-sub)]">#{r.questId}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 text-sm text-[var(--px-sub)]">
                    <div>
                      Status: <span className="font-bold">{r.isActive ? 'Active (but expired)' : 'Closed'}</span>
                      {r.expiresAt ? <> • Expires: {new Date(r.expiresAt * 1000).toLocaleString()}</> : <> • Expires: never</>}
                    </div>
                    <div>
                      {isToken ? (
                        <>
                          Token escrow: <span className="font-bold">{r.tokenEscrowRemaining ?? 0}</span>
                          {r.rewardTokenPerUser ? <> • per-user: {r.rewardTokenPerUser}</> : null}
                          {typeof claimsLeft === 'number' ? <> • est. remaining claims: {claimsLeft}</> : null}
                        </>
                      ) : (
                        <>
                          Point escrow: <span className="font-bold">{r.escrowedPoints ?? 0}</span>
                          {r.rewardPointsPerUser ? <> • per-user: {r.rewardPointsPerUser}</> : null}
                          {typeof claimsLeft === 'number' ? <> • est. remaining claims: {claimsLeft}</> : null}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      className="btn-secondary btn-sm disabled:opacity-50"
                      disabled={!hasMounted || closeBusyId === rowKey(r)}
                      onClick={() => handleCloseQuestRow(r)}
                      title="Close quest to stop claims (sometimes required before refund)"
                    >
                      {closeBusyId === rowKey(r) ? 'Closing…' : `Close on ${chainLabel}`}
                    </button>
                    <button
                      className="pixel-button btn-sm disabled:opacity-50"
                      disabled={!hasMounted || refundBusyId === rowKey(r)}
                      onClick={() => handleRefundQuestRow(r)}
                      title="Claim remaining escrow back to creator"
                    >
                      {refundBusyId === rowKey(r) ? 'Claiming…' : `Claim Escrow (${chainLabel})`}
                    </button>
                    <Link className="underline text-sm" href={`/Quest/${r.chain}/${r.questId}`} title="Open quest page">
                      Open quest ↗
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )

  const renderRightColumn = () => (
    <>
      <DashboardNotificationCenter
        tipOptIn={tipOptIn}
        onTipOptInChange={(value) => setTipOptIn(value)}
        tipStatusLabel={tipStatusLabel}
        tipFeed={tipFeed}
      />

      <TipMentionSummaryCard
        summary={mentionSummary}
        loading={mentionSummaryLoading}
        error={mentionSummaryError}
        onRefresh={handleMentionSummaryRefresh}
      />

      <ReminderPanel reminders={reminders} />

      <div className="pixel-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="pixel-section-title">Badges</h3>
          <span className="pixel-pill text-[10px]">{badges.length}</span>
        </div>
        {badgesLoading && !badges.length ? (
          <div className="py-4">
            <QuestLoadingDeck columns="single" count={3} dense />
          </div>
        ) : badges.length ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((b) => (
                <div key={`${b.chain}-${b.badgeId}`} className="text-center">
                  <div className="dash-badge-tile" title={`${b.name || `Badge #${b.badgeId}`}`}>
                    {b.image ? (
                      <Image
                        src={b.image}
                        alt={b.name || `Badge #${b.badgeId}`}
                        width={68}
                        height={68}
                        className="pixelated object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-[var(--px-sub)]">#{b.badgeId}</span>
                    )}
                  </div>
                  <div className="text-sm truncate">{b.name || `Badge #${b.badgeId}`}</div>
                  <div className="text-[10px] text-[var(--px-sub)]">{CHAIN_LABEL[b.chain]}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <Link 
                href={linkedFid ? `/profile/${linkedFid}/badges` : '/profile'} 
                className="underline text-sm hover:text-[var(--px-accent)] transition-colors"
              >
                View full badge collection ↗
              </Link>
            </div>
          </>
        ) : (
          <div className="text-[var(--px-sub)] text-sm">
            No badges yet
            {linkedFid && (
              <div className="mt-2">
                <Link 
                  href={`/profile/${linkedFid}/badges`}
                  className="text-sm text-[var(--px-accent)] hover:underline"
                >
                  View badges page →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="dash-root relative mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6">
      <XPEventOverlay open={Boolean(xpOverlay)} payload={xpOverlay} onClose={() => setXpOverlay(null)} />

      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="pixel-section-title">GMEOW Dashboard</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs sm:text-sm text-[var(--px-sub)]">Chain</label>
          <ChainSwitcher
            selected={selectedChain}
            onSelect={(c) => setSelectedChain(c)}
            busyChain={switchingFor}
            autoSwitch
            ensureChainAsync={ensureChain}
          />
        </div>
      </div>

      {/* Overview Guide */}
      <div className="mb-4 sm:mb-6">
        <PointsGuide />
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden space-y-4">
        <DashboardMobileTabs
          tabs={MOBILE_TAB_ITEMS}
          activeTab={mobileTab}
          onTabChange={setMobileTab}
        />
        <div className="space-y-4">
          {mobileTab === 'overview' ? (
            <div className="space-y-4">{renderLeftColumn()}</div>
          ) : null}
          {mobileTab === 'missions' ? (
            <div className="space-y-4">{renderMiddleColumn()}</div>
          ) : null}
          {mobileTab === 'social' ? (
            <div className="space-y-4">{renderRightColumn()}</div>
          ) : null}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">{renderLeftColumn()}</div>
        <div className="space-y-4">{renderMiddleColumn()}</div>
        <div className="space-y-4">{renderRightColumn()}</div>
      </div>
    </div>
  )
}