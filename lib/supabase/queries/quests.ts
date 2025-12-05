/**
 * Professional Quest System Queries
 * Phase 2.7: Quest Page Rebuild
 * 
 * Supabase queries for quest CRUD + progress tracking
 */

import { getSupabaseServerClient } from '@/lib/supabase';
import type { Quest, UserQuestProgress, QuestWithProgress } from '../types/quest';
import { getMockActiveQuests, getMockFeaturedQuests, getMockQuest } from '../mock-quest-data';

// Toggle to use mock data for development/testing
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_QUESTS === 'true' || true;

/**
 * Get all active quests with optional filtering
 */
export async function getActiveQuests(params?: {
  category?: 'onchain' | 'social';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  search?: string;
  userFid?: number;
}): Promise<Quest[]> {
  // Use mock data for testing
  if (USE_MOCK_DATA) {
    console.log('[getActiveQuests] Using mock data for testing');
    return getMockActiveQuests({
      category: params?.category,
      difficulty: params?.difficulty,
      search: params?.search,
    });
  }

  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    console.error('[getActiveQuests] Supabase client not available, using mock data');
    return getMockActiveQuests(params);
  }
  
  let query = supabase
    .from('unified_quests')
    .select('*')
    .eq('status', 'active')
    .order('participant_count', { ascending: false });
  
  // Apply filters
  if (params?.category) {
    query = query.eq('category', params.category);
  }
  
  if (params?.difficulty) {
    query = query.eq('difficulty', params.difficulty);
  }
  
  if (params?.tags && params.tags.length > 0) {
    query = query.overlaps('tags', params.tags);
  }
  
  if (params?.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Failed to fetch quests:', error);
    return [];
  }
  
  return data as Quest[];
}

/**
 * Get featured quests for homepage
 */
export async function getFeaturedQuests(limit = 6): Promise<Quest[] | null> {
  // Use mock data for testing
  if (USE_MOCK_DATA) {
    console.log('[getFeaturedQuests] Using mock data for testing');
    return getMockFeaturedQuests(limit);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available, using mock data");
    return getMockFeaturedQuests(limit);
  }
  
  const { data, error } = await supabase
    .from('unified_quests')
    .select('*')
    .eq('is_featured', true)
    .eq('status', 'active')
    .order('featured_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Failed to fetch featured quests:', error);
    return [];
  }
  
  return data as Quest[];
}

/**
 * Get single quest by slug or ID with user progress
 */
export async function getQuestBySlug(
  slug: string,
  userFid?: number
): Promise<QuestWithProgress | null> {
  // Try to parse as number (for backward compatibility with IDs)
  const questId = parseInt(slug);
  const isNumericId = !isNaN(questId);

  // Use mock data for testing
  if (USE_MOCK_DATA) {
    console.log(`[getQuestBySlug] Using mock data for quest ${slug}`);
    const quest = isNumericId ? getMockQuest(questId) : null;
    if (!quest) return null;
    
    return {
      ...quest,
      user_progress: undefined,
      is_completed: false,
      is_locked: quest.min_viral_xp_required > 0,
    };
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available, using mock data");
    const quest = isNumericId ? getMockQuest(questId) : null;
    if (!quest) return null;
    
    return {
      ...quest,
      user_progress: undefined,
      is_completed: false,
      is_locked: quest.min_viral_xp_required > 0,
    };
  }
  
  // Try to get quest by slug first, fallback to ID
  let query = supabase.from('unified_quests').select('*');
  
  if (isNumericId) {
    query = query.eq('id', questId);
  } else {
    // Assume slug field exists in database (to be added in migration)
    query = query.eq('slug', slug);
  }
  
  const { data: quest, error: questError } = await query.single();
  
  if (questError || !quest) {
    console.error('Failed to fetch quest:', questError);
    return null;
  }
  
  // Get user progress if userFid provided
  let userProgress: UserQuestProgress | undefined;
  if (userFid) {
    const { data: progress } = await supabase
      .from('user_quest_progress')
      .select('*')
      .eq('quest_id', quest.id)
      .eq('user_fid', userFid)
      .single();
    
    userProgress = progress || undefined;
  }
  
  // Check if completed
  const isCompleted = userProgress?.status === 'completed';
  
  // Check if locked (viral XP requirement)
  let isLocked = false;
  if (userFid && quest.min_viral_xp_required > 0) {
    const { data: leaderboard } = await supabase
      .from('leaderboard_weekly')
      .select('viral_xp')
      .eq('fid', userFid)
      .single();
    
    const userViralXp = leaderboard?.viral_xp || 0;
    isLocked = userViralXp < quest.min_viral_xp_required;
  }
  
  return {
    ...quest,
    user_progress: userProgress,
    is_completed: isCompleted,
    is_locked: isLocked,
  } as QuestWithProgress;
}

/**
 * Get single quest by ID with user progress (backward compatibility)
 */
export async function getQuestWithProgress(
  questId: number,
  userFid?: number
): Promise<QuestWithProgress | null> {
  // Use getQuestBySlug with questId converted to string
  return getQuestBySlug(questId.toString(), userFid);
}

/**
 * Get user's active quests (in progress)
 */
export async function getUserActiveQuests(userFid: number) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available");
    return null;
  }
  
  const { data, error } = await supabase
    .from('user_quest_progress')
    .select(`
      *,
      quest:unified_quests(*)
    `)
    .eq('user_fid', userFid)
    .eq('status', 'in_progress')
    .order('last_activity_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch user active quests:', error);
    return [];
  }
  
  return data;
}

/**
 * Get user's completed quests
 */
export async function getUserCompletedQuests(userFid: number) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available");
    return null;
  }
  
  const { data, error } = await supabase
    .from('quest_completions')
    .select(`
      *,
      quest:unified_quests(*)
    `)
    .eq('completer_fid', userFid)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch user completed quests:', error);
    return [];
  }
  
  return data;
}

/**
 * Start a quest (create initial progress record)
 */
export async function startQuest(userFid: number, questId: number) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available");
    return null;
  }
  
  // Check if already started
  const { data: existing } = await supabase
    .from('user_quest_progress')
    .select('id')
    .eq('user_fid', userFid)
    .eq('quest_id', questId)
    .single();
  
  if (existing) {
    return { success: true, message: 'Quest already started' };
  }
  
  // Create progress record
  const { error } = await supabase
    .from('user_quest_progress')
    .insert({
      user_fid: userFid,
      quest_id: questId,
      current_task_index: 0,
      completed_tasks: [],
      progress_percentage: 0,
      status: 'in_progress',
    });
  
  if (error) {
    console.error('Failed to start quest:', error);
    return { success: false, message: error.message };
  }
  
  return { success: true, message: 'Quest started successfully' };
}

/**
 * Complete a quest task
 */
export async function completeQuestTask(
  userFid: number,
  questId: number,
  taskIndex: number,
  verificationProof: Record<string, any>
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available");
    return null;
  }
  
  // Record task completion
  const { error: taskError } = await supabase
    .from('task_completions')
    .insert({
      user_fid: userFid,
      quest_id: questId,
      task_index: taskIndex,
      verification_proof: verificationProof,
    });
  
  if (taskError) {
    console.error('Failed to record task completion:', taskError);
    return { success: false, message: taskError.message };
  }
  
  // Update user progress (triggers participant count update)
  const { error: progressError } = await supabase.rpc(
    'update_user_quest_progress',
    {
      p_user_fid: userFid,
      p_quest_id: questId,
      p_task_index: taskIndex,
    }
  );
  
  if (progressError) {
    console.error('Failed to update progress:', progressError);
    return { success: false, message: progressError.message };
  }
  
  return { success: true, message: 'Task completed successfully' };
}

/**
 * Check if user meets viral XP requirement
 */
export async function checkViralXpRequirement(userFid: number, questId: number) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available");
    return null;
  }
  
  const { data, error } = await supabase.rpc('user_meets_viral_xp_requirement', {
    p_user_fid: userFid,
    p_quest_id: questId,
  });
  
  if (error) {
    console.error('Failed to check viral XP requirement:', error);
    return false;
  }
  
  return data as boolean;
}
