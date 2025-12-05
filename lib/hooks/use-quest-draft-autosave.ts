/**
 * Quest Draft Auto-Save Hook
 * NEW FOUNDATION - Built from scratch for new quest creation system
 * 
 * NO OLD PATTERNS - Uses NEW template system, NEW types, NEW architecture
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { QuestDraft } from '@/lib/quests/types'

const AUTOSAVE_KEY = 'gmeow-quest-draft-v2' // V2 to avoid old quest-wizard conflicts
const AUTOSAVE_DELAY_MS = 5000 // 5 seconds
const AUTOSAVE_METADATA_KEY = 'gmeow-quest-draft-metadata-v2'

export interface QuestDraftMetadata {
  lastSaved: number
  version: number
  title: string
}

/**
 * Auto-save quest draft to localStorage
 * Debounced to prevent excessive writes
 */
export function useQuestDraftAutoSave(draft: Partial<QuestDraft>, enabled: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<string>('')
  const saveCountRef = useRef(0)

  const save = useCallback((draftToSave: Partial<QuestDraft>) => {
    try {
      const serialized = JSON.stringify(draftToSave)
      
      // Only save if draft changed
      if (serialized === lastSavedRef.current) {
        return
      }

      localStorage.setItem(AUTOSAVE_KEY, serialized)
      lastSavedRef.current = serialized
      saveCountRef.current += 1

      // Save metadata
      const metadata: QuestDraftMetadata = {
        lastSaved: Date.now(),
        version: saveCountRef.current,
        title: draftToSave.title || 'Untitled Quest',
      }
      localStorage.setItem(AUTOSAVE_METADATA_KEY, JSON.stringify(metadata))

      console.log('[QuestDraft] Auto-saved:', {
        version: saveCountRef.current,
        title: metadata.title,
      })
    } catch (error) {
      console.error('[QuestDraft] Failed to save:', error)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout to save after delay
    timeoutRef.current = setTimeout(() => {
      save(draft)
    }, AUTOSAVE_DELAY_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [draft, enabled, save])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY)
      localStorage.removeItem(AUTOSAVE_METADATA_KEY)
      lastSavedRef.current = ''
      saveCountRef.current = 0
      console.log('[QuestDraft] Draft cleared')
    } catch (error) {
      console.error('[QuestDraft] Failed to clear:', error)
    }
  }, [])

  const loadDraft = useCallback((): Partial<QuestDraft> | null => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY)
      if (!saved) return null

      const draft = JSON.parse(saved) as Partial<QuestDraft>
      console.log('[QuestDraft] Loaded:', draft.title || 'Untitled')
      return draft
    } catch (error) {
      console.error('[QuestDraft] Failed to load:', error)
      return null
    }
  }, [])

  const getMetadata = useCallback((): QuestDraftMetadata | null => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_METADATA_KEY)
      if (!saved) return null

      return JSON.parse(saved) as QuestDraftMetadata
    } catch (error) {
      console.error('[QuestDraft] Failed to load metadata:', error)
      return null
    }
  }, [])

  return {
    save,
    clearDraft,
    loadDraft,
    getMetadata,
    saveCount: saveCountRef.current,
  }
}
