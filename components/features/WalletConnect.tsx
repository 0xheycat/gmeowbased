'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/tailwick-primitives'
import Image from 'next/image'

/**
 * WalletConnect Component
 * Reuses logic from old foundation (backups/pre-migration-20251126-213424/components/ConnectWallet.tsx)
 * with new Tailwick v2.0 UI components
 * 
 * Features:
 * - Auto-connect for Farcaster miniapp
 * - Multi-connector support
 * - Compact profile dropdown display
 * - Proper error handling
 */

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectAsync, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [showConnectors, setShowConnectors] = useState(false)
  const triedAutoRef = useRef(false)

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
    
    const farcaster = availableConnectors.find(
      (c: any) =>
        c?.id?.toString?.().toLowerCase().includes('farcaster') ||
        c?.name?.toLowerCase?.().includes('farcaster'),
    ) || availableConnectors[0]
    
    if (!farcaster) return
    if (typeof farcaster.ready === 'boolean' && !farcaster.ready) return
    
    triedAutoRef.current = true
    setConnectingId('auto')
    
    setTimeout(async () => {
      try {
        if (connectAsync) {
          await connectAsync({ connector: farcaster })
        } else {
          connect({ connector: farcaster })
        }
      } catch {
        setConnectingId(null)
      }
    }, 100)
  }, [isConnected, availableConnectors, connect, connectAsync])

  const handleConnect = async (connector: any) => {
    if (typeof connector?.ready === 'boolean' && !connector.ready) {
      return
    }
    
    try {
      setConnectingId(connector?.id || connector?.name || 'wallet')
      
      if (connectAsync) {
        await connectAsync({ connector })
      } else {
        connect({ connector })
      }
    } catch (err) {
      console.error('Failed to connect:', err)
      setConnectingId(null)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowConnectors(false)
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Connected state - show in profile dropdown
  if (isConnected && address) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="flex-1">
            <div className="text-xs theme-text-secondary">Wallet Connected</div>
            <div className="text-sm font-mono font-semibold text-white">{formatAddress(address)}</div>
          </div>
        </div>
        <Button 
          variant="danger" 
          size="sm" 
          onClick={handleDisconnect}
          className="w-full"
        >
          Disconnect Wallet
        </Button>
      </div>
    )
  }

  // Disconnected state
  return (
    <div className="space-y-2">
      {!showConnectors ? (
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setShowConnectors(true)}
          className="w-full"
          disabled={!!connectingId}
        >
          {connectingId === 'auto' ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      ) : (
        <div className="space-y-2">
          {availableConnectors.map((connector) => (
            <Button
              key={connector.id}
              variant="ghost"
              size="sm"
              onClick={() => handleConnect(connector)}
              disabled={!!connectingId}
              className="w-full justify-start"
            >
              {connectingId === connector.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Image 
                    src={`/assets/gmeow-icons/Wallet Icon.svg`} 
                    alt={connector.name}
                    width={16}
                    height={16}
                    className="opacity-70"
                  />
                  <span>{connector.name}</span>
                </>
              )}
            </Button>
          ))}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowConnectors(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
