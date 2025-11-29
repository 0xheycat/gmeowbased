import { useEffect, useRef } from 'react'
import { isAssetAllowed, type QuestPolicy } from '@/lib/quest-policy'
import type { QuestDraft } from '@/lib/quest-wizard/types'

type NotificationInput = {
	tone: 'info' | 'success' | 'warning' | 'error'
	title: string
	description?: string
}

type UsePolicyEnforcementOptions = {
	draft: QuestDraft
	questPolicy: QuestPolicy
	requiredAssetGate: string | null
	tokenLookup: Record<string, any>
	nftLookup: Record<string, any>
	onDraftChange: (patch: Partial<QuestDraft>) => void
	pushNotification: (input: NotificationInput) => number
}

export function usePolicyEnforcement({
	draft,
	questPolicy,
	requiredAssetGate,
	tokenLookup,
	nftLookup,
	onDraftChange,
	pushNotification,
}: UsePolicyEnforcementOptions) {
	const policyNoticeRef = useRef({
		partnerDowngraded: false,
		raffleDisabled: false,
		partnerChainsTrimmed: false,
		eligibilityAsset: null as string | null,
		rewardAsset: null as string | null,
		gateEnforced: false,
	})

	// Reset notices when policy allows features
	useEffect(() => {
		if (questPolicy.allowPartnerMode) {
			policyNoticeRef.current.partnerDowngraded = false
			policyNoticeRef.current.partnerChainsTrimmed = false
		}
		if (questPolicy.allowRaffle) {
			policyNoticeRef.current.raffleDisabled = false
		}
	}, [questPolicy.allowPartnerMode, questPolicy.allowRaffle])

	// Reset asset notices when verification not required
	useEffect(() => {
		if (!questPolicy.requireVerifiedAssets) {
			policyNoticeRef.current.eligibilityAsset = null
			policyNoticeRef.current.rewardAsset = null
		}
	}, [questPolicy.requireVerifiedAssets])

	// Reset gate notice when not enforced
	useEffect(() => {
		if (!questPolicy.forceHoldQuestGate || !requiredAssetGate) {
			policyNoticeRef.current.gateEnforced = false
		}
	}, [questPolicy.forceHoldQuestGate, requiredAssetGate])

	// Enforce hold-quest gating requirements
	useEffect(() => {
		if (!questPolicy.forceHoldQuestGate) return
		if (!requiredAssetGate) return
		const desiredAssetType = requiredAssetGate
		const patch: Partial<QuestDraft> = {}
		let changed = false
		if (draft.eligibilityMode === 'open') {
			patch.eligibilityMode = 'simple'
			changed = true
		}
		if (draft.eligibilityMode === 'partner' && !questPolicy.allowPartnerMode) {
			patch.eligibilityMode = 'simple'
			changed = true
		}
		if (draft.eligibilityAssetType !== desiredAssetType) {
			patch.eligibilityAssetType = desiredAssetType as 'token' | 'nft'
			patch.eligibilityAssetId = undefined
			changed = true
		}
		if (changed) {
			onDraftChange(patch)
			if (!policyNoticeRef.current.gateEnforced) {
				pushNotification({
					tone: 'info',
					title: 'Hold quests require a gate',
					description: 'Quest type enforcement automatically enabled the correct gating mode.',
				})
				policyNoticeRef.current.gateEnforced = true
			}
		}
	}, [draft.eligibilityAssetType, draft.eligibilityMode, questPolicy.allowPartnerMode, questPolicy.forceHoldQuestGate, requiredAssetGate, pushNotification, onDraftChange])

	// Downgrade partner mode if not allowed
	useEffect(() => {
		if (questPolicy.allowPartnerMode) return
		if (draft.eligibilityMode !== 'partner') return
		onDraftChange({
			eligibilityMode: questPolicy.forceHoldQuestGate ? 'simple' : 'open',
			eligibilityChainList: [],
		})
		if (!policyNoticeRef.current.partnerDowngraded) {
			pushNotification({
				tone: 'info',
				title: 'Partner mode locked',
				description: 'Your tier focuses on simple gates for now. Reach out to the ops team to unlock partner mode.',
			})
			policyNoticeRef.current.partnerDowngraded = true
		}
	}, [draft.eligibilityMode, pushNotification, questPolicy.allowPartnerMode, questPolicy.forceHoldQuestGate, onDraftChange])

	// Enforce max partner chains limit
	useEffect(() => {
		if (draft.eligibilityMode !== 'partner') return
		const maxChains = questPolicy.maxPartnerChains
		if (!Number.isFinite(maxChains)) return
		const limit = Math.max(1, Math.floor(Number(maxChains)))
		if (draft.eligibilityChainList.length <= limit) return
		const trimmed = draft.eligibilityChainList.slice(0, limit)
		onDraftChange({ eligibilityChainList: trimmed })
		if (!policyNoticeRef.current.partnerChainsTrimmed) {
			pushNotification({
				tone: 'info',
				title: `Partner chains limited to ${limit}`,
				description: 'Higher limits unlock with the partner success tier. Extra chains were removed from this quest.',
			})
			policyNoticeRef.current.partnerChainsTrimmed = true
		}
	}, [draft.eligibilityChainList, draft.eligibilityMode, pushNotification, questPolicy.maxPartnerChains, onDraftChange])

	// Clear eligibility asset if not verified
	useEffect(() => {
		if (!questPolicy.requireVerifiedAssets) return
		const assetId = draft.eligibilityAssetId?.toLowerCase()
		if (!assetId) {
			policyNoticeRef.current.eligibilityAsset = null
			return
		}
		const asset =
			draft.eligibilityAssetType === 'token'
				? tokenLookup[assetId]
				: nftLookup[assetId]
		if (isAssetAllowed(asset, questPolicy)) {
			policyNoticeRef.current.eligibilityAsset = null
			return
		}
		onDraftChange({ eligibilityAssetId: undefined })
		if (policyNoticeRef.current.eligibilityAsset !== assetId) {
			pushNotification({
				tone: 'warning',
				title: 'Verified asset required',
				description: 'Pick a verified token or collection to keep this quest Mini App ready.',
			})
			policyNoticeRef.current.eligibilityAsset = assetId
		}
	}, [draft.eligibilityAssetId, draft.eligibilityAssetType, questPolicy, pushNotification, tokenLookup, nftLookup, onDraftChange])

	// Clear reward asset if not verified
	useEffect(() => {
		if (!questPolicy.requireVerifiedAssets) return
		if (draft.rewardMode !== 'token' && draft.rewardMode !== 'nft') {
			policyNoticeRef.current.rewardAsset = null
			return
		}
		const assetId = draft.rewardAssetId?.toLowerCase()
		if (!assetId) {
			policyNoticeRef.current.rewardAsset = null
			return
		}
		const asset = draft.rewardMode === 'token' ? tokenLookup[assetId] : nftLookup[assetId]
		if (isAssetAllowed(asset, questPolicy)) {
			policyNoticeRef.current.rewardAsset = null
			return
		}
		onDraftChange({ rewardAssetId: undefined, rewardToken: '', rewardTokenPerUser: '0' })
		if (policyNoticeRef.current.rewardAsset !== assetId) {
			pushNotification({
				tone: 'warning',
				title: 'Reward asset needs verification',
				description: 'Swap to a verified contract before launching your quest.',
			})
			policyNoticeRef.current.rewardAsset = assetId
		}
	}, [draft.rewardAssetId, draft.rewardMode, pushNotification, questPolicy, tokenLookup, nftLookup, onDraftChange])

	// Disable raffle if not allowed
	useEffect(() => {
		if (questPolicy.allowRaffle) return
		if (!draft.raffleEnabled) return
		onDraftChange({ raffleEnabled: false })
		if (!policyNoticeRef.current.raffleDisabled) {
			pushNotification({
				tone: 'info',
				title: 'Raffle rewards disabled',
				description: 'Raffles unlock for partner and admin tiers. Points rewards stay available.',
			})
			policyNoticeRef.current.raffleDisabled = true
		}
	}, [draft.raffleEnabled, pushNotification, questPolicy.allowRaffle, onDraftChange])
}
