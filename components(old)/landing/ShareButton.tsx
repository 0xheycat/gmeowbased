/**
 * ShareButton Component - Gmeowbased Landing Page
 * Enables sharing as Farcaster frame or via social media
 * Client Component - handles user interactions
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'

export function ShareButton() {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const shareUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://gmeowhq.art'

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleShareFarcaster = () => {
    const text = encodeURIComponent('Check out Gmeowbased Adventure! 🎮 Multi-chain quest game on Base, Celo, Optimism, Unichain & Ink.')
    const url = encodeURIComponent(shareUrl)
    window.open(`https://warpcast.com/~/compose?text=${text}&embeds[]=${url}`, '_blank')
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent('Check out Gmeowbased Adventure! 🎮 Multi-chain quest game where your daily GM matters.')
    const url = encodeURIComponent(shareUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="min-h-[44px] rounded-xl bg-purple-700 hover:bg-purple-600 px-8 py-3 text-base font-semibold transition-all flex items-center gap-2"
      >
        <Image
          src="/assets/icons/Share Icon.svg"
          alt="Share"
          width={20}
          height={20}
          className="w-5 h-5"
        />
        Share
      </button>

      {showMenu && (
        <div className="absolute top-full mt-2 right-0 bg-purple-900 border border-purple-700 rounded-xl shadow-xl overflow-hidden min-w-[200px] z-10">
          <button
            onClick={handleShareFarcaster}
            className="w-full px-4 py-3 text-left hover:bg-purple-800 transition-colors flex items-center gap-3"
          >
            <span className="text-lg">🟣</span>
            <span>Share on Warpcast</span>
          </button>
          
          <button
            onClick={handleShareTwitter}
            className="w-full px-4 py-3 text-left hover:bg-purple-800 transition-colors flex items-center gap-3"
          >
            <span className="text-lg">🐦</span>
            <span>Share on Twitter</span>
          </button>
          
          <button
            onClick={handleCopyLink}
            className="w-full px-4 py-3 text-left hover:bg-purple-800 transition-colors flex items-center gap-3"
          >
            <Image
              src="/assets/icons/Link Icon.svg"
              alt="Copy"
              width={18}
              height={18}
              className="w-4.5 h-4.5"
            />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
