'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Share2, 
  Trophy, 
  Users, 
  Gift, 
  Award, 
  Target,
  Sun,
  CheckCircle,
  TrendingUp,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { buildFrameShareUrl, type FrameShareInput } from '@/lib/api/share'
import { cn } from '@/lib/utils'

/**
 * Frames Gallery Page
 * Route: /frames
 * 
 * Centralized page for users to view and share all their personalized Farcaster frames.
 * Each frame is a shareable OG image with interactive buttons for social engagement.
 * 
 * Available Frames:
 * 1. Badge Collection - Showcase earned badges
 * 2. Leaderboard - User rank and stats
 * 3. Quest Progress - Completed quests
 * 4. Guild Membership - Guild achievements
 * 5. Points Balance - Total points earned
 * 6. GM Streak - Daily GM streak
 * 7. Referral Stats - Referral performance
 * 8. Onchain Stats - Blockchain activity
 * 9. Verify Account - Account verification frame
 * 
 * Features:
 * - Copy frame URL to clipboard
 * - Open frame in new tab for preview
 * - Share directly to Farcaster
 * - Auto-generate personalized URLs with user's FID
 * 
 * @example
 * // User with FID 123456 visits /frames
 * // Each frame URL includes their FID:
 * // /frame/badge/123456
 * // /frame/stats/123456
 */

interface FrameCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  type: FrameShareInput['type']
  requiresParams?: boolean
  buildUrl: (fid: string) => string
}

const FRAME_CARDS: FrameCard[] = [
  {
    id: 'badge',
    title: 'Badge Collection',
    description: 'Showcase your earned badges and achievements',
    icon: <Award className="w-6 h-6" />,
    color: 'from-yellow-500/20 to-orange-500/20',
    type: 'badge',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'badge', fid }),
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    description: 'Share your rank and competitive stats',
    icon: <Trophy className="w-6 h-6" />,
    color: 'from-purple-500/20 to-pink-500/20',
    type: 'leaderboards',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'leaderboards', fid }),
  },
  {
    id: 'points',
    title: 'Points Balance',
    description: 'Display your total points and rewards',
    icon: <Target className="w-6 h-6" />,
    color: 'from-blue-500/20 to-cyan-500/20',
    type: 'points',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'points', fid }),
  },
  {
    id: 'gm',
    title: 'GM Streak',
    description: 'Show off your daily GM streak',
    icon: <Sun className="w-6 h-6" />,
    color: 'from-amber-500/20 to-yellow-500/20',
    type: 'gm',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'gm', fid }),
  },
  {
    id: 'guild',
    title: 'Guild Membership',
    description: 'Share your guild achievements',
    icon: <Users className="w-6 h-6" />,
    color: 'from-green-500/20 to-emerald-500/20',
    type: 'guild',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'guild', fid }),
  },
  {
    id: 'referral',
    title: 'Referral Stats',
    description: 'Display your referral performance',
    icon: <Gift className="w-6 h-6" />,
    color: 'from-pink-500/20 to-rose-500/20',
    type: 'referral',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'referral', fid }),
  },
  {
    id: 'stats',
    title: 'Onchain Stats',
    description: 'Show your blockchain activity',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'from-indigo-500/20 to-violet-500/20',
    type: 'onchainstats',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'onchainstats', fid }),
  },
  {
    id: 'verify',
    title: 'Verify Account',
    description: 'Share your verified status',
    icon: <CheckCircle className="w-6 h-6" />,
    color: 'from-teal-500/20 to-cyan-500/20',
    type: 'verify',
    buildUrl: (fid) => buildFrameShareUrl({ type: 'verify', fid }),
  },
]

export default function FramesPage() {
  const { fid, isAuthenticated } = useAuth()
  const router = useRouter()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    setIsLoading(false)
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/frames')
    }
  }, [isLoading, isAuthenticated, router])

  const handleCopyUrl = async (frameId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(frameId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleOpenFrame = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShareToFarcaster = (url: string, title: string) => {
    // Warpcast share URL format
    const text = encodeURIComponent(`Check out my ${title}!`)
    const shareUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${encodeURIComponent(url)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !fid) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
              <Share2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Your Frames</h1>
              <p className="text-gray-400 mt-1">
                Share your achievements on Farcaster
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frame Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FRAME_CARDS.map((frame, index) => {
            const frameUrl = frame.buildUrl(fid.toString())
            const isCopied = copiedId === frame.id

            return (
              <motion.div
                key={frame.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                {/* Card */}
                <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                  {/* Gradient Background */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300",
                    frame.color
                  )} />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className={cn(
                      "inline-flex p-3 bg-gradient-to-br rounded-lg mb-4",
                      frame.color
                    )}>
                      {frame.icon}
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-xl font-bold text-white mb-2">
                      {frame.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">
                      {frame.description}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {/* Copy URL Button */}
                      <button
                        onClick={() => handleCopyUrl(frame.id, frameUrl)}
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                          isCopied
                            ? "bg-green-500/20 text-green-400 border border-green-500/50"
                            : "bg-gray-700/50 text-gray-300 border border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy URL
                          </>
                        )}
                      </button>

                      {/* Preview & Share Row */}
                      <div className="flex gap-2">
                        {/* Preview Button */}
                        <button
                          onClick={() => handleOpenFrame(frameUrl)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600 rounded-lg font-medium hover:bg-gray-700 hover:border-gray-500 transition-all duration-200"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Preview
                        </button>

                        {/* Share to Farcaster */}
                        <button
                          onClick={() => handleShareToFarcaster(frameUrl, frame.title)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-lg font-medium hover:bg-purple-500/30 hover:border-purple-500/70 transition-all duration-200"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-white mb-2">
            💡 How to Share Frames on Farcaster
          </h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">1.</span>
              <span>Click <strong>Copy URL</strong> to copy your personalized frame link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">2.</span>
              <span>Click <strong>Preview</strong> to see how your frame looks before sharing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">3.</span>
              <span>Click <strong>Share</strong> to post directly to Farcaster with one click</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">4.</span>
              <span>Your frames update automatically as you earn achievements!</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
