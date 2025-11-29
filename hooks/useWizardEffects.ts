import { useEffect } from 'react'
import type { QuestDraft } from '@/lib/quest-wizard/types'

type UseWizardEffectsOptions = {
	isFrameReady: boolean
	setFrameReady?: () => void
	tokenEscrowStatus: { state: string } | null
	draft: QuestDraft
	prefilledFollow: boolean
	contextUsername?: string
	onEscrowUpdate: () => void
	onDraftChange: (patch: Partial<QuestDraft>) => void
	onFollowPrefilled: () => void
}

export function useWizardEffects({
	isFrameReady,
	setFrameReady,
	tokenEscrowStatus,
	draft,
	prefilledFollow,
	contextUsername,
	onEscrowUpdate,
	onDraftChange,
	onFollowPrefilled,
}: UseWizardEffectsOptions) {
	// Escrow warming timer - refresh every 30s
	useEffect(() => {
		if (typeof window === 'undefined') return undefined
		if (tokenEscrowStatus?.state !== 'warming') return undefined
		const interval = window.setInterval(() => {
			onEscrowUpdate()
		}, 30_000)
		return () => window.clearInterval(interval)
	}, [tokenEscrowStatus?.state, onEscrowUpdate])

	// Update escrow time when deposit changes
	useEffect(() => {
		onEscrowUpdate()
	}, [draft.rewardTokenDepositTx, draft.rewardTokenDepositDetectedAtISO, draft.rewardTokenDepositAmount, onEscrowUpdate])

	// Frame readiness check for MiniKit
	useEffect(() => {
		if (!isFrameReady && typeof setFrameReady === 'function') {
			setFrameReady()
		}
	}, [isFrameReady, setFrameReady])

	// Prefill follow username from MiniKit context
	useEffect(() => {
		if (prefilledFollow) return
		if (draft.followUsername) {
			onFollowPrefilled()
			return
		}
		const username = typeof contextUsername === 'string' ? contextUsername : undefined
		if (!username) return
		const normalized = username.startsWith('@') ? username.slice(1) : username
		if (!normalized.trim()) {
			onFollowPrefilled()
			return
		}
		onDraftChange({ followUsername: normalized.trim() })
		onFollowPrefilled()
	}, [prefilledFollow, contextUsername, draft.followUsername, onDraftChange, onFollowPrefilled])
}
