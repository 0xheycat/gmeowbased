/**
 * Smart Contract Layer - Base Chain Only
 * 
 * ⚠️ CRITICAL: Single-Chain Architecture
 * 
 * All Gmeowbased contracts are deployed exclusively on Base chain (8453).
 * No contracts exist on other chains - they are VIEW-ONLY via Blockscout MCP.
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
 * @module lib/contracts
 * @see lib/gmeow-utils.ts for detailed chain type documentation
 * @verified BaseScan December 12, 2025
 */

export * from './abis'
