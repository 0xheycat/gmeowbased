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
	QUEST_TYPE_DETAILS,
	formatChainList,
	formatExpiryLabel,
	formatUsernameForDisplay,
	isCastHash,
	isValidHttpUrl,
	sanitizeUsernameInput,
	toIsoStringOrEmpty,
	toPositiveFloat,
	toPositiveInt,
} from '@/components/quest-wizard/shared'
import { getQuestFieldConfig, CHAIN_LABEL, normalizeQuestTypeKey, QUEST_TYPES } from '@/lib/gmeow-utils'
import { parseTokenAmountToUnits, formatTokenAmountFromUnits } from './utils/tokenMath'
import { sanitizePositiveNumberInput } from './utils/sanitizers'

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

/**
 * Build verification payload for /api/quests/verify endpoint
 * Assembles all quest data into structured format for backend validation
 */
export function buildVerificationPayload(
	draft: QuestDraft,
	lookups: {
		tokenLookup: TokenLookup
		nftLookup: NftLookup
	},
) {
	const questTypeKeyRaw = normalizeQuestTypeKey(draft.questTypeKey)
	const actionCode = QUEST_TYPES[questTypeKeyRaw] ?? 0
	const questMode = deriveQuestModeFromKey(questTypeKeyRaw)
	
	// Cast identification
	const castInput = draft.castLink.trim()
	const castIdentifier = castInput
	const castUrl = isValidHttpUrl(castInput) ? castInput : ''
	const castHash = isCastHash(castInput) ? castInput : ''
	const frameUrl = draft.frameUrl.trim()
	const castContains = draft.castContains.trim()
	
	// Target identification
	const sanitizedFollow = sanitizeUsernameInput(draft.followUsername)
	const sanitizedTargetUsername = sanitizeUsernameInput(draft.targetUsername || draft.target)
	const sanitizedMention = sanitizeUsernameInput(draft.mentionUsername)
	const targetFidNum = Number.parseInt(draft.targetFid, 10)
	const questTarget = Number.isFinite(targetFidNum) && targetFidNum > 0 ? targetFidNum : undefined

	// Collect candidate identifiers
	const candidateFids = new Set<number>()
	if (questTarget) candidateFids.add(questTarget)

	const candidateUsernames = new Set<string>()
	if (sanitizedFollow) candidateUsernames.add(sanitizedFollow)
	if (sanitizedTargetUsername) candidateUsernames.add(sanitizedTargetUsername)

	// Eligibility assets
	const eligibilityToken =
		draft.eligibilityAssetType === 'token' && draft.eligibilityAssetId
			? lookups.tokenLookup[draft.eligibilityAssetId.toLowerCase()]
			: undefined
	const eligibilityNft =
		draft.eligibilityAssetType === 'nft' && draft.eligibilityAssetId
			? lookups.nftLookup[draft.eligibilityAssetId.toLowerCase()]
			: undefined

	let gateKind: string | undefined
	let gateAsset: string | undefined
	if (draft.eligibilityMode !== 'open' && draft.eligibilityAssetId) {
		gateKind = draft.eligibilityAssetType === 'token' ? 'erc20' : 'erc721'
		gateAsset = draft.eligibilityAssetId
	}

	const minAmountInput = gateKind
		? sanitizePositiveNumberInput(draft.eligibilityMinimum, gateKind === 'erc20' ? '1' : '1')
		: ''

	const eligibilityChains =
		draft.eligibilityMode === 'partner' && draft.eligibilityChainList.length
			? draft.eligibilityChainList
			: gateKind === 'erc20' && eligibilityToken
				? [eligibilityToken.chain]
				: gateKind === 'erc721' && eligibilityNft
					? [eligibilityNft.chain]
					: draft.eligibilityChainList.length
						? draft.eligibilityChainList
						: []

	// Reward values
	const rewardPointsValue = toPositiveInt(draft.rewardPoints, 1)
	const rewardTokenPerUserValue = toPositiveFloat(draft.rewardTokenPerUser, 0)
	const maxCompletionsValue = toPositiveInt(draft.maxCompletions, 0)
	const raffleWinnersValue = toPositiveInt(draft.maxWinners, 0)

	const rewardTokenOption =
		draft.rewardMode === 'token' && draft.rewardAssetId
			? lookups.tokenLookup[draft.rewardAssetId.toLowerCase()]
			: undefined
	const rewardNftOption =
		draft.rewardMode === 'nft' && draft.rewardAssetId
			? lookups.nftLookup[draft.rewardAssetId.toLowerCase()]
			: undefined

	// Build reward metadata
	const rewardMeta: Record<string, any> = {
		kind: draft.rewardMode,
		pointsPerUser: rewardPointsValue,
		token: draft.rewardMode === 'token' ? draft.rewardAssetId || '' : '',
		tokenPerUser: draft.rewardMode === 'token' ? rewardTokenPerUserValue : 0,
	}

	if (rewardTokenOption && draft.rewardMode === 'token') {
		rewardMeta.tokenMetadata = {
			address: rewardTokenOption.address,
			symbol: rewardTokenOption.symbol,
			name: rewardTokenOption.name,
			chain: rewardTokenOption.chain,
			chainId: rewardTokenOption.chainId,
			decimals: rewardTokenOption.decimals ?? null,
			icon: rewardTokenOption.icon,
			verified: rewardTokenOption.verified,
		}
	}

	if (draft.rewardMode === 'nft') {
		const itemsPerUser = rewardTokenPerUserValue > 0 ? rewardTokenPerUserValue : 1
		rewardMeta.collection = draft.rewardAssetId || ''
		rewardMeta.itemsPerUser = itemsPerUser
		if (rewardNftOption) {
			rewardMeta.nftMetadata = {
				address: rewardNftOption.id,
				name: rewardNftOption.name,
				collection: rewardNftOption.collection,
				image: rewardNftOption.image,
				chain: rewardNftOption.chain,
				verified: rewardNftOption.verified,
			}
		}
	}

	// Build eligibility metadata
	const eligibilityMeta: Record<string, any> = {
		mode: draft.eligibilityMode,
	}

	if (gateKind && gateAsset) {
		eligibilityMeta.kind = gateKind
		eligibilityMeta.asset = gateAsset
		eligibilityMeta.minimum = minAmountInput || '1'
		eligibilityMeta.assetType = draft.eligibilityAssetType
		eligibilityMeta.validation = 'draft'
		eligibilityMeta.detectedStandard = gateKind
		if (draft.eligibilityCollection) eligibilityMeta.collection = draft.eligibilityCollection
		if (eligibilityChains.length) eligibilityMeta.chainList = eligibilityChains
		if (draft.eligibilityMode === 'partner') eligibilityMeta.partner = true
		if (eligibilityToken) {
			eligibilityMeta.token = {
				address: eligibilityToken.address,
				symbol: eligibilityToken.symbol,
				name: eligibilityToken.name,
				chain: eligibilityToken.chain,
				chainId: eligibilityToken.chainId,
				decimals: eligibilityToken.decimals ?? null,
				icon: eligibilityToken.icon,
				verified: eligibilityToken.verified,
			}
		}
		if (eligibilityNft) {
			eligibilityMeta.nft = {
				address: eligibilityNft.id,
				name: eligibilityNft.name,
				collection: eligibilityNft.collection,
				image: eligibilityNft.image,
				chain: eligibilityNft.chain,
				verified: eligibilityNft.verified,
			}
		}
	} else {
		eligibilityMeta.kind = 'open'
		eligibilityMeta.validation = 'open'
	}

	// Build follow metadata
	const candidateFidsArr = Array.from(candidateFids)
	const candidateUsernamesArr = Array.from(candidateUsernames)
	const followMeta: Record<string, any> = {}
	if (questTarget) followMeta.targetFid = questTarget
	if (sanitizedFollow) followMeta.targetUsername = sanitizedFollow
	else if (sanitizedTargetUsername) followMeta.targetUsername = sanitizedTargetUsername
	if (followMeta.targetUsername) followMeta.target = followMeta.targetUsername
	if (candidateUsernamesArr.length) followMeta.candidateUsernames = candidateUsernamesArr
	if (candidateFidsArr.length) followMeta.candidateFids = candidateFidsArr

	// Basic quest data
	const sanitizedName = draft.name.trim()
	const sanitizedHeadline = draft.headline.trim()
	const sanitizedDescription = draft.description.trim()
	const expiresAtIso = toIsoStringOrEmpty(draft.expiresAtISO)
	const mediaUrl = (draft.mediaPreview || draft.media || '').trim()

	// Assemble final payload
	const meta: Record<string, any> = {
		v: 1,
		questTypeKey: questTypeKeyRaw,
		type: questMode,
		chain: draft.chain,
		reward: rewardMeta,
		eligibility: eligibilityMeta,
		limits: { maxCompletions: maxCompletionsValue },
		raffle: draft.raffleEnabled
			? {
				enabled: true,
				strategy: draft.raffleStrategy,
				winners: raffleWinnersValue || 1,
			}
			: { enabled: false },
	}

	if (sanitizedName) meta.name = sanitizedName
	if (sanitizedHeadline) meta.headline = sanitizedHeadline
	if (sanitizedDescription) meta.description = sanitizedDescription
	if (mediaUrl) meta.media = mediaUrl
	if (draft.mediaFileName) meta.mediaFileName = draft.mediaFileName
	if (expiresAtIso) meta.expiresAtISO = expiresAtIso
	if (castIdentifier) meta.castIdentifier = castIdentifier
	if (castUrl) meta.castUrl = castUrl
	if (castHash) meta.castHash = castHash
	if (sanitizedMention) meta.mentionUser = sanitizedMention
	if (frameUrl) meta.frameUrl = frameUrl
	if (castContains) meta.castContains = castContains
	if (candidateUsernamesArr.length) meta.candidateTargetUsernames = candidateUsernamesArr
	if (candidateFidsArr.length) meta.candidateTargetFids = candidateFidsArr
	if (sanitizedTargetUsername) meta.targetUsername = sanitizedTargetUsername
	if (questTarget) meta.targetFid = questTarget
	if (Object.keys(followMeta).length) meta.follow = followMeta

	return {
		draft: true,
		questTypeKey: questTypeKeyRaw,
		actionCode,
		meta: JSON.stringify(meta),
		chain: draft.chain,
	}
}
