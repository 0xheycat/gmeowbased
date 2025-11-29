/* lib/contract-config.ts
   Unified contract configuration supporting both:
   - Legacy: Monolithic GmeowMultichain contracts (other chains)
   - New: Standalone architecture with Core/Guild/NFT split (Base mainnet)
*/

export type ContractArchitecture = 'monolithic' | 'standalone'

export interface ContractAddresses {
  core: `0x${string}`
  guild?: `0x${string}`  // Only for standalone architecture
  nft?: `0x${string}`     // Only for standalone architecture
  badge?: `0x${string}`   // Optional: SoulboundBadge contract
}

export interface ChainConfig {
  chainId: number
  architecture: ContractArchitecture
  addresses: ContractAddresses
  rpcUrl: string
  explorerUrl: string
  startBlock?: number
}

// Base Mainnet - NEW STANDALONE ARCHITECTURE
const BASE_MAINNET_CONFIG: ChainConfig = {
  chainId: 8453,
  architecture: 'standalone',
  addresses: {
    core: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92',
    guild: '0x967457be45facE07c22c0374dAfBeF7b2f7cd059',
    nft: '0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20',
    badge: '0xF13d6f70Af6cf6C47Cd3aFb545d906309eebD1b9',
  },
  rpcUrl: process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org',
  explorerUrl: 'https://basescan.org',
  startBlock: 37445375,
}

// Base Sepolia - STANDALONE TESTNET
const BASE_SEPOLIA_CONFIG: ChainConfig = {
  chainId: 84532,
  architecture: 'standalone',
  addresses: {
    core: '0x059b474799f8602975E60A789105955CbB61d878',
    guild: '0xa0001886C87a19d49BAC88a5Cbf993f0866110C4',
    nft: '0xdB6167697Dd0f696d445a35ec823C25b885Ae60c',
  },
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
}

// Other chains - LEGACY MONOLITHIC
const UNICHAIN_CONFIG: ChainConfig = {
  chainId: 130,
  architecture: 'monolithic',
  addresses: {
    core: (process.env.NEXT_PUBLIC_GM_UNICHAIN_ADDRESS as `0x${string}`) || '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f',
    badge: (process.env.BADGE_CONTRACT_UNICHAIN as `0x${string}`) || '0xd54275a6e8db11f5aC5C065eE1E8f10dCA37Ad86',
  },
  rpcUrl: process.env.NEXT_PUBLIC_RPC_UNICHAIN || 'https://mainnet.unichain.org',
  explorerUrl: 'https://uniscan.xyz',
  startBlock: 30931846,
}

const CELO_CONFIG: ChainConfig = {
  chainId: 42220,
  architecture: 'monolithic',
  addresses: {
    core: (process.env.NEXT_PUBLIC_GM_CELO_ADDRESS as `0x${string}`) || '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52',
    badge: (process.env.BADGE_CONTRACT_CELO as `0x${string}`) || '0x16CF68d057e931aBDFeC67D0B4C3CaF3BA21f9D3',
  },
  rpcUrl: process.env.NEXT_PUBLIC_RPC_CELO || 'https://forno.celo.org',
  explorerUrl: 'https://celoscan.io',
  startBlock: 49779488,
}

const INK_CONFIG: ChainConfig = {
  chainId: 57073,
  architecture: 'monolithic',
  addresses: {
    core: (process.env.NEXT_PUBLIC_GM_INK_ADDRESS as `0x${string}`) || '0x6081a70c2F33329E49cD2aC673bF1ae838617d26',
    badge: (process.env.BADGE_CONTRACT_INK as `0x${string}`) || '0x1fC08c7466dF4134E624bc18520eC0d9CC308765',
  },
  rpcUrl: process.env.NEXT_PUBLIC_RPC_INK || 'https://rpc.inkonchain.com',
  explorerUrl: 'https://explorer.inkonchain.com',
  startBlock: 28181876,
}

const OPTIMISM_CONFIG: ChainConfig = {
  chainId: 10,
  architecture: 'monolithic',
  addresses: {
    core: (process.env.NEXT_PUBLIC_GM_OP_ADDRESS as `0x${string}`) || '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6',
    badge: (process.env.BADGE_CONTRACT_OP as `0x${string}`) || '0xb6055bF4AeD5f10884eC313dE7b733Ceb4dc3446',
  },
  rpcUrl: process.env.NEXT_PUBLIC_RPC_OP || 'https://mainnet.optimism.io',
  explorerUrl: 'https://optimistic.etherscan.io',
  startBlock: 143040782,
}

// Chain configurations registry
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  8453: BASE_MAINNET_CONFIG,
  84532: BASE_SEPOLIA_CONFIG,
  130: UNICHAIN_CONFIG,
  42220: CELO_CONFIG,
  57073: INK_CONFIG,
  10: OPTIMISM_CONFIG,
}

// Helper functions
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId]
}

export function getCoreAddress(chainId: number): `0x${string}` | undefined {
  return CHAIN_CONFIGS[chainId]?.addresses.core
}

export function getGuildAddress(chainId: number): `0x${string}` | undefined {
  const config = CHAIN_CONFIGS[chainId]
  if (config?.architecture === 'standalone') {
    return config.addresses.guild
  }
  // For monolithic, guild functions are in core contract
  return config?.addresses.core
}

export function getNFTAddress(chainId: number): `0x${string}` | undefined {
  const config = CHAIN_CONFIGS[chainId]
  if (config?.architecture === 'standalone') {
    return config.addresses.nft
  }
  // For monolithic, NFT functions are in core contract
  return config?.addresses.core
}

export function getBadgeAddress(chainId: number): `0x${string}` | undefined {
  return CHAIN_CONFIGS[chainId]?.addresses.badge
}

export function isStandaloneChain(chainId: number): boolean {
  return CHAIN_CONFIGS[chainId]?.architecture === 'standalone'
}

// Export for backward compatibility with existing code
export const CONTRACT_ADDRESSES: Record<string, `0x${string}`> = {
  base: BASE_MAINNET_CONFIG.addresses.core,
  unichain: UNICHAIN_CONFIG.addresses.core,
  celo: CELO_CONFIG.addresses.core,
  ink: INK_CONFIG.addresses.core,
  op: OPTIMISM_CONFIG.addresses.core,
}

// New: Standalone architecture addresses
export const STANDALONE_ADDRESSES = {
  base: {
    core: BASE_MAINNET_CONFIG.addresses.core,
    guild: BASE_MAINNET_CONFIG.addresses.guild!,
    nft: BASE_MAINNET_CONFIG.addresses.nft!,
    badge: BASE_MAINNET_CONFIG.addresses.badge,
  },
  baseSepolia: {
    core: BASE_SEPOLIA_CONFIG.addresses.core,
    guild: BASE_SEPOLIA_CONFIG.addresses.guild!,
    nft: BASE_SEPOLIA_CONFIG.addresses.nft!,
  },
}

// Default contract for backward compatibility
export const GM_CONTRACT_ADDRESS = BASE_MAINNET_CONFIG.addresses.core
