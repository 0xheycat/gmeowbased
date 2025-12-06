'use client'

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, mainnet, optimism, arbitrum, type AppKitNetwork } from '@reown/appkit/networks'

// Get WalletConnect project ID from environment
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

if (!projectId) {
  console.warn('⚠️ Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID - wallet connection may not work')
}

// App metadata for WalletConnect
export const metadata = {
  name: 'Gmeow Adventure',
  description: 'Community-driven quest platform on Base',
  url: 'https://gmeowhq.art',
  icons: ['https://gmeowhq.art/logo.png'],
}

// Networks supported by the app (must be AppKitNetwork type)
// NOTE: Primary chain is Base (8453) - matches our contract deployment
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  base,        // Primary chain for quests, badges, points
  mainnet,     // Ethereum mainnet support
  optimism,    // L2 support
  arbitrum,    // L2 support
]

// Wagmi adapter for AppKit
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true, // Enable server-side rendering support
})

// AppKit configuration
export const appkitConfig = {
  adapters: [wagmiAdapter],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true, // Enable WalletConnect analytics
    // Note: email, socials, swaps are managed via dashboard.reown.com
    // Local config is ignored when remote config is available
  },
  themeMode: 'dark' as const, // Match our app theme
  themeVariables: {
    '--w3m-font-family': 'var(--font-geist-sans)',
    '--w3m-accent': '#fdbb2d', // Match our brand gradient
    '--w3m-border-radius-master': '12px',
  },
}
