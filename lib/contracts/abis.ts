/**
 * @file lib/contracts/abis.ts
 * @description Centralized ABI exports for all Gmeowbased smart contracts
 * 
 * PHASE: Phase 7.1 - Contracts (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ⚠️ IMPORTANT: Single-Chain Deployment
 * 
 * All Gmeowbased contracts are deployed ONLY on Base chain (8453).
 * These ABIs are for Base chain contracts exclusively.
 * 
 * 🚫 MULTICHAIN STATUS:
 * - Ethereum, Optimism, Arbitrum, etc.: NO contracts deployed
 * - These chains: VIEW-ONLY via Blockscout MCP
 * - Write operations: Base chain ONLY
 * 
 * FEATURES:
 *   - Complete ABI definitions for all contract modules
 *   - Core module ABI (GM system, points, streaks)
 *   - Guild module ABI (guild creation, management)
 *   - NFT module ABI (ERC-721 collectibles)
 *   - Badge module ABI (achievement badges)
 *   - Referral module ABI (referral tracking)
 *   - Helper functions to extract ABIs from imports
 * 
 * Usage:
 * ```typescript
 * import { GUILD_ABI, CORE_ABI, NFT_ABI, BADGE_ABI } from '@/lib/contracts/abis'
 * 
 * // Correct - Base chain write operation
 * const tx = await writeContract({
 *   address: STANDALONE_ADDRESSES.base.core,
 *   abi: CORE_ABI,
 *   functionName: 'sendGM',
 * })
 * 
 * // Wrong - No contracts on other chains!
 * const tx = await writeContract({
 *   address: STANDALONE_ADDRESSES.ethereum.core, // ❌ Does not exist!
 *   abi: CORE_ABI,
 * })
 * ```
 * 
 * Contract Architecture (Base Chain Only - All Verified ✓):
 * - Core: 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 (verified Dec 12, 2025)
 * - Guild: 0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3 (verified Dec 12, 2025)
 * - NFT: 0xCE9596a992e38c5fa2d997ea916a277E0F652D5C (verified Dec 12, 2025)
 * - Badge: 0x5Af50Ee323C45564d94B0869d95698D837c59aD2 (verified Dec 12, 2025)
 * - Referral: 0x9E7c32C1fB3a2c08e973185181512a442b90Ba44 (verified Dec 12, 2025)
 * 
 * Verification:
 * - All contracts verified on BaseScan: https://basescan.org
 * - Deployment Block: 39,270,005 - 39,281,269
 * - Deployer: 0x8870C155666809609176260F2B65a626C000D773
 * - Network: Base (8453)
 * 
 * REFERENCE DOCUMENTATION:
 *   - Contract source: /contract/ directory (Foundry project)
 *   - ABI files: /abi/ directory (JSON exports)
 *   - Chain types: lib/contracts/gmeow-utils.ts
 *   - BaseScan: https://basescan.org
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (8453)
 *   - ABIs must match deployed contract bytecode exactly
 *   - All ABIs extracted from verified contracts
 *   - ABI changes require contract redeployment
 * 
 * TODO:
 *   - [ ] Add ABI version tracking
 *   - [ ] Add ABI change detection vs deployed contracts
 *   - [ ] Add automatic ABI regeneration from /abi/ directory
 *   - [ ] Add ABI function signature documentation
 *   - [ ] Add ABI event signature documentation
 *   - [ ] Generate TypeScript types from ABIs
 * 
 * CRITICAL:
 *   - ABIs MUST match deployed contracts exactly
 *   - Modifying ABIs without redeployment will cause transaction failures
 *   - ABI imports from /abi/ directory are source of truth
 *   - Do not manually edit ABI arrays (regenerate from source)
 *   - All contracts are Base chain only (no multichain)
 * 
 * SUGGESTIONS:
 *   - Add ABI validation tests against deployed contracts
 *   - Add ABI documentation generator
 *   - Cache parsed ABIs for performance
 *   - Add ABI diff tool for upgrade detection
 *   - Generate human-readable function descriptions
 * 
 * AVOID:
 *   - Manually editing ABI arrays (use source files)
 *   - Using ABIs for non-existent contracts on other chains
 *   - Mixing ABIs from different contract versions
 *   - Hardcoding function selectors (derive from ABI)
 *   - Using outdated ABIs from previous deployments
 * 
 * @module lib/contracts/abis
 * @see lib/gmeow-utils.ts for GMChainKey vs ChainKey documentation
 */

import { type Abi, erc721Abi } from 'viem'

// Import verified ABIs (all verified on BaseScan Dec 11, 2025)
import GM_ABI_JSON from '@/abi/GmeowCombined.abi.json'
import CORE_ABI_JSON from '@/abi/GmeowCore.abi.json'
import GUILD_ABI_JSON from '@/abi/GmeowGuildStandalone.abi.json'
import NFT_ABI_JSON from '@/abi/GmeowNFT.abi.json'
import BADGE_ABI_JSON from '@/abi/GmeowBadge.abi.json'
import REFERRAL_ABI_JSON from '@/abi/GmeowReferralStandalone.abi.json'

// Export as typed ABIs
export const GM_CONTRACT_ABI = GM_ABI_JSON as unknown as Abi
export const CORE_ABI = CORE_ABI_JSON as unknown as Abi
export const GUILD_ABI = GUILD_ABI_JSON as unknown as Abi
export const NFT_ABI = NFT_ABI_JSON as unknown as Abi
export const BADGE_ABI = BADGE_ABI_JSON as unknown as Abi
export const REFERRAL_ABI = REFERRAL_ABI_JSON as unknown as Abi
export const ERC721_ABI = erc721Abi as unknown as Abi

// Also export raw JSON for cases where untyped ABI is needed
export { default as GUILD_ABI_JSON } from '@/abi/GmeowGuildStandalone.abi.json'
export { default as CORE_ABI_JSON } from '@/abi/GmeowCore.abi.json'
export { default as NFT_ABI_JSON } from '@/abi/GmeowNFT.abi.json'
export { default as BADGE_ABI_JSON } from '@/abi/GmeowBadge.abi.json'
export { default as REFERRAL_ABI_JSON } from '@/abi/GmeowReferralStandalone.abi.json'

/**
 * Helper function to get the correct ABI for Core contract
 * 
 * @returns Core contract ABI (Base chain standalone architecture)
 * @note Only valid for Base chain (8453) deployments
 */
export function getCoreABI(): Abi {
  return CORE_ABI
}

/**
 * Helper function to get the correct ABI for Guild contract
 * 
 * @returns Guild contract ABI (Base chain standalone architecture)
 * @note Only valid for Base chain (8453) deployments
 */
export function getGuildABI(): Abi {
  return GUILD_ABI
}

/**
 * Helper function to get the correct ABI for NFT contract
 * 
 * @returns NFT contract ABI (Base chain standalone architecture)
 * @note Only valid for Base chain (8453) deployments
 */
export function getNFTABI(): Abi {
  return NFT_ABI
}

/**
 * Helper function to get the correct ABI for Referral contract
 * 
 * @returns Referral contract ABI (Base chain standalone architecture)
 * @note Only valid for Base chain (8453) deployments
 */
export function getReferralABI(): Abi {
  return REFERRAL_ABI
}

/**
 * Helper function to get the correct ABI for Badge contract
 */
export function getBadgeABI(): Abi {
  return BADGE_ABI
}
