import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { MiniAppProvider } from './providers'
import type { ReactNode } from 'react'
import { GmeowLayout } from '@/components/layout/gmeow/GmeowLayout'

// Category 11 Frame Fix: Import Gmeow font from app/fonts (deleted from public/fonts in 419276f)
const gmeowFont = localFont({
  src: [
    {
      path: './fonts/gmeow.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/gmeow.woff',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-gmeow',
  display: 'swap',
})

const baseUrl = process.env.MAIN_URL || 'https://gmeowhq.art'

// MCP-compliant viewport configuration for miniapp embedding
// Updated for mobile accessibility: allow zoom for users who need it
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5, // Allow up to 5x zoom for accessibility
  userScalable: true, // CRITICAL: Enable pinch-zoom for accessibility
  viewportFit: 'cover', // CRITICAL: Enable safe-area-inset-* CSS env() variables
}

const gmEmbed = {
  version: '1',
  imageUrl: `${baseUrl}/og-image.png`,
  button: {
    title: '✨ Enter Gmeow',
    action: {
      type: 'link',
      url: baseUrl,
    },
  },
}

const gmFrame = {
  version: 'next',
  imageUrl: `${baseUrl}/frame-image.png`,
  button: {
    title: '🎮 Launch Game',
    action: {
      type: 'launch_frame',
      name: 'Gmeowbased Adventure',
      url: baseUrl,
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#000000',
    },
  },
}

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
    'fc:miniapp': JSON.stringify(gmEmbed),
    'fc:miniapp:frame': JSON.stringify(gmFrame),
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={gmeowFont.variable}>
      <head>
        <meta name="fc:frame" content={JSON.stringify(gmFrame)} />
      </head>
      <body className="min-h-screen pixel-page" style={{ color: 'var(--text-color)' }}>
        <a
          href="#main-content"
          className="absolute left-4 top-4 z-50 -translate-y-24 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 dark:text-white transition focus:translate-y-0"
        >
          Skip to main content
        </a>
        <MiniAppProvider>
          <GmeowLayout>{children}</GmeowLayout>
        </MiniAppProvider>
      </body>
    </html>
  )
}