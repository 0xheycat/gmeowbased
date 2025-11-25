import React from 'react'
import { useRouter } from 'next/router'

const config = {
  logo: (
    <span className="flex items-center gap-2">
      <span className="text-2xl">🐱</span>
      <strong>GMEOWBASED Docs</strong>
    </span>
  ),
  
  project: {
    link: 'https://github.com/0xheycat/gmeowbased'
  },
  
  chat: {
    link: 'https://warpcast.com/gmeowbased'
  },
  
  docsRepositoryBase: 'https://github.com/0xheycat/gmeowbased/tree/main/docs',
  
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{' '}
        <a href="https://gmeow.art" target="_blank" rel="noopener noreferrer">
          GMEOWBASED
        </a>
        {' • '}
        <a href="https://warpcast.com/gmeowbased" target="_blank" rel="noopener noreferrer">
          Farcaster
        </a>
        {' • '}
        <a href="https://base.org" target="_blank" rel="noopener noreferrer">
          Built on Base
        </a>
      </span>
    )
  },
  
  head: function Head() {
    const { asPath, defaultLocale, locale } = useRouter()
    const url =
      'https://docs.gmeow.art' +
      (defaultLocale === locale ? asPath : `/${locale}${asPath}`)
    
    return (
      <>
        <meta property="og:url" content={url} />
        <meta property="og:title" content="GMEOWBASED Documentation" />
        <meta
          property="og:description"
          content="Complete documentation for the GMEOWBASED Farcaster quest and gamification platform"
        />
        <meta property="og:image" content="https://gmeow.art/og-docs.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@gmeowbased" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </>
    )
  },
  
  useNextSeoProps() {
    const { asPath } = useRouter()
    if (asPath !== '/docs') {
      return {
        titleTemplate: '%s – GMEOWBASED Docs'
      }
    }
  },
  
  navigation: {
    prev: true,
    next: true
  },
  
  darkMode: true,
  
  sidebar: {
    titleComponent({ title, type }: { title: string; type: string }) {
      if (type === 'separator') {
        return <div className="font-bold mt-4">{title}</div>
      }
      return <>{title}</>
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },
  
  toc: {
    backToTop: true,
    float: true,
    title: 'On This Page'
  },
  
  editLink: {
    text: 'Edit this page on GitHub →'
  },
  
  feedback: {
    content: 'Question? Give us feedback →',
    labels: 'feedback'
  },
  
  gitTimestamp: ({ timestamp }: { timestamp: Date }) => (
    <>Last updated on {timestamp.toLocaleDateString()}</>
  ),
  
  banner: {
    key: 'nextra-2.0-release',
    text: (
      <a href="https://gmeow.art" target="_blank" rel="noopener noreferrer">
        🎉 GMEOWBASED is live on Base! Start earning XP →
      </a>
    )
  },
  
  primaryHue: 280, // Purple hue for GMEOW branding
  primarySaturation: 80
}

export default config
