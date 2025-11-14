import type { Metadata } from 'next'
import './globals.css'
import './styles.css'
import './styles/quest-card.css'
import './styles/mega-intro.css'
import { MiniAppProvider } from './providers'
import type { ReactNode } from 'react'
import { GmeowLayout } from '@/components/layout/gmeow/GmeowLayout'

const baseUrl = process.env.MAIN_URL || 'https://gmeowhq.art'

const gmEmbed = {
  version: '1',
  imageUrl: `${baseUrl}/gmeow.gif`,
  button: {
    title: '✨ Enter Gmeow',
    action: {
      type: 'launch_miniapp',
      name: 'GMeow',
      url: baseUrl,
      splashImageUrl: `${baseUrl}/gmeow.gif`,
      splashBackgroundColor: '#0B0A16',
    },
  },
}

const gmFrame = {
  version: 'next',
  imageUrl: `${baseUrl}/gmeow.gif`,
  buttons: [
    {
      title: 'Launch Miniapp',
      action: {
        type: 'launch_miniapp',
        name: 'GMeow',
        url: baseUrl,
      },
    },
    {
      title: 'View Dashboard',
      action: {
        type: 'link',
        url: `${baseUrl}/Dashboard`,
      },
    },
  ],
  postUrl: `${baseUrl}/api/frame`,
  splashBackgroundColor: '#0B0A16',
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Gmeow Adventure — Multi-Chain Quest Game',
  description:
    'Join the epic Gmeow Adventure! Daily GM rituals, cross-chain quests, guild battles, and prestige rewards across Base, Celo, Optimism, Unichain, and Ink.',
  openGraph: {
    title: 'Gmeow Adventure — Multi-Chain Quest Game',
    description:
      'Begin your Gmeow Adventure! Conquer daily GM streaks, complete cross-chain quests, join guilds, and earn exclusive rewards.',
    type: 'website',
    siteName: 'GMeow Adventure',
    images: [{ url: `${baseUrl}/logo.png`, width: 1024, height: 1024, alt: 'Gmeow Adventure Crest' }],
    url: baseUrl,
  },
  robots: { index: true, follow: true },
  other: {
    'farcaster:card': 'wide',
    'farcaster:title': 'Gmeow Adventure — Quest & Conquer',
    'farcaster:description':
      'Embark on the Gmeow Adventure! Daily GM streaks, epic quests, guild battles, and multi-chain rewards await.',
    'farcaster:site': '@0xheycat',
    'farcaster:creator': '@0xheycat',
    'farcaster:image': `${baseUrl}/logo.png`,
    'fc:miniapp': JSON.stringify(gmEmbed),
    'fc:miniapp:frame': JSON.stringify(gmFrame),
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen pixel-page" style={{ color: 'var(--text-color)' }}>
        <MiniAppProvider>
          <GmeowLayout>{children}</GmeowLayout>
        </MiniAppProvider>
      </body>
    </html>
  )
}