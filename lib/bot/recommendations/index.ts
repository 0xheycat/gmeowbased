// Smart quest recommendations based on user history
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { ChainKey } from '@/lib/contracts/gmeow-utils'

export type QuestRecommendation = {
  questId: number
  questName: string
  chain: ChainKey
  questType: string
  reward: number
  reason: string
  score: number
}

type UserQuestHistory = {
  completed: Set<string>
  chains: Map<ChainKey, number>
  types: Map<string, number>
  lastCompleted?: Date
  totalCompleted: number
}

async function fetchUserQuestHistory(address: string): Promise<UserQuestHistory> {
  const history: UserQuestHistory = {
    completed: new Set(),
    chains: new Map(),
    types: new Map(),
    totalCompleted: 0,
  }
  
  if (!isSupabaseConfigured()) return history
  
  const supabase = getSupabaseServerClient()
  if (!supabase) return history
  
  try {
    const { data, error } = await supabase
      .from('gmeow_rank_events')
      .select('event_type, event_detail, created_at, chain')
      .eq('wallet_address', address)
      .eq('event_type', 'quest-verify')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error || !data) return history
    
    for (const event of data) {
      history.totalCompleted++
      
      // Parse quest details from event_detail
      try {
        const detail = typeof event.event_detail === 'string' 
          ? JSON.parse(event.event_detail) 
          : event.event_detail
        
        if (detail?.questId) {
          const questKey = `${event.chain}:${detail.questId}`
          history.completed.add(questKey)
        }
        
        if (detail?.questType) {
          const currentCount = history.types.get(detail.questType) || 0
          history.types.set(detail.questType, currentCount + 1)
        }
      } catch {
        // Skip invalid event_detail
      }
      
      // Track chain usage
      if (event.chain) {
        const chainCount = history.chains.get(event.chain) || 0
        history.chains.set(event.chain, chainCount + 1)
      }
      
      // Track most recent completion
      if (event.created_at && !history.lastCompleted) {
        history.lastCompleted = new Date(event.created_at)
      }
    }
    
    return history
  } catch (error) {
    console.warn('[quest-recommendations] Failed to fetch history:', error)
    return history
  }
}

async function fetchAvailableQuests(): Promise<Array<{
  id: number
  quest_name: string
  chain: ChainKey
  quest_type: string
  reward_amount: number
  spots_remaining: number | null
  expires_at: string | null
  is_active: boolean
}>> {
  if (!isSupabaseConfigured()) return []
  
  const supabase = getSupabaseServerClient()
  if (!supabase) return []
  
  try {
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('quests')
      .select('id, quest_name, chain, quest_type, reward_amount, spots_remaining, expires_at, is_active')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('reward_amount', { ascending: false })
      .limit(50)
    
    if (error || !data) return []
    
    return data as any[]
  } catch (error) {
    console.warn('[quest-recommendations] Failed to fetch quests:', error)
    return []
  }
}

function scoreQuest(
  quest: {
    id: number
    quest_name: string
    chain: ChainKey
    quest_type: string
    reward_amount: number
    spots_remaining: number | null
  },
  history: UserQuestHistory
): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []
  
  const questKey = `${quest.chain}:${quest.id}`
  
  // Already completed? Score = 0
  if (history.completed.has(questKey)) {
    return { score: 0, reason: 'Already completed' }
  }
  
  // High reward quests get bonus
  if (quest.reward_amount >= 100) {
    score += 30
    reasons.push(`High reward (${quest.reward_amount} pts)`)
  } else if (quest.reward_amount >= 50) {
    score += 20
    reasons.push(`Good reward (${quest.reward_amount} pts)`)
  } else {
    score += 10
  }
  
  // User's preferred chain gets bonus
  const chainCount = history.chains.get(quest.chain) || 0
  if (chainCount > 0) {
    const chainBonus = Math.min(chainCount * 5, 25)
    score += chainBonus
    reasons.push(`You like ${quest.chain}`)
  }
  
  // User's preferred quest type gets bonus
  const typeCount = history.types.get(quest.quest_type) || 0
  if (typeCount > 0) {
    const typeBonus = Math.min(typeCount * 5, 20)
    score += typeBonus
    reasons.push(`You enjoy ${quest.quest_type}`)
  }
  
  // Limited spots create urgency
  if (quest.spots_remaining !== null) {
    if (quest.spots_remaining <= 10) {
      score += 25
      reasons.push('Only few spots left!')
    } else if (quest.spots_remaining <= 50) {
      score += 15
      reasons.push('Limited spots')
    }
  }
  
  // New user bonus - recommend popular types
  if (history.totalCompleted === 0) {
    if (['farcaster-follow', 'daily-gm', 'social-share'].includes(quest.quest_type)) {
      score += 20
      reasons.push('Great for beginners')
    }
  }
  
  // Streak bonus - recommend daily quests to active users
  if (history.lastCompleted) {
    const daysSinceLastQuest = (Date.now() - history.lastCompleted.getTime()) / (24 * 60 * 60 * 1000)
    
    if (daysSinceLastQuest < 1 && quest.quest_type.includes('daily')) {
      score += 15
      reasons.push('Keep your streak going!')
    }
  }
  
  const reason = reasons.length > 0 ? reasons.join(', ') : 'Available quest'
  
  return { score, reason }
}

export async function generateQuestRecommendations(
  address: string,
  limit: number = 3
): Promise<QuestRecommendation[]> {
  try {
    // Fetch user history and available quests in parallel
    const [history, quests] = await Promise.all([
      fetchUserQuestHistory(address),
      fetchAvailableQuests(),
    ])
    
    if (quests.length === 0) {
      return []
    }
    
    // Score each quest
    const scored = quests.map(quest => {
      const { score, reason } = scoreQuest(quest, history)
      
      return {
        questId: quest.id,
        questName: quest.quest_name,
        chain: quest.chain,
        questType: quest.quest_type,
        reward: quest.reward_amount,
        reason,
        score,
      }
    })
    
    // Sort by score and return top N
    const recommendations = scored
      .filter(q => q.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    
    return recommendations
  } catch (error) {
    console.warn('[quest-recommendations] Failed to generate recommendations:', error)
    return []
  }
}

export function formatQuestRecommendations(recommendations: QuestRecommendation[]): string {
  if (recommendations.length === 0) {
    return 'Check gmeowhq.art/quests for all available quests!'
  }
  
  const lines = ['🎯 Recommended quests for you:\n']
  
  recommendations.forEach((rec, index) => {
    lines.push(
      `${index + 1}. ${rec.questName} (${rec.chain.toUpperCase()}) — ${rec.reward} pts\n   ${rec.reason}`
    )
  })
  
  lines.push('\nStart: gmeowhq.art/quests')
  
  return lines.join('\n')
}
