/**
 * Blockscout MCP Client - Professional High-Performance Implementation
 * 
 * Architecture:
 * - Pure MCP-based data fetching (no legacy HTTP APIs)
 * - Parallel batch fetching for optimal speed
 * - Smart pagination with configurable limits
 * - TypeScript-first with comprehensive type safety
 * 
 * Performance Optimizations:
 * - Promise.all for parallel data fetching (portfolio + txs + NFTs simultaneously)
 * - Cursor-based pagination (MCP native)
 * - Configurable max pages to prevent timeouts
 * - Early returns for empty datasets
 * 
 * Supported Chains (12):
 * Base (8453), Optimism (10), Ethereum (1), Arbitrum (42161),
 * Polygon (137), Gnosis (100), Celo (42220), Scroll (534352),
 * Unichain (130), Soneium (1868), zkSync (324), Zora (7777777)
 */

import type { Address } from 'viem'

type ChainKey =
  | 'base'
  | 'ethereum'
  | 'optimism'
  | 'arbitrum'
  | 'polygon'
  | 'gnosis'
  | 'celo'
  | 'scroll'
  | 'unichain'
  | 'soneium'
  | 'zksync'
  | 'zora'

interface ChainConfig {
  chainId: number
  name: string
  ecosystem: string[]
}

// Chain configurations
const CHAIN_CONFIGS: Record<ChainKey, ChainConfig> = {
  base: { chainId: 8453, name: 'Base', ecosystem: ['Ethereum', 'Superchain'] },
  ethereum: { chainId: 1, name: 'Ethereum', ecosystem: ['Ethereum'] },
  optimism: { chainId: 10, name: 'OP Mainnet', ecosystem: ['Optimism', 'Superchain'] },
  arbitrum: { chainId: 42161, name: 'Arbitrum One', ecosystem: ['Arbitrum'] },
  polygon: { chainId: 137, name: 'Polygon PoS', ecosystem: ['Polygon'] },
  gnosis: { chainId: 100, name: 'Gnosis', ecosystem: ['Gnosis'] },
  celo: { chainId: 42220, name: 'Celo', ecosystem: ['Celo'] },
  scroll: { chainId: 534352, name: 'Scroll', ecosystem: ['Ethereum'] },
  unichain: { chainId: 130, name: 'Unichain', ecosystem: ['Ethereum'] },
  soneium: { chainId: 1868, name: 'Soneium', ecosystem: ['Ethereum'] },
  zksync: { chainId: 324, name: 'zkSync Era', ecosystem: ['zkSync'] },
  zora: { chainId: 7777777, name: 'Zora', ecosystem: ['Ethereum', 'Superchain'] },
}

// MCP Response Types
interface MCPTokenTransfer {
  block: number
  timestamp: string
  tx_hash: string
  from: { hash: string }
  to: { hash: string }
  token: {
    address: string
    name: string
    symbol: string
    decimals: string
    type: 'ERC-20' | 'ERC-721' | 'ERC-1155'
  }
  total: {
    value: string
    decimals: string
  }
  method: string | null
}

interface MCPToken {
  token: {
    address: string
    name: string
    symbol: string
    decimals: string
    type: string
    exchange_rate: string | null
    total_supply: string
    holders: string
  }
  value: string
  token_id: string | null
}

interface MCPAddressInfo {
  basic_info: {
    hash: string
    coin_balance: string
    exchange_rate: string
    has_tokens: boolean
    has_token_transfers: boolean
    has_logs: boolean
    is_contract: boolean
    ens_domain_name: string | null
  }
}

// Internal types for compatibility
interface Transaction {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  gasUsed: string
  gasPrice: string
}

interface TokenTransfer {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  tokenAddress: string
  tokenName: string
  tokenSymbol: string
  value: string
}

export interface OnchainStatsData {
  totalTxs: number
  totalTokenTxs: number
  accountAgeDays: number | null
  firstTx: Transaction | null
  lastTx: Transaction | null
  totalVolume: string
  contractsDeployed: number
  uniqueContracts: number
  uniqueDays: number
  uniqueWeeks: number
  uniqueMonths: number
  portfolioValueUSD: string | null
  erc20TokenCount: number | null
  nftCount: number | null
  talentScore: number | null
  neynarScore: number | null
  ensName: string | null
}

/**
 * BlockscoutMCPClient - High-performance MCP-native implementation
 */
export class BlockscoutMCPClient {
  private chainKey: ChainKey
  private chainId: number

  constructor(chainKey: ChainKey) {
    this.chainKey = chainKey
    this.chainId = CHAIN_CONFIGS[chainKey].chainId
  }

  /**
   * Get address counters (transactions, token transfers, gas usage)
   * Professional Pattern: Use Blockscout /counters endpoint for accurate totals
   */
  private async getAddressCountersMCP(address: Address): Promise<{
    transactionsCount: number
    tokenTransfersCount: number
    gasUsageCount: number
  } | null> {
    try {
      console.log(`[BlockscoutMCP] ${this.chainKey} Fetching counters for ${address}`)
      // @ts-ignore - MCP tools are injected at runtime
      const response = await mcp_blockscout_direct_api_call({
        chain_id: this.chainId.toString(),
        endpoint_path: `/api/v2/addresses/${address}/counters`,
      })

      console.log(`[BlockscoutMCP] Counters raw response:`, response)
      console.log(`[BlockscoutMCP] Counters data:`, response?.data)

      if (!response?.data) {
        console.warn(`[BlockscoutMCP] No data in counters response`)
        return null
      }

      const counters = {
        transactionsCount: parseInt(response.data.transactions_count || '0'),
        tokenTransfersCount: parseInt(response.data.token_transfers_count || '0'),
        gasUsageCount: parseInt(response.data.gas_usage_count || '0'),
      }
      
      console.log(`[BlockscoutMCP] Parsed counters:`, counters)
      return counters
    } catch (error) {
      console.warn(`[BlockscoutMCP] ${this.chainKey} getAddressCountersMCP error:`, error)
      return null
    }
  }

  /**
   * Get ALL transactions using MCP (includes native tx, contract interactions, deployments)
   * Uses MCP get_transactions_by_address
   */
  private async getTransactionsMCP(
    address: Address,
    options: {
      ageFrom?: string // ISO 8601 timestamp
      ageTo?: string
      maxPages?: number
    } = {}
  ): Promise<TokenTransfer[]> {
    const maxPages = options.maxPages || 3
    const transfers: TokenTransfer[] = []
    let cursor: string | undefined
    let page = 0

    try {
      // Calculate time range for recent data (last 2 years by default)
      const ageTo = options.ageTo || new Date().toISOString()
      const ageFrom = options.ageFrom || new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString()

      while (page < maxPages) {
        // @ts-ignore - MCP tools are injected at runtime
        const response = await mcp_blockscout_get_transactions_by_address({
          chain_id: this.chainId.toString(),
          address,
          age_from: ageFrom,
          age_to: ageTo,
          cursor,
        })

        if (!response?.data || response.data.length === 0) {
          break
        }

        // Transform MCP format to internal format
        for (const item of response.data) {
          transfers.push({
            hash: item.hash,
            blockNumber: item.block_number?.toString() || '0',
            timeStamp: (new Date(item.timestamp).getTime() / 1000).toString(),
            from: item.from?.hash || '',
            to: item.to?.hash || '',
            tokenAddress: '', // Not a token transfer
            tokenName: '',
            tokenSymbol: '',
            value: item.value || '0',
          })
        }

        // Check for pagination
        if (response.pagination?.next_call) {
          const nextCall = response.pagination.next_call
          cursor = nextCall.params?.cursor
          if (!cursor) break
        } else {
          break
        }

        page++
      }

      return transfers
    } catch (error) {
      console.warn(`[BlockscoutMCP] ${this.chainKey} getTransactionsMCP error:`, error)
      return []
    }
  }

  /**
   * Get token transfers with pagination support
   * Uses MCP get_token_transfers_by_address with time-based filtering
   */
  private async getTokenTransfersMCP(
    address: Address,
    options: {
      ageFrom?: string // ISO 8601 timestamp
      ageTo?: string
      maxPages?: number
    } = {}
  ): Promise<TokenTransfer[]> {
    const maxPages = options.maxPages || 3
    const transfers: TokenTransfer[] = []
    let cursor: string | undefined
    let page = 0

    try {
      // Calculate time range for recent data (last 2 years by default)
      const ageTo = options.ageTo || new Date().toISOString()
      const ageFrom = options.ageFrom || new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString() // 2 years ago

      while (page < maxPages) {
        // @ts-ignore - MCP tools are injected at runtime
        const response = await mcp_blockscout_get_token_transfers_by_address({
          chain_id: this.chainId.toString(),
          address,
          age_from: ageFrom,
          age_to: ageTo,
          cursor,
        })

        if (!response?.data?.items || response.data.items.length === 0) {
          break
        }

        // Transform MCP format to internal format
        for (const item of response.data.items) {
          transfers.push({
            hash: item.tx_hash,
            blockNumber: item.block_number?.toString() || '0',
            timeStamp: (new Date(item.timestamp).getTime() / 1000).toString(),
            from: item.from.hash,
            to: item.to.hash,
            tokenAddress: item.token.address,
            tokenName: item.token.name,
            tokenSymbol: item.token.symbol,
            value: item.total.value,
          })
        }

        // Check for pagination
        if (response.pagination?.next_call) {
          const nextCall = response.pagination.next_call
          cursor = nextCall.arguments?.cursor
          if (!cursor) break
        } else {
          break
        }

        page++
      }

      return transfers
    } catch (error) {
      console.warn(`[BlockscoutMCP] ${this.chainKey} getTokenTransfersMCP error:`, error)
      return []
    }
  }

  /**
   * Get address info using MCP
   */
  private async getAddressInfoMCP(address: Address): Promise<MCPAddressInfo | null> {
    try {
      // @ts-ignore
      const response = await mcp_blockscout_get_address_info({
        chain_id: this.chainId.toString(),
        address,
      })

      return response?.data || null
    } catch (error) {
      console.warn(`[BlockscoutMCP] ${this.chainKey} getAddressInfoMCP error:`, error)
      return null
    }
  }

  /**
   * Get token portfolio using MCP
   */
  private async getTokenPortfolioMCP(address: Address): Promise<{
    portfolioValueUSD: string | null
    erc20TokenCount: number | null
  }> {
    try {
      // @ts-ignore
      const response = await mcp_blockscout_get_tokens_by_address({
        chain_id: this.chainId.toString(),
        address,
      })

      if (!response?.data?.items) {
        return { portfolioValueUSD: null, erc20TokenCount: null }
      }

      const tokens = response.data.items
      const erc20Tokens = tokens.filter((t: MCPToken) => t.token.type === 'ERC-20')

      let totalValueUSD = 0
      for (const token of erc20Tokens) {
        if (token.token.exchange_rate && token.value) {
          const exchangeRate = parseFloat(token.token.exchange_rate)
          const balance = parseFloat(token.value) / Math.pow(10, parseInt(token.token.decimals))
          totalValueUSD += balance * exchangeRate
        }
      }

      return {
        portfolioValueUSD: totalValueUSD > 0 ? totalValueUSD.toFixed(2) : null,
        erc20TokenCount: erc20Tokens.length || null,
      }
    } catch (error) {
      console.warn(`[BlockscoutMCP] ${this.chainKey} getTokenPortfolioMCP error:`, error)
      return { portfolioValueUSD: null, erc20TokenCount: null }
    }
  }

  /**
   * Get NFT collections count using MCP
   */
  private async getNFTCountMCP(address: Address): Promise<number | null> {
    try {
      // @ts-ignore
      const response = await mcp_blockscout_nft_tokens_by_address({
        chain_id: this.chainId.toString(),
        address,
      })

      if (!response?.data?.items) {
        return null
      }

      // Count unique NFT collections
      const collections = new Set(response.data.items.map((nft: any) => nft.token.address))
      return collections.size || null
    } catch (error) {
      console.warn(`[BlockscoutMCP] ${this.chainKey} getNFTCountMCP error:`, error)
      return null
    }
  }

  /**
   * Get comprehensive onchain stats
   * Professional Pattern: Use /counters for accurate totals + efficient first/last tx fetching
   */
  async getRichStats(address: Address): Promise<OnchainStatsData> {
    // PROFESSIONAL STRATEGY:
    // 1. Use /counters endpoint for accurate transaction counts (avoids pagination)
    // 2. Fetch recent transactions for uniqueDays/Weeks/Months calculations
    // 3. Fetch oldest transactions for firstTx (account age)
    
    // PHASE 1: Parallel fetch all data sources
    const [addressInfo, tokenPortfolio, nftCount, counters, recentTxs] = await Promise.all([
      this.getAddressInfoMCP(address),
      this.getTokenPortfolioMCP(address),
      this.getNFTCountMCP(address),
      this.getAddressCountersMCP(address),
      this.getTransactionsMCP(address, { maxPages: 5 }), // Recent txs for metrics
    ])
    
    // PHASE 2: Get oldest transaction for firstTx calculation
    // MCP returns transactions in DESC order, so we need to query backwards
    let oldestTxs: TokenTransfer[] = []
    if (recentTxs.length > 0) {
      const recentTimestamps = recentTxs.map(t => parseInt(t.timeStamp))
      const oldestInRecent = Math.min(...recentTimestamps)
      const oldestDate = new Date(oldestInRecent * 1000).toISOString()
      
      // Fetch transactions older than our recent batch
      oldestTxs = await this.getTransactionsMCP(address, {
        maxPages: 1,
        ageTo: oldestDate,
      })
    }
    
    // Combine and deduplicate transactions
    const allTxs = [...recentTxs, ...oldestTxs]
    const tokenTransfers = Array.from(
      new Map(allTxs.map(t => [t.hash, t])).values()
    )

    // Use counters endpoint for accurate totals (Professional Pattern)
    const totalTxs = counters?.transactionsCount || tokenTransfers.length
    const totalTokenTxs = counters?.tokenTransfersCount || tokenTransfers.length

    // Calculate account age from all fetched transactions
    const timestamps = tokenTransfers.map((t) => parseInt(t.timeStamp) * 1000)
    const sortedTimestamps = timestamps.sort((a, b) => a - b)
    const firstTimestamp = sortedTimestamps[0]
    const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1]

    const accountAgeSeconds = firstTimestamp
      ? Math.floor((Date.now() - firstTimestamp) / 1000)
      : null
    const accountAgeDays = accountAgeSeconds
      ? Math.floor(accountAgeSeconds / 86400)
      : null

    // Calculate unique active days/weeks/months
    const dates = timestamps.map((ts) => new Date(ts))
    const uniqueDays = new Set(dates.map((d) => d.toISOString().split('T')[0])).size
    const uniqueWeeks = new Set(
      dates.map((d) => {
        const startOfYear = new Date(d.getFullYear(), 0, 1)
        const days = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000)
        return `${d.getFullYear()}-W${Math.ceil(days / 7)}`
      })
    ).size
    const uniqueMonths = new Set(dates.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`)).size

    // Create first/last tx objects
    // Sort ascending (oldest first) for firstTx
    const sortedAscending = [...tokenTransfers].sort(
      (a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp)
    )
    const firstTransfer = sortedAscending[0]
    
    // Sort descending (newest first) for lastTx
    const sortedDescending = [...tokenTransfers].sort(
      (a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp)
    )
    const lastTransfer = sortedDescending[0]

    const firstTx = firstTransfer
      ? {
          hash: firstTransfer.hash,
          blockNumber: firstTransfer.blockNumber,
          timeStamp: firstTransfer.timeStamp,
          from: firstTransfer.from,
          to: firstTransfer.to,
          value: '0', // Token transfer, not native transfer
          gasUsed: '0',
          gasPrice: '0',
        }
      : null

    const lastTx = lastTransfer
      ? {
          hash: lastTransfer.hash,
          blockNumber: lastTransfer.blockNumber,
          timeStamp: lastTransfer.timeStamp,
          from: lastTransfer.from,
          to: lastTransfer.to,
          value: '0',
          gasUsed: '0',
          gasPrice: '0',
        }
      : null

    return {
      totalTxs,
      totalTokenTxs,
      accountAgeDays,
      firstTx,
      lastTx,
      totalVolume: '0', // Not calculated from token transfers
      contractsDeployed: 0,
      uniqueContracts: 0,
      uniqueDays,
      uniqueWeeks,
      uniqueMonths,
      portfolioValueUSD: tokenPortfolio.portfolioValueUSD,
      erc20TokenCount: tokenPortfolio.erc20TokenCount,
      nftCount,
      talentScore: null,
      neynarScore: null,
      ensName: addressInfo?.basic_info?.ens_domain_name || null,
    }
  }
}
