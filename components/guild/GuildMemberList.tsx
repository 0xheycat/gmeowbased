/**
 * GuildMemberList Component (WCAG AA Compliant)
 * 
 * Purpose: Display and manage guild members with roles
 * Template: trezoadmin-41/member-table (35%) + gmeowbased0.6 layout (10%)
 * 
 * Dialog Usage:
 * - ConfirmDialog: Confirmation for removing/kicking guild members (destructive variant)
 * - Custom Dialog components: Member detail view modal
 * 
 * Features:
 * - Member list with avatars, roles, stats
 * - Owner/Officer role badges
 * - Promote/Demote/Kick actions (keyboard accessible)
 * - Responsive table (desktop) and cards (mobile)
 * - Pagination for large guilds
 * - WCAG AA keyboard navigation
 * - ARIA labels for screen readers
 * - 4.5:1 contrast ratios
 * 
 * Usage:
 * <GuildMemberList guildId="123" canManage={true} />
 */

'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { type Address } from 'viem'
import { WorkspacePremiumIcon, MilitaryTechIcon, MoreIcon } from '@/components/icons'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import { ConfirmDialog } from '@/components/dialogs'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { GUILD_ABI_JSON } from '@/lib/contracts/abis'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { BadgeShowcase, type Badge } from '@/components/guild/badges'
import MemberHoverCard from './MemberHoverCard'
import Image from 'next/image'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/utils/accessibility'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'

export interface GuildMember {
  address: string
  username?: string
  role: 'owner' | 'officer' | 'member'
  joinedAt: string
  points: string
  pointsContributed?: number
  avatarUrl?: string
  // Leaderboard stats from leaderboard_calculations table
  leaderboardStats?: {
    total_score: number
    base_points: number
    viral_xp: number
    guild_bonus_points: number
    is_guild_officer: boolean
    global_rank: number | null
    rank_tier: string | null
  }
  // Farcaster profile data
  farcaster?: {
    fid: number
    username?: string
    displayName?: string
    pfpUrl?: string
    bio?: string
    followerCount?: number
    followingCount?: number
    powerBadge?: boolean
    verifications?: string[]
  }
  // Achievement badges
  badges?: Badge[]
}

export interface GuildMemberListProps {
  guildId: string
  canManage?: boolean
}

export function GuildMemberList({ guildId, canManage = false }: GuildMemberListProps) {
  const { address } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  
  const [members, setMembers] = useState<GuildMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ action: string; address: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [targetMemberAddress, setTargetMemberAddress] = useState<string | null>(null)
  
  // Hover card state (Steam pattern)
  const [hoveredMember, setHoveredMember] = useState<GuildMember | null>(null)
  const [hoverCardPosition, setHoverCardPosition] = useState({ x: 0, y: 0 })
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // XP celebration state
  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && currentAction && targetMemberAddress) {
      setDialogMessage('Transaction confirmed! Updating member role...')
      setDialogOpen(true)
      
      // Refetch guild data from API to update officer status
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/guild/${guildId}`)
          if (!response.ok) throw new Error('Failed to fetch guild data')
          
          const data = await response.json()
          const updatedMember = data.members?.find((m: any) => 
            m.address.toLowerCase() === targetMemberAddress.toLowerCase()
          )
          
          if (updatedMember) {
            // Update member role in state
            setMembers(prev => prev.map(m => 
              m.address.toLowerCase() === targetMemberAddress.toLowerCase()
                ? { ...m, role: updatedMember.role }
                : m
            ))
            
            const isOfficer = updatedMember.role === 'officer'
            setDialogMessage(`${isOfficer ? '🎉 Quest complete! Member promoted to Officer rank!' : '📊 Member demoted to Member rank. Keep striving!'}`)
            
            // Trigger XP celebration for management action
            const payload: XpEventPayload = {
              event: 'guild',
              chainKey: 'base',
              xpEarned: 15,
              totalPoints: 0, // Will be calculated by overlay
              headline: isOfficer ? 'Member Promoted! 🏆' : 'Role Updated 📊',
              tierTagline: '+15 XP Earned',
              shareLabel: 'Share',
              visitLabel: 'View Guild',
              visitUrl: `/guild/${guildId}`,
            }
            setXpPayload(payload)
            setTimeout(() => setXpOverlayOpen(true), 100)
          }
          
          setCurrentAction(null)
          setTargetMemberAddress(null)
        } catch (err) {
          // Fallback: reload entire member list
          try {
            const response = await fetch(`/api/guild/${guildId}/members?page=1&limit=50`)
            if (response.ok) {
              const data = await response.json()
              const transformedMembers = (data.members || []).map((m: any) => ({
                ...m,
                username: m.farcaster?.username || m.username || `${m.address.slice(0, 6)}...${m.address.slice(-4)}`,
                pointsContributed: parseInt(m.points || '0'),
                farcaster: m.farcaster, // Preserve Farcaster data
                badges: m.badges // Preserve badges
              }))
              setMembers(transformedMembers)
            }
          } catch (reloadErr) {
          }
        }
      }, 2000)
    }
  }, [isSuccess, guildId, currentAction, targetMemberAddress])

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoading(true)
        setError(null)
        // Use existing guild API route that returns members
        const response = await fetch(`/api/guild/${guildId}`)
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to load members: ${response.status}`)
        }
        const data = await response.json()
        
        // Transform API response to add display names
        const membersArray = data.members || []
        const transformedMembers = membersArray.map((m: any) => ({
          address: m.address,
          role: m.isOfficer ? 'officer' : 'member',
          joinedAt: new Date().toISOString(),
          points: m.points || '0',
          username: m.farcaster?.username || `${m.address.slice(0, 6)}...${m.address.slice(-4)}`,
          pointsContributed: parseInt(m.points || '0'),
          farcaster: m.farcaster,
          badges: m.badges || [],
          leaderboardStats: m.leaderboardStats || null
        }))
        
        setMembers(transformedMembers)
      } catch (err) {
        setError('Failed to load members. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    loadMembers()
  }, [guildId])

  const getRoleBadge = (role: GuildMember['role']) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded">
            <WorkspacePremiumIcon className="w-3 h-3" />
            Owner
          </span>
        )
      case 'officer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
            <MilitaryTechIcon className="w-3 h-3" />
            Officer
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded">
            Member
          </span>
        )
    }
  }

  const promptAction = (action: string, memberAddress: string) => {
    setConfirmAction({ action, address: memberAddress })
  }

  const handleAction = async () => {
    if (!confirmAction || !address) return
    const { action, address: memberAddress } = confirmAction
    
    // Track action for UI update
    setCurrentAction(action)
    setTargetMemberAddress(memberAddress)
    
    try {
      setConfirmAction(null)
      
      // Get contract call details from API
      const response = await fetch(`/api/guild/${guildId}/manage-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          address,
          action, 
          targetAddress: memberAddress 
        })
      })
      
      const data = await response.json().catch(() => ({}))
      
      if (!response.ok) {
        setDialogMessage(data.message || `Unable to ${action} member. Please check your permissions and try again.`)
        setDialogOpen(true)
        setCurrentAction(null)
        setTargetMemberAddress(null)
        return
      }
      
      // Execute actual contract transaction
      if (data.contractCall) {
        const { contractAddress, functionName, args } = data.contractCall
        writeContract({
          address: contractAddress as Address,
          abi: GUILD_ABI_JSON,
          functionName,
          args: args.map((arg: string) => {
            // Convert addresses as-is
            if (arg.startsWith('0x')) return arg as Address
            // Convert '0'/'1' to boolean for setGuildOfficer
            if (arg === '0') return false
            if (arg === '1') return true
            // Convert numeric strings to BigInt
            return BigInt(arg)
          })
        })
        return
      }
      
      // Remove member from local state
      if (action === 'kick') {
        setMembers(prev => prev.filter(m => m.address !== memberAddress))
      }
      
      setDialogMessage(
        action === 'kick' ? '⚠️ Member removed from guild!' :
        action === 'promote' ? '🎉 Member promoted to Officer!' :
        '📊 Member demoted to Member rank!'
      )
      setDialogOpen(true)
      
      // Reload members list
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/guild/${guildId}/members?page=1&limit=50`)
          if (response.ok) {
            const data = await response.json()
            const transformedMembers = (data.members || []).map((m: any) => ({
              ...m,
              username: m.farcaster?.username || m.username || `${m.address.slice(0, 6)}...${m.address.slice(-4)}`,
              pointsContributed: parseInt(m.points || '0'),
              farcaster: m.farcaster // Preserve Farcaster data from API
            }))
            setMembers(transformedMembers)
          }
        } catch (err) {
        }
        setDialogOpen(false)
      }, 2000)
    } catch (err) {
      setDialogMessage(`Action failed. Please check your connection and try again.`)
      setDialogOpen(true)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite" aria-label="Loading members">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} variant="rect" className="h-20 rounded-lg" animation="wave" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <>
        <Dialog isOpen={true} onClose={() => setError(null)}>
          <DialogBackdrop />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Error Loading Members</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-gray-700 dark:text-gray-300">{error}</p>
            </DialogBody>
            <DialogFooter>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => setError(null))}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setError(null)
                    window.location.reload()
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => {
                    setError(null)
                    window.location.reload()
                  })}
                >
                  Retry
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No members yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Member
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Role
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Badges
              </th>
              <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Leaderboard
              </th>
              <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Contributed
              </th>
              <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Joined
              </th>
              {canManage && (
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr
                key={member.address}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onMouseEnter={(e) => {
                  // Clear any pending timeout
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout)
                  }
                  
                  // Steam pattern: slight delay before showing (200ms)
                  const timeout = setTimeout(() => {
                    // Safety check: ensure element still exists
                    if (!e.currentTarget) return
                    
                    const rect = e.currentTarget.getBoundingClientRect()
                    setHoverCardPosition({
                      x: rect.left + rect.width / 2,
                      y: rect.bottom + 10
                    })
                    setHoveredMember(member)
                  }, 200)
                  
                  setHoverTimeout(timeout)
                }}
                onMouseLeave={() => {
                  // Clear timeout if user moves away quickly
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout)
                    setHoverTimeout(null)
                  }
                  
                  // Instant hide
                  setHoveredMember(null)
                }}
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    {/* Profile Picture */}
                    {member.farcaster?.pfpUrl ? (
                      <>
                        <Image
                          src={member.farcaster.pfpUrl}
                          alt={member.farcaster.displayName || member.username || 'Member'}
                          width={40}
                          height={40}
                          className="rounded-full flex-shrink-0"
                          unoptimized={true}
                          onError={(e) => {
                            // Fallback to gradient avatar on error
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.classList.remove('hidden')
                          }}
                        />
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ display: 'none' }}>
                          {(member.username || member.address).charAt(0).toUpperCase()}
                        </div>
                      </>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(member.username || member.address).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      {/* Display Name / Username */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {member.farcaster?.displayName || member.farcaster?.username || member.username || `${member.address.slice(0, 6)}...${member.address.slice(-4)}`}
                        </span>
                        {/* Power Badge */}
                        {member.farcaster?.powerBadge && (
                          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded font-semibold" title="Power Badge">
                            ⚡
                          </span>
                        )}
                      </div>
                      {/* Username and Address */}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {member.farcaster?.username && (
                          <span>@{member.farcaster.username} · </span>
                        )}
                        {member.address.slice(0, 6)}...{member.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {getRoleBadge(member.role)}
                </td>
                <td className="py-4 px-6">
                  {member.badges && member.badges.length > 0 ? (
                    <BadgeShowcase 
                      badges={member.badges} 
                      maxDisplay={4}
                      size="sm"
                      showTooltip={true}
                    />
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600">No badges</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  {member.leaderboardStats ? (
                    <div className="space-y-1">
                      {/* Total Score */}
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {member.leaderboardStats.total_score.toLocaleString()}
                      </div>
                      
                      {/* Guild Bonus (purple) */}
                      {member.leaderboardStats.guild_bonus_points > 0 && (
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          +{member.leaderboardStats.guild_bonus_points.toLocaleString()} guild bonus
                          {member.leaderboardStats.is_guild_officer && ' (Officer)'}
                        </div>
                      )}
                      
                      {/* Global Rank */}
                      {member.leaderboardStats.global_rank && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Rank #{member.leaderboardStats.global_rank.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600">No stats</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right font-semibold text-gray-900 dark:text-white">
                  {(member.pointsContributed || 0).toLocaleString()}
                </td>
                <td className="py-4 px-6 text-right text-sm text-gray-600 dark:text-gray-400">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {canManage && member.role !== 'owner' && (
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      {member.role === 'member' ? (
                        <button
                          onClick={() => promptAction('promote', member.address)}
                          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500"
                          disabled={isPending || isConfirming}
                          {...createKeyboardHandler(() => promptAction('promote', member.address))}
                        >
                          {(isPending || isConfirming) ? 'Processing...' : 'Promote to Officer'}
                        </button>
                      ) : member.role === 'officer' ? (
                        <button
                          onClick={() => promptAction('demote', member.address)}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[44px] focus:ring-2 focus:ring-gray-500"
                          disabled={isPending || isConfirming}
                          {...createKeyboardHandler(() => promptAction('demote', member.address))}
                        >
                          {(isPending || isConfirming) ? 'Processing...' : 'Demote to Member'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {members.map(member => (
          <div
            key={member.address}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            onMouseEnter={(e) => {
              // Same hover logic for mobile (in case of tablet/touchscreen with mouse)
              if (hoverTimeout) {
                clearTimeout(hoverTimeout)
              }
              
              const timeout = setTimeout(() => {
                // Safety check: ensure element still exists
                if (!e.currentTarget) return
                
                const rect = e.currentTarget.getBoundingClientRect()
                setHoverCardPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.bottom + 10
                })
                setHoveredMember(member)
              }, 200)
              
              setHoverTimeout(timeout)
            }}
            onMouseLeave={() => {
              if (hoverTimeout) {
                clearTimeout(hoverTimeout)
                setHoverTimeout(null)
              }
              setHoveredMember(null)
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Profile Picture */}
                {member.farcaster?.pfpUrl ? (
                  <Image
                    src={member.farcaster.pfpUrl}
                    alt={member.farcaster.displayName || member.username || 'Member'}
                    width={48}
                    height={48}
                    className="rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(member.username || member.address).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  {/* Display Name / Username */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {member.farcaster?.displayName || member.farcaster?.username || member.username || `${member.address.slice(0, 6)}...${member.address.slice(-4)}`}
                    </span>
                    {/* Power Badge */}
                    {member.farcaster?.powerBadge && (
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded font-semibold" title="Power Badge">
                        ⚡
                      </span>
                    )}
                  </div>
                  {/* Username and Address */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {member.farcaster?.username && (
                      <span>@{member.farcaster.username} · </span>
                    )}
                    {member.address.slice(0, 6)}...{member.address.slice(-4)}
                  </div>
                </div>
              </div>
              {getRoleBadge(member.role)}
            </div>

            {/* Badges Section */}
            {member.badges && member.badges.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Badges
                </div>
                <BadgeShowcase 
                  badges={member.badges} 
                  maxDisplay={4}
                  size="sm"
                  showTooltip={true}
                />
              </div>
            )}

            {/* Leaderboard Stats Section */}
            {member.leaderboardStats && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">
                  Leaderboard Stats
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Total Score */}
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Score</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {member.leaderboardStats.total_score.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Guild Bonus */}
                  {member.leaderboardStats.guild_bonus_points > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Guild Bonus</div>
                      <div className="font-semibold text-purple-600 dark:text-purple-400">
                        +{member.leaderboardStats.guild_bonus_points.toLocaleString()}
                        {member.leaderboardStats.is_guild_officer && ' ⚡'}
                      </div>
                    </div>
                  )}
                  
                  {/* Global Rank */}
                  {member.leaderboardStats.global_rank && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Global Rank</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        #{member.leaderboardStats.global_rank.toLocaleString()}
                      </div>
                    </div>
                  )}
                  
                  {/* Rank Tier */}
                  {member.leaderboardStats.rank_tier && (
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Tier</div>
                      <div className="font-semibold text-gray-900 dark:text-white capitalize">
                        {member.leaderboardStats.rank_tier}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contributed
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {(member.pointsContributed || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Joined
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {canManage && member.role !== 'owner' && (
              <div className="flex gap-2">
                {member.role === 'member' ? (
                  <button
                    onClick={() => promptAction('promote', member.address)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500"
                    disabled={isPending || isConfirming}
                    {...createKeyboardHandler(() => promptAction('promote', member.address))}
                  >
                    {(isPending || isConfirming) ? 'Processing...' : 'Promote to Officer'}
                  </button>
                ) : member.role === 'officer' ? (
                  <button
                    onClick={() => promptAction('demote', member.address)}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[44px] focus:ring-2 focus:ring-gray-500"
                    disabled={isPending || isConfirming}
                    {...createKeyboardHandler(() => promptAction('demote', member.address))}
                  >
                    {(isPending || isConfirming) ? 'Processing...' : 'Demote to Member'}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notification Dialog */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogBackdrop />
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Member Management</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-gray-700 dark:text-gray-300">{dialogMessage}</p>
          </DialogBody>
          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              OK
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={
          confirmAction?.action === 'kick' ? 'Remove Member?' :
          confirmAction?.action === 'promote' ? 'Promote to Officer?' :
          'Demote to Member?'
        }
        message={
          confirmAction?.action === 'kick' 
            ? 'This member will be removed from the guild. They can rejoin if invited again.'
            : confirmAction?.action === 'promote'
            ? 'This member will be promoted to Officer rank with management permissions.'
            : 'This member will be demoted to regular Member rank.'
        }
        variant={confirmAction?.action === 'kick' ? 'destructive' : 'warning'}
        confirmLabel={
          confirmAction?.action === 'kick' ? 'Remove Member' :
          confirmAction?.action === 'promote' ? 'Promote' :
          'Demote'
        }
        cancelLabel="Cancel"
      />

      {/* Member Hover Card (Steam pattern) */}
      {hoveredMember && (
        <MemberHoverCard
          member={hoveredMember}
          isVisible={true}
          position={hoverCardPosition}
          guildId={guildId}
        />
      )}
      
      {/* XP Celebration Overlay */}
      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => setXpOverlayOpen(false)}
      />
    </div>
  )
}

export default GuildMemberList
