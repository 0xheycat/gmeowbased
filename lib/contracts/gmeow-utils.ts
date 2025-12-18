/**
 * @file lib/contracts/gmeow-utils.ts
 * @description Core contract utilities, ABIs, addresses, and transaction builders for Gmeowbased
 * 
 * PHASE: Phase 7.1 - Contracts (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ⚠️ IMPORTANT: Multi-Chain Architecture Documentation
 * 
 * This file contains TWO distinct chain type systems:
 * 
 * 1️⃣ GMChainKey (ACTIVE - WRITE OPERATIONS ONLY)
 *    - Type: 'base' only
 *    - Purpose: All contract write operations (GM, Guild, NFT, Badge, Referral)
 *    - Deployment: Base chain (December 12, 2025)
 *    - Contracts: STANDALONE_ADDRESSES.base.*
 *    - Usage: Use this for ANY contract interaction that modifies state
 * 
 * 2️⃣ ChainKey (VIEW-ONLY - BLOCKSCOUT MCP)
 *    - Type: 'base' | 'ethereum' | 'optimism' | ... (12 chains)
 *    - Purpose: OnchainStats frame VIEWING ONLY via Blockscout MCP
 *    - Access: Blockscout API (FREE, $0/month)
 *    - Usage: ONLY for reading blockchain data in OnchainStats frame
 *    - ⛔ DO NOT use for contract writes - they will fail!
 * 
 * 📍 Quick Reference:
 * - Writing to contracts? → Use GMChainKey ('base' only)
 * - Reading from other chains? → Use ChainKey (12 chains via Blockscout)
 * - Default chain for app? → Base (8453)
 * 
 * FEATURES:
 *   - Dual chain type system (GMChainKey for writes, ChainKey for views)
 *   - Complete contract address registry (Core, Guild, NFT, Badge, Referral)
 *   - Transaction builder functions for all contract operations
 *   - ABI utilities and function encoding helpers
 *   - Contract event definitions and parsing
 *   - Type-safe transaction parameter handling
 *   - ERC20/ERC721 standard support
 * 
 * REFERENCE DOCUMENTATION:
 *   - Migration docs: docs/migration/BLOCKSCOUT-CHAIN-SUPPORT-COMPLETE.md
 *   - Contract source: /contract/ directory (Foundry project)
 *   - BaseScan verification: https://basescan.org
 *   - ABIs: lib/contracts/abis.ts
 *   - Blockscout MCP: Tools for multi-chain viewing
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (8453) for all writes
 *   - Contracts verified on BaseScan (December 12, 2025)
 *   - All transactions must use GMChainKey type
 *   - View-only operations can use ChainKey for 12 chains
 *   - NO EMOJIS in transaction data
 * 
 * TODO:
 *   - [ ] Add transaction simulation before sending
 *   - [ ] Add gas estimation utilities with buffer multipliers
 *   - [ ] Add transaction retry logic with exponential backoff
 *   - [ ] Add contract upgrade detection and version tracking
 *   - [ ] Add ABI change detection vs deployed contracts
 *   - [ ] Add contract method deprecation warnings
 *   - [ ] Add transaction batching utilities for multiple calls
 *   - [ ] Add contract interaction analytics (usage tracking)
 * 
 * CRITICAL:
 *   - GMChainKey ONLY supports 'base' - do not add other chains without deployment
 *   - ChainKey is VIEW-ONLY - writing to non-base chains will fail
 *   - STANDALONE_ADDRESSES.base.* are production addresses (handle with care)
 *   - All contract addresses verified on BaseScan December 12, 2025
 *   - Transaction builders encode parameters - validate inputs before calling
 *   - Contract ABIs must match deployed bytecode exactly
 *   - Changes to GMChainKey type require contract redeployment
 * 
 * SUGGESTIONS:
 *   - Cache public clients for better performance
 *   - Add contract method gas cost estimates
 *   - Add transaction parameter validation before encoding
 *   - Add contract state caching for frequently accessed data
 *   - Generate TypeScript types from ABIs automatically
 *   - Add contract interaction logging for debugging
 *   - Add multi-call support for batch reads
 * 
 * AVOID:
 *   - Using ChainKey for contract writes (will fail, no contracts deployed)
 *   - Hardcoding contract addresses (use STANDALONE_ADDRESSES)
 *   - Modifying GMChainKey without deploying to new chains
 *   - Using deprecated multichain functions (marked with warnings)
 *   - Sending transactions without gas estimation
 *   - Using old proxy addresses (use standalone addresses only)
 *   - Mixing GMChainKey and ChainKey in same function signatures
 * 
 * @module lib/gmeow-utils
 * @see docs/migration/BLOCKSCOUT-CHAIN-SUPPORT-COMPLETE.md
 * @verified BaseScan December 12, 2025
 */

import {
  encodeFunctionData,
  parseEther,
  http,
  erc20Abi,
  erc721Abi,
  type Abi,
  type AbiFunction,
  type Address,
} from 'viem'
import { base } from 'viem/chains'
import { trackWarning } from '@/lib/notifications/error-tracking'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'

// Import ABIs from centralized source (single source of truth)
import {
  GM_CONTRACT_ABI,
  CORE_ABI,
  GUILD_ABI,
  NFT_ABI,
  BADGE_ABI,
  REFERRAL_ABI,
} from '@/lib/contracts/abis'

// ========================================
// CHAIN TYPE DEFINITIONS
// ========================================

/**
 * GMChainKey - Active Chain for Contract Operations
 * 
 * ✅ USE THIS FOR:
 * - All contract write operations (createGM, joinGuild, mintNFT, etc.)
 * - Reading from our deployed contracts
 * - Transaction creation and signing
 * - Contract state modifications
 * 
 * 🚫 RESTRICTIONS:
 * - Only 'base' is supported
 * - No other chains have deployed contracts
 * - All write operations MUST use this type
 * 
 * @example
 * ```typescript
 * // Correct usage
 * const chain: GMChainKey = 'base'
 * const address = STANDALONE_ADDRESSES[chain].core
 * await createGMTransaction(address, ...)
 * ```
 */
export type GMChainKey = 'base'

/**
 * ChainKey - View-Only Chain Support (Blockscout MCP)
 * 
 * ✅ USE THIS FOR:
 * - OnchainStats frame (viewing stats on multiple chains)
 * - Reading blockchain data via Blockscout API
 * - Cross-chain balance checking (view-only)
 * - Historical data queries
 * 
 * 🚫 DO NOT USE FOR:
 * - Contract write operations (will fail - no contracts deployed)
 * - Transaction creation
 * - State modifications
 * - Minting, claiming, or any contract interactions
 * 
 * 💡 IMPLEMENTATION:
 * - Access via Blockscout MCP (Model Context Protocol)
 * - FREE tier: $0/month for 12 chains
 * - Read-only API access
 * 
 * @example
 * ```typescript
 * // Correct usage (OnchainStats frame only)
 * const chain: ChainKey = 'ethereum'
 * const stats = await fetchOnchainStatsViaBlockscout(chain, address)
 * 
 * // WRONG - will fail!
 * await createGMTransaction(chain, ...) // ❌ No contracts on ethereum
 * ```
 */
export type ChainKey = 
  | 'base'       // Base (8453) - Our active chain
  | 'ethereum'   // Ethereum (1) - View-only
  | 'optimism'   // OP Mainnet (10) - View-only
  | 'arbitrum'   // Arbitrum One (42161) - View-only
  | 'polygon'    // Polygon PoS (137) - View-only
  | 'gnosis'     // Gnosis (100) - View-only
  | 'celo'       // Celo (42220) - View-only
  | 'scroll'     // Scroll (534352) - View-only
  | 'unichain'   // Unichain (130) - View-only
  | 'soneium'    // Soneium (1868) - View-only
  | 'zksync'     // zkSync Era (324) - View-only
  | 'zora'       // Zora (7777777) - View-only
  | 'op'         // Alias for optimism - View-only

/**
 * Active Chain IDs - Base Only
 * 
 * Chain IDs for chains where we have deployed contracts.
 * Use this for all contract operations.
 * 
 * @constant
 */
export const CHAIN_IDS: Record<GMChainKey, number> = {
  base: 8453,
}

/**
 * All Chain IDs - View-Only Support
 * 
 * Complete chain ID registry for Blockscout MCP read-only access.
 * 
 * ⚠️ WARNING: Only 'base' has deployed contracts!
 * All other chains are VIEW-ONLY via Blockscout API.
 * 
 * Used exclusively by:
 * - OnchainStats frame (app/frames/onchain-stats)
 * - Cross-chain balance viewing
 * - Historical data queries
 * 
 * Cost: FREE ($0/month) | Coverage: 12 chains | Quality: Perfect
 * 
 * @constant
 * @see docs/migration/BLOCKSCOUT-CHAIN-SUPPORT-COMPLETE.md
 */
export const ALL_CHAIN_IDS: Record<ChainKey, number> = {
  base: 8453,
  ethereum: 1,
  optimism: 10,
  op: 10, // Alias for optimism
  arbitrum: 42161,
  polygon: 137,
  gnosis: 100,
  celo: 42220,
  scroll: 534352,
  unichain: 130,
  soneium: 1868,
  zksync: 324,
  zora: 7777777,
}

/**
 * Core Contract Addresses - Base Chain Only
 * 
 * Main entry point for contract interactions.
 * 
 * @constant
 * @verified BaseScan December 12, 2025
 */
export const CONTRACT_ADDRESSES: Record<GMChainKey, `0x${string}`> = {
  base: (process.env.NEXT_PUBLIC_GM_BASE_CORE as `0x${string}`) || '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73',
}

/**
 * Standalone Architecture Addresses - Base Chain Only
 * 
 * Complete contract suite for Gmeowbased platform.
 * Deployed: December 12, 2025
 * 
 * Architecture:
 * - Core: Main GM contract (user stats, history)
 * - Guild: Guild management and membership
 * - NFT: NFT minting and ownership
 * - Badge: Badge system and achievements
 * - Referral: Referral tracking and rewards
 * 
 * ⚠️ IMPORTANT: Only Base chain is supported for writes!
 * 
 * @constant
 * @verified BaseScan https://basescan.org/
 */
export const STANDALONE_ADDRESSES = {
  base: {
    core: (process.env.NEXT_PUBLIC_GM_BASE_CORE as `0x${string}`) || '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73',
    guild: (process.env.NEXT_PUBLIC_GM_BASE_GUILD as `0x${string}`) || '0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3',
    nft: (process.env.NEXT_PUBLIC_GM_BASE_NFT as `0x${string}`) || '0xCE9596a992e38c5fa2d997ea916a277E0F652D5C',
    badge: (process.env.NEXT_PUBLIC_GM_BASE_BADGE as `0x${string}`) || '0x5Af50Ee323C45564d94B0869d95698D837c59aD2',
    referral: (process.env.NEXT_PUBLIC_GM_BASE_REFERRAL as `0x${string}`) || '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44',
   // proxy: (process.env.NEXT_PUBLIC_GM_BASE_PROXY as `0x${string}`) || '0x', // GM Proxy Contract deprecated latest update dec 9 standalone fix
  },
}

export const GM_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.base
export const getContractAddress = (chain: GMChainKey = 'base') => CONTRACT_ADDRESSES[chain]

// Re-export ABIs from centralized source (already imported above)
// All verified on BaseScan: https://basescan.org (Dec 11, 2025)
export {
  GM_CONTRACT_ABI,
  CORE_ABI,
  GUILD_ABI,
  NFT_ABI,
  BADGE_ABI,
  REFERRAL_ABI,
}
export const ERC721_ABI = erc721Abi as unknown as Abi

// Helper to get correct ABI based on chain
// All chains now use standalone architecture with same ABI
export function getCoreABI(): Abi {
  return CORE_ABI
}

export function getGuildABI(): Abi {
  return GUILD_ABI
}

export function getNFTABI(): Abi {
  return NFT_ABI
}

export function getReferralABI(): Abi {
  return REFERRAL_ABI
}

// Helper to get contract address by type
export function getGuildAddress(chain: GMChainKey = 'base'): `0x${string}` {
  return STANDALONE_ADDRESSES[chain].guild
}

export function getNFTAddress(chain: GMChainKey = 'base'): `0x${string}` {
  return STANDALONE_ADDRESSES[chain].nft
}

//export function getProxyAddress(chain: GMChainKey = 'base'): `0x${string}` {
 // return STANDALONE_ADDRESSES[chain].proxy
//}

export function getCoreAddress(chain: GMChainKey = 'base'): `0x${string}` {
  return STANDALONE_ADDRESSES[chain].core
}

export function getReferralAddress(chain: GMChainKey = 'base'): `0x${string}` {
  return STANDALONE_ADDRESSES[chain].referral
}

// GM contract chains only
const CHAIN_ID_LOOKUP = new Map<number, GMChainKey>(
  Object.entries(CHAIN_IDS).map(([key, value]) => [value, key as GMChainKey]),
)

// All supported chains (for validation)
export const ALL_CHAIN_KEYS = Object.keys(ALL_CHAIN_IDS) as ChainKey[]

// Simplified chain aliases (Base-focused, others for OnchainStats viewing only)
// BLOCKSCOUT-ONLY: All aliases map to Blockscout-supported chains
const CHAIN_ALIAS_LOOKUP: Record<string, ChainKey> = {
  // Base
  base: 'base',
  'base-mainnet': 'base',
  'coinbase-base': 'base',
  // Ethereum
  ethereum: 'ethereum',
  eth: 'ethereum',
  'ethereum-mainnet': 'ethereum',
  // Optimism
  op: 'optimism',
  optimism: 'optimism',
  'optimism-mainnet': 'optimism',
  'op-mainnet': 'optimism',
  // Arbitrum
  arbitrum: 'arbitrum',
  arb: 'arbitrum',
  'arbitrum-one': 'arbitrum',
  // Polygon
  polygon: 'polygon',
  pol: 'polygon',
  matic: 'polygon',
  // Gnosis
  gnosis: 'gnosis',
  xdai: 'gnosis',
  // Celo
  celo: 'celo',
  'celo-mainnet': 'celo',
  // Scroll
  scroll: 'scroll',
  // Unichain
  unichain: 'unichain',
  uni: 'unichain',
  // Soneium
  soneium: 'soneium',
  // zkSync
  zksync: 'zksync',
  'zksync-era': 'zksync',
  // Zora
  zora: 'zora',
}

const HEX_ID_REGEX = /^0x[0-9a-f]+$/i

const toNumericChainId = (value: string): number | null => {
  if (!value) return null
  if (/^\d+$/.test(value)) {
    const num = Number.parseInt(value, 10)
    return Number.isFinite(num) ? num : null
  }
  if (HEX_ID_REGEX.test(value)) {
    const num = Number.parseInt(value, 16)
    return Number.isFinite(num) ? num : null
  }
  return null
}

export function normalizeChainKey(input: unknown): ChainKey | null {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return null
    const lower = trimmed.toLowerCase()
    // Check if it's a direct chain key match
    if (ALL_CHAIN_KEYS.includes(lower as ChainKey)) return lower as ChainKey
    const alias = CHAIN_ALIAS_LOOKUP[lower]
    if (alias) return alias
    // Only GM chains have contracts, so only lookup those by numeric ID
    const numId = toNumericChainId(trimmed)
    if (numId != null) {
      const mapped = CHAIN_ID_LOOKUP.get(numId)
      if (mapped) return mapped
    }
    return null
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    const mapped = CHAIN_ID_LOOKUP.get(Math.trunc(input))
    return mapped ?? null
  }
  if (typeof input === 'bigint') {
    const mapped = CHAIN_ID_LOOKUP.get(Number(input))
    return mapped ?? null
  }
  return null
}

export function isChainKey(value: unknown): value is ChainKey {
  return normalizeChainKey(value) != null
}

// Type guard to check if a chain has deployed GM contracts (vs viewing-only chains)
export function isGMChain(chain: ChainKey): chain is GMChainKey {
  return chain === 'base' // Only Base has GM contracts now
}

// Normalize ChainKey to GMChainKey (always returns 'base' for GM operations)
export function normalizeToGMChain(chain: ChainKey): GMChainKey | null {
  // For app functionality, always use Base
  if (chain === 'base') return 'base'
  // Other chains are for OnchainStats viewing only
  return null
}

export function assertChainKey(value: unknown, fallback?: ChainKey): ChainKey {
  const normalized = normalizeChainKey(value)
  if (normalized) return normalized
  if (fallback) return fallback
  throw new Error(`Unknown chain key: ${String(value)}`)
}

export function assertGMChainKey(value: unknown, fallback?: GMChainKey): GMChainKey {
  const normalized = normalizeChainKey(value)
  if (normalized && isGMChain(normalized)) return normalized
  if (fallback) return fallback
  throw new Error(`Unknown or unsupported GM chain: ${String(value)}`)
}

const ABI_FUNCTION_NAMES = new Set(
  (GM_CONTRACT_ABI as Abi)
    .filter((item): item is AbiFunction => item?.type === 'function' && typeof item.name === 'string')
    .map(item => item.name),
)

const missingFunctionWarnings = new Set<string>()

function assertFunctionInAbi(functionName: string) {
  if (ABI_FUNCTION_NAMES.has(functionName)) return true
  if (!missingFunctionWarnings.has(functionName)) {
    missingFunctionWarnings.add(functionName)
    trackWarning('gmeow_utils_function_not_in_abi', { function: 'getTxDataForFunction', functionName })
  }
  return false
}

export const gmContractHasFunction = (functionName: string): boolean => ABI_FUNCTION_NAMES.has(functionName)

// -------------------------------
// Utilities & types
// -------------------------------
type Tx = { to: `0x${string}`; value: bigint; data: `0x${string}` }

type ContractCall = {
  address: `0x${string}`
  abi: Abi
  functionName: string
  args: readonly unknown[]
}

const toBigInt = (value: bigint | number | string): bigint => (typeof value === 'bigint' ? value : BigInt(value))

function buildTx(functionName: string, args: readonly unknown[], chain: GMChainKey = 'base'): Tx {
  assertFunctionInAbi(functionName)
  const data = encodeFunctionData({
    abi: GM_CONTRACT_ABI,
    functionName: functionName as any,
    args: args as any,
  }) as `0x${string}`
  return { to: getContractAddress(chain), value: parseEther('0'), data }
}

function buildTxFromCall(call: ContractCall): Tx {
  assertFunctionInAbi(call.functionName)
  const data = encodeFunctionData({
    abi: call.abi,
    functionName: call.functionName as any,
    args: call.args as any,
  }) as `0x${string}`
  return { to: call.address, value: parseEther('0'), data }
}

// Helper to create the "viem/wagmi"-style call object (address, abi, functionName, args)
function buildCallObject(functionName: string, args: readonly unknown[], chain: GMChainKey = 'base') {
  assertFunctionInAbi(functionName)
  return {
    address: getContractAddress(chain),
    abi: GM_CONTRACT_ABI,
    functionName: functionName as any,
    args,
  }
}

// Helper for referral contract calls (uses REFERRAL_ABI and referral address)
function buildReferralCallObject(functionName: string, args: readonly unknown[], chain: GMChainKey = 'base') {
  return {
    address: getReferralAddress(chain),
    abi: REFERRAL_ABI,
    functionName: functionName as any,
    args,
  }
}

// Small address guard
export function isAddress(a: unknown): a is Address {
  return typeof a === 'string' && /^0x[a-fA-F0-9]{40}$/.test(a)
}

// -------------------------------
// Basic / daily helpers (sendGM) - Base chain only
// -------------------------------
export const createSendGMTx = (chain: GMChainKey = 'base') =>
  buildCallObject('sendGM', [], chain)

export const createGMTransaction = (chain: GMChainKey = 'base'): Tx =>
  buildTx('sendGM', [], chain)

// ========================================
// DEPRECATED: Multichain Transaction Helpers
// ========================================
// ⚠️ These functions are DEPRECATED and redirect to Base chain only.
// They exist solely for backwards compatibility with old code.
//
// Why deprecated?
// - No contracts deployed on Unichain, Celo, Ink, or OP chains
// - All operations now occur on Base chain only
// - Multichain support is VIEW-ONLY via Blockscout MCP
//
// Migration:
// - Replace all calls with: createGMTransaction('base')
// - Or use: createGMTransaction() (defaults to 'base')

/**
 * @deprecated Use createGMTransaction('base') instead. No Unichain contracts deployed.
 */
export const createGMUniTransaction = (): Tx => createGMTransaction('base')

/**
 * @deprecated Use createGMTransaction('base') instead. No Celo contracts deployed.
 */
export const createGMCeloTransaction = (): Tx => createGMTransaction('base')

/**
 * @deprecated Use createGMTransaction('base') instead. No Ink contracts deployed.
 */
export const createGMInkTransaction = (): Tx => createGMTransaction('base')

/**
 * @deprecated Use createGMTransaction('base') instead. No OP contracts deployed.
 */
export const createGMOpTransaction = (): Tx => createGMTransaction('base')

// -------------------------------
// QUESTS - creation, helpers & completions
// -------------------------------

/*
  addQuest (points-only)
    args: (name, uint8 questType, uint256 target, uint256 rewardPointsPerUser,
           uint256 maxCompletions, uint256 expiresAt, string meta)
*/
export const createAddQuestTx = (
  name: string,
  questType: number,
  target: bigint | number | string,
  rewardPointsPerUser: bigint | number | string,
  maxCompletions: bigint | number | string,
  expiresAt: bigint | number | string,
  meta: string,
  chain: GMChainKey = 'base',
) =>
  buildCallObject(
    'addQuest',
    [name, questType, toBigInt(target), toBigInt(rewardPointsPerUser), toBigInt(maxCompletions), toBigInt(expiresAt), meta],
    chain,
  )

export const createAddQuestTransaction = (
  name: string,
  questType: number,
  target: bigint | number | string,
  reward: bigint | number | string,
  maxCompletions: bigint | number | string,
  expiresAt: bigint | number | string,
  meta: string,
  chain: GMChainKey = 'base',
): Tx => buildTxFromCall(createAddQuestTx(name, questType, target, reward, maxCompletions, expiresAt, meta, chain))

/*
  addQuestWithERC20 (token-backed quest)
    args: (name, uint8 questType, uint256 target, uint256 rewardPointsPerUser,
           uint256 maxCompletions, uint256 expiresAt, string meta,
           address rewardToken, uint256 rewardTokenPerUser)
*/
export const createAddQuestWithERC20Tx = (
  name: string,
  questType: number,
  target: bigint | number | string,
  rewardPointsPerUser: bigint | number | string,
  maxCompletions: bigint | number | string,
  expiresAt: bigint | number | string,
  meta: string,
  rewardToken: `0x${string}`,
  rewardTokenPerUser: bigint | number | string,
  chain: GMChainKey = 'base',
) => buildCallObject('addQuestWithERC20', [name, questType, BigInt(target), BigInt(rewardPointsPerUser), BigInt(maxCompletions), BigInt(expiresAt), meta, rewardToken, BigInt(rewardTokenPerUser)], chain)

export const createAddQuestWithERC20Transaction = (
  name: string,
  questType: number,
  target: bigint | number | string,
  rewardPointsPerUser: bigint | number | string,
  maxCompletions: bigint | number | string,
  expiresAt: bigint | number | string,
  meta: string,
  rewardToken: `0x${string}`,
  rewardTokenPerUser: bigint | number | string,
  chain: GMChainKey = 'base',
): Tx =>
  buildTxFromCall(
    createAddQuestWithERC20Tx(
      name,
      questType,
      target,
      rewardPointsPerUser,
      maxCompletions,
      expiresAt,
      meta,
      rewardToken,
      rewardTokenPerUser,
      chain,
    ),
  )

/*
  completeQuestWithSig
    args: (questId, user, fid, action(uint8), deadline, nonce, sig)
*/
export const createCompleteQuestWithSigTx = (
  questId: bigint | number | string,
  user: `0x${string}`,
  fid: bigint | number | string,
  action: number,
  deadline: bigint | number | string,
  nonce: bigint | number | string,
  sig: `0x${string}`,
  chain: GMChainKey = 'base',
) => buildCallObject('completeQuestWithSig', [BigInt(questId), user, BigInt(fid), action, BigInt(deadline), BigInt(nonce), sig], chain)

export const createCompleteQuestTransaction = (
  questId: bigint | number | string,
  user: `0x${string}` | string,
  fid: bigint | number | string,
  action: number,
  deadline: bigint | number | string,
  nonce: bigint | number | string,
  sig: `0x${string}` | string,
  chain: GMChainKey = 'base',
): Tx =>
  buildTxFromCall(createCompleteQuestWithSigTx(questId, user as `0x${string}`, fid, action, deadline, nonce, sig as `0x${string}`, chain))

// closeQuest, batchRefund, getters
export const createCloseQuestTx = (questId: bigint | number | string, chain: GMChainKey = 'base') =>
  buildCallObject('closeQuest', [BigInt(questId)], chain)

export const createBatchRefundQuestsTx = (questIds: (bigint|number|string)[], chain: GMChainKey = 'base') =>
  buildCallObject('batchRefundQuests', [questIds.map(id => toBigInt(id))], chain)

export const createGetQuestCall = (questId: bigint | number | string, chain: GMChainKey = 'base') =>
  buildCallObject('getQuest', [BigInt(questId)], chain)

export const createGetActiveQuestsCall = (chain: GMChainKey = 'base') =>
  buildCallObject('getActiveQuests', [], chain)

// -------------------------------
// Referral system TX builders
// -------------------------------
export const createRegisterReferralCodeTx = (code: string, chain: GMChainKey = 'base') =>
  buildReferralCallObject('registerReferralCode', [code], chain)

export const createSetReferrerTx = (code: string, chain: GMChainKey = 'base') =>
  buildReferralCallObject('setReferrer', [code], chain)

export const createSetFarcasterFidTx = (fid: bigint | number | string, chain: GMChainKey = 'base') =>
  buildCallObject('setFarcasterFid', [toBigInt(fid)], chain)

// admin setters for referral
// -------------------------------
// Guild system TX builders
// -------------------------------
// Guild operations route to separate Guild contract on Base, monolithic on other chains
function buildGuildCallObject(functionName: string, args: readonly unknown[], chain: GMChainKey = 'base') {
  const address = getGuildAddress(chain)
  const abi = getGuildABI()
  return { address, abi, functionName: functionName as any, args }
}

export const createGuildTx = (name: string, chain: GMChainKey = 'base') =>
  buildGuildCallObject('createGuild', [name], chain)

export const createJoinGuildTx = (guildId: bigint|number|string, chain: GMChainKey = 'base') =>
  buildGuildCallObject('joinGuild', [BigInt(guildId)], chain)

export const createLeaveGuildTx = (chain: GMChainKey = 'base') =>
  buildGuildCallObject('leaveGuild', [], chain)

export const createDepositGuildPointsTx = (guildId: bigint|number|string, points: bigint|number|string, chain: GMChainKey = 'base') =>
  buildGuildCallObject('depositGuildPoints', [toBigInt(guildId), toBigInt(points)], chain)

export const createClaimGuildRewardTx = (guildId: bigint|number|string, points: bigint|number|string, chain: GMChainKey = 'base') =>
  buildGuildCallObject('claimGuildReward', [toBigInt(guildId), toBigInt(points)], chain)

export const createGuildQuestTx = (guildId: bigint|number|string, name: string, rewardPoints: bigint|number|string, chain: GMChainKey = 'base') =>
  buildGuildCallObject('createGuildQuest', [toBigInt(guildId), name, toBigInt(rewardPoints)], chain)

export const createCompleteGuildQuestTx = (guildQuestId: bigint|number|string, chain: GMChainKey = 'base') =>
  buildGuildCallObject('completeGuildQuest', [toBigInt(guildQuestId)], chain)

// -------------------------------
// NFT system TX builders
// -------------------------------
// NFT operations route to separate NFT contract on Base, monolithic on other chains
function buildNFTCallObject(functionName: string, args: readonly unknown[], chain: GMChainKey = 'base', value: bigint = 0n) {
  const address = getNFTAddress(chain)
  const abi = getNFTABI()
  return { address, abi, functionName: functionName as any, args, value }
}

export const createMintNFTTx = (
  nftTypeId: string,
  reason: string,
  chain: GMChainKey = 'base',
) => buildNFTCallObject('mintNFT', [nftTypeId, reason], chain)

export const createBatchMintNFTTx = (
  recipients: `0x${string}`[],
  nftTypeId: string,
  reason: string,
  chain: GMChainKey = 'base',
) => buildNFTCallObject('batchMintNFT', [recipients, nftTypeId, reason], chain)

// -------------------------------
// Points / tipping / badges / staking builders
// -------------------------------
export const createTipUserTx = (to: `0x${string}`, points: bigint|number|string, recipientFid: bigint|number|string, chain: GMChainKey = 'base') =>
  buildCallObject('tipUser', [to, toBigInt(points), toBigInt(recipientFid)], chain)

export const createMintBadgeFromPointsTx = (pointsToBurn: bigint|number|string, badgeType: string, chain: GMChainKey = 'base') =>
  buildCallObject('mintBadgeFromPoints', [toBigInt(pointsToBurn), badgeType], chain)

export const createStakeForBadgeTx = (points: bigint|number|string, badgeId: bigint|number|string, chain: GMChainKey = 'base') =>
  buildCallObject('stakeForBadge', [toBigInt(points), toBigInt(badgeId)], chain)

export const createUnstakeForBadgeTx = (points: bigint|number|string, badgeId: bigint|number|string, chain: GMChainKey = 'base') =>
  buildCallObject('unstakeForBadge', [toBigInt(points), toBigInt(badgeId)], chain)

// getUserStats, tokenEscrowOf query wrappers
export const createGetUserStatsCall = (user: `0x${string}`, chain: GMChainKey = 'base') =>
  buildCallObject('getUserStats', [user], chain)

export const createTokenEscrowOfCall = (token: `0x${string}`, chain: GMChainKey = 'base') =>
  buildCallObject('tokenEscrowOf', [token], chain)

// -------------------------------
// Admin / governance tx builders (owner-only)
// -------------------------------
export const createSetOracleSignerTx = (newSigner: `0x${string}`, chain: GMChainKey = 'base') =>
  buildCallObject('setOracleSigner', [newSigner], chain)

export const createSetPowerBadgeForFidTx = (fid: bigint|number|string, val: boolean, chain: GMChainKey = 'base') =>
  buildCallObject('setPowerBadgeForFid', [BigInt(fid), val], chain)

export const createSetTokenWhitelistEnabledTx = (enabled: boolean, chain: GMChainKey = 'base') =>
  buildCallObject('setTokenWhitelistEnabled', [enabled], chain)

export const createAddTokenToWhitelistTx = (token: `0x${string}`, allowed: boolean, chain: GMChainKey = 'base') =>
  buildCallObject('addTokenToWhitelist', [token, allowed], chain)

export const createWithdrawContractReserveTx = (to: `0x${string}`, amount: bigint|number|string, chain: GMChainKey = 'base') =>
  buildCallObject('withdrawContractReserve', [to, toBigInt(amount)], chain)

export const createEmergencyWithdrawTokenTx = (token: `0x${string}`, to: `0x${string}`, amount: bigint|number|string, chain: GMChainKey = 'base') =>
  buildCallObject('emergencyWithdrawToken', [token, to, toBigInt(amount)], chain)

export const createPauseTx = (chain: GMChainKey = 'base') => buildCallObject('pause', [], chain)
export const createUnpauseTx = (chain: GMChainKey = 'base') => buildCallObject('unpause', [], chain)

// GM configuration helpers
export const createSetGMConfigTx = (reward: bigint|number|string, cooldown: bigint|number|string, chain: GMChainKey = 'base') =>
  buildCallObject('setGMConfig', [toBigInt(reward), toBigInt(cooldown)], chain)

export const createSetGMBonusTiersTx = (
  bonus7: number | string | bigint,
  bonus30: number | string | bigint,
  bonus100: number | string | bigint,
  chain: GMChainKey = 'base',
) => buildCallObject('setGMBonusTiers', [Number(bonus7), Number(bonus30), Number(bonus100)], chain)

export const createDepositToTx = (to: `0x${string}`, amount: bigint|number|string, chain: GMChainKey = 'base') =>
  buildCallObject('depositTo', [to, toBigInt(amount)], chain)

// -------------------------------
// ERC20 helpers (client-side checks)
// -------------------------------
/**
 * checkTokenAllowanceAndBalance
 * - token: token address
 * - owner: wallet address to check
 * - spender: spender (contract address)
 * - rpcUrl?: optional RPC URL to create a public client
 *
 * returns { balance, allowance, decimals, symbol }
 */
export async function checkTokenAllowanceAndBalance(
  token: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`,
  rpcUrl?: string,
) {
  // Phase 8.2.2: Use centralized RPC client pool (ignore rpcUrl param - pool uses env)
  const client = getPublicClient(base.id)

  const rpcTimeout = <T,>(promise: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 10000))
    ])

  const [balance, allowance, decimals, symbol] = await Promise.all([
    rpcTimeout(client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }).catch(() => 0n), 0n),
    rpcTimeout(client.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] }).catch(() => 0n), 0n),
    rpcTimeout(client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }).catch(() => 18), 18),
    rpcTimeout(client.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }).catch(() => ''), ''),
  ])

  return { balance, allowance, decimals: Number(decimals), symbol }
}

export const createApproveERC20Tx = (token: `0x${string}`, spender: `0x${string}`, amount: bigint|number|string) =>
  ({
    address: token,
    abi: erc20Abi,
    functionName: 'approve' as const,
    args: [spender, BigInt(amount)] as const, // tuple for wagmi types
  })

// -------------------------------
// Time & formatting helpers (kept)
// -------------------------------
export const getTodayDateString = (): string => new Date().toISOString().split('T')[0]

export const hasGMToday = (lastGM?: string | number | Date | null): boolean => {
  if (!lastGM) return false
  const today = getTodayDateString()
  if (typeof lastGM === 'string') {
    const trimmed = lastGM.trim()
    if (!trimmed) return false
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed === today
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) {
      const ts = numeric < 1e12 ? numeric * 1000 : numeric
      return new Date(ts).toISOString().split('T')[0] === today
    }
    const parsed = Date.parse(trimmed)
    return Number.isNaN(parsed) ? false : new Date(parsed).toISOString().split('T')[0] === today
  }
  if (typeof lastGM === 'number') {
    const ts = lastGM < 1e12 ? lastGM * 1000 : lastGM
    return new Date(ts).toISOString().split('T')[0] === today
  }
  if (lastGM instanceof Date) {
    return lastGM.toISOString().split('T')[0] === today
  }
  return false
}

export const getYesterdayDateString = (): string => {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]
}

export const getTimeUntilMidnight = (): number => {
  const now = new Date(); const midnight = new Date(now); midnight.setHours(24, 0, 0, 0); return midnight.getTime() - now.getTime()
}

export const getTimeUntilNextGM = (lastGMTimestamp: number): number => {
  if (lastGMTimestamp === 0) return 0
  const now = Date.now()
  const lastGMTime = lastGMTimestamp * 1000
  const nextGMTime = lastGMTime + 24 * 60 * 60 * 1000
  const timeRemaining = nextGMTime - now
  return Math.max(0, timeRemaining)
}

export const canGMBasedOnTimestamp = (lastGMTimestamp: number): boolean => getTimeUntilNextGM(lastGMTimestamp) === 0

export const formatTimeUntilMidnight = (): string => {
  const timeLeft = getTimeUntilMidnight()
  const hours = Math.floor(timeLeft / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export const formatTimeUntilNextGM = (lastGMTimestamp: number): string => {
  const timeLeft = getTimeUntilNextGM(lastGMTimestamp)
  if (timeLeft === 0) return 'Ready to GM!'
  const hours = Math.floor(timeLeft / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

// -------------------------------
// Time-based greeting logic
// -------------------------------
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function getTimeBasedGreeting(canGM: boolean, timeOfDay?: TimeOfDay): string {
  const tod = timeOfDay || getTimeOfDay()
  
  if (canGM) {
    switch (tod) {
      case 'morning':
        return '☀️ Good morning! Time to send your GM'
      case 'afternoon':
        return '🌤️ Good afternoon! Send your daily GM'
      case 'evening':
        return '🌆 Good evening! Don\'t forget your GM'
      case 'night':
        return '🌙 Good night! Send your GM before bed'
    }
  } else {
    switch (tod) {
      case 'morning':
        return '☀️ Good morning! GM already sent today'
      case 'afternoon':
        return '🌤️ Good afternoon! GM already sent today'
      case 'evening':
        return '🌆 Good evening! GM already sent today'
      case 'night':
        return '🌙 Good night! GM already sent today'
    }
  }
}

export function getTimeBasedEmoji(timeOfDay?: TimeOfDay): string {
  const tod = timeOfDay || getTimeOfDay()
  switch (tod) {
    case 'morning': return '☀️'
    case 'afternoon': return '🌤️'
    case 'evening': return '🌆'
    case 'night': return '🌙'
  }
}

export function getTimeBasedShareText(chain: string, timeOfDay?: TimeOfDay): string {
  const tod = timeOfDay || getTimeOfDay()
  switch (tod) {
    case 'morning':
      return `☀️ Good morning! GM sent on ${chain}! Join me on GMEOW.`
    case 'afternoon':
      return `🌤️ Good afternoon! GM sent on ${chain}! Join me on GMEOW.`
    case 'evening':
      return `🌆 Good evening! GM sent on ${chain}! Join me on GMEOW.`
    case 'night':
      return `🌙 Good night! GM sent on ${chain}! Join me on GMEOW.`
  }
}

// -------------------------------
// Quest Type mapping (same as contract enum)
export type QuestTypeKey =
  | 'GENERIC'
  | 'FARCASTER_FOLLOW'
  | 'FARCASTER_RECAST'
  | 'FARCASTER_REPLY'
  | 'FARCASTER_LIKE'
  | 'HOLD_ERC20'
  | 'HOLD_ERC721'
  | 'FARCASTER_CAST'
  | 'FARCASTER_MENTION'
  | 'FARCASTER_CHANNEL_POST'
  | 'FARCASTER_FRAME_INTERACT'
  | 'FARCASTER_VERIFIED_USER'

export const QUEST_TYPES: Record<QuestTypeKey, number> = {
  GENERIC: 1,
  FARCASTER_FOLLOW: 2,
  FARCASTER_RECAST: 3,
  FARCASTER_REPLY: 4,
  FARCASTER_LIKE: 5,
  HOLD_ERC20: 6,
  HOLD_ERC721: 7,
  FARCASTER_CAST: 8,
  FARCASTER_MENTION: 9,
  FARCASTER_FRAME_INTERACT: 10,
  FARCASTER_CHANNEL_POST: 11,
  FARCASTER_VERIFIED_USER: 12,
} as const

export const toQuestTypeCode = (k: QuestTypeKey | string | number): number => {
  if (typeof k === 'number') return k
  const key = String(k).trim().toUpperCase() as QuestTypeKey
  return (QUEST_TYPES as Record<string, number>)[key] ?? 0
}

export const QUEST_TYPES_BY_CODE: Record<number, QuestTypeKey> = Object.fromEntries(
  Object.entries(QUEST_TYPES).map(([k, v]) => [v, k as QuestTypeKey]),
) as Record<number, QuestTypeKey>

export type QuestMode = 'social' | 'onchain'
export type QuestFieldRequirement = 'hidden' | 'optional' | 'required'

export type QuestFieldConfig = {
  mode: QuestMode
  followHandle: QuestFieldRequirement
  frameUrl: QuestFieldRequirement
  castLink: QuestFieldRequirement
  castText: QuestFieldRequirement
  mentionHandle: QuestFieldRequirement
  targetHandle: QuestFieldRequirement
  targetFid: QuestFieldRequirement
}

type QuestFieldOverrides = Partial<Omit<QuestFieldConfig, 'mode'>>

const BASE_FIELD_STATE: Omit<QuestFieldConfig, 'mode'> = {
  followHandle: 'hidden',
  frameUrl: 'hidden',
  castLink: 'hidden',
  castText: 'hidden',
  mentionHandle: 'hidden',
  targetHandle: 'hidden',
  targetFid: 'hidden',
}

const createQuestFieldConfig = (
  mode: QuestMode,
  overrides: QuestFieldOverrides = {},
): QuestFieldConfig => ({
  mode,
  followHandle: overrides.followHandle ?? BASE_FIELD_STATE.followHandle,
  frameUrl: overrides.frameUrl ?? BASE_FIELD_STATE.frameUrl,
  castLink: overrides.castLink ?? BASE_FIELD_STATE.castLink,
  castText: overrides.castText ?? BASE_FIELD_STATE.castText,
  mentionHandle: overrides.mentionHandle ?? BASE_FIELD_STATE.mentionHandle,
  targetHandle: overrides.targetHandle ?? BASE_FIELD_STATE.targetHandle,
  targetFid: overrides.targetFid ?? BASE_FIELD_STATE.targetFid,
})

export const QUEST_FIELD_CONFIG: Record<QuestTypeKey, QuestFieldConfig> = {
  GENERIC: createQuestFieldConfig('onchain'),
  HOLD_ERC20: createQuestFieldConfig('onchain'),
  HOLD_ERC721: createQuestFieldConfig('onchain'),
  FARCASTER_FOLLOW: createQuestFieldConfig('social', {
    followHandle: 'required',
    targetHandle: 'optional',
    targetFid: 'optional',
  }),
  FARCASTER_RECAST: createQuestFieldConfig('social', { castLink: 'required' }),
  FARCASTER_REPLY: createQuestFieldConfig('social', { castLink: 'required', castText: 'optional' }),
  FARCASTER_LIKE: createQuestFieldConfig('social', { castLink: 'required' }),
  FARCASTER_CAST: createQuestFieldConfig('social', { castText: 'optional' }),
  FARCASTER_MENTION: createQuestFieldConfig('social', { mentionHandle: 'required', castText: 'optional' }),
  FARCASTER_CHANNEL_POST: createQuestFieldConfig('social', { castLink: 'required', castText: 'optional' }),
  FARCASTER_FRAME_INTERACT: createQuestFieldConfig('social', { frameUrl: 'required' }),
  FARCASTER_VERIFIED_USER: createQuestFieldConfig('social'),
}

const QUEST_TYPE_KEY_SET = new Set<QuestTypeKey>(Object.keys(QUEST_TYPES) as QuestTypeKey[])

export function normalizeQuestTypeKey(input: unknown): QuestTypeKey {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return 'GENERIC'
    const upper = trimmed.toUpperCase() as QuestTypeKey
    if (QUEST_TYPE_KEY_SET.has(upper)) return upper
    const numeric = Number.parseInt(trimmed, 10)
    if (Number.isFinite(numeric)) {
      const byCode = QUEST_TYPES_BY_CODE[numeric]
      if (byCode) return byCode
    }
  } else if (typeof input === 'number' && Number.isFinite(input)) {
    const byCode = QUEST_TYPES_BY_CODE[Math.trunc(input)]
    if (byCode) return byCode
  }
  return 'GENERIC'
}

export function getQuestFieldConfig(key: QuestTypeKey | string | number): QuestFieldConfig {
  const normalized = normalizeQuestTypeKey(key)
  const config = QUEST_FIELD_CONFIG[normalized]
  return { ...config }
}

// -------------------------------
// Small convenience exports for front-end usage
// -------------------------------
// GM contract chains - Base only (for contract interactions)
// Phase 8.9: Use Object.keys(CHAIN_IDS) instead of duplicate array
export const CHAIN_KEYS: GMChainKey[] = Object.keys(CHAIN_IDS) as GMChainKey[]

// Label map for UI (Blockscout-supported chains for OnchainStats frame viewing)
export const CHAIN_LABEL: Record<ChainKey, string> = {
  base: 'Base',
  ethereum: 'Ethereum',
  optimism: 'OP Mainnet',
  op: 'OP Mainnet',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  gnosis: 'Gnosis',
  celo: 'Celo',
  scroll: 'Scroll',
  unichain: 'Unichain',
  soneium: 'Soneium',
  zksync: 'zkSync Era',
  zora: 'Zora',
}

// Treat tiny/invalid timestamps as "no expiry"
export const MIN_VALID_UNIX = 1_600_000_000
export function sanitizeExpiresAt(raw: any): number {
  const n = Number(raw || 0)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n < MIN_VALID_UNIX ? 0 : n
}

// Normalized quest shape type
export type NormalizedQuest = {
  name?: string
  questType?: number
  target?: number
  rewardPoints?: number
  creator?: `0x${string}` | string
  maxCompletions?: number
  expiresAt?: number
  meta?: any
  isActive?: boolean
  escrowedPoints?: number
  claimedCount?: number
  rewardToken?: `0x${string}` | string
  rewardTokenPerUser?: number
  tokenEscrowRemaining?: number
}

// Normalize quest struct from mapping (named fields) or getQuest tuple
export function normalizeQuestStruct(q: any): NormalizedQuest {
  if (!q) return {}

  // Named fields (quests mapping)
  if (typeof q === 'object' && ('questType' in q || 'expiresAt' in q || 'meta' in q)) {
    return {
      name: (q as any).name,
      questType: Number((q as any).questType ?? (q as any).type ?? 0),
      target: Number((q as any).target ?? 0),
      rewardPoints: Number((q as any).rewardPoints ?? 0),
      creator: (q as any).creator,
      maxCompletions: Number((q as any).maxCompletions ?? 0),
      expiresAt: Number((q as any).expiresAt ?? 0),
      meta: (q as any).meta,
      isActive: Boolean((q as any).isActive),
      escrowedPoints: Number((q as any).escrowedPoints ?? 0),
      claimedCount: Number((q as any).claimedCount ?? 0),
      rewardToken: (q as any).rewardToken,
      rewardTokenPerUser: Number((q as any).rewardTokenPerUser ?? 0),
      tokenEscrowRemaining: Number((q as any).tokenEscrowRemaining ?? 0),
    }
  }

  // Tuple from getQuest (index-safe)
  const get = (i: number) => (Array.isArray(q) ? (q as any)[i] : undefined)
  return {
    name: get(0),
    questType: Number(get(1) ?? 0),
    target: Number(get(2) ?? 0),
    rewardPoints: Number(get(3) ?? 0),
    creator: get(4),
    maxCompletions: Number(get(5) ?? 0),
    expiresAt: Number(get(6) ?? 0),
    meta: get(7),
    isActive: Boolean(get(8)),
    rewardToken: get(9),
    rewardTokenPerUser: Number(get(10) ?? 0),
    tokenEscrowRemaining: Number(get(11) ?? 0),
  }
}

// -------------------------------
// Exported builders return objects suitable for viem/writeContract or wagmi/writeContract
// -------------------------------
const gmUtils = {
  CHAIN_IDS,
  CONTRACT_ADDRESSES,
  GM_CONTRACT_ABI,
  ERC721_ABI,
  normalizeChainKey,
  isChainKey,
  assertChainKey,
  getContractAddress,
  createSendGMTx,
  createAddQuestTx,
  createAddQuestWithERC20Tx,
  createCompleteQuestWithSigTx,
  createCloseQuestTx,
  createBatchRefundQuestsTx,
  createRegisterReferralCodeTx,
  createSetReferrerTx,
  createSetFarcasterFidTx,
  createGuildTx,
  createJoinGuildTx,
  createLeaveGuildTx,
  createDepositGuildPointsTx,
  createClaimGuildRewardTx,
  createGuildQuestTx,
  createCompleteGuildQuestTx,
  createTipUserTx,
  createMintBadgeFromPointsTx,
  createStakeForBadgeTx,
  createUnstakeForBadgeTx,
  createGetUserStatsCall,
  createTokenEscrowOfCall,
  createSetOracleSignerTx,
  createSetPowerBadgeForFidTx,
  createSetTokenWhitelistEnabledTx,
  createAddTokenToWhitelistTx,
  createWithdrawContractReserveTx,
  createEmergencyWithdrawTokenTx,
  createPauseTx,
  createUnpauseTx,
  createSetGMConfigTx,
  createSetGMBonusTiersTx,
  createDepositToTx,
  checkTokenAllowanceAndBalance,
  createApproveERC20Tx,
  hasGMToday,
  QUEST_TYPES,
  QUEST_TYPES_BY_CODE,
  toQuestTypeCode,
  QUEST_FIELD_CONFIG,
  normalizeQuestTypeKey,
  getQuestFieldConfig,
  gmContractHasFunction,
}

export default gmUtils