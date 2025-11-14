'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useConfig } from 'wagmi'
import { getPublicClient } from 'wagmi/actions'
import { TimeEmoji } from '@/components/TimeEmoji'
import { Button, buttonVariants } from '@/components/ui/button'
import Loader from '@/components/ui/loader'
import { useNotifications, type NotificationTone } from '@/components/ui/live-notifications'
import QuestLoadingDeck from '@/components/Quest/QuestLoadingDeck'
import { QuestCard, type QuestCardData } from '@/components/Quest/QuestCard'
import {
  CHAIN_IDS,
  CHAIN_KEYS,
  CHAIN_LABEL,
  GM_CONTRACT_ABI,
  QUEST_TYPES_BY_CODE,
  sanitizeExpiresAt,
  normalizeQuestStruct,
  type ChainKey,
  type QuestTypeKey,
  type NormalizedQuest,
  getContractAddress,
} from '@/lib/gm-utils'
import { clamp, cn, readStorageCache, writeStorageCache } from '@/lib/utils'

const CHAINS: ChainKey[] = CHAIN_KEYS
const TYPE_FILTERS = [
  { key: 'all', label: 'All quests' },
  { key: 'social', label: 'Social actions' },
  { key: 'onchain', label: 'Onchain / manual' },
] as const

const REWARD_FILTERS = [
  { key: 'all', label: 'All rewards' },
  { key: 'points', label: 'Points' },
  { key: 'token', label: 'Token' },
] as const

const QUEST_CACHE_KEY = 'gmeowQuestHubCache_v1'
const QUEST_CACHE_TTL_MS = 1000 * 60 * 5
const QUEST_ARCHIVE_CACHE_KEY = 'gmeowQuestArchive_v1'
const QUEST_ARCHIVE_TTL_MS = 1000 * 60 * 60 * 24 * 30

type TypeFilterKey = (typeof TYPE_FILTERS)[number]['key']
type RewardFilterKey = (typeof REWARD_FILTERS)[number]['key']

type QuestSummary = {
  id: number
  chain: ChainKey
  chainLabel: string
  questTypeCode: number
  questTypeKey: QuestTypeKey | null
  category: 'social' | 'onchain'
  name: string
  instructions: string
  rewardPoints: number
  rewardToken: string | null
  rewardTokenPerUser: number
  maxCompletions: number
  expiresAt: number
  meta: Record<string, unknown> | null
  completions: number | null
  completionTarget: number | null
  completionPercent: number | null
  progressBarPercent: number | null
  progressLabel: string | null
  streakCount: number | null
  streakLabel: string | null
  lastCompletedAt: number | null
}

type QuestArchiveEntry = {
  id: number
  chain: ChainKey
  chainLabel: string
  name: string
  category: 'social' | 'onchain'
  questTypeKey: QuestTypeKey | null
  rewardPoints: number
  rewardToken: string | null
  rewardTokenPerUser: number
  expiresAt: number
  lastSeen: number
  retiredAt: number | null
  progressLabel: string | null
  streakLabel: string | null
}

type FeaturedQuest = {
  key: string
  id: number
  chain: ChainKey
  name: string
  chainLabel: string
  tagClass: string
  tagLabel: string
  description: string
  metaLabel: string
  href: string
}

export default function QuestHubPage() {
  const wagmiConfig = useConfig()
  const { push } = useNotifications()

  const sendNotification = useCallback(
    (input: { tone: NotificationTone; title: string; description?: string; href?: string; actionLabel?: string; duration?: number }) =>
      push(input),
    [push],
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quests, setQuestsState] = useState<QuestSummary[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [cacheHydrated, setCacheHydrated] = useState(false)
  const [archive, setArchive] = useState<QuestArchiveEntry[]>([])
  const [archiveHydrated, setArchiveHydrated] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('')

  const [chainFilter, setChainFilter] = useState<ChainKey | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilterKey>('all')
  const [rewardFilter, setRewardFilter] = useState<RewardFilterKey>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const questsRef = useRef<QuestSummary[]>([])
  const fetchVersionRef = useRef(0)
  const filterNoticeRef = useRef(false)
  const emptyNoticeRef = useRef(false)
  const expiryNoticeRef = useRef<number>(0)
  const tokenNoticeRef = useRef<number>(-1)
  const lastResultCountRef = useRef<number | null>(null)
  const lastErrorRef = useRef<string | null>(null)
  const initialFetchRef = useRef(false)

  const setQuests = useCallback((next: QuestSummary[]) => {
    questsRef.current = next
    setQuestsState(next)
  }, [])

  useEffect(() => {
    if (cacheHydrated) return
    const snapshot = readStorageCache<{ quests: QuestSummary[]; lastSync: number | null }>(
      QUEST_CACHE_KEY,
      QUEST_CACHE_TTL_MS,
    )
    if (snapshot?.quests?.length) {
      setQuests(snapshot.quests)
      setLastSync(snapshot.lastSync ?? null)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setCacheHydrated(true)
  }, [cacheHydrated, setQuests])

  useEffect(() => {
    if (archiveHydrated) return
    const snapshot = readStorageCache<{ entries: QuestArchiveEntry[] }>(
      QUEST_ARCHIVE_CACHE_KEY,
      QUEST_ARCHIVE_TTL_MS,
    )
    if (snapshot?.entries?.length) {
      setArchive(snapshot.entries)
    }
    setArchiveHydrated(true)
  }, [archiveHydrated])

  const fetchQuests = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      const version = ++fetchVersionRef.current
      const loud = !silent
      if (loud) {
        setLoading(true)
        sendNotification({
          tone: 'info',
          title: 'Syncing quests…',
          description: 'Scanning every active missions.',
        })
      }
      setIsSyncing(true)
      setError(null)

      const chainResults = await Promise.all(
        CHAINS.map(async (chain) => {
          const chainFailures: string[] = []
          const chainQuests: QuestSummary[] = []
          try {
            const client = getPublicClient(wagmiConfig, { chainId: CHAIN_IDS[chain] })
            if (!client) {
              chainFailures.push(`Missing RPC client for ${CHAIN_LABEL[chain]}`)
              return { chain, quests: chainQuests, failures: chainFailures }
            }

            const ids = (await client.readContract({
              address: getContractAddress(chain),
              abi: GM_CONTRACT_ABI,
              functionName: 'getActiveQuests',
              args: [],
            } as const)) as bigint[]

            const trimmed = ids.slice(0, 200)
            await Promise.all(
              trimmed.map(async (rawId) => {
                const questId = Number(rawId)
                if (!Number.isFinite(questId) || questId <= 0) return
                try {
                  const questRaw = await client.readContract({
                    address: getContractAddress(chain),
                    abi: GM_CONTRACT_ABI,
                    functionName: 'getQuest',
                    args: [rawId],
                  } as const)

                  const normalized = normalizeQuestStruct(questRaw) as NormalizedQuest
                  if (!normalized?.isActive) return

                  const meta = parseQuestMeta(normalized.meta)
                  const questTypeCode = normalized.questType ?? (typeof meta?.questTypeCode === 'number' ? meta.questTypeCode : 0)
                  const questTypeKey = questTypeCode ? QUEST_TYPES_BY_CODE[questTypeCode] ?? null : null
                  const category = classifyQuest(meta?.type, questTypeKey)
                  const rewardPoints = normalized.rewardPoints ?? toNumber(meta?.reward?.pointsPerUser) ?? 0
                  const rewardToken = normalized.rewardToken ?? (typeof meta?.reward?.token === 'string' ? meta.reward.token : '')
                  const rewardTokenPerUser = normalized.rewardTokenPerUser ?? toNumber(meta?.reward?.tokenPerUser) ?? 0
                  const maxCompletions = normalized.maxCompletions ?? toNumber(meta?.limits?.maxCompletions) ?? 0
                  const expiresAt = sanitizeExpiresAt(normalized.expiresAt ?? toNumber(meta?.expiresAt))
                  const progress = deriveQuestProgress(normalized, meta, maxCompletions)

                  chainQuests.push({
                    id: questId,
                    chain,
                    chainLabel: CHAIN_LABEL[chain],
                    questTypeCode,
                    questTypeKey,
                    category,
                    name: normalized.name || meta?.name || `Quest #${questId}`,
                    instructions: typeof meta?.instructions === 'string' ? meta.instructions : '',
                    rewardPoints,
                    rewardToken: rewardToken ? rewardToken : null,
                    rewardTokenPerUser,
                    maxCompletions,
                    expiresAt,
                    meta,
                    completions: progress.completions,
                    completionTarget: progress.completionTarget,
                    completionPercent: progress.completionPercent,
                    progressBarPercent: progress.progressBarPercent,
                    progressLabel: progress.progressLabel,
                    streakCount: progress.streakCount,
                    streakLabel: progress.streakLabel,
                    lastCompletedAt: progress.lastCompletedAt,
                  })
                } catch (questError) {
                  chainFailures.push(`Quest ${chain}#${questId}: ${(questError as Error).message ?? 'read failed'}`)
                }
              }),
            )
          } catch (chainError) {
            chainFailures.push(`${CHAIN_LABEL[chain]}: ${(chainError as Error).message ?? 'unreachable'}`)
          }
          return { chain, quests: chainQuests, failures: chainFailures }
        }),
      )

      if (fetchVersionRef.current !== version) {
        setIsSyncing(false)
        if (loud) setLoading(false)
        return
      }

      const collected = chainResults.flatMap((result) => result.quests)
      const failures = chainResults.flatMap((result) => result.failures)

      collected.sort((a, b) => (b.expiresAt || 0) - (a.expiresAt || 0))
      setQuests(collected)
      setIsSyncing(false)
      setLoading(false)
      const now = Date.now()
      setLastSync(now)

      writeStorageCache(QUEST_CACHE_KEY, { quests: collected, lastSync: now })
      setArchive((prev) => {
        const next = mergeQuestArchive(prev, collected, now)
        writeStorageCache(QUEST_ARCHIVE_CACHE_KEY, { entries: next })
        return next
      })

      const failureMessage = failures.length
        ? `Some networks were skipped: ${failures.slice(0, 2).join('; ')}${failures.length > 2 ? '…' : ''}`
        : null
      setError(failureMessage)

      if (failureMessage) {
        if (failureMessage !== lastErrorRef.current) {
          sendNotification({
            tone: 'warning',
            title: 'Partial quest sync',
            description: failureMessage,
          })
        }
      } else if (lastErrorRef.current) {
        lastErrorRef.current = null
      }
      lastErrorRef.current = failureMessage ?? null

      const prevCount = lastResultCountRef.current
      const shouldAnnounce = loud || prevCount === null || prevCount !== collected.length
      lastResultCountRef.current = collected.length
      if (shouldAnnounce) {
        const tone: NotificationTone = collected.length && !failureMessage ? 'success' : 'info'
        sendNotification({
          tone,
          title: collected.length ? 'Quest board updated' : 'No quests live yet',
          description: collected.length ? `${collected.length} missions ready.` : 'Creators have not published missions yet.',
        })
      }

      if (!collected.length) {
        if (!emptyNoticeRef.current) {
          sendNotification({
            tone: 'warning',
            title: 'Empty mission board',
            description: 'Try again later or launch your own quest.',
          })
          emptyNoticeRef.current = true
        }
      } else {
        emptyNoticeRef.current = false
      }

      const expiringSoon = collected.filter((quest) => quest.expiresAt && quest.expiresAt * 1000 - now < 86_400_000).length
      if (expiringSoon && expiryNoticeRef.current !== expiringSoon) {
        sendNotification({
          tone: 'warning',
          title: 'Quests expiring soon',
          description: `${expiringSoon} mission${expiringSoon === 1 ? '' : 's'} wrap within 24h.`,
        })
        expiryNoticeRef.current = expiringSoon
      }
      if (!expiringSoon) {
        expiryNoticeRef.current = 0
      }

      const tokenRewards = collected.filter((quest) => quest.rewardToken).length
      if (tokenRewards > 0 && tokenRewards !== tokenNoticeRef.current) {
        sendNotification({
          tone: 'success',
          title: 'Token rewards live',
          description: `${tokenRewards} mission${tokenRewards === 1 ? '' : 's'} are paying tokens today.`,
        })
      }
      tokenNoticeRef.current = tokenRewards
    },
    [sendNotification, setArchive, setQuests, wagmiConfig],
  )

  useEffect(() => {
    if (!cacheHydrated || initialFetchRef.current) return
    initialFetchRef.current = true
    const stale = !lastSync || Date.now() - lastSync > QUEST_CACHE_TTL_MS
    void fetchQuests({ silent: !stale && !!questsRef.current.length })
  }, [cacheHydrated, lastSync, fetchQuests])

  const handleRefresh = useCallback(() => {
    void fetchQuests({ silent: false })
  }, [fetchQuests])

  const handleResetFilters = useCallback(() => {
    setChainFilter('all')
    setTypeFilter('all')
    setRewardFilter('all')
    setSearchTerm('')
    sendNotification({
      tone: 'info',
      title: 'Filters reset',
      description: 'Showing every active mission.',
    })
  }, [sendNotification])

  const filteredQuests = useMemo(() => {
    return quests.filter((quest) => {
      if (chainFilter !== 'all' && quest.chain !== chainFilter) return false
      if (typeFilter === 'social' && quest.category !== 'social') return false
      if (typeFilter === 'onchain' && quest.category !== 'onchain') return false
      if (rewardFilter === 'points' && quest.rewardToken) return false
      if (rewardFilter === 'token' && !quest.rewardToken) return false

      if (searchTerm.trim()) {
        const needle = searchTerm.trim().toLowerCase()
        const haystack = [
          quest.name,
          quest.instructions,
          quest.questTypeKey ?? '',
          quest.chainLabel,
          quest.rewardToken ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }

      return true
    })
  }, [quests, chainFilter, typeFilter, rewardFilter, searchTerm])

  useEffect(() => {
    if (loading) return
    if (quests.length && !filteredQuests.length) {
      if (!filterNoticeRef.current) {
        sendNotification({
          tone: 'info',
          title: 'No quests match filters',
          description: 'Adjust the filters or reset to see every mission.',
        })
        filterNoticeRef.current = true
      }
    } else if (filteredQuests.length) {
      filterNoticeRef.current = false
    }
  }, [filteredQuests.length, quests.length, loading, sendNotification])

  const featured = useMemo(() => buildFeaturedQuests(quests), [quests])
  const featuredKeys = useMemo(() => new Set(featured.map((item) => `${item.chain}:${item.id}`)), [featured])

  const archiveResults = useMemo(() => {
    if (!archive.length) return [] as QuestArchiveEntry[]
    const needle = archiveSearchTerm.trim().toLowerCase()
    const base = needle
      ? archive.filter((entry) =>
          [
            entry.name,
            entry.chainLabel,
            entry.category,
            entry.questTypeKey ?? '',
            entry.progressLabel ?? '',
            entry.streakLabel ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(needle),
        )
      : archive
    return [...base].sort((a, b) => {
      const aTime = a.retiredAt ?? a.lastSeen
      const bTime = b.retiredAt ?? b.lastSeen
      return bTime - aTime
    })
  }, [archive, archiveSearchTerm])

  useEffect(() => {
    if (!archiveOpen) return undefined
    if (typeof window === 'undefined') return undefined
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setArchiveOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [archiveOpen])

  useEffect(() => {
    if (!archiveOpen) {
      setArchiveSearchTerm('')
    }
  }, [archiveOpen])

  const syncLabel = formatRelativeTime(lastSync)
  const showSkeleton = loading && !quests.length

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14 px-4 pb-24 pt-16 sm:px-8 lg:px-10">
      <section className="relative overflow-hidden pixel-card px-6 py-10 sm:px-10 sm:py-12">
        <span className="quest-hero-orbit" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="quest-tag quest-tag--accent">
              <TimeEmoji className="text-base" /> Gmeow Missions
            </span>
            <div className="theme-shell-label flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em]">
              <span>{syncLabel}</span>
              <Button
                type="button"
                size="small"
                color="primary"
                className="gap-2"
                onClick={handleRefresh}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <span className="flex items-center gap-3">
                    <Loader
                      tag="span"
                      size="small"
                      variant="scaleUp"
                      showOnlyThreeDots
                      className="text-current"
                    />
                    Syncing…
                  </span>
                ) : (
                  'Refresh Board'
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="theme-shell-label text-[10px] uppercase tracking-[0.3em]">Mission type</span>
            <div className="flex flex-wrap gap-2" role="tablist">
              {TYPE_FILTERS.map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  size="mini"
                  variant={typeFilter === key ? 'solid' : 'ghost'}
                  color={typeFilter === key ? 'primary' : 'gray'}
                  className="px-4"
                  onClick={() => setTypeFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="theme-shell-label text-[10px] uppercase tracking-[0.3em]">Reward</span>
          <div className="flex flex-wrap gap-2" role="tablist">
            {REWARD_FILTERS.map(({ key, label }) => (
              <Button
                key={key}
                type="button"
                size="mini"
                variant={rewardFilter === key ? 'solid' : 'ghost'}
                color={rewardFilter === key ? (key === 'token' ? 'warning' : 'primary') : 'gray'}
                className="px-4"
                onClick={() => setRewardFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="theme-shell-label text-[10px] uppercase tracking-[0.3em]" htmlFor="quest-search">
            Search
          </label>
          <input
            id="quest-search"
            placeholder="Name, chain, token, type"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pixel-input"
          />
        </div>
      </section>

      <section className="min-h-[280px]">
        {showSkeleton ? (
          <QuestLoadingDeck />
        ) : filteredQuests.length ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredQuests.map((quest, questIndex) => {
              const compositeKey = `${quest.chain}:${quest.id}`
              return (
                <QuestCard
                  key={compositeKey}
                  quest={quest as QuestCardData}
                  index={questIndex}
                  featured={featuredKeys.has(compositeKey)}
                />
              )
            })}
          </div>
        ) : (
          <div className="quest-empty pixel-card">
            <div className="quest-empty__art" aria-hidden>
              <div className="quest-empty__ring quest-empty__ring--outer" />
              <div className="quest-empty__ring quest-empty__ring--inner" />
              <div className="quest-empty__icon">🐾</div>
            </div>
            <div className="quest-empty__body">
              <span className="quest-tag quest-tag--info">No missions found</span>
              <h3 className="quest-empty__title">Spin up your own quest</h3>
              <p className="quest-empty__copy">
                Adjust the filters or jump straight into the quest creator to launch a fresh challenge for the community.
              </p>
              <div className="quest-empty__actions">
                <Button type="button" size="small" variant="ghost" color="gray" onClick={handleResetFilters}>
                  Reset filters
                </Button>
                <Link className={cn(buttonVariants({ size: 'small', color: 'primary' }), 'px-5')} href="/Quest/creator">
                  Open quest builder
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {error ? (
        <div className="theme-shell-banner theme-shell-banner--warning text-sm">
          {error}
        </div>
      ) : null}

      {archiveOpen ? (
        <div className="quest-archive__overlay" role="presentation" onClick={() => setArchiveOpen(false)}>
          <div
            className="quest-archive"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quest-archive-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="quest-archive__header">
              <div className="quest-archive__header-meta">
                <span className="quest-tag quest-tag--info">Quest archive</span>
                <p className="quest-archive__subtitle">Browse retired missions and revisit their highlights.</p>
              </div>
              <button type="button" className="quest-archive__close" onClick={() => setArchiveOpen(false)}>
                Close
              </button>
            </header>
            <div className="quest-archive__controls">
              <label className="quest-archive__label" htmlFor="quest-archive-search">
                Search archive
              </label>
              <input
                id="quest-archive-search"
                className="quest-archive__search"
                placeholder="Name, chain, reward, streak"
                value={archiveSearchTerm}
                onChange={(event) => setArchiveSearchTerm(event.target.value)}
                autoFocus
              />
            </div>
            <div className="quest-archive__list" role="list">
              {archiveResults.length ? (
                archiveResults.map((entry) => {
                  const statusTagClass = entry.retiredAt ? 'quest-tag--alert' : 'quest-tag--accent'
                  const statusLabel = entry.retiredAt ? 'Retired' : 'Active'
                  const rewardLabel = entry.rewardToken
                    ? entry.rewardTokenPerUser
                      ? `${formatNumber(entry.rewardTokenPerUser)} token`
                      : 'Token reward'
                    : `${formatNumber(entry.rewardPoints)} Gmeow Points`
                  const timingLabel = entry.retiredAt
                    ? `Retired ${formatRelativeTimeShort(entry.retiredAt)}`
                    : `Seen ${formatRelativeTimeShort(entry.lastSeen)}`
                  const detailHref = `/Quest/${entry.chain}/${entry.id}`
                  return (
                    <article key={`${entry.chain}-${entry.id}`} className="quest-archive__item" role="listitem">
                      <div className="quest-archive__item-head">
                        <span className="quest-tag quest-tag--info">{entry.chainLabel}</span>
                        <span className={cn('quest-tag', statusTagClass)}>{statusLabel}</span>
                      </div>
                      <div className="quest-archive__item-main">
                        <strong className="quest-archive__item-title">{entry.name}</strong>
                        <div className="quest-archive__item-tags">
                          <span className="quest-tag quest-tag--points">{rewardLabel}</span>
                          {entry.progressLabel ? (
                            <span className="quest-tag quest-tag--info">{entry.progressLabel}</span>
                          ) : null}
                          {entry.streakLabel ? (
                            <span className="quest-tag quest-tag--accent">
                              <span className="quest-tag__dot" aria-hidden />
                              {entry.streakLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="quest-archive__item-meta">
                          <span>{timingLabel}</span>
                          <Link className="quest-archive__item-link" href={detailHref}>
                            View details
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="quest-archive__empty">
                  <span className="quest-tag quest-tag--info">Archive empty</span>
                  <p className="quest-archive__empty-copy">
                    Once missions retire they will appear here with their final stats. Launch a quest to seed the archive.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type QuestProgressSnapshot = {
  completions: number | null
  completionTarget: number | null
  completionPercent: number | null
  progressBarPercent: number | null
  progressLabel: string | null
  streakCount: number | null
  streakLabel: string | null
  lastCompletedAt: number | null
}

function deriveQuestProgress(
  normalized: NormalizedQuest,
  meta: Record<string, any> | null,
  maxCompletions: number,
): QuestProgressSnapshot {
  const metaMetrics = typeof meta?.metrics === 'object' && meta?.metrics ? (meta.metrics as Record<string, any>) : undefined
  const metaStats = typeof meta?.stats === 'object' && meta?.stats ? (meta.stats as Record<string, any>) : undefined
  const metrics: Record<string, any> = metaMetrics || metaStats || {}
  const completions = firstFiniteNumber([
    normalized.claimedCount,
    metrics?.completed,
    metrics?.completions,
    metrics?.claims,
    meta?.completed,
    metaStats?.completed,
  ])

  const target = firstFiniteNumber(
    [
      maxCompletions,
      normalized.target,
      metrics?.goal,
      metrics?.target,
      meta?.goal,
      meta?.target,
    ],
    1,
  )

  let completionPercent: number | null = null
  if (target && target > 0 && completions !== null) {
    completionPercent = clamp(Math.round((completions / target) * 100), 0, 100)
  }

  let progressBarPercent = completionPercent
  if (progressBarPercent === null && completions !== null && completions > 0) {
    progressBarPercent = clamp(Math.round(Math.log10(completions + 1) * 28), 6, 96)
  }

  let progressLabel: string | null = null
  if (target && target > 0 && completions !== null) {
    progressLabel = `${formatNumber(completions)} / ${formatNumber(target)}`
  } else if (completions !== null) {
    progressLabel = `${formatNumber(completions)} completions`
  }

  const streakCount = firstFiniteNumber([
    meta?.streak?.current,
    metrics?.streak?.current,
    metrics?.currentStreak,
    metrics?.streak,
    metaStats?.streak,
  ])
  const streakScope =
    typeof meta?.streak?.window === 'string'
      ? meta.streak.window
      : typeof metrics?.streak?.window === 'string'
        ? metrics.streak.window
        : typeof meta?.streakWindow === 'string'
          ? meta.streakWindow
          : null
  const streakLabel = streakCount && streakCount > 0
    ? `${formatNumber(streakCount)}${streakScope ? ` ${streakScope}` : '-day'} streak`
    : null

  const lastCompletedAtRaw = firstFiniteNumber([
    metrics?.lastCompletedAt,
    metrics?.lastCompletionAt,
    meta?.lastCompletedAt,
    meta?.lastCompletionAt,
    metaStats?.lastCompletedAt,
  ])
  const lastCompletedAt = normalizeTimestamp(lastCompletedAtRaw)

  return {
    completions,
    completionTarget: target,
    completionPercent,
    progressBarPercent,
    progressLabel,
    streakCount,
    streakLabel,
    lastCompletedAt,
  }
}

function mergeQuestArchive(prev: QuestArchiveEntry[], active: QuestSummary[], timestamp: number): QuestArchiveEntry[] {
  const map = new Map<string, QuestArchiveEntry>()
  for (const entry of prev) {
    map.set(`${entry.chain}:${entry.id}`, { ...entry })
  }

  const activeKeys = new Set<string>()
  for (const quest of active) {
    const key = `${quest.chain}:${quest.id}`
    activeKeys.add(key)
    const existing = map.get(key)
    map.set(key, {
      id: quest.id,
      chain: quest.chain,
      chainLabel: quest.chainLabel,
      name: quest.name,
      category: quest.category,
      questTypeKey: quest.questTypeKey,
      rewardPoints: quest.rewardPoints,
      rewardToken: quest.rewardToken,
      rewardTokenPerUser: quest.rewardTokenPerUser,
      expiresAt: quest.expiresAt,
      lastSeen: timestamp,
      retiredAt: existing?.retiredAt ?? null,
      progressLabel: quest.progressLabel,
      streakLabel: quest.streakLabel,
    })
  }

  for (const [key, entry] of map) {
    if (activeKeys.has(key)) {
      entry.retiredAt = null
    } else if (!entry.retiredAt) {
      entry.retiredAt = timestamp
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => {
    const aTime = a.retiredAt ?? a.lastSeen
    const bTime = b.retiredAt ?? b.lastSeen
    return bTime - aTime
  })

  return sorted.slice(0, 160)
}

function buildFeaturedQuests(quests: QuestSummary[]): FeaturedQuest[] {
  if (!quests.length) return []

  const picks: Array<{ quest: QuestSummary; reason: 'token' | 'points' | 'expiring' | 'spotlight' }> = []

  const tokenTop = [...quests]
    .filter((quest) => quest.rewardToken)
    .sort((a, b) => (b.rewardTokenPerUser || 0) - (a.rewardTokenPerUser || 0))
  if (tokenTop[0]) picks.push({ quest: tokenTop[0], reason: 'token' })

  const pointsTop = [...quests]
    .filter((quest) => !quest.rewardToken)
    .sort((a, b) => (b.rewardPoints || 0) - (a.rewardPoints || 0))
  if (pointsTop[0] && !picks.some((pick) => pick.quest.id === pointsTop[0].id && pick.quest.chain === pointsTop[0].chain)) {
    picks.push({ quest: pointsTop[0], reason: 'points' })
  }

  const expiringSoon = [...quests]
    .filter((quest) => quest.expiresAt)
    .sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0))
  if (expiringSoon[0] && !picks.some((pick) => pick.quest.id === expiringSoon[0].id && pick.quest.chain === expiringSoon[0].chain)) {
    picks.push({ quest: expiringSoon[0], reason: 'expiring' })
  }

  if (!picks.length && quests[0]) {
    picks.push({ quest: quests[0], reason: 'spotlight' })
  }

  const truncate = (value: string | undefined | null, length: number) => {
    if (!value) return ''
    const trimmed = value.trim()
    if (trimmed.length <= length) return trimmed
    return `${trimmed.slice(0, length - 1)}…`
  }

  return picks.slice(0, 3).map(({ quest, reason }) => {
    const href = `/Quest/${quest.chain}/${quest.id}`
    const progress = quest.progressLabel
    const rewardLabel = quest.rewardToken
      ? quest.rewardTokenPerUser
        ? `${formatNumber(quest.rewardTokenPerUser)} tokens`
        : 'Token reward'
      : `${formatNumber(quest.rewardPoints)} Gmeow Points`
    let tagClass: string
    let tagLabel: string
    let metaLabel: string

    switch (reason) {
      case 'token':
        tagClass = 'quest-tag--token'
        tagLabel = 'Top token reward'
        metaLabel = `${rewardLabel} · ${quest.chainLabel}`
        break
      case 'points':
        tagClass = 'quest-tag--points'
        tagLabel = 'Top points reward'
        metaLabel = `${rewardLabel} · ${quest.chainLabel}`
        break
      case 'expiring':
        tagClass = 'quest-tag--alert'
        tagLabel = 'Expiring soon'
        metaLabel = quest.expiresAt ? `Ends ${formatExpiryShort(quest.expiresAt)}` : 'No expiry'
        break
      default:
        tagClass = 'quest-tag--info'
        tagLabel = 'Featured mission'
        metaLabel = quest.chainLabel
        break
    }

    const description = progress
      ? `${progress} · ${quest.chainLabel}`
      : truncate(quest.instructions, 110) || `${rewardLabel} · ${quest.chainLabel}`

    return {
      key: `${quest.chain}-${quest.id}-${reason}`,
      id: quest.id,
      chain: quest.chain,
      name: quest.name,
      chainLabel: quest.chainLabel,
      tagClass,
      tagLabel,
      description,
      metaLabel,
      href,
    }
  })
}

function parseQuestMeta(meta: unknown): Record<string, any> | null {
  if (!meta) return null
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta)
    } catch {
      return null
    }
  }
  if (typeof meta === 'object') return meta as Record<string, any>
  return null
}

function classifyQuest(metaType: unknown, questType: QuestTypeKey | null): 'social' | 'onchain' {
  const fromMeta = typeof metaType === 'string' ? metaType.toLowerCase() : ''
  if (fromMeta === 'social' || fromMeta === 'onchain') return fromMeta as 'social' | 'onchain'
  if (!questType) return 'onchain'
  return questType.startsWith('FARCASTER') ? 'social' : 'onchain'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatExpiryShort(expiresAt: number): string {
  try {
    const d = new Date(expiresAt * 1000)
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Unknown'
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }
  return null
}

function firstFiniteNumber(values: unknown[], minimum = 0): number | null {
  for (const candidate of values) {
    const num = toNumber(candidate)
    if (num === null || Number.isNaN(num)) continue
    if (minimum > 0 && num < minimum) continue
    if (minimum === 0 && num < 0) continue
    return num
  }
  return null
}

function normalizeTimestamp(value: number | null): number | null {
  if (!value || !Number.isFinite(value)) return null
  if (value > 1_000_000_000_000) return value
  return value * 1000
}

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Awaiting first sync'
  const delta = Date.now() - timestamp
  if (delta < 30_000) return 'Synced just now'
  if (delta < 60_000) return 'Synced under a minute ago'
  if (delta < 3_600_000) {
    const minutes = Math.round(delta / 60_000)
    return `Synced ${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  if (delta < 86_400_000) {
    const hours = Math.round(delta / 3_600_000)
    return `Synced ${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.round(delta / 86_400_000)
  return `Synced ${days} day${days === 1 ? '' : 's'} ago`
}

function formatRelativeTimeShort(timestamp: number | null): string {
  if (!timestamp) return 'just now'
  const delta = Date.now() - timestamp
  if (delta < 60_000) return 'just now'
  if (delta < 3_600_000) {
    const minutes = Math.round(delta / 60_000)
    return `${minutes}m ago`
  }
  if (delta < 86_400_000) {
    const hours = Math.round(delta / 3_600_000)
    return `${hours}h ago`
  }
  const days = Math.round(delta / 86_400_000)
  return `${days}d ago`
}

