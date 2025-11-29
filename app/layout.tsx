import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { DM_Sans } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import type { ReactNode } from 'react'
import favicon from '@/assets/images/favicon.ico'
import ProvidersWrapper from '../components/ProvidersWrapper'
import { MiniappReady } from '@/components/MiniappReady'
import './globals.css'

// Import Gmeow font from app/fonts (preserving from original foundation)
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

// DM Sans font for body text
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const baseUrl = process.env.MAIN_URL || 'https://gmeowhq.art'

// MCP-compliant viewport configuration for Farcaster miniapp embedding
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5, // Allow up to 5x zoom for accessibility
  userScalable: true, // CRITICAL: Enable pinch-zoom for accessibility
  viewportFit: 'cover', // CRITICAL: Enable safe-area-inset-* CSS env() variables
}

// Farcaster embed config
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

// Farcaster frame config
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
  title: {
    default: 'Gmeowbased — Multi-Chain Quest Game',
    template: '%s | Gmeowbased',
  },
  description:
    'Join the epic Gmeowbased! Daily GM rituals, cross-chain quests, guild battles, and prestige rewards across Base, Celo, Optimism, Unichain, and Ink.',
  icons: {
    icon: favicon.src,
  },
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
    // Farcaster card metadata
    'farcaster:card': 'wide',
    'farcaster:title': 'Gmeowbased — Quest & Conquer',
    'farcaster:description':
      'Embark on Gmeowbased! Daily GM streaks, epic quests, guild battles, and multi-chain rewards await.',
    'farcaster:site': '@0xheycat',
    'farcaster:creator': '@0xheycat',
    'farcaster:image': `${baseUrl}/logo.png`,
    // Miniapp metadata (CRITICAL for Farcaster embedding)
    'fc:miniapp': JSON.stringify(gmEmbed),
    'fc:miniapp:frame': JSON.stringify(gmFrame),
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${gmeowFont.variable} ${dmSans.variable}`}>
      <head>
        {/* Farcaster frame metadata (CRITICAL) */}
        <meta name="fc:frame" content={JSON.stringify(gmFrame)} />
        {/* Tailwick theme initialization (prevents FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var config = JSON.parse(localStorage.getItem('__GMEOWBASED_LAYOUT_CONFIG__') || '{}');
                  var theme = config.theme || 'dark';
                  if (theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="absolute left-4 top-4 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition focus:translate-y-0"
        >
          Skip to main content
        </a>
        
        {/* Next.js top loader */}
        <NextTopLoader showSpinner={false} color="var(--color-primary)" />
        
        {/* Main content with providers */}
        <ProvidersWrapper>
          <MiniappReady />
          <main id="main-content">{children}</main>
        </ProvidersWrapper>
      </body>
    </html>
  )
}
