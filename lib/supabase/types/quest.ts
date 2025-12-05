/**
 * Professional Quest System Types
 * Phase 2.7: Quest Page Rebuild
 * 
 * TypeScript types for unified_quests schema + UI enhancements
 */

export type QuestCategory = 'onchain' | 'social';
export type QuestType = 'mint_nft' | 'swap_token' | 'provide_liquidity' | 'follow_user' | 'like_cast' | 'recast' | 'custom';
export type QuestStatus = 'active' | 'paused' | 'completed' | 'expired';
export type RewardMode = 'points' | 'token' | 'nft' | 'points_and_token';
export type QuestDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type UserQuestStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

/**
 * Multi-step quest task
 */
export interface QuestTask {
  id: number;
  title: string;
  description?: string;
  type: QuestType;
  verification_data: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
  completed_at?: string;
}

/**
 * Database schema: unified_quests table
 */
export interface Quest {
  id: number;
  created_at: string;
  
  // Basic info
  title: string;
  description: string;
  slug: string; // URL-friendly identifier (e.g., 'quest-1')
  category: QuestCategory;
  type: QuestType;
  
  // Creator
  creator_fid: number;
  creator_address?: string;
  
  // Rewards (XP + Points)
  reward_points: number; // Points awarded (currency)
  reward_xp?: number; // XP awarded (progression) - optional separate field
  reward_mode: RewardMode;
  token_reward_amount?: number;
  nft_reward_contract?: string;
  nft_reward_token_id?: number;
  
  // Verification
  verification_data: Record<string, any>;
  
  // Status & Limits
  status: QuestStatus;
  max_completions?: number;
  completion_count?: number;
  expiry_date?: string;
  
  // Professional UI Fields (Phase 2.7)
  cover_image_url?: string;
  badge_image_url?: string;
  thumbnail_url?: string;
  min_viral_xp_required: number;
  is_featured: boolean;
  featured_order?: number;
  difficulty?: QuestDifficulty;
  estimated_time_minutes?: number;
  tags: string[];
  participant_count: number;
  tasks: QuestTask[];
}

/**
 * Database schema: user_quest_progress table
 */
export interface UserQuestProgress {
  id: number;
  user_fid: number;
  quest_id: number;
  
  // Progress tracking
  current_task_index: number;
  completed_tasks: number[];
  progress_percentage: number;
  
  // Status
  status: UserQuestStatus;
  
  // Timestamps
  started_at: string;
  last_activity_at: string;
  completed_at?: string;
}

/**
 * Database schema: task_completions table
 */
export interface TaskCompletion {
  id: number;
  user_fid: number;
  quest_id: number;
  task_index: number;
  verification_proof: Record<string, any>;
  verified_at: string;
}

/**
 * Database schema: quest_completions table (existing)
 */
export interface QuestCompletion {
  id: number;
  created_at: string;
  quest_id: number;
  completer_fid: number;
  completer_address?: string;
  verification_proof: Record<string, any>;
  points_awarded: number; // Points earned (currency)
  xp_awarded?: number; // XP earned (progression) - optional separate tracking
  token_awarded?: number;
  nft_awarded_token_id?: number;
}

/**
 * Joined quest with user progress
 */
export interface QuestWithProgress extends Quest {
  user_progress?: UserQuestProgress;
  is_completed: boolean;
  is_locked: boolean; // Based on min_viral_xp_required
}

/**
 * Quest card display props
 */
export interface QuestCardData {
  id: number;
  title: string;
  slug: string;
  imageUrl: string;
  coverImage: string;
  category: QuestCategory;
  xpReward: number;
  participantCount: number;
  estimatedTime: string;
  difficulty?: QuestDifficulty;
  status: 'active' | 'upcoming' | 'locked';
  creator: {
    fid: number;
    name: string;
    avatar?: string;
  };
}

/**
 * Helper: Convert Quest to QuestCardData for UI components
 */
export function questToCardData(quest: Quest, userFid?: number): QuestCardData {
  return {
    id: quest.id,
    title: quest.title,
    slug: quest.slug || `quest-${quest.id}`, // Use slug from database, fallback to quest-ID
    imageUrl: quest.cover_image_url || '/images/quest-placeholder.jpg',
    coverImage: quest.cover_image_url || '/images/quest-placeholder.jpg',
    category: quest.category,
    xpReward: quest.reward_points, // reward_points represents Points (currency), but display as XP for now
    participantCount: quest.participant_count,
    estimatedTime: quest.estimated_time_minutes 
      ? `~${quest.estimated_time_minutes} min` 
      : '~10 min',
    difficulty: quest.difficulty,
    status: quest.status === 'active' ? 'active' : 'upcoming',
    creator: {
      fid: quest.creator_fid,
      name: `user${quest.creator_fid}`, // TODO: Join with user profile
      avatar: undefined,
    },
  };
}
