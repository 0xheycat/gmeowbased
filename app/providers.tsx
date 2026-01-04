'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useState, useEffect } from 'react'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'viem/chains'
import { ApolloProvider } from '@apollo/client'

import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LayoutModeProvider } from '@/components/ui/layout-mode-context'
import { LiveEventBridge } from '@/components/ui/LiveEventBridge'
import { wagmiAdapter } from '@/lib/integrations/appkit-config'
import AppKitProvider from '@/components/providers/AppKitProvider'
import { MiniappReady } from '@/components/MiniappReady'
import { initWebVitals, initPerformanceMonitoring } from '@/lib/utils/performance'
import { getMiniappContext } from '@/lib/miniapp/miniappEnv'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { getApolloClient } from '@/lib/apollo-client'

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [miniappChecked, setMiniappChecked] = useState(false)

  // Initialize performance monitoring
  useEffect(() => {
    initWebVitals()
    initPerformanceMonitoring()
  }, [])

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
    
    // Aggressive 1.5s fallback - if SDK doesn't respond quickly, proceed anyway
    // The app works fine without SDK initialization
    const fallbackTimer = setTimeout(() => {
      if (mounted && !miniappChecked) {
        console.warn('[MiniAppProvider] ⚠️ Fallback timeout (1.5s) - proceeding without waiting for SDK')
        setMiniappChecked(true)
      }
    }, 1500)
    
    return () => {
      mounted = false
      window.removeEventListener('miniapp:ready', handleMiniappReady as EventListener)
      clearTimeout(fallbackTimer)
    }
  }, [miniappChecked])

  // Load miniapp context on mount (for logging/debugging)
  useEffect(() => {
    let mounted = true

    const loadContext = async () => {
      try {
        const context = await getMiniappContext()
        
        if (mounted && !context) {
          // Not in miniapp context, silent failure
        }
      } catch (error) {
        console.error('[MiniAppProvider] Error loading context:', error)
      }
    }

    loadContext()

    return () => {
      mounted = false
    }
  }, [])

  // OnchainKit config with miniapp support
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY

  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AppKitProvider>
            <ApolloProvider client={getApolloClient()}>
              <OnchainKitProvider
                chain={base}
                apiKey={apiKey}
                config={{
                  appearance: {
                    mode: 'dark',
                    theme: 'base',
                  },
                }}
              >
                <LayoutModeProvider>
                  <MiniappReady />
                  {/* Show loading overlay if we're checking miniapp status */}
                  {!miniappChecked && typeof window !== 'undefined' && window.self !== window.top && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#060720]/95 backdrop-blur-lg">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-100/5 dark:bg-white/5 shadow-[0_24px_80px_rgba(12,13,54,0.45)]">
                          <div className="absolute inset-0 rounded-3xl border border-slate-200 dark:border-slate-700/10" />
                          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white dark:border-slate-700/20 border-t-[#fdbb2d]" />
                        </div>
                        <div>
                          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Connecting to Farcaster...</h1>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Initializing miniapp environment
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Phase 1.5: Unified auth wraps entire app */}
                  <AuthProvider>
                    <LiveEventBridge />
                    {children}
                  </AuthProvider>
                </LayoutModeProvider>
              </OnchainKitProvider>
            </ApolloProvider>
          </AppKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}