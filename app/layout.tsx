import type { Metadata } from 'next'
import './globals.css'
import './styles.css'
import './styles/quest-card.css'
import './styles/mobile-miniapp.css'
import { MiniAppProvider } from './providers'
import type { ReactNode } from 'react'
import { GmeowLayout } from '@/components/layout/gmeow/GmeowLayout'

const baseUrl = process.env.MAIN_URL || 'https://gmeowhq.art'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Gmeowbased — Multi-Chain Quest Game',
  description:
    'Join the epic Gmeowbased! Daily GM rituals, cross-chain quests, guild battles, and prestige rewards across Base, Celo, Optimism, Unichain, and Ink.',
  openGraph: {
    title: 'Gmeowbased — Multi-Chain Quest Game',
    description:
      'Begin your Gmeowbased! Conquer daily GM streaks, complete cross-chain quests, join guilds, and earn exclusive rewards.',
    type: 'website',
    siteName: 'Gmeowbased',
    images: [{ url: `${baseUrl}/logo.png`, width: 1024, height: 1024, alt: 'Gmeowbased Crest' }],
    url: baseUrl,
  },
  robots: { index: true, follow: true },
  other: {
    'farcaster:card': 'wide',
    'farcaster:title': 'Gmeowbased — Quest & Conquer',
    'farcaster:description':
      'Embark on Gmeowbased! Daily GM streaks, epic quests, guild battles, and multi-chain rewards await.',
    'farcaster:site': '@0xheycat',
    'farcaster:creator': '@0xheycat',
    'farcaster:image': `${baseUrl}/logo.png`,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Legacy Farcaster frame tags (v1 compatibility) */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${baseUrl}/og-image.png`} />
        <meta property="fc:frame:button:1" content="🎮 Launch Game" />
        <meta property="fc:frame:button:1:action" content="launch_frame" />
        <meta property="fc:frame:button:1:target" content={baseUrl} />
        
        {/* Farcaster miniapp frame tags (v2) */}
        <meta property="fc:miniapp:frame" content="vNext" />
        <meta property="fc:miniapp:frame:image" content={`${baseUrl}/og-image.png`} />
        <meta property="fc:miniapp:frame:button:1" content="🎮 Launch Game" />
        <meta property="fc:miniapp:frame:button:1:action" content="launch_frame" />
        <meta property="fc:miniapp:frame:button:1:target" content={baseUrl} />
      </head>
      <body className="min-h-screen pixel-page" style={{ color: 'var(--text-color)' }}>
        <MiniAppProvider>
          <GmeowLayout>{children}</GmeowLayout>
        </MiniAppProvider>
      </body>
    </html>
  )
}