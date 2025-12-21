'use client'

import { useAuthContext, useWallets } from '@/lib/contexts/AuthContext'

/**
 * Demo component showing multi-wallet cache from AuthContext
 * 
 * Displays:
 * - Authentication status
 * - Primary wallet address
 * - All cached wallets (primary + custody + verified)
 * - Cache sync status
 * 
 * Usage:
 * ```tsx
 * import { WalletCacheDemo } from '@/components/WalletCacheDemo'
 * 
 * <WalletCacheDemo />
 * ```
 */
export function WalletCacheDemo() {
  const { fid, address, profile, isAuthenticated, isLoading, cachedWallets } = useAuthContext()
  const wallets = useWallets() // Alternative way to access cached wallets

  if (isLoading) {
    return (
      <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4">
        <p className="text-sm text-slate-300">Loading authentication...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
        <p className="text-sm text-slate-300">Not authenticated. Connect wallet to test multi-wallet cache.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-green-300 mb-2">🔐 Authentication Status</h3>
        <div className="space-y-1 text-xs text-slate-300">
          <p><strong>FID:</strong> {fid || 'Not resolved'}</p>
          <p><strong>Username:</strong> {profile?.username ? `@${profile.username}` : 'N/A'}</p>
          <p><strong>Primary Address:</strong> {address || 'Not connected'}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-green-300 mb-2">
          💰 Multi-Wallet Cache ({cachedWallets.length} wallets)
        </h3>
        {cachedWallets.length > 0 ? (
          <ul className="space-y-1 text-xs text-slate-300 font-mono">
            {cachedWallets.map((wallet, i) => (
              <li key={wallet} className="truncate">
                {i + 1}. {wallet}
                {wallet.toLowerCase() === address?.toLowerCase() && (
                  <span className="ml-2 text-green-400">(connected)</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No wallets cached yet. May need to sync from Neynar.</p>
        )}
      </div>

      <div className="pt-2 border-t border-green-400/20">
        <p className="text-xs text-slate-400">
          ℹ️ Wallets auto-sync from Neynar on connect via 3-layer hybrid system
        </p>
      </div>
    </div>
  )
}

/**
 * Compact version showing just wallet count
 */
export function WalletCacheIndicator() {
  const { isAuthenticated, cachedWallets } = useAuthContext()

  if (!isAuthenticated) return null

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30">
      <span className="text-xs font-mono text-green-300">
        {cachedWallets.length} wallet{cachedWallets.length !== 1 ? 's' : ''} cached
      </span>
    </div>
  )
}
