/**
 * Farcaster Feed Container
 * Main feed component with tabs and infinite scroll
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/contexts/UserContext'
import {
  type FeedResult,
  getFollowingFeed,
  getTrendingFeed,
  getChannelFeed,
} from '@/lib/farcaster-feed'
import { FeedItem, FeedLoading, FeedEmpty } from './FeedItem'
import { Button, Badge } from '@/components/ui/tailwick-primitives'
import Image from 'next/image'

export type FeedType = 'following' | 'trending' | 'channel'

export type FeedContainerProps = {
  defaultType?: FeedType
  channelId?: string
  className?: string
}

export function FeedContainer({ defaultType = 'trending', channelId, className = '' }: FeedContainerProps) {
  const user = useUser()
  const [activeTab, setActiveTab] = useState<FeedType>(defaultType)
  const [feedData, setFeedData] = useState<FeedResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Load feed data
  const loadFeed = useCallback(
    async (cursor?: string) => {
      if (!cursor) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      try {
        let result: FeedResult | null = null

        if (activeTab === 'following') {
          if (!user.fid) {
            setError('Connect your Farcaster account to see your feed')
            return
          }
          result = await getFollowingFeed(user.fid, 25, cursor)
        } else if (activeTab === 'channel' && channelId) {
          result = await getChannelFeed(channelId, 25, cursor)
        } else {
          result = await getTrendingFeed(25, cursor)
        }

        if (result) {
          setFeedData((prev) => {
            if (!cursor || !prev) {
              return result
            }
            return {
              casts: [...prev.casts, ...result.casts],
              nextCursor: result.nextCursor,
            }
          })
          setError(null)
        } else {
          setError('Failed to load feed')
        }
      } catch (err) {
        console.error('[FeedContainer] Error loading feed:', err)
        setError('Something went wrong')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeTab, channelId, user.fid]
  )

  // Load feed on mount and tab change
  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  // Infinite scroll observer
  useEffect(() => {
    if (loading || loadingMore || !feedData?.nextCursor) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && feedData.nextCursor) {
          loadFeed(feedData.nextCursor)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [loading, loadingMore, feedData?.nextCursor, loadFeed])

  const handleTabChange = (tab: FeedType) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setFeedData(null)
  }

  const handleLike = async (hash: string) => {
    console.log('[FeedContainer] Like cast:', hash)
    // TODO: Implement like interaction
  }

  const handleRecast = async (hash: string) => {
    console.log('[FeedContainer] Recast:', hash)
    // TODO: Implement recast interaction
  }

  const handleReply = async (hash: string) => {
    console.log('[FeedContainer] Reply to:', hash)
    // TODO: Implement reply modal
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Feed Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b theme-border-default pb-4">
        <button
          onClick={() => handleTabChange('trending')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'trending'
              ? 'bg-purple-600 text-white'
              : 'theme-text-secondary hover:bg-purple-900/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/assets/icons/Trophy Icon.svg"
              alt="Trending"
              width={18}
              height={18}
              className="w-[18px] h-[18px]"
            />
            Trending
          </div>
        </button>

        <button
          onClick={() => handleTabChange('following')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'following'
              ? 'bg-purple-600 text-white'
              : 'theme-text-secondary hover:bg-purple-900/20'
            } ${!user.fid ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!user.fid}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/assets/icons/Groups Icon.svg"
              alt="Following"
              width={18}
              height={18}
              className="w-[18px] h-[18px]"
            />
            Following
          </div>
        </button>

        {channelId && (
          <button
            onClick={() => handleTabChange('channel')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'channel'
                ? 'bg-purple-600 text-white'
                : 'theme-text-secondary hover:bg-purple-900/20'
            }`}
          >
            <Badge variant="info" size="sm">
              /{channelId}
            </Badge>
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500/30">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/icons/Error Icon.svg"
              alt="Error"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <div>
              <div className="font-semibold text-red-400">Error</div>
              <div className="text-sm theme-text-secondary">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !feedData && <FeedLoading count={5} />}

      {/* Feed Items */}
      {!loading && feedData && feedData.casts.length === 0 && (
        <FeedEmpty
          message={
            activeTab === 'following'
              ? 'No casts from accounts you follow'
              : 'No casts available'
          }
        />
      )}

      {feedData && feedData.casts.length > 0 && (
        <div className="space-y-4">
          {feedData.casts.map((cast) => (
            <FeedItem
              key={cast.hash}
              cast={cast}
              onLike={handleLike}
              onRecast={handleRecast}
              onReply={handleReply}
            />
          ))}

          {/* Infinite Scroll Trigger */}
          {feedData.nextCursor && (
            <div ref={loadMoreRef} className="py-4">
              {loadingMore && <FeedLoading count={2} />}
            </div>
          )}
        </div>
      )}

      {/* No More Content */}
      {feedData && !feedData.nextCursor && feedData.casts.length > 0 && (
        <div className="text-center py-8 theme-text-secondary">
          <div className="text-sm">You've reached the end</div>
        </div>
      )}
    </div>
  )
}
