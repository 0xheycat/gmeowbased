/**
 * GuildProfilePage Component (WCAG AA Compliant)
 * 
 * Purpose: Individual guild view with members, analytics, treasury tabs
 * Layout: OpenSea-inspired profile page with full-width banner
 * 
 * Features:
 * - Full-width banner with overlapping avatar
 * - Two-column layout: main content + sidebar stats
 * - Clean tab navigation (WCAG keyboard accessible)
 * - Join/Leave guild actions with ARIA labels
 * - Admin controls (edit, manage members)
 * - Responsive design (mobile: single column, desktop: sidebar)
 * - WCAG AA contrast ratios (4.5:1 minimum)
 * - Focus indicators (3:1 contrast)
 * 
 * Usage:
 * <GuildProfilePage guildId="123" />
 */

'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { type Address } from 'viem'
import GuildMemberList from './GuildMemberList'
import GuildAnalytics from './GuildAnalytics'
import GuildTreasury from './GuildTreasury'
import { GuildSettings } from './GuildSettings'
import { GuildActivityFeed } from './GuildActivityFeed'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import { Button } from '@/components/ui/button'
import Loader from '@/components/ui/gmeow-loader'
import { UsersIcon, LeaderboardIcon, MonetizationOnIcon, SettingsIcon } from '@/components/icons'
import { Activity } from 'lucide-react'
import { GUILD_ABI_JSON } from '@/lib/contracts/abis'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/utils/accessibility'

export interface Guild {
  id: string
  name: string
  leader: string
  totalPoints: string
  memberCount: string
  level: number
  active: boolean
  treasury: string
  description?: string
  avatarUrl?: string
  banner?: string
  guildTag?: string
  boostLevel?: number
}

type Tab = 'members' | 'analytics' | 'treasury' | 'activity' | 'settings'

export interface GuildProfilePageProps {
  guildId: string
}

export default function GuildProfilePage({ guildId }: GuildProfilePageProps) {
  const { address } = useAccount()
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  
  const [mounted, setMounted] = useState(false)
  const [guild, setGuild] = useState<Guild | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [isMember, setIsMember] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const [treasuryOpen, setTreasuryOpen] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)
  const [userRole, setUserRole] = useState<'owner' | 'officer' | 'member' | null>(null)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load guild data (contract + metadata)
  useEffect(() => {
    const loadGuild = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Load contract data
        const response = await fetch(`/api/guild/${guildId}`)
        if (!response.ok) throw new Error('Guild not found')
        const data = await response.json()
        
        // Try to load metadata (description, banner) from database
        const metadataResponse = await fetch(`/api/guild/${guildId}/metadata`)
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json()
          if (metadata.success && metadata.guild) {
            // Merge contract data with metadata
            setGuild({
              ...data.guild,
              description: metadata.guild.description || data.guild.description,
              banner: metadata.guild.banner || data.guild.banner,
            })
            return
          }
        }
        
        // Fallback to contract data only
        setGuild(data.guild)
      } catch (err) {
        setError('Failed to load guild. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadGuild()
  }, [guildId])

  // Check membership when wallet connects/changes
  useEffect(() => {
    const checkMembership = async () => {
      if (!address) {
        setIsMember(false)
        setUserRole(null)
        return
      }

      try {
        const memberResponse = await fetch(`/api/guild/${guildId}/is-member?address=${address}`)
        const memberData = await memberResponse.json()
        setIsMember(memberData.isMember)
        
        // Fetch user's role if they are a member
        if (memberData.isMember) {
          const membersResponse = await fetch(`/api/guild/${guildId}/members?page=1&limit=50`)
          if (membersResponse.ok) {
            const membersData = await membersResponse.json()
            const userMember = membersData.members?.find(
              (m: any) => m.address.toLowerCase() === address.toLowerCase()
            )
            if (userMember) {
              setUserRole(userMember.role)
            }
          }
        }
      } catch (err) {
        setErrorMessage('Failed to check guild membership')
        setErrorDialogOpen(true)
        setIsMember(false)
        setUserRole(null)
      }
    }

    checkMembership()
  }, [guildId, address])

  const handleJoinGuild = async () => {
    if (!address) {
      setDialogMessage('Please connect your wallet to join this guild.')
      setDialogOpen(true)
      return
    }
    
    try {
      // Get contract call details from API
      const response = await fetch(`/api/guild/${guildId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      
      const data = await response.json().catch(() => ({}))
      
      if (response.status === 409) {
        setIsMember(true)
        setDialogMessage('⚔️ You are already part of this guild! Continue your adventure!')
        setDialogOpen(true)
        return
      }
      
      if (!response.ok) {
        setDialogMessage(data.message || 'Unable to join guild. Please check your wallet and try again.')
        setDialogOpen(true)
        return
      }
      
      // Execute the actual contract transaction
      const { contractAddress, functionName, args } = data
      
      writeContract({
        address: contractAddress as Address,
        abi: GUILD_ABI_JSON,
        functionName,
        args: args.map((arg: string) => BigInt(arg)), // Convert string args back to BigInt
      })
      
    } catch (err) {
      setDialogMessage('An unexpected error occurred. Please try again later.')
      setDialogOpen(true)
    }
  }
  
  // Handle transaction success
  useEffect(() => {
    if (isSuccess) {
      setIsMember(true)
      
      // Show XP celebration
      const payload: XpEventPayload = {
        event: 'guild-join',
        chainKey: 'base',
        xpEarned: 25, // Guild join reward
        totalPoints: 0,
        headline: `Joined ${guild?.name || 'Guild'}! ⚔️`,
        tierTagline: '+25 XP Earned',
        shareLabel: 'Share Guild',
        visitLabel: 'View Guild',
        visitUrl: `/guild/${guildId}`,
      }
      setXpPayload(payload)
      setTimeout(() => setXpOverlayOpen(true), 100)
      
      setDialogMessage('⚔️ Welcome to the guild! Your adventure begins now!')
      setDialogOpen(true)
      
      // Reload guild data
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/guild/${guildId}`)
          if (response.ok) {
            const data = await response.json()
            setGuild(data.guild)
          }
        } catch (err) {
        }
      }, 1000)
    }
  }, [isSuccess, guildId, guild?.name])
  
  // Handle transaction error
  useEffect(() => {
    if (writeError) {
      setDialogMessage(`Transaction failed: ${writeError.message}`)
      setDialogOpen(true)
    }
  }, [writeError])

  const confirmLeaveGuild = () => {
    if (!address) return
    setConfirmLeaveOpen(true)
  }

  const handleLeaveGuild = async () => {
    if (!address) return
    
    try {
      setConfirmLeaveOpen(false)
      
      const response = await fetch(`/api/guild/${guildId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      
      const data = await response.json().catch(() => ({}))
      
      if (!response.ok) {
        setDialogMessage(data.message || 'Unable to leave guild. Please check your connection and try again.')
        setDialogOpen(true)
        return
      }
      
      // Update membership status immediately
      setIsMember(false)
      setDialogMessage('👋 You have left the guild. Farewell, brave warrior!')
      setDialogOpen(true)
      
      // Reload guild data
      setTimeout(async () => {
        try {
          const response = await fetch(`/api/guild/${guildId}`)
          if (response.ok) {
            const data = await response.json()
            setGuild(data.guild)
          }
        } catch (err) {
        }
        setDialogOpen(false)
      }, 2000)
    } catch (err) {
      setDialogMessage('Unable to leave guild. Please check your connection and try again.')
      setDialogOpen(true)
    }
  }

  const isLeader = address && guild && guild.leader.toLowerCase() === address.toLowerCase()
  // Phase 2.3: Check user role from fetched data (owner or officer can manage)
  const canManage = Boolean(userRole === 'owner' || userRole === 'officer')

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl" role="status" aria-live="polite" aria-label="Loading guild profile">
        {/* Header Skeleton */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
            <Skeleton variant="avatar" className="w-24 h-24" animation="wave" />
            <div className="flex-1 space-y-4">
              <Skeleton variant="rect" className="h-8 w-64" animation="wave" />
              <Skeleton variant="rect" className="h-4 w-full" animation="wave" />
              <Skeleton variant="rect" className="h-4 w-32" animation="wave" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rect" className="h-20 rounded-lg" animation="wave" />
            ))}
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} variant="rect" className="h-10 w-32 rounded-lg" animation="wave" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !guild) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Dialog isOpen={true} onClose={() => setError(null)}>
          <DialogBackdrop />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Error Loading Guild</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-gray-700 dark:text-gray-300">{error || 'Guild not found'}</p>
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
                    setIsLoading(true)
                    setTimeout(() => window.location.href = window.location.href, 100)
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  {...createKeyboardHandler(() => {
                    setError(null)
                    setIsLoading(true)
                    setTimeout(() => window.location.href = window.location.href, 100)
                  })}
                >
                  Retry
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Full-Width Banner */}
      <div className="relative w-full h-[280px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 overflow-hidden">
        {guild.banner ? (
          <img
            src={guild.banner}
            alt={`${guild.name} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />
        )}
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Avatar + Title Section (Overlapping Banner) */}
        <div className="relative -mt-16 mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-5xl flex-shrink-0 border-4 border-white dark:border-gray-900 shadow-2xl">
              {guild.name.charAt(0).toUpperCase()}
            </div>

            {/* Guild Info */}
            <div className="flex-1 pt-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {guild.name}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                      Level {guild.level}
                    </span>
                    {guild.guildTag && (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        {guild.guildTag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons (WCAG AA) */}
                <div className="flex gap-2">
                  {mounted && address && !isMember && (
                    <button
                      onClick={handleJoinGuild}
                      disabled={isPending || isConfirming}
                      aria-label="Join this guild"
                      aria-busy={isPending || isConfirming}
                      className={`px-6 py-3 bg-wcag-info-light dark:bg-wcag-info-dark hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-fast transition-smooth hover:scale-105 shadow-lg hover:shadow-xl ${BUTTON_SIZES.md} ${FOCUS_STYLES.ring}`}
                    >
                      {(isPending || isConfirming) ? (
                        <span className="flex items-center gap-2" {...LOADING_ARIA}>
                          <Loader size="small" variant="minimal" />
                          {isPending ? 'Confirming...' : 'Processing...'}
                        </span>
                      ) : (
                        'Join Guild'
                      )}
                    </button>
                  )}
                  {mounted && address && isMember && !isLeader && (
                    <button
                      onClick={confirmLeaveGuild}
                      disabled={isPending || isConfirming}
                      aria-label="Leave this guild"
                      className={`px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:bg-gray-400 ${WCAG_CLASSES.text.onLight.primary} font-semibold rounded-xl transition-fast transition-smooth border border-gray-300 dark:border-gray-600 ${BUTTON_SIZES.md} ${FOCUS_STYLES.ring}`}
                    >
                      Leave Guild
                    </button>
                  )}
                  {mounted && !address && (
                    <div className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-xl min-h-[44px] flex items-center border border-gray-200 dark:border-gray-700">
                      Connect wallet to join
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 text-base max-w-3xl">
                {guild.description || 'No description available'}
              </p>
            </div>
          </div>
        </div>

        {/* Two-Column Layout: Main Content + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 pb-12">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Tabs Navigation (WCAG AA) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
              <nav className="flex overflow-x-auto" role="tablist" aria-label="Guild sections">
                {[
                  { id: 'members' as Tab, label: 'Members', icon: UsersIcon },
                  { id: 'analytics' as Tab, label: 'Analytics', icon: LeaderboardIcon },
                  { id: 'activity' as Tab, label: 'Activity', icon: Activity },
                  ...(canManage ? [{ id: 'settings' as Tab, label: 'Settings', icon: SettingsIcon }] : [])
                ].map((tab, index, array) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  const keyboardProps = createKeyboardHandler(() => setActiveTab(tab.id))
                  
                  return (
                    <button
                      key={tab.id}
                      {...keyboardProps}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`${tab.id}-panel`}
                      aria-label={`${tab.label} tab, ${index + 1} of ${array.length}`}
                      tabIndex={isActive ? 0 : -1}
                      className={`flex items-center gap-2 px-6 py-4 font-medium transition-fast transition-smooth ${BUTTON_SIZES.md} whitespace-nowrap border-b-2 ${
                        isActive
                          ? 'text-wcag-text-link-light dark:text-wcag-text-link-dark border-wcag-focus-ring dark:border-wcag-focus-ring-dark bg-blue-50/50 dark:bg-blue-900/10'
                          : `${WCAG_CLASSES.text.onLight.secondary} border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50`
                      } ${FOCUS_STYLES.ring}`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Tab Content (WCAG AA) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              {activeTab === 'members' && (
                <div role="tabpanel" id="members-panel" aria-labelledby="members-tab">
                  <GuildMemberList guildId={guildId} canManage={canManage} />
                </div>
              )}
              {activeTab === 'analytics' && (
                <div role="tabpanel" id="analytics-panel" aria-labelledby="analytics-tab">
                  <GuildAnalytics guildId={guildId} />
                </div>
              )}
              {activeTab === 'activity' && (
                <div role="tabpanel" id="activity-panel" aria-labelledby="activity-tab">
                  <GuildActivityFeed guildId={guildId} limit={50} />
                </div>
              )}
              {activeTab === 'settings' && (
                <div role="tabpanel" id="settings-panel" aria-labelledby="settings-tab">
                  <GuildSettings guildId={guildId} isLeader={canManage} />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Stats */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              {/* Treasury Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MonetizationOnIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Treasury
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {parseInt(guild.treasury || '0').toLocaleString()}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Points in treasury</p>
                {canManage && (
                  <button
                    onClick={() => setTreasuryOpen(true)}
                    className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Manage Treasury
                  </button>
                )}
              </div>

              {/* Stats Card (WCAG AA) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className={`text-sm font-semibold ${WCAG_CLASSES.text.onLight.primary} mb-4`}>Guild Stats</h3>
                <div className="space-y-4" role="list" aria-label="Guild statistics">
                  <div className="flex items-center justify-between" role="listitem">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="w-5 h-5 text-wcag-info-light dark:text-wcag-info-dark" aria-hidden="true" />
                      <span className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>Members</span>
                    </div>
                    <span className={`text-lg font-bold ${WCAG_CLASSES.text.onLight.primary}`} aria-label={`${guild.memberCount} members`}>{guild.memberCount}</span>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                  <div className="flex items-center justify-between" role="listitem">
                    <div className="flex items-center gap-2">
                      <LeaderboardIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                      <span className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>Total Points</span>
                    </div>
                    <span className={`text-lg font-bold ${WCAG_CLASSES.text.onLight.primary}`} aria-label={`${parseInt(guild.totalPoints || '0').toLocaleString()} total points`}>
                      {parseInt(guild.totalPoints || '0').toLocaleString()}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                  <div className="flex items-center justify-between" role="listitem">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                      <span className={`text-sm ${WCAG_CLASSES.text.onLight.secondary}`}>Level</span>
                    </div>
                    <span className={`text-lg font-bold ${WCAG_CLASSES.text.onLight.primary}`} aria-label={`Level ${guild.level}`}>{guild.level}</span>
                  </div>
                </div>
              </div>

              {/* Leader Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Guild Leader</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                    L
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {guild.leader.slice(0, 6)}...{guild.leader.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Dialog for notifications */}
      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogBackdrop />
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Guild Action</DialogTitle>
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

      {/* Confirmation dialog for leaving guild */}
      <Dialog isOpen={confirmLeaveOpen} onClose={() => setConfirmLeaveOpen(false)}>
        <DialogBackdrop />
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Leave Guild</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to leave this guild? You can rejoin later if you change your mind.
            </p>
          </DialogBody>
          <DialogFooter>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmLeaveOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveGuild}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Leave Guild
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Treasury Management Dialog */}
      <Dialog isOpen={treasuryOpen} onClose={() => setTreasuryOpen(false)}>
        <DialogBackdrop />
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Guild Treasury</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[calc(100vh-16rem)] overflow-y-auto">
            <GuildTreasury guildId={guildId} canManage={canManage} />
          </DialogBody>
          <DialogFooter>
            <button
              onClick={() => setTreasuryOpen(false)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XP Celebration Overlay */}
      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => setXpOverlayOpen(false)}
      />
    </div>
  )
}
