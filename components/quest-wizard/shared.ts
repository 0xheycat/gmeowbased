import { CHAIN_LABEL, QUEST_TYPES, type ChainKey, type QuestFieldConfig } from '@/lib/gm-utils'

export type StepKey = 'basics' | 'eligibility' | 'rewards' | 'preview'

export type StepErrors = Partial<Record<string, string>>

export type StepValidationResult = {
	valid: boolean
	errors: StepErrors
}

export type TokenOption = {
	id: string
	address: string
	name: string
	symbol: string
	icon: string
	chain: ChainKey
	chainId: number
	decimals?: number | null
	balance?: string
	priceUsd?: number | null
	verified: boolean
}

export type NftOption = {
	id: string
	name: string
	collection: string
	image: string
	chain: ChainKey
	balance?: number
	floorPriceEth?: number | null
	verified: boolean
}

export type QuestDraft = {
	name: string
	headline: string
	description: string
	questTypeKey: keyof typeof QUEST_TYPES
	chain: ChainKey
	expiresAtISO: string
	followUsername: string
	frameUrl: string
	castLink: string
	mentionUsername: string
	target: string
	targetFid: string
	targetUsername: string
	castContains: string
	media: string
	mediaFileName?: string
	mediaPreview?: string
	eligibilityMode: 'open' | 'simple' | 'partner'
	eligibilityAssetType: 'token' | 'nft'
	eligibilityAssetId?: string | null
	eligibilityCollection: string
	eligibilityChainList: ChainKey[]
	eligibilityMinimum: string
	rewardMode: 'points' | 'token' | 'nft'
	rewardAssetId?: string | null
	rewardToken: string
	rewardPoints: string
	rewardTokenPerUser: string
	rewardTokenDepositTx: string
	rewardTokenDepositDetectedAtISO: string
	rewardTokenDepositAmount: string
	raffleEnabled: boolean
	raffleStrategy: 'blockhash' | 'farcaster'
	maxWinners: string
	maxCompletions: string
}

export const STEPS: Array<{ key: StepKey; label: string; description: string }> = [
	{ key: 'basics', label: 'Quest basics', description: 'Type, chain, expiry, campaign story, and media' },
	{ key: 'eligibility', label: 'Eligibility', description: 'Toggle open vs partner gates and pick verified assets' },
	{ key: 'rewards', label: 'Rewards', description: 'Choose points, ERC-20, or NFT rewards and raffle settings' },
	{ key: 'preview', label: 'Preview & publish', description: 'Review the generated metadata before shipping' },
]

export type TokenLookup = Record<string, TokenOption>
export type NftLookup = Record<string, NftOption>

export type AssetSnapshot<T> = {
	items: T[]
	warnings: string[]
	timestamp: number
}

export type VerificationStatus = 'idle' | 'pending' | 'success' | 'error'

export type QuestVerificationSuccess = {
	questTypeKey: string
	questTypeCode: number
	requirement: Record<string, unknown>
	meta: Record<string, unknown>
	castDetails: Record<string, unknown>
	traces: unknown[]
	durationMs: number
}

export type QuestVerificationState = {
	status: VerificationStatus
	lastKey: string | null
	data: QuestVerificationSuccess | null
	error: string | null
}

export const QUEST_TYPE_OPTIONS = Object.keys(QUEST_TYPES) as Array<keyof typeof QUEST_TYPES>
export const DEFAULT_QUEST_TYPE = (QUEST_TYPE_OPTIONS[0] ?? Object.keys(QUEST_TYPES)[0]) as keyof typeof QUEST_TYPES

export const EMPTY_DRAFT: QuestDraft = {
	name: '',
	headline: '',
	description: '',
	questTypeKey: DEFAULT_QUEST_TYPE,
	chain: 'base',
	expiresAtISO: '',
	followUsername: '',
	frameUrl: '',
	castLink: '',
	mentionUsername: '',
	target: '',
	targetFid: '',
	targetUsername: '',
	castContains: '',
	media: '',
	mediaFileName: undefined,
	mediaPreview: undefined,
	eligibilityMode: 'open',
	eligibilityAssetType: 'token',
	eligibilityAssetId: undefined,
	eligibilityCollection: '',
	eligibilityChainList: [],
	eligibilityMinimum: '1',
	rewardMode: 'points',
	rewardAssetId: undefined,
	rewardToken: '',
	rewardPoints: '25',
	rewardTokenPerUser: '0',
	rewardTokenDepositTx: '',
	rewardTokenDepositDetectedAtISO: '',
	rewardTokenDepositAmount: '',
	raffleEnabled: false,
	raffleStrategy: 'blockhash',
	maxWinners: '1',
	maxCompletions: '100',
}

export const DEFAULT_TOKEN_QUERY = ''
export const DEFAULT_NFT_QUERY = 'cats'
export const DEFAULT_CHAIN_FILTER = 'base,op,celo'
export const ASSET_SNAPSHOT_TTL_MS = 45_000

export type QuestTypeDetails = {
	label: string
	description: string
	tips?: string[]
}

export type QuestFieldKey = keyof Omit<QuestFieldConfig, 'mode'>

export const QUEST_TYPE_DETAILS: Record<keyof typeof QUEST_TYPES, QuestTypeDetails> = {
	GENERIC: {
		label: 'Custom onchain quest',
		description: 'Manual quest slot for bespoke onchain or social flows. Configure gating and rewards as needed.',
	},
	HOLD_ERC20: {
		label: 'Hold an ERC-20 balance',
		description: 'Claimer must hold the specified ERC-20 token amount across supported chains.',
		tips: ['Select the token in Eligibility and set the minimum balance claimers need.'],
	},
	HOLD_ERC721: {
		label: 'Hold an NFT',
		description: 'Claimer must hold the chosen ERC-721 collection or badge.',
		tips: ['Pick the collection in Eligibility and set how many tokens are required.'],
	},
	FARCASTER_FOLLOW: {
		label: 'Follow a Farcaster account',
		description: 'Claimer must follow the account you specify. Provide the @handle and optionally the FID for extra precision.',
		tips: ['Use the optional FID override if the username might change.', 'Follow quests auto-suggest the current mini-app user when available.'],
	},
	FARCASTER_RECAST: {
		label: 'Recast a target post',
		description: 'Claimer must recast the Warpcast post you link.',
		tips: ['Paste a Warpcast URL or the cast hash of the post to recast.'],
	},
	FARCASTER_REPLY: {
		label: 'Reply to a target post',
		description: 'Claimer must reply to the Warpcast post you provide.',
		tips: ['Replies can optionally be checked for required keywords using the cast text field.'],
	},
	FARCASTER_LIKE: {
		label: 'Like a target post',
		description: 'Claimer must like the Warpcast post you link.',
		tips: ['Provide a Warpcast URL or cast hash to anchor the like quest.'],
	},
	FARCASTER_CAST: {
		label: 'Cast with keywords',
		description: 'Claimer must publish a new cast that matches your keyword filters.',
		tips: ['Use the cast keyword field to require specific phrases, hashtags, or mentions.'],
	},
	FARCASTER_MENTION: {
		label: 'Mention an account in a cast',
		description: 'Claimer must publish a cast that mentions the selected Farcaster account.',
		tips: ['Provide the @handle that must be mentioned in the claimer’s cast.'],
	},
	FARCASTER_CHANNEL_POST: {
		label: 'Post inside a channel',
		description: 'Claimer must publish a cast inside the channel you reference.',
		tips: ['Use a channel cast URL so the quest can resolve the channel information.'],
	},
	FARCASTER_FRAME_INTERACT: {
		label: 'Interact with a frame',
		description: 'Claimer must trigger the provided Warpcast frame URL.',
		tips: ['Paste the frame URL exactly as it appears in Warpcast.', 'Frame interactions support future analytics in the dashboard.'],
	},
	FARCASTER_VERIFIED_USER: {
		label: 'Verified Farcaster account',
		description: 'Claimer must hold Farcaster’s verified checkmark. No additional fields are required.',
		tips: ['Use this quest to reward pilots who maintain a verified badge.'],
	},
}

export const QUEST_FIELD_DESCRIPTIONS: Record<QuestFieldKey, string> = {
	followHandle: '@handle for the follow target',
	frameUrl: 'Warpcast frame URL to interact with',
	castLink: 'Warpcast URL or cast hash that anchors the quest',
	castText: 'Keyword or phrase claimer’s cast must include',
	mentionHandle: '@handle that must be mentioned',
	targetHandle: 'Optional target username override',
	targetFid: 'Optional numeric FID override',
}

export const QUEST_FIELD_ORDER: QuestFieldKey[] = [
	'followHandle',
	'mentionHandle',
	'castLink',
	'castText',
	'frameUrl',
	'targetHandle',
	'targetFid',
]

export type DraftAction =
	| { type: 'merge'; patch: Partial<QuestDraft> }
	| { type: 'reset' }

export function draftReducer(state: QuestDraft, action: DraftAction): QuestDraft {
	switch (action.type) {
		case 'merge':
			return { ...state, ...action.patch }
		case 'reset':
			return { ...EMPTY_DRAFT }
		default:
			return state
	}
}

export type QuestSummary = {
	title: string
	subtitle: string
	description: string
	chainLabel: string
	questTypeLabel: string
	questMode: 'social' | 'onchain'
	eligibilityBadge: string
	rewardBadge: string
	partnerCopy: string | null
	metaRows: string[]
	expiryLabel: string
	mediaPreview?: string
	mediaFileName?: string
}

export function mergeChainLists(existing: ChainKey[], next: ChainKey): ChainKey[] {
	return existing.includes(next) ? existing : [...existing, next]
}

export function formatChainList(chains: ChainKey[]): string {
	if (!chains.length) return 'selected chain'
	return chains.map((chain) => CHAIN_LABEL[chain]).join(', ')
}

export function sanitizeNumericInput(value: string, options: { allowDecimals?: boolean } = {}): string {
	const trimmed = value.replace(/\s+/g, '')
	if (!options.allowDecimals) {
		return trimmed.replace(/[^\d]/g, '')
	}
	const cleaned = trimmed.replace(/[^\d.]/g, '')
	const [integerPart = '', ...rest] = cleaned.split('.')
	const decimals = rest.join('').replace(/\./g, '')
	let normalizedInt = integerPart.replace(/^0+(?=\d)/, '')
	if (!normalizedInt && decimals.length > 0) {
		normalizedInt = '0'
	}
	return decimals.length > 0 ? `${normalizedInt || '0'}.${decimals}` : normalizedInt
}

export function sanitizeUsernameInput(value: string): string {
	if (typeof value !== 'string') return ''
	return value.replace(/^@+/, '').trim().toLowerCase()
}

export function formatExpiryLabel(expiresAtISO: string): string {
	if (!expiresAtISO) return 'No expiry'
	const ts = new Date(expiresAtISO)
	if (Number.isNaN(ts.getTime())) return 'Invalid expiry'
	return ts.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function describeRelativeExpiry(expiresAtISO: string): string {
	if (!expiresAtISO) return 'Evergreen quest — no automatic shutdown'
	const ts = new Date(expiresAtISO)
	if (Number.isNaN(ts.getTime())) return 'Invalid expiry — update the selector above'
	const diffMs = ts.getTime() - Date.now()
	if (diffMs <= 0) return 'Expires immediately — choose a future window'
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
	const minutes = Math.ceil(diffMs / 60_000)
	if (minutes < 60) {
		return `Wraps ${rtf.format(minutes, 'minute')}`
	}
	const hours = Math.ceil(diffMs / 3_600_000)
	if (hours < 48) {
		return `Wraps ${rtf.format(hours, 'hour')}`
	}
	const days = Math.ceil(diffMs / 86_400_000)
	if (days < 14) {
		return `Wraps ${rtf.format(days, 'day')}`
	}
	const weeks = Math.ceil(days / 7)
	if (weeks < 12) {
		return `Wraps ${rtf.format(weeks, 'week')}`
	}
	const months = Math.ceil(days / 30)
	return `Wraps ${rtf.format(months, 'month')}`
}

export function makeFutureDate(options: { days?: number; hours?: number; alignToDayEnd?: boolean }): Date {
	const { days = 0, hours = 0, alignToDayEnd = false } = options
	const next = new Date()
	if (days) {
		next.setDate(next.getDate() + days)
	}
	if (hours) {
		next.setHours(next.getHours() + hours)
	}
	if (alignToDayEnd) {
		next.setHours(23, 59, 0, 0)
	} else {
		next.setSeconds(0, 0)
	}
	return next
}

export function toLocalDateTimeInputValue(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function formatUsd(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return '$—'
	const abs = Math.abs(value)
	const options = abs >= 1
		? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
		: { minimumFractionDigits: 2, maximumFractionDigits: 6 }
	return `$${value.toLocaleString(undefined, options)}`
}

export function formatEth(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return '—'
	return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ETH`
}

export function shortenAddress(address: string | null | undefined): string {
	if (!address) return ''
	const trimmed = address.trim()
	if (trimmed.length <= 10) return trimmed
	return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`
}

export function normalizeFid(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
		return value
	}
	if (typeof value === 'string') {
		const parsed = Number.parseInt(value, 10)
		return Number.isFinite(parsed) && parsed > 0 ? parsed : null
	}
	return null
}

export function formatFidLabel(value: unknown): string | null {
	const fid = normalizeFid(value)
	return fid ? `#${fid}` : null
}

const USERNAME_VALUE_REGEX = /^[a-z0-9_.-]{3,32}$/

export function isUsernameValid(value: string): boolean {
	if (!value) return false
	return USERNAME_VALUE_REGEX.test(value)
}

export function formatUsernameForDisplay(value: string): string {
	if (!value) return ''
	const sanitized = sanitizeUsernameInput(value)
	return sanitized ? `@${sanitized}` : ''
}

export function isValidHttpUrl(value: string): boolean {
	try {
		const url = new URL(value)
		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return false
	}
}

export function isCastHash(value: string): boolean {
	return /^0x[a-fA-F0-9]{10,}$/.test(value)
}

export function formatRelativeTimeFromNow(targetMs: number, nowMs = Date.now()): string {
	if (!Number.isFinite(targetMs)) return ''
	const diff = targetMs - nowMs
	const absDiff = Math.abs(diff)
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
	if (absDiff < 45_000) {
		return diff <= 0 ? 'moments ago' : 'in a few seconds'
	}
	if (absDiff < 3_600_000) {
		const minutes = Math.round(diff / 60_000)
		return rtf.format(minutes, 'minute')
	}
	if (absDiff < 86_400_000) {
		const hours = Math.round(diff / 3_600_000)
		return rtf.format(hours, 'hour')
	}
	if (absDiff < 14 * 86_400_000) {
		const days = Math.round(diff / 86_400_000)
		return rtf.format(days, 'day')
	}
	if (absDiff < 12 * 7 * 86_400_000) {
		const weeks = Math.round(diff / (7 * 86_400_000))
		return rtf.format(weeks, 'week')
	}
	const months = Math.round(diff / (30 * 86_400_000))
	return rtf.format(months, 'month')
}

export function toPositiveInt(value: string, fallback = 0): number {
	const parsed = Number.parseInt(value, 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function toPositiveFloat(value: string, fallback = 0): number {
	const parsed = Number.parseFloat(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function toIsoStringOrEmpty(value: string): string {
	if (!value) return ''
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function formatVerificationValue(value: unknown): string {
	if (value == null) return '—'
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	if (Array.isArray(value)) {
		return value
			.slice(0, 3)
			.map((entry) => formatVerificationValue(entry))
			.join(', ')
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).slice(0, 3)
		return entries
			.map(([key, val]) => `${key}:${formatVerificationValue(val)}`)
			.join(', ')
	}
	return String(value)
}

export type TokenEscrowPhase = 'missing' | 'insufficient' | 'awaiting-detection' | 'warming' | 'ready'

export type TokenEscrowStatus = {
	state: TokenEscrowPhase
	expectedPerUser: bigint
	expectedPerUserDisplay: string
	expectedTotal: bigint
	expectedTotalDisplay: string
	recordedTotal: bigint
	recordedTotalDisplay: string
	decimals: number
	symbol: string | null
	detectedAtMs: number | null
	readyAtMs: number | null
	missingFields: string[]
}
