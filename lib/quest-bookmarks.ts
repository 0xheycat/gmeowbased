/**
 * Quest Bookmarking System
 * Manages saved quests in localStorage with type-safe operations
 */

const BOOKMARK_STORAGE_KEY = 'gmeow_quest_bookmarks_v1'

export interface BookmarkedQuest {
  chain: string
  id: number
  name: string
  bookmarkedAt: number
}

/**
 * Get all bookmarked quests from localStorage
 */
export function getBookmarks(): BookmarkedQuest[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(BOOKMARK_STORAGE_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Check if a quest is bookmarked
 */
export function isBookmarked(chain: string, questId: number): boolean {
  const bookmarks = getBookmarks()
  return bookmarks.some(b => b.chain === chain && b.id === questId)
}

/**
 * Add a quest to bookmarks
 */
export function addBookmark(chain: string, id: number, name: string): boolean {
  try {
    const bookmarks = getBookmarks()
    
    // Check if already bookmarked
    if (bookmarks.some(b => b.chain === chain && b.id === id)) {
      return false
    }
    
    const newBookmark: BookmarkedQuest = {
      chain,
      id,
      name,
      bookmarkedAt: Date.now(),
    }
    
    bookmarks.unshift(newBookmark) // Add to beginning
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks))
    
    return true
  } catch {
    return false
  }
}

/**
 * Remove a quest from bookmarks
 */
export function removeBookmark(chain: string, id: number): boolean {
  try {
    const bookmarks = getBookmarks()
    const filtered = bookmarks.filter(b => !(b.chain === chain && b.id === id))
    
    if (filtered.length === bookmarks.length) {
      return false // Nothing was removed
    }
    
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch {
    return false
  }
}

/**
 * Toggle bookmark status for a quest
 */
export function toggleBookmark(chain: string, id: number, name: string): boolean {
  const wasBookmarked = isBookmarked(chain, id)
  
  if (wasBookmarked) {
    return removeBookmark(chain, id)
  } else {
    return addBookmark(chain, id, name)
  }
}

/**
 * Clear all bookmarks
 */
export function clearBookmarks(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(BOOKMARK_STORAGE_KEY)
}

/**
 * Get bookmark count
 */
export function getBookmarkCount(): number {
  return getBookmarks().length
}
