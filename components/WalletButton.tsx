'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { probeMiniappReady } from '@/lib/miniapp/miniappEnv'
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
  const triedAutoRef = useRef(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Available connectors (filter by readiness)
  const availableConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      if (typeof connector.ready === 'boolean') return connector.ready
      return true
    })
  }, [connectors])

  // Auto-connect in Farcaster Mini App
  useEffect(() => {
    if (triedAutoRef.current) return
    if (isConnected || !availableConnectors.length) return
    
    // Only auto-connect Farcaster if detected in miniapp context
    if (!miniappReady) return
    
    const farcaster = availableConnectors.find(
      (c: any) =>
        c?.id?.toString?.().toLowerCase().includes('farcaster') ||
        c?.name?.toLowerCase?.().includes('farcaster'),
    )
    
    if (!farcaster) return
    if (typeof farcaster.ready === 'boolean' && !farcaster.ready) return
    
    triedAutoRef.current = true
    setConnectingId('auto')
    
    // Defer to avoid blocking first paint (MCP best practice)
    setTimeout(async () => {
      try {
        if (connectAsync) {
          await connectAsync({ connector: farcaster })
        } else {
          connect({ connector: farcaster })
        }
      } catch (err) {
        console.warn('[WalletButton] Auto-connect failed:', err)
        setConnectingId(null)
      }
    }, 0)
  }, [isConnected, availableConnectors, connect, connectAsync])

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
      
      if (connectAsync) {
        await connectAsync({ connector })
      } else {
        connect({ connector })
      }
      
      // Connection success shown in button UI state
    } catch (err: any) {
      console.error('[WalletButton] Failed to connect:', err)
      
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
