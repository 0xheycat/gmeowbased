/**
 * API Service Layer
 * Clean wrappers around preserved business logic APIs
 * Uses fetch with proper error handling and TypeScript types
 */

// Base API configuration
const API_BASE = '/api'

type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

// ========================================
// Daily GM API
// ========================================

export type GMStatus = {
  canGM: boolean
  streak: number
  lastGM?: string
  nextMilestone: number
  xpEarned: number
}

export async function getGMStatus(fid: number): Promise<GMStatus> {
  const response = await fetch(`${API_BASE}/frame/identify?fid=${fid}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch GM status: ${response.statusText}`)
  }
  const data = await response.json()
  
  // Transform API response to match component interface
  return {
    canGM: data.canGM ?? true,
    streak: data.streak ?? 0,
    lastGM: data.lastGM,
    nextMilestone: Math.ceil((data.streak ?? 0) / 7) * 7,
    xpEarned: data.xpEarned ?? 0,
  }
}

export async function recordGM(fid: number, chain: string = 'base'): Promise<ApiResponse<GMStatus>> {
  try {
    const response = await fetch(`${API_BASE}/frame/gm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fid, chain }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.reason || 'Failed to record GM',
      }
    }
    
    return {
      success: true,
      data: {
        canGM: false,
        streak: data.streak ?? 0,
        xpEarned: data.xpEarned ?? 10,
        nextMilestone: Math.ceil((data.streak ?? 0) / 7) * 7,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// ========================================
// Quest API
// ========================================

export type QuestStatus = 'active' | 'completed' | 'expired'
export type QuestDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'

export type QuestData = {
  id: string
  title: string
  description: string
  reward: number
  difficulty: QuestDifficulty
  category: string
  chain: string
  status: QuestStatus
  progress?: number
  maxProgress?: number
  icon?: string
}

export async function fetchQuests(fid?: number): Promise<QuestData[]> {
  const url = fid ? `${API_BASE}/quests?fid=${fid}` : `${API_BASE}/quests`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch quests: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.quests || []
}

export async function startQuest(questId: string, fid: number, chain: string = 'base'): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE}/quests/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId, fid, chain }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to start quest' }
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

export async function claimQuestReward(
  questId: string,
  address: string,
  chain: string = 'base',
  metaHash?: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE}/quests/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId, address, chain, metaHash }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.reason || 'Failed to claim reward' }
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// ========================================
// Guild API
// ========================================

export type GuildData = {
  id: string
  name: string
  description: string
  memberCount: number
  maxMembers: number
  treasury: number
  rank: number
  icon?: string
  level: number
  isJoined?: boolean
}

export async function fetchGuilds(fid?: number): Promise<GuildData[]> {
  const url = fid ? `${API_BASE}/guilds?fid=${fid}` : `${API_BASE}/guilds`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch guilds: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.guilds || []
}

export async function joinGuild(guildId: string, fid: number, address: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE}/guilds/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, fid, address }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to join guild' }
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

export async function leaveGuild(guildId: string, fid: number): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`${API_BASE}/guilds/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId, fid }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to leave guild' }
    }
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

// ========================================
// Profile API
// ========================================

export type ProfileData = {
  id: string
  username: string
  avatar?: string
  level: number
  xp: number
  xpToNextLevel: number
  rank: number
  totalUsers?: number
  streak: number
  badgesEarned: number
  questsCompleted: number
  guildsJoined: number
}

export type ActivityType = 'quest' | 'badge' | 'guild' | 'gm' | 'level'

export type ActivityData = {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  icon?: string
}

export async function fetchProfile(fid: number): Promise<ProfileData> {
  const response = await fetch(`${API_BASE}/frame/identify?fid=${fid}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  // Transform API response to match component interface
  return {
    id: String(fid),
    username: data.username || data.displayName || `User ${fid}`,
    avatar: data.pfpUrl || data.avatar,
    level: data.level ?? 1,
    xp: data.xp ?? 0,
    xpToNextLevel: data.xpToNextLevel ?? 1000,
    rank: data.rank ?? 0,
    totalUsers: data.totalUsers,
    streak: data.streak ?? 0,
    badgesEarned: data.badgesEarned ?? 0,
    questsCompleted: data.questsCompleted ?? 0,
    guildsJoined: data.guildsJoined ?? 0,
  }
}

export async function fetchActivities(fid: number, limit: number = 10): Promise<ActivityData[]> {
  const response = await fetch(`${API_BASE}/analytics/summary?fid=${fid}&limit=${limit}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.activities || []
}

// ========================================
// Badge API
// ========================================

export type BadgeRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'

export type BadgeData = {
  id: string
  name: string
  description: string
  rarity: BadgeRarity
  image?: string
  emoji?: string
  unlockedAt?: string
  isLocked?: boolean
}

export async function fetchBadges(fid: number): Promise<BadgeData[]> {
  const response = await fetch(`${API_BASE}/badges/list?fid=${fid}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch badges: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  // Transform API response
  return (data.badges || []).map((badge: any) => ({
    id: badge.id || badge.badgeId,
    name: badge.name || badge.title,
    description: badge.description || '',
    rarity: badge.rarity || 'Common',
    image: badge.imageUrl || badge.image,
    emoji: badge.emoji,
    unlockedAt: badge.mintedAt || badge.unlockedAt,
    isLocked: !badge.minted && !badge.unlocked,
  }))
}

// ========================================
// Leaderboard API
// ========================================

export type LeaderboardEntry = {
  rank: number
  userId: string
  username: string
  avatar?: string
  score: number
  level: number
  change?: number
}

export type LeaderboardTimeframe = 'daily' | 'weekly' | 'monthly' | 'all-time'

export async function fetchLeaderboard(
  timeframe: LeaderboardTimeframe = 'all-time',
  offset: number = 0,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const response = await fetch(
    `${API_BASE}/leaderboard?timeframe=${timeframe}&offset=${offset}&limit=${limit}`
  )
  
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  // Transform API response
  return (data.top || []).map((entry: any) => ({
    rank: entry.rank || entry.position,
    userId: entry.address || entry.fid,
    username: entry.name || entry.displayName || `User ${entry.fid}`,
    avatar: entry.pfpUrl || entry.avatar,
    score: entry.points || entry.xp || 0,
    level: entry.level ?? 1,
    change: entry.change || entry.delta || 0,
  }))
}
