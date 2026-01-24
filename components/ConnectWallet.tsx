'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { probeMiniappReady } from '@/lib/miniapp/miniappEnv'
import { useFarcasterWalletConnect } from '@/lib/hooks/useFarcasterWalletConnect'


export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectAsync, connectors, error: rawConnectError } = useConnect()
  const connectErrorRef = useRef<unknown>(null)
  const [connectError, setConnectError] = useState<unknown>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const triedAutoRef = useRef(false)
  const [miniappReady, setMiniappReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Use the Farcaster wallet auto-connect hook
  useFarcasterWalletConnect()

  useEffect(() => {
    setMounted(true)
    console.log('[ConnectWallet] Component mounted')
  }, [])

  useEffect(() => {
    console.log('[ConnectWallet] connectors updated:', connectors.map((c: any) => ({ id: c?.id, name: c?.name, ready: c?.ready })), 'count:', connectors.length)
  }, [connectors])

  useEffect(() => {
    console.log('[ConnectWallet] miniappReady changed to:', miniappReady)
  }, [miniappReady])

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

  const availableConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      if (typeof connector.ready === 'boolean') return connector.ready
      return true
    })
  }, [connectors])

  // Toast on connect state changes
  useEffect(() => {
    if (isConnected && address) {
      setConnectingId(null)
    }
  }, [isConnected, address])

  useEffect(() => {
    if (!rawConnectError) return
    connectErrorRef.current = rawConnectError
    const normalized = normalizeConnectError(rawConnectError)
    setConnectError(normalized)
  }, [rawConnectError])

  useEffect(() => {
    if (!connectError) return
    setConnectingId(null)
    setConnectError(null)
  }, [connectError])

  // Auto-connect in Farcaster Mini App ONLY (not on web refresh)
  useEffect(() => {
    if (triedAutoRef.current) return
    if (isConnected) return
    
    // CRITICAL: Only auto-connect when in miniapp context
    if (!miniappReady) {
      console.log('[ConnectWallet] Skipping auto-connect: miniapp not ready')
      return
    }

    console.log('[ConnectWallet] miniappReady=true, attempting auto-connect...')
    
    if (!availableConnectors.length) {
      console.log('[ConnectWallet] No available connectors')
      return
    }

    const farcaster = availableConnectors.find(
      (c: any) =>
        c?.id?.toString?.().toLowerCase().includes('farcaster') ||
        c?.name?.toLowerCase?.().includes('farcaster'),
    )

    if (!farcaster) {
      console.warn('[ConnectWallet] No Farcaster connector found. Available:', availableConnectors.map((c: any) => ({ id: c?.id, name: c?.name })))
      console.warn('[ConnectWallet] Farcaster auto-connect handled by useFarcasterWalletConnect hook')
      return
    }

    setRetryCount(0)
    console.log('[ConnectWallet] Found Farcaster connector:', { id: farcaster?.id, name: farcaster?.name })
    
    if (typeof farcaster.ready === 'boolean' && !farcaster.ready) {
      console.warn('[ConnectWallet] Farcaster connector not ready:', farcaster.ready)
      return
    }

    triedAutoRef.current = true
    setConnectingId('auto')
    console.log('[ConnectWallet] Starting auto-connect...')
    
    // Defer to avoid blocking first paint
    setTimeout(async () => {
      try {
        console.log('[ConnectWallet] Calling connectAsync/connect for Farcaster')
        if (connectAsync) {
          console.log('[ConnectWallet] Using connectAsync')
          await connectAsync({ connector: farcaster })
        } else {
          console.log('[ConnectWallet] Using sync connect')
          connect({ connector: farcaster })
        }
        console.log('[ConnectWallet] Auto-connect call completed')
      } catch (err) {
        console.error('[ConnectWallet] Auto-connect failed:', err)
        setConnectingId(null)
      }
    }, 100)
  }, [isConnected, availableConnectors, connect, connectAsync, miniappReady, retryCount])

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
    } catch (err: any) {
      console.error('Failed to connect:', err?.message || String(err))
      setConnectingId(null)
    }
  }

  if (isConnected) {
    return (
      <div className="relative site-font">
        <span className="pixel-pill">✅ {formatAddress(address!)} Connected</span>
      </div>
    )
  }

  // Simple fallback button (keeps your list, but the first is usually Farcaster in miniapps)
  return (
    <div className="relative w-full site-font">
      {!mounted ? (
        // Server/initial render - show loading state
        <div className="grid grid-cols-1 gap-2 w-full">
          <button
            type="button"
            disabled
            className="pixel-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Loading...
          </button>
        </div>
      ) : (
        // Client render - show actual connectors
        <div className="grid grid-cols-1 gap-2 w-full">
          {availableConnectors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleConnect(c)}
              disabled={!!connectingId}
              className="pixel-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectingId === c.id || connectingId === 'auto'
                ? `Connecting ${c.name}…`
                : `Connect ${c.name}`}
            </button>
          ))}
          {!miniappReady && (
            <p className="text-[11px] text-[var(--px-sub)] text-center">
              Wallet connection is available when this experience runs inside Warpcast.
            </p>
          )}
          {miniappReady && !availableConnectors.length && (
            <p className="text-[11px] text-[var(--px-sub)] text-center">
              No compatible wallets detected in this environment.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function normalizeConnectError(error: unknown): unknown {
  if (!error) return null
  if (typeof error !== 'object') return error

  const ignored = ['CancelError', 'ConnectorNotFoundError', 'InternalError', 'RpcResponse.InternalErrorError']
  const name = (error as any)?.name
  if (typeof name === 'string' && ignored.includes(name)) return null

  if ((error as any)?.error === void 0) {
    if (typeof (error as any)?.message === 'undefined') {
      return { message: String(error), name }
    }
  }

  return error
}

function getConnectErrorMessage(error: unknown): string {
  if (!error) return 'Unable to connect. Please try again.'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message || 'Unable to connect. Please try again.'

  if (typeof error === 'object') {
    const tryRead = (fn: () => unknown) => {
      try {
        const value = fn()
        return typeof value === 'string' && value.length > 0 ? value : undefined
      } catch {
        return undefined
      }
    }

    const maybeMessage =
      tryRead(() => (error as any).shortMessage) ??
      tryRead(() => (error as any).message) ??
      tryRead(() => (error as any).data?.message) ??
      tryRead(() => (error as any).error?.message)

    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage
    }

    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') return serialized
    } catch {
      // ignore serialization errors
    }
  }

  return 'Unable to connect. Please try again.'
}