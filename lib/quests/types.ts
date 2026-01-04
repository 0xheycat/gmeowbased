/**
 * Quest Creation System Types
 * Phase 7.5: Comprehensive Headers
 * 
 * FEATURES:
 * - Type definitions for quest creation wizard
 * - QuestTemplate interface with usage tracking
 * - TaskConfig with multi-type verification support
 * - QuestDraft for wizard state management
 * - Social verification types (Farcaster via Neynar)
 * - Onchain verification types (Base RPC + proxy)
 * - Manual verification types (admin approval)
 * - Reward configuration types (points, XP, badges, NFTs)
 * - Image upload tracking (URLs and filenames)
 * 
 * TODO:
 * - Add branded types for quest IDs (type safety)
 * - Implement discriminated unions for verification data
 * - Add Zod schema generation from TypeScript types
 * - Support task dependencies (prerequisite tasks)
 * - Add quest versioning types
 * - Implement quest diff types for updates
 * - Add quest analytics types
 * 
 * CRITICAL:
 * - All types must match Supabase schema exactly (no drift)
 * - Verification data must be validated at runtime (Zod)
 * - Optional fields must have undefined handling
 * - BigInt types must be serializable (convert to string)
 * 
 * SUGGESTIONS:
 * - Consider splitting into multiple type modules by domain
 * - Add JSDoc comments for complex types
 * - Implement type guards for runtime validation
 * - Add utility types for common transformations
 * 
 * AVOID:
 * - Using 'any' types (defeats TypeScript benefits)
 * - Duplicating types from other modules (import instead)
 * - Creating types that don't match database schema
 * - Defining types without validation schemas
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * Related: lib/supabase/types/quest.ts, quest-creation-validation.ts
 * Quality Gates: GI-20 (Type Safety)
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
    // Verification type (REQUIRED for quest verification to work)
    type?: string // e.g., 'follow_user', 'like_cast', 'mint_nft', etc.
    
    // Social (Farcaster via Neynar API)
    target_fid?: number
    target_cast_hash?: string // For like_cast, recast, reply_to_cast
    required_tag?: string // For create_cast_with_tag
    target_channel_id?: string // For join_channel
    channel_id?: string // Legacy
    cast_hash?: string // Legacy
    required_text?: string // Legacy
    
    // Onchain (Base RPC + proxy contract)
    token_address?: string // For swap_token
    nft_contract?: string // For mint_nft
    min_amount?: string // For swap_token
    min_balance?: number // For mint_nft
    pool_address?: string // For provide_liquidity
    min_lp_tokens?: string // For provide_liquidity
    transaction_hash?: string // For bridge
    contract_address?: string // For custom
    function_signature?: string // For custom
    
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
  reward_points_awarded: number // BASE POINTS (escrowed from creator)
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
