'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface QuestFABProps {
  onRefresh?: () => void
  onScrollTop?: () => void
  onArchive?: () => void
  onBookmarks?: () => void
  isRefreshing?: boolean
  bookmarkCount?: number
  showBookmarkFilter?: boolean
}

/**
 * Floating Action Button for Quest Page
 * Provides quick access to common mobile actions
 */
export function QuestFAB({
  onRefresh,
  onScrollTop,
  onArchive,
  onBookmarks,
  isRefreshing = false,
  bookmarkCount = 0,
  showBookmarkFilter = false,
}: QuestFABProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Show scroll-to-top when user scrolls down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close FAB when clicking outside
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = () => setIsExpanded(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isExpanded])

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleAction = (action?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    action?.()
    setIsExpanded(false)
  }

  return (
    <div className="quest-fab-container">
      {/* Expanded action buttons */}
      {isExpanded && (
        <div className="quest-fab-menu">
          {showScrollTop && onScrollTop && (
            <button
              type="button"
              className="quest-fab-action"
              onClick={handleAction(onScrollTop)}
              aria-label="Scroll to top"
            >
              <span className="quest-fab-action-icon">↑</span>
              <span className="quest-fab-action-label">Top</span>
            </button>
          )}
          
          {onRefresh && (
            <button
              type="button"
              className="quest-fab-action"
              onClick={handleAction(onRefresh)}
              disabled={isRefreshing}
              aria-label="Refresh quests"
            >
              <span className="quest-fab-action-icon">{isRefreshing ? '⏳' : '🔄'}</span>
              <span className="quest-fab-action-label">Refresh</span>
            </button>
          )}
          
          {onBookmarks && (
            <button
              type="button"
              className={cn('quest-fab-action', showBookmarkFilter && 'quest-fab-action--active')}
              onClick={handleAction(onBookmarks)}
              aria-label={`${showBookmarkFilter ? 'Hide' : 'Show'} bookmarks (${bookmarkCount})`}
            >
              <span className="quest-fab-action-icon">🔖</span>
              <span className="quest-fab-action-label">
                {showBookmarkFilter ? 'All' : 'Saved'}
                {bookmarkCount > 0 && ` (${bookmarkCount})`}
              </span>
            </button>
          )}
          
          {onArchive && (
            <button
              type="button"
              className="quest-fab-action"
              onClick={handleAction(onArchive)}
              aria-label="Open quest archive"
            >
              <span className="quest-fab-action-icon">📦</span>
              <span className="quest-fab-action-label">Archive</span>
            </button>
          )}
        </div>
      )}

      {/* Main FAB button */}
      <button
        type="button"
        className={cn('quest-fab', isExpanded && 'quest-fab--expanded')}
        onClick={handleMainClick}
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={isExpanded}
      >
        <span className="quest-fab-icon">
          {isExpanded ? '✕' : '⚡'}
        </span>
      </button>
    </div>
  )
}
