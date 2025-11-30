/**
 * Quest Wizard Validation
 * Form validation logic for all wizard steps
 */

import type {
	QuestDraft,
	StepErrors,
	StepValidationResult,
	TokenLookup,
	NftLookup,
	TokenEscrowStatus,
} from '@/components/quest-wizard/shared'
import {
	getQuestFieldConfig,
	normalizeQuestTypeKey,
} from '@/lib/gmeow-utils'
import {
	isCastHash,
	isUsernameValid,
	isValidHttpUrl,
	sanitizeUsernameInput,
} from '@/components/quest-wizard/shared'
import { parseTokenAmountToUnits } from '../utils/tokenMath'

export type ValidationContext = {
	tokenLookup: TokenLookup
	nftLookup: NftLookup
	tokenEscrowStatus: TokenEscrowStatus | null
}

/**
 * Validate all wizard steps at once
 */
export function validateAllSteps(
	draft: QuestDraft,
	context: ValidationContext
): Record<string, StepValidationResult> {
	return {
		basics: validateBasicsStep(draft),
		eligibility: validateEligibilityStep(draft, context),
		rewards: validateRewardsStep(draft, context),
		preview: { valid: true, errors: {} },
	}
}

/**
 * Validate Step 1: Basics (quest type, name, description, dynamic fields)
 */
export function validateBasicsStep(draft: QuestDraft): StepValidationResult {
	const errors: StepErrors = {}
	
	// Required: Quest title
	const title = draft.name.trim()
	if (!title) {
		errors.name = 'Enter a quest title before continuing.'
	}
	
	// Required: Quest description
	const description = draft.description.trim()
	if (!description) {
		errors.description = 'Add a short quest narrative to guide claimers.'
	}
	
	// Quest-type specific validation
	const questType = normalizeQuestTypeKey(draft.questTypeKey)
	const config = getQuestFieldConfig(questType)
	
	// Follow handle validation
	if (config.followHandle === 'required') {
		const follow = sanitizeUsernameInput(draft.followUsername)
		if (!follow) {
			errors.followUsername = 'Provide the @handle required for the follow quest.'
		} else if (!isUsernameValid(follow)) {
			errors.followUsername = 'Use a valid Farcaster username for the follow target.'
		}
	}
	
	// Frame URL validation
	if (config.frameUrl !== 'hidden') {
		const frameUrl = draft.frameUrl.trim()
		if (config.frameUrl === 'required' && !frameUrl) {
			errors.frameUrl = 'Paste the frame URL to proceed.'
		} else if (frameUrl && !isValidHttpUrl(frameUrl)) {
			errors.frameUrl = 'Use a valid https:// URL for the frame.'
		}
	}
	
	// Cast link validation
	if (config.castLink !== 'hidden') {
		const castLink = draft.castLink.trim()
		if (config.castLink === 'required' && !castLink) {
			errors.castLink = 'Link a Warpcast post or cast hash for this quest.'
		} else if (castLink && !isValidHttpUrl(castLink) && !isCastHash(castLink)) {
			errors.castLink = 'Enter a Warpcast URL or a valid 0x cast hash.'
		}
	}
	
	// Mention handle validation
	if (config.mentionHandle !== 'hidden') {
		const mention = sanitizeUsernameInput(draft.mentionUsername)
		if (config.mentionHandle === 'required' && !mention) {
			errors.mentionUsername = 'Provide the @handle that must be mentioned.'
		} else if (mention && !isUsernameValid(mention)) {
			errors.mentionUsername = 'Use a valid Farcaster username for the mention target.'
		}
	}
	
	// Target username validation
	if (config.targetHandle !== 'hidden') {
		const targetUsername = sanitizeUsernameInput(draft.targetUsername)
		if (config.targetHandle === 'required' && !targetUsername) {
			errors.targetUsername = 'Provide the target Farcaster handle.'
		} else if (targetUsername && !isUsernameValid(targetUsername)) {
			errors.targetUsername = 'Target username should be a valid Farcaster handle.'
		}
	}
	
	// Target FID validation
	if (config.targetFid !== 'hidden') {
		const targetFid = draft.targetFid.trim()
		if (config.targetFid === 'required' && !targetFid) {
			errors.targetFid = 'Target fid is required for this quest.'
		} else if (targetFid && !/^[0-9]+$/.test(targetFid)) {
			errors.targetFid = 'Target fid must contain only digits.'
		}
	}
	
	return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Validate Step 2: Eligibility (gating requirements)
 */
export function validateEligibilityStep(
	draft: QuestDraft,
	context: ValidationContext
): StepValidationResult {
	const errors: StepErrors = {}
	
	// Open eligibility requires no validation
	if (draft.eligibilityMode === 'open') {
		return { valid: true, errors }
	}
	
	// Asset ID validation
	const assetId = draft.eligibilityAssetId?.trim()
	if (!assetId) {
		errors.eligibilityAssetId = 'Select a token or NFT collection to gate this quest.'
	} else if (draft.eligibilityAssetType === 'token' && !context.tokenLookup[assetId.toLowerCase()]) {
		errors.eligibilityAssetId = 'The selected token is no longer available. Choose another asset.'
	} else if (draft.eligibilityAssetType === 'nft' && !context.nftLookup[assetId.toLowerCase()]) {
		errors.eligibilityAssetId = 'The selected collection is no longer available. Pick a new NFT gate.'
	}
	
	// Minimum balance validation
	const minimumValue = Number.parseFloat(draft.eligibilityMinimum)
	if (!Number.isFinite(minimumValue) || minimumValue <= 0) {
		errors.eligibilityMinimum = 'Set a positive minimum balance to activate the gate.'
	}
	
	// Partner mode chain validation
	if (draft.eligibilityMode === 'partner' && draft.eligibilityChainList.length === 0) {
		errors.eligibilityChainList = 'Choose at least one partner chain for the gate.'
	}
	
	return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Validate Step 3: Rewards (points, tokens, NFTs, escrow)
 */
export function validateRewardsStep(
	draft: QuestDraft,
	context: ValidationContext
): StepValidationResult {
	const errors: StepErrors = {}
	
	// Max completions validation (required for all reward types)
	const completionsValue = Number.parseInt(draft.maxCompletions, 10)
	if (!Number.isFinite(completionsValue) || completionsValue <= 0) {
		errors.maxCompletions = 'Limit the number of completions with a value greater than zero.'
	}
	
	// Reward mode: Points
	if (draft.rewardMode === 'points') {
		const pointsValue = Number.parseInt(draft.rewardPoints, 10)
		if (!Number.isFinite(pointsValue) || pointsValue <= 0) {
			errors.rewardPoints = 'Award at least one point per claimer.'
		}
	}
	
	// Reward mode: ERC-20 Token
	else if (draft.rewardMode === 'token') {
		const assetId = draft.rewardAssetId?.trim()
		const token = assetId ? context.tokenLookup[assetId.toLowerCase()] : undefined
		
		// Asset selection
		if (!assetId) {
			errors.rewardAssetId = 'Choose an asset to distribute as a reward.'
		} else if (!token) {
			errors.rewardAssetId = 'The selected token is no longer available. Choose another reward.'
		}
		
		// Per-user amount
		const perUserValue = Number.parseFloat(draft.rewardTokenPerUser)
		if (!Number.isFinite(perUserValue) || perUserValue <= 0) {
			errors.rewardTokenPerUser = 'Send more than zero tokens per claimer.'
		}
		
		// Escrow transaction hash
		const depositTx = draft.rewardTokenDepositTx.trim()
		if (!depositTx) {
			errors.rewardTokenDepositTx = 'Add the funding transaction hash before continuing.'
		}
		
		// Escrow amount validation
		const decimals = typeof token?.decimals === 'number' && Number.isFinite(token.decimals)
			? Math.trunc(token.decimals)
			: 18
		const depositAmountRaw = draft.rewardTokenDepositAmount.trim()
		if (!depositAmountRaw) {
			errors.rewardTokenDepositAmount = 'Record the escrow amount exactly as sent onchain.'
		} else {
			const depositUnits = parseTokenAmountToUnits(depositAmountRaw, decimals)
			if (depositUnits == null || depositUnits <= 0n) {
				errors.rewardTokenDepositAmount = 'Use a positive ERC-20 amount to match the escrow transfer.'
			}
		}
		
		// Detection timestamp
		const depositDetectedRaw = draft.rewardTokenDepositDetectedAtISO.trim()
		if (!depositDetectedRaw) {
			errors.rewardTokenDepositDetectedAtISO = 'Stamp when the automation queue detected the transfer.'
		} else if (Number.isNaN(Date.parse(depositDetectedRaw))) {
			errors.rewardTokenDepositDetectedAtISO = 'Provide a valid ISO timestamp for detection.'
		}
		
		// Escrow status-specific errors
		const escrowStatus = context.tokenEscrowStatus
		if (escrowStatus) {
			if (escrowStatus.state === 'insufficient' && !errors.rewardTokenDepositAmount) {
				const symbol = escrowStatus.symbol ? ` ${escrowStatus.symbol}` : ''
				errors.rewardTokenDepositAmount = `Deposit at least ${escrowStatus.expectedTotalDisplay}${symbol} to cover all claimers.`
			}
			if (escrowStatus.state === 'awaiting-detection' && !errors.rewardTokenDepositDetectedAtISO) {
				errors.rewardTokenDepositDetectedAtISO = 'Detection pending — update the timestamp once indexed.'
			}
			if (escrowStatus.state === 'missing') {
				if (escrowStatus.missingFields.includes('tx') && !errors.rewardTokenDepositTx) {
					errors.rewardTokenDepositTx = 'Add the funding transaction hash before continuing.'
				}
				if (escrowStatus.missingFields.includes('amount') && !errors.rewardTokenDepositAmount) {
					errors.rewardTokenDepositAmount = 'Record the escrow amount exactly as sent onchain.'
				}
				if (escrowStatus.missingFields.includes('detectedAt') && !errors.rewardTokenDepositDetectedAtISO) {
					errors.rewardTokenDepositDetectedAtISO = 'Stamp when the automation queue detected the transfer.'
				}
			}
		}
	}
	
	// Reward mode: NFT
	else {
		const assetId = draft.rewardAssetId?.trim()
		if (!assetId) {
			errors.rewardAssetId = 'Choose an asset to distribute as a reward.'
		} else if (!context.nftLookup[assetId.toLowerCase()]) {
			errors.rewardAssetId = 'The selected collection disappeared. Pick a new NFT reward.'
		}
		
		const perUserValue = Number.parseFloat(draft.rewardTokenPerUser)
		if (!Number.isFinite(perUserValue) || perUserValue <= 0) {
			errors.rewardTokenPerUser = 'Distribute at least one NFT per claimer.'
		}
	}
	
	// Raffle validation
	if (draft.raffleEnabled) {
		const maxWinners = Number.parseInt(draft.maxWinners, 10)
		if (!Number.isFinite(maxWinners) || maxWinners <= 0) {
			errors.maxWinners = 'Specify how many winners the raffle should select.'
		} else if (Number.isFinite(completionsValue) && completionsValue > 0 && maxWinners > completionsValue) {
			errors.maxWinners = 'Raffle winners cannot exceed the total completion cap.'
		}
	}
	
	return { valid: Object.keys(errors).length === 0, errors }
}
