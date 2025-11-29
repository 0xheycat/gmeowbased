/**
 * Farcaster Feed UI Components
 * Built with Tailwick v2.0 patterns + Gmeowbased v0.1 icons
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { type FarcasterCast } from '@/lib/farcaster-feed'
import { Card, CardBody, Badge, Button } from '@/components/ui/tailwick-primitives'

// ========================================
// FEED ITEM COMPONENT
// ========================================

export type FeedItemProps = {
  cast: FarcasterCast
  onLike?: (hash: string) => void
  onRecast?: (hash: string) => void
  onReply?: (hash: string) => void
  className?: string
}

export function FeedItem({ cast, onLike, onRecast, onReply, className = '' }: FeedItemProps) {
  const [isLiking, setIsLiking] = useState(false)
  const [isRecasting, setIsRecasting] = useState(false)
  
  const timeAgo = getTimeAgo(cast.timestamp)
  const isReply = !!cast.parentHash

  const handleLike = async () => {
    if (isLiking || !onLike) return
    setIsLiking(true)
    try {
      await onLike(cast.hash)
    } finally {
      setIsLiking(false)
    }
  }

  const handleRecast = async () => {
    if (isRecasting || !onRecast) return
    setIsRecasting(true)
    try {
      await onRecast(cast.hash)
    } finally {
      setIsRecasting(false)
    }
  }

  return (
    <Card className={`theme-border-default ${className}`}>
      <CardBody className="space-y-3">
        {/* Author Info */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {cast.author.pfpUrl ? (
              <Image
                src={cast.author.pfpUrl}
                alt={cast.author.displayName || cast.author.username || 'User'}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">
                  {(cast.author.displayName || cast.author.username || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold theme-text-primary truncate">
                  {cast.author.displayName || cast.author.username || 'Unknown'}
                </span>
                {cast.author.powerBadge && (
                  <Image
                    src="/assets/icons/Badges Icon.svg"
                    alt="Power Badge"
                    width={16}
                    height={16}
                    className="w-4 h-4 flex-shrink-0"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-sm theme-text-secondary">
                <span className="truncate">@{cast.author.username || 'unknown'}</span>
                <span>·</span>
                <span className="flex-shrink-0">{timeAgo}</span>
              </div>
            </div>
          </div>

          {/* Channel Badge */}
          {cast.channel && (
            <Badge variant="info" size="sm" className="flex-shrink-0">
              /{cast.channel.id}
            </Badge>
          )}
        </div>

        {/* Reply Context */}
        {isReply && cast.parentAuthor && (
          <div className="text-sm theme-text-secondary pl-12">
            Replying to @{cast.parentAuthor.username || 'unknown'}
          </div>
        )}

        {/* Cast Text */}
        <div className="theme-text-primary whitespace-pre-wrap break-words pl-12">
          {cast.text}
        </div>

        {/* Embeds (Images/Links) */}
        {cast.embeds && cast.embeds.length > 0 && (
          <div className="pl-12 space-y-2">
            {cast.embeds.map((embed, idx) => {
              if (embed.contentType?.startsWith('image/')) {
                return (
                  <div key={idx} className="rounded-lg overflow-hidden border theme-border-default">
                    <Image
                      src={embed.url || ''}
                      alt="Cast embed"
                      width={embed.imageWidth || 600}
                      height={embed.imageHeight || 400}
                      className="w-full h-auto max-h-96 object-cover"
                    />
                  </div>
                )
              } else if (embed.url) {
                return (
                  <a
                    key={idx}
                    href={embed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border theme-border-default hover:bg-purple-900/20 transition-colors"
                  >
                    <div className="text-sm theme-text-secondary truncate">
                      {embed.url}
                    </div>
                  </a>
                )
              }
              return null
            })}
          </div>
        )}

        {/* Interactions */}
        <div className="flex items-center gap-6 pl-12 pt-2">
          {/* Reply */}
          <button
            onClick={() => onReply?.(cast.hash)}
            className="flex items-center gap-2 text-sm theme-text-secondary hover:text-purple-400 transition-colors group"
          >
            <Image
              src="/assets/icons/Messages Icon.svg"
              alt="Reply"
              width={18}
              height={18}
              className="w-[18px] h-[18px] opacity-60 group-hover:opacity-100 transition-opacity"
            />
            {cast.replies.count > 0 && <span>{cast.replies.count}</span>}
          </button>

          {/* Recast */}
          <button
            onClick={handleRecast}
            disabled={isRecasting}
            className={`flex items-center gap-2 text-sm transition-colors group ${
              cast.viewerContext?.recasted
                ? 'text-green-400'
                : 'theme-text-secondary hover:text-green-400'
            } ${isRecasting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Image
              src="/assets/icons/Share Icon.svg"
              alt="Recast"
              width={18}
              height={18}
              className={`w-[18px] h-[18px] transition-opacity ${
                cast.viewerContext?.recasted ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
              }`}
            />
            {cast.reactions.recasts > 0 && <span>{cast.reactions.recasts}</span>}
          </button>

          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-2 text-sm transition-colors group ${
              cast.viewerContext?.liked
                ? 'text-pink-400'
                : 'theme-text-secondary hover:text-pink-400'
            } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Image
              src="/assets/icons/Heart Icon.svg"
              alt="Like"
              width={18}
              height={18}
              className={`w-[18px] h-[18px] transition-opacity ${
                cast.viewerContext?.liked ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
              }`}
            />
            {cast.reactions.likes > 0 && <span>{cast.reactions.likes}</span>}
          </button>
        </div>
      </CardBody>
    </Card>
  )
}

// ========================================
// FEED LOADING SKELETON
// ========================================

export function FeedLoading({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="theme-border-default">
          <CardBody className="space-y-3">
            {/* Author skeleton */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full theme-bg-subtle animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 theme-bg-subtle rounded animate-pulse" />
                <div className="h-3 w-24 theme-bg-subtle rounded animate-pulse" />
              </div>
            </div>
            {/* Text skeleton */}
            <div className="pl-12 space-y-2">
              <div className="h-4 w-full theme-bg-subtle rounded animate-pulse" />
              <div className="h-4 w-3/4 theme-bg-subtle rounded animate-pulse" />
            </div>
            {/* Interactions skeleton */}
            <div className="flex items-center gap-6 pl-12 pt-2">
              <div className="h-5 w-12 theme-bg-subtle rounded animate-pulse" />
              <div className="h-5 w-12 theme-bg-subtle rounded animate-pulse" />
              <div className="h-5 w-12 theme-bg-subtle rounded animate-pulse" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

// ========================================
// EMPTY FEED STATE
// ========================================

export function FeedEmpty({ message = 'No casts to show' }: { message?: string }) {
  return (
    <Card className="theme-border-default">
      <CardBody className="text-center py-12">
        <div className="flex justify-center mb-4">
          <Image
            src="/assets/icons/Messages Icon.svg"
            alt="Empty"
            width={64}
            height={64}
            className="w-16 h-16 opacity-40"
          />
        </div>
        <p className="theme-text-secondary text-lg">{message}</p>
      </CardBody>
    </Card>
  )
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return 'now'
}
