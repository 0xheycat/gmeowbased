/**
 * Quest Wizard Types & Utilities
 * Extracted from old foundation (backups/pre-migration-20251126-213424)
 * 
 * Purpose: Provide types and utilities for quest-related hooks without
 * requiring the full quest-wizard component (which uses old UI).
 * 
 * Status: Logic extracted, ready for new Tailwick UI implementation
 */

import type { ChainKey } from '@/lib/gmeow-utils'

// =============================================================================
// STEP TYPES
// =============================================================================

export type StepKey = 'basics' | 'eligibility' | 'rewards' | 'preview'

export type StepErrors = Partial<Record<string, string>>

export type StepValidationResult = {
  valid: boolean
  errors: StepErrors
}

export const STEPS: Array<{ key: StepKey; label: string; description: string }> = [
  { key: 'basics', label: 'Quest basics', description: 'Type, chain, expiry, campaign story, and media' },
  { key: 'eligibility', label: 'Eligibility', description: 'Toggle open vs partner gates and pick verified assets' },
  { key: 'rewards', label: 'Rewards', description: 'Choose points, ERC-20, or NFT rewards and raffle settings' },
  { key: 'preview', label: 'Preview & publish', description: 'Review the generated metadata before shipping' },
]

// =============================================================================
// ASSET TYPES (for eligibility & rewards)
// =============================================================================

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

export type TokenLookup = Record<string, TokenOption>
export type NftLookup = Record<string, NftOption>

export type AssetSnapshot<T> = {
  items: T[]
  warnings: string[]
  timestamp: number
}

// =============================================================================
// QUEST DRAFT (form state)
// =============================================================================

export type QuestDraft = {
  // Basics
  name: string
  headline: string
  description: string
  questTypeKey: string
  chain: ChainKey
  expiresAtISO: string
  
  // Quest type specific fields
  followUsername: string
  frameUrl: string
  castLink: string
  mentionUsername: string
  target: string
  targetFid: string
  targetUsername: string
  castContains: string
  
  // Media
  media: string
  mediaFileName?: string
  mediaPreview?: string
  
  // Eligibility
  eligibilityMode: 'open' | 'simple' | 'partner'
  eligibilityAssetType: 'token' | 'nft'
  eligibilityAssetId?: string | null
  eligibilityCollection: string
  eligibilityChainList: ChainKey[]
  eligibilityMinimum: string
  
  // Rewards
  rewardMode: 'points' | 'token' | 'nft'
  rewardAssetId?: string | null
  rewardToken: string
  rewardPoints: string
  rewardTokenPerUser: string
  rewardTokenDepositTx: string
  rewardTokenDepositDetectedAtISO: string
  rewardTokenDepositAmount: string
  
  // Raffle
  raffleEnabled: boolean
  raffleStrategy: 'blockhash' | 'farcaster'
  maxWinners: string
  maxCompletions: string
}

export const EMPTY_DRAFT: QuestDraft = {
  name: '',
  headline: '',
  description: '',
  questTypeKey: 'follow',
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
  eligibilityAssetId: null,
  eligibilityCollection: '',
  eligibilityChainList: [],
  eligibilityMinimum: '0',
  rewardMode: 'points',
  rewardAssetId: null,
  rewardToken: '',
  rewardPoints: '10',
  rewardTokenPerUser: '0',
  rewardTokenDepositTx: '',
  rewardTokenDepositDetectedAtISO: '',
  rewardTokenDepositAmount: '0',
  raffleEnabled: false,
  raffleStrategy: 'blockhash',
  maxWinners: '1',
  maxCompletions: '0',
}

// =============================================================================
// DRAFT REDUCER (for useReducer)
// =============================================================================

export type DraftAction =
  | { type: 'UPDATE_FIELD'; field: keyof QuestDraft; value: any }
  | { type: 'UPDATE_MULTIPLE' | 'merge'; updates?: Partial<QuestDraft>; patch?: Partial<QuestDraft> }
  | { type: 'RESET' | 'reset'; draft?: QuestDraft }

export function draftReducer(state: QuestDraft, action: DraftAction): QuestDraft {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value }
    case 'UPDATE_MULTIPLE':
    case 'merge':
      return { ...state, ...(action.updates || action.patch || {}) }
    case 'RESET':
    case 'reset':
      return action.draft || EMPTY_DRAFT
    default:
      return state
  }
}

// =============================================================================
// VERIFICATION TYPES
// =============================================================================

export type VerificationStatus = 'idle' | 'pending' | 'success' | 'error'

export type QuestVerificationState = {
  status: VerificationStatus
  lastKey: string | null
  data: QuestVerificationSuccess | null
  error: string | null
}

export type QuestVerificationSuccess = {
  questId: string
  questTypeKey?: string
  questTypeCode?: number
  requirement?: Record<string, any>
  meta?: Record<string, any>
  castDetails?: Record<string, any>
  traces?: any[]
  durationMs?: number
  metadata: {
    name: string
    description: string
    image: string
    questType: string
    chain: ChainKey
    expiresAt: string
  }
}

// =============================================================================
// CONSTANTS (for asset catalog)
// =============================================================================

export const DEFAULT_TOKEN_QUERY = ''
export const DEFAULT_NFT_QUERY = ''
export const DEFAULT_CHAIN_FILTER = '' // Empty string for all chains
export const ASSET_SNAPSHOT_TTL_MS = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function normalizeFid(fid: number | string | null | undefined): number | null {
  if (fid === null || fid === undefined) return null
  const parsed = typeof fid === 'string' ? parseInt(fid, 10) : fid
  return isNaN(parsed) ? null : parsed
}

export function formatQuestType(typeKey: string): string {
  return typeKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function isValidFid(fid: any): boolean {
  const normalized = normalizeFid(fid)
  return normalized !== null && normalized > 0
}

export function sanitizeUsername(username: string): string {
  // Remove @ prefix if present
  return username.replace(/^@/, '').trim().toLowerCase()
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateStepBasics(draft: QuestDraft): StepValidationResult {
  const errors: StepErrors = {}
  
  if (!draft.name.trim()) {
    errors.name = 'Quest name is required'
  }
  
  if (!draft.headline.trim()) {
    errors.headline = 'Headline is required'
  }
  
  if (!draft.description.trim()) {
    errors.description = 'Description is required'
  }
  
  if (!draft.expiresAtISO) {
    errors.expiresAtISO = 'Expiration date is required'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateStepEligibility(draft: QuestDraft): StepValidationResult {
  const errors: StepErrors = {}
  
  if (draft.eligibilityMode === 'partner' && !draft.eligibilityAssetId) {
    errors.eligibilityAssetId = 'Please select an asset for partner eligibility'
  }
  
  if (draft.eligibilityMode === 'partner' && draft.eligibilityChainList.length === 0) {
    errors.eligibilityChainList = 'Please select at least one chain'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateStepRewards(draft: QuestDraft): StepValidationResult {
  const errors: StepErrors = {}
  
  if (draft.rewardMode === 'points') {
    const points = parseInt(draft.rewardPoints, 10)
    if (isNaN(points) || points <= 0) {
      errors.rewardPoints = 'Points must be a positive number'
    }
  }
  
  if (draft.rewardMode === 'token' && !draft.rewardAssetId) {
    errors.rewardAssetId = 'Please select a token for rewards'
  }
  
  if (draft.raffleEnabled) {
    const maxWinners = parseInt(draft.maxWinners, 10)
    if (isNaN(maxWinners) || maxWinners <= 0) {
      errors.maxWinners = 'Max winners must be a positive number'
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateStepPreview(draft: QuestDraft): StepValidationResult {
  // Preview step just aggregates previous validation
  const basicsValid = validateStepBasics(draft)
  const eligibilityValid = validateStepEligibility(draft)
  const rewardsValid = validateStepRewards(draft)
  
  return {
    valid: basicsValid.valid && eligibilityValid.valid && rewardsValid.valid,
    errors: {
      ...basicsValid.errors,
      ...eligibilityValid.errors,
      ...rewardsValid.errors,
    },
  }
}
