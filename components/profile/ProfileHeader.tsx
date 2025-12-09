'use client'

/**
 * ProfileHeader Component
 * 
 * Template Strategy: trezoadmin-41 (card structure) + gmeowbased0.6 (wallet copy)
 * Adaptation: 30%
 * Platform Reference: Twitter/X profile header
 * 
 * Features:
 * - Cover image with gradient overlay
 * - Avatar with Base badge
 * - Display name + @username + FID badge
 * - Bio (150 char max)
 * - Wallet address with copy button
 * - Social links (Warpcast, Twitter, GitHub, website)
 * - Edit profile button (owner only)
 * 
 * Data Sources:
 * - ProfileData from lib/profile/profile-service.ts
 * - User context for ownership check
 * 
 * @module components/profile/ProfileHeader
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { copyToClipboardSafe } from '@/lib/share'
import type { ProfileData } from '@/lib/profile/types'

// Icons from components/icons
import { ExternalLink } from '@/components/icons/external-link'
import CheckIcon from '@/components/icons/check-icon'
import XIcon from '@/components/icons/x-icon'

interface ProfileHeaderProps {
  profile: ProfileData
  isOwner?: boolean
  onEditClick?: () => void
}

export function ProfileHeader({ profile, isOwner = false, onEditClick }: ProfileHeaderProps) {
  const [copyStatus, setCopyStatus] = useState(false)

  const handleCopyAddress = async () => {
    const success = await copyToClipboardSafe(profile.wallet.address)
    if (success) {
      setCopyStatus(true)
      setTimeout(() => setCopyStatus(false), 2500)
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="bg-white dark:bg-[#0c1427] rounded-lg overflow-hidden shadow-sm">
      {/* Cover Image Section */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
        {profile.cover_image_url ? (
          <Image
            src={profile.cover_image_url}
            alt="Profile cover"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
        )}
        
        {/* Edit Button (owner only) */}
        {isOwner && (
          <button
            onClick={onEditClick}
            className="absolute top-4 right-4 px-4 py-2 min-h-[44px] bg-white dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors shadow-sm"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="relative -mt-16 mb-4">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-[#0c1427] bg-gray-200 dark:bg-gray-700">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  width={128}
                  height={128}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Base Badge */}
            <div className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full border-4 border-white dark:border-[#0c1427] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7V12C2 16.97 5.5 21.47 10 22.5V14H14V22.5C18.5 21.47 22 16.97 22 12V7L12 2Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Name & Username */}
        <div className="mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {profile.display_name}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base text-gray-500 dark:text-gray-400">
              @{profile.username}
            </p>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
              FID {profile.fid}
            </span>
            
            {/* Neynar Tier Badge */}
            {profile.neynar_tier && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.neynar_tier === 'mythic' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                  profile.neynar_tier === 'legendary' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                  profile.neynar_tier === 'epic' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                  profile.neynar_tier === 'rare' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                  'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                }`}>
                  {profile.neynar_tier.charAt(0).toUpperCase() + profile.neynar_tier.slice(1)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-base text-gray-700 dark:text-gray-300 mb-4 max-w-2xl">
            {profile.bio}
          </p>
        )}

        {/* Wallet Address */}
        <div className="mb-4">
          <button
            onClick={handleCopyAddress}
            className="inline-flex items-center gap-2 px-3 py-2 min-h-[44px] bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors group"
          >
            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {formatAddress(profile.wallet.address)}
            </span>
            {copyStatus ? (
              <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
              <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
          {profile.wallet.ens_name && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({profile.wallet.ens_name})
            </span>
          )}
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Warpcast */}
          {profile.social_links.warpcast && (
            <Link
              href={profile.social_links.warpcast}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.1 3H3.9C3.4 3 3 3.4 3 3.9V20.1C3 20.6 3.4 21 3.9 21H20.1C20.6 21 21 20.6 21 20.1V3.9C21 3.4 20.6 3 20.1 3ZM12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17Z" />
              </svg>
              Warpcast
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {/* Twitter */}
          {profile.social_links.twitter && (
            <Link
              href={profile.social_links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors text-sm font-medium"
            >
              <XIcon className="w-4 h-4" />
              Twitter
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {/* GitHub */}
          {profile.social_links.github && (
            <Link
              href={profile.social_links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12C2 16.42 4.865 20.17 8.839 21.49C9.339 21.58 9.52 21.27 9.52 21C9.52 20.77 9.511 20.14 9.507 19.31C6.726 19.91 6.139 17.77 6.139 17.77C5.685 16.61 5.029 16.3 5.029 16.3C4.121 15.68 5.098 15.69 5.098 15.69C6.101 15.76 6.629 16.73 6.629 16.73C7.521 18.26 8.97 17.82 9.539 17.56C9.631 16.91 9.889 16.47 10.175 16.22C7.955 15.97 5.62 15.11 5.62 11.19C5.62 10.09 6.01 9.19 6.649 8.49C6.546 8.24 6.203 7.23 6.747 5.85C6.747 5.85 7.586 5.58 9.497 6.87C10.31 6.65 11.16 6.54 12.01 6.54C12.86 6.54 13.71 6.65 14.527 6.87C16.437 5.58 17.274 5.85 17.274 5.85C17.819 7.23 17.476 8.24 17.373 8.49C18.013 9.19 18.4 10.09 18.4 11.19C18.4 15.12 16.061 15.97 13.835 16.22C14.189 16.53 14.515 17.15 14.515 18.09C14.515 19.43 14.505 20.5 14.505 20.84C14.505 21.11 14.683 21.42 15.191 21.31C19.165 20.17 22 16.42 22 12C22 6.477 17.523 2 12 2Z" />
              </svg>
              GitHub
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          {/* Website */}
          {profile.social_links.website && (
            <Link
              href={profile.social_links.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              Website
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Member Since */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Member since {new Date(profile.stats.member_since).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
