'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider as WagmiProviderBase } from 'wagmi'
import { useEffect, type ReactNode } from 'react'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'viem/chains'
import { wagmiConfig } from '@/lib/wagmi'
import { initWebVitals } from '@/lib/web-vitals'
import { initPerformanceMonitoring } from '@/lib/performance-monitor'

// Create QueryClient outside component to avoid recreating on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * WagmiProvider - Wagmi + React Query + OnchainKit Provider
 * 
 * Reused from old foundation (100% working)
 * Wraps app with wagmi, react-query, and OnchainKit providers
 * 
 * CRITICAL: Must wrap all pages that use wagmi hooks (useAccount, useWriteContract, etc.)
 * 
 * FIX: QueryClient created outside component, SSR support enabled in wagmi config
 */
export function WagmiProvider({ children }: { children: ReactNode }) {
  // Initialize performance monitoring only on client
  useEffect(() => {
    initWebVitals()
    initPerformanceMonitoring()
  }, [])

  // OnchainKit config
  const apiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY

  return (
    <WagmiProviderBase config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
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
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProviderBase>
  )
}
