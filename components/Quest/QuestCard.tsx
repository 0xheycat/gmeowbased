"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
// Note: Some helper functions are preserved for future use even if not currently used in Yu-Gi-Oh card design

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import { ChainIcon } from '@/components/Quest/QuestChainBadge'
import { isBookmarked, toggleBookmark } from '@/lib/quest-bookmarks'
import type { RewardAssetInfo, RewardDetail } from '@/components/Quest/QuestRewardCapsule'
import type { ChainKey, QuestTypeKey } from '@/lib/gmeow-utils'
import { buildFrameShareUrl, openWarpcastComposer } from '@/lib/share'
import {
  fetchCastByIdentifier,
  fetchUserByAddress,
  fetchUserByFid,
  fetchUserByUsername,
  type FarcasterUser,
} from '@/lib/neynar'

type QuestCardStyle = CSSProperties & {
  '--quest-card-index'?: number
  '--quest-card-accent'?: string
  '--quest-card-image'?: string
}
type SocialReactions = {
  likes: number | null
  recasts: number | null
  replies: number | null
}

type CreatorIdentity = {
  avatar: string | null
  label: string | null
  handle: string | null
  fid: number | null
  href: string | null
}

type CastPreview = {
  author: string
  snippet: string
  handle?: string | null
  href?: string | null
  hash?: string | null
  username?: string | null
  sourceKey?: string
}

type TargetProfilePreview = {
  displayName: string | null
  handle: string | null
  avatar: string | null
  fid: number | null
  bio: string | null
  href: string | null
  sourceKey?: string
}

type TargetLookup = {
  key: string
  username?: string | null
  fid?: number | null
  address?: string | null
}

type CastLookup = {
  key: string
  identifier: string
  type: 'url' | 'hash'
}

const targetProfileCache = new Map<string, TargetProfilePreview | null>()
const castPreviewCache = new Map<string, CastPreview | null>()

export type QuestCardData = {
  id: number
  chain: ChainKey
  chainLabel: string
  questTypeCode?: number | null
  questTypeKey: QuestTypeKey | null
  category?: string | null
  name: string
  instructions?: string | null
  rewardPoints: number
  rewardToken: string | null
  rewardTokenPerUser: number | null
  maxCompletions?: number | null
  expiresAt: number
  meta?: Record<string, any> | null
  completions?: number | null
  completionTarget?: number | null
  completionPercent?: number | null
  progressBarPercent?: number | null
  progressLabel?: string | null
  streakCount?: number | null
  streakLabel?: string | null
  lastCompletedAt?: number | null
  rewardTokenSymbol?: string | null
}

type QuestCardProps = {
  quest: QuestCardData
  index: number
  featured?: boolean
}

export function QuestCard({ quest, index, featured = false }: QuestCardProps) {
  const tier = getQuestTier(quest, featured)
  const questSerial = formatQuestSerial(quest.id)
  const castLookup = useMemo(() => deriveCastLookup(quest), [quest])
  const baseCastPreview = useMemo(() => extractFarcasterPreview(quest), [quest])
  const initialTargetProfile = useMemo(() => extractTargetProfile(quest), [quest])
  const targetLookup = useMemo(() => deriveTargetLookup(quest), [quest])
  const [fetchedCastPreview, setFetchedCastPreview] = useState<CastPreview | null>(null)
  const [targetProfile, setTargetProfile] = useState<TargetProfilePreview | null>(initialTargetProfile)
  const [bookmarked, setBookmarked] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Check bookmark status on mount
  useEffect(() => {
    setBookmarked(isBookmarked(quest.chain, quest.id))
  }, [quest.chain, quest.id])

  // Handle bookmark toggle
  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleBookmark(quest.chain, quest.id, quest.name || 'Unnamed Quest')
    setBookmarked(!bookmarked)
    
    // Dispatch custom event for quest page to refresh
    window.dispatchEvent(new CustomEvent('quest-bookmark-changed'))
  }

  // Handle copy URL
  // const handleCopyUrl = async (e: React.MouseEvent) => {
  //   e.preventDefault()
  //   e.stopPropagation()
    
  //   try {
  //     await navigator.clipboard.writeText(questUrl)
  //     setCopySuccess(true)
  //     setTimeout(() => setCopySuccess(false), 2000)
  //   } catch (err) {
  //     console.error('Failed to copy URL:', err)
  //   }
  // }

  const castLookupKey = castLookup?.key ?? null
  const targetLookupKey = targetLookup?.key ?? null
  const inFlightCastKeys = useRef<Set<string>>(new Set())
  const inFlightTargetKeys = useRef<Set<string>>(new Set())

  useEffect(() => {
    setTargetProfile((prev) => mergeTargetProfiles(initialTargetProfile, prev))
  }, [initialTargetProfile])

  useEffect(() => {
    setFetchedCastPreview(null)
  }, [castLookupKey])

  useEffect(() => {
    if (!targetLookupKey) return
    if (!needsTargetProfileEnrichment(targetProfile)) return
    if (targetProfile?.sourceKey && targetProfile.sourceKey === targetLookupKey && !needsTargetProfileEnrichment(targetProfile)) return

    const cached = targetProfileCache.get(targetLookupKey)
    if (cached !== undefined) {
      setTargetProfile((prev) => mergeTargetProfiles(cached, prev))
      return
    }

    const targetKeySet = inFlightTargetKeys.current
    if (targetKeySet.has(targetLookupKey)) return
    targetKeySet.add(targetLookupKey)

    let cancelled = false
    ;(async () => {
      const resolved = await resolveTargetProfile(targetLookup)
      targetKeySet.delete(targetLookupKey)
      if (cancelled) return
      targetProfileCache.set(targetLookupKey, resolved)
      if (resolved) {
        setTargetProfile((prev) => mergeTargetProfiles(resolved, prev))
      }
    })()

    return () => {
      cancelled = true
      targetKeySet.delete(targetLookupKey)
    }
  }, [targetLookup, targetLookupKey, targetProfile])

  useEffect(() => {
    if (!castLookup) return
    if (baseCastPreview) return

    const key = castLookup.key
    const cached = castPreviewCache.get(key)
    if (cached !== undefined) {
      setFetchedCastPreview(cached)
      return
    }

    const castKeySet = inFlightCastKeys.current
    if (castKeySet.has(key)) return
    castKeySet.add(key)

    let cancelled = false
    ;(async () => {
      const resolved = await resolveCastPreview(castLookup)
      castKeySet.delete(key)
      if (cancelled) return
      castPreviewCache.set(key, resolved)
      setFetchedCastPreview(resolved)
    })()

    return () => {
      cancelled = true
      castKeySet.delete(key)
    }
  }, [baseCastPreview, castLookup])

  // Note: castPreview kept for potential future use
  // const castPreview = useMemo(
  //   () => mergeCastPreview(baseCastPreview, fetchedCastPreview, targetProfile),
  //   [baseCastPreview, fetchedCastPreview, targetProfile],
  // )

  const rewardTokenSymbol = extractRewardTokenSymbol(quest)
  const rewardAsset = useMemo(() => extractRewardAsset(quest, rewardTokenSymbol), [quest, rewardTokenSymbol])
  const rewardTypeLabel = deriveRewardTypeLabel(quest, rewardAsset, rewardTokenSymbol)
  const creatorIdentity = extractCreatorIdentity(quest)
  const backgroundImage = extractBackgroundImage(quest)
  const themeAccent = extractThemeColor(quest)
  const description = extractQuestDescription(quest)
  const questTypeLabel = deriveQuestTypeLabel(quest)
  const channel = extractNeynarChannel(quest)
  const participantsCount = coerceNumber(quest.completions)
  const participantsValue = participantsCount !== null ? formatNumber(participantsCount) : '—'
  const completionTarget = coerceNumber(quest.completionTarget)
  const questUrl = deriveQuestUrl(quest)
  const rawShareUrl = deriveShareUrl(quest, questUrl)
  const shareLink = rawShareUrl && rawShareUrl !== questUrl ? rawShareUrl : null
  const expiresLabel = quest.expiresAt ? formatExpiryCountdown(quest.expiresAt) : 'No expiry'
  const normalizedDescription = description ? description.trim().toLowerCase() : null
  const normalizedReward = rewardTypeLabel ? rewardTypeLabel.trim().toLowerCase() : null
  const primaryNarrative = description ?? rewardTypeLabel
  const secondaryNarrative =
    description && rewardTypeLabel && normalizedDescription !== normalizedReward ? rewardTypeLabel : null

  const style: QuestCardStyle = { '--quest-card-index': index }
  if (themeAccent) style['--quest-card-accent'] = themeAccent
  if (backgroundImage) style['--quest-card-image'] = backgroundImage

  // Derive reward display value (ATK-style)
  const rewardDisplay = quest.rewardPoints > 0
    ? `${formatNumber(quest.rewardPoints)} PTS`
    : quest.rewardTokenPerUser && quest.rewardTokenPerUser > 0
    ? `${formatNumber(quest.rewardTokenPerUser)} ${rewardTokenSymbol || 'TOKEN'}`
    : rewardTypeLabel || 'REWARD'

  // Derive quest mode for type bar
  const questMode = questTypeLabel?.toLowerCase().includes('farcaster') ? 'SOCIAL QUEST' : 'ONCHAIN QUEST'

  return (
    <article className="glass-card relative overflow-hidden hover:shadow-lg transition-shadow" data-tier={tier}>
      {/* Header: Title + Serial + Bookmark */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate" title={quest.name}>
            {quest.name}
          </h3>
          <span className="text-xs text-gray-500">{questSerial}</span>
        </div>
        <button
          type="button"
          onClick={handleBookmarkToggle}
          className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? '🔖' : '🔗'}
        </button>
      </div>

      {/* Chain + Tier */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <ChainIcon 
            chain={quest.chain} 
            label={quest.chainLabel} 
            size={24}
          />
          <span className="text-sm font-medium">{quest.chainLabel}</span>
        </div>
        <div className="flex gap-0.5 text-yellow-500">
          {Array.from({ length: Math.min(getTierLevel(tier), 5) }, (_, i) => (
            <span key={i} className="text-xs">★</span>
          ))}
        </div>
      </div>

      {/* Image */}
      {backgroundImage ? (
        <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
          {imageLoading && (
            <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
          )}
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">
              🎴
            </div>
          ) : (
            <Image 
              src={backgroundImage} 
              alt={quest.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
              style={{ opacity: imageLoading ? 0 : 1 }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false)
                setImageError(true)
              }}
            />
          )}
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
          <div className="text-center">
            <span className="text-4xl">⚔️</span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {quest.chainLabel} · {questTypeLabel}
            </p>
          </div>
        </div>
      )}

      {/* Quest Type Badge */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
        <span className="badge-base text-xs">
          [{questMode}] {questTypeLabel || 'QUEST'}
        </span>
      </div>

      {/* Description */}
      <div className="p-4 space-y-3">
        {primaryNarrative ? (
          <div>
            {secondaryNarrative && (
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {primaryNarrative}
              </p>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {secondaryNarrative || primaryNarrative}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Complete this quest to earn rewards and progress in your adventure.
          </p>
        )}
        
        <div className="text-xs text-gray-500 space-y-1">
          {channel?.name && (
            <div>• Channel: #{channel.name}</div>
          )}
          {creatorIdentity?.label && (
            <div>• Creator: {creatorIdentity.label}</div>
          )}
          <div>• Expiry: {expiresLabel}</div>
          {completionTarget && completionTarget > 0 && (
            <div>• Cap: {formatNumber(completionTarget)} pilots</div>
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <div className="text-xs text-gray-500 uppercase">Reward</div>
          <div className="badge-success text-sm font-bold">{rewardDisplay}</div>
        </div>
        <div className="flex-1 text-right">
          <div className="text-xs text-gray-500 uppercase">Pilots</div>
          <div className="text-sm font-semibold">{participantsValue}</div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center border-t border-gray-200 dark:border-gray-700">
        {shareLink ? (
          <button
            onClick={async () => {
              const questName = quest.name || `Quest #${quest.id}`
              const composeText = `⚔️ Join me on "${questName}"! @gmeowbased`
              await openWarpcastComposer(composeText, shareLink)
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
            aria-label="Share frame on Warpcast"
          >
            <span>📤</span>
            <span>Share Frame</span>
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 py-3 opacity-50 text-sm">
            <span>📤</span>
            <span>Frame N/A</span>
          </div>
        )}
        
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
        
        <Link 
          href={questUrl} 
          target="_blank" 
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
          aria-label={`View ${quest.name || 'quest'} details and progress`}
        >
          <span>Quest Details</span>
          <span>↗</span>
        </Link>
      </div>
    </article>
  )
}

// Helper function to get tier level (for stars)
function getTierLevel(tier: string): number {
  switch (tier.toLowerCase()) {
    case 'common': return 1
    case 'rare': return 3
    case 'epic': return 4
    case 'legendary': return 5
    default: return 2
  }
}

// CreatorPlate and TargetPreviewCard removed for Yu-Gi-Oh card redesign
// These components are kept commented out for potential future use

// function CreatorPlate({ identity }: { identity: CreatorIdentity }) {
//   ... (original code preserved)
// }

// function TargetPreviewCard({ profile }: { profile: TargetProfilePreview }) {
//   ... (original code preserved)
// }

function formatQuestSerial(id: number): string {
  if (!Number.isFinite(id) || id <= 0) return '#000'
  return `#${id.toString().padStart(3, '0')}`
}

function getQuestTier(quest: QuestCardData, featured: boolean): 'common' | 'rare' | 'epic' | 'legendary' {
  // Calculate total reward value
  let totalRewardValue = quest.rewardPoints || 0
  
  // Add token value if present (assume token per user as additional points equivalent)
  if (quest.rewardTokenPerUser && quest.rewardTokenPerUser > 0) {
    // Weight token rewards higher (e.g., 1 token = 1000 points equivalent)
    totalRewardValue += quest.rewardTokenPerUser * 1000
  }
  
  // Tier thresholds based on reward value ONLY
  // Legendary: 10,000+ points
  if (totalRewardValue >= 10000) return 'legendary'
  
  // Epic: 1,000 - 9,999 points
  if (totalRewardValue >= 1000) return 'epic'
  
  // Rare: 100 - 999 points
  if (totalRewardValue >= 100) return 'rare'
  
  // Common: < 100 points
  return 'common'
}

function isExpiringSoon(expiresAt: number) {
  if (!expiresAt) return false
  return expiresAt * 1000 - Date.now() < 86_400_000
}

function isFarcasterPremium(type: QuestTypeKey | null) {
  return type === 'FARCASTER_VERIFIED_USER' || type === 'FARCASTER_CHANNEL_POST' || type === 'FARCASTER_FRAME_INTERACT'
}



function deriveRewardTypeLabel(
  quest: QuestCardData,
  rewardAsset: RewardAssetInfo | null,
  rewardTokenSymbol: string | null,
): string {
  if (rewardAsset) {
    if (rewardAsset.type === 'points') return 'Points'
    if (rewardAsset.type === 'token') return rewardAsset.label || rewardTokenSymbol || 'Token'
    if (rewardAsset.type === 'nft') {
      const base = rewardAsset.label || rewardAsset.collectionName || rewardTokenSymbol || 'NFT'
      return base.toLowerCase().includes('nft') ? base : `${base} NFT`
    }
    if (rewardAsset.label) return rewardAsset.label
  }

  if (quest.rewardToken || rewardTokenSymbol) {
    return rewardTokenSymbol ? `${rewardTokenSymbol} token` : 'Token reward'
  }
  if (quest.rewardPoints > 0) {
    return 'Points'
  }
  return 'Reward pending'
}

function deriveQuestUrl(quest: QuestCardData): string {
  const meta = quest.meta ?? null
  const candidate =
    coerceString(meta?.url) ??
    coerceString(meta?.questUrl) ??
    coerceString(meta?.links?.quest) ??
    coerceString(meta?.links?.details)
  if (candidate) return candidate
  return `/Quest/${quest.chain}/${quest.id}`
}

function deriveShareUrl(quest: QuestCardData, questUrl: string): string {
  const meta = quest.meta ?? null
  const candidate =
    coerceString(meta?.shareUrl) ??
    coerceString(meta?.share?.url) ??
    coerceString(meta?.frame?.shareUrl) ??
    coerceString(meta?.frameUrl) ??
    coerceString(meta?.frame?.url) ??
    coerceString(meta?.links?.share)
  if (candidate) return candidate
  const built = buildFrameShareUrl({ type: 'quest', chain: quest.chain, questId: quest.id })
  return built || questUrl
}

function deriveUpdatedAgo(quest: QuestCardData): string | null {
  const meta = quest.meta ?? null
  const candidate =
    coerceTimestamp(meta?.updatedAt) ??
    coerceTimestamp(meta?.lastUpdated) ??
    coerceTimestamp(meta?.refreshedAt) ??
    coerceTimestamp(meta?.user?.lastInteractionAt) ??
    coerceTimestamp(meta?.user?.lastCompletedAt) ??
    coerceTimestamp(quest.lastCompletedAt)
  if (!candidate) return null
  return formatRelativeTimeShort(candidate)
}

function coerceTimestamp(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1_000_000_000_000 ? value : value * 1000
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) {
      return numeric > 1_000_000_000_000 ? numeric : numeric * 1000
    }
    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

function coerceString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return null
}

function extractThemeColor(quest: QuestCardData): string | null {
  const meta = quest.meta
  const theme = typeof meta?.theme === 'object' && meta?.theme ? (meta.theme as Record<string, any>) : null
  const color = theme?.accent || theme?.color || meta?.themeColor
  if (typeof color === 'string' && color.trim().length) return color
  return null
}

function extractBackgroundImage(quest: QuestCardData): string | null {
  const image = quest.meta?.image || quest.meta?.heroImage
  const value = coerceString(image)
  if (!value) return null
  return value.startsWith('url(') ? value : `url(${value})`
}

function extractCreatorLabel(quest: QuestCardData): string | null {
  const meta = quest.meta
  if (!meta) return null
  const neynarCreator = (meta.neynar?.creator ?? meta.neynar?.cast?.author ?? null) as Record<string, any> | null
  if (typeof neynarCreator?.displayName === 'string' && neynarCreator.displayName.trim().length)
    return neynarCreator.displayName.trim()
  if (typeof neynarCreator?.name === 'string' && neynarCreator.name.trim().length) return neynarCreator.name.trim()
  if (typeof meta.creatorName === 'string' && meta.creatorName.trim().length) return meta.creatorName
  if (typeof meta.creator === 'string' && meta.creator.trim().length) return meta.creator
  if (typeof meta.creator?.name === 'string' && meta.creator.name.trim().length) return meta.creator.name
  if (typeof meta.creator?.displayName === 'string' && meta.creator.displayName.trim().length) return meta.creator.displayName
  if (typeof meta.creatorAddress === 'string') return shortenAddress(meta.creatorAddress)
  return null
}

function extractCreatorAvatar(quest: QuestCardData): string | null {
  const meta = quest.meta ?? null
  if (!meta) return null

  const creator = (meta.creator ?? null) as Record<string, any> | null
  const candidates: unknown[] = [
    meta.creatorAvatar,
    meta.creatorAvatarUrl,
    meta.creatorPfp,
    meta.creatorImage,
    meta.creatorPhoto,
    meta.creatorProfileImage,
    creator?.avatar,
    creator?.avatarUrl,
    creator?.pfp,
    creator?.pfpUrl,
    creator?.image,
    creator?.photo,
    meta.neynar?.creator?.avatar,
    meta.neynar?.creator?.pfp,
    meta.farcasterCast?.author?.pfp?.url,
    meta.farcasterCast?.author?.pfp?.url_small,
    meta.farcasterCast?.author?.pfp_url,
    meta.farcasterCast?.author?.pfpUrl,
    meta.cast?.author?.pfp?.url,
    meta.cast?.author?.pfp?.url_small,
    meta.cast?.author?.pfp_url,
    meta.cast?.author?.pfpUrl,
  ]

  for (const candidate of candidates) {
    const url = coerceImageUrl(candidate)
    if (url) return url
  }

  return null
}

function extractCreatorProfileUrl(quest: QuestCardData): string | null {
  const meta = quest.meta ?? null
  if (!meta) return null
  const creator = (meta.creator ?? null) as Record<string, any> | null
  const neynarCreator = (meta.neynar?.creator ?? meta.neynar?.cast?.author ?? null) as Record<string, any> | null
  return (
    coerceString(meta.creatorProfileUrl) ??
    coerceString(meta.creatorUrl) ??
    coerceString(creator?.profileUrl) ??
    coerceString(creator?.warpcastUrl) ??
    coerceString(creator?.url) ??
    coerceString(neynarCreator?.profileUrl) ??
    coerceString(neynarCreator?.url) ??
    coerceString(meta.links?.creator) ??
    coerceString(meta.links?.profile) ??
    coerceString(meta.farcasterCast?.author?.profileUrl) ??
    coerceString(meta.farcasterCast?.author?.url) ??
    coerceString(meta.cast?.author?.profileUrl) ??
    coerceString(meta.cast?.author?.url)
  )
}

function extractCreatorIdentity(quest: QuestCardData): CreatorIdentity | null {
  const avatar = extractCreatorAvatar(quest)
  const label = extractCreatorLabel(quest)
  const handle = extractCreatorHandle(quest)
  const fid = extractCreatorFid(quest)
  const href = extractCreatorProfileUrl(quest)
  if (!avatar && !label && !handle && fid === null && !href) return null
  return { avatar, label, handle, fid, href }
}

function extractCreatorHandle(quest: QuestCardData): string | null {
  const meta = quest.meta ?? null
  if (!meta) return null
  const creator = (meta.creator ?? null) as Record<string, any> | null
  const neynarCreator = (meta.neynar?.creator ?? meta.neynar?.cast?.author ?? null) as Record<string, any> | null
  const candidate =
    coerceString(meta.creatorHandle) ??
    coerceString(meta.creatorUsername) ??
    coerceString(creator?.handle) ??
    coerceString(creator?.username) ??
    coerceString(meta.farcasterCast?.author?.username) ??
    coerceString(meta.cast?.author?.username) ??
    coerceString(neynarCreator?.username) ??
    coerceString(neynarCreator?.handle)
  if (!candidate) return null
  const sanitized = sanitizeHandle(candidate)
  return sanitized.length > 1 ? sanitized : null
}

function extractCreatorFid(quest: QuestCardData): number | null {
  const meta = quest.meta ?? null
  if (!meta) return null
  const creator = (meta.creator ?? null) as Record<string, any> | null
  const neynarCreator = (meta.neynar?.creator ?? meta.neynar?.cast?.author ?? null) as Record<string, any> | null
  return (
    coerceNumber(meta.creatorFid) ??
    coerceNumber(creator?.fid) ??
    coerceNumber(meta.farcasterCast?.author?.fid) ??
    coerceNumber(meta.cast?.author?.fid) ??
    coerceNumber(neynarCreator?.fid)
  )
}

function sanitizeHandle(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const collapsed = trimmed.replace(/\s+/g, '')
  const withoutAt = collapsed.startsWith('@') ? collapsed.slice(1) : collapsed
  const normalized = withoutAt.toLowerCase()
  return normalized.length ? `@${normalized}` : ''
}

function extractQuestDescription(quest: QuestCardData): string | null {
  const meta = quest.meta ?? null
  const candidates: unknown[] = [
    quest.instructions,
    meta?.instructions,
    meta?.description,
    meta?.summary,
    meta?.story,
    meta?.details,
    meta?.body,
  ]

  for (const candidate of candidates) {
    const value = coerceString(candidate)
    if (value) return value
  }

  return null
}

function deriveQuestTypeLabel(quest: QuestCardData): string | null {
  const meta = quest.meta ?? null
  const candidates: (string | null)[] = [
    coerceString(meta?.typeLabel),
    coerceString(meta?.questTypeLabel),
    coerceString(meta?.category),
    coerceString(quest.category),
  ]

  for (const candidate of candidates) {
    if (candidate) return candidate
  }

  if (quest.questTypeKey) return formatQuestTypeKey(quest.questTypeKey)
  return null
}

function formatQuestTypeKey(key: QuestTypeKey): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ')
}

function extractNeynarChannel(quest: QuestCardData): { name: string; href?: string } | null {
  const meta = quest.meta ?? null
  if (!meta) return null
  const channel = (meta.neynar?.channel ?? meta.neynar?.cast?.channel ?? meta.farcasterCast?.channel ?? meta.cast?.channel ?? null) as Record<string, any> | null
  if (!channel) return null
  const rawName = coerceString(channel?.name) ?? coerceString(channel?.slug) ?? coerceString(channel?.id)
  if (!rawName) return null
  const normalized = rawName.replace(/^#/, '')
  const safeName = normalized.replace(/[^a-z0-9_-]/gi, '')
  const fallbackHref = safeName && /^[a-z0-9_-]+$/i.test(safeName) ? `https://warpcast.com/~/channel/${safeName}` : null
  const href = coerceString(channel?.url) ?? coerceString(channel?.href) ?? fallbackHref ?? undefined
  return { name: normalized, href }
}

function extractSocialReactions(quest: QuestCardData): SocialReactions | null {
  const meta = quest.meta ?? null
  if (!meta) return null

  const sources = [meta.farcasterCast, meta.cast, meta.preview, meta.frame?.cast]
  for (const source of sources) {
    const reactions = extractReactionsFromSource(source)
    if (reactions) return reactions
  }

  return null
}

function extractReactionsFromSource(source: unknown): SocialReactions | null {
  if (!source || typeof source !== 'object') return null
  const data = source as Record<string, any>
  const reactionBuckets = [data.reactions, data.metrics, data.stats, data.counts]

  const likes = coerceNumber(
    data.likes ??
      data.likeCount ??
      data.likesCount ??
      data.totalLikes ??
      data.favorites ??
      reactionBuckets.reduce<number | null>((acc, bucket) => {
        if (acc !== null) return acc
        if (!bucket || typeof bucket !== 'object') return null
        return (
          coerceNumber((bucket as Record<string, any>).likes) ??
          coerceNumber((bucket as Record<string, any>).likeCount) ??
          coerceNumber((bucket as Record<string, any>).likesCount) ??
          coerceNumber((bucket as Record<string, any>).totalLikes)
        )
      }, null),
  )

  const recasts = coerceNumber(
    data.recasts ??
      data.recastCount ??
      data.recastsCount ??
      data.totalRecasts ??
      data.shares ??
      reactionBuckets.reduce<number | null>((acc, bucket) => {
        if (acc !== null) return acc
        if (!bucket || typeof bucket !== 'object') return null
        return (
          coerceNumber((bucket as Record<string, any>).recasts) ??
          coerceNumber((bucket as Record<string, any>).recastCount) ??
          coerceNumber((bucket as Record<string, any>).recastsCount) ??
          coerceNumber((bucket as Record<string, any>).shares)
        )
      }, null),
  )

  const replies = coerceNumber(
    data.replies ??
      data.replyCount ??
      data.repliesCount ??
      data.comments ??
      data.commentsCount ??
      reactionBuckets.reduce<number | null>((acc, bucket) => {
        if (acc !== null) return acc
        if (!bucket || typeof bucket !== 'object') return null
        return (
          coerceNumber((bucket as Record<string, any>).replies) ??
          coerceNumber((bucket as Record<string, any>).replyCount) ??
          coerceNumber((bucket as Record<string, any>).repliesCount) ??
          coerceNumber((bucket as Record<string, any>).comments)
        )
      }, null),
  )

  if (likes === null && recasts === null && replies === null) return null
  return { likes, recasts, replies }
}

function extractFarcasterPreview(quest: QuestCardData): { author: string; snippet: string; handle?: string | null; href?: string } | null {
  const meta = quest.meta ?? null
  if (!meta) return null

  const previewSources: Array<Record<string, any> | null | undefined> = [
    meta.neynar?.cast,
    meta.neynar?.primaryCast,
    meta.farcasterCast,
    meta.cast,
  ]

  let preview: Record<string, any> | null = null
  for (const candidate of previewSources) {
    if (candidate && typeof candidate === 'object') {
      preview = candidate as Record<string, any>
      break
    }
  }
  if (!preview) return null

  const snippetCandidate =
    coerceString(preview.text) ??
    coerceString(preview.body) ??
    coerceString(preview.snippet) ??
    null
  if (!snippetCandidate) return null

  const authorSource = preview.author ?? meta.neynar?.creator ?? null
  const authorLabel =
    coerceString(authorSource?.displayName) ??
    coerceString(authorSource?.name) ??
    coerceString(authorSource?.username) ??
    'Warpcast'
  const rawHandle = coerceString(authorSource?.username) ?? coerceString(authorSource?.handle)
  const normalizedHandle = rawHandle ? sanitizeHandle(rawHandle) : ''
  const hash = coerceString(preview.hash) ?? coerceString(preview.castHash)
  const href =
    coerceString(preview.url) ??
    coerceString(meta.farcasterCastUrl) ??
    (hash && /^[0-9a-fx]+$/i.test(hash) ? `https://warpcast.com/~/conversations/${hash}` : undefined)

  return { author: authorLabel, snippet: snippetCandidate, handle: normalizedHandle || null, href }
}

function deriveCastLookup(quest: QuestCardData): CastLookup | null {
  const meta = quest.meta ?? null
  if (!meta) return null

  const nestedSources = [meta.cast, meta.farcasterCast, meta.neynar?.cast, meta.neynar?.primaryCast, meta.frame?.cast]
  const urlCandidates: unknown[] = [
    meta.castUrl,
    meta.castURL,
    meta.cast_url,
    meta.castLink,
    meta.links?.cast,
    meta.links?.warpcast,
    meta.links?.castUrl,
    meta.links?.details,
    meta.farcasterCastUrl,
    meta.share?.castUrl,
    meta.share?.url,
    meta.frameCastUrl,
    meta.frameUrl,
  ]

  for (const source of nestedSources) {
    if (source && typeof source === 'object') {
      const record = source as Record<string, any>
      urlCandidates.push(record.url, record.permanent_url, record.permalink, record.cast_url)
    }
  }

  const url = selectString(urlCandidates, (value) => /^https?:/i.test(value))
  if (url) return { key: `url:${url}`, identifier: url, type: 'url' }

  const hashCandidates: unknown[] = [
    meta.castHash,
    meta.castId,
    meta.castIdentifier,
    meta.identifier,
    meta.preview?.castHash,
    meta.cast?.hash,
    meta.cast?.hash_v1,
    meta.cast?.thread_hash,
    meta.farcasterCast?.hash,
    meta.farcasterCast?.hash_v1,
    meta.neynar?.cast?.hash,
    meta.neynar?.primaryCast?.hash,
    meta.frame?.cast?.hash,
  ]

  const hash = selectHash(hashCandidates)
  if (hash) {
    return { key: `hash:${hash.toLowerCase()}`, identifier: hash, type: 'hash' }
  }

  const identifier = selectString([meta.castIdentifier, meta.castId, meta.identifier])
  if (identifier) {
    if (/^https?:/i.test(identifier)) return { key: `url:${identifier}`, identifier, type: 'url' }
    const normalized = selectHash([identifier])
    if (normalized) return { key: `hash:${normalized.toLowerCase()}`, identifier: normalized, type: 'hash' }
  }

  return null
}

function deriveTargetLookup(quest: QuestCardData): TargetLookup | null {
  const meta = quest.meta ?? null
  if (!meta) return null
  const follow = typeof meta.follow === 'object' && meta.follow ? (meta.follow as Record<string, any>) : null

  const handle = selectHandle([
    meta.targetUsername,
    meta.targetHandle,
    meta.targetUser,
    meta.target,
    meta.mentionUser,
    follow?.targetUsername,
    follow?.username,
    follow?.target,
    meta.cast?.author?.username,
    meta.farcasterCast?.author?.username,
    meta.neynar?.target?.username,
    meta.neynar?.cast?.author?.username,
  ])

  if (handle) {
    const normalized = handle.replace(/^@/, '').toLowerCase()
    return { key: `username:${normalized}`, username: normalized }
  }

  const fid = selectFid([
    meta.targetFid,
    typeof meta.target === 'object' ? (meta.target as Record<string, any>)?.fid : meta.target,
    follow?.targetFid,
    follow?.fid,
    meta.cast?.author?.fid,
    meta.farcasterCast?.author?.fid,
    meta.neynar?.target?.fid,
  ])

  if (fid) {
    return { key: `fid:${fid}`, fid }
  }

  const address = selectAddress([
    meta.targetAddress,
    follow?.targetAddress,
    meta.address,
    meta.walletAddress,
    meta.creatorAddress,
    meta.ownerAddress,
  ])

  if (address) {
    const normalized = address.toLowerCase()
    return { key: `address:${normalized}`, address: normalized }
  }

  return null
}

function extractTargetProfile(quest: QuestCardData): TargetProfilePreview | null {
  const meta = quest.meta ?? null
  if (!meta) return null

  const follow = typeof meta.follow === 'object' && meta.follow ? (meta.follow as Record<string, any>) : null
  const targetProfileMeta = typeof meta.targetProfile === 'object' && meta.targetProfile ? (meta.targetProfile as Record<string, any>) : null

  const handle = selectHandle([
    meta.targetUsername,
    meta.targetHandle,
    meta.targetUser,
    meta.target,
    meta.mentionUser,
    follow?.targetUsername,
    follow?.username,
    follow?.target,
    targetProfileMeta?.username,
    meta.cast?.author?.username,
    meta.farcasterCast?.author?.username,
    meta.neynar?.target?.username,
    meta.neynar?.cast?.author?.username,
  ])

  const displayName = selectString([
    meta.targetName,
    meta.targetDisplayName,
    targetProfileMeta?.name,
    targetProfileMeta?.displayName,
    follow?.targetName,
    follow?.displayName,
    meta.neynar?.target?.displayName,
    meta.neynar?.target?.name,
    meta.cast?.author?.displayName,
    meta.cast?.author?.name,
    meta.farcasterCast?.author?.displayName,
    meta.farcasterCast?.author?.name,
  ])

  const fid = selectFid([
    meta.targetFid,
    typeof meta.target === 'object' ? (meta.target as Record<string, any>)?.fid : meta.target,
    targetProfileMeta?.fid,
    follow?.targetFid,
    follow?.fid,
    meta.cast?.author?.fid,
    meta.farcasterCast?.author?.fid,
    meta.neynar?.target?.fid,
  ])

  const avatar = selectImage([
    meta.targetAvatar,
    meta.targetAvatarUrl,
    meta.targetPfp,
    meta.targetImage,
    targetProfileMeta?.avatar,
    targetProfileMeta?.image,
    follow?.targetAvatar,
    follow?.avatar,
    follow?.image,
    meta.neynar?.target?.pfp?.url,
    meta.neynar?.target?.pfp_url,
    meta.cast?.author?.pfp?.url,
    meta.cast?.author?.pfp_url,
    meta.farcasterCast?.author?.pfp?.url,
    meta.farcasterCast?.author?.pfp_url,
  ])

  const bio = selectString([
    meta.targetBio,
    targetProfileMeta?.bio,
    targetProfileMeta?.description,
    follow?.targetBio,
    follow?.bio,
    meta.neynar?.target?.bio?.text,
    meta.neynar?.target?.bio,
    meta.cast?.author?.bio,
    meta.farcasterCast?.author?.bio,
  ])

  const hrefCandidate = selectString(
    [
      meta.targetUrl,
      meta.targetLink,
      targetProfileMeta?.url,
      follow?.url,
      follow?.profileUrl,
      meta.links?.target,
      meta.links?.profile,
    ],
    (value) => /^https?:/i.test(value),
  )

  const href = hrefCandidate ?? buildWarpcastProfileUrl(handle, fid)
  const normalizedBio = bio ? bio.trim() : null

  if (!displayName && !handle && !avatar && fid === null && !normalizedBio && !href) return null

  return {
    displayName: displayName ?? (handle ? handle.replace(/^@/, '') : null),
    handle,
    avatar,
    fid,
    bio: normalizedBio,
    href,
    sourceKey: handle ? `username:${handle.replace(/^@/, '').toLowerCase()}` : fid ? `fid:${fid}` : undefined,
  }
}

function mergeTargetProfiles(next: TargetProfilePreview | null, prev: TargetProfilePreview | null): TargetProfilePreview | null {
  if (!next && !prev) return null
  if (!prev) return next ? { ...next } : null
  if (!next) return prev

  const merged: TargetProfilePreview = { ...prev }
  let updated = false

  if (!merged.displayName && next.displayName) {
    merged.displayName = next.displayName
    updated = true
  }
  if (!merged.handle && next.handle) {
    merged.handle = next.handle
    updated = true
  }
  if (!merged.avatar && next.avatar) {
    merged.avatar = next.avatar
    updated = true
  }
  if ((merged.fid === null || merged.fid === undefined) && next.fid) {
    merged.fid = next.fid
    updated = true
  }
  if (!merged.bio && next.bio) {
    merged.bio = next.bio
    updated = true
  }
  if (!merged.href && next.href) {
    merged.href = next.href
    updated = true
  }
  if (!merged.sourceKey && next.sourceKey) {
    merged.sourceKey = next.sourceKey
    updated = true
  }

  return updated ? merged : prev
}

function needsTargetProfileEnrichment(profile: TargetProfilePreview | null): boolean {
  if (!profile) return true
  const hasName = Boolean(profile.displayName)
  const hasHandle = Boolean(profile.handle)
  const hasAvatar = Boolean(profile.avatar)
  return !(hasName && hasHandle && hasAvatar)
}

function hasRenderableTargetProfile(profile: TargetProfilePreview): boolean {
  return Boolean(profile.displayName || profile.handle || profile.avatar)
}

async function resolveTargetProfile(lookup: TargetLookup | null): Promise<TargetProfilePreview | null> {
  if (!lookup) return null

  try {
    let user: FarcasterUser | null = null

    if (lookup.username) {
      user = await fetchUserByUsername(lookup.username)
    }
    if (!user && lookup.fid) {
      user = await fetchUserByFid(lookup.fid)
    }
    if (!user && lookup.address) {
      user = await fetchUserByAddress(lookup.address)
    }

    if (!user) return null
    return mapUserToTargetProfile(user, lookup.key)
  } catch {
    return null
  }
}

async function resolveCastPreview(lookup: CastLookup | null): Promise<CastPreview | null> {
  if (!lookup) return null
  try {
    const cast = await fetchCastByIdentifier(lookup.identifier, lookup.type)
    if (!cast) return null
    return mapCastToPreview(cast as Record<string, any>, lookup.key)
  } catch {
    return null
  }
}

function mergeCastPreview(
  basePreview: CastPreview | null,
  fetchedPreview: CastPreview | null,
  targetProfile: TargetProfilePreview | null,
): CastPreview | null {
  const source = fetchedPreview ?? basePreview
  if (!source) return null

  const merged: CastPreview = { ...source }

  if (!merged.handle) {
    merged.handle = basePreview?.handle ?? targetProfile?.handle ?? null
  }

  if (!merged.author && targetProfile?.displayName) {
    merged.author = targetProfile.displayName
  }

  if (!merged.href) {
    merged.href =
      basePreview?.href ??
      buildWarpcastCastUrl(merged.handle ?? targetProfile?.handle ?? null, merged.hash ?? basePreview?.hash ?? null) ??
      undefined
  }

  if (!merged.hash) {
    merged.hash = basePreview?.hash ?? null
  }

  if (!merged.username && basePreview?.username) {
    merged.username = basePreview.username
  }

  return merged
}

function mapUserToTargetProfile(user: FarcasterUser, sourceKey?: string): TargetProfilePreview {
  const handle = user.username ? sanitizeHandle(user.username) : null
  const avatar = coerceImageUrl(user.pfpUrl)
  const bio = user.bio ? user.bio.trim() : null

  return {
    displayName: user.displayName?.trim() || null,
    handle,
    avatar,
    fid: Number.isFinite(user.fid) ? user.fid : null,
    bio,
    href: buildWarpcastProfileUrl(handle, user.fid ?? null),
    sourceKey,
  }
}

function mapCastToPreview(cast: Record<string, any>, sourceKey: string): CastPreview | null {
  if (!cast || typeof cast !== 'object') return null
  const snippet =
    coerceString(cast.text) ??
    coerceString(cast.body) ??
    coerceString(cast.snippet) ??
    coerceString(cast.summary) ??
    null
  if (!snippet) return null

  const normalizedSnippet = truncateText(normalizeWhitespace(snippet), 320)
  const rawUsername = coerceString(cast.author?.username)
  const handle = rawUsername ? sanitizeHandle(rawUsername) : null
  const hash = selectHash([cast.hash, cast.hash_v1, cast.thread_hash, cast.parent_hash])
  const url = selectString([cast.url, cast.permanent_url, cast.permalink, cast.cast_url], (value) => /^https?:/i.test(value))
  const authorName =
    coerceString(cast.author?.displayName) ??
    coerceString(cast.author?.name) ??
    (handle ? handle.replace(/^@/, '') : 'Warpcast')
  const href = url ?? buildWarpcastCastUrl(handle, hash)

  return {
    author: authorName,
    snippet: normalizedSnippet,
    handle,
    href: href ?? undefined,
    hash: hash ?? null,
    username: rawUsername ?? (handle ? handle.replace(/^@/, '') : null),
    sourceKey,
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim()
  if (normalized.length <= maxLength) return normalized
  const slicePoint = Math.max(1, maxLength - 1)
  const sliced = normalized.slice(0, slicePoint).trimEnd()
  return `${sliced}…`
}

function buildWarpcastProfileUrl(handle: string | null | undefined, fid: number | null | undefined): string | null {
  if (handle) {
    const normalizedHandle = handle.replace(/^@/, '').trim()
    if (normalizedHandle) return `https://warpcast.com/${normalizedHandle}`
  }
  if (fid && Number.isFinite(fid)) {
    return `https://warpcast.com/~/profiles/${fid}`
  }
  return null
}

function buildWarpcastCastUrl(handle: string | null | undefined, hash: string | null | undefined): string | null {
  if (!hash) return null
  const normalizedHash = hash.toLowerCase().startsWith('0x') ? hash.toLowerCase() : `0x${hash.toLowerCase()}`
  if (handle) {
    const normalizedHandle = handle.replace(/^@/, '').trim()
    if (normalizedHandle) return `https://warpcast.com/${normalizedHandle}/${normalizedHash}`
  }
  return `https://warpcast.com/~/conversations/${normalizedHash}`
}

function selectString(candidates: unknown[], predicate?: (value: string) => boolean): string | null {
  for (const candidate of candidates) {
    const value = coerceString(candidate)
    if (!value) continue
    if (predicate && !predicate(value)) continue
    return value
  }
  return null
}

function selectHandle(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const value = coerceString(candidate)
    if (!value) continue
    const sanitized = sanitizeHandle(value)
    if (sanitized.length > 1) return sanitized
  }
  return null
}

function selectFid(candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = (candidate as Record<string, any>).fid
      const nestedValue = coerceNumber(nested)
      if (nestedValue !== null && nestedValue > 0) return nestedValue
    }
    const numeric = coerceNumber(candidate)
    if (numeric !== null && numeric > 0) return numeric
  }
  return null
}

function selectImage(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const url = coerceImageUrl(candidate)
    if (url) return url
  }
  return null
}

function selectAddress(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const value = coerceString(candidate)
    if (!value) continue
    const normalized = value.trim()
    if (/^0x[0-9a-fA-F]{40,}$/i.test(normalized)) return normalized
  }
  return null
}

function selectHash(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const value = coerceString(candidate)
    if (!value) continue
    const trimmed = value.trim()
    if (/^0x[0-9a-fA-F]{32,}$/i.test(trimmed)) return trimmed
  }
  return null
}

function extractMultiplier(quest: QuestCardData): number | null {
  const reward = quest.meta?.reward
  if (!reward || typeof reward !== 'object') return null
  const raw = reward.multiplier ?? reward.rewardMultiplier ?? quest.meta?.rewardMultiplier
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function extractRewardDetails(quest: QuestCardData): RewardDetail[] | null {
  const reward = quest.meta?.reward
  if (!reward || typeof reward !== 'object') return null

  const source = reward as Record<string, any>
  const details: RewardDetail[] = []

  const pushDetail = (label: string, raw: unknown, options?: { format?: 'timestamp' | 'duration' }) => {
    if (raw === undefined || raw === null) return

    let value: string | null = null

    if (options?.format === 'duration') {
      value = formatDurationValue(raw)
    } else if (options?.format === 'timestamp') {
      value = formatTimestampValue(raw)
    } else if (Array.isArray(raw)) {
      const flattened = raw
        .map((entry) => {
          if (typeof entry === 'string') return entry.trim()
          if (typeof entry === 'number' && Number.isFinite(entry)) return formatNumber(entry)
          if (typeof entry === 'boolean') return entry ? 'Yes' : 'No'
          return ''
        })
        .filter(Boolean)
      if (flattened.length) value = flattened.join(' • ')
    } else if (typeof raw === 'boolean') {
      value = raw ? 'Yes' : 'No'
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      value = formatNumber(raw)
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.length) value = trimmed
    }

    if (!value) return
    if (details.some((detail) => detail.label === label && detail.value === value)) return
    details.push({ label, value })
  }

  const symbol = source.symbol ?? quest.meta?.rewardTokenSymbol
  pushDetail('Symbol', symbol)
  pushDetail('Token', source.name)
  pushDetail('Description', source.description)
  pushDetail('Notes', source.notes ?? source.note)

  const totalPool = source.totalPool ?? source.totalReward ?? source.pool ?? source.prizePool
  pushDetail('Total Pool', totalPool)

  const perUser =
    source.perUser ??
    source.perQuest ??
    source.payoutPerUser ??
    source.rewardPerUser ??
    source.amountPerUser ??
    quest.meta?.rewardPerPilot
  pushDetail('Per Pilot', perUser)

  const perChainCap = source.perChainCap ?? source.perChainLimit ?? source.maxPerChain ?? quest.meta?.rewardPerChainCap
  pushDetail('Per Chain Cap', perChainCap)

  const perPilotCap =
    source.maxPerUser ??
    source.maxPerWallet ??
    source.perWallet ??
    source.perWalletLimit ??
    source.maxClaimsPerUser ??
    quest.meta?.rewardPerPilotCap
  pushDetail('Per Pilot Cap', perPilotCap)

  const globalCap = source.totalCap ?? source.maxClaims ?? source.globalCap ?? quest.meta?.rewardCap
  pushDetail('Global Cap', globalCap)

  const maxWinners = source.maxWinners ?? source.totalWinners ?? source.winners
  pushDetail('Max Winners', maxWinners)

  const eligibility =
    source.eligibility ??
    source.eligibilityText ??
    source.requirementText ??
    quest.meta?.rewardEligibility ??
    quest.meta?.eligibility
  pushDetail('Eligibility', eligibility)

  const requirements = source.requirements ?? source.requirement ?? source.steps ?? quest.meta?.rewardRequirements
  pushDetail('Requirements', requirements)

  const bonus = source.bonusLabel ?? source.bonus ?? source.perk ?? source.benefit
  pushDetail('Bonus', bonus)

  const cooldown = source.cooldownSeconds ?? source.cooldownDuration ?? source.cooldown
  pushDetail('Cooldown', cooldown, { format: 'duration' })

  const claimWindow =
    source.claimWindowSeconds ??
    source.claimWindowDuration ??
    source.claimWindow ??
    source.claimPeriodSeconds
  if (coerceNumber(claimWindow) === null && typeof claimWindow === 'string') {
    pushDetail('Claim Window', claimWindow)
  } else {
    pushDetail('Claim Window', claimWindow, { format: 'duration' })
  }

  const opensAt =
    source.opensAt ??
    source.startsAt ??
    source.startAt ??
    source.startTime ??
    source.start ??
    quest.meta?.rewardStartsAt
  pushDetail('Opens', opensAt, { format: 'timestamp' })

  const closesAt =
    source.endsAt ??
    source.expiresAt ??
    source.endAt ??
    source.endTime ??
    source.end ??
    quest.meta?.rewardEndsAt ??
    quest.meta?.rewardDeadline
  pushDetail('Closes', closesAt, { format: 'timestamp' })

  const regionRestriction = source.region ?? source.regionRestriction ?? source.regionRestrictions
  pushDetail('Region', regionRestriction)

  const verification = source.verificationRequired ?? source.requiresVerification ?? source.kycRequired
  pushDetail('Verification Needed', verification)

  const multiplierValue =
    source.multiplier ??
    source.rewardMultiplier ??
    quest.meta?.rewardMultiplier ??
    quest.meta?.reward?.multiplier
  if (typeof multiplierValue === 'number' && Number.isFinite(multiplierValue) && multiplierValue > 1) {
    details.push({ label: 'Multiplier', value: `x${formatNumber(multiplierValue)}` })
  } else if (typeof multiplierValue === 'string') {
    const trimmed = multiplierValue.trim()
    if (trimmed) {
      details.push({ label: 'Multiplier', value: trimmed.startsWith('x') ? trimmed : `x${trimmed}` })
    }
  }

  if (quest.rewardToken) {
    details.push({ label: 'Token Address', value: shortenAddress(quest.rewardToken) })
  }

  if (!details.length) return null
  return details
}

function formatExpiryCountdown(expiresAt: number): string {
  try {
    const now = Date.now()
    const then = expiresAt * 1000
    const delta = then - now
    if (delta <= 0) return 'Expired'
    const minutes = Math.floor(delta / 60_000)
    if (minutes < 60) return `${minutes}m left`
    const hours = Math.floor(delta / 3_600_000)
    if (hours < 48) return `${hours}h left`
    const days = Math.floor(delta / 86_400_000)
    return `${days}d left`
  } catch {
    return 'No expiry'
  }
}

function formatRelativeTimeShort(timestamp: number): string {
  const delta = Date.now() - timestamp
  if (delta < 60_000) return 'just now'
  if (delta < 3_600_000) {
    const minutes = Math.floor(delta / 60_000)
    return `${minutes}m ago`
  }
  if (delta < 86_400_000) {
    const hours = Math.floor(delta / 3_600_000)
    return `${hours}h ago`
  }
  const days = Math.floor(delta / 86_400_000)
  return `${days}d ago`
}

function shortenAddress(address: string) {
  if (!address.startsWith('0x') || address.length <= 10) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function deriveInitials(label: string | null): string {
  if (!label) return 'GM'
  const trimmed = label.trim()
  if (!trimmed) return 'GM'
  const parts = trimmed.split(/\s+/).slice(0, 2)
  const initials = parts.map((part) => part.charAt(0)).join('')
  return initials.length ? initials.toUpperCase() : 'GM'
}

const numberFormatter = new Intl.NumberFormat('en-US')

function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

function formatDurationValue(value: unknown): string | null {
  const numeric = coerceNumber(value)
  if (numeric !== null) {
    return formatDuration(numeric)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return null
}

function formatTimestampValue(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatTimestamp(value)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed.length) return null
    return formatTimestamp(trimmed) ?? trimmed
  }
  return null
}

function formatDuration(secondsInput: number): string {
  if (!Number.isFinite(secondsInput)) return 'Instant'
  const seconds = Math.abs(Math.round(secondsInput))
  if (seconds === 0) return 'Instant'

  const units = [
    { label: 'd', size: 86_400 },
    { label: 'h', size: 3_600 },
    { label: 'm', size: 60 },
    { label: 's', size: 1 },
  ] as const

  const parts: string[] = []
  let remaining = seconds

  for (const unit of units) {
    if (remaining < unit.size) continue
    const quantity = Math.floor(remaining / unit.size)
    parts.push(`${quantity}${unit.label}`)
    remaining -= quantity * unit.size
    if (parts.length === 2) break
  }

  if (!parts.length) return `${seconds}s`
  return parts.join(' ')
}

function formatTimestamp(raw: number | string): string | null {
  let ms: number | null = null

  if (typeof raw === 'number') {
    ms = raw > 1_000_000_000_000 ? raw : raw * 1000
  } else {
    const numeric = Number(raw)
    if (!Number.isNaN(numeric)) {
      ms = numeric > 1_000_000_000_000 ? numeric : numeric * 1000
    } else {
      const parsed = Date.parse(raw)
      if (!Number.isNaN(parsed)) ms = parsed
    }
  }

  if (ms === null) return null
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  return null
}

function coerceImageUrl(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === 'object') {
    const record = value as Record<string, any>
    return (
      coerceString(record.url) ??
      coerceString(record.src) ??
      coerceString(record.href) ??
      coerceString(record.original) ??
      coerceString(record.small) ??
      coerceString(record.medium)
    )
  }
  return null
}

function extractRewardTokenSymbol(quest: QuestCardData): string | null {
  const metaReward = quest.meta?.reward
  const symbol = (typeof metaReward === 'object' && metaReward ? metaReward.symbol : null) ?? quest.meta?.rewardTokenSymbol
  if (typeof symbol === 'string' && symbol.trim()) return symbol.trim()
  return null
}

function extractRewardAsset(quest: QuestCardData, rewardTokenSymbol: string | null): RewardAssetInfo {
  const meta = (quest.meta ?? null) as Record<string, any> | null
  const rewardMeta = typeof meta?.reward === 'object' && meta?.reward ? (meta.reward as Record<string, any>) : null
  const assetMeta = typeof rewardMeta?.asset === 'object' && rewardMeta?.asset ? (rewardMeta.asset as Record<string, any>) : null
  const tokenMeta = typeof rewardMeta?.token === 'object' && rewardMeta?.token ? (rewardMeta.token as Record<string, any>) : null
  const nftMeta = typeof rewardMeta?.nft === 'object' && rewardMeta?.nft ? (rewardMeta.nft as Record<string, any>) : null
  const prizeMeta = typeof rewardMeta?.prize === 'object' && rewardMeta?.prize ? (rewardMeta.prize as Record<string, any>) : null
  const neynarMeta = typeof meta?.neynar === 'object' && meta?.neynar ? (meta.neynar as Record<string, any>) : null
  const neynarReward = typeof neynarMeta?.reward === 'object' && neynarMeta?.reward ? (neynarMeta.reward as Record<string, any>) : null
  const neynarToken = typeof neynarReward?.token === 'object' && neynarReward?.token ? (neynarReward.token as Record<string, any>) : null
  const neynarNft = typeof neynarReward?.nft === 'object' && neynarReward?.nft ? (neynarReward.nft as Record<string, any>) : null

  const rawType = selectString([
    rewardMeta?.type,
    rewardMeta?.rewardType,
    assetMeta?.type,
    assetMeta?.category,
    tokenMeta?.type,
    nftMeta?.type,
    prizeMeta?.type,
    neynarReward?.type,
    neynarReward?.category,
  ])?.toLowerCase()

  const contractKind = selectString([
    rewardMeta?.tokenStandard,
    rewardMeta?.contractType,
    rewardMeta?.contractKind,
    assetMeta?.standard,
    assetMeta?.tokenStandard,
    assetMeta?.contractType,
    assetMeta?.contractKind,
    tokenMeta?.standard,
    tokenMeta?.contract_kind,
    neynarToken?.standard,
    neynarToken?.contract_kind,
    nftMeta?.standard,
    nftMeta?.contract_kind,
    neynarNft?.standard,
    neynarNft?.contract_kind,
  ])?.toLowerCase()

  const tokenAddress = selectString([
    rewardMeta?.tokenAddress,
    rewardMeta?.address,
    assetMeta?.address,
    assetMeta?.contractAddress,
    tokenMeta?.address,
    tokenMeta?.contract_address,
    neynarToken?.address,
    meta?.tokenAddress,
    quest.rewardToken,
  ])

  const tokenId = selectString([
    rewardMeta?.tokenId,
    rewardMeta?.nftTokenId,
    assetMeta?.tokenId,
    nftMeta?.tokenId,
    nftMeta?.id,
    prizeMeta?.tokenId,
    neynarNft?.token_id,
    neynarNft?.tokenId,
  ])

  const collectionName = selectString([
    rewardMeta?.collectionName,
    rewardMeta?.collection,
    assetMeta?.collectionName,
    assetMeta?.collection,
    nftMeta?.collectionName,
    nftMeta?.collection,
    prizeMeta?.collectionName,
    neynarToken?.collection_name,
    neynarNft?.collection_name,
    meta?.collectionName,
  ])

  const name = selectString([
    rewardMeta?.name,
    rewardMeta?.title,
    rewardMeta?.label,
    rewardMeta?.prizeName,
    rewardMeta?.tokenName,
    rewardMeta?.assetName,
    assetMeta?.name,
    assetMeta?.displayName,
    assetMeta?.label,
    assetMeta?.tokenName,
    tokenMeta?.name,
    tokenMeta?.displayName,
    tokenMeta?.label,
    nftMeta?.name,
    nftMeta?.displayName,
    nftMeta?.label,
    prizeMeta?.name,
    meta?.rewardTokenName,
    meta?.rewardName,
    meta?.tokenName,
    meta?.nftName,
    meta?.assetName,
    neynarReward?.name,
    neynarReward?.title,
    neynarToken?.name,
    neynarToken?.display_name,
    neynarToken?.token_name,
    neynarNft?.name,
    neynarNft?.display_name,
    neynarNft?.token_name,
  ])

  const symbol = selectString(
    [
      rewardTokenSymbol,
      rewardMeta?.symbol,
      rewardMeta?.tokenSymbol,
      assetMeta?.symbol,
      tokenMeta?.symbol,
      neynarToken?.symbol,
      prizeMeta?.symbol,
      nftMeta?.symbol,
    ],
    (candidate) => candidate.length <= 16,
  )

  const nftSignals = Boolean(
    nftMeta ||
      neynarNft ||
      tokenId ||
      (rawType && rawType.includes('nft')) ||
      (contractKind && (contractKind.includes('721') || contractKind.includes('1155'))) ||
      (rewardMeta?.tokenType && String(rewardMeta.tokenType).toLowerCase().includes('nft')),
  )

  const tokenSignals = Boolean(
    tokenAddress ||
      tokenMeta ||
      neynarToken ||
      (rawType && (rawType.includes('token') || rawType.includes('erc20'))) ||
      (contractKind && (contractKind.includes('20') || contractKind.includes('spl'))) ||
      rewardMeta?.token ||
      rewardMeta?.tokenSymbol ||
      rewardMeta?.tokenName,
  )

  const pointsSignals = quest.rewardPoints > 0 || (rawType && rawType.includes('point'))

  let type: RewardAssetInfo['type'] = 'unknown'
  if (nftSignals) {
    type = 'nft'
  } else if (tokenSignals) {
    type = 'token'
  } else if (pointsSignals) {
    type = 'points'
  } else if (quest.rewardToken) {
    type = 'token'
  } else if (quest.rewardPoints > 0) {
    type = 'points'
  }

  const resolvedName = name ?? null
  const resolvedSymbol = symbol ?? null

  let label: string
  switch (type) {
    case 'points':
      label = 'Points'
      break
    case 'token':
      label = resolvedName ?? resolvedSymbol ?? 'Token'
      break
    case 'nft':
      label = resolvedName ?? collectionName ?? resolvedSymbol ?? 'NFT'
      break
    default:
      label = resolvedName ?? resolvedSymbol ?? 'Reward'
  }

  let unitLabel: string
  switch (type) {
    case 'points':
      unitLabel = 'Points'
      break
    case 'token':
      unitLabel = resolvedSymbol ?? (label.length <= 12 ? label : 'Token')
      break
    case 'nft':
      unitLabel = resolvedSymbol ?? 'NFT'
      break
    default:
      unitLabel = label
  }

  let standardLabel: string | null = null
  if (contractKind) {
    const normalized = contractKind.replace(/[_\s]/g, '').toUpperCase()
    if (normalized.startsWith('ERC')) {
      const digits = normalized.slice(3).replace(/[^0-9]/g, '')
      standardLabel = digits ? `ERC-${digits}` : 'ERC'
    } else if (normalized.startsWith('SPL')) {
      standardLabel = 'SPL'
    } else if (normalized) {
      standardLabel = normalized
    }
  }

  const descriptorSources = new Set<string>()
  if (collectionName && collectionName !== label) descriptorSources.add(collectionName)
  if (quest.chainLabel && type !== 'points') descriptorSources.add(quest.chainLabel)
  if (type === 'nft' && tokenId) descriptorSources.add(`#${tokenId}`)
  if (standardLabel) descriptorSources.add(standardLabel)
  if (tokenAddress && (type === 'token' || (!collectionName && type !== 'points'))) descriptorSources.add(shortenAddress(tokenAddress))

  const descriptorArray = Array.from(descriptorSources)
  const descriptor = type === 'points' ? null : descriptorArray.length ? descriptorArray.join(' • ') : null

  return {
    type,
    label,
    unitLabel,
    name: resolvedName,
    symbol: resolvedSymbol,
    descriptor,
    contractAddress: tokenAddress ?? null,
    tokenId: tokenId ?? null,
    collectionName: collectionName ?? null,
  }
}
