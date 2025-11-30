/**
 * Guild Components - Gmeowbased
 * Card grid layout for guild browsing and management
 * Integrated with Gmeowbased v0.1 assets
 */

'use client'

import React from 'react'
import Image from 'next/image'
import { Icon } from 'components(old)/ui/Icon'
import { stoneCredits } from '@/utils/assets'

export interface Guild {
  id: string
  name: string
  description: string
  memberCount: number
  maxMembers: number
  treasury: number
  level: number
  rank: number
  icon?: string
  isJoined?: boolean
  featured?: boolean
}

interface GuildCardProps {
  guild: Guild
  onJoin?: (guildId: string) => void
  onLeave?: (guildId: string) => void
  loading?: boolean
}

export function GuildCard({ guild, onJoin, onLeave, loading }: GuildCardProps) {
  const memberPercentage = (guild.memberCount / guild.maxMembers) * 100

  return (
    <div className={`card hover:shadow-lg transition-all ${guild.featured ? 'border-2 border-purple-500' : ''}`}>
      <div className="card-body">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {guild.icon ? (
              <Image src={guild.icon} alt={guild.name} width={48} height={48} className="rounded-full" />
            ) : (
              <div className="size-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <Icon name="groups" size={24} className="invert" />
              </div>
            )}
            <div>
              <h5 className="font-semibold text-default-800 flex items-center gap-2">
                {guild.name}
                {guild.rank <= 3 && <span className="text-yellow-500 text-xl">👑</span>}
              </h5>
              <p className="text-xs text-default-500">Level {guild.level} Guild</p>
            </div>
          </div>
          
          {guild.featured && (
            <span className="px-2 py-1 text-xs font-medium theme-bg-brand-subtle text-purple-700 rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-default-600 mb-4 line-clamp-2">{guild.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="theme-bg-subtle rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
                <Icon name="groups" size={16} />
              <p className="text-xs text-default-500">Members</p>
            </div>
            <p className="text-lg font-semibold text-default-800">
              {guild.memberCount}/{guild.maxMembers}
            </p>
            {/* Member capacity bar */}
            <div className="w-full bg-default-200 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  memberPercentage >= 90 ? 'bg-red-600' : memberPercentage >= 70 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${memberPercentage}%` }}
              />
            </div>
          </div>

          <div className="theme-bg-subtle rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
                <Icon name="credits" size={16} />
              <p className="text-xs text-default-500">Treasury</p>
            </div>
            <div className="flex items-center gap-1">
              <Image src={stoneCredits.emerald} alt="Treasury" width={16} height={16} />
              <p className="text-lg font-semibold text-default-800">
                {guild.treasury.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Rank badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
              <Icon name="rank" size={16} />
            <span className="text-sm text-default-600">Rank #{guild.rank}</span>
          </div>
        </div>

        {/* Action button */}
        {guild.isJoined ? (
          <button
            type="button"
            className="btn w-full border border-red-600 text-red-600 bg-transparent hover:bg-red-600/10"
            onClick={() => onLeave?.(guild.id)}
            disabled={loading}
          >
            {loading ? 'Leaving...' : 'Leave Guild'}
          </button>
        ) : memberPercentage >= 100 ? (
          <button
            type="button"
            className="btn w-full border border-default-300 bg-default-100 text-default-500 cursor-not-allowed"
            disabled
          >
            Guild Full
          </button>
        ) : (
          <button
            type="button"
            className="btn w-full border border-purple-600 text-purple-600 bg-transparent hover:bg-purple-600/10"
            onClick={() => onJoin?.(guild.id)}
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Guild'}
          </button>
        )}
      </div>
    </div>
  )
}

interface GuildGridProps {
  guilds: Guild[]
  onJoin?: (guildId: string) => void
  onLeave?: (guildId: string) => void
  loading?: boolean
}

export function GuildGrid({ guilds, onJoin, onLeave, loading }: GuildGridProps) {
  return (
    <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-5">
      {guilds.map(guild => (
        <GuildCard
          key={guild.id}
          guild={guild}
          onJoin={onJoin}
          onLeave={onLeave}
          loading={loading}
        />
      ))}
    </div>
  )
}

interface GuildStatsProps {
  totalGuilds: number
  myGuilds: number
  totalMembers: number
  topRank: number
}

export function GuildStats({ totalGuilds, myGuilds, totalMembers, topRank }: GuildStatsProps) {
  return (
    <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-5 mb-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-brand-subtle">
                <Icon name="groups" size={24} />
            </div>
            <div>
              <p className="text-default-500 text-sm">Total Guilds</p>
              <h4 className="text-2xl font-semibold text-default-800">{totalGuilds}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-success-subtle">
                <span className="text-2xl">👑</span>
            </div>
            <div>
              <p className="text-default-500 text-sm">My Guilds</p>
              <h4 className="text-2xl font-semibold text-default-800">{myGuilds}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-info-subtle">
                <Icon name="members" size={24} />
            </div>
            <div>
              <p className="text-default-500 text-sm">Members</p>
              <h4 className="text-2xl font-semibold text-default-800">{totalMembers}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg theme-bg-warning-subtle">
                <Icon name="trophy" size={24} />
            </div>
            <div>
              <p className="text-default-500 text-sm">Top Rank</p>
              <h4 className="text-2xl font-semibold text-default-800">#{topRank}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * GuildList - Wrapper component for guild page integration
 */
interface GuildListProps {
  guilds: Guild[]
  onJoin?: (guildId: string) => void
  onLeave?: (guildId: string) => void
  onView?: (guildId: string) => void
}

export function GuildList({ guilds, onJoin, onLeave }: GuildListProps) {
  return <GuildGrid guilds={guilds} onJoin={onJoin} onLeave={onLeave} />
}
