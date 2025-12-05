/**
 * Quest Creation System Types
 * Task 8.5: Quest Creation UI
 * 
 * Extended types for quest creation wizard
 */

import type { QuestCategory, QuestDifficulty, QuestType } from '@/lib/supabase/types/quest'

export interface QuestTemplate {
  id: string
  name: string
  description: string
  category: QuestCategory
  difficulty: QuestDifficulty
  cost_points: number
  template_data: QuestDraft
  usage_count: number
  preview_image?: string
  created_by: string
  is_active: boolean
  created_at: string
}

export interface TaskConfig {
  id: string
  type: 'social' | 'onchain' | 'manual'
  title: string
  description: string
  verification_data: {
    // Social (Farcaster via Neynar API)
    target_fid?: number
    channel_id?: string
    cast_hash?: string
    required_text?: string
    
    // Onchain (Base RPC + proxy contract)
    token_address?: string
    nft_contract?: string
    min_amount?: string
    min_balance?: number
    
    // Manual (admin/creator approval)
    proof_required?: boolean
    answer?: string
  }
  required: boolean
  order: number
}

export interface QuestDraft {
  // Template
  template_id?: string
  
  // Basics
  title: string
  description: string
  category: QuestCategory
  difficulty: QuestDifficulty
  estimated_time: string
  
  // Dates
  starts_at?: string
  ends_at: string
  max_participants?: number
  
  // Tasks
  tasks: TaskConfig[]
  
  // Rewards
  reward_points: number // BASE POINTS (escrowed from creator)
  reward_xp?: number // XP (backend logic, NOT escrowed)
  reward_badge_ids?: string[] // Non-transferable badges
  create_new_badge?: boolean // Costs 50 BASE POINTS
  
  // Images
  cover_image_url?: string
  badge_image_url?: string
  image_url?: string // Quest banner image
  image_filename?: string // Filename for display
  
  // Post-publish options
  announce_via_bot?: boolean // Announce via @gmeowbased bot on Farcaster
  
  // Status
  is_draft?: boolean
  creator_fid?: number
}

export interface QuestCreationCost {
  base: number
  tasks: number
  rewards: number
  badge: number
  total: number
}

export interface QuestCreator {
  id: string
  fid: number
  total_quests_created: number
  total_points_spent: number
  active_quests: number
  max_active_quests: number
  created_at: string
}
