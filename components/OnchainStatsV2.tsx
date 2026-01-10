/**
 * OnchainStatsV2 - Professional Responsive Onchain Analytics
 * 
 * Pattern: Responsive card grid with tabbed content for mobile optimization
 * Adapted from: Coinbase Wallet Analytics + Base.org patterns (40% adaptation)
 * 
 * Features:
 * - ✅ Desktop: Full rich data grid (4 columns)
 * - ✅ Mobile: Tabbed interface (Overview/Tokens/NFTs/Activity)
 * - ✅ Professional gradients and animations
 * - ✅ Chain switcher with icons (preserved from v2)
 * - ✅ Handles 30+ data points cleanly
 * - ✅ SWR-powered data fetching
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

type OnchainStatsV2Props = {
  onLoadingChange?: (loading: boolean) => void
}

type MobileTab = 'overview' | 'tokens' | 'nfts' | 'activity'

export function OnchainStatsV2({ onLoadingChange }: OnchainStatsV2Props) {
  const { address, isConnecting, isReconnecting, isConnected } = useAccount()
  const [chainKey, setChainKey] = useState<ChainKey>('base')
  const [mobileTab, setMobileTab] = useState<MobileTab>('overview')

  // Professional data fetching
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

  // Wallet not connected
  if (!isConnected && !isWalletLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center p-16 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 mx-auto mb-6 text-gray-600 dark:text-gray-400">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Wallet to View Stats</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Access your multi-chain analytics across 12 networks</p>
          <div className="flex justify-center">
            <appkit-button />
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (isWalletLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide mb-4">Select Chain</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.values(CHAINS).slice(0, 6).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-gradient-to-r from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 rounded-xl bg-gradient-to-r from-gray-200/50 to-gray-300/50 dark:from-gray-700/50 dark:to-gray-600/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center p-16 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/30">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Stats</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error.message || 'Unable to fetch data'}</p>
          <button onClick={revalidate} className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-all hover:-translate-y-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Main content
  const portfolioValue = formatUSD(data?.portfolioValueUSD || null)
  const balance = formatBalance(data?.balance || null)
  const tokenCount = data?.erc20TokenCount || 0
  const nftCount = data?.nftCollectionsCount || 0
  const totalTxs = data?.totalTxs || 0
  const accountAge = data?.accountAgeDays ? `${data.accountAgeDays} days` : 'New'
  const topTokens = data?.topTokens?.slice(0, 5) || []
  const topNFTs = data?.topNFTCollections?.slice(0, 5) || []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Chain Switcher */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wide">CHAIN EXPLORER</h3>
          <button 
            onClick={revalidate} 
            className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={validating} 
            title="Refresh"
          >
            <svg className={validating ? 'animate-spin' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.values(CHAINS).map((c) => (
            <button
              key={c.key}
              onClick={() => setChainKey(c.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                c.key === chainKey
                  ? 'bg-gray-900 dark:bg-gray-700 border-gray-900 dark:border-gray-700 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 hover:-translate-y-0.5 hover:shadow-md'
              }`}
              title={c.name}
            >
              <Image src={c.icon} alt={c.name} width={20} height={20} unoptimized />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="grid grid-cols-4 gap-2 mb-6 md:hidden">
        {(['overview', 'tokens', 'nfts', 'activity'] as MobileTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              mobileTab === tab
                ? 'bg-gray-900 dark:bg-gray-700 border-gray-900 dark:border-gray-700 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Desktop Grid / Mobile Tabs Content */}
      <div className="relative">
        {/* Overview Tab */}
        <div className={`${mobileTab === 'overview' ? 'block' : 'hidden md:block'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 bg-gray-900 dark:bg-gray-800 text-white rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="text-4xl mb-3">💰</div>
              <div className="text-sm font-medium uppercase tracking-wide opacity-90 mb-2">Portfolio Value</div>
              <div className="text-3xl font-bold mb-1">{portfolioValue}</div>
              <div className="text-sm opacity-80">{balance} {chainCfg.name}</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="text-4xl mb-3">🪙</div>
              <div className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Tokens</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatNumber(tokenCount)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">ERC-20 Holdings</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="text-4xl mb-3">🖼️</div>
              <div className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">NFTs</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatNumber(nftCount)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Collections</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl">
              <div className="text-4xl mb-3">⚡</div>
              <div className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Transactions</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{formatNumber(totalTxs)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Account Age: {accountAge}</div>
            </div>
          </div>
        </div>

        {/* Tokens Tab */}
        <div className={`${mobileTab === 'tokens' ? 'block' : 'hidden md:block'} ${mobileTab !== 'tokens' && 'md:mt-6'}`}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Tokens by Value</h4>
            {topTokens.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topTokens.map((token: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{token.symbol}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatBalance(token.balance)}</span>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formatUSD(token.valueUSD)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No tokens found</div>
            )}
          </div>
        </div>

        {/* NFTs Tab */}
        <div className={`${mobileTab === 'nfts' ? 'block' : 'hidden md:block'} ${mobileTab !== 'nfts' && 'md:mt-6'}`}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">NFT Collections</h4>
            {topNFTs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topNFTs.map((nft: any, i: number) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:-translate-y-0.5 transition-all">
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">{nft.name || 'Unnamed'}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{nft.tokenCount} items</div>
                    {nft.totalValueUSD && (
                      <div className="font-semibold text-gray-900 dark:text-white">{formatUSD(nft.totalValueUSD)}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No NFTs found</div>
            )}
          </div>
        </div>

        {/* Activity Tab */}
        <div className={`${mobileTab === 'activity' ? 'block' : 'hidden md:block'} ${mobileTab !== 'activity' && 'md:mt-6'}`}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Activity</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Account Age</span>
                <span className="block text-xl font-semibold text-gray-900 dark:text-white">{accountAge}</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Total Transactions</span>
                <span className="block text-xl font-semibold text-gray-900 dark:text-white">{formatNumber(totalTxs)}</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Contracts Deployed</span>
                <span className="block text-xl font-semibold text-gray-900 dark:text-white">{data?.contractsDeployed || 0}</span>
              </div>
              {data?.ensName && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="block text-sm text-gray-600 dark:text-gray-400 mb-1">ENS Name</span>
                  <span className="block text-xl font-semibold text-gray-900 dark:text-white">{data.ensName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
