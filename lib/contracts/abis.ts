/**
 * Centralized ABI Exports
 * 
 * All contract ABIs are exported from this single file to maintain consistency
 * and make it easy to update ABI references across the codebase.
 * 
 * Usage:
 * ```typescript
 * import { GUILD_ABI, CORE_ABI, NFT_ABI, BADGE_ABI } from '@/lib/contracts/abis'
 * ```
 * 
 * Contract Architecture (Base Chain Only - All Verified ✓):
 * - Core: 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73 (verified Dec 11, 2025)
 * - Guild: 0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3 (verified Dec 11, 2025)
 * - NFT: 0xCE9596a992e38c5fa2d997ea916a277E0F652D5C (verified Dec 11, 2025)
 * - Badge: 0x5Af50Ee323C45564d94B0869d95698D837c59aD2 (verified Dec 11, 2025)
 * - Referral: 0x9E7c32C1fB3a2c08e973185181512a442b90Ba44 (verified Dec 11, 2025)
 * 
 * All contracts verified on BaseScan: https://basescan.org
 * Deployment Block: 39,270,005 - 39,281,269
 * Deployer: 0x8870C155666809609176260F2B65a626C000D773
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
 * (All chains now use standalone architecture with same ABI)
 */
export function getCoreABI(): Abi {
  return CORE_ABI
}

/**
 * Helper function to get the correct ABI for Guild contract
 */
export function getGuildABI(): Abi {
  return GUILD_ABI
}

/**
 * Helper function to get the correct ABI for NFT contract
 */
export function getNFTABI(): Abi {
  return NFT_ABI
}

/**
 * Helper function to get the correct ABI for Referral contract
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
