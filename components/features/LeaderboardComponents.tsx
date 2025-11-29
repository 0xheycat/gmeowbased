/**
 * Leaderboard Components - Gmeowbased
 * Ranking table with podium display and season tracking
 * Integrated with Gmeowbased token medals
 */

'use client'

import React from 'react'
import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import { QuestIcon } from '@/components/ui/QuestIcon'
import { tokenCredits } from '@/utils/assets'

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  score: number
  level: number
  change?: number
}

export type LeaderboardTimeframe = 'daily' | 'weekly' | 'monthly' | 'all-time'
export type LeaderboardEventType = 'all' | 'gm' | 'tips' | 'quests' | 'badges' | 'guilds' | 'referrals'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserRank?: number
}

export function LeaderboardTable({ entries, currentUserRank }: LeaderboardTableProps) {
  // Top 3 podium
  const topThree = entries.slice(0, 3)
  const remaining = entries.slice(3)

  return (
    <div className="space-y-6">
      {/* Podium */}
      {topThree.length > 0 && (
        <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 theme-gradient-warm">
          <div className="card-body">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="text-center order-2 lg:order-1">
                  <div className="relative inline-block mb-3">
                    <Image
                      src={topThree[1].avatar || '/assets/gmeow-illustrations/Avatars/Avatar_002.png'}
                      alt={topThree[1].username}
                      width={80}
                      height={80}
                      className="rounded-full ring-4 ring-gray-300"
                    />
                    <Image
                      src={tokenCredits.silver}
                      alt="2nd"
                      width={32}
                      height={32}
                      className="absolute -top-2 -right-2"
                    />
                  </div>
                  <h5 className="font-bold text-default-800">{topThree[1].username}</h5>
                  <p className="text-2xl font-bold theme-text-secondary mb-1">{topThree[1].score.toLocaleString()}</p>
                  <span className="px-2 py-1 theme-bg-subtle theme-text-secondary rounded-full text-xs font-semibold">
                    Level {topThree[1].level}
                  </span>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="text-center order-1 lg:order-2 lg:-mt-4">
                  <div className="relative inline-block mb-3">
                    <Image
                      src={topThree[0].avatar || '/assets/gmeow-illustrations/Avatars/Avatar_001.png'}
                      alt={topThree[0].username}
                      width={100}
                      height={100}
                      className="rounded-full ring-4 ring-yellow-400"
                    />
                    <Image
                      src={tokenCredits.gold}
                      alt="1st"
                      width={40}
                      height={40}
                      className="absolute -top-2 -right-2"
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                      <span className="text-3xl">👑</span>
                    </div>
                  </div>
                  <h5 className="font-bold text-default-800 text-lg">{topThree[0].username}</h5>
                  <p className="text-3xl font-bold text-yellow-600 mb-1">{topThree[0].score.toLocaleString()}</p>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    Level {topThree[0].level}
                  </span>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="text-center order-3">
                  <div className="relative inline-block mb-3">
                    <Image
                      src={topThree[2].avatar || '/assets/gmeow-illustrations/Avatars/Avatar_003.png'}
                      alt={topThree[2].username}
                      width={80}
                      height={80}
                      className="rounded-full ring-4 ring-orange-300"
                    />
                    <Image
                      src={tokenCredits.bronze}
                      alt="3rd"
                      width={32}
                      height={32}
                      className="absolute -top-2 -right-2"
                    />
                  </div>
                  <h5 className="font-bold text-default-800">{topThree[2].username}</h5>
                  <p className="text-2xl font-bold text-orange-600 mb-1">{topThree[2].score.toLocaleString()}</p>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                    Level {topThree[2].level}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rest of leaderboard */}
      {remaining.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="theme-bg-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-default-700">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-default-700">Player</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-default-700">Level</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-default-700">Score</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-default-700">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {remaining.map(entry => (
                    <tr
                      key={entry.userId}
                      className={`border-b border-default-200 theme-hover-bg-subtle transition-colors ${
                        entry.rank === currentUserRank ? 'theme-bg-brand-subtle' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-default-700">#{entry.rank}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Image
                            src={entry.avatar || '/assets/gmeow-illustrations/Avatars/Avatar_001.png'}
                            alt={entry.username}
                            width={36}
                            height={36}
                            className="rounded-full"
                          />
                          <span className="font-medium text-default-800">{entry.username}</span>
                          {entry.rank === currentUserRank && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-default-100 text-default-700 rounded-full text-xs font-semibold">
                          {entry.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-default-800">{entry.score.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {entry.change !== undefined && (
                            <>
                              {entry.change > 0 ? (
                                <>
                                  <span className="text-green-600 text-lg">↑</span>
                                  <span className="text-xs font-semibold text-green-600">+{entry.change}</span>
                                </>
                              ) : entry.change < 0 ? (
                                <>
                                  <span className="text-red-600 text-lg">↓</span>
                                  <span className="text-xs font-semibold text-red-600">{entry.change}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-default-400 text-lg">−</span>
                                  <span className="text-xs text-default-500">0</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface LeaderboardFiltersProps {
  timeframe: LeaderboardTimeframe
  onTimeframeChange: (timeframe: LeaderboardTimeframe) => void
  eventType?: LeaderboardEventType
  onEventTypeChange?: (eventType: LeaderboardEventType) => void
}

export function LeaderboardFilters({ timeframe, onTimeframeChange, eventType = 'all', onEventTypeChange }: LeaderboardFiltersProps) {
  const timeframes: Array<{ value: LeaderboardTimeframe; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'all-time', label: 'All Time' },
  ]

  const eventTypes: Array<{ value: LeaderboardEventType; label: string; icon: any }> = [
    { value: 'all', label: 'All Events', icon: 'onchain' },
    { value: 'gm', label: 'GM', icon: 'daily_gm' },
    { value: 'tips', label: 'Tips', icon: 'tip_received' },
    { value: 'quests', label: 'Quests', icon: 'quest_claim' },
    { value: 'badges', label: 'Badges', icon: 'badge_mint' },
    { value: 'guilds', label: 'Guilds', icon: 'guild_join' },
    { value: 'referrals', label: 'Referrals', icon: 'referral_success' }
  ]

  return (
    <div className="space-y-4">
      {/* Timeframe Filters */}
      <div>
        <label className="block text-sm font-medium theme-text-secondary mb-2">Timeframe</label>
        <div className="flex flex-wrap gap-2">
          {timeframes.map(tf => (
            <button
              key={tf.value}
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                timeframe === tf.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-default-100 text-default-700 hover:bg-default-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event Type Filters */}
      {onEventTypeChange && (
        <div>
          <label className="block text-sm font-medium theme-text-secondary mb-2">Event Type</label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map(et => (
              <button
                key={et.value}
                onClick={() => onEventTypeChange(et.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                  eventType === et.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-default-100 text-default-700 hover:bg-default-200'
                }`}
              >
                <QuestIcon type={et.icon} size={16} />
                {et.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SeasonInfoProps {
  seasonNumber: number
  endsAt: string
  prizePool: string
}

export function SeasonInfo({ seasonNumber, endsAt, prizePool }: SeasonInfoProps) {
  return (
    <div className="card bg-gradient-to-r from-purple-600 to-purple-700 mb-6">
      <div className="card-body">
        <div className="flex items-center justify-between text-white">
          <div>
            <h5 className="text-lg font-bold mb-1">Season {seasonNumber}</h5>
            <p className="text-white/80 text-sm">Ends {new Date(endsAt).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80 mb-1">Prize Pool</p>
            <p className="text-2xl font-bold">{prizePool}</p>
          </div>
          <Icon name="trophy" size={48} className="opacity-30" />
        </div>
      </div>
    </div>
  )
}

/**
 * Leaderboard - Wrapper component for page integration
 */
interface LeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
  timeframe: LeaderboardTimeframe
  onTimeframeChange?: (timeframe: LeaderboardTimeframe) => void
  eventType?: LeaderboardEventType
  onEventTypeChange?: (eventType: LeaderboardEventType) => void
}

export function Leaderboard({ entries, currentUserId, timeframe, onTimeframeChange, eventType = 'all', onEventTypeChange }: LeaderboardProps) {
  const currentUserRank = entries.find(e => e.userId === currentUserId)?.rank

  return (
    <div className="space-y-6">
      {onTimeframeChange && (
        <LeaderboardFilters 
          timeframe={timeframe} 
          onTimeframeChange={onTimeframeChange}
          eventType={eventType}
          onEventTypeChange={onEventTypeChange}
        />
      )}
      <LeaderboardTable entries={entries} currentUserRank={currentUserRank} />
    </div>
  )
}
