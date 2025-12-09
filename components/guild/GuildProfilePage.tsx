/**
 * GuildProfilePage Component
 * 
 * Purpose: Individual guild view with members, analytics, treasury tabs
 * Template: trezoadmin-41/profile (40%) + gmeowbased0.6 layout (15%)
 * 
 * Features:
 * - Guild header with avatar, name, description, stats
 * - 3 tabs: Members, Analytics, Treasury
 * - Join/Leave guild actions
 * - Admin controls (edit, manage members)
 * - Responsive design
 * 
 * Usage:
 * <GuildProfilePage guildId="123" />
 */

'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import GuildMemberList from './GuildMemberList'
import GuildAnalytics from './GuildAnalytics'
import GuildTreasury from './GuildTreasury'
import { UsersIcon, LeaderboardIcon, MonetizationOnIcon, SettingsIcon } from '@/components/icons'

export interface Guild {
  id: string
  name: string
  description: string
  chain: 'base'
  memberCount: number
  treasury: number
  points: number
  owner: string
  officers: string[]
  createdAt: string
  avatarUrl?: string
}

type Tab = 'members' | 'analytics' | 'treasury'

export interface GuildProfilePageProps {
  guildId: string
}

export default function GuildProfilePage({ guildId }: GuildProfilePageProps) {
  const { address } = useAccount()
  const [guild, setGuild] = useState<Guild | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [isMember, setIsMember] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  useEffect(() => {
    const loadGuild = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/guild/${guildId}`)
        if (!response.ok) throw new Error('Guild not found')
        const data = await response.json()
        setGuild(data.guild)
        
        // Check if user is member
        if (address) {
          const memberResponse = await fetch(`/api/guild/${guildId}/is-member?address=${address}`)
          const memberData = await memberResponse.json()
          setIsMember(memberData.isMember)
        }
      } catch (err) {
        console.error('Failed to load guild:', err)
        setError('Failed to load guild. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadGuild()
  }, [guildId, address])

  const handleJoinGuild = async () => {
    if (!address) return
    try {
      setIsJoining(true)
      const response = await fetch(`/api/guild/${guildId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      if (!response.ok) throw new Error('Failed to join guild')
      setIsMember(true)
      // Reload guild to update member count
      window.location.reload()
    } catch (err) {
      console.error('Failed to join guild:', err)
      alert('Failed to join guild. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveGuild = async () => {
    if (!address || !confirm('Are you sure you want to leave this guild?')) return
    try {
      setIsJoining(true)
      const response = await fetch(`/api/guild/${guildId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })
      if (!response.ok) throw new Error('Failed to leave guild')
      setIsMember(false)
      window.location.reload()
    } catch (err) {
      console.error('Failed to leave guild:', err)
      alert('Failed to leave guild. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  const isOwner = address && guild && guild.owner.toLowerCase() === address.toLowerCase()
  const isOfficer = address && guild && guild.officers.some(o => o.toLowerCase() === address.toLowerCase())
  const canManage = Boolean(isOwner || isOfficer)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Skeleton */}
        <div className="animate-pulse mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-xl w-24 h-24" />
            <div className="flex-1 space-y-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-8 w-64" />
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-4 w-full" />
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20" />
            ))}
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="animate-pulse flex gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-10 w-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !guild) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Error Loading Guild
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {error || 'Guild not found'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Guild Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
            {guild.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {guild.name}
                </h1>
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded">
                  {guild.chain.toUpperCase()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {canManage && (
                  <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px] focus:ring-2 focus:ring-blue-500">
                    <SettingsIcon className="w-5 h-5" />
                  </button>
                )}
                {address && !isMember && (
                  <button
                    onClick={handleJoinGuild}
                    disabled={isJoining}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {isJoining ? 'Joining...' : 'Join Guild'}
                  </button>
                )}
                {address && isMember && !isOwner && (
                  <button
                    onClick={handleLeaveGuild}
                    disabled={isJoining}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors min-h-[44px] focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    {isJoining ? 'Leaving...' : 'Leave Guild'}
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              {guild.description}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Members
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {guild.memberCount}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <MonetizationOnIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Treasury
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {guild.treasury.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <LeaderboardIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total Points
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {guild.points.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1">
          {[
            { id: 'members' as Tab, label: 'Members', icon: UsersIcon },
            { id: 'analytics' as Tab, label: 'Analytics', icon: LeaderboardIcon },
            { id: 'treasury' as Tab, label: 'Treasury', icon: MonetizationOnIcon }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500 ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'members' && <GuildMemberList guildId={guildId} canManage={canManage} />}
        {activeTab === 'analytics' && <GuildAnalytics guildId={guildId} />}
        {activeTab === 'treasury' && <GuildTreasury guildId={guildId} canManage={canManage} />}
      </div>
    </div>
  )
}
