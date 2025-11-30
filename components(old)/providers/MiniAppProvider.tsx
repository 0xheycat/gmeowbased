'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useState, useEffect } from 'react'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'viem/chains'

// Wagmi config
import { config as wagmiConfig } from '@/lib/wagmi'

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [miniappChecked, setMiniappChecked] = useState(false)

  // Listen for miniapp ready status
  useEffect(() => {
    let mounted = true
    console.log('[MiniAppProvider] Setting up miniapp ready listener...')
    
    const handleMiniappReady = (e: CustomEvent) => {
      if (mounted) {
        console.log('[MiniAppProvider] ✅ Miniapp ready event received:', e.detail)
        setMiniappChecked(true)
      }
    }
    
    window.addEventListener('miniapp:ready', handleMiniappReady as EventListener)
    
    // 1.5s fallback - proceed if SDK doesn't respond
    const fallbackTimer = setTimeout(() => {
      if (mounted && !miniappChecked) {
        console.warn('[MiniAppProvider] ⚠️ Fallback timeout - proceeding without SDK')
        setMiniappChecked(true)
      }
    }, 1500)
    
    return () => {
      mounted = false
      window.removeEventListener('miniapp:ready', handleMiniappReady as EventListener)
      clearTimeout(fallbackTimer)
    }
  }, [miniappChecked])

  // OnchainKit config with miniapp support
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          chain={base}
          apiKey={apiKey}
          config={{
            appearance: {
              mode: 'dark',
              theme: 'base',
            },
            analytics: {
              enabled: false,
            },
          }}
        >
          {/* Show loading overlay in iframe context */}
          {!miniappChecked && typeof window !== 'undefined' && window.self !== window.top && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gradient-to-b from-purple-900 to-black backdrop-blur-lg">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-purple-500/10 shadow-2xl shadow-purple-600/50">
                  <div className="absolute inset-0 rounded-3xl border border-purple-600/30" />
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-400/20 border-t-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white font-gmeow">Connecting to Farcaster...</h1>
                  <p className="mt-2 text-sm text-purple-300">
                    Initializing miniapp environment
                  </p>
                </div>
              </div>
            </div>
          )}
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
