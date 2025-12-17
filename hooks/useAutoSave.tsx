/**
 * Auto-save Hook for Quest Drafts
 * 
 * Automatically saves draft to localStorage with debouncing
 */

import { useEffect, useRef, useCallback } from 'react'

// Type definitions moved from removed quest-wizard
type QuestDraft = Record<string, any>

const AUTOSAVE_KEY = 'quest-wizard-autosave'
const AUTOSAVE_DELAY_MS = 5000 // Save after 5 seconds of inactivity
const AUTOSAVE_METADATA_KEY = 'quest-wizard-autosave-metadata'

export type AutoSaveMetadata = {
	lastSaved: number
	version: number
	draftName: string
}

/**
 * Auto-save draft to localStorage
 */
export function useAutoSave(draft: Partial<QuestDraft>, enabled: boolean = true) {
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const lastSavedRef = useRef<string>('')
	const saveCountRef = useRef(0)

	const save = useCallback((draftToSave: Partial<QuestDraft>) => {
		try {
			const serialized = JSON.stringify(draftToSave)
			
			// Only save if draft actually changed
			if (serialized === lastSavedRef.current) {
				return
			}

			localStorage.setItem(AUTOSAVE_KEY, serialized)
			lastSavedRef.current = serialized
			saveCountRef.current += 1

			// Save metadata
			const metadata: AutoSaveMetadata = {
				lastSaved: Date.now(),
				version: saveCountRef.current,
				draftName: draftToSave.name || 'Untitled Quest',
			}
			localStorage.setItem(AUTOSAVE_METADATA_KEY, JSON.stringify(metadata))

		} catch (error) {
			console.error('[AutoSave] Failed to save draft:', error)
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

	const clearAutoSave = useCallback(() => {
		try {
			localStorage.removeItem(AUTOSAVE_KEY)
			localStorage.removeItem(AUTOSAVE_METADATA_KEY)
		lastSavedRef.current = ''
		saveCountRef.current = 0
	} catch (error) {
			console.error('[AutoSave] Failed to clear draft:', error)
		}
	}, [])

	const loadAutoSave = useCallback((): Partial<QuestDraft> | null => {
		try {
			const saved = localStorage.getItem(AUTOSAVE_KEY)
			if (!saved) return null

		const draft = JSON.parse(saved) as Partial<QuestDraft>
		return draft
		} catch (error) {
			console.error('[AutoSave] Failed to load draft:', error)
			return null
		}
	}, [])

	const getAutoSaveMetadata = useCallback((): AutoSaveMetadata | null => {
		try {
			const saved = localStorage.getItem(AUTOSAVE_METADATA_KEY)
			if (!saved) return null

			return JSON.parse(saved) as AutoSaveMetadata
		} catch (error) {
			console.error('[AutoSave] Failed to load metadata:', error)
			return null
		}
	}, [])

	return {
		save,
		clearAutoSave,
		loadAutoSave,
		getAutoSaveMetadata,
		saveCount: saveCountRef.current,
	}
}

/**
 * Auto-save indicator component
 */
export function AutoSaveIndicator({
	lastSaved,
	isSaving = false,
}: {
	lastSaved?: number
	isSaving?: boolean
}) {
	const getTimeAgo = (timestamp: number) => {
		const seconds = Math.floor((Date.now() - timestamp) / 1000)
		
		if (seconds < 10) return 'just now'
		if (seconds < 60) return `${seconds}s ago`
		
		const minutes = Math.floor(seconds / 60)
		if (minutes < 60) return `${minutes}m ago`
		
		const hours = Math.floor(minutes / 60)
		return `${hours}h ago`
	}

	if (isSaving) {
		return (
			<div className="flex items-center gap-2 text-xs text-slate-400">
				<span className="animate-spin">⟳</span>
				<span>Saving...</span>
			</div>
		)
	}

	if (!lastSaved) {
		return (
			<div className="flex items-center gap-2 text-xs text-slate-500">
				<span>●</span>
				<span>Not saved</span>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-2 text-xs text-emerald-400">
			<span>✓</span>
			<span>Saved {getTimeAgo(lastSaved)}</span>
		</div>
	)
}

/**
 * Auto-save recovery prompt
 */
export function AutoSaveRecoveryPrompt({
	metadata,
	onRestore,
	onDiscard,
}: {
	metadata: AutoSaveMetadata
	onRestore: () => void
	onDiscard: () => void
}) {
	const timeAgo = new Date(metadata.lastSaved).toLocaleString()

	return (
		<div className="rounded-2xl border border-sky-500/50 bg-sky-500/10 p-6 backdrop-blur">
			<div className="flex items-start gap-4">
				<div className="flex-shrink-0 text-3xl">💾</div>
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-white">
						Resume Previous Draft?
					</h3>
					<p className="mt-1 text-sm text-slate-300">
						We found an unsaved draft: <span className="font-semibold">{metadata.draftName}</span>
					</p>
					<p className="mt-1 text-xs text-slate-400">
						Last saved: {timeAgo}
					</p>
					<div className="mt-4 flex gap-3">
						<button
							onClick={onRestore}
							className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
						>
							Restore Draft
						</button>
						<button
							onClick={onDiscard}
							className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
						>
							Start Fresh
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
