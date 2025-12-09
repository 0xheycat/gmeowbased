/**
 * GuildMemberList Component
 * 
 * Purpose: Display and manage guild members with roles
 * Template: trezoadmin-41/member-table (35%) + gmeowbased0.6 layout (10%)
 * 
 * Features:
 * - Member list with avatars, roles, stats
 * - Owner/Officer role badges
 * - Promote/Demote/Kick actions (for admins)
 * - Responsive table (desktop) and cards (mobile)
 * - Pagination for large guilds
 * 
 * Usage:
 * <GuildMemberList guildId="123" canManage={true} />
 */

'use client'

import { useState, useEffect } from 'react'
import { WorkspacePremiumIcon, MilitaryTechIcon, MoreIcon } from '@/components/icons'

export interface GuildMember {
  address: string
  username: string
  role: 'owner' | 'officer' | 'member'
  joinedAt: string
  pointsContributed: number
  avatarUrl?: string
}

export interface GuildMemberListProps {
  guildId: string
  canManage?: boolean
}

export function GuildMemberList({ guildId, canManage = false }: GuildMemberListProps) {
  const [members, setMembers] = useState<GuildMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/guild/${guildId}/members`)
        if (!response.ok) throw new Error('Failed to load members')
        const data = await response.json()
        setMembers(data.members || [])
      } catch (err) {
        console.error('Failed to load members:', err)
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

  const handleAction = async (action: string, memberAddress: string) => {
    if (!confirm(`Are you sure you want to ${action} this member?`)) return
    try {
      const response = await fetch(`/api/guild/${guildId}/manage-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, memberAddress })
      })
      if (!response.ok) throw new Error(`Failed to ${action} member`)
      window.location.reload()
    } catch (err) {
      console.error(`Failed to ${action} member:`, err)
      alert(`Failed to ${action} member. Please try again.`)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg h-20" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
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
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {member.username}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {member.address.slice(0, 6)}...{member.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {getRoleBadge(member.role)}
                </td>
                <td className="py-4 px-6 text-right font-semibold text-gray-900 dark:text-white">
                  {member.pointsContributed.toLocaleString()}
                </td>
                <td className="py-4 px-6 text-right text-sm text-gray-600 dark:text-gray-400">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {canManage && member.role !== 'owner' && (
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      {member.role === 'member' && (
                        <button
                          onClick={() => handleAction('promote', member.address)}
                          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500"
                        >
                          Promote
                        </button>
                      )}
                      {member.role === 'officer' && (
                        <button
                          onClick={() => handleAction('demote', member.address)}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[44px] focus:ring-2 focus:ring-gray-500"
                        >
                          Demote
                        </button>
                      )}
                      <button
                        onClick={() => handleAction('kick', member.address)}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors min-h-[44px] focus:ring-2 focus:ring-red-500"
                      >
                        Kick
                      </button>
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
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {member.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {member.username}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {member.address.slice(0, 6)}...{member.address.slice(-4)}
                  </div>
                </div>
              </div>
              {getRoleBadge(member.role)}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contributed
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {member.pointsContributed.toLocaleString()}
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
                {member.role === 'member' && (
                  <button
                    onClick={() => handleAction('promote', member.address)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors min-h-[44px] focus:ring-2 focus:ring-blue-500"
                  >
                    Promote
                  </button>
                )}
                {member.role === 'officer' && (
                  <button
                    onClick={() => handleAction('demote', member.address)}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[44px] focus:ring-2 focus:ring-gray-500"
                  >
                    Demote
                  </button>
                )}
                <button
                  onClick={() => handleAction('kick', member.address)}
                  className="flex-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors min-h-[44px] focus:ring-2 focus:ring-red-500"
                >
                  Kick
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GuildMemberList
