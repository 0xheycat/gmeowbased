/**
 * Quest Wizard Helper Functions
 * Business logic helpers for draft processing, escrow, and verification
 */

import type {
	QuestDraft,
	QuestSummary,
	TokenLookup,
	NftLookup,
	TokenEscrowStatus,
	TokenEscrowPhase,
} from '@/components/quest-wizard/shared'
import {
	CHAIN_LABEL,
	QUEST_TYPE_DETAILS,
	formatChainList,
	formatExpiryLabel,
	formatUsernameForDisplay,
	normalizeQuestTypeKey,
	toPositiveInt,
} from '@/components/quest-wizard/shared'
import { getQuestFieldConfig } from '@/lib/gm-utils'
import { parseTokenAmountToUnits, formatTokenAmountFromUnits } from './utils/tokenMath'

const ERC20_ESCROW_WARMUP_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Create lookup map for tokens (by id)
 */
export function createTokenLookup<T extends { id: string }>(tokens: T[]): Record<string, T> {
	const lookup: Record<string, T> = {}
	for (const token of tokens) {
		if (token.id) lookup[token.id.toLowerCase()] = token
	}
	return lookup
}

/**
 * Create lookup map for NFTs (by id)
 */
export function createNftLookup<T extends { id: string }>(nfts: T[]): Record<string, T> {
	const lookup: Record<string, T> = {}
	for (const nft of nfts) {
		if (nft.id) lookup[nft.id.toLowerCase()] = nft
	}
	return lookup
}

/**
 * Derive quest mode from quest type key
 */
export function deriveQuestModeFromKey(key: QuestDraft['questTypeKey']): 'social' | 'onchain' {
	return getQuestFieldConfig(key).mode
}

/**
 * Derive token escrow status from draft and token catalog
 * Calculates expected amounts, validates deposit, and determines readiness
 */
export function deriveTokenEscrowStatus(
	draft: QuestDraft,
	params: {
		tokenLookup: TokenLookup
		now?: number
	},
): TokenEscrowStatus | null {
	if (draft.rewardMode !== 'token') return null
	
	const tokenIdRaw = draft.rewardAssetId
	if (!tokenIdRaw) return null
	
	const token = params.tokenLookup[tokenIdRaw.toLowerCase()]
	if (!token) return null
	
	const decimalsRaw = typeof token.decimals === 'number' && Number.isFinite(token.decimals) 
		? Math.trunc(token.decimals) 
		: 18
	const decimals = Math.min(Math.max(decimalsRaw, 0), 36)
	const symbol = typeof token.symbol === 'string' && token.symbol.trim() ? token.symbol : null
	
	const markMissing = (list: string[], key: string) => {
		if (!list.includes(key)) list.push(key)
	}
	
	// Calculate expected amounts
	const expectedPerUserUnits = parseTokenAmountToUnits(draft.rewardTokenPerUser, decimals)
	const maxCompletions = toPositiveInt(draft.maxCompletions, 0)
	const expectedPerUser = expectedPerUserUnits ?? 0n
	const expectedTotal = expectedPerUserUnits != null && maxCompletions > 0 
		? expectedPerUserUnits * BigInt(maxCompletions) 
		: 0n
	
	// Parse recorded deposit
	const recordedUnits = parseTokenAmountToUnits(draft.rewardTokenDepositAmount, decimals)
	const recordedTotal = recordedUnits ?? 0n
	
	// Track missing fields
	const missingFields: string[] = []
	if (!draft.rewardTokenDepositTx || !draft.rewardTokenDepositTx.trim()) {
		markMissing(missingFields, 'tx')
	}
	if (expectedPerUserUnits == null || maxCompletions <= 0) {
		markMissing(missingFields, 'configuration')
	}
	if (recordedUnits == null) {
		markMissing(missingFields, 'amount')
	}
	
	// Parse detection timestamp
	const detectedInput = typeof draft.rewardTokenDepositDetectedAtISO === 'string' 
		? draft.rewardTokenDepositDetectedAtISO.trim() 
		: ''
	const detectedAtMs = detectedInput ? Date.parse(detectedInput) : Number.NaN
	if (detectedInput && Number.isNaN(detectedAtMs)) {
		markMissing(missingFields, 'detectedAt')
	}
	
	// Determine escrow state
	let state: TokenEscrowPhase = 'missing'
	let readyAtMs: number | null = null
	
	if (expectedTotal === 0n) {
		state = 'missing'
	} else if (!draft.rewardTokenDepositTx || !draft.rewardTokenDepositTx.trim()) {
		state = 'missing'
	} else if (recordedUnits == null) {
		state = 'missing'
	} else if (recordedTotal < expectedTotal) {
		state = 'insufficient'
	} else if (Number.isNaN(detectedAtMs) || detectedAtMs <= 0) {
		state = 'awaiting-detection'
	} else {
		// Apply 24-hour warm-up period
		readyAtMs = detectedAtMs + ERC20_ESCROW_WARMUP_MS
		const now = params.now ?? Date.now()
		state = now >= readyAtMs ? 'ready' : 'warming'
	}
	
	const normalizedDetectedAt = Number.isNaN(detectedAtMs) ? null : detectedAtMs
	
	return {
		state,
		expectedPerUser,
		expectedPerUserDisplay: formatTokenAmountFromUnits(expectedPerUser, decimals),
		expectedTotal,
		expectedTotalDisplay: formatTokenAmountFromUnits(expectedTotal, decimals),
		recordedTotal,
		recordedTotalDisplay: formatTokenAmountFromUnits(recordedTotal, decimals),
		decimals,
		symbol,
		detectedAtMs: normalizedDetectedAt,
		readyAtMs,
		missingFields,
	}
}

/**
 * Summarize draft into display-ready quest summary
 * Extracts title, badges, metadata for preview card
 */
export function summarizeDraft(
	draft: QuestDraft,
	lookups: {
		tokenLookup: TokenLookup
		nftLookup: NftLookup
	},
): QuestSummary {
	const { tokenLookup, nftLookup } = lookups
	const chainLabel = CHAIN_LABEL[draft.chain]
	const normalizedQuestType = normalizeQuestTypeKey(draft.questTypeKey)
	const questDetail = QUEST_TYPE_DETAILS[normalizedQuestType] ?? QUEST_TYPE_DETAILS.GENERIC
	const questConfig = getQuestFieldConfig(normalizedQuestType)
	const questTypeLabel = questDetail.label
	const questMode = questConfig.mode

	const title = draft.name || 'Untitled quest'
	const subtitle = draft.headline || 'Add a short hook to entice pilots.'
	const description = draft.description || 'Draft overview goes here – add more colour in Step 1.'

	// Eligibility badge
	let eligibilityBadge = ''
	let partnerCopy: string | null = null

	if (draft.eligibilityMode === 'open') {
		eligibilityBadge = 'Open gate'
	} else if (draft.eligibilityAssetType === 'token' && draft.eligibilityAssetId) {
		const token = tokenLookup[draft.eligibilityAssetId.toLowerCase()]
		eligibilityBadge = token ? `Gate: ${token.symbol}` : 'Token gate'
		if (draft.eligibilityMode === 'partner') {
			partnerCopy = `Holders of ${token?.name || draft.eligibilityCollection || 'partner token'} across ${formatChainList(draft.eligibilityChainList)} unlock this quest.`
		}
	} else if (draft.eligibilityAssetType === 'nft' && draft.eligibilityAssetId) {
		const nft = nftLookup[draft.eligibilityAssetId.toLowerCase()]
		eligibilityBadge = nft ? `Gate: ${nft.name}` : 'NFT gate'
		if (draft.eligibilityMode === 'partner') {
			partnerCopy = `Holders of ${nft?.collection || draft.eligibilityCollection || 'partner NFT'} across ${formatChainList(draft.eligibilityChainList)} unlock this quest.`
		}
	}

	// Reward badge
	const rewardBadge = (() => {
		if (draft.rewardMode === 'points') return `${draft.rewardPoints || '0'} pts`
		if (draft.rewardMode === 'token' && draft.rewardAssetId) {
			const token = tokenLookup[draft.rewardAssetId.toLowerCase()]
			return token ? `${token.symbol} × ${draft.rewardTokenPerUser || '0'}` : 'ERC-20 reward'
		}
		if (draft.rewardMode === 'nft' && draft.rewardAssetId) {
			const nft = nftLookup[draft.rewardAssetId.toLowerCase()]
			return nft ? `${nft.name} × ${draft.rewardTokenPerUser || '1'}` : 'NFT reward'
		}
		return ''
	})()

	const expiryLabel = formatExpiryLabel(draft.expiresAtISO)

	// Metadata rows
	const metaRows: string[] = []
	if (draft.followUsername) metaRows.push(`Follow ${formatUsernameForDisplay(draft.followUsername)}`)
	if (draft.targetUsername) metaRows.push(`Target user: ${formatUsernameForDisplay(draft.targetUsername)}`)
	if (draft.targetFid) metaRows.push(`Target fid: #${draft.targetFid}`)
	if (draft.mentionUsername) metaRows.push(`Mention: ${formatUsernameForDisplay(draft.mentionUsername)}`)
	if (draft.frameUrl) metaRows.push(`Frame: ${draft.frameUrl}`)
	if (draft.castLink) metaRows.push(`Cast link: ${draft.castLink}`)
	if (draft.castContains) metaRows.push(`Cast must include: "${draft.castContains}"`)
	metaRows.push(`Reward mode: ${draft.rewardMode === 'points' ? `${draft.rewardPoints || '0'} pts` : rewardBadge || draft.rewardMode}`)
	metaRows.push(`Eligibility: ${draft.eligibilityMode === 'open' ? 'Open' : eligibilityBadge || 'Configured'}`)
	metaRows.push(`Max completions: ${draft.maxCompletions || 'Unlimited'}`)
	metaRows.push(`Raffle: ${draft.raffleEnabled ? `${draft.raffleStrategy} · ${draft.maxWinners || '1'} winners` : 'Disabled'}`)

	return {
		title,
		subtitle,
		description,
		chainLabel,
		questTypeLabel,
		questMode,
		eligibilityBadge,
		rewardBadge,
		partnerCopy,
		metaRows,
		expiryLabel,
		mediaPreview: draft.mediaPreview,
		mediaFileName: draft.mediaFileName,
	}
}
