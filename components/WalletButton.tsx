'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { probeMiniappReady, getFarcasterWalletAddress } from '@/lib/miniapp/miniappEnv'
import { useDialog, ErrorDialog } from '@/components/dialogs'

/**
 * WalletButton - Single wallet connection component for entire app
 * 
 * Based on Coinbase MCP best practices (Dec 2025):
 * - Single trust source for wallet connections
 * - Multi-wallet support (MetaMask, Coinbase Wallet, WalletConnect, Farcaster)
 * - Auto-connect in Farcaster miniapp
 * - Professional error handling
 * - Responsive button states
 * 
 * @see https://docs.cdp.coinbase.com/embedded-wallets/best-practices
 * @see https://docs.cdp.coinbase.com/x402/miniapps
 * 
 * Usage:
 * ```tsx
 * import { WalletButton } from '@/components/WalletButton'
 * 
 * function Header() {
 *   return <WalletButton />
 * }
 * ```
 */
export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectAsync, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { isOpen: errorOpen, open: openError, close: closeError } = useDialog()
  const [errorMessage, setErrorMessage] = useState('')
  
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [showWalletMenu, setShowWalletMenu] = useState(false)
  const [miniappReady, setMiniappReady] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const triedAutoRef = useRef(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Log component mount and state
  useEffect(() => {
    console.log('[WalletButton] Component mounted')
    console.log('[WalletButton] useConnect available:', { connect: !!connect, connectAsync: !!connectAsync, connectors: connectors.length })
    console.log('[WalletButton] useAccount:', { address, isConnected })
  }, [])

  // Log connectors on mount and changes
  useEffect(() => {
    const connectorsList = connectors.map((c: any) => ({
      id: c?.id,
      name: c?.name,
      ready: typeof c?.ready === 'boolean' ? c.ready : 'unknown',
    }))
    console.log('[WalletButton] Initial/updated connectors:', connectorsList, 'count:', connectors.length)
  }, [connectors])

  // Log miniappReady changes
  useEffect(() => {
    console.log('[WalletButton] miniappReady changed to:', miniappReady)
  }, [miniappReady])

  // Check if in Farcaster miniapp context
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const ok = await probeMiniappReady()
        if (active) setMiniappReady(Boolean(ok))
      } catch {
        if (active) setMiniappReady(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Available connectors (filter by readiness, but include Farcaster if miniapp detected)
  const availableConnectors = useMemo(() => {
    const filtered = connectors.filter((connector) => {
      if (typeof connector.ready === 'boolean') return connector.ready
      return true
    })
    
    // If miniapp is detected, ALWAYS include Farcaster connector even if it reports ready: false
    // This is because the connector's ready status might be determined by SDK context,
    // which we've already validated with probeMiniappReady()
    if (miniappReady) {
      const hasFarcaster = filtered.some((c: any) =>
        c?.id?.toString?.().toLowerCase().includes('farcaster') ||
        c?.name?.toLowerCase?.().includes('farcaster')
      )
      
      if (!hasFarcaster) {
        // Find Farcaster connector in full list and add it
        const farcasterConnector = connectors.find((c: any) =>
          c?.id?.toString?.().toLowerCase().includes('farcaster') ||
          c?.name?.toLowerCase?.().includes('farcaster')
        )
        if (farcasterConnector) {
          console.log('[WalletButton] Force-including Farcaster connector (miniapp detected)')
          filtered.push(farcasterConnector)
        }
      }
    }
    
    return filtered
  }, [connectors, miniappReady])

  // Auto-connect in Farcaster Mini App
  useEffect(() => {
    if (triedAutoRef.current) return
    if (isConnected) return
    
    // Only auto-connect Farcaster if detected in miniapp context
    if (!miniappReady) return
    
    const farcaster = availableConnectors.find(
      (c: any) =>
        c?.id?.toString?.().toLowerCase().includes('farcaster') ||
        c?.name?.toLowerCase?.().includes('farcaster'),
    )
    
    if (!farcaster) {
      console.warn('[WalletButton] No Farcaster connector found. Available:', availableConnectors.map((c: any) => c?.name || c?.id))
      
      // Retry a few times in case Farcaster connector is still loading
      if (retryCount < 2) {
        console.log(`[WalletButton] Retrying to find Farcaster connector (attempt ${retryCount + 1}/2)...`)
        const timer = setTimeout(() => {
          setRetryCount((r) => r + 1)
        }, 300)
        return () => clearTimeout(timer)
      } else {
        // After retries, try direct SDK fallback
        console.log('[WalletButton] Farcaster connector not found after retries, trying SDK direct approach...')
        triedAutoRef.current = true
        setConnectingId('auto-sdk')
        
        ;(async () => {
          try {
            const address = await getFarcasterWalletAddress()
            if (address) {
              console.log('[WalletButton] Got address from Farcaster SDK:', address)
              // Show success - user should see their address connected
              // Note: This is SDK-level connection, actual onchain actions may need manual connection
              console.log('[WalletButton] Farcaster SDK connection ready at:', address)
            } else {
              console.warn('[WalletButton] Could not get address from Farcaster SDK')
              setConnectingId(null)
            }
          } catch (err) {
            console.error('[WalletButton] SDK fallback failed:', err)
            setConnectingId(null)
          }
        })()
      }
      return
    }
    
    // Reset retry count once we find the connector
    setRetryCount(0)
    
    // Don't check ready status for Farcaster - we already validated via probeMiniappReady()
    if (farcaster?.id?.toString?.().toLowerCase().includes('farcaster')) {
      console.log('[WalletButton] Farcaster connector found, skipping ready check (SDK pre-validated)')
    } else if (typeof farcaster.ready === 'boolean' && !farcaster.ready) {
      console.warn('[WalletButton] Non-Farcaster connector not ready:', farcaster.ready)
      return
    }
    
    triedAutoRef.current = true
    setConnectingId('auto')
    
    // Defer to avoid blocking first paint (MCP best practice)
    setTimeout(async () => {
      try {
        console.log('[WalletButton] Attempting auto-connect with:', { id: farcaster?.id, name: farcaster?.name })
        
        if (connectAsync) {
          console.log('[WalletButton] Using connectAsync...')
          await connectAsync({ connector: farcaster })
        } else {
          console.log('[WalletButton] Using sync connect...')
          connect({ connector: farcaster })
        }
        console.log('[WalletButton] Auto-connect initiated successfully')
      } catch (err) {
        console.error('[WalletButton] Auto-connect failed:', {
          error: err,
          errorMessage: (err as any)?.message,
          errorName: (err as any)?.name,
          connector: { id: farcaster?.id, name: farcaster?.name },
        })
        setConnectingId(null)
      }
    }, 100) // Increase delay slightly for mobile
  }, [isConnected, availableConnectors, connect, connectAsync, miniappReady, retryCount])

  // Close menu on outside click
  useEffect(() => {
    if (!showWalletMenu) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowWalletMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showWalletMenu])

  // Clear connecting state when connected
  useEffect(() => {
    if (isConnected && address) {
      setConnectingId(null)
      setShowWalletMenu(false)
    }
  }, [isConnected, address])

  const handleConnect = async (connector: any) => {
    if (typeof connector?.ready === 'boolean' && !connector.ready) {
      setErrorMessage(`${connector.name} is not available in this environment`)
      openError()
      return
    }
    
    try {
      setConnectingId(connector?.id || connector?.name || 'wallet')
      const connectorName = connector?.name || connector?.id || 'Unknown'
      
      console.log('[WalletButton] Attempting connection:', { 
        id: connector?.id, 
        name: connectorName,
        ready: connector?.ready,
      })
      
      if (connectAsync) {
        console.log('[WalletButton] Using connectAsync for:', connectorName)
        await connectAsync({ connector })
      } else {
        console.log('[WalletButton] Using sync connect for:', connectorName)
        connect({ connector })
      }
      
      console.log('[WalletButton] Connection initiated for:', connectorName)
      // Connection success shown in button UI state
    } catch (err: any) {
      console.error('[WalletButton] Failed to connect:', {
        error: err,
        message: err?.message,
        name: err?.name,
        connector: connector?.name || connector?.id,
      })
      
      const message = normalizeConnectError(err)
      if (message) {
        setErrorMessage(message)
        openError()
      }
      
      setConnectingId(null)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowWalletMenu(false)
    // Disconnection shown in button UI state
  }

  // Connected state - show address and disconnect option
  if (isConnected && address) {
    return (
      <div className="relative site-font" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowWalletMenu(!showWalletMenu)}
          className="pixel-button flex items-center gap-2"
        >
          <span className="text-[10px] font-bold">
            {formatAddress(address)}
          </span>
          <svg
            className={`w-3 h-3 transition-transform ${showWalletMenu ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showWalletMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[var(--px-surface)] border border-[var(--px-border)] z-50">
            <div className="py-1">
              <div className="px-4 py-2 text-[10px] text-[var(--px-sub)] border-b border-[var(--px-border)]">
                Connected
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full text-left px-4 py-2 text-[11px] text-[var(--px-text)] hover:bg-[var(--px-hover)] transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Not connected - show wallet selection
  return (
    <div className="relative site-font" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowWalletMenu(!showWalletMenu)}
        disabled={!!connectingId}
        className="pixel-button disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {connectingId ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      {showWalletMenu && (
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-[var(--px-surface)] border border-[var(--px-border)] z-50">
          <div className="py-2">
            <div className="px-4 py-2 text-[11px] font-bold text-[var(--px-text)] border-b border-[var(--px-border)]">
              Select Wallet
            </div>
            
            <div className="space-y-1 p-2">
              {availableConnectors.map((connector) => {
                const isConnecting = connectingId === connector.id || connectingId === 'auto'
                const connectorName = connector.name || 'Unknown'
                
                return (
                  <button
                    key={connector.id}
                    type="button"
                    onClick={() => handleConnect(connector)}
                    disabled={!!connectingId}
                    className="w-full flex items-center gap-3 px-3 py-2 text-[11px] text-[var(--px-text)] hover:bg-[var(--px-hover)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <WalletIcon name={connectorName} />
                    <span className="flex-1 text-left">{connectorName}</span>
                    {isConnecting && (
                      <span className="text-[9px] text-[var(--px-sub)]">Connecting...</span>
                    )}
                  </button>
                )
              })}
            </div>
            
            {!miniappReady && (
              <div className="px-4 py-2 text-[9px] text-[var(--px-sub)] border-t border-[var(--px-border)]">
                💡 Open in Warpcast for auto-connect
              </div>
            )}
            
            {miniappReady && !availableConnectors.length && (
              <div className="px-4 py-2 text-[9px] text-[var(--px-error)] border-t border-[var(--px-border)]">
                No compatible wallets detected
              </div>
            )}
          </div>
        </div>
      )}

      <ErrorDialog
        isOpen={errorOpen}
        onClose={closeError}
        title="Connection Error"
        message={errorMessage}
      />
    </div>
  )
}

/**
 * Wallet icon component (simple colored circles for now)
 */
function WalletIcon({ name }: { name: string }) {
  const getIconColor = () => {
    const lower = name.toLowerCase()
    if (lower.includes('farcaster')) return '#8A63D2'
    if (lower.includes('coinbase')) return '#0052FF'
    if (lower.includes('metamask')) return '#F6851B'
    if (lower.includes('walletconnect')) return '#3B99FC'
    return '#888'
  }
  
  return (
    <div 
      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
      style={{ backgroundColor: getIconColor() }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

/**
 * Format address for display (0x1234...5678)
 */
function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/**
 * Normalize connection errors (ignore cancel/connector not found)
 * Based on Coinbase MCP error handling best practices
 */
function normalizeConnectError(error: unknown): string | null {
  if (!error) return null
  
  // Ignore user cancellations
  const ignoredErrors = [
    'CancelError',
    'ConnectorNotFoundError', 
    'InternalError',
    'UserRejectedRequestError',
    'User rejected',
    'User denied',
  ]
  
  const errorName = (error as any)?.name || ''
  const errorMessage = (error as any)?.message || ''
  
  for (const ignored of ignoredErrors) {
    if (errorName.includes(ignored) || errorMessage.includes(ignored)) {
      return null
    }
  }
  
  // Extract readable message
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  
  if (typeof error === 'object') {
    const tryRead = (fn: () => unknown) => {
      try {
        const value = fn()
        return typeof value === 'string' && value.length > 0 ? value : undefined
      } catch {
        return undefined
      }
    }
    
    const message = 
      tryRead(() => (error as any).shortMessage) ??
      tryRead(() => (error as any).message) ??
      tryRead(() => (error as any).data?.message)
    
    if (message) return message
  }
  
  return 'Unable to connect. Please try again.'
}

// WalletButton JSX - ErrorDialog component will be added at end of return
