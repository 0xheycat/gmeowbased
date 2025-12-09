/**
 * Blockscout Client - FREE Blockchain Explorer API
 * 
 * Strategy:
 * - Uses Blockscout MCP server for ALL supported chains (FREE)
 * - Provides rich stats: transactions, tokens, ENS, Farcaster tags, gas prices
 * - Supports 12 chains our app uses (Base, Optimism, Ethereum, Arbitrum, etc)
 * 
 * Chains Supported (via Blockscout MCP):
 * ✅ Base (8453), ✅ Optimism (10), ✅ Ethereum (1), ✅ Arbitrum (42161),
 * ✅ Polygon (137), ✅ Gnosis (100), ✅ Celo (42220), ✅ Scroll (534352),
 * ✅ Unichain (130), ✅ Soneium (1868), ✅ zkSync (324), ✅ Zora (7777777)
 * 
 * Chains NOT Supported (removed from config):
 * ❌ Berachain (80094), ❌ Fraxtal (252), ❌ Katana (747474), 
 * ❌ Taiko (167000), ❌ HyperEVM (999), ❌ Ink (57073)
 * ❌ Avalanche (43114), ❌ BNB (56)
 * 
 * Rate Limits: 10 req/sec with API key (free tier)
 * 
 * Integration: Blockscout MCP server provides:
 * - get_address_info: Balance, ENS, contract status, token info, Farcaster tags
 * - direct_api_call /api/v2/stats: Gas prices, network stats, coin price
 * - get_tokens_by_address: Token holdings with market data
 * - get_transaction_logs: Event logs for contract interactions
 */

import type { Address } from 'viem'

// Supported chains (via Blockscout MCP) - BLOCKSCOUT-ONLY POLICY
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

interface BlockscoutConfig {
  chainId: number
  name: string
  supported: boolean
  ecosystem: string[]
  apiUrl?: string // Legacy HTTP API (for current implementation)
}

// Map chain keys to Blockscout MCP chain IDs
// TODO: Migrate to Blockscout MCP for richer stats (see BLOCKSCOUT-MCP-INTEGRATION.md)
export const BLOCKSCOUT_CHAINS: Record<ChainKey, BlockscoutConfig> = {
  base: {
    chainId: 8453,
    name: 'Base',
    supported: true,
    ecosystem: ['Ethereum', 'Superchain'],
    apiUrl: 'https://base.blockscout.com/api', // Legacy - will use MCP in future
  },
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    supported: true,
    ecosystem: ['Ethereum'],
    apiUrl: 'https://eth.blockscout.com/api',
  },
  optimism: {
    chainId: 10,
    name: 'OP Mainnet',
    supported: true,
    ecosystem: ['Optimism', 'Superchain'],
    apiUrl: 'https://explorer.optimism.io/api', // NEW: Optimism migrated to explorer.optimism.io
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One Nitro',
    supported: true,
    ecosystem: ['Arbitrum'],
    apiUrl: 'https://arbitrum.blockscout.com/api',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon PoS',
    supported: true,
    ecosystem: ['Polygon'],
    apiUrl: 'https://polygon.blockscout.com/api',
  },
  gnosis: {
    chainId: 100,
    name: 'Gnosis',
    supported: true,
    ecosystem: ['Gnosis'],
    apiUrl: 'https://gnosis.blockscout.com/api',
  },
  celo: {
    chainId: 42220,
    name: 'Celo',
    supported: true,
    ecosystem: ['Ethereum'],
    apiUrl: 'https://celo.blockscout.com/api',
  },
  scroll: {
    chainId: 534352,
    name: 'Scroll',
    supported: true,
    ecosystem: ['Ethereum'],
    apiUrl: 'https://scroll.blockscout.com/api',
  },
  unichain: {
    chainId: 130,
    name: 'Unichain',
    supported: true,
    ecosystem: ['Optimism'],
    apiUrl: 'https://unichain.blockscout.com/api',
  },
  soneium: {
    chainId: 1868,
    name: 'Soneium',
    supported: true,
    ecosystem: ['Optimism'],
    apiUrl: 'https://soneium.blockscout.com/api',
  },
  zksync: {
    chainId: 324,
    name: 'ZkSync Era',
    supported: true,
    ecosystem: ['zkSync'],
    apiUrl: 'https://zksync.blockscout.com/api',
  },
  zora: {
    chainId: 7777777,
    name: 'Zora',
    supported: true,
    ecosystem: ['Optimism', 'Superchain'],
    apiUrl: 'https://zora.blockscout.com/api',
  },
}

// Helper to get chain name for display
export function getChainName(chainKey: ChainKey): string {
  return BLOCKSCOUT_CHAINS[chainKey]?.name || chainKey
}

// Check if chain is supported by Blockscout
export function isChainSupported(chainKey: string): chainKey is ChainKey {
  return chainKey in BLOCKSCOUT_CHAINS && BLOCKSCOUT_CHAINS[chainKey as ChainKey].supported
}

// Get all supported chains
export function getSupportedChains(): ChainKey[] {
  return Object.keys(BLOCKSCOUT_CHAINS).filter(
    key => BLOCKSCOUT_CHAINS[key as ChainKey].supported
  ) as ChainKey[]
}

// NOTE: For MCP integration, use these tools:
// - mcp_my-mcp-server_get_address_info(chain_id, address) - Basic info, ENS, tokens, Farcaster tags
// - mcp_my-mcp-server_direct_api_call(chain_id, '/api/v2/stats') - Gas prices, network stats
// - mcp_my-mcp-server_get_tokens_by_address(chain_id, address) - Token holdings with market data
// - mcp_my-mcp-server_get_transaction_logs(chain_id, tx_hash) - Event logs

export interface Transaction {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  gasUsed: string
  isError: string
  contractAddress?: string
}

export interface TokenTransfer {
  hash: string
  blockNumber: string
  timeStamp: string
  from: string
  to: string
  value: string
  tokenName: string
  tokenSymbol: string
  tokenDecimal: string
  contractAddress: string
}

export class BlockscoutClient {
  private config: BlockscoutConfig
  private chainKey: ChainKey

  constructor(chainKey: ChainKey) {
    this.chainKey = chainKey
    const config = BLOCKSCOUT_CHAINS[chainKey]
    if (!config) {
      throw new Error(`Blockscout not supported for chain: ${chainKey}`)
    }
    this.config = config
  }

  /**
   * Fetch Talent Protocol Builder Score
   * Uses Talent Passport API with wallet address
   */
  private async getTalentScore(address: Address): Promise<number | null> {
    try {
      const talentKey = process.env.NEXT_PUBLIC_TALENT_API_KEY || process.env.TALENT_API_KEY
      if (!talentKey) return null

      // Use scores endpoint with wallet address
      const params = new URLSearchParams({
        id: address,
        account_source: 'wallet',
      })

      const response = await fetch(
        `https://api.talentprotocol.com/scores?${params.toString()}`,
        {
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': talentKey,
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        }
      )

      if (!response.ok) return null

      const data = await response.json()
      const scores = Array.isArray(data?.scores) ? data.scores : []
      
      const builderScore = scores.find((s: any) => String(s?.slug) === 'builder_score')
      
      if (builderScore) {
        return typeof builderScore.points === 'number'
          ? builderScore.points
          : Number(builderScore.points)
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Fetch Neynar User Score
   * Requires FID lookup first
   */
  private async getNeynarScore(address: Address): Promise<number | null> {
    try {
      const neynarKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || process.env.NEYNAR_API_KEY
      if (!neynarKey) return null

      // First, get FID from address
      const fidResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
        {
          headers: {
            'x-api-key': neynarKey,
            'Accept': 'application/json',
          },
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      )

      if (!fidResponse.ok) return null

      const fidData = await fidResponse.json()
      const user = fidData?.[address.toLowerCase()]?.[0]
      const fid = user?.fid

      if (!fid) return null

      // Get user score by FID
      const scoreResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            'x-api-key': neynarKey,
            'Accept': 'application/json',
          },
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      )

      if (!scoreResponse.ok) return null

      const scoreData = await scoreResponse.json()
      const userData = Array.isArray(scoreData?.users) ? scoreData.users[0] : null

      if (!userData) return null

      // Check for score in multiple locations
      const score = typeof userData.score === 'number'
        ? userData.score
        : (typeof userData.experimental?.neynar_user_score === 'number' 
            ? userData.experimental.neynar_user_score 
            : null)

      return score != null ? Number(score) : null
    } catch {
      return null
    }
  }

  /**
   * Get address counters (ACCURATE total counts from Blockscout)
   * Professional Pattern: Use /counters endpoint instead of counting paginated results
   */
  async getAddressCounters(address: Address): Promise<{
    transactionsCount: number
    tokenTransfersCount: number
    gasUsageCount: number
  } | null> {
    try {
      const url = `${this.config.apiUrl}/v2/addresses/${address}/counters`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!response.ok) {
        console.warn(`[BlockscoutClient] ${this.chainKey} Counters API error: ${response.status}`)
        return null
      }

      const data = await response.json()
      
      const counters = {
        transactionsCount: parseInt(data.transactions_count || '0') || 0,
        tokenTransfersCount: parseInt(data.token_transfers_count || '0') || 0,
        gasUsageCount: parseInt(data.gas_usage_count || '0') || 0,
      }
      
      console.log(`[BlockscoutClient] ${this.chainKey} Counters for ${address}:`, counters)
      return counters
    } catch (error) {
      console.warn(`[BlockscoutClient] ${this.chainKey} getAddressCounters error:`, error)
      return null
    }
  }

  /**
   * Get all normal transactions for an address
   * Uses Blockscout v2 API (MCP pattern) for reliable data
   */
  async getTransactions(
    address: Address,
    options: {
      startBlock?: number
      endBlock?: number
      page?: number
      offset?: number
      sort?: 'asc' | 'desc'
      maxPages?: number
    } = {}
  ): Promise<Transaction[]> {
    const maxPages = options.maxPages || 3 // Limit to prevent timeout
    const allTxs: Transaction[] = []
    
    // Use Blockscout v2 API (MCP pattern) instead of Etherscan-compatible API
    // Blockscout v2 API: /api/v2/addresses/{address}/transactions
    const baseUrl = this.config.apiUrl!.replace('/api', '')
    let nextPageParams: string | null = null
    let page = 1
    
    // Paginate up to maxPages to prevent timeout
    while (page <= maxPages) {
      // Build URL with cursor-based pagination (NO SORT PARAMETER - use default DESC order)
      let url = `${baseUrl}/api/v2/addresses/${address}/transactions`
      if (nextPageParams) {
        url += `?${nextPageParams}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`[BlockscoutClient] ${this.chainKey} getTransactions HTTP error:`, response.status)
        break
      }

      const data = await response.json().catch(() => ({ items: [], next_page_params: null }))
      const items = data.items || []
      if (items.length === 0) break // No more transactions
      
      // Transform Blockscout v2 format to Etherscan-compatible format
      const txs = items.map((item: any) => ({
        blockNumber: item.block?.toString() || '0',
        timeStamp: item.timestamp ? Math.floor(new Date(item.timestamp).getTime() / 1000).toString() : '0',
        hash: item.hash || '',
        nonce: item.nonce?.toString() || '0',
        blockHash: item.block_hash || '',
        transactionIndex: item.transaction_index?.toString() || '0',
        from: item.from?.hash || '',
        to: item.to?.hash || '',
        value: item.value || '0',
        gas: item.gas_limit?.toString() || '0',
        gasPrice: item.gas_price || '0',
        isError: item.status === 'error' ? '1' : '0',
        txreceipt_status: item.status === 'ok' ? '1' : '0',
        input: item.raw_input || '0x',
        contractAddress: item.created_contract?.hash || '',
        cumulativeGasUsed: item.gas_used?.toString() || '0',
        gasUsed: item.gas_used?.toString() || '0',
        confirmations: item.confirmations?.toString() || '0',
        methodId: item.method || '0x',
        functionName: item.method || '',
      }))
      
      allTxs.push(...txs)
      
      // Check for next page
      nextPageParams = data.next_page_params ? new URLSearchParams(data.next_page_params).toString() : null
      if (!nextPageParams) break // No more pages
      page++
    }

    return allTxs
  }

  /**
   * Get all token transfers for an address
   * Same as Etherscan's tokentx endpoint
   */
  async getTokenTransfers(
    address: Address,
    options: {
      startBlock?: number
      endBlock?: number
      page?: number
      offset?: number
      sort?: 'asc' | 'desc'
      maxPages?: number
    } = {}
  ): Promise<TokenTransfer[]> {
    const maxPages = options.maxPages || 3 // Limit to prevent timeout
    const allTransfers: TokenTransfer[] = []
    
    // Use Blockscout v2 API (MCP pattern) instead of Etherscan-compatible API
    // Blockscout v2 API: /api/v2/addresses/{address}/token-transfers
    const baseUrl = this.config.apiUrl!.replace('/api', '')
    let nextPageParams: string | null = null
    let page = 1
    
    // Paginate up to maxPages to prevent timeout
    while (page <= maxPages) {
      // Build URL with cursor-based pagination
      let url = `${baseUrl}/api/v2/addresses/${address}/token-transfers`
      if (nextPageParams) {
        url += `?${nextPageParams}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`[BlockscoutClient] ${this.chainKey} getTokenTransfers HTTP error:`, response.status)
        break
      }

      const data = await response.json().catch(() => ({ items: [], next_page_params: null }))

      // Debug logging for troubleshooting
      if (page === 1) {
        console.log(`[BlockscoutClient] ${this.chainKey} getTokenTransfers URL: ${url}`)
        console.log(`[BlockscoutClient] ${this.chainKey} getTokenTransfers response: ${data.items?.length || 0} items`)
      }

      const items = data.items || []
      if (items.length === 0) break // No more transfers
      
      // Transform Blockscout v2 format to Etherscan-compatible format
      const transfers = items.map((item: any) => ({
        blockNumber: item.block_number?.toString() || '0',
        timeStamp: item.timestamp ? Math.floor(new Date(item.timestamp).getTime() / 1000).toString() : '0',
        hash: item.tx_hash || '',
        from: item.from?.hash || '',
        to: item.to?.hash || '',
        value: item.total?.value || '0',
        tokenName: item.token?.name || '',
        tokenSymbol: item.token?.symbol || '',
        tokenDecimal: item.token?.decimals || '18',
        contractAddress: item.token?.address || '',
        transactionIndex: item.tx_index?.toString() || '0',
        gas: '0', // Not provided in v2 API
        gasPrice: '0', // Not provided in v2 API
        gasUsed: '0', // Not provided in v2 API
        cumulativeGasUsed: '0', // Not provided in v2 API
        input: '0x',
        confirmations: '0',
      }))
      
      allTransfers.push(...transfers)
      
      // Check for next page
      nextPageParams = data.next_page_params ? new URLSearchParams(data.next_page_params).toString() : null
      if (!nextPageParams) break // No more pages
      page++
    }

    return allTransfers
  }

  /**
   * Get token portfolio for an address with USD values (Professional Pattern)
   * Returns portfolio value, token counts, stablecoins, and top tokens
   * Uses Blockscout MCP get_tokens_by_address
   */
  async getTokenPortfolio(address: Address): Promise<{
    portfolioValueUSD: number
    erc20TokenCount: number
    stablecoinBalance: number
    topTokens: Array<{
      symbol: string
      balance: string
      valueUSD: string
      address: string
    }>
  } | null> {
    try {
      // Fetch tokens using Blockscout MCP
      // In production, this should use mcp_blockscout_get_tokens_by_address
      // For now, direct API call
      const baseUrl = this.config.apiUrl?.replace('/api', '') || `https://${this.chainKey.toLowerCase()}.blockscout.com`
      const response = await fetch(`${baseUrl}/api/v2/addresses/${address}/tokens?type=ERC-20`, {
        signal: AbortSignal.timeout(15000), // 15s timeout
      })

      if (!response.ok) return null

      const data = await response.json()
      const tokens = data?.items || []

      if (tokens.length === 0) {
        return {
          portfolioValueUSD: 0,
          erc20TokenCount: 0,
          stablecoinBalance: 0,
          topTokens: [],
        }
      }

      // Stablecoin addresses (lowercase for comparison)
      const stablecoins = new Set([
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC on Base
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
        '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', // USDT on Base
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT on Ethereum
        '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // DAI on Base
        '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI on Ethereum
        '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca', // USDBC on Base
        '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC on Optimism
        '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI on Optimism
        '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT on Arbitrum
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC on Arbitrum
      ])

      let portfolioValueUSD = 0
      let stablecoinBalance = 0
      const tokenValues: Array<{
        symbol: string
        balance: string
        valueUSD: number
        address: string
      }> = []

      for (const token of tokens) {
        try {
          // Handle both API structures:
          // Direct API: { token: { address_hash, decimals, exchange_rate, symbol }, value }
          // MCP API: { address, decimals, exchange_rate, symbol, balance }
          const tokenAddress = token.token?.address_hash || token.address || ''
          const tokenSymbol = token.token?.symbol || token.symbol || 'UNKNOWN'
          const tokenBalance = token.value || token.balance || '0'
          const tokenDecimals = token.token?.decimals || token.decimals || '18'
          const tokenExchangeRate = token.token?.exchange_rate || token.exchange_rate || '0'
          
          const balance = parseFloat(tokenBalance) / Math.pow(10, parseInt(tokenDecimals))
          const exchangeRate = parseFloat(tokenExchangeRate)
          const valueUSD = balance * exchangeRate

          portfolioValueUSD += valueUSD

          // Check if stablecoin
          if (tokenAddress && stablecoins.has(tokenAddress.toLowerCase())) {
            stablecoinBalance += balance
          }

          // Store for sorting
          if (balance > 0) {
            tokenValues.push({
              symbol: tokenSymbol,
              balance: balance.toFixed(6),
              valueUSD,
              address: tokenAddress,
            })
          }
        } catch {
          // Skip tokens with invalid data
          continue
        }
      }

      // Sort by USD value and take top 5
      const topTokens = tokenValues
        .sort((a, b) => b.valueUSD - a.valueUSD)
        .slice(0, 5)
        .map(t => ({
          symbol: t.symbol,
          balance: t.balance,
          valueUSD: t.valueUSD.toFixed(2),
          address: t.address,
        }))

      return {
        portfolioValueUSD,
        erc20TokenCount: tokenValues.length,
        stablecoinBalance,
        topTokens,
      }
    } catch {
      return null
    }
  }

  /**
   * Get NFT collections count for an address
   * Uses Blockscout MCP nft_tokens_by_address
   */
  async getNFTCollectionsCount(address: Address): Promise<number | null> {
    try {
      const baseUrl = this.config.apiUrl?.replace('/api', '') || `https://${this.chainKey.toLowerCase()}.blockscout.com`
      const response = await fetch(`${baseUrl}/api/v2/addresses/${address}/nft/collections`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!response.ok) return null

      const data = await response.json()
      const collections = data?.items || []
      
      return collections.length
    } catch {
      return null
    }
  }

  /**
   * Get gas analytics from transaction data
   * Calculates total gas used, gas spent in ETH/USD, and average gas price
   */
  async getGasAnalytics(address: Address, ethPriceUSD?: number): Promise<{
    totalGasUsed: string
    totalGasSpentETH: string
    totalGasSpentUSD: string | null
    avgGasPrice: string
  } | null> {
    try {
      const baseUrl = this.config.apiUrl?.replace('/api', '') || `https://${this.chainKey.toLowerCase()}.blockscout.com`
      const url = `${baseUrl}/api/v2/addresses/${address}/transactions`
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) return null

      const data = await response.json()
      const transactions = data?.items || []

      if (transactions.length === 0) {
        return {
          totalGasUsed: '0',
          totalGasSpentETH: '0',
          totalGasSpentUSD: ethPriceUSD ? '0' : null,
          avgGasPrice: '0',
        }
      }

      let totalGasUsed = BigInt(0)
      let totalGasSpentWei = BigInt(0)
      let gasPriceSum = BigInt(0)
      let txCount = 0

      for (const tx of transactions) {
        // Only count transactions FROM this address (where they paid gas)
        if (tx.from?.hash?.toLowerCase() !== address.toLowerCase()) continue

        const gasUsed = tx.gas_used ? BigInt(tx.gas_used) : BigInt(0)
        const gasPrice = tx.gas_price ? BigInt(tx.gas_price) : BigInt(0)

        totalGasUsed += gasUsed
        totalGasSpentWei += gasUsed * gasPrice
        gasPriceSum += gasPrice
        txCount++
      }

      // Convert to human-readable formats
      const totalGasSpentETH = (Number(totalGasSpentWei) / 1e18).toFixed(6)
      const avgGasPriceGwei = txCount > 0 ? (Number(gasPriceSum / BigInt(txCount)) / 1e9).toFixed(2) : '0'
      const totalGasSpentUSD = ethPriceUSD ? (parseFloat(totalGasSpentETH) * ethPriceUSD).toFixed(2) : null

      return {
        totalGasUsed: totalGasUsed.toString(),
        totalGasSpentETH,
        totalGasSpentUSD,
        avgGasPrice: avgGasPriceGwei,
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get NFT portfolio value with floor prices
   * NOTE: Currently disabled - all NFT floor price APIs require paid subscriptions
   * - OpenSea API: Rate limited and unreliable
   * - Alchemy: Subscription only
   * - CoinGecko: Subscription only
   * - SimpleHash: Paid only ($199/mo minimum)
   * 
   * Returns collection count and basic info, but floor prices = null
   */
  async getNFTPortfolioValue(address: Address, ethPriceUSD?: number): Promise<{
    nftPortfolioValueUSD: string
    nftFloorValueETH: string
    topNFTCollections: Array<{
      name: string
      symbol: string
      address: string
      tokenType: string
      tokenCount: number
      floorPriceETH: string | null
      floorPriceUSD: string | null
      totalValueETH: string | null
      totalValueUSD: string | null
    }>
  } | null> {
    try {
      const baseUrl = this.config.apiUrl?.replace('/api', '') || `https://${this.chainKey.toLowerCase()}.blockscout.com`
      const response = await fetch(`${baseUrl}/api/v2/addresses/${address}/nft/collections`, {
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) return null

      const data = await response.json()
      const collections = data?.items || []

      if (collections.length === 0) {
        return {
          nftPortfolioValueUSD: '0',
          nftFloorValueETH: '0',
          topNFTCollections: [],
        }
      }

      // Map collections without floor prices (all APIs require paid subscriptions)
      const collectionsWithoutFloor = collections.slice(0, 10).map((collection: any) => {
        const collectionAddress = collection.token?.address_hash || collection.token?.address
        const tokenCount = parseInt(collection.amount || '0')

        return {
          name: collection.token?.name || 'Unknown',
          symbol: collection.token?.symbol || '',
          address: collectionAddress,
          tokenType: collection.token?.type || 'ERC-721',
          tokenCount,
          floorPriceETH: null, // Disabled - requires paid API
          floorPriceUSD: null, // Disabled - requires paid API
          totalValueETH: null,
          totalValueUSD: null,
        }
      })

      return {
        nftPortfolioValueUSD: '0', // Cannot calculate without floor prices
        nftFloorValueETH: '0',
        topNFTCollections: collectionsWithoutFloor.slice(0, 5),
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get identity info (ENS, public tags, contract status, contract name)
   * LIMITATION: publicTags not available via free Blockscout v2 API
   * 
   * STATUS (Dec 12, 2025):
   * - ENS: ✅ Working via ens_domain_name field
   * - Balance: ✅ Working via coin_balance field  
   * - Contract info: ✅ Working via is_contract, is_verified, name fields
   * - publicTags: ❌ NOT AVAILABLE - v2 API returns empty [] for all addresses
   * 
   * The enriched metadata.tags[] is only exposed through:
   * - Blockscout MCP Server (AI assistant context only)
   * - Blockscout Pro/Internal APIs (not public)
   * - Web scraping (not recommended)
   * 
   * TODO: Implement proper MCP integration once SDK available
   * For now, publicTags will return null for all addresses
   */
  async getIdentityInfo(address: Address): Promise<{
    ensName: string | null
    publicTags: string[] | null // Always null until MCP integration complete
    isContract: boolean
    contractVerified: boolean | null
    contractName: string | null
    balance: string | null // Wei balance from MCP
  } | null> {
    try {
      // BLOCKSCOUT MCP: Use direct tool call in production
      // For now, use v2 API which MCP wraps
      const baseUrl = this.config.apiUrl?.replace('/api', '') || `https://${this.chainKey.toLowerCase()}.blockscout.com`
      const response = await fetch(`${baseUrl}/api/v2/addresses/${address}`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!response.ok) return null

      const data = await response.json()
      
      // Extract ENS name - WORKING ✅
      const ensName = data.ens_domain_name || null

      // Extract public tags - NOT AVAILABLE ❌
      // Blockscout v2 free API returns empty [] for public_tags field
      // Tags are only exposed through MCP enriched response (AI context only)
      // Returning null until proper MCP SDK integration is available
      const publicTags = null

      // Contract status and name - FIXED: Now gets contract name
      const isContract = data.is_contract || false
      const contractVerified = isContract ? (data.is_verified || false) : null
      const contractName = isContract && data.name ? data.name : null

      // Balance from MCP - FIXED: Now gets accurate balance
      const balance = data.coin_balance || data.balance || null

      return {
        ensName,
        publicTags,
        isContract,
        contractVerified,
        contractName,
        balance,
      }
    } catch {
      return null
    }
  }

  /**

   * Get bridge deposits (L1→L2 transactions)
   * Only available on L2 chains: Base, Optimism, Arbitrum, Scroll
   * NOTE: Use Blockscout MCP direct_api_call in production
   */
  async getBridgeDeposits(address: Address): Promise<{ count: number, totalVolume: bigint } | null> {
    const chainKey = this.chainKey.toLowerCase()
    
    // Only L2 chains support bridge endpoints
    if (!['base', 'optimism', 'arbitrum', 'scroll'].includes(chainKey)) {
      return null
    }

    try {
      let endpoint: string
      let params: URLSearchParams

      // Chain-specific endpoints
      // Base uses Optimism bridge architecture
      if (chainKey === 'base' || chainKey === 'optimism') {
        endpoint = '/api/v2/optimism/deposits'
        params = new URLSearchParams({ address })
      } else if (chainKey === 'arbitrum') {
        endpoint = '/api/v2/arbitrum/messages/to-rollup'
        params = new URLSearchParams({ address })
      } else if (chainKey === 'scroll') {
        endpoint = '/api/v2/scroll/deposits'
        params = new URLSearchParams({ address })
      } else {
        return null
      }

      const baseUrl = this.config.apiUrl?.replace('/api', '') || `https://${chainKey}.blockscout.com`
      const response = await fetch(`${baseUrl}${endpoint}?${params}`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!response.ok) return null

      const data = await response.json()
      const items = data?.items || []
      
      let totalVolume = BigInt(0)
      
      // Sum all bridge deposits
      for (const item of items) {
        const value = item.msg_value || item.value || '0'
        try {
          totalVolume += BigInt(value)
        } catch {
          // Skip invalid values
        }
      }

      return {
        count: items.length,
        totalVolume,
      }
    } catch {
      return null
    }
  }

  /**
   * Get bridge withdrawals (L2→L1 transactions)
   * Only available on L2 chains: Base, Optimism, Arbitrum, Scroll
   * NOTE: Use Blockscout MCP direct_api_call in production
   */
  async getBridgeWithdrawals(address: Address): Promise<{ count: number } | null> {
    const chainKey = this.chainKey.toLowerCase()
    
    // Only L2 chains support bridge endpoints
    if (!['base', 'optimism', 'arbitrum', 'scroll'].includes(chainKey)) {
      return null
    }

    try {
      let endpoint: string
      let params: URLSearchParams

      // Chain-specific endpoints
      // Base uses Optimism bridge architecture
      if (chainKey === 'base' || chainKey === 'optimism') {
        endpoint = '/api/v2/optimism/withdrawals'
        params = new URLSearchParams({ address })
      } else if (chainKey === 'arbitrum') {
        endpoint = '/api/v2/arbitrum/messages/from-rollup'
        params = new URLSearchParams({ address })
      } else if (chainKey === 'scroll') {
        endpoint = '/api/v2/scroll/withdrawals'
        params = new URLSearchParams({ address })
      } else {
        return null
      }

      const baseUrl = this.config.apiUrl?.replace('/api', '') || `https://${chainKey}.blockscout.com`
      const response = await fetch(`${baseUrl}${endpoint}?${params}`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!response.ok) return null

      const data = await response.json()
      const items = data?.items || []

      return {
        count: items.length,
      }
    } catch {
      return null
    }
  }

  /**
   * Get comprehensive stats using transaction history
   */
  async getRichStats(address: Address) {
    // Professional Pattern: Parallel fetch with accurate counters
    const ethPriceUSD = 3047.59 // ETH price, can be dynamic later
    
    // PHASE 1: Get accurate counts first
    const counters = await this.getAddressCounters(address)
    const totalTxs = counters?.transactionsCount || 0
    
    // PHASE 2: Fetch transactions - recent for metrics, skip to last page for oldest
    const estimatedPages = Math.ceil(totalTxs / 50) // 50 txs per page
    const [normalTxs, tokenTxs, talentScore, neynarScore, bridgeDeposits, bridgeWithdrawals, portfolio, nftCount, identity, gasAnalytics, nftPortfolio] = await Promise.all([
      this.getTransactions(address, { maxPages: 3 }), // Recent 150 txs for metrics (DESC order = newest first)
      this.getTokenTransfers(address, { maxPages: 3 }),
      this.getTalentScore(address),
      this.getNeynarScore(address),
      this.getBridgeDeposits(address),
      this.getBridgeWithdrawals(address),
      this.getTokenPortfolio(address),
      this.getNFTCollectionsCount(address),
      this.getIdentityInfo(address),
      this.getGasAnalytics(address, ethPriceUSD),
      this.getNFTPortfolioValue(address, ethPriceUSD),
    ])

    const totalTokenTxs = counters?.tokenTransfersCount || 0

    // Get first and last transaction (already in DESC order, newest first)
    const lastTx = normalTxs[0] || null // Newest (always accurate)
    
    // For firstTx: Use oldest from sample (fast) vs full pagination (slow but accurate)
    // Trade-off: 150-tx sample gives us oldest within recent ~150 transactions
    // Full pagination would require 70+ pages for 3500 txs = 60-120 seconds response time
    // DECISION: Use sample for speed, implement background async fetch for accuracy later
    let firstTx = normalTxs[normalTxs.length - 1] || null // Oldest in 150-tx sample
    
    // TODO: Implement async background job to fetch true oldest for addresses with > 500 txs
    // This would cache the accurate firstTx and update it periodically
    if (totalTxs > 500) {
      console.log(`[BlockscoutClient] ${this.chainKey} Note: firstTx is approximate (oldest in 150-tx sample) for address with ${totalTxs} transactions. Full history would require ${Math.ceil(totalTxs / 50)} pages.`)
    }

    // Account age calculation
    let firstTxTimestamp: number | null = null
    let lastTxTimestamp: number | null = null

    if (firstTx) {
      firstTxTimestamp = parseInt(firstTx.timeStamp)
      lastTxTimestamp = lastTx ? parseInt(lastTx.timeStamp) : firstTxTimestamp
    } else if (tokenTxs.length > 0) {
      // Fallback to token transfers for account age
      const firstTokenTx = tokenTxs[0]
      const lastTokenTx = tokenTxs[tokenTxs.length - 1]
      firstTxTimestamp = firstTokenTx ? parseInt(firstTokenTx.timeStamp) : null
      lastTxTimestamp = lastTokenTx ? parseInt(lastTokenTx.timeStamp) : firstTxTimestamp
    }

    const accountAgeSeconds = firstTxTimestamp
      ? Math.floor(Date.now() / 1000) - firstTxTimestamp
      : null
    const accountAgeDays = accountAgeSeconds
      ? Math.floor(accountAgeSeconds / 86400)
      : null

    // Calculate volume from recent transactions (sample)
    let totalVolume = 0n
    for (const tx of normalTxs) {
      if (tx.value !== '0') {
        totalVolume += BigInt(tx.value)
      }
    }

    // Count contract deployments (to address is empty or contract created)
    const contractsDeployed = normalTxs.filter(
      (tx) => !tx.to || tx.to === '' || tx.contractAddress
    ).length

    // Unique contracts interacted with
    const uniqueContracts = new Set(
      normalTxs.filter((tx) => tx.to && tx.to !== '').map((tx) => tx.to.toLowerCase())
    ).size

    // Calculate unique days/weeks/months from sample transactions
    const allTxTimestamps = [
      ...normalTxs.map((tx) => parseInt(tx.timeStamp) * 1000),
      ...tokenTxs.map((tx) => parseInt(tx.timeStamp) * 1000)
    ]
    const dates = allTxTimestamps.map((ts) => new Date(ts))
    
    const uniqueDays = new Set(
      dates.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    ).size
    
    const uniqueWeeks = new Set(
      dates.map((d) => {
        const week = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000))
        return week
      })
    ).size
    
    const uniqueMonths = new Set(
      dates.map((d) => `${d.getFullYear()}-${d.getMonth()}`)
    ).size

    return {
      // Identity (Professional Pattern) - ENHANCED with MCP data
      ensName: identity?.ensName || null,
      publicTags: identity?.publicTags || null,
      isContract: identity?.isContract || false,
      contractVerified: identity?.contractVerified || null,
      contractName: identity?.contractName || null, // NEW: from MCP
      balance: identity?.balance || null, // NEW: accurate from MCP
      
      // Activity metrics
      totalTxs,
      totalTokenTxs,
      firstTx: firstTx
        ? {
            hash: firstTx.hash,
            blockNumber: firstTx.blockNumber,
            timestamp: parseInt(firstTx.timeStamp),
          }
        : null,
      lastTx: lastTx
        ? {
            hash: lastTx.hash,
            blockNumber: lastTx.blockNumber,
            timestamp: parseInt(lastTx.timeStamp),
          }
        : null,
      accountAgeSeconds,
      accountAgeDays,
      totalVolume,
      contractsDeployed,
      uniqueContracts,
      uniqueDays,
      uniqueWeeks,
      uniqueMonths,
      
      // Reputation scores
      talentScore,
      neynarScore,
      
      // Portfolio value (Professional Pattern)
      portfolioValueUSD: portfolio?.portfolioValueUSD || null,
      erc20TokenCount: portfolio?.erc20TokenCount || null,
      stablecoinBalance: portfolio?.stablecoinBalance || null,
      topTokens: portfolio?.topTokens || null,
      nftCollectionsCount: nftCount || null,
      
      // NFT portfolio (Phase 3)
      nftPortfolioValueUSD: nftPortfolio?.nftPortfolioValueUSD || null,
      nftFloorValueETH: nftPortfolio?.nftFloorValueETH || null,
      topNFTCollections: nftPortfolio?.topNFTCollections || null,
      
      // Gas analytics (Phase 2)
      totalGasUsed: gasAnalytics?.totalGasUsed || null,
      totalGasSpentETH: gasAnalytics?.totalGasSpentETH || null,
      totalGasSpentUSD: gasAnalytics?.totalGasSpentUSD || null,
      avgGasPrice: gasAnalytics?.avgGasPrice || null,
      
      // Bridge stats (L2 chains only)
      bridgeDeposits: bridgeDeposits?.count || null,
      bridgeWithdrawals: bridgeWithdrawals?.count || null,
      nativeBridgeUsed: bridgeDeposits !== null && bridgeDeposits.count > 0,
    }
  }
}
