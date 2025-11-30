// app/Quest/[chain]/[id]/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { format } from 'date-fns'
import { RankProgress } from '@/components/ui/RankProgress'
import { ChainIcon, QuestChainChip } from '@/components/Quest/QuestChainBadge'
import QuestLoadingDeck from '@/components/Quest/QuestLoadingDeck'
import {
  CHAIN_LABEL,
  CHAIN_KEYS,
  CHAIN_IDS,
  CONTRACT_ADDRESSES,
  GM_CONTRACT_ABI,
  isAddress,
  QUEST_TYPES_BY_CODE,
  toQuestTypeCode,
  createCompleteQuestWithSigTx,
  createCloseQuestTx,
  createSetFarcasterFidTx,
  type ChainKey,
  normalizeQuestStruct,
  type NormalizedQuest,
} from '@/lib/gmeow-utils'
import { createPublicClient, encodeFunctionData, http, type Abi } from 'viem'
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi'
import { fetchFidByAddress } from '@/lib/neynar'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import { calculateRankProgress } from '@/lib/rank'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { readStorageCache, writeStorageCache } from '@/lib/utils'
// @edit-start 2025-11-11 — Rank telemetry client helper usage
import { emitRankTelemetryEvent } from '@/lib/rank-telemetry-client'
// @edit-end

declare global {
  interface Window {
    ethereum?: any
  }
}

// Minimal ABI fallback for on-chain reads when GM_CONTRACT_ABI is empty
const MIN_GM_ABI: Abi = (Array.isArray(GM_CONTRACT_ABI) && (GM_CONTRACT_ABI as any).length > 0
  ? (GM_CONTRACT_ABI as unknown as Abi)
  : [
      {
        type: 'function',
        stateMutability: 'view',
        name: 'getQuest',
        inputs: [{ name: 'questId', type: 'uint256' }],
        outputs: [
          { name: 'name', type: 'string' },
          { name: 'questType', type: 'uint8' },
          { name: 'target', type: 'uint256' },
          { name: 'rewardPoints', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'maxCompletions', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'meta', type: 'string' },
          { name: 'isActive', type: 'bool' },
          { name: 'rewardToken', type: 'address' },
          { name: 'rewardTokenPerUser', type: 'uint256' },
          { name: 'tokenEscrowRemaining', type: 'uint256' },
        ],
      },
      {
        type: 'function',
        stateMutability: 'view',
        name: 'quests',
        inputs: [{ name: 'questId', type: 'uint256' }],
        outputs: [
          { name: 'name', type: 'string' },
          { name: 'questType', type: 'uint8' },
          { name: 'target', type: 'uint256' },
          { name: 'rewardPoints', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'maxCompletions', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'meta', type: 'string' },
          { name: 'isActive', type: 'bool' },
          { name: 'escrowedPoints', type: 'uint256' },
          { name: 'claimedCount', type: 'uint256' },
          { name: 'rewardToken', type: 'address' },
          { name: 'rewardTokenPerUser', type: 'uint256' },
          { name: 'tokenEscrowRemaining', type: 'uint256' },
        ],
      },
    ]) as Abi

// Public RPCs for client-side reads
const PUBLIC_RPCS: Record<ChainKey, string> = {
  base: process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org',
  op: process.env.NEXT_PUBLIC_RPC_OP || 'https://mainnet.optimism.io',
  celo: process.env.NEXT_PUBLIC_RPC_CELO || 'https://forno.celo.org',
  unichain: process.env.NEXT_PUBLIC_RPC_UNICHAIN || 'https://rpc.unichain.org',
  ink: process.env.NEXT_PUBLIC_RPC_INK || 'https://mainnet.inkchain.org',
}
function getRpcUrlFor(chain: ChainKey): string { return PUBLIC_RPCS[chain] || '' }

const QUEST_DETAIL_CACHE_PREFIX = 'gmeowQuestDetail_v1::'
const QUEST_DETAIL_CACHE_TTL_MS = 1000 * 60 * 5

type QuestDetailCachePayload = {
  quest: NormalizedQuest
  meta: Record<string, any> | null
}

// Safe JSON stringify
function safeStringify(obj: any, space = 2) {
  const seen = new WeakSet()
  return JSON.stringify(
    obj,
    (k: string, v: any) => {
      if (typeof v === 'bigint') return v.toString()
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]'
        seen.add(v)
      }
      return v
    },
    space,
  )
}
function formatUnix(ts?: number) {
  if (!ts) return '—'
  try { return format(new Date(ts * 1000), 'PP p') } catch { return String(ts) }
}
function short(str?: string, len = 16) {
  if (!str) return ''
  if (str.length <= len) return str
  return str.slice(0, len) + '…'
}

function toNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

// Short human duration, e.g. "1h 2m 3s"
function formatDurationShort(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

type NormalizedCast = { url: string; hash: string; identifier: string }

// Collects the best possible cast URL/hash combo from user input, quest meta, and preview data.
function normalizeCastInput(
  raw: string,
  meta: Record<string, any> | null | undefined,
  preview: any,
): NormalizedCast {
  const candidates = new Set<string>()
  const pushCandidate = (value: unknown) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (trimmed) candidates.add(trimmed)
  }

  pushCandidate(raw)
  if (meta) {
    pushCandidate(meta.castUrl)
    pushCandidate(meta.castIdentifier)
    pushCandidate(meta.identifier)
    pushCandidate(meta.castHash)
  }
  if (preview) {
    pushCandidate(preview.identifier)
    pushCandidate(preview.url)
    pushCandidate(preview.permalink)
    pushCandidate(preview.permanent_url)
    pushCandidate(preview.hash)
    pushCandidate(preview.hash_v1)
    pushCandidate(preview.cast_url)
  }

  let url = ''
  let hash = ''

  for (const cand of candidates) {
    if (!url && cand.startsWith('http')) {
      url = cand
      const match = cand.match(/0x[a-fA-F0-9]{40,100}/)
      if (match && !hash) hash = match[0]
    }
    if (!hash && /^0x[a-fA-F0-9]{40,100}$/.test(cand)) {
      hash = cand
    }
    if (url && hash) break
  }

  if (!hash) {
    for (const cand of candidates) {
      const match = cand.match(/0x[a-fA-F0-9]{40,100}/)
      if (match) { hash = match[0]; break }
    }
  }

  const previewUsername = typeof preview?.author?.username === 'string'
    ? preview.author.username.replace(/^@/, '')
    : ''
  const metaUsername = typeof meta?.targetUsername === 'string'
    ? meta.targetUsername.replace(/^@/, '')
    : typeof meta?.username === 'string'
      ? meta.username.replace(/^@/, '')
      : ''
  const username = previewUsername || metaUsername

  if (!url && hash && username) {
    url = `https://farcaster.xyz/${username}/${hash}`
  }
  if (!url && previewUsername && hash) {
    url = `https://warpcast.com/${previewUsername}/${hash}`
  }
  if (!url) {
    const fallbackUrl = Array.from(candidates).find((cand) => cand.startsWith('http'))
    if (fallbackUrl) url = fallbackUrl
  }

  if (!hash && typeof preview?.hash === 'string' && preview.hash.startsWith('0x')) {
    hash = preview.hash
  }
  if (!hash && typeof preview?.hash_v1 === 'string' && preview.hash_v1.startsWith('0x')) {
    hash = preview.hash_v1
  }

  const firstCandidate = candidates.values().next()
  const identifier = hash || url || (typeof firstCandidate.value === 'string' ? firstCandidate.value : '')

  return { url, hash, identifier }
}

// Neynar cast card using styles.css classes
function NeynarCastCard({ cast }: { cast: any | null }) {
  if (!cast) {
    return (
      <div className="pixel-card">
        <div className="pixel-section-title">Neynar cast preview</div>
        <div className="text-xs text-slate-300 mt-2">
          No cast preview available — provide a castUrl in quest metadata or click “Preview Cast”.
        </div>
      </div>
    )
  }
  const author = cast.author || cast?.author
  const app = cast.app || cast?.app
  return (
    <div className="pixel-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-emerald-300 text-sm">{author?.display_name || author?.username || 'Unknown'}</div>
          <div className="text-xs text-slate-300">{author?.username ? `@${author.username}` : ''} • fid {author?.fid ?? '-'}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-sky-200">{format(new Date(cast.timestamp || Date.now()), 'PP p')}</div>
          <div className="text-xs text-indigo-300">{app?.username ? `${app.username}` : ''}</div>
        </div>
      </div>
      <hr className="border border-dashed border-slate-700 my-2" />
      <div className="whitespace-pre-wrap leading-tight text-sm">{cast.text || cast?.body || cast?.content || '—'}</div>
      <div className="mt-2 flex gap-3 items-center text-xs text-sky-200">
        <div>♥ {cast.reactions?.likes_count ?? 0}</div>
        <div>🔁 {cast.reactions?.recasts_count ?? 0}</div>
        <div>💬 {cast.replies?.count ?? 0}</div>
      </div>
    </div>
  )
}

type RankSnapshot = {
  totalPoints: number
  availablePoints: number
  lockedPoints: number
  progress: ReturnType<typeof calculateRankProgress>
  delta: number
}

export default function VerifyQuestPage() {
  const router = useRouter()
  const routeParams = useParams<{ chain?: string | string[]; id?: string | string[] }>()
  const pushNotification = useLegacyNotificationAdapter()
  const chainParamRaw = Array.isArray(routeParams?.chain) ? routeParams?.chain[0] : routeParams?.chain
  const questIdParamRaw = Array.isArray(routeParams?.id) ? routeParams?.id[0] : routeParams?.id
  const chainParam = chainParamRaw || 'base'
  const questIdParam = questIdParamRaw || '0'

  const questIdNumeric = useMemo(() => {
    const parsed = Number(questIdParam || 0)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }, [questIdParam])

  const questIdBigInt = useMemo(() => {
    try {
      return questIdNumeric > 0 ? BigInt(questIdNumeric) : 0n
    } catch {
      return 0n
    }
  }, [questIdNumeric])

  const chainKey: ChainKey = (CHAIN_KEYS as readonly string[]).includes(chainParam as string)
    ? (chainParam as ChainKey)
    : 'base'

  const questCacheKey = useMemo(() => `${QUEST_DETAIL_CACHE_PREFIX}${chainKey}:${questIdParam}`, [chainKey, questIdParam])

  const { address: connectedAddress, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const currentChainId = useChainId()
  const targetChainId = CHAIN_IDS[chainKey] ?? CHAIN_IDS.base
  const walletOnTargetChain = Boolean(isConnected && currentChainId && Number(currentChainId) === Number(targetChainId))

  const [loadingQuest, setLoadingQuest] = useState(false)
  const [questLoadError, setQuestLoadError] = useState<string | null>(null)
  const [cacheHydrated, setCacheHydrated] = useState(false)
  const [quest, setQuest] = useState<NormalizedQuest | null>(null)
  const [metaPreview, setMetaPreview] = useState<any | null>(null)
  const [castPreview, setCastPreview] = useState<any | null>(null)
  const [castInput, setCastInput] = useState('')
  const [, setCastDebugTraces] = useState<any[]>([])
  const [viewerFid, setViewerFid] = useState<number | undefined>(undefined)
  const [inputFid, setInputFid] = useState<string>('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<any | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [debugJson, setDebugJson] = useState<string>('')
  const [signPayload, setSignPayload] = useState<any | null>(null)
  const [autoClaiming, setAutoClaiming] = useState(false)
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null)
  const [closingQuest, setClosingQuest] = useState(false)
  const [autoCloseLogs, setAutoCloseLogs] = useState<Array<{ ts: number; message: string }>>([])
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [linkingFid, setLinkingFid] = useState(false)
  const [fidLookupPending, setFidLookupPending] = useState(false)
  const [addressLinkedFid, setAddressLinkedFid] = useState<number | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const mountedRef = useRef(false)
  const cacheHitRef = useRef(false)
  const autoCloseAttemptRef = useRef<string | null>(null)
  const [rankSnapshot, setRankSnapshot] = useState<RankSnapshot | null>(null)
  const [rankLoading, setRankLoading] = useState(false)
  const [rankError, setRankError] = useState<string | null>(null)
  const previousRankTotalRef = useRef<number | null>(null)
  const [xpCelebration, setXpCelebration] = useState<XpEventPayload | null>(null)

  const questDetailUrl = useMemo(() => `/Quest/${chainKey}/${questIdParam}`, [chainKey, questIdParam])

  useEffect(() => {
    setCacheHydrated(false)
    cacheHitRef.current = false
  }, [questCacheKey])

  useEffect(() => {
    if (cacheHydrated) return
    const snapshot = readStorageCache<QuestDetailCachePayload>(questCacheKey, QUEST_DETAIL_CACHE_TTL_MS)
    if (snapshot?.quest) {
      setQuest(snapshot.quest)
      const parsedMeta = snapshot.meta ?? tryParseMeta(snapshot.quest.meta)
      setMetaPreview(parsedMeta)
      cacheHitRef.current = true
      setLoadingQuest(false)
      setQuestLoadError(null)
    }
    setCacheHydrated(true)
  }, [cacheHydrated, questCacheKey])

  useEffect(() => {
    if (!quest) return
    const parsedMeta = tryParseMeta(quest.meta)
    writeStorageCache<QuestDetailCachePayload>(questCacheKey, { quest, meta: parsedMeta })
  }, [quest, questCacheKey])

  const shareFrameUrl = useMemo(() => {
    if (rankSnapshot && connectedAddress && isAddress(connectedAddress)) {
      return buildFrameShareUrl({
        type: 'points',
        chain: chainKey,
        user: connectedAddress,
        extra: {
          level: rankSnapshot.progress.level,
          xpCurrent: Math.round(rankSnapshot.progress.xpIntoLevel),
          xpMax: Math.round(rankSnapshot.progress.xpForLevel),
          xpToNext: Math.round(rankSnapshot.progress.xpToNextLevel),
          tier: rankSnapshot.progress.currentTier.name,
          tierPercent: Math.round(rankSnapshot.progress.percent * 100),
          tierTagline: rankSnapshot.progress.currentTier.tagline,
        },
      })
    }
    return buildFrameShareUrl({ type: 'quest', chain: chainKey, questId: questIdParam })
  }, [rankSnapshot, connectedAddress, chainKey, questIdParam])

  const shareCastText = useMemo(() => {
    if (rankSnapshot) {
      const tier = rankSnapshot.progress.currentTier.name
      const level = rankSnapshot.progress.level
      const delta = rankSnapshot.delta
      const changeText = delta > 0 ? `+${delta.toLocaleString()} pts` : `${rankSnapshot.totalPoints.toLocaleString()} pts`
      return `Just advanced on ${CHAIN_LABEL[chainKey]} — ${tier} • Level ${level} (${changeText}).`
    }
    return `Flexing quest ${questIdParam} on GMEOW. Join and claim the reward.`
  }, [rankSnapshot, chainKey, questIdParam])

  const shareButtonLabel = rankSnapshot ? 'Share XP Progress' : 'Share Quest Frame'

  const latestAutoCloseMessage = useMemo(() => (autoCloseLogs.length ? autoCloseLogs[autoCloseLogs.length - 1] : null), [autoCloseLogs])
  const autoCloseToneClass = closingQuest
    ? 'text-sky-300'
    : latestAutoCloseMessage && latestAutoCloseMessage.message.toLowerCase().includes('failed')
      ? 'text-rose-300'
      : 'text-amber-300'

  const handleShareFrame = useCallback(() => {
    if (!shareFrameUrl) return
    void openWarpcastComposer(shareCastText, shareFrameUrl)
  }, [shareFrameUrl, shareCastText])

  const refreshRankProgress = useCallback(async () => {
    if (!isHydrated || !connectedAddress || !isAddress(connectedAddress)) {
      setRankSnapshot(null)
      setRankError(null)
      previousRankTotalRef.current = null
      return null
    }
    const rpcUrl = getRpcUrlFor(chainKey)
    if (!rpcUrl) {
      setRankError(`Missing RPC URL for ${CHAIN_LABEL[chainKey]}.`)
      return null
    }
    try {
      setRankLoading(true)
      const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
        ])

      const client = createPublicClient({ transport: http(rpcUrl) })
      const stats = await rpcTimeout(
        client.readContract({
          address: CONTRACT_ADDRESSES[chainKey],
          abi: GM_CONTRACT_ABI as Abi,
          functionName: 'getUserStats',
          args: [connectedAddress as `0x${string}`],
        }),
        null
      )
      if (!stats) {
        setRankError('Could not fetch rank data (timeout)')
        return null
      }
      const available = Number((stats as any)?.[0] ?? 0n)
      const locked = Number((stats as any)?.[1] ?? 0n)
      const totalPoints = available + locked
      const progress = calculateRankProgress(totalPoints)
      const previousTotal = previousRankTotalRef.current
      previousRankTotalRef.current = totalPoints
      const delta = previousTotal != null ? totalPoints - previousTotal : 0
      const snapshot: RankSnapshot = { totalPoints, availablePoints: available, lockedPoints: locked, progress, delta }
      setRankSnapshot(snapshot)
      if (delta > 0) {
        let shareUrl: string | undefined
        let shareCastTextForSnapshot: string | undefined
        if (connectedAddress && isAddress(connectedAddress)) {
          shareUrl = buildFrameShareUrl({
            type: 'points',
            chain: chainKey,
            user: connectedAddress as `0x${string}`,
            extra: {
              level: progress.level,
              xpCurrent: Math.round(progress.xpIntoLevel),
              xpMax: Math.round(progress.xpForLevel),
              xpToNext: Math.round(progress.xpToNextLevel),
              tier: progress.currentTier.name,
              tierPercent: Math.round(progress.percent * 100),
              tierTagline: progress.currentTier.tagline,
            },
          })
          const changeText = delta > 0 ? `+${delta.toLocaleString()} pts` : `${totalPoints.toLocaleString()} pts`
          shareCastTextForSnapshot = `Just advanced on ${CHAIN_LABEL[chainKey]} — ${progress.currentTier.name} • Level ${progress.level} (${changeText}).`
        }

        setXpCelebration({
          event: 'quest-verify',
          chainKey,
          xpEarned: delta,
          totalPoints,
          progress,
          shareUrl,
          onShare: shareUrl
            ? () => openWarpcastComposer(shareCastTextForSnapshot ?? '', shareUrl as string)
            : undefined,
          shareLabel: 'Share XP milestone',
          visitUrl: questDetailUrl,
          visitLabel: 'Open quest',
          headline: 'Quest complete',
        })

        // @edit-start 2025-11-11 — Emit quest verification rank telemetry
        if (connectedAddress && isAddress(connectedAddress)) {
          const inputFidNum = Number(inputFid || 0)
          const resolvedFidCandidate = [addressLinkedFid, viewerFid, inputFidNum].find(
            (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
          )
          const metadata: Record<string, unknown> = {
            source: 'quest-verify',
            questName: quest?.name,
            questType: quest?.questType,
            rewardPoints: quest?.rewardPoints,
          }
          if (questDetailUrl) metadata.questDetailUrl = questDetailUrl
          for (const key of Object.keys(metadata)) {
            const value = metadata[key]
            if (value === undefined || value === null || value === '') {
              delete metadata[key]
            }
          }
          void emitRankTelemetryEvent({
            event: 'quest-verify',
            chain: chainKey,
            walletAddress: connectedAddress,
            fid: typeof resolvedFidCandidate === 'number' ? Math.trunc(resolvedFidCandidate) : null,
            questId: questIdNumeric > 0 ? questIdNumeric : null,
            delta,
            totalPoints,
            previousTotal: previousTotal != null ? previousTotal : null,
            level: progress.level,
            tierName: progress.currentTier.name,
            tierPercent: progress.percent * 100,
            metadata: Object.keys(metadata).length ? metadata : null,
          })
        }
        // @edit-end
      }
      setRankError(null)
      return { totalPoints, available, locked, progress }
    } catch (err: any) {
      const message = String(err?.message || err)
      setRankError(message)
      return null
    } finally {
      setRankLoading(false)
    }
  // @edit-start 2025-11-11 — Include telemetry dependencies
  }, [
    chainKey,
    connectedAddress,
    isHydrated,
    questDetailUrl,
    addressLinkedFid,
    viewerFid,
    inputFid,
    questIdNumeric,
    quest,
  ])
  // @edit-end

  const pushAutoCloseLog = useCallback((message: string) => {
    setAutoCloseLogs((prev) => {
      const last = prev.length ? prev[prev.length - 1] : null
      if (last && last.message === message) return prev
      const next = [...prev.slice(-4), { ts: Date.now(), message }]
      return next
    })
  }, [])

  const loadQuest = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    setQuestLoadError(null)
    if (!silent) {
      setLoadingQuest(true)
      if (!cacheHitRef.current) setQuest(null)
    }
    try {
      const rpcUrl = getRpcUrlFor(chainKey)
      if (!rpcUrl) throw new Error(`Missing RPC URL for ${chainKey}. Set NEXT_PUBLIC_RPC_* env.`)
      if (!questIdBigInt || questIdBigInt <= 0n) throw new Error('Invalid quest id')
      const client = createPublicClient({ transport: http(rpcUrl) })
      const address = CONTRACT_ADDRESSES[chainKey]
      const abiForQuest = (Array.isArray(GM_CONTRACT_ABI) && (GM_CONTRACT_ABI as any).length > 0
        ? (GM_CONTRACT_ABI as unknown as Abi)
        : MIN_GM_ABI)

      const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
        ])

      let mappingNormalized: ReturnType<typeof normalizeQuestStruct> | null = null
      let tupleNormalized: ReturnType<typeof normalizeQuestStruct> | null = null

      try {
        const mappingResult = await rpcTimeout(
          client.readContract({
            address,
            abi: abiForQuest,
            functionName: 'quests',
            args: [questIdBigInt],
          }),
          null
        )
        if (mappingResult) {
          mappingNormalized = normalizeQuestStruct(mappingResult)
        }
      } catch (err) {
        console.warn('quests() view failed; falling back to getQuest()', err)
      }

      try {
        const tupleResult = await rpcTimeout(
          client.readContract({
            address,
            abi: abiForQuest,
            functionName: 'getQuest',
            args: [questIdBigInt],
          }),
          null
        )
        if (tupleResult) {
          tupleNormalized = normalizeQuestStruct(tupleResult)
        }
      } catch (err) {
        if (!mappingNormalized) console.warn('getQuest() view failed', err)
      }

      const normalized: NormalizedQuest = {
        ...(tupleNormalized ?? {}),
        ...(mappingNormalized ?? {}),
      }

      if (!Object.keys(normalized).length) {
        throw new Error('Quest not available on-chain.')
      }

      const parsedMeta = tryParseMeta(normalized.meta)
      setQuest(normalized)
      setMetaPreview(parsedMeta)
      writeStorageCache<QuestDetailCachePayload>(questCacheKey, { quest: normalized, meta: parsedMeta })
      cacheHitRef.current = true
    } catch (e: any) {
      const message = String(e?.message || e || 'unknown error')
      setQuestLoadError(message)
      pushNotification({ type: 'error', title: 'Quest load failed', message })
    } finally {
      if (mountedRef.current) setLoadingQuest(false)
    }
  }, [chainKey, questIdBigInt, pushNotification, questCacheKey])

  const waitForReceiptAndRefresh = useCallback(async (hash: string) => {
    if (!hash) return
    const rpcUrl = getRpcUrlFor(chainKey)
    if (!rpcUrl) {
      await refreshRankProgress()
      await loadQuest({ silent: true })
      return
    }
    try {
      const client = createPublicClient({ transport: http(rpcUrl) })
      await client.waitForTransactionReceipt({ hash: hash as `0x${string}` })
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 6000))
    }
    await refreshRankProgress()
    await loadQuest({ silent: true })
  }, [chainKey, loadQuest, refreshRankProgress])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!cacheHydrated) return
    void loadQuest({ silent: cacheHitRef.current })
  }, [cacheHydrated, loadQuest])

  const ensureWalletOnChain = useCallback(async (key: ChainKey) => {
    const targetChainId = CHAIN_IDS[key] ?? CHAIN_IDS.base
    if (switchChainAsync) {
      try {
        await switchChainAsync({ chainId: targetChainId })
        return
      } catch (err: any) {
        if (err?.code === 4001) throw new Error(`Switch your wallet to ${CHAIN_LABEL[key]} and retry.`)
        // fall through to window.ethereum path if available
      }
    }
    if (!window.ethereum) throw new Error('No wallet detected (window.ethereum)')
    const targetChainHex = `0x${targetChainId.toString(16)}`
    const providerChainId = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null)
    if (String(providerChainId) !== String(targetChainHex)) {
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChainHex }] })
      } catch (err: any) {
        if (err?.code === 4902) {
          throw new Error(`Add ${CHAIN_LABEL[key]} network to your wallet and retry.`)
        }
        if (err?.code === 4001) {
          throw new Error(`Switch your wallet to ${CHAIN_LABEL[key]} and retry.`)
        }
        throw new Error(`Unable to switch wallet network: ${String(err?.message || err)}`)
      }
    }
  }, [switchChainAsync])

  const autoCloseIfComplete = useCallback(async () => {
    if (!quest) return
    if (quest.isActive === false) return

    const maxCompletionsRaw = Number(quest.maxCompletions ?? 0)
    const claimedRaw = typeof quest.claimedCount === 'number' ? quest.claimedCount : Number(quest.claimedCount ?? 0)
    const expiresAtRaw = Number(quest.expiresAt ?? 0)
    const hasCap = Number.isFinite(maxCompletionsRaw) && maxCompletionsRaw > 0
    const claimedValid = Number.isFinite(claimedRaw)
    const reachedCap = hasCap && claimedValid && claimedRaw >= maxCompletionsRaw
    const nowTs = Math.floor(Date.now() / 1000)
    const expired = expiresAtRaw > 0 && nowTs >= expiresAtRaw

    if (hasCap && !claimedValid) {
      pushAutoCloseLog('Quest auto-close skipped: claimedCount missing from contract response.')
      return
    }

    if (!reachedCap && !expired) return

    if (!questIdBigInt || questIdBigInt <= 0n) {
      pushAutoCloseLog('Quest auto-close skipped: invalid quest id.')
      return
    }

    const reasonSegments: string[] = []
    if (reachedCap) reasonSegments.push(`max completions ${claimedRaw}/${maxCompletionsRaw}`)
    if (expired) reasonSegments.push(`expired ${formatUnix(expiresAtRaw)}`)
    const reasonText = reasonSegments.join(' • ')
    const attemptKey = `${questIdParam}:${claimedValid ? claimedRaw : 'NA'}:${hasCap ? maxCompletionsRaw : 'NO_CAP'}:${expired ? 'expired' : 'cap'}`
    if (autoCloseAttemptRef.current === attemptKey) return

    if (!isConnected || !connectedAddress) {
      pushAutoCloseLog(`Quest ${reasonText}. Connect the creator wallet to auto-close automatically.`)
      return
    }

    const questCreator = typeof quest.creator === 'string' ? quest.creator : ''
    const isCreator = questCreator && connectedAddress && questCreator.toLowerCase() === connectedAddress.toLowerCase()
    if (!isCreator) {
      pushAutoCloseLog(`Quest ${reasonText}. Only creator ${short(questCreator || '0x0', 16)} can close; switch wallets to proceed.`)
      return
    }

    if (!walletClient && !window.ethereum) {
      pushAutoCloseLog(`Quest ${reasonText}. No signer available to broadcast closeQuest.`)
      return
    }

    autoCloseAttemptRef.current = attemptKey
    setClosingQuest(true)
    pushAutoCloseLog(`Quest ${reasonText}. Broadcasting closeQuest…`)

    try {
      await ensureWalletOnChain(chainKey)

      const closeCall = createCloseQuestTx(questIdBigInt, chainKey as any)
      const address = ((closeCall as any).address || CONTRACT_ADDRESSES[chainKey]) as `0x${string}`
      const abi = ((closeCall as any).abi || GM_CONTRACT_ABI) as Abi
      const functionName = (closeCall as any).functionName as string
      const args = ((closeCall as any).args || [questIdBigInt]) as readonly unknown[]
      const dataHex = encodeFunctionData({ abi, functionName, args })

      let txHash: string | null = null

      if (walletClient) {
        try {
          const hash = await walletClient.writeContract({
            address,
            abi,
            functionName: functionName as never,
            args: args as any,
            account: connectedAddress as `0x${string}`,
          })
          txHash = String(hash)
        } catch (err: any) {
          pushAutoCloseLog(`closeQuest via walletClient failed: ${String(err?.message || err)}`)
        }
      }

      if (!txHash) {
        if (!window.ethereum) throw new Error('No wallet provider available for closeQuest.')
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        const from = accounts?.[0]
        if (!from) throw new Error('No wallet account returned for closeQuest.')
        txHash = String(
          await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{ from, to: address, data: dataHex, value: '0x0' }],
          }),
        )
      }

      pushAutoCloseLog(`closeQuest broadcasted. Tx: ${txHash}`)
      await waitForReceiptAndRefresh(txHash)
    } catch (err: any) {
      pushAutoCloseLog(`Auto-close failed: ${String(err?.message || err)}`)
      autoCloseAttemptRef.current = null
    } finally {
      setClosingQuest(false)
    }
  }, [chainKey, connectedAddress, ensureWalletOnChain, isConnected, pushAutoCloseLog, quest, questIdBigInt, questIdParam, waitForReceiptAndRefresh, walletClient])

  useEffect(() => {
    if (!quest) return
    void autoCloseIfComplete()
  }, [autoCloseIfComplete, quest])

  useEffect(() => {
    const candidates = [
      metaPreview?.castUrl,
      metaPreview?.identifier,
      metaPreview?.castIdentifier,
      metaPreview?.castHash,
    ]
    const first = candidates.find((value) => typeof value === 'string' && value.trim())
    setCastInput(first ? first.trim() : '')
  }, [
    metaPreview?.castUrl,
    metaPreview?.identifier,
    metaPreview?.castIdentifier,
    metaPreview?.castHash,
  ])

  useEffect(() => {
    setIsHydrated(true)
    setNowSec(Math.floor(Date.now() / 1000))
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000))
    }, 1000 * 30)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function detectFidForAddress() {
      if (!isHydrated || !isConnected || !connectedAddress) {
        if (!cancelled) {
          setAddressLinkedFid(null)
          setViewerFid(undefined)
        }
        return
      }
      setFidLookupPending(true)
      try {
        const detected = await fetchFidByAddress(connectedAddress)
        if (cancelled) return
        if (typeof detected === 'number' && detected > 0) {
          setAddressLinkedFid(detected)
          setViewerFid(detected)
          setInputFid((prev) => (prev ? prev : String(detected)))
        } else {
          setAddressLinkedFid(null)
        }
      } catch {
        if (!cancelled) setAddressLinkedFid(null)
      } finally {
        if (!cancelled) setFidLookupPending(false)
      }
    }
    detectFidForAddress()
    return () => {
      cancelled = true
    }
  }, [connectedAddress, isConnected, isHydrated])

  useEffect(() => {
    if (!isHydrated || !connectedAddress || !isAddress(connectedAddress)) {
      setRankSnapshot(null)
      setRankError(null)
      previousRankTotalRef.current = null
      return
    }
    void refreshRankProgress()
  }, [isHydrated, connectedAddress, chainKey, refreshRankProgress])

  function tryParseMeta(raw: any) {
    if (!raw) return null
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) } catch { return { raw } }
    }
    return raw
  }

  const fidNum = Number(inputFid || 0)
  const hasDetectedFid = typeof addressLinkedFid === 'number' && addressLinkedFid > 0
  const fidMismatch = hasDetectedFid && fidNum > 0 && addressLinkedFid !== fidNum
  const missingFid = !hasDetectedFid
  const fidStatusMessage = !isConnected
    ? 'Connect your wallet to auto-detect your Farcaster FID.'
    : fidLookupPending
      ? 'Checking linked Farcaster FID...'
      : fidMismatch
        ? `Input FID ${fidNum} does not match wallet-linked FID ${addressLinkedFid}.`
        : hasDetectedFid
          ? `Detected Farcaster FID ${addressLinkedFid} for ${short(connectedAddress || '', 16)}.`
          : 'No Farcaster FID linked to this wallet yet. Use “Link FID” to attach one.'
  const fidStatusClass = fidMismatch ? 'text-rose-300' : hasDetectedFid ? 'text-emerald-300' : 'text-slate-300'
  const displayFidStatusMessage = isHydrated ? fidStatusMessage : 'Connect your wallet to auto-detect your Farcaster FID.'
  const displayFidStatusClass = isHydrated ? fidStatusClass : 'text-slate-300'
  const verifyDisabled = verifying || fidLookupPending || fidMismatch || !isConnected || missingFid
  const verifyButtonDisabled = !isHydrated || verifyDisabled
  const linkFidDisabled = !isHydrated || linkingFid || !isConnected

  const previewCast = useCallback(
    async (raw?: string) => {
      const castUrl = (raw ?? '').trim()
      if (!castUrl) return
      setCastInput((prev) => (prev === castUrl ? prev : castUrl))
      setCastPreview(null)
      setCastDebugTraces([])
      try {
        const q = `/api/quests/verify?debug=true&cast=${encodeURIComponent(castUrl)}&fid=${encodeURIComponent(Number(inputFid) || 0)}`
        const res = await fetch(q)
        const j = await res.json().catch(() => null)
        if (j?.ok && j?.castProbe?.parsed?.cast) {
          setCastPreview(j.castProbe.parsed.cast)
          if (j.castProbe?.trace) setCastDebugTraces([j.castProbe.trace])
          else if (j.traces) setCastDebugTraces(j.traces)
        } else if (j?.ok && j?.castProbe) {
          setCastPreview(j.castProbe?.parsed?.cast || j.castProbe?.cast || null)
          setCastDebugTraces(j.castProbe?.traces || j.traces || [])
        } else {
          setCastDebugTraces([j || { note: 'no-parse' }])
        }
      } catch (e: any) {
        setCastDebugTraces([{ error: String(e?.message || e) }])
      }
    },
    [inputFid],
  )

  async function callVerifyAPI(payload: any) {
    setVerifying(true)
    setVerifyError(null)
    setVerifyResult(null)
    setDebugJson('')
    try {
      const res = await fetch('/api/quests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify(payload),
      })
      const rawText = await res.text()
      let json: any = null
      try { json = rawText ? JSON.parse(rawText) : null } catch { throw new Error(`Invalid JSON from verify route: ${rawText.slice(0, 2000)}`) }
      try { setDebugJson(safeStringify(json, 2)) } catch { setDebugJson(String(json)) }
      if (!res.ok || !json?.ok) {
        const reason = json?.reason ? String(json.reason) : `Verification failed (${res.status})`
        setVerifyError(reason)
        console.warn('verify failed debug:', json)
        throw new Error(reason)
      }
      setVerifyResult(json)
      setSignPayload({ sig: json.sig, fid: json.fid, nonce: json.nonce, deadline: json.deadline, actionCode: json.actionCode })
      return json
    } catch (e: any) {
      const message = String(e?.message || e)
      setVerifyError(message)
      pushNotification({ type: 'error', title: 'Verification failed', message })
      throw e
    } finally {
      setVerifying(false)
    }
  }

  async function handleVerifyClick() {
    if (!quest && !metaPreview) { setVerifyError('Quest meta not loaded'); return }
    const meta = metaPreview || tryParseMeta(quest?.meta)
    if (!isConnected || !connectedAddress) { setVerifyError('Connect your wallet before verifying.'); return }
    if (!isAddress(connectedAddress)) { setVerifyError('Connected wallet address is invalid.'); return }
    if (fidLookupPending) { setVerifyError('Please wait for the Farcaster FID lookup to finish.'); return }
    if (!addressLinkedFid) {
      setVerifyError('No Farcaster FID linked to this wallet. Link your FID and try again.')
      return
    }
    const inputFidNum = Number(inputFid || 0)
    const effectiveFid = inputFidNum || viewerFid || addressLinkedFid || 0
    if (addressLinkedFid && effectiveFid !== addressLinkedFid) {
      setVerifyError(`Farcaster FID ${effectiveFid} does not match the one linked to ${short(connectedAddress, 16)}.`)
      return
    }
    if (!effectiveFid) {
      setVerifyError('Unable to resolve a Farcaster FID for this wallet. Link your FID and try again.')
      return
    }
    const questTypeNum = Number(quest?.questType ?? toQuestTypeCode(meta?.questTypeKey ?? meta?.type ?? 'GENERIC'))
    const normalizedMeta: Record<string, any> = meta && typeof meta === 'object' ? { ...meta } : {}
    const castDetails = normalizeCastInput(castInput, normalizedMeta, castPreview)

    if (castDetails.identifier) {
      normalizedMeta.castIdentifier = castDetails.identifier
      if (!normalizedMeta.identifier) normalizedMeta.identifier = castDetails.identifier
    }
    if (castDetails.url) {
      normalizedMeta.castUrl = castDetails.url
      if (!normalizedMeta.castIdType) normalizedMeta.castIdType = 'url'
    }
    if (castDetails.hash) {
      normalizedMeta.castHash = castDetails.hash
      normalizedMeta.castIdType = 'hash'
    }
    if (castPreview?.author?.fid && !normalizedMeta.castAuthorFid) {
      normalizedMeta.castAuthorFid = Number(castPreview.author.fid)
    }
    if (castPreview?.author?.fid && !normalizedMeta.targetFid) {
      normalizedMeta.targetFid = Number(castPreview.author.fid)
    }
    if (castPreview?.author?.username) {
      const cleanUsername = String(castPreview.author.username).replace(/^@/, '')
      if (cleanUsername) {
        if (!normalizedMeta.targetUsername) normalizedMeta.targetUsername = cleanUsername
        if (!normalizedMeta.castAuthorUsername) normalizedMeta.castAuthorUsername = cleanUsername
      }
    }

    const payload: any = {
      debug: true,
      chain: chainKey,
      questId: Number(questIdParam),
      user: connectedAddress,
      fid: effectiveFid,
      actionCode: questTypeNum,
      meta: normalizedMeta,
      mode: 'social',
      sign: true,
      cast: castDetails.identifier,
      castUrl: castDetails.url,
      castIdentifier: castDetails.hash || castDetails.identifier,
    }
    try {
      const result = await callVerifyAPI(payload)
      pushNotification({
        type: 'success',
        title: 'Signature ready',
        message: `Quest ${questIdParam} verified. Claim before ${formatUnix(result?.deadline) || 'expiry'}.`,
      })
      setViewerFid(effectiveFid)
      setTimeout(() => { document.getElementById('verify-result')?.scrollIntoView({ behavior: 'smooth' }) }, 80)
    } catch {}
  }

  async function attemptAutoClaim() {
    if (!isHydrated) { setVerifyError('Wallet not ready yet.'); return }
    if (!signPayload || !quest) { setVerifyError('Missing signature payload or quest.'); return }
    if (!isConnected || !connectedAddress) { setVerifyError('Connect your wallet before claiming.'); return }
    if (!isAddress(connectedAddress)) { setVerifyError('Connected wallet address is invalid.'); return }
    if (!addressLinkedFid) { setVerifyError('No Farcaster FID linked to this wallet. Link it and verify again.'); return }
    if (addressLinkedFid && Number(signPayload.fid || 0) !== addressLinkedFid) {
      setVerifyError('Signature FID does not match the wallet-linked FID. Re-run verification.')
      return
    }
    if (!walletClient && !window.ethereum) {
      setVerifyError('No wallet provider available. Connect a wallet that supports on-chain calls.')
      return
    }
    setAutoClaiming(true)
    setClaimTxHash(null)
    try {
      await ensureWalletOnChain(chainKey)

      const callObj = createCompleteQuestWithSigTx(
        questIdParam,
        connectedAddress as any,
        signPayload.fid,
        signPayload.actionCode,
        signPayload.deadline,
        signPayload.nonce,
        signPayload.sig,
        chainKey as any
      )
      const address = ((callObj as any).address || (CONTRACT_ADDRESSES as any)[chainKey]) as `0x${string}`
      const abi = ((callObj as any).abi || GM_CONTRACT_ABI) as Abi
      const functionName = (callObj as any).functionName as string
      const args = ((callObj as any).args || []) as readonly unknown[]
      if (!abi || !functionName) {
        throw new Error('Missing contract call metadata. Please refresh and verify again.')
      }
      const dataHex = encodeFunctionData({ abi, functionName, args })

      if (walletClient) {
        try {
          const hash = await walletClient.writeContract({
            address,
            abi,
            functionName: functionName as never,
            args: args as any,
            account: connectedAddress as `0x${string}`,
          })
          const hashString = String(hash)
          setClaimTxHash(hashString)
          setCopyMessage('Claim transaction sent. Tracking XP update...')
          setTimeout(() => setCopyMessage(null), 4000)
          pushNotification({ type: 'info', title: 'Claim submitted', message: `Tracking ${short(hashString, 10)} on-chain.` })
          void waitForReceiptAndRefresh(hashString)
            .then(() => {
              pushNotification({ type: 'success', title: 'Claim confirmed', message: 'Rewards applied on-chain.' })
            })
            .catch((receiptErr) => {
              console.warn('claim receipt wait failed', receiptErr)
              pushNotification({ type: 'warn', title: 'Claim pending', message: 'Still waiting for on-chain confirmation.' })
            })
          return
        } catch (err) {
          console.warn('walletClient.writeContract failed, falling back to window.ethereum', err)
        }
      }

      if (!window.ethereum) {
        const fallbackPayload = { to: address, value: '0x0', data: dataHex, functionName, args }
        setCopyMessage('Unable to auto-send; claim payload prepared below.')
        setDebugJson((prev) => {
          try {
            const base = prev ? JSON.parse(prev) : {}
            return safeStringify({ ...base, fallbackPayload }, 2)
          } catch {
            return safeStringify({ fallbackPayload }, 2)
          }
        })
        pushNotification({ type: 'warn', title: 'Manual claim required', message: 'Wallet provider missing. Use the payload below to broadcast manually.' })
        return
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        const from = accounts?.[0]
        if (!from) throw new Error('No wallet account returned. Please re-connect your wallet.')
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from, to: address, data: dataHex, value: '0x0' }],
        })
        const hashString = String(txHash)
        setClaimTxHash(hashString)
        setCopyMessage('Claim transaction sent. Tracking XP update...')
        setTimeout(() => setCopyMessage(null), 4000)
        pushNotification({ type: 'info', title: 'Claim submitted', message: `Tracking ${short(hashString, 10)} on-chain.` })
        void waitForReceiptAndRefresh(hashString)
          .then(() => {
            pushNotification({ type: 'success', title: 'Claim confirmed', message: 'Rewards applied on-chain.' })
          })
          .catch((receiptErr) => {
            console.warn('claim receipt wait failed', receiptErr)
            pushNotification({ type: 'warn', title: 'Claim pending', message: 'Still waiting for on-chain confirmation.' })
          })
      } catch (err: any) {
        const fallbackPayload = { to: address, value: '0x0', data: dataHex, functionName, args }
        setCopyMessage('Unable to auto-send; claim payload prepared below.')
        setDebugJson((prev) => {
          try {
            const base = prev ? JSON.parse(prev) : {}
            return safeStringify({ ...base, fallbackPayload, autoClaimError: String(err?.message || err) }, 2)
          } catch {
            return safeStringify({ fallbackPayload, autoClaimError: String(err?.message || err) }, 2)
          }
        })
        pushNotification({ type: 'warn', title: 'Manual claim required', message: 'We prefilled the payload below so you can submit manually.' })
      }
    } catch (err: any) {
      const message = String(err?.message || err)
      setVerifyError(message)
      pushNotification({ type: 'error', title: 'Claim failed', message })
    } finally {
      setAutoClaiming(false)
    }
  }

  async function linkFidOnContract() {
    const fidNum = Number(inputFid || viewerFid || 0)
    if (!fidNum) { setVerifyError('Provide a Farcaster FID before linking.'); return }
    if (!isHydrated) { setVerifyError('Wallet not ready yet.'); return }
    if (!isConnected || !connectedAddress) { setVerifyError('Connect your wallet before linking a FID.'); return }
    if (!walletClient && !window.ethereum) { setVerifyError('No wallet provider available for linking.'); return }
    setLinkingFid(true)
    try {
      await ensureWalletOnChain(chainKey)

      const callObj = createSetFarcasterFidTx(fidNum, chainKey as any)
      const address = ((callObj as any).address || CONTRACT_ADDRESSES[chainKey]) as `0x${string}`
      const abi = ((callObj as any).abi || GM_CONTRACT_ABI) as Abi
      const functionName = (callObj as any).functionName as string
      const args = ((callObj as any).args ?? [BigInt(fidNum)]) as readonly unknown[]
      if (!abi || !functionName) {
        throw new Error('Missing contract call metadata for FID link.')
      }
      const dataHex = encodeFunctionData({ abi, functionName, args })

      if (walletClient) {
        try {
          const hash = await walletClient.writeContract({
            address,
            abi,
            functionName: functionName as never,
            args: args as any,
            account: connectedAddress as `0x${string}`,
          })
          setCopyMessage(`FID link tx: ${hash}`)
          setTimeout(() => setCopyMessage(null), 4000)
          pushNotification({ type: 'info', title: 'FID link submitted', message: `Tracking ${short(String(hash), 10)}.` })
        } catch (err) {
          console.warn('walletClient.writeContract failed, falling back to window.ethereum', err)
          if (!window.ethereum) throw err
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
          const from = accounts?.[0]
          if (!from) throw new Error('No wallet account returned. Re-connect your wallet.')
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{ from, to: address, data: dataHex, value: '0x0' }],
          })
          setCopyMessage(`FID link tx: ${txHash}`)
          setTimeout(() => setCopyMessage(null), 4000)
          pushNotification({ type: 'info', title: 'FID link submitted', message: `Tracking ${short(String(txHash), 10)}.` })
        }
      } else if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        const from = accounts?.[0]
        if (!from) throw new Error('No wallet account returned. Re-connect your wallet.')
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from, to: address, data: dataHex, value: '0x0' }],
        })
        setCopyMessage(`FID link tx: ${txHash}`)
        setTimeout(() => setCopyMessage(null), 4000)
        pushNotification({ type: 'info', title: 'FID link submitted', message: `Tracking ${short(String(txHash), 10)}.` })
      }

      setViewerFid(fidNum)
      setAddressLinkedFid(fidNum)
      setInputFid(String(fidNum))
      setVerifyError(null)
      pushNotification({ type: 'success', title: 'FID linked', message: `Wallet now linked to Farcaster FID ${fidNum}.` })
    } catch (err: any) {
      const message = String(err?.message || err)
      setVerifyError(message)
      pushNotification({ type: 'error', title: 'FID link failed', message })
    } finally {
      setLinkingFid(false)
    }
  }

  useEffect(() => {
    if (!isHydrated) return
    if (!questIdBigInt || questIdBigInt <= 0n) return
    const rpcUrl = getRpcUrlFor(chainKey)
    if (!rpcUrl) return

    let cancelled = false
    const disposers: Array<() => void> = []

    async function start() {
      try {
        const client = createPublicClient({ transport: http(rpcUrl) })
        const abiForEvents: Abi = (Array.isArray(GM_CONTRACT_ABI) && (GM_CONTRACT_ABI as any).length > 0
          ? (GM_CONTRACT_ABI as unknown as Abi)
          : MIN_GM_ABI)
        const baseConfig = {
          address: CONTRACT_ADDRESSES[chainKey],
          abi: abiForEvents,
          poll: true,
          pollingInterval: 6000,
        } as const

        const register = (stop?: () => void) => {
          if (stop) disposers.push(stop)
        }

        register(
          client.watchContractEvent({
            ...baseConfig,
            eventName: 'QuestClosed',
            args: { questId: questIdBigInt },
            onLogs: (logs) => {
              const typedLogs = logs as Array<{ args?: Record<string, unknown> }>
              if (cancelled || !typedLogs.length) return
              pushNotification({
                type: 'warn',
                title: 'Quest closed',
                message: `Quest ${questIdParam} was closed by the creator.`,
              })
              setQuest((prev) => (prev ? { ...prev, isActive: false } : prev))
            },
          }),
        )

        if (connectedAddress && isAddress(connectedAddress)) {
          const account = connectedAddress as `0x${string}`

          register(
            client.watchContractEvent({
              ...baseConfig,
              eventName: 'QuestCompleted',
              args: { questId: questIdBigInt, user: account },
              onLogs: (logs) => {
                const typedLogs = logs as Array<{ args?: Record<string, unknown> }>
                if (cancelled || !typedLogs.length) return
                const first = typedLogs[0]
                const pointsAwarded = first?.args?.pointsAwarded as unknown
                let points = 0
                if (typeof pointsAwarded === 'bigint') {
                  points = Number(pointsAwarded)
                } else if (typeof pointsAwarded === 'number') {
                  points = pointsAwarded
                } else if (typeof pointsAwarded === 'string') {
                  const parsed = Number(pointsAwarded)
                  if (Number.isFinite(parsed)) points = parsed
                }
                pushNotification({
                  type: 'success',
                  title: 'Quest completion recorded',
                  message: points > 0
                    ? `You earned ${points.toLocaleString()} points.`
                    : 'Completion recorded. Claim your reward on-chain.',
                })
                void refreshRankProgress()
              },
            }),
          )

          register(
            client.watchContractEvent({
              ...baseConfig,
              eventName: 'PointsTipped',
              args: { to: account },
              onLogs: (logs) => {
                if (cancelled || !logs.length) return
                const typedLogs = logs as Array<{ args?: Record<string, unknown> }>
                typedLogs.forEach((log) => {
                  const rawPoints = log?.args?.points as unknown
                  let points = 0
                  if (typeof rawPoints === 'bigint') {
                    points = Number(rawPoints)
                  } else if (typeof rawPoints === 'number') {
                    points = rawPoints
                  } else if (typeof rawPoints === 'string') {
                    const parsed = Number(rawPoints)
                    if (Number.isFinite(parsed)) points = parsed
                  }
                  const fromArg = log?.args?.from as unknown
                  const fromAddress = typeof fromArg === 'string' ? fromArg : null
                  pushNotification({
                    type: 'info',
                    title: 'Tip received',
                    message: points > 0
                      ? `You received ${points.toLocaleString()} bonus points${fromAddress ? ` from ${short(fromAddress, 12)}` : ''}.`
                      : `New tip detected${fromAddress ? ` from ${short(fromAddress, 12)}` : ''}.`,
                  })
                })
              },
            }),
          )

          register(
            client.watchContractEvent({
              ...baseConfig,
              eventName: 'ERC20Payout',
              args: { questId: questIdBigInt, to: account },
              onLogs: (logs) => {
                const typedLogs = logs as Array<{ args?: Record<string, unknown> }>
                if (cancelled || !typedLogs.length) return
                const first = typedLogs[0]
                const amountRaw = first?.args?.amount as unknown
                const tokenArg = first?.args?.token as unknown
                let amount = 0
                if (typeof amountRaw === 'bigint') {
                  amount = Number(amountRaw)
                } else if (typeof amountRaw === 'number') {
                  amount = amountRaw
                } else if (typeof amountRaw === 'string') {
                  const parsed = Number(amountRaw)
                  if (Number.isFinite(parsed)) amount = parsed
                }
                const tokenAddress = typeof tokenArg === 'string' ? tokenArg : ''
                pushNotification({
                  type: 'success',
                  title: 'Token reward transferred',
                  message: amount > 0
                    ? `${amount.toLocaleString()} units from ${short(tokenAddress || '0x0', 10)}.`
                    : `Reward escrow from ${short(tokenAddress || '0x0', 10)} updated.`,
                })
              },
            }),
          )
        }
      } catch (err) {
        console.warn('Quest watcher setup failed', err)
      }
    }

    void start()

    return () => {
      cancelled = true
      disposers.forEach((stop) => {
        try {
          stop?.()
        } catch {}
      })
    }
  }, [chainKey, questIdBigInt, isHydrated, questIdParam, connectedAddress, pushNotification, refreshRankProgress])

  useEffect(() => {
    if (!castPreview) return
    const author = castPreview.author || castPreview?.author
    if (author?.fid) {
      // no-op (reserved for future autofill)
    }
  }, [castPreview])

  return (
    <>
      <div className="pixel-page px-4 sm:px-6 py-4 text-slate-200">
      <div className="max-w-5xl mx-auto pb-8">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="quest-chain-tile" aria-hidden>
                <ChainIcon chain={chainKey} label={CHAIN_LABEL[chainKey]} size={38} />
              </span>
              <div>
                <div className="text-lg text-cyan-200">Gmeow Quest Verification</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <QuestChainChip chain={chainKey} label={CHAIN_LABEL[chainKey]} />
                  <span>Quest ID: {questIdParam}</span>
                  {quest ? (
                    <span className="text-slate-200">
                      Creator: {short(quest.creator || String(quest.creator || ''), 22)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="pixel-button" onClick={() => router.back()}>← Back</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 lg:gap-5">
          <main>
            <div className="pixel-card mb-3">
              <div>
                <div className="pixel-section-title">Quest summary</div>
                <div className="mt-2">
                  {loadingQuest ? (
                    <QuestLoadingDeck columns="single" count={1} dense />
                  ) : quest ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <QuestChainChip chain={chainKey} label={CHAIN_LABEL[chainKey]} />
                        <span>
                          Type: {QUEST_TYPES_BY_CODE[Number(quest.questType ?? 0)] ?? 'UNKNOWN'}
                        </span>
                      </div>
                      <div className="text-emerald-300 text-base">{quest.name || 'Unnamed Quest'}</div>
                      <div className="mt-1 text-xs text-slate-300">
                        Creator: {quest.creator ? short(String(quest.creator), 28) : '—'}
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        Reward:{' '}
                        {(() => {
                          const pts = toNumeric(quest.rewardPoints ?? 0)
                          const token = toNumeric(quest.rewardTokenPerUser ?? 0)
                          const parts: string[] = []
                          if (typeof pts === 'number') parts.push(`${pts.toLocaleString()} pts`)
                          if (typeof token === 'number' && token > 0) parts.push(`${token.toLocaleString()} token units`)
                          return parts.length ? parts.join(' • ') : '—'
                        })()}
                      </div>
                      <div className="mt-1 text-xs text-slate-300">
                        Claims: {Number(quest.claimedCount ?? 0).toLocaleString()} / {Number(quest.maxCompletions ?? 0) > 0 ? Number(quest.maxCompletions ?? 0).toLocaleString() : '∞'}
                      </div>
                      {/* Live status with countdown */}
                      {(() => {
                        const exp = Number(quest.expiresAt || 0)
                        const closed = quest.isActive === false
                        let label = '—'
                        let cls = 'text-slate-300'
                        if (closed) {
                          label = 'Closed'
                          cls = 'text-rose-300'
                        } else if (!exp) {
                          label = 'Active • No expiry'
                          cls = 'text-slate-300'
                        } else {
                          const left = exp - nowSec
                          if (left > 0) {
                            label = `Active • Expires in ${formatDurationShort(left)} (${formatUnix(exp)})`
                            cls = 'text-amber-300'
                          } else {
                            label = `Expired • ${formatUnix(exp)}`
                            cls = 'text-rose-300'
                          }
                        }
                        return <div className={`mt-1 text-xs ${cls}`}>{label}</div>
                      })()}
                      {latestAutoCloseMessage ? (
                        <div className={`mt-2 text-xs ${autoCloseToneClass}`}>
                          {latestAutoCloseMessage.message}
                        </div>
                      ) : null}
                      <div className="mt-2 text-sm">
                        <strong>Meta</strong>:
                        <pre className="quest-builder-debug rounded mt-2 p-2 text-sm text-sky-200 whitespace-pre-wrap">
                          {safeStringify(tryParseMeta(quest.meta), 2)}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-300">Quest not available.</div>
                  )}
                  {questLoadError ? <div className="text-rose-300 mt-1 text-sm">{questLoadError}</div> : null}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <NeynarCastCard cast={castPreview} />
              <div className="flex gap-2 mt-2">
                <input
                  className="pixel-input flex-1"
                  placeholder="Cast URL (e.g. https://farcaster.xyz/username/0x... )"
                  value={castInput}
                  onChange={(e) => setCastInput(e.currentTarget.value)}
                  onBlur={(e) => previewCast(e.currentTarget.value)}
                />
                <button className="pixel-button min-h-[44px]" onClick={() => previewCast(castInput || metaPreview?.castUrl || metaPreview?.identifier || '')}>
                  Preview Cast
                </button>
              </div>
              <div className="mt-2">
                <div className="text-xs text-slate-300">Viewer FID (your Farcaster FID):</div>
                <div className="flex gap-2 mt-2 items-center">
                  <input
                    className="pixel-input w-[180px]"
                    placeholder="Your FID (e.g. 18139)"
                    value={inputFid}
                    onChange={(e) => setInputFid(e.target.value.replace(/[^\d]/g, ''))}
                  />
                  <button
                    className="pixel-button min-h-[44px]"
                    onClick={() => {
                      const possible = castPreview?.author?.fid || castPreview?.author_fid || 0
                      if (possible) {
                        setInputFid(String(possible))
                        setCopyMessage('Auto-filled from cast author fid')
                        setTimeout(() => setCopyMessage(null), 2000)
                      } else {
                        setCopyMessage('No fid found in cast preview')
                        setTimeout(() => setCopyMessage(null), 2000)
                      }
                    }}
                  >
                    Auto-fill from Cast
                  </button>
                  <button className="pixel-button min-h-[44px]" disabled={linkFidDisabled} onClick={async () => { try { await linkFidOnContract() } catch {} }}>
                    {linkingFid ? 'Linking…' : 'Link FID'}
                  </button>
                  <div className="ml-auto text-xs text-slate-300">{copyMessage ?? ''}</div>
                </div>
                <div className={`mt-2 text-xs ${displayFidStatusClass}`}>
                  {displayFidStatusMessage}
                </div>
              </div>
            </div>

            <div className="pixel-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="pixel-section-title">Verification</div>
                  <div className="text-xs text-slate-300 mt-1">
                    Click verify to request the server to validate your action. The server returns a signature to claim on-chain.
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="pixel-button min-h-[44px]" disabled={verifyButtonDisabled} onClick={async () => { try { await handleVerifyClick() } catch {} }}>
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>

              {verifyError ? (
                <div className="mt-2 text-rose-300 text-sm">
                  <strong>Error</strong>: {verifyError}
                </div>
              ) : null}

              {verifyResult ? (
                <div id="verify-result" className="mt-3">
                  <div className="text-emerald-300 text-sm">Verified — Signature Ready</div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-slate-300">Action</div>
                      <div className="text-slate-300">{QUEST_TYPES_BY_CODE[verifyResult.actionCode] ?? verifyResult.actionCode}</div>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="text-slate-300">Oracle-signed payload</div>
                        <div className="text-slate-300">expires: {formatUnix(verifyResult.deadline)}</div>
                      </div>
                      <pre className="quest-builder-debug rounded mt-2 p-3 text-sm whitespace-pre-wrap">
                        {safeStringify({ sig: verifyResult.sig, fid: verifyResult.fid, nonce: verifyResult.nonce, deadline: verifyResult.deadline }, 2)}
                      </pre>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button className="pixel-button" onClick={() => { navigator.clipboard.writeText(safeStringify(verifyResult, 2)) }}>
                        Copy Signature Payload
                      </button>
                      <button className="pixel-button" disabled={!isHydrated || autoClaiming} onClick={async () => { try { await attemptAutoClaim() } catch (e: any) { setVerifyError(String(e?.message || e)) } }}>
                        {autoClaiming ? 'Claiming...' : 'Auto-Claim (wallet)'}
                      </button>
                      <button
                        className="pixel-button"
                        disabled={!shareFrameUrl}
                        onClick={handleShareFrame}
                      >
                        {shareButtonLabel}
                      </button>
                    </div>

                    {claimTxHash ? (
                      <div className="mt-3 text-sm">
                        Claim TX: <a className="text-emerald-300" href="#" target="_blank" rel="noreferrer">{claimTxHash}</a>
                        <div className="text-xs text-slate-300">If successful, your on-chain claim was broadcasted.</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-slate-300 mb-1">Server debug (safe):</div>
                    <div className="quest-builder-debug max-h-[260px] overflow-auto text-sm p-2 rounded">
                      <pre className="whitespace-pre-wrap">{debugJson || 'No debug yet — run verify with debug: true on the server.'}</pre>
                    </div>
                  </div>

                  {autoCloseLogs.length ? (
                    <div className="mt-3">
                      <div className="text-xs text-slate-300 mb-1">Auto-close log</div>
                      <div className="quest-builder-debug max-h-[160px] overflow-auto text-sm p-2 rounded space-y-1">
                        {autoCloseLogs.map((entry, idx) => (
                          <div key={`${entry.ts}-${idx}`} className="whitespace-pre-wrap">
                            [{format(new Date(entry.ts), 'HH:mm:ss')}] {entry.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </main>

          <aside>
            <div className="pixel-card mb-3">
              <div className="pixel-section-title">Quick Help</div>
              <div className="mt-2 text-xs text-slate-300">
                • Ensure your Gmeow verifier is configured for cast checks.<br />
                • If cast probe fails, use the exact Warpcast URL or 0x hash.<br />
                • If auto-claim stalls, copy the signature payload and call completeQuestWithSig.
              </div>
            </div>

            <div className="pixel-card mb-3">
              <div className="pixel-section-title">Network</div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-slate-300">Target chain</div>
                  <div className="text-slate-300">{CHAIN_LABEL[chainKey]}</div>
                </div>
                <div className="mt-2">
                  {!isHydrated ? (
                    <div className="text-xs text-slate-300">Checking wallet connection…</div>
                  ) : isConnected ? (
                    walletOnTargetChain ? (
                      <div className="text-xs text-emerald-300">Wallet is already on {CHAIN_LABEL[chainKey]}.</div>
                    ) : (
                      <button
                        className="pixel-button"
                        onClick={async () => {
                          try {
                            if (!connectedAddress) {
                              setVerifyError('Connect your wallet before switching chains.')
                              return
                            }
                            await ensureWalletOnChain(chainKey)
                            setCopyMessage('Wallet switched (or already on) target chain')
                            setTimeout(() => setCopyMessage(null), 2000)
                          } catch (e: any) {
                            setVerifyError(String(e?.message || e))
                          }
                        }}
                      >
                        Switch Wallet to {CHAIN_LABEL[chainKey]}
                      </button>
                    )
                  ) : (
                    <div className="text-xs text-slate-300">Connect your wallet to switch to {CHAIN_LABEL[chainKey]}.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pixel-card mb-3">
              <div className="flex items-center justify-between">
                <div className="pixel-section-title">Rank Progress</div>
                <button
                  className="pixel-button text-xs px-2 py-1"
                  disabled={rankLoading || !isHydrated || !connectedAddress || !isAddress(connectedAddress)}
                  onClick={() => { void refreshRankProgress() }}
                >
                  {rankLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {!isHydrated ? (
                <div className="text-xs text-slate-300 mt-2">Connect your wallet to view XP progress.</div>
              ) : !connectedAddress || !isAddress(connectedAddress) ? (
                <div className="text-xs text-slate-300 mt-2">Connect your wallet to view XP progress.</div>
              ) : rankSnapshot ? (
                <>
                  <RankProgress points={rankSnapshot.totalPoints} variant="subtle" size="sm" className="mt-2" />
                  <div className="text-sm text-slate-400 mt-2">
                    Available {rankSnapshot.availablePoints.toLocaleString()} • Locked {rankSnapshot.lockedPoints.toLocaleString()}
                  </div>
                  {rankSnapshot.delta > 0 ? (
                    <div className="text-sm text-emerald-300 mt-1">+{rankSnapshot.delta.toLocaleString()} points since last update.</div>
                  ) : null}
                </>
              ) : rankLoading ? (
                <div className="text-xs text-slate-300 mt-2">Loading rank data…</div>
              ) : (
                <div className="text-xs text-slate-300 mt-2">Verify a quest to populate your XP progress.</div>
              )}
              {rankError ? <div className="text-xs text-rose-300 mt-2">{rankError}</div> : null}
            </div>

            <div className="pixel-card">
              <div className="pixel-section-title">Meta quick view</div>
              <div className="mt-2">
                <div className="text-emerald-300 text-sm">{metaPreview?.name || metaPreview?.display || '—'}</div>
                <div className="mt-1 text-xs text-slate-300">Type: {metaPreview?.questTypeKey || metaPreview?.type || '—'}</div>
                <div className="mt-2">
                  <div className="text-xs text-slate-300">Instructions:</div>
                  <div className="mt-1 text-sm">{metaPreview?.instructions ?? 'No instructions in quest meta.'}</div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-300">Cast / identifier:</div>
                  <div className="mt-1 text-xs">{metaPreview?.castUrl || metaPreview?.identifier || '—'}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-4 text-xs text-slate-300">
          If you see “execution reverted: quest expired” when claiming, check quest.expiresAt and server-signed deadline.
        </div>
      </div>
      </div>
      {xpCelebration ? (
        <XPEventOverlay
          open={Boolean(xpCelebration)}
          payload={{
            ...xpCelebration,
            shareUrl: xpCelebration.shareUrl ?? shareFrameUrl,
            onShare: xpCelebration.onShare ?? (shareFrameUrl ? handleShareFrame : undefined),
            visitUrl: xpCelebration.visitUrl ?? questDetailUrl,
            visitLabel: xpCelebration.visitLabel ?? 'Open quest',
          }}
          onClose={() => setXpCelebration(null)}
        />
      ) : null}
    </>
  )
}