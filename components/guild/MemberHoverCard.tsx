/**
 * MemberHoverCard Component
 * 
 * Purpose: Steam-style hover card showing member stats and info
 * Template: BadgeHoverCard pattern (40% adaptation) + Steam Community
 * 
 * Features:
 * - Member stats (join date, last active, contributions)
 * - Role badge display
 * - Leaderboard stats integration
 * - Smooth animations (Framer Motion)
 * - Auto-positioning (stays within viewport)
 * 
 * Pattern: Steam Community hover cards, Discord member popups
 * 
 * Usage:
 * <MemberHoverCard member={member} isVisible={true} position={{ x: 100, y: 100 }} />
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WorkspacePremiumIcon, MilitaryTechIcon, TrendingUpIcon, CalendarIcon, AccessTimeIcon } from '@/components/icons'
import { BadgeShowcase } from './badges'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import { createKeyboardHandler, WCAG_CLASSES, FOCUS_STYLES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/utils/accessibility'

export interface MemberStats {
  joinedAt: string
  lastActive?: string
  pointsContributed: number
  totalScore?: number
  globalRank?: number | null
  guildRank?: number | null
}

export interface MemberHoverCardMember {
  address: string
  username?: string
  role: 'owner' | 'officer' | 'member'
  avatarUrl?: string
  farcaster?: {
    fid?: number
    username?: string
    displayName?: string
    pfpUrl?: string
    powerBadge?: boolean
  }
  badges?: Array<{
    id: string
    name: string
    description: string
    icon: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    category: 'founder' | 'activity' | 'role' | 'special' | 'achievement'
    animated?: boolean
    earnedAt?: Date | string
  }>
  leaderboardStats?: {
    total_score?: number
    global_rank?: number | null
  }
}

interface MemberHoverCardProps {
  member: MemberHoverCardMember
  isVisible: boolean
  position: { x: number; y: number }
  guildId: string
}

/**
 * MemberHoverCard - Steam-pattern hover card for member details
 * 
 * Shows:
 * - Avatar + username + role badge
 * - Join date + last active
 * - Points contributed
 * - Global rank (if available)
 * - Achievement badges (up to 6)
 */
export default function MemberHoverCard({
  member,
  isVisible,
  position,
  guildId,
}: MemberHoverCardProps) {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch member stats when hover card becomes visible
  useEffect(() => {
    if (isVisible && !stats && !isLoadingStats) {
      fetchMemberStats()
    }
  }, [isVisible])

  const fetchMemberStats = async () => {
    setIsLoadingStats(true)
    try {
      const response = await fetch(
        `/api/guild/${guildId}/member-stats?address=${member.address}`
      )
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        setErrorMessage('Failed to load member stats')
        setErrorDialogOpen(true)
      }
    } catch (error) {
      setErrorMessage('Failed to load member stats')
      setErrorDialogOpen(true)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Role-based styling (Steam pattern)
  const getRoleStyle = () => {
    switch (member.role) {
      case 'owner':
        return {
          bg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          icon: WorkspacePremiumIcon,
        }
      case 'officer':
        return {
          bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          icon: MilitaryTechIcon,
        }
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/20',
          text: 'text-gray-400',
          icon: null,
        }
    }
  }

  const roleStyle = getRoleStyle()
  const RoleIcon = roleStyle.icon

  // Format relative time (Steam pattern: "Last online X days ago")
  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Activity unknown'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 5) return 'Online now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Format join date (Steam pattern: "Member since MMM YYYY")
  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const displayName = member.farcaster?.displayName || member.username || 
    `${member.address.slice(0, 6)}...${member.address.slice(-4)}`

  const avatarUrl = member.farcaster?.pfpUrl || member.avatarUrl

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            maxWidth: '320px',
            minWidth: '280px',
          }}
          role="tooltip"
          aria-label={`${displayName} profile card`}
        >
          <div className="relative rounded-xl border border-gray-700 bg-[#1a1a2e] shadow-2xl backdrop-blur-sm">
            {/* Header with avatar and role */}
            <div className={`p-4 rounded-t-xl ${roleStyle.bg} ${roleStyle.border} border-b`}>
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={56}
                      height={56}
                      className="rounded-full border-2 border-gray-600"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold border-2 border-gray-600">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {member.farcaster?.powerBadge && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-[#1a1a2e]">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name and Role */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-white truncate">
                      {displayName}
                    </h3>
                  </div>
                  {member.farcaster?.username && (
                    <p className="text-sm text-gray-400 mb-2">
                      @{member.farcaster.username}
                    </p>
                  )}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleStyle.bg} ${roleStyle.border} border ${roleStyle.text}`}>
                    {RoleIcon && <RoleIcon className="w-3 h-3" />}
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="p-4 space-y-3">
              {/* Join Date */}
              {stats?.joinedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Member since</span>
                  <span className="text-white font-medium">
                    {formatJoinDate(stats.joinedAt)}
                  </span>
                </div>
              )}

              {/* Last Active */}
              <div className="flex items-center gap-2 text-sm">
                <AccessTimeIcon className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">Last active</span>
                <span className={`font-medium ${
                  stats?.lastActive && formatLastActive(stats.lastActive) === 'Online now'
                    ? 'text-green-400'
                    : 'text-white'
                }`}>
                  {isLoadingStats ? '...' : formatLastActive(stats?.lastActive)}
                </span>
              </div>

              {/* Points Contributed */}
              {stats && (
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUpIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Contributed</span>
                  <span className="text-white font-medium">
                    {stats.pointsContributed.toLocaleString()} points
                  </span>
                </div>
              )}

              {/* Guild Rank */}
              {stats?.guildRank && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-500">#</span>
                  </div>
                  <span className="text-gray-400">Guild rank</span>
                  <span className="text-purple-400 font-bold">
                    #{stats.guildRank.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Global Rank */}
              {member.leaderboardStats?.global_rank && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">#</span>
                  </div>
                  <span className="text-gray-400">Global rank</span>
                  <span className="text-yellow-400 font-bold">
                    #{member.leaderboardStats.global_rank.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Total Score */}
              {member.leaderboardStats?.total_score && (
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Score</span>
                    <span className="text-lg font-bold text-white">
                      {member.leaderboardStats.total_score.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Badges */}
              {member.badges && member.badges.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">
                    Achievement Badges ({member.badges.length})
                  </p>
                  <BadgeShowcase 
                    badges={member.badges} 
                    maxDisplay={6}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {/* Arrow pointer */}
            <div className="absolute -top-1.5 left-6 h-3 w-3 rotate-45 border-l border-t border-gray-700 bg-[#1a1a2e]" />
          </div>
        </motion.div>
      )}
      
      {/* Error Dialog */}
      <Dialog isOpen={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
        <DialogBackdrop />
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Error Loading Stats</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-gray-700 dark:text-gray-300">{errorMessage}</p>
          </DialogBody>
          <DialogFooter>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setErrorDialogOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                {...createKeyboardHandler(() => setErrorDialogOpen(false))}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setErrorDialogOpen(false)
                  fetchMemberStats()
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                {...createKeyboardHandler(() => {
                  setErrorDialogOpen(false)
                  fetchMemberStats()
                })}
              >
                Retry
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  )
}
