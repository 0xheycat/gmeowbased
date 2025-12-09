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
      <div className="onchain-container">
        <div className="empty-state">
          <div className="empty-icon-wrapper">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3 className="empty-title">Connect to Explore</h3>
          <p className="empty-desc">View your onchain portfolio across 12 networks</p>
          <appkit-button />
        </div>
      </div>
    )
  }

  // Loading state
  if (isWalletLoading || loading) {
    return (
      <div className="onchain-container">
        <div className="chain-section">
          <div className="section-header">
            <h3 className="section-title">SELECT CHAIN</h3>
            <div className="status-badge">
              <div className="spinner" />
              Loading...
            </div>
          </div>
          <div className="chain-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="chain-btn skeleton-shimmer" />
            ))}
          </div>
        </div>
        <div className="cards-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card skeleton-shimmer" style={{ height: '140px' }} />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="onchain-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Failed to Load</h3>
          <p className="error-desc">{error.message}</p>
          <button onClick={revalidate} className="retry-btn">
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
    <div className="onchain-container">
      {/* Chain Switcher - Preserved from v2 */}
      <div className="chain-section">
        <div className="section-header">
          <h3 className="section-title">CHAIN EXPLORER</h3>
          <button 
            onClick={revalidate} 
            className="refresh-btn" 
            disabled={validating}
            title="Refresh data"
          >
            <svg 
              className={validating ? 'refresh-icon spinning' : 'refresh-icon'} 
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
        <div className="chain-grid">
          {Object.values(CHAINS).map((c) => (
            <button
              key={c.key}
              onClick={() => setChainKey(c.key)}
              className={`chain-btn ${c.key === chainKey ? 'active' : ''}`}
              title={`Switch to ${c.name}`}
            >
              <Image src={c.icon} alt={c.name} width={20} height={20} unoptimized />
              <span className="chain-name">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards - gmeowbased0.6 pattern */}
      <div className="cards-grid">
        {/* Portfolio Card - Hero style */}
        <div className="stat-card hero-card">
          <div className="card-header">
            <div className="card-icon gradient-primary">💰</div>
            <div className="card-badge">{chainCfg.name}</div>
          </div>
          <div className="card-content">
            <div className="card-label">Portfolio Value</div>
            <div className="card-value">{portfolioValue}</div>
            <div className="card-meta">{balance} ETH</div>
          </div>
        </div>

        {/* Tokens Card - Expandable */}
        <div 
          className={`stat-card expandable-card ${expandedCard === 'tokens' ? 'expanded' : ''}`}
          onClick={() => toggleCard('tokens')}
        >
          <div className="card-header">
            <div className="card-icon gradient-blue">🪙</div>
            <svg className="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-label">Tokens</div>
            <div className="card-value">{formatNumber(tokenCount)}</div>
            <div className="card-meta">ERC-20 Holdings</div>
          </div>
          {expandedCard === 'tokens' && (
            <div className="card-expansion" onClick={(e) => e.stopPropagation()}>
              <div className="expansion-title">Top Holdings</div>
              <div className="token-list">
                {topTokens.slice(0, 5).map((token: any, i: number) => (
                  <div key={i} className="token-row">
                    <div className="token-info">
                      <span className="token-symbol">{token.symbol}</span>
                      <span className="token-balance">{formatBalance(token.balance)}</span>
                    </div>
                    <div className="token-value">{formatUSD(token.valueUSD)}</div>
                  </div>
                ))}
                {topTokens.length === 0 && (
                  <div className="empty-message">No tokens found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* NFTs Card - Expandable */}
        <div 
          className={`stat-card expandable-card ${expandedCard === 'nfts' ? 'expanded' : ''}`}
          onClick={() => toggleCard('nfts')}
        >
          <div className="card-header">
            <div className="card-icon gradient-purple">🖼️</div>
            <svg className="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-label">NFT Collections</div>
            <div className="card-value">{formatNumber(nftCount)}</div>
            <div className="card-meta">Digital Assets</div>
          </div>
          {expandedCard === 'nfts' && (
            <div className="card-expansion" onClick={(e) => e.stopPropagation()}>
              <div className="expansion-title">Collections</div>
              <div className="nft-grid">
                {topNFTs.slice(0, 4).map((nft: any, i: number) => (
                  <div key={i} className="nft-item">
                    <div className="nft-name">{nft.name || 'Unnamed'}</div>
                    <div className="nft-count">{nft.tokenCount} items</div>
                    {nft.totalValueUSD && (
                      <div className="nft-value">{formatUSD(nft.totalValueUSD)}</div>
                    )}
                  </div>
                ))}
                {topNFTs.length === 0 && (
                  <div className="empty-message">No NFTs found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity Card - Expandable */}
        <div 
          className={`stat-card expandable-card ${expandedCard === 'activity' ? 'expanded' : ''}`}
          onClick={() => toggleCard('activity')}
        >
          <div className="card-header">
            <div className="card-icon gradient-green">⚡</div>
            <svg className="expand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className="card-content">
            <div className="card-label">Transactions</div>
            <div className="card-value">{formatNumber(totalTxs)}</div>
            <div className="card-meta">Total Activity</div>
          </div>
          {expandedCard === 'activity' && (
            <div className="card-expansion" onClick={(e) => e.stopPropagation()}>
              <div className="expansion-title">Activity Details</div>
              <div className="activity-list">
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
          )}
        </div>
      </div>

      <style jsx>{`
        /* Container */
        .onchain-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem 1rem;
        }

        /* Empty/Error States */
        .empty-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          background: linear-gradient(135deg, 
            rgba(99, 102, 241, 0.05), 
            rgba(168, 85, 247, 0.05)
          );
          border-radius: 1rem;
          border: 1px solid rgba(99, 102, 241, 0.1);
          min-height: 300px;
        }
        .empty-icon-wrapper {
          width: 80px;
          height: 80px;
          margin-bottom: 1.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, rgb(99, 102, 241), rgb(139, 92, 246));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-icon {
          width: 40px;
          height: 40px;
          color: white;
        }
        .empty-title,
        .error-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: rgb(17, 24, 39);
          margin-bottom: 0.5rem;
        }
        .empty-desc,
        .error-desc {
          color: rgb(107, 114, 128);
          margin-bottom: 2rem;
        }
        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .retry-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgb(99, 102, 241);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .retry-btn:hover {
          background: rgb(79, 70, 229);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        /* Chain Switcher */
        .chain-section {
          margin-bottom: 2rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .section-title {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: rgb(107, 114, 128);
          text-transform: uppercase;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgb(99, 102, 241);
        }
        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(99, 102, 241, 0.2);
          border-top-color: rgb(99, 102, 241);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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
        .refresh-icon {
          display: block;
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
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 0.75rem;
        }
        .chain-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: white;
          border: 2px solid rgb(229, 231, 235);
          border-radius: 0.75rem;
          color: rgb(55, 65, 81);
          font-size: 0.875rem;
          font-weight: 600;
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
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
        }
        .chain-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Cards Grid */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        /* Stat Cards - Pattern from gmeowbased0.6 collection-card */
        .stat-card {
          position: relative;
          background: white;
          border: 1px solid rgb(229, 231, 235);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
        }
        .hero-card {
          background: linear-gradient(135deg, rgb(99, 102, 241), rgb(139, 92, 246));
          border: none;
          color: white;
          grid-column: span 1;
        }
        .expandable-card {
          cursor: pointer;
        }
        .expandable-card.expanded {
          grid-column: span 2;
          transform: none;
        }
        .expandable-card.expanded:hover {
          transform: none;
        }

        /* Card Header */
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .gradient-primary {
          background: linear-gradient(135deg, rgb(252, 211, 77), rgb(251, 146, 60));
        }
        .gradient-blue {
          background: linear-gradient(135deg, rgb(59, 130, 246), rgb(37, 99, 235));
        }
        .gradient-purple {
          background: linear-gradient(135deg, rgb(168, 85, 247), rgb(126, 34, 206));
        }
        .gradient-green {
          background: linear-gradient(135deg, rgb(34, 197, 94), rgb(22, 163, 74));
        }
        .card-badge {
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .expand-icon {
          color: rgb(156, 163, 175);
          transition: transform 0.3s;
        }
        .expandable-card.expanded .expand-icon {
          transform: rotate(180deg);
        }

        /* Card Content */
        .card-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .card-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: rgb(107, 114, 128);
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .hero-card .card-label {
          color: rgba(255, 255, 255, 0.9);
        }
        .card-value {
          font-size: 2rem;
          font-weight: 700;
          color: rgb(17, 24, 39);
          line-height: 1;
        }
        .hero-card .card-value {
          color: white;
        }
        .card-meta {
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
        }
        .hero-card .card-meta {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Card Expansion */
        .card-expansion {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgb(229, 231, 235);
        }
        .expansion-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: rgb(55, 65, 81);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }

        /* Token List */
        .token-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .token-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgb(249, 250, 251);
          border-radius: 0.5rem;
          transition: background 0.2s;
        }
        .token-row:hover {
          background: rgb(243, 244, 246);
        }
        .token-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .token-symbol {
          font-weight: 700;
          color: rgb(17, 24, 39);
        }
        .token-balance {
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
        }
        .token-value {
          font-weight: 700;
          color: rgb(99, 102, 241);
        }

        /* NFT Grid */
        .nft-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .nft-item {
          padding: 1rem;
          background: rgb(249, 250, 251);
          border-radius: 0.5rem;
          transition: background 0.2s;
        }
        .nft-item:hover {
          background: rgb(243, 244, 246);
        }
        .nft-name {
          font-weight: 700;
          color: rgb(17, 24, 39);
          margin-bottom: 0.25rem;
        }
        .nft-count {
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
          margin-bottom: 0.5rem;
        }
        .nft-value {
          font-weight: 700;
          color: rgb(99, 102, 241);
          font-size: 0.875rem;
        }

        /* Activity List */
        .activity-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .activity-item {
          padding: 1rem;
          background: rgb(249, 250, 251);
          border-radius: 0.5rem;
        }
        .activity-label {
          display: block;
          font-size: 0.875rem;
          color: rgb(107, 114, 128);
          margin-bottom: 0.5rem;
        }
        .activity-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: rgb(17, 24, 39);
        }

        /* Empty Message */
        .empty-message {
          text-align: center;
          padding: 2rem;
          color: rgb(156, 163, 175);
          font-size: 0.875rem;
        }

        /* Skeleton Shimmer */
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            rgba(229, 231, 235, 0.4) 25%,
            rgba(229, 231, 235, 0.8) 50%,
            rgba(229, 231, 235, 0.4) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
          .expandable-card.expanded {
            grid-column: span 1;
          }
          .nft-grid,
          .activity-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .onchain-container {
            padding: 1rem;
          }
          .chain-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .chain-btn {
            padding: 0.625rem;
            font-size: 0.8125rem;
          }
          .cards-grid {
            grid-template-columns: 1fr;
          }
          .card-value {
            font-size: 1.75rem;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .stat-card {
            background: rgb(31, 41, 55);
            border-color: rgb(55, 65, 81);
          }
          .chain-btn {
            background: rgb(31, 41, 55);
            border-color: rgb(55, 65, 81);
            color: rgb(209, 213, 219);
          }
          .card-label,
          .card-meta {
            color: rgb(156, 163, 175);
          }
          .card-value {
            color: rgb(243, 244, 246);
          }
          .token-row,
          .nft-item,
          .activity-item {
            background: rgb(17, 24, 39);
          }
          .token-row:hover,
          .nft-item:hover {
            background: rgb(31, 41, 55);
          }
          .empty-title,
          .error-title {
            color: rgb(243, 244, 246);
          }
          .empty-desc,
          .error-desc {
            color: rgb(156, 163, 175);
          }
        }
      `}</style>
    </div>
  )
}
