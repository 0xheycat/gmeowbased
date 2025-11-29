/**
 * Chain Registry - Multi-Chain Configuration
 * 
 * Source: Extracted from old foundation OnchainStats.tsx
 * Optimized: Centralized configuration, type-safe chain keys
 * Usage: RPC connections, explorer links, chain selectors
 */

export type ChainKey = 
  | 'base' 
  | 'celo' 
  | 'optimism' 
  | 'ethereum' 
  | 'arbitrum' 
  | 'avax' 
  | 'berachain' 
  | 'bnb' 
  | 'fraxtal' 
  | 'katana' 
  | 'soneium' 
  | 'taiko' 
  | 'unichain' 
  | 'ink' 
  | 'hyperevm'

export type ChainConfig = {
  key: ChainKey
  name: string
  chainId: number
  rpc: string
  explorer: string // Base URL without trailing slash
  icon: string
  hasEtherscanV2: boolean // Supports Etherscan v2 API
  nativeSymbol: string
  rpcTimeout?: number // Custom timeout in ms (default: 10000)
}

/**
 * Centralized chain configuration
 * All chains supported by Gmeowbased
 */
export const CHAIN_REGISTRY: Record<ChainKey, ChainConfig> = {
  base: {
    key: 'base',
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://basescan.org',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/base.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  celo: {
    key: 'celo',
    name: 'Celo',
    chainId: 42220,
    rpc: 'https://forno.celo.org',
    explorer: 'https://celoscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/celo.png',
    hasEtherscanV2: true,
    nativeSymbol: 'CELO',
  },
  optimism: {
    key: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  ethereum: {
    key: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpc: 'https://eth-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://etherscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/eth.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  arbitrum: {
    key: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/arbitrum.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  avax: {
    key: 'avax',
    name: 'Avalanche',
    chainId: 43114,
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/avax.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'AVAX',
  },
  berachain: {
    key: 'berachain',
    name: 'Berachain',
    chainId: 80094,
    rpc: 'https://rpc.berachain.com',
    explorer: 'https://berascan.com',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/berachain.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'BERA',
  },
  bnb: {
    key: 'bnb',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/bnb.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'BNB',
  },
  fraxtal: {
    key: 'fraxtal',
    name: 'Fraxtal',
    chainId: 252,
    rpc: 'https://frax-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://fraxscan.com',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/fraxtal.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  katana: {
    key: 'katana',
    name: 'Katana',
    chainId: 360,
    rpc: 'https://rpc.katana.network',
    explorer: 'https://explorer.katana.org',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/katana.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'KAT',
  },
  soneium: {
    key: 'soneium',
    name: 'Soneium',
    chainId: 1946,
    rpc: 'https://rpc.minato.soneium.org',
    explorer: 'https://explorer.minato.soneium.org',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/soneium.png',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  taiko: {
    key: 'taiko',
    name: 'Taiko',
    chainId: 167000,
    rpc: 'https://rpc.mainnet.taiko.xyz',
    explorer: 'https://taikoscan.io',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/taiko.svg',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  unichain: {
    key: 'unichain',
    name: 'Unichain',
    chainId: 130,
    rpc: 'https://mainnet.unichain.org',
    explorer: 'https://uniscan.xyz',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/unichain.png',
    hasEtherscanV2: true,
    nativeSymbol: 'ETH',
  },
  ink: {
    key: 'ink',
    name: 'Ink',
    chainId: 57073,
    rpc: 'https://ink-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://explorer.inkonchain.com',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/ink.png',
    hasEtherscanV2: true,
    nativeSymbol: 'INK',
  },
  hyperevm: {
    key: 'hyperevm',
    name: 'HyperEVM',
    chainId: 999,
    rpc: 'https://hyperliquid-mainnet.g.alchemy.com/v2/_ScddWNDeydEhhrjEHgsNRv6nAoaJpgE',
    explorer: 'https://explorer.hyperliquid.xyz',
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/hyper.png',
    hasEtherscanV2: true,
    nativeSymbol: 'HYPE',
  },
}

/**
 * Get chain configuration by key
 * @param chainKey - Chain identifier
 * @returns Chain configuration or null if not found
 */
export function getChainConfig(chainKey: ChainKey): ChainConfig | null {
  return CHAIN_REGISTRY[chainKey] || null
}

/**
 * Get all supported chain keys
 * @returns Array of all chain keys
 */
export function getAllChainKeys(): ChainKey[] {
  return Object.keys(CHAIN_REGISTRY) as ChainKey[]
}

/**
 * Get all chain configurations
 * @returns Array of all chain configs
 */
export function getAllChainConfigs(): ChainConfig[] {
  return Object.values(CHAIN_REGISTRY)
}

/**
 * Get chain by chainId
 * @param chainId - Numeric chain ID
 * @returns Chain configuration or null if not found
 */
export function getChainByChainId(chainId: number): ChainConfig | null {
  return Object.values(CHAIN_REGISTRY).find(chain => chain.chainId === chainId) || null
}

/**
 * Check if chain key is valid
 * @param key - String to check
 * @returns true if valid chain key
 */
export function isValidChainKey(key: string): key is ChainKey {
  return key in CHAIN_REGISTRY
}
