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
      <div className="stats-container">
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="empty-title">Connect Wallet to View Stats</h3>
          <p className="empty-desc">Access your multi-chain analytics across 12 networks</p>
          <div className="empty-cta">
            <appkit-button />
          </div>
        </div>
        <style jsx>{`
          .stats-container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
          .empty-state { text-align: center; padding: 4rem 2rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05)); border-radius: 1rem; border: 1px solid rgba(99, 102, 241, 0.1); }
          .empty-icon { margin: 0 auto 1.5rem; width: 64px; height: 64px; color: rgb(99, 102, 241); }
          .empty-title { font-size: 1.5rem; font-weight: 700; color: rgb(17, 24, 39); dark:color: rgb(243, 244, 246); margin-bottom: 0.5rem; }
          .empty-desc { color: rgb(107, 114, 128); dark:color: rgb(156, 163, 175); margin-bottom: 2rem; }
          .empty-cta { display: flex; justify-content: center; }
        `}</style>
      </div>
    )
  }

  // Loading state
  if (isWalletLoading || loading) {
    return (
      <div className="stats-container">
        <div className="chain-switcher">
          <h3 className="section-title">Select Chain</h3>
          <div className="chain-grid">
            {Object.values(CHAINS).slice(0, 6).map((_, i) => (
              <div key={i} className="chain-btn skeleton" />
            ))}
          </div>
        </div>
        <div className="stats-skeleton">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
        <style jsx>{`
          .stats-container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
          .chain-switcher { margin-bottom: 2rem; }
          .section-title { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; color: rgb(107, 114, 128); margin-bottom: 1rem; letter-spacing: 0.05em; }
          .chain-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem; }
          .chain-btn { height: 48px; border-radius: 0.5rem; }
          .stats-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
          .skeleton-card { height: 120px; border-radius: 0.75rem; }
          .skeleton, .skeleton-card { background: linear-gradient(90deg, rgba(156, 163, 175, 0.1) 25%, rgba(156, 163, 175, 0.2) 50%, rgba(156, 163, 175, 0.1) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="stats-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Failed to Load Stats</h3>
          <p className="error-desc">{error.message || 'Unable to fetch data'}</p>
          <button onClick={revalidate} className="retry-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Retry
          </button>
        </div>
        <style jsx>{`
          .stats-container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
          .error-state { text-align: center; padding: 4rem 2rem; background: rgba(239, 68, 68, 0.05); border-radius: 1rem; border: 1px solid rgba(239, 68, 68, 0.2); }
          .error-icon { font-size: 3rem; margin-bottom: 1rem; }
          .error-title { font-size: 1.25rem; font-weight: 600; color: rgb(17, 24, 39); margin-bottom: 0.5rem; }
          .error-desc { color: rgb(107, 114, 128); margin-bottom: 1.5rem; }
          .retry-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: rgb(99, 102, 241); color: white; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
          .retry-btn:hover { background: rgb(79, 70, 229); transform: translateY(-1px); }
        `}</style>
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
    <div className="stats-container">
      {/* Chain Switcher (preserved logic) */}
      <div className="chain-switcher">
        <div className="section-header">
          <h3 className="section-title">CHAIN EXPLORER</h3>
          <button onClick={revalidate} className="refresh-btn" disabled={validating} title="Refresh">
            <svg className={validating ? 'spinning' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="chain-grid">
          {Object.values(CHAINS).map((c) => (
            <button
              key={c.key}
              onClick={() => setChainKey(c.key)}
              className={`chain-btn ${c.key === chainKey ? 'active' : ''}`}
              title={c.name}
            >
              <Image src={c.icon} alt={c.name} width={20} height={20} unoptimized />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="mobile-tabs">
        {(['overview', 'tokens', 'nfts', 'activity'] as MobileTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`tab-btn ${mobileTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Desktop Grid / Mobile Tabs Content */}
      <div className="stats-content">
        {/* Overview Tab (always visible on desktop) */}
        <div className={`tab-panel ${mobileTab === 'overview' ? 'active' : ''}`}>
          <div className="stats-grid">
            <div className="stat-card hero">
              <div className="card-icon">💰</div>
              <div className="card-label">Portfolio Value</div>
              <div className="card-value">{portfolioValue}</div>
              <div className="card-meta">{balance} {chainCfg.name}</div>
            </div>
            <div className="stat-card">
              <div className="card-icon">🪙</div>
              <div className="card-label">Tokens</div>
              <div className="card-value">{formatNumber(tokenCount)}</div>
              <div className="card-meta">ERC-20 Holdings</div>
            </div>
            <div className="stat-card">
              <div className="card-icon">🖼️</div>
              <div className="card-label">NFTs</div>
              <div className="card-value">{formatNumber(nftCount)}</div>
              <div className="card-meta">Collections</div>
            </div>
            <div className="stat-card">
              <div className="card-icon">⚡</div>
              <div className="card-label">Transactions</div>
              <div className="card-value">{formatNumber(totalTxs)}</div>
              <div className="card-meta">Account Age: {accountAge}</div>
            </div>
          </div>
        </div>

        {/* Tokens Tab */}
        <div className={`tab-panel ${mobileTab === 'tokens' ? 'active' : ''}`}>
          <div className="list-section">
            <h4 className="list-title">Top Tokens by Value</h4>
            {topTokens.length > 0 ? (
              <div className="token-list">
                {topTokens.map((token: any, i: number) => (
                  <div key={i} className="token-item">
                    <div className="token-info">
                      <span className="token-symbol">{token.symbol}</span>
                      <span className="token-balance">{formatBalance(token.balance)}</span>
                    </div>
                    <div className="token-value">{formatUSD(token.valueUSD)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-list">No tokens found</div>
            )}
          </div>
        </div>

        {/* NFTs Tab */}
        <div className={`tab-panel ${mobileTab === 'nfts' ? 'active' : ''}`}>
          <div className="list-section">
            <h4 className="list-title">NFT Collections</h4>
            {topNFTs.length > 0 ? (
              <div className="nft-grid">
                {topNFTs.map((nft: any, i: number) => (
                  <div key={i} className="nft-card">
                    <div className="nft-name">{nft.name || 'Unnamed'}</div>
                    <div className="nft-count">{nft.tokenCount} items</div>
                    {nft.totalValueUSD && (
                      <div className="nft-value">{formatUSD(nft.totalValueUSD)}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-list">No NFTs found</div>
            )}
          </div>
        </div>

        {/* Activity Tab */}
        <div className={`tab-panel ${mobileTab === 'activity' ? 'active' : ''}`}>
          <div className="list-section">
            <h4 className="list-title">Account Activity</h4>
            <div className="activity-grid">
              <div className="activity-item">
                <span className="activity-label">Account Age</span>
                <span className="activity-value">{accountAge}</span>
              </div>
              <div className="activity-item">
                <span className="activity-label">Total Transactions</span>
                <span className="activity-value">{formatNumber(totalTxs)}</span>
              </div>
              <div className="activity-item">
                <span className="activity-label">Contracts Deployed</span>
                <span className="activity-value">{data?.contractsDeployed || 0}</span>
              </div>
              {data?.ensName && (
                <div className="activity-item">
                  <span className="activity-label">ENS Name</span>
                  <span className="activity-value">{data.ensName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Container */
        .stats-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        /* Chain Switcher */
        .chain-switcher {
          margin-bottom: 2rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          color: rgb(107, 114, 128);
          dark:color: rgb(156, 163, 175);
          letter-spacing: 0.05em;
        }
        .refresh-btn {
          padding: 0.5rem;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 0.5rem;
          color: rgb(99, 102, 241);
          cursor: pointer;
          transition: all 0.2s;
        }
        .refresh-btn:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.2);
          transform: scale(1.05);
        }
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .chain-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        .chain-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: white;
          dark:background: rgb(31, 41, 55);
          border: 2px solid rgb(229, 231, 235);
          dark:border: rgb(55, 65, 81);
          border-radius: 0.5rem;
          color: rgb(55, 65, 81);
          dark:color: rgb(209, 213, 219);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .chain-btn:hover {
          border-color: rgb(99, 102, 241);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }
        .chain-btn.active {
          background: linear-gradient(135deg, rgb(99, 102, 241), rgb(139, 92, 246));
          border-color: rgb(99, 102, 241);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        /* Mobile Tabs */
        .mobile-tabs {
          display: none;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .tab-btn {
          padding: 0.75rem 1rem;
          background: white;
          dark:background: rgb(31, 41, 55);
          border: 1px solid rgb(229, 231, 235);
          dark:border: rgb(55, 65, 81);
          border-radius: 0.5rem;
          color: rgb(107, 114, 128);
          dark:color: rgb(156, 163, 175);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: rgb(99, 102, 241);
          border-color: rgb(99, 102, 241);
          color: white;
        }

        /* Tab Panels */
        .stats-content {
          position: relative;
        }
        .tab-panel {
          display: block;
        }

        /* Stats Grid (Desktop) */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .stat-card {
          padding: 1.5rem;
          background: white;
          dark:background: rgb(31, 41, 55);
          border: 1px solid rgb(229, 231, 235);
          dark:border: rgb(55, 65, 81);
          border-radius: 0.75rem;
          transition: all 0.3s;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }
        .stat-card.hero {
          background: linear-gradient(135deg, rgb(99, 102, 241), rgb(139, 92, 246));
          border: none;
          color: white;
        }
        .card-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
        }
        .card-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: rgb(107, 114, 128);
          dark:color: rgb(156, 163, 175);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .stat-card.hero .card-label {
          color: rgba(255, 255, 255, 0.9);
        }
        .card-value {
          font-size: 2rem;
          font-weight: 700;
          color: rgb(17, 24, 39);
          dark:color: rgb(243, 244, 246);
          margin-bottom: 0.25rem;
        }
        .stat-card.hero .card-value {
          color: white;
        }
        .card-meta {
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
          dark:color: rgb(156, 163, 175);
        }
        .stat-card.hero .card-meta {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Lists */
        .list-section {
          background: white;
          dark:background: rgb(31, 41, 55);
          border: 1px solid rgb(229, 231, 235);
          dark:border: rgb(55, 65, 81);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }
        .list-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: rgb(17, 24, 39);
          dark:color: rgb(243, 244, 246);
          margin-bottom: 1rem;
        }
        .token-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .token-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgb(249, 250, 251);
          dark:background: rgb(17, 24, 39);
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        .token-item:hover {
          background: rgb(243, 244, 246);
          dark:background: rgb(31, 41, 55);
        }
        .token-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .token-symbol {
          font-weight: 600;
          color: rgb(17, 24, 39);
          dark:color: rgb(243, 244, 246);
        }
        .token-balance {
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
          dark:color: rgb(156, 163, 175);
        }
        .token-value {
          font-weight: 600;
          color: rgb(99, 102, 241);
        }
        .nft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .nft-card {
          padding: 1rem;
          background: rgb(249, 250, 251);
          dark:background: rgb(17, 24, 39);
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        .nft-card:hover {
          background: rgb(243, 244, 246);
          dark:background: rgb(31, 41, 55);
          transform: translateY(-2px);
        }
        .nft-name {
          font-weight: 600;
          color: rgb(17, 24, 39);
          dark:color: rgb(243, 244, 246);
          margin-bottom: 0.25rem;
        }
        .nft-count {
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
          dark:color: rgb(156, 163, 175);
          margin-bottom: 0.5rem;
        }
        .nft-value {
          font-weight: 600;
          color: rgb(99, 102, 241);
        }
        .activity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .activity-item {
          padding: 1rem;
          background: rgb(249, 250, 251);
          dark:background: rgb(17, 24, 39);
          border-radius: 0.5rem;
        }
        .activity-label {
          display: block;
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
          dark:color: rgb(156, 163, 175);
          margin-bottom: 0.25rem;
        }
        .activity-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 600;
          color: rgb(17, 24, 39);
          dark:color: rgb(243, 244, 246);
        }
        .empty-list {
          text-align: center;
          padding: 3rem 1rem;
          color: rgb(156, 163, 175);
          font-size: 0.875rem;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .stats-container {
            padding: 1rem;
          }
          .mobile-tabs {
            display: grid;
          }
          .tab-panel {
            display: none;
          }
          .tab-panel.active {
            display: block;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .chain-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .nft-grid {
            grid-template-columns: 1fr;
          }
          .activity-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
