/**
 * StatsCards - Portfolio stats display component
 * 
 * Adapted from: trezoadmin-41 Dashboard analytics cards (35% adaptation)
 * Pattern: Responsive grid layout with gradient styling
 * 
 * Features:
 * - Portfolio value in USD
 * - Token & NFT counts
 * - Account age & activity metrics
 * - External scores (Talent, Neynar)
 * - Professional gradient styling
 */

import type { OnchainStatsData } from '@/hooks/useOnchainStats'

type StatsCardsProps = {
  data: OnchainStatsData | null
  validating?: boolean // Background refresh indicator
}

export function StatsCards({ data, validating = false }: StatsCardsProps) {
  if (!data) return null

  const portfolioValue = data.portfolioValueUSD ? `$${parseFloat(data.portfolioValueUSD).toLocaleString()}` : 'N/A'
  const balance = data.balance ? `${parseFloat(data.balance).toFixed(4)} ETH` : '0 ETH'
  const tokenCount = data.erc20TokenCount || 0
  const nftCount = data.nftCollectionsCount || 0
  const accountAge = data.accountAgeDays ? `${data.accountAgeDays} days` : 'New'
  const totalTxs = data.totalTxs || 0
  const contractsDeployed = data.contractsDeployed || 0
  const talentScore = data.talentScore || 0
  const neynarScore = data.neynarScore || 0

  return (
    <div className="stats-grid">
      {/* Validating Indicator */}
      {validating && (
        <div className="validating-indicator">
          <div className="validating-spinner" />
          <span>Updating...</span>
        </div>
      )}

      {/* Portfolio Value - Hero Card */}
      <div className="stat-card stat-card-hero">
        <div className="stat-card-header">
          <span className="stat-label">Portfolio Value</span>
          <span className="stat-icon">💰</span>
        </div>
        <div className="stat-value stat-value-large">{portfolioValue}</div>
        <div className="stat-detail">
          <span>{balance}</span>
          {data.stablecoinBalance && (
            <span className="stat-badge">${parseFloat(data.stablecoinBalance).toFixed(2)} stable</span>
          )}
        </div>
      </div>

      {/* Tokens */}
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-label">Tokens</span>
          <span className="stat-icon">🪙</span>
        </div>
        <div className="stat-value">{tokenCount}</div>
        <div className="stat-detail">ERC-20 tokens</div>
      </div>

      {/* NFTs */}
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-label">NFTs</span>
          <span className="stat-icon">🖼️</span>
        </div>
        <div className="stat-value">{nftCount}</div>
        <div className="stat-detail">Collections owned</div>
      </div>

      {/* Account Age */}
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-label">Account Age</span>
          <span className="stat-icon">📅</span>
        </div>
        <div className="stat-value">{accountAge}</div>
        {data.firstTx?.date && (
          <div className="stat-detail">Since {new Date(data.firstTx.date).toLocaleDateString()}</div>
        )}
      </div>

      {/* Activity */}
      <div className="stat-card">
        <div className="stat-card-header">
          <span className="stat-label">Transactions</span>
          <span className="stat-icon">⚡</span>
        </div>
        <div className="stat-value">{totalTxs.toLocaleString()}</div>
        <div className="stat-detail">{data.uniqueDays || 0} active days</div>
      </div>

      {/* Developer Activity */}
      {contractsDeployed > 0 && (
        <div className="stat-card stat-card-accent">
          <div className="stat-card-header">
            <span className="stat-label">Developer</span>
            <span className="stat-icon">👨‍💻</span>
          </div>
          <div className="stat-value">{contractsDeployed}</div>
          <div className="stat-detail">Contracts deployed</div>
        </div>
      )}

      {/* Talent Score */}
      {talentScore > 0 && (
        <div className="stat-card stat-card-talent">
          <div className="stat-card-header">
            <span className="stat-label">Talent Score</span>
            <span className="stat-icon">⭐</span>
          </div>
          <div className="stat-value">{talentScore}</div>
          <div className="stat-detail">Builder reputation</div>
        </div>
      )}

      {/* Neynar Score */}
      {neynarScore > 0 && (
        <div className="stat-card stat-card-neynar">
          <div className="stat-card-header">
            <span className="stat-label">Farcaster Score</span>
            <span className="stat-icon">🎭</span>
          </div>
          <div className="stat-value">{neynarScore}</div>
          <div className="stat-detail">Social reputation</div>
        </div>
      )}

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          width: 100%;
          position: relative;
        }

        .validating-indicator {
          position: absolute;
          top: -2.5rem;
          right: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-tertiary, #888);
        }

        .validating-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid var(--border-color, #333);
          border-top-color: var(--primary-color, #4f46e5);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .stat-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .stat-card-hero {
          grid-column: span 2;
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
          border-color: rgba(79, 70, 229, 0.3);
        }

        .stat-card-accent {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .stat-card-talent {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
          border-color: rgba(251, 191, 36, 0.3);
        }

        .stat-card-neynar {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
          border-color: rgba(168, 85, 247, 0.3);
        }

        .stat-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .stat-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary, #aaa);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-icon {
          font-size: 1.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary, #fff);
          margin-bottom: 0.5rem;
        }

        .stat-value-large {
          font-size: 2.5rem;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-detail {
          font-size: 0.875rem;
          color: var(--text-tertiary, #888);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stat-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card-hero {
            grid-column: span 1;
          }

          .stat-value {
            font-size: 1.75rem;
          }

          .stat-value-large {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  )
}
