'use client'

/**
 * SocialLinks Component
 * 
 * Template Strategy: gmeowbased0.6/profile-info-view.tsx (socials section)
 * Adaptation: 15%
 * Platform Reference: LinkedIn contact info
 * 
 * Features:
 * - Social media links (Warpcast, Twitter, GitHub, website)
 * - Wallet address display with copy button
 * - ENS name if available
 * - Icon buttons with hover effects
 * - External link indicators
 * 
 * Data Sources:
 * - SocialLinks from ProfileData
 * - Wallet address from ProfileData
 * 
 * @module components/profile/SocialLinks
 */

import { useState } from 'react'
import Link from 'next/link'
import { copyToClipboardSafe } from '@/lib/api/share'
import type { SocialLinks as SocialLinksType, WalletData } from '@/lib/profile/types'

// Icons from components/icons
import { ExternalLink } from '@/components/icons/external-link'
import CheckIcon from '@/components/icons/check-icon'
import XIcon from '@/components/icons/x-icon'

interface SocialLinksProps {
  socialLinks: SocialLinksType
  wallet: WalletData
  className?: string
}

export function SocialLinks({ socialLinks, wallet, className = '' }: SocialLinksProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  const handleCopyAddress = async () => {
    const success = await copyToClipboardSafe(wallet.address)
    if (success) {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Check if any social links exist
  const hasSocialLinks = Boolean(
    socialLinks.warpcast || 
    socialLinks.twitter || 
    socialLinks.github || 
    socialLinks.website
  )

  return (
    <div className={`bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Contact & Social
      </h2>

      <div className="space-y-3">
        {/* Wallet Address */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
            Base Address
          </label>
          <button
            onClick={handleCopyAddress}
            className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7V12C2 16.97 5.5 21.47 10 22.5V14H14V22.5C18.5 21.47 22 16.97 22 12V7L12 2Z" />
                </svg>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                  {formatAddress(wallet.address)}
                </p>
                {wallet.ens_name && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {wallet.ens_name}
                  </p>
                )}
                {wallet.is_verified && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" />
                    </svg>
                    Verified
                  </p>
                )}
              </div>
            </div>
            <div className="ml-2 flex-shrink-0">
              {copyStatus === 'copied' ? (
                <CheckIcon className="w-5 h-5 text-green-500" />
              ) : (
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </div>
          </button>
        </div>

        {/* Social Links */}
        {hasSocialLinks && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
              Social Profiles
            </label>
            <div className="space-y-2">
              {/* Warpcast */}
              {socialLinks.warpcast && (
                <Link
                  href={socialLinks.warpcast}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 min-h-[44px] bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors focus:ring-2 focus:ring-purple-500 focus:outline-none group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.1 3H3.9C3.4 3 3 3.4 3 3.9V20.1C3 20.6 3.4 21 3.9 21H20.1C20.6 21 21 20.6 21 20.1V3.9C21 3.4 20.6 3 20.1 3ZM12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Warpcast
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Farcaster Profile
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                </Link>
              )}

              {/* Twitter */}
              {socialLinks.twitter && (
                <Link
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 min-h-[44px] bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
                      <XIcon className="w-5 h-5 text-white dark:text-black" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Twitter / X
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{socialLinks.twitter.split('/').pop()}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                </Link>
              )}

              {/* GitHub */}
              {socialLinks.github && (
                <Link
                  href={socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 min-h-[44px] bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-500 focus:outline-none group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.477 2 12C2 16.42 4.865 20.17 8.839 21.49C9.339 21.58 9.52 21.27 9.52 21C9.52 20.77 9.511 20.14 9.507 19.31C6.726 19.91 6.139 17.77 6.139 17.77C5.685 16.61 5.029 16.3 5.029 16.3C4.121 15.68 5.098 15.69 5.098 15.69C6.101 15.76 6.629 16.73 6.629 16.73C7.521 18.26 8.97 17.82 9.539 17.56C9.631 16.91 9.889 16.47 10.175 16.22C7.955 15.97 5.62 15.11 5.62 11.19C5.62 10.09 6.01 9.19 6.649 8.49C6.546 8.24 6.203 7.23 6.747 5.85C6.747 5.85 7.586 5.58 9.497 6.87C10.31 6.65 11.16 6.54 12.01 6.54C12.86 6.54 13.71 6.65 14.527 6.87C16.437 5.58 17.274 5.85 17.274 5.85C17.819 7.23 17.476 8.24 17.373 8.49C18.013 9.19 18.4 10.09 18.4 11.19C18.4 15.12 16.061 15.97 13.835 16.22C14.189 16.53 14.515 17.15 14.515 18.09C14.515 19.43 14.505 20.5 14.505 20.84C14.505 21.11 14.683 21.42 15.191 21.31C19.165 20.17 22 16.42 22 12C22 6.477 17.523 2 12 2Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        GitHub
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{socialLinks.github.split('/').pop()}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                </Link>
              )}

              {/* Website */}
              {socialLinks.website && (
                <Link
                  href={socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 min-h-[44px] bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors focus:ring-2 focus:ring-green-500 focus:outline-none group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Website
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {socialLinks.website.replace(/^https?:\/\//,'')}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* No Social Links Message */}
        {!hasSocialLinks && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No social profiles connected
          </p>
        )}
      </div>
    </div>
  )
}
