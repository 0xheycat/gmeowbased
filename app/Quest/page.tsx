'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useConfig } from 'wagmi'
import { getPublicClient } from 'wagmi/actions'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { TimeEmoji } from '@/components/TimeEmoji'
import { Button, buttonVariants } from '@/components/ui/button'
import Loader from '@/components/ui/loader'
import { useNotifications, type NotificationTone } from '@/components/ui/live-notifications'
import QuestLoadingDeck from '@/components/Quest/QuestLoadingDeck'
import { QuestCard, type QuestCardData } from '@/components/Quest/QuestCard'
import { QuestFAB } from '@/components/Quest/QuestFAB'
import { getBookmarks, getBookmarkCount, type BookmarkedQuest } from '@/lib/quest-bookmarks'
import {
  CHAIN_IDS,
  ALL_CHAIN_IDS,
  CHAIN_KEYS,
  CHAIN_LABEL,
  GM_CONTRACT_ABI,
  QUEST_TYPES_BY_CODE,
  sanitizeExpiresAt,
  normalizeQuestStruct,
  type ChainKey,
  type GMChainKey,
  type QuestTypeKey,
  type NormalizedQuest,
  getContractAddress,
} from '@/lib/gmeow-utils'
import { formatNumber, formatExpiryShort, formatRelativeTime, formatRelativeTimeShort } from '@/lib/formatters'
import { clamp, cn, readStorageCache, writeStorageCache } from '@/lib/utils'

// Base-only for app functionality (Quests only deployed on Base)
const CHAINS: GMChainKey[] = ['base']
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
  const { showNotification } = useNotifications()

  const sendNotification = useCallback(
    (input: { tone: NotificationTone; title: string; description?: string; href?: string; actionLabel?: string; duration?: number }) =>
      showNotification(input.title + (input.description ? `: ${input.description}` : ''), input.tone, input.duration, 'quest'),
    [showNotification],
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
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
  const [bookmarks, setBookmarks] = useState<BookmarkedQuest[]>([])
  const [bookmarkCount, setBookmarkCount] = useState(0)
  
    // Debounced search terms
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedArchiveSearch = useDebounce(archiveSearchTerm, 300)

  // Update bookmark count when bookmarks change
  const refreshBookmarks = useCallback(() => {
    setBookmarks(getBookmarks())
    setBookmarkCount(getBookmarkCount())
  }, [])

  // Hydrate bookmarks from localStorage
  useEffect(() => {
    setBookmarks(getBookmarks())
    setBookmarkCount(getBookmarkCount())
    
    // Listen for bookmark changes from QuestCard
    const handleBookmarkChange = () => {
      refreshBookmarks()
    }
    
    window.addEventListener('quest-bookmark-changed', handleBookmarkChange)
    return () => window.removeEventListener('quest-bookmark-changed', handleBookmarkChange)
  }, [refreshBookmarks])

  const questsRef = useRef<QuestSummary[]>([])
  const fetchVersionRef = useRef(0)
  const filterNoticeRef = useRef(false)
  const emptyNoticeRef = useRef(false)
  const expiryNoticeRef = useRef<number>(0)
  const tokenNoticeRef = useRef<number>(-1)
  const lastResultCountRef = useRef<number | null>(null)
  const lastErrorRef = useRef<string | null>(null)
  const initialFetchRef = useRef(false)
  const archiveModalRef = useRef<HTMLDivElement>(null)
  const archiveSearchRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

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
            const client = getPublicClient(wagmiConfig, { chainId: ALL_CHAIN_IDS[chain] })
            if (!client) {
              chainFailures.push(`Missing RPC client for ${CHAIN_LABEL[chain]}`)
              return { chain, quests: chainQuests, failures: chainFailures }
            }

            const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
              Promise.race([
                promise,
                new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
              ])

            const ids = await rpcTimeout(
              client.readContract({
                address: getContractAddress(chain),
                abi: GM_CONTRACT_ABI,
                functionName: 'getActiveQuests',
                args: [],
              } as const) as Promise<bigint[]>,
              []
            )

            const trimmed = ids.slice(0, 200)
            await Promise.all(
              trimmed.map(async (rawId) => {
                const questId = Number(rawId)
                if (!Number.isFinite(questId) || questId <= 0) return
                try {
                  const questRaw = await rpcTimeout(
                    client.readContract({
                      address: getContractAddress(chain),
                      abi: GM_CONTRACT_ABI,
                      functionName: 'getQuest',
                      args: [rawId],
                    } as const),
                    null
                  )
                  if (!questRaw) return

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
    setShowBookmarksOnly(false)
    sendNotification({
      tone: 'info',
      title: 'Filters reset',
      description: 'Showing every active mission.',
    })
  }, [sendNotification])

  const handleBookmarkToggle = useCallback(() => {
    setShowBookmarksOnly(!showBookmarksOnly)
    if (!showBookmarksOnly) {
      sendNotification({
        tone: 'info',
        title: 'Bookmarks',
        description: `Showing ${bookmarkCount} saved ${bookmarkCount === 1 ? 'quest' : 'quests'}.`,
      })
    }
  }, [showBookmarksOnly, bookmarkCount, sendNotification])

  const handleScrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Filter keyboard navigation
  const handleFilterKeyDown = useCallback((event: React.KeyboardEvent, filterType: 'type' | 'reward', currentKey: string) => {
    const filters = filterType === 'type' ? TYPE_FILTERS : REWARD_FILTERS
    const currentIndex = filters.findIndex(f => f.key === currentKey)
    
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = (currentIndex + 1) % filters.length
      const nextKey = filters[nextIndex].key
      if (filterType === 'type') setTypeFilter(nextKey as TypeFilterKey)
      else if (filterType === 'reward') setRewardFilter(nextKey as RewardFilterKey)
      // Focus next button
      setTimeout(() => {
        const buttons = document.querySelectorAll<HTMLButtonElement>(`[data-filter-type="${filterType}"]`)
        buttons[nextIndex]?.focus()
      }, 0)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      const prevIndex = currentIndex === 0 ? filters.length - 1 : currentIndex - 1
      const prevKey = filters[prevIndex].key
      if (filterType === 'type') setTypeFilter(prevKey as TypeFilterKey)
      else if (filterType === 'reward') setRewardFilter(prevKey as RewardFilterKey)
      // Focus previous button
      setTimeout(() => {
        const buttons = document.querySelectorAll<HTMLButtonElement>(`[data-filter-type="${filterType}"]`)
        buttons[prevIndex]?.focus()
      }, 0)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus search on '/' key
      if (event.key === '/' && !archiveOpen && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      // Close archive on Escape
      if (event.key === 'Escape' && archiveOpen) {
        setArchiveOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [archiveOpen])

  // Archive modal focus management
  useEffect(() => {
    if (archiveOpen) {
      // Store previous focus
      previousFocusRef.current = document.activeElement as HTMLElement
      // Focus search input after modal opens
      setTimeout(() => archiveSearchRef.current?.focus(), 100)
    } else if (previousFocusRef.current) {
      // Restore focus when modal closes
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [archiveOpen])

  // Focus trap for archive modal
  useEffect(() => {
    if (!archiveOpen) return

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !archiveModalRef.current) return

      const focusableElements = archiveModalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleTabKey)
    return () => window.removeEventListener('keydown', handleTabKey)
  }, [archiveOpen])

  const filteredQuests = useMemo(() => {
    let result = quests

    // Bookmark filter
    if (showBookmarksOnly) {
      const bookmarkSet = new Set(bookmarks.map(b => `${b.chain}-${b.id}`))
      result = result.filter(q => bookmarkSet.has(`${q.chain}-${q.id}`))
    }

    return result.filter((quest) => {
      if (chainFilter !== 'all' && quest.chain !== chainFilter) return false
      if (typeFilter === 'social' && quest.category !== 'social') return false
      if (typeFilter === 'onchain' && quest.category !== 'onchain') return false
      if (rewardFilter === 'points' && quest.rewardToken) return false
      if (rewardFilter === 'token' && !quest.rewardToken) return false

      if (debouncedSearchTerm.trim()) {
        const needle = debouncedSearchTerm.trim().toLowerCase()
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
  }, [quests, chainFilter, typeFilter, rewardFilter, debouncedSearchTerm, showBookmarksOnly, bookmarks])

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
    const needle = debouncedArchiveSearch.trim().toLowerCase()
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
  }, [archive, debouncedArchiveSearch])

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pb-24 pt-16 sm:px-8 lg:px-10">
      <section className="relative overflow-hidden pixel-card px-6 py-10 sm:px-10 sm:py-12">
        <span className="quest-hero-orbit" aria-hidden />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="quest-tag quest-tag--accent">
              <TimeEmoji className="text-base" /> Gmeow Missions
            </span>
            <div className="theme-shell-label flex flex-wrap items-center gap-3 text-sm uppercase tracking-[0.3em]">
              <span aria-live="polite" aria-atomic="true">
                {syncLabel}
              </span>
              <Button
                type="button"
                size="sm"
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
          {/* Creator CTA Section */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground mb-1">
                Create Your Own Quest
              </h2>
              <p className="text-sm text-muted-foreground">
                Design custom missions, set rewards, and engage your community with on-chain quests.
              </p>
            </div>
            <Link
              href="/Quest/creator"
              className={cn(
                buttonVariants({ size: 'sm', variant: 'default' }),
                'whitespace-nowrap min-h-[44px] px-6 gap-2'
              )}
            >
              <span>🎯</span>
              Quest Creator
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="theme-shell-label text-[10px] uppercase tracking-[0.3em]" id="type-filter-label">
              Mission type
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="type-filter-label">
              {TYPE_FILTERS.map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={typeFilter === key ? 'default' : 'ghost'}
                  color={typeFilter === key ? 'primary' : 'gray'}
                  className="px-5 min-h-[44px]"
                  onClick={() => setTypeFilter(key)}
                  onKeyDown={(e) => handleFilterKeyDown(e, 'type', key)}
                  aria-pressed={typeFilter === key}
                  data-filter-type="type"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="theme-shell-label text-[10px] uppercase tracking-[0.3em]" id="reward-filter-label">
            Reward
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="reward-filter-label">
            {REWARD_FILTERS.map(({ key, label }) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={rewardFilter === key ? 'default' : 'ghost'}
                color={rewardFilter === key ? (key === 'token' ? 'warning' : 'primary') : 'gray'}
                className="px-5 min-h-[44px]"
                onClick={() => setRewardFilter(key)}
                onKeyDown={(e) => handleFilterKeyDown(e, 'reward', key)}
                aria-pressed={rewardFilter === key}
                data-filter-type="reward"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="theme-shell-label text-[10px] uppercase tracking-[0.3em]" htmlFor="quest-search">
            Search <span className="text-[9px] opacity-60">(Press / to focus)</span>
          </label>
          <input
            ref={searchInputRef}
            id="quest-search"
            placeholder="Name, chain, token, type"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pixel-input"
            aria-describedby="quest-search-help"
          />
          <span id="quest-search-help" className="sr-only">
            Search across quest names, blockchain networks, reward tokens, and quest types. Results update as you type.
          </span>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {filteredQuests.length > 0 ? `${filteredQuests.length} quest${filteredQuests.length === 1 ? '' : 's'} found` : searchTerm.trim() ? 'No quests match your search' : ''}
          </div>
        </div>
      </section>

      <section className="min-h-[280px]">
        {showSkeleton ? (
          <QuestLoadingDeck />
        ) : filteredQuests.length ? (
          <VirtualQuestGrid quests={filteredQuests} featuredKeys={featuredKeys} />
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
                <Button type="button" size="sm" variant="ghost" color="gray" onClick={handleResetFilters}>
                  Reset filters
                </Button>
                <Link className={cn(buttonVariants({ size: 'sm' }), 'px-5')} href="/Quest/creator">
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
            ref={archiveModalRef}
            className="quest-archive"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quest-archive-title"
            aria-describedby="quest-archive-description"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="quest-archive__header">
              <div className="quest-archive__header-meta">
                <span id="quest-archive-title" className="quest-tag quest-tag--info">Quest archive</span>
                <p id="quest-archive-description" className="quest-archive__subtitle">Browse retired missions and revisit their highlights.</p>
              </div>
              <button 
                type="button" 
                className="quest-archive__close" 
                onClick={() => setArchiveOpen(false)}
                aria-label="Close quest archive modal"
              >
                Close
              </button>
            </header>
            <div className="quest-archive__controls">
              <label className="quest-archive__label" htmlFor="quest-archive-search">
                Search archive
              </label>
              <input
                ref={archiveSearchRef}
                id="quest-archive-search"
                className="quest-archive__search"
                placeholder="Name, chain, reward, streak"
                value={archiveSearchTerm}
                onChange={(event) => setArchiveSearchTerm(event.target.value)}
                aria-describedby="archive-search-help"
              />
              <span id="archive-search-help" className="sr-only">
                Search through retired quests by name, blockchain, reward type, or streak requirement.
              </span>
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {archiveResults.length > 0 ? `${archiveResults.length} archived quest${archiveResults.length === 1 ? '' : 's'} found` : archiveSearchTerm.trim() ? 'No archived quests match your search' : ''}
              </div>
            </div>
            <VirtualArchiveList results={archiveResults} />
          </div>
        </div>
      ) : null}

      {/* Mobile FAB for quick actions */}
      <QuestFAB
        onRefresh={handleRefresh}
        onScrollTop={handleScrollTop}
        onArchive={() => setArchiveOpen(true)}
        onBookmarks={handleBookmarkToggle}
        isRefreshing={isSyncing}
        bookmarkCount={bookmarkCount}
        showBookmarkFilter={showBookmarksOnly}
      />
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

// Virtual scrolling component for quest grid
function VirtualQuestGrid({
  quests,
  featuredKeys,
}: {
  quests: QuestSummary[]
  featuredKeys: Set<string>
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  // Only virtualize if we have 20+ quests
  const shouldVirtualize = quests.length >= 20
  
  // Calculate columns based on screen size
  const getColumnCount = () => {
    if (typeof window === 'undefined') return 3
    if (window.innerWidth < 640) return 1 // mobile
    if (window.innerWidth < 1280) return 2 // tablet
    return 3 // desktop
  }
  
  const [columnCount, setColumnCount] = useState(getColumnCount)
  
  useEffect(() => {
    const handleResize = () => setColumnCount(getColumnCount())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  const rowCount = Math.ceil(quests.length / columnCount)
  
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 420, // Estimated quest card height + gap
    overscan: 2,
    enabled: shouldVirtualize,
  })
  
  if (!shouldVirtualize) {
    // Regular grid for small lists
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {quests.map((quest, questIndex) => {
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
    )
  }
  
  // Virtualized grid for large lists
  const items = virtualizer.getVirtualItems()
  
  return (
    <div ref={parentRef} style={{ height: '50rem', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount
          const rowQuests = quests.slice(startIndex, startIndex + columnCount)
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {rowQuests.map((quest, colIndex) => {
                  const questIndex = startIndex + colIndex
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Virtual scrolling component for archive modal
function VirtualArchiveList({ results }: { results: QuestArchiveEntry[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  // Only virtualize if we have 20+ archived quests
  const shouldVirtualize = results.length >= 20
  
  // Always call the hook (React Hooks rules)
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated archive item height
    overscan: 3,
    enabled: shouldVirtualize, // Control virtualization behavior
  })
  
  if (!shouldVirtualize) {
    // Regular list for small archives
    if (!results.length) {
      return (
        <div className="quest-archive__list">
          <div className="quest-archive__empty">
            <span className="quest-tag quest-tag--info">Archive empty</span>
            <p className="quest-archive__empty-copy">
              Once missions retire they will appear here with their final stats. Launch a quest to seed the archive.
            </p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="quest-archive__list">
        {results.map((entry) => (
          <ArchiveItem key={`${entry.chain}-${entry.id}`} entry={entry} />
        ))}
      </div>
    )
  }
  
  // Virtualized list for large archives
  const items = virtualizer.getVirtualItems()
  
  return (
    <div ref={parentRef} className="quest-archive__list" style={{ height: '31.25rem', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const entry = results[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ArchiveItem entry={entry} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Archive item component
function ArchiveItem({ entry }: { entry: QuestArchiveEntry }) {
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
    <article className="quest-archive__item">
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
}

