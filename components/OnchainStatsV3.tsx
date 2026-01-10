/**
 * @component OnchainStatsV3
 * @source Multi-template hybrid (TEMPLATE-SELECTION.md strategy)
 * @adaptation 35% (trezoadmin-41 Dashboard cards + gmeowbased0.6 crypto patterns)
 * @template Primary: gmeowbased0.6 (crypto UI), Secondary: trezoadmin-41 (analytics cards)
 * @category Analytics Dashboard
 * 
 * Professional Responsive Onchain Analytics
 * 
 * Features:
 * - ✅ Desktop: Card grid + expandable table rows (rich data)
 * - ✅ Mobile: Accordion cards with collapsible details
 * - ✅ Chain switcher with icons (preserved from v2)
 * - ✅ Professional gradients from gmeowbased0.6
 * - ✅ SWR-powered data fetching
 * - ✅ Handles 30+ data points without overflow
 */

'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useOnchainStats } from '@/hooks/useOnchainStats'

type ChainKey = 'base' | 'ethereum' | 'optimism' | 'arbitrum' | 'polygon' | 'gnosis' | 'celo' | 'scroll' | 'unichain' | 'soneium' | 'zksync' | 'zora'

type ChainCfg = {
  key: ChainKey
  name: string
  chainId: number
  icon: string
  explorer: string
}

// Chain registry (preserved from OnchainStatsV2)
const CHAINS: Record<ChainKey, ChainCfg> = {
  base: {
    key: 'base',
    name: 'Base',
    chainId: 8453,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/base.svg',
    explorer: 'https://basescan.org',
  },
  ethereum: {
    key: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/eth.svg',
    explorer: 'https://etherscan.io',
  },
  optimism: {
    key: 'optimism',
    name: 'Optimism',
    chainId: 10,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
    explorer: 'https://optimistic.etherscan.io',
  },
  arbitrum: {
    key: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/arbitrum.svg',
    explorer: 'https://arbiscan.io',
  },
  polygon: {
    key: 'polygon',
    name: 'Polygon',
    chainId: 137,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/polygon.svg',
    explorer: 'https://polygonscan.com',
  },
  gnosis: {
    key: 'gnosis',
    name: 'Gnosis',
    chainId: 100,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/gnosis.svg',
    explorer: 'https://gnosisscan.io',
  },
  celo: {
    key: 'celo',
    name: 'Celo',
    chainId: 42220,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/celo.png',
    explorer: 'https://celoscan.io',
  },
  scroll: {
    key: 'scroll',
    name: 'Scroll',
    chainId: 534352,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/Scroll.svg',
    explorer: 'https://scrollscan.com',
  },
  unichain: {
    key: 'unichain',
    name: 'Unichain',
    chainId: 130,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/unichain.png',
    explorer: 'https://uniscan.xyz',
  },
  soneium: {
    key: 'soneium',
    name: 'Soneium',
    chainId: 1868,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/soneium.png',
    explorer: 'https://soneium.blockscout.com',
  },
  zksync: {
    key: 'zksync',
    name: 'zkSync',
    chainId: 324,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/zksync.svg',
    explorer: 'https://era.zksync.network',
  },
  zora: {
    key: 'zora',
    name: 'Zora',
    chainId: 7777777,
    icon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/zora.svg',
    explorer: 'https://explorer.zora.energy',
  },
}

type OnchainStatsV3Props = {
  onLoadingChange?: (loading: boolean) => void
}

export function OnchainStatsV3({ onLoadingChange }: OnchainStatsV3Props) {
  const { address, isConnecting, isReconnecting, isConnected } = useAccount()
  const [chainKey, setChainKey] = useState<ChainKey>('base')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const { data, loading, validating, error, revalidate } = useOnchainStats(
    address,
    chainKey,
    {
      refreshInterval: 15 * 60 * 1000,
      revalidateOnFocus: false,
      enabled: !!address,
    }
  )

  useEffect(() => {
    if (onLoadingChange && loading !== undefined) {
      onLoadingChange(loading)
    }
  }, [loading, onLoadingChange])

  const chainCfg = CHAINS[chainKey]
  const isWalletLoading = (isConnecting || isReconnecting) && !isConnected

  // Format helpers
  const formatUSD = (val: string | null) => {
    if (!val || val === '0') return '$0.00'
    const num = parseFloat(val)
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const formatNumber = (val: number | null) => {
    if (!val) return '0'
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
    return val.toLocaleString()
  }

  const formatBalance = (val: string | null) => {
    if (!val || val === '0') return '0.00'
    const num = parseFloat(val)
    if (num < 0.0001) return num.toExponential(2)
    return num.toFixed(4)
  }

  const toggleCard = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  // Empty state
  if (!isConnected && !isWalletLoading) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center p-16 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 min-h-[300px]">
          <div className="w-20 h-20 mb-6 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect to Explore</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">View your onchain portfolio across 12 networks</p>
          <appkit-button />
        </div>
      </div>
    )
  }

  // Loading state
  if (isWalletLoading || loading) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">SELECT CHAIN</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-400">
              <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-gray-400 rounded-full animate-spin" />
              Loading...
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-gradient-to-r from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-gradient-to-r from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center p-16 text-center bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/30 min-h-[300px]">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Failed to Load</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error.message}</p>
          <button onClick={revalidate} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
            </svg>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Data
  const portfolioValue = formatUSD(data?.portfolioValueUSD || null)
  const balance = formatBalance(data?.balance || null)
  const tokenCount = data?.erc20TokenCount || 0
  const nftCount = data?.nftCollectionsCount || 0
  const totalTxs = data?.totalTxs || 0
  const accountAge = data?.accountAgeDays ? `${data.accountAgeDays} days` : 'New'
  const topTokens = data?.topTokens?.slice(0, 10) || []
  const topNFTs = data?.topNFTCollections?.slice(0, 10) || []

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 py-6">
      {/* Chain Switcher */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">CHAIN EXPLORER</h3>
          <button 
            onClick={revalidate} 
            className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={validating}
            title="Refresh data"
          >
            <svg 
              className={validating ? 'animate-spin' : ''} 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.values(CHAINS).map((c) => (
            <button
              key={c.key}
              onClick={() => setChainKey(c.key)}
              className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                c.key === chainKey
                  ? 'bg-gray-900 dark:bg-gray-700 border-transparent text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 hover:-translate-y-0.5 hover:shadow-md'
              }`}
              title={`Switch to ${c.name}`}
            >
              <Image src={c.icon} alt={c.name} width={20} height={20} unoptimized />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Portfolio Card - Hero */}
        <div className="relative bg-gray-900 dark:bg-gray-800 text-white rounded-2xl p-6 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center text-2xl">💰</div>
            <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wide">{chainCfg.name}</div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold uppercase tracking-wide opacity-90">Portfolio Value</div>
            <div className="text-3xl font-bold leading-none">{portfolioValue}</div>
            <div className="text-sm opacity-80">{balance} ETH</div>
          </div>
        </div>

        {/* Tokens Card - Expandable */}
        <div 
          className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 transition-all cursor-pointer overflow-hidden ${
            expandedCard === 'tokens' 
              ? 'md:col-span-2' 
              : 'hover:-translate-y-1 hover:shadow-xl'
          }`}
          onClick={() => toggleCard('tokens')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-2xl">🪙</div>
            <svg className={`text-gray-400 dark:text-gray-500 transition-transform ${expandedCard === 'tokens' ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Tokens</div>
            <div className="text-3xl font-bold leading-none text-gray-900 dark:text-white">{formatNumber(tokenCount)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">ERC-20 Holdings</div>
          </div>
          {expandedCard === 'tokens' && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
              <div className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-4">Top Holdings</div>
              <div className="flex flex-col gap-3">
                {topTokens.slice(0, 5).map((token: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-gray-900 dark:text-white">{token.symbol}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatBalance(token.balance)}</span>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white">{formatUSD(token.valueUSD)}</div>
                  </div>
                ))}
                {topTokens.length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No tokens found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* NFTs Card - Expandable */}
        <div 
          className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 transition-all cursor-pointer overflow-hidden ${
            expandedCard === 'nfts' 
              ? 'md:col-span-2' 
              : 'hover:-translate-y-1 hover:shadow-xl'
          }`}
          onClick={() => toggleCard('nfts')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center text-2xl">🖼️</div>
            <svg className={`text-gray-400 dark:text-gray-500 transition-transform ${expandedCard === 'nfts' ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">NFT Collections</div>
            <div className="text-3xl font-bold leading-none text-gray-900 dark:text-white">{formatNumber(nftCount)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Digital Assets</div>
          </div>
          {expandedCard === 'nfts' && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
              <div className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-4">Collections</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {topNFTs.slice(0, 4).map((nft: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="font-bold text-gray-900 dark:text-white mb-1">{nft.name || 'Unnamed'}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{nft.tokenCount} items</div>
                    {nft.totalValueUSD && (
                      <div className="font-bold text-gray-900 dark:text-white text-sm">{formatUSD(nft.totalValueUSD)}</div>
                    )}
                  </div>
                ))}
                {topNFTs.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No NFTs found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity Card - Expandable */}
        <div 
          className={`relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 transition-all cursor-pointer overflow-hidden ${
            expandedCard === 'activity' 
              ? 'md:col-span-2' 
              : 'hover:-translate-y-1 hover:shadow-xl'
          }`}
          onClick={() => toggleCard('activity')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-2xl">⚡</div>
            <svg className={`text-gray-400 dark:text-gray-500 transition-transform ${expandedCard === 'activity' ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Transactions</div>
            <div className="text-3xl font-bold leading-none text-gray-900 dark:text-white">{formatNumber(totalTxs)}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Activity</div>
          </div>
          {expandedCard === 'activity' && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
              <div className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-4">Activity Details</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Account Age</span>
                  <span className="block text-xl font-bold text-gray-900 dark:text-white">{accountAge}</span>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Total Transactions</span>
                  <span className="block text-xl font-bold text-gray-900 dark:text-white">{formatNumber(totalTxs)}</span>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Contracts Deployed</span>
                  <span className="block text-xl font-bold text-gray-900 dark:text-white">{data?.contractsDeployed || 0}</span>
                </div>
                {data?.ensName && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="block text-sm text-gray-600 dark:text-gray-400 mb-2">ENS Name</span>
                    <span className="block text-xl font-bold text-gray-900 dark:text-white">{data.ensName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
