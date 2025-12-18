/**
 * @file lib/contracts/index.ts
 * @description Smart contract layer barrel export - Base chain only deployment
 * 
 * PHASE: Phase 7.1 - Contracts (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ⚠️ CRITICAL: Single-Chain Architecture
 * 
 * All Gmeowbased contracts are deployed exclusively on Base chain (8453).
 * No contracts exist on other chains - they are VIEW-ONLY via Blockscout MCP.
 * 
 * FEATURES:
 *   - Centralized contract exports (ABIs, addresses, utilities)
 *   - Type-safe contract interaction wrappers
 *   - Guild contract module exports
 *   - Referral contract module exports
 *   - Contract event registry exports
 *   - Minting system exports
 *   - Oracle deposit system exports
 *   - NFT metadata utilities exports
 *   - RPC configuration exports
 * 
 * Chain Type Reference:
 * - GMChainKey: 'base' only - USE FOR ALL CONTRACT OPERATIONS
 * - ChainKey: 12 chains - VIEW-ONLY via Blockscout MCP (OnchainStats frame)
 * 
 * Contract Addresses (Base Chain):
 * - Core: 0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73
 * - Guild: 0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3
 * - NFT: 0xCE9596a992e38c5fa2d997ea916a277E0F652D5C
 * - Badge: 0x5Af50Ee323C45564d94B0869d95698D837c59aD2
 * - Referral: 0x9E7c32C1fB3a2c08e973185181512a442b90Ba44
 * 
 * REFERENCE DOCUMENTATION:
 *   - Contract source: /contract/ directory
 *   - Chain types: lib/contracts/gmeow-utils.ts
 *   - BaseScan: https://basescan.org
 *   - All contracts verified December 12, 2025
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (8453)
 *   - All imports must use GMChainKey for writes
 *   - ChainKey only for view operations
 * 
 * Usage Guidelines:
 * ✅ DO:
 *    - Use GMChainKey ('base') for all writes
 *    - Import ABIs from './abis'
 *    - Use STANDALONE_ADDRESSES.base.* for contract addresses
 * 
 * 🚫 DON'T:
 *    - Try to write to other chains (no contracts deployed)
 *    - Use ChainKey for contract operations (view-only)
 *    - Assume multichain contract support exists
 * 
 * TODO:
 *   - [ ] Add contract upgrade detection utilities
 *   - [ ] Add contract interaction analytics
 *   - [ ] Add contract state caching layer
 *   - [ ] Add transaction simulation exports
 *   - [ ] Add batch transaction utilities
 * 
 * CRITICAL:
 *   - All contracts are Base chain only
 *   - GMChainKey must be used for all write operations
 *   - ChainKey is view-only for Blockscout MCP
 *   - Contract addresses are production (handle with care)
 * 
 * SUGGESTIONS:
 *   - Add contract health monitoring exports
 *   - Add gas estimation utilities
 *   - Add contract event listening utilities
 *   - Cache commonly accessed contract data
 * 
 * AVOID:
 *   - Importing deprecated proxy addresses
 *   - Using ChainKey for write operations
 *   - Mixing contract versions in imports
 *   - Assuming multichain support exists
 * 
 * @module lib/contracts
 * @see lib/contracts/gmeow-utils.ts for detailed chain type documentation
 * @verified BaseScan December 12, 2025
 */

export * from './abis'
// Export gmeow-utils types and addresses (ABIs excluded to avoid conflicts)
export { 
  STANDALONE_ADDRESSES,
  CONTRACT_ADDRESSES,
  CHAIN_IDS,
  ALL_CHAIN_IDS,
  type GMChainKey,
  type ChainKey,
  getContractAddress,
  getGuildAddress,
  getNFTAddress
} from './gmeow-utils'
export * from './guild-contract'
export * from './referral-contract'
export * from './contract-events'
export * from './contract-mint'
export * from './auto-deposit-oracle'
export * from './nft-metadata'
