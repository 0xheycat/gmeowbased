/**
 * Data Source Router - Blockscout API with Optimized Performance
 * 
 * ARCHITECTURE:
 * - Blockscout HTTP API (reliable, works in Next.js API routes)
 * - Parallel fetching with Promise.all for speed
 * - Token transfers used to calculate account age when no normal txs
 * 
 * SUPPORTED CHAINS (12):
 * Base (8453), Ethereum (1), Optimism (10), Arbitrum (42161),
 * Polygon (137), Gnosis (100), Celo (42220), Scroll (534352),
 * Unichain (130), Soneium (1868), zkSync (324), Zora (7777777)
 * 
 * DATA SOURCES:
 * - Transactions: Blockscout txlist API (paginated)
 * - Token Transfers: Blockscout tokentx API (paginated)
 * - Portfolio: Blockscout get_tokens_by_address
 * - NFTs: Blockscout nft_tokens_by_address
 * 
 * OPTIMIZATIONS:
 * - Parallel fetching (portfolio + txs + NFTs simultaneously)
 * - Smart pagination (max 3 pages to prevent timeouts)
 * - Use token transfers to fill transaction gaps
 * - Early cache returns
 */

import { BlockscoutClient } from './blockscout-client'
import { formatEther } from 'viem'
import type { Address } from 'viem'
import type { PublicClient } from 'viem'
import { createPublicClient, http } from 'viem'
import { base, mainnet, optimism, arbitrum, polygon, gnosis, celo, scroll, zkSync } from 'viem/chains'

type ChainKey = 'base' | 'ethereum' | 'optimism' | 'arbitrum' | 'polygon' | 'gnosis' | 'celo' | 'scroll' | 'unichain' | 'soneium' | 'zksync' | 'zora' | 'op'

// Token portfolio item
export type TokenHolding = {
  symbol: string
  balance: string // Human readable balance
  valueUSD: string // USD value
  address: string // Token contract address
}

// NFT collection item
export type NFTCollection = {
  name: string
  symbol: string
  address: string
  tokenType: string // ERC-721, ERC-1155
  tokenCount: number
  floorPriceETH: string | null
  floorPriceUSD: string | null
  totalValueETH: string | null
  totalValueUSD: string | null
}

export type OnchainStatsData = {
  // Core Identity (Professional Pattern) - ENHANCED with MCP data (Dec 12)
  address?: string | null // Ethereum address (added for context)
  ensName?: string | null // ENS domain name
  isContract?: boolean | null // Contract vs EOA
  publicTags?: string[] | null // Blockscout public tags (exchange, bot, etc) - FIXED from MCP
  contractVerified?: boolean | null // If contract, is it verified?
  contractName?: string | null // NEW: Contract name from MCP (for verified contracts)
  accountAgeDays: number | null // Days since first tx
  
  // Portfolio Value (Most Requested Feature)
  balance: string | null // Native token balance (formatted ETH) - FIXED from MCP
  balanceWei: string | null // Native token balance (raw wei) - FIXED from MCP
  portfolioValueUSD?: string | null // Total portfolio value in USD
  erc20TokenCount?: number | null // Number of different ERC-20 tokens held
  nftCollectionsCount?: number | null // Number of NFT collections owned
  stablecoinBalance?: string | null // Total stablecoin balance (USDC + USDT + DAI)
  topTokens?: TokenHolding[] | null // Top 5 tokens by USD value
  
  // NFT Portfolio (Phase 3)
  nftPortfolioValueUSD?: string | null // Total NFT portfolio value (floor prices)
  nftFloorValueETH?: string | null // Total NFT floor value in ETH
  topNFTCollections?: NFTCollection[] | null // Top 5 NFT collections by value
  
  // Account Activity
  totalTxs?: number | null // Total transactions
  totalTokenTxs?: number | null // Token transfers
  uniqueContracts?: number | null // Contract diversity
  contractsDeployed: number | null // Developer activity
  uniqueDays?: number | null // Days active
  uniqueWeeks?: number | null // Weeks active
  uniqueMonths?: number | null // Months active
  
  // Time-Based Metrics
  firstTx: {
    blockNumber: string | null
    timestamp: number | null
    date: string | null // ISO date string (YYYY-MM-DD HH:mm:ss)
  } | null
  lastTx?: {
    blockNumber: string | null
    timestamp: number | null
    date: string | null // ISO date string (YYYY-MM-DD HH:mm:ss)
  } | null
  firstTxDate?: string | null // ISO date string of first transaction  
  lastTxDate?: string | null // ISO date string of last transaction
  accountAge: number | null // Seconds since first tx
  
  // Financial Metrics
  totalVolume: string | null // Total ETH moved (formatted)
  totalVolumeWei: string | null // Total wei moved
  
  // Gas Analytics (Phase 2)
  totalGasUsed?: string | null // Total gas consumed (gas units)
  totalGasSpentETH?: string | null // Gas fees paid in ETH
  totalGasSpentUSD?: string | null // Gas fees paid in USD
  avgGasPrice?: string | null // Average gas price (Gwei)
  
  // L2 & Bridge Stats
  bridgeDeposits?: number | null // L1→L2 deposits count
  bridgeWithdrawals?: number | null // L2→L1 withdrawals count
  nativeBridgeUsed?: boolean | null // Bridge adoption
  
  // Reputation Scores
  talentScore?: number | null // Talent Protocol score
  neynarScore?: number | null // Farcaster influence
  
  // Metadata
  dataSource: 'gmeowbased' // Always Blockscout
  cost: '$0' // Always free
}

// In-memory cache
type CachedData = {
  data: OnchainStatsData
  timestamp: number
}

const serverCache = new Map<string, CachedData>()

const CACHE_TTL = {
  balance: 1 * 60 * 1000, // 1 min
  stats: 10 * 1000, // 10 seconds (FOR TESTING - normally 5 min)
  firstTx: 60 * 60 * 1000, // 1 hour (doesn't change)
}

// Blockscout supported chains (100% accurate, FREE)
// Expanded from 5 to 12 chains - all chains from gmeow-utils.ts ChainKey
const BLOCKSCOUT_CHAINS: ChainKey[] = [
  'base', 'ethereum', 'optimism', 'arbitrum', 'polygon', 'gnosis', 'celo', 
  'scroll', 'unichain', 'soneium', 'zksync', 'zora',
]

// Chain configs for direct RPC balance calls (balance not available in Blockscout API easily)
const CHAIN_CONFIGS: Record<ChainKey, { chain: any; rpc: string }> = {
  base: { chain: base, rpc: 'https://mainnet.base.org' },
  ethereum: { chain: mainnet, rpc: 'https://eth.llamarpc.com' },
  optimism: { chain: optimism, rpc: 'https://mainnet.optimism.io' },
  op: { chain: optimism, rpc: 'https://mainnet.optimism.io' },
  arbitrum: { chain: arbitrum, rpc: 'https://arb1.arbitrum.io/rpc' },
  polygon: { chain: polygon, rpc: 'https://polygon-rpc.com' },
  gnosis: { chain: gnosis, rpc: 'https://rpc.gnosischain.com' },
  celo: { chain: celo, rpc: 'https://forno.celo.org' },
  scroll: { chain: scroll, rpc: 'https://rpc.scroll.io' },
  unichain: { chain: { id: 130, name: 'Unichain' }, rpc: 'https://mainnet.unichain.org' },
  soneium: { chain: { id: 1868, name: 'Soneium' }, rpc: 'https://rpc.soneium.org' },
  zksync: { chain: zkSync, rpc: 'https://mainnet.era.zksync.io' },
  zora: { chain: { id: 7777777, name: 'Zora' }, rpc: 'https://rpc.zora.energy' },
}

export class DataSourceRouter {
  private blockscoutClient: BlockscoutClient
  private rpcClient: any // Type compatibility for different viem versions
  private chainKey: ChainKey

  constructor(chainKey: ChainKey) {
    this.chainKey = chainKey
    
    // ALL chains use Blockscout (no fallback)
    this.blockscoutClient = new BlockscoutClient(
      chainKey === 'op' ? 'optimism' : chainKey as 'base' | 'ethereum' | 'optimism' | 'arbitrum' | 'polygon' | 'gnosis' | 'celo' | 'scroll' | 'unichain' | 'soneium' | 'zksync' | 'zora'
    )
    
    // Lightweight RPC client for balance only
    const config = CHAIN_CONFIGS[chainKey]
    this.rpcClient = createPublicClient({
      chain: config.chain as any,
      transport: http(config.rpc, { batch: true, timeout: 10_000 }),
    })
  }

  /**
   * Fetch all stats - Blockscout only (no RPC fallback)
   */
  async fetchStats(address: Address): Promise<OnchainStatsData> {
    const cacheKey = `${this.chainKey}:${address}`
    
    // Check cache
    const cached = serverCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL.stats) {
      return cached.data
    }

    // Always use Blockscout (all 12 chains supported)
    return this.fetchFromBlockscout(address)
  }

  /**
   * Fetch from Blockscout API (100% accurate, includes scores)
   * MIGRATED TO BLOCKSCOUT MCP (Dec 12, 2025)
   * Balance now comes from Blockscout MCP instead of RPC
   */
  private async fetchFromBlockscout(address: Address): Promise<OnchainStatsData> {
    const cacheKey = `${this.chainKey}:${address}`
    
    try {
      const stats = await this.blockscoutClient.getRichStats(address)

      // FIXED: Use balance from Blockscout MCP (via getIdentityInfo)
      // This is more accurate than RPC as it's indexed from latest block
      const balance = stats.balance ? BigInt(stats.balance) : BigInt(0)

      // Helper to convert Unix timestamp to ISO date string
      const toDateString = (timestamp: number | null | undefined): string | null => {
        if (!timestamp) return null
        return new Date(timestamp * 1000).toISOString().replace('T', ' ').slice(0, 19)
      }

      const data: OnchainStatsData = {
        // Core Identity (Professional Pattern) - ENHANCED with MCP data
        address: address.toLowerCase(),
        ensName: stats.ensName,
        isContract: stats.isContract,
        publicTags: stats.publicTags, // FIXED: Now gets actual tags from MCP
        contractVerified: stats.contractVerified,
        contractName: stats.contractName, // NEW: Contract name from MCP
        accountAgeDays: stats.accountAgeDays,
        
        // Portfolio Value (Most Requested Feature) - FIXED with accurate balance
        balance: formatEther(balance),
        balanceWei: balance.toString(),
        portfolioValueUSD: stats.portfolioValueUSD?.toFixed(2) || null,
        erc20TokenCount: stats.erc20TokenCount,
        nftCollectionsCount: stats.nftCollectionsCount,
        stablecoinBalance: stats.stablecoinBalance?.toFixed(2) || null,
        topTokens: stats.topTokens,
        
        // NFT Portfolio (Phase 3)
        nftPortfolioValueUSD: stats.nftPortfolioValueUSD,
        nftFloorValueETH: stats.nftFloorValueETH,
        topNFTCollections: stats.topNFTCollections,
        
        // Account Activity
        totalTxs: stats.totalTxs,
        totalTokenTxs: stats.totalTokenTxs,
        uniqueContracts: stats.uniqueContracts,
        contractsDeployed: stats.contractsDeployed || 0,
        uniqueDays: stats.uniqueDays,
        uniqueWeeks: stats.uniqueWeeks,
        uniqueMonths: stats.uniqueMonths,
        
        // Time-Based Metrics
        firstTx: stats.firstTx
          ? {
              blockNumber: stats.firstTx.blockNumber,
              timestamp: stats.firstTx.timestamp,
              date: toDateString(stats.firstTx.timestamp),
            }
          : null,
        lastTx: stats.lastTx
          ? {
              blockNumber: stats.lastTx.blockNumber,
              timestamp: stats.lastTx.timestamp,
              date: toDateString(stats.lastTx.timestamp),
            }
          : null,
        firstTxDate: toDateString(stats.firstTx?.timestamp),
        lastTxDate: toDateString(stats.lastTx?.timestamp),
        accountAge: stats.accountAgeSeconds,
        
        // Financial Metrics
        totalVolume: formatEther(stats.totalVolume),
        totalVolumeWei: stats.totalVolume.toString(),
        
        // Gas Analytics (Phase 2)
        totalGasUsed: stats.totalGasUsed,
        totalGasSpentETH: stats.totalGasSpentETH,
        totalGasSpentUSD: stats.totalGasSpentUSD,
        avgGasPrice: stats.avgGasPrice,
        
        // L2 & Bridge Stats
        bridgeDeposits: stats.bridgeDeposits,
        bridgeWithdrawals: stats.bridgeWithdrawals,
        nativeBridgeUsed: stats.nativeBridgeUsed,
        
        // Reputation Scores
        talentScore: stats.talentScore,
        neynarScore: stats.neynarScore,
        
        // Metadata
        dataSource: 'gmeowbased',
        cost: '$0',
      }

      // Cache result
      serverCache.set(cacheKey, { data, timestamp: Date.now() })

      return data
    } catch (error) {
      console.error(`[DataSourceRouter] Blockscout error for ${address} on ${this.chainKey}:`, error)
      throw error // No RPC fallback - fail fast
    }
  }

  /**
   * Clear cache for specific address or entire chain
   */
  clearCache(address?: Address) {
    if (address) {
      serverCache.delete(`${this.chainKey}:${address}`)
    } else {
      // Clear all for this chain
      for (const key of serverCache.keys()) {
        if (key.startsWith(`${this.chainKey}:`)) {
          serverCache.delete(key)
        }
      }
    }
  }
}
