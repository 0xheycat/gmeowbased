/**
 * OnchainStatsCard Component - Main Dashboard Stats Display
 * 
 * Requirements:
 * - Display all onchain stats: txs, contracts, Talent score, Neynar score, etc.
 * - Support 15 chains with chain selector
 * - Loading skeletons and error states
 * - Share functionality (flexing)
 * - Use Tailwick v2.0 components (Card, CardBody, Badge, Button)
 * - Use Gmeowbased v0.1 icons
 * - Mobile-first responsive design
 * 
 * ❌ NO old foundation UI/UX patterns
 * ✅ Data logic from new API layer
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import { Card, CardBody, CardHeader, Badge, Button } from '@/components/ui/tailwick-primitives'
import { useOnchainStats } from '@/hooks/useOnchainStats'
import { CHAIN_REGISTRY, getAllChainKeys, getChainConfig, type ChainKey } from '@/lib/chain-registry'
import { formatAccountAge, formatTimestamp, formatNumber, formatDecimal } from '@/lib/onchain-stats-types'
import { fetchUserByUsername } from '@/lib/neynar'
import { useMiniapp } from '@/hooks/useMiniapp'
import { safeComposeCast } from '@/lib/miniapp-detection'

export function OnchainStatsCard() {
  const { address: walletAddress } = useAccount()
  const { isMiniapp } = useMiniapp()
  const [selectedChain, setSelectedChain] = useState<ChainKey>('base')
  const [isChainSelectorOpen, setIsChainSelectorOpen] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  
  // Use resolved address from @username or wallet address
  const address = resolvedAddress || walletAddress
  const { stats, loading, error } = useOnchainStats(address, selectedChain)

  const chainConfig = getChainConfig(selectedChain)!  // Always valid since selectedChain is ChainKey

  // Resolve @username to address for miniapp users
  useEffect(() => {
    const resolveUsername = async () => {
      if (!usernameInput.trim() || !isMiniapp) {
        setResolvedAddress(null)
        return
      }
      
      setIsResolving(true)
      try {
        const user = await fetchUserByUsername(usernameInput)
        if (user?.verifications?.[0]) {
          setResolvedAddress(user.verifications[0])
        } else {
          setResolvedAddress(null)
        }
      } catch (err) {
        console.error('Username resolution failed:', err)
        setResolvedAddress(null)
      } finally {
        setIsResolving(false)
      }
    }

    const debounce = setTimeout(resolveUsername, 500)
    return () => clearTimeout(debounce)
  }, [usernameInput, isMiniapp])

  // Share functionality - Compose cast on Farcaster
  const handleShare = async () => {
    if (!stats) return
    
    // Build share text with stats (no emojis, theme-consistent)
    const lines = [
      `My Onchain Stats on ${chainConfig.name}`,
      '',
      `Transactions: ${formatNumber(stats.totalOutgoingTxs || 0)}`,
      `Contracts Deployed: ${formatNumber(stats.contractsDeployed || 0)}`,
    ]
    
    if (stats.talentScore) lines.push(`Talent Score: ${stats.talentScore}`)
    if (stats.neynarScore) lines.push(`Neynar Score: ${stats.neynarScore}`)
    if (stats.powerBadge) lines.push('Power Badge Holder')
    
    lines.push('')
    lines.push('Built with @gmeowbased')
    
    const shareText = lines.join('\n')

    // Use Farcaster composer (or web fallback)
    await safeComposeCast({ text: shareText })
  }

  return (
    <div className="space-y-6">
      {/* Username Input for Miniapp */}
      {isMiniapp && (
        <Card>
          <CardBody>
            <div className="space-y-2">
              <label htmlFor="username-input" className="text-sm font-medium theme-text-primary">
                Lookup by Farcaster Username
              </label>
              <div className="flex gap-2">
                <input
                  id="username-input"
                  type="text"
                  placeholder="@username or username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg theme-bg-subtle border theme-border-default theme-text-primary placeholder:theme-text-tertiary focus:outline-none focus:border-primary"
                />
                {isResolving && (
                  <div className="flex items-center px-4">
                    <div className="w-5 h-5 border-2 theme-border-subtle border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {resolvedAddress && (
                <div className="text-xs theme-text-secondary">
                  Resolved: {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Chain Selector */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={chainConfig.icon}
                alt={chainConfig.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <div className="text-sm theme-text-secondary">Selected Chain</div>
                <div className="text-lg font-bold theme-text-primary">{chainConfig.name}</div>
              </div>
            </div>

            {/* Chain Dropdown */}
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChainSelectorOpen(!isChainSelectorOpen)}
              >
                Switch Chain
              </Button>

              {isChainSelectorOpen && (
                <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto theme-bg-overlay rounded-lg border theme-border-default shadow-xl z-50">
                  {getAllChainKeys().map((chainKey) => {
                    const config = getChainConfig(chainKey)!  // Always valid
                    return (
                      <button
                        key={chainKey}
                        onClick={() => {
                          setSelectedChain(chainKey)
                          setIsChainSelectorOpen(false)
                        }}
                        className={`
                          w-full flex items-center gap-3 p-3 transition-colors
                          hover:bg-white/10
                          ${chainKey === selectedChain ? 'bg-primary/20' : ''}
                        `}
                      >
                        <Image
                          src={config.icon}
                          alt={config.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="text-left">
                          <div className="text-sm font-medium theme-text-primary">{config.name}</div>
                          <div className="text-xs theme-text-secondary">{config.nativeSymbol}</div>
                        </div>
                        {chainKey === selectedChain && (
                          <Badge variant="primary" size="sm" className="ml-auto">
                            Active
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardBody>
            <div className="space-y-4">
              <div className="h-8 w-48 theme-bg-subtle rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-24 theme-bg-subtle rounded animate-pulse" />
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card gradient="orange">
          <CardBody>
            <div className="flex items-center gap-3">
              <Image
                src="/assets/gmeow-icons/Alert Icon.svg"
                alt="Error"
                width={48}
                height={48}
                className="w-12 h-12"
              />
              <div>
                <div className="text-lg font-bold text-red-300">Failed to Load Stats</div>
                <div className="text-sm text-red-200/80">{error}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Stats Display */}
      {stats && !loading && (
        <>
          {/* Account Overview */}
          <Card gradient="purple">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold theme-text-primary">
                  {chainConfig.name} Stats
                </h2>
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Image
                    src="/assets/gmeow-icons/Share Icon.svg"
                    alt="Share"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  Compose Share
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Balance */}
                <div className="space-y-2">
                  <div className="text-sm theme-text-secondary">Balance</div>
                  <div className="text-3xl font-bold theme-text-primary">
                    {stats.baseBalanceEth ? `${formatDecimal(parseFloat(stats.baseBalanceEth), 4)} ${chainConfig.nativeSymbol}` : 'N/A'}
                  </div>
                </div>

                {/* Account Age */}
                <div className="space-y-2">
                  <div className="text-sm theme-text-secondary">Account Age</div>
                  <div className="text-3xl font-bold theme-text-primary">
                    {stats.baseAgeSeconds ? formatAccountAge(stats.baseAgeSeconds) : 'N/A'}
                  </div>
                </div>
              </div>

              {/* First/Last Transaction */}
              {(stats.firstTxAt || stats.lastTxAt) && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.firstTxAt && (
                    <div className="space-y-1">
                      <div className="text-xs theme-text-secondary">First Transaction</div>
                      <div className="text-sm font-medium theme-text-primary">
                        {formatTimestamp(stats.firstTxAt)}
                      </div>
                    </div>
                  )}
                  {stats.lastTxAt && (
                    <div className="space-y-1">
                      <div className="text-xs theme-text-secondary">Last Transaction</div>
                      <div className="text-sm font-medium theme-text-primary">
                        {formatTimestamp(stats.lastTxAt)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Transaction & Contract Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Transactions */}
            <Card hover>
              <CardBody>
                <div className="flex items-center gap-4">
                  <Image
                    src="/assets/gmeow-icons/Timeline Icon.svg"
                    alt="Transactions"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                  <div>
                    <div className="text-sm theme-text-secondary">Transactions</div>
                    <div className="text-3xl font-bold theme-text-primary">
                      {stats.totalOutgoingTxs !== null ? formatNumber(stats.totalOutgoingTxs) : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Contracts Deployed */}
            <Card hover>
              <CardBody>
                <div className="flex items-center gap-4">
                  <Image
                    src="/assets/gmeow-icons/Settings Icon.svg"
                    alt="Contracts"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                  <div>
                    <div className="text-sm theme-text-secondary">Contracts Deployed</div>
                    <div className="text-3xl font-bold theme-text-primary">
                      {stats.contractsDeployed !== null ? formatNumber(stats.contractsDeployed) : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Total Volume */}
            <Card hover>
              <CardBody>
                <div className="flex items-center gap-4">
                  <Image
                    src="/assets/gmeow-icons/Credits Icon.svg"
                    alt="Volume"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                  <div>
                    <div className="text-sm theme-text-secondary">Total Volume</div>
                    <div className="text-2xl font-bold theme-text-primary">
                      {stats.totalVolumeEth || 'N/A'}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Social Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Talent Score */}
            <Card gradient="blue" hover>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/assets/gmeow-icons/Trophy Icon.svg"
                      alt="Talent Score"
                      width={48}
                      height={48}
                      className="w-12 h-12"
                    />
                    <div>
                      <div className="text-sm theme-text-secondary">Talent Score</div>
                      <div className="text-3xl font-bold theme-text-primary">
                        {stats.talentScore !== null ? formatNumber(stats.talentScore) : 'N/A'}
                      </div>
                      {stats.talentUpdatedAt && (
                        <div className="text-xs theme-text-secondary mt-1">
                          Updated: {formatTimestamp(new Date(stats.talentUpdatedAt).getTime() / 1000)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Neynar Score */}
            <Card gradient="cyan" hover>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/assets/gmeow-icons/Thumbs Up Icon.svg"
                      alt="Neynar Score"
                      width={48}
                      height={48}
                      className="w-12 h-12"
                    />
                    <div>
                      <div className="text-sm theme-text-secondary">Neynar Score</div>
                      <div className="text-3xl font-bold theme-text-primary">
                        {stats.neynarScore !== null ? formatNumber(stats.neynarScore) : 'N/A'}
                      </div>
                      {stats.powerBadge && (
                        <Badge variant="primary" size="sm" className="mt-2">
                          💜 Power Badge
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Featured Contract */}
          {stats.featured && (
            <Card gradient="green">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image
                    src="/assets/gmeow-icons/Trophy Icon.svg"
                    alt="Featured"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <h3 className="text-xl font-bold theme-text-primary">
                    Featured Contract
                  </h3>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs theme-text-secondary">Contract Address</div>
                    <a
                      href={`${chainConfig.explorer}/address/${stats.featured.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline"
                    >
                      {stats.featured.address}
                    </a>
                  </div>

                  {stats.featured.creator && (
                    <div>
                      <div className="text-xs theme-text-secondary">Creator</div>
                      <a
                        href={`${chainConfig.explorer}/address/${stats.featured.creator}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-primary hover:underline"
                      >
                        {stats.featured.creator}
                      </a>
                    </div>
                  )}

                  {stats.featured.creationTx && (
                    <div>
                      <div className="text-xs theme-text-secondary">Creation Transaction</div>
                      <a
                        href={`${chainConfig.explorer}/tx/${stats.featured.creationTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-primary hover:underline"
                      >
                        {stats.featured.creationTx.slice(0, 10)}...{stats.featured.creationTx.slice(-8)}
                      </a>
                    </div>
                  )}

                  {(stats.featured.firstTxTime || stats.featured.lastTxTime) && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {stats.featured.firstTxTime && (
                        <div>
                          <div className="text-xs theme-text-secondary">First Activity</div>
                          <div className="text-sm font-medium theme-text-primary">
                            {formatTimestamp(stats.featured.firstTxTime)}
                          </div>
                        </div>
                      )}
                      {stats.featured.lastTxTime && (
                        <div>
                          <div className="text-xs theme-text-secondary">Last Activity</div>
                          <div className="text-sm font-medium theme-text-primary">
                            {formatTimestamp(stats.featured.lastTxTime)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Show message if no address available */}
          {!address && (
            <Card>
              <CardBody>
                <div className="text-center py-8">
                  <Image
                    src="/assets/gmeow-icons/Info Icon.svg"
                    alt="Info"
                    width={48}
                    height={48}
                    className="w-12 h-12 mx-auto mb-4 opacity-50"
                  />
                  <p className="theme-text-secondary">
                    {isMiniapp 
                      ? 'Enter a Farcaster username above to view stats'
                      : 'Use the navigation menu to connect your wallet'}
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
