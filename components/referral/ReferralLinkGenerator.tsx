/**
 * ReferralLinkGenerator Component
 * 
 * Purpose: Generate shareable referral links with QR codes and social sharing
 * Template: music forms (30%) + gmeowbased0.6 share patterns (15%)
 * 
 * Features:
 * - Shareable link generation
 * - QR code display
 * - Copy-to-clipboard with feedback
 * - Social share buttons (Twitter, Warpcast)
 * - Mobile-responsive
 * 
 * Usage:
 * <ReferralLinkGenerator code="mycode123" baseUrl="https://gmeowhq.art" />
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ContentCopyIcon, Twitter, CheckCircleIcon, ShareIcon } from '@/components/icons'
import { buildFrameShareUrl, type FrameShareInput } from '@/lib/api/share'

export interface ReferralLinkGeneratorProps {
  /** Referral code */
  code: string
  /** Base URL for the app */
  baseUrl?: string
  /** Custom CSS class */
  className?: string
  /** Show QR code */
  showQR?: boolean
  /** Show social share buttons */
  showSocialShare?: boolean
}

export function ReferralLinkGenerator({
  code,
  baseUrl = 'https://gmeowhq.art',
  className = '',
  showQR = true,
  showSocialShare = true,
}: ReferralLinkGeneratorProps) {
  const [copied, setCopied] = useState(false)

  // Generate referral link
  const referralLink = useMemo(() => {
    return `${baseUrl}/join?ref=${encodeURIComponent(code)}`
  }, [code, baseUrl])

  // Generate frame share URL for Farcaster with proper OG tags
  const frameShareUrl = useMemo(() => {
    return buildFrameShareUrl({ type: 'referral', referral: code }, baseUrl)
  }, [code, baseUrl])

  // Social share URLs
  const twitterShareUrl = useMemo(() => {
    const text = `Join me on Gmeowbased! Use my referral code: ${code}`
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`
  }, [code, referralLink])

  // Warpcast share URL with frame metadata
  const warpcastShareUrl = useMemo(() => {
    // Share the frame URL which includes OG tags for Farcaster preview
    const text = `Join me on Gmeowbased! Use my referral code: ${code}`
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}\n${encodeURIComponent(frameShareUrl)}`
  }, [code, frameShareUrl])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [referralLink])

  // Share via Web Share API (mobile)
  const handleNativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      handleCopy()
      return
    }

    try {
      await navigator.share({
        title: 'Join Gmeowbased',
        text: `Use my referral code: ${code}`,
        url: referralLink,
      })
    } catch (error) {
      // User cancelled or error - fallback to copy
      if ((error as Error).name !== 'AbortError') {
        handleCopy()
      }
    }
  }, [code, referralLink, handleCopy])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Referral Link Display */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/80">
          Your referral link
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="
              flex-1 px-4 py-3 rounded-xl
              bg-white/5 border border-white/10
              text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              select-all
            "
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`
              px-4 py-3 min-h-[44px] min-w-[44px] rounded-xl font-semibold
              transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none
              ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }
            `}
            aria-label="Copy link"
          >
            {copied ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <ContentCopyIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        {copied && (
          <p className="text-xs text-green-400">Link copied to clipboard!</p>
        )}
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">
            QR Code
          </label>
          <div className="flex justify-center p-6 rounded-xl bg-white border border-white/10">
            <div className="rounded-lg overflow-hidden">
              <QRCodeSVG
                value={referralLink}
                size={200}
                level="M"
                includeMargin
              />
            </div>
          </div>
          <p className="text-xs text-white/50 text-center">
            Scan to visit your referral link
          </p>
        </div>
      )}

      {/* Social Share Buttons */}
      {showSocialShare && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">
            Share on social media
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Twitter */}
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center justify-center gap-2
                px-4 py-3 rounded-xl
                bg-[#1DA1F2] hover:bg-[#1a8cd8]
                text-white font-semibold
                transition-colors duration-200
              "
            >
              <Twitter className="h-5 w-5" />
              <span>Twitter</span>
            </a>

            {/* Warpcast - with Frame Preview */}
            <a
              href={warpcastShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex items-center justify-center gap-2
                px-4 py-3 rounded-xl
                bg-[#8A63D2] hover:bg-[#7851c4]
                text-white font-semibold
                transition-colors duration-200
                ring-2 ring-purple-400/50
              "
              title="Share with interactive frame preview on Farcaster feed"
            >
              <ShareIcon className="h-5 w-5" />
              <span>Warpcast</span>
            </a>

            {/* Native Share (Mobile) */}
            {typeof window !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="
                  flex items-center justify-center gap-2
                  px-4 py-3 min-h-[44px] rounded-xl
                  bg-white/10 hover:bg-white/20
                  text-white font-semibold
                  transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none
                "
              >
                <ShareIcon className="h-5 w-5" />
                <span>Share</span>
              </button>
            )}
          </div>
          <p className="text-xs text-purple-300/70">
            💡 Tip: Warpcast share shows an interactive frame preview in the feed - easier for friends to join!
          </p>
        </div>
      )}

      {/* Stats Preview (optional) */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <div className="text-sm text-white/60 mb-2">Referral rewards</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-white/80">You earn:</span>
            <span className="text-white font-semibold">50 points</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/80">Your friend earns:</span>
            <span className="text-white font-semibold">25 points</span>
          </div>
        </div>
      </div>
    </div>
  )
}
