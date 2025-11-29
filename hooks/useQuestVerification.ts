import { useState, useRef, useCallback, useEffect } from 'react'
import { isAbortError, formatUnknownError } from '@/lib/quest-wizard/utils'
import type { QuestVerificationState, QuestVerificationSuccess } from '@/lib/quest-wizard/types'

type UseQuestVerificationOptions = {
	stepIndex: number
	verificationCacheKey: string | null
	verificationPayload: any
}

export function useQuestVerification({
	stepIndex,
	verificationCacheKey,
	verificationPayload,
}: UseQuestVerificationOptions) {
	const [verificationState, setVerificationState] = useState<QuestVerificationState>({ 
		status: 'idle', 
		lastKey: null, 
		data: null, 
		error: null 
	})
	const verificationCacheRef = useRef<Map<string, QuestVerificationSuccess>>(new Map())
	const verificationAbortRef = useRef<AbortController | null>(null)

	const runDraftVerification = useCallback(
		async (options: { force?: boolean } = {}) => {
			if (!verificationCacheKey) return null
			if (!options.force) {
				const cached = verificationCacheRef.current.get(verificationCacheKey)
				if (cached) {
					setVerificationState({ status: 'success', lastKey: verificationCacheKey, data: cached, error: null })
					return cached
				}
			}

			verificationAbortRef.current?.abort()
			const controller = new AbortController()
			verificationAbortRef.current = controller
			setVerificationState((prev) => ({ status: 'pending', lastKey: verificationCacheKey, data: options.force ? null : prev.data, error: null }))

			try {
				const response = await fetch('/api/quests/verify', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(verificationPayload),
					signal: controller.signal,
				})
				let json: any = null
				try {
					json = await response.json()
				} catch {
					json = null
				}
				if (!response.ok || !json?.ok) {
					const reason = typeof json?.reason === 'string' ? json.reason : `verification_failed_${response.status}`
					throw new Error(reason)
				}
			const result: QuestVerificationSuccess = {
				questId: String(json.questId || ''),
				questTypeKey: String(json.questTypeKey || verificationPayload.questTypeKey || ''),
				questTypeCode: Number(json.questTypeCode ?? verificationPayload.actionCode ?? 0),
				requirement: typeof json.requirement === 'object' && json.requirement ? json.requirement : {},
				meta: typeof json.meta === 'object' && json.meta ? json.meta : {},
				castDetails: typeof json.castDetails === 'object' && json.castDetails ? json.castDetails : {},
				traces: Array.isArray(json.traces) ? json.traces : [],
				durationMs: Number(json.durationMs ?? 0),
				metadata: {
					name: String(json.metadata?.name || ''),
					description: String(json.metadata?.description || ''),
					image: String(json.metadata?.image || ''),
					questType: String(json.metadata?.questType || ''),
					chain: String(json.metadata?.chain || 'base') as any,
					expiresAt: String(json.metadata?.expiresAt || ''),
				},
			}
				verificationCacheRef.current.set(verificationCacheKey, result)
				setVerificationState({ status: 'success', lastKey: verificationCacheKey, data: result, error: null })
				return result
			} catch (error) {
				if (isAbortError(error)) return null
				const message = formatUnknownError(error, 'Quest verification failed.')
				setVerificationState({ status: 'error', lastKey: verificationCacheKey, data: null, error: message })
				return null
			} finally {
				if (verificationAbortRef.current === controller) {
					verificationAbortRef.current = null
				}
			}
		},
		[verificationCacheKey, verificationPayload],
	)

	// Auto-verify on finalize step
	useEffect(() => {
		if (stepIndex !== 3) return
		if (!verificationCacheKey) return
		const cached = verificationCacheRef.current.get(verificationCacheKey)
		if (cached) {
			setVerificationState({ status: 'success', lastKey: verificationCacheKey, data: cached, error: null })
			return
		}
		void runDraftVerification()
	}, [stepIndex, verificationCacheKey, runDraftVerification])

	return {
		verificationState,
		runDraftVerification,
	}
}
