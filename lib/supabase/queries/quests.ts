/**
 * Professional Quest System Queries
 * Phase 2.7: Quest Page Rebuild
 * 
 * Supabase queries for quest CRUD + progress tracking
 */

import { getSupabaseServerClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase'
import type { Quest, UserQuestProgress, QuestWithProgress } from '../types/quest';
import { getMockActiveQuests, getMockFeaturedQuests, getMockQuest } from '../mock-quest-data';

// Toggle to use mock data for development/testing
// PRODUCTION FIX: Changed to false to use real database queries
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_QUESTS === 'true';

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
  
  return data as unknown as Quest[];
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
  
  return data as unknown as Quest[];
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
  
  const { data: quest, error: questError } = await query.single() as { data: Database['public']['Tables']['unified_quests']['Row'], error: any };
  
  if (questError || !quest) {
    console.error('Failed to fetch quest:', questError);
    return null;
  }
  
  // Get user progress if userFid provided
  let userProgress: UserQuestProgress | undefined;
  if (userFid) {
    console.log('[getQuestBySlug] Querying progress:', {
      questId: quest.id,
      userFid,
      questSlug: quest.slug
    });
    
    const progressQuery = await supabase
      .from('user_quest_progress')
      .select('*')
      .eq('quest_id', quest.id)
      .eq('user_fid', userFid)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid throwing on no rows
    
    const { data: progress, error: progressError } = progressQuery as { data: Database['public']['Tables']['user_quest_progress']['Row'] | null, error: any };
    
    if (progressError) {
      console.error('[getQuestBySlug] Progress query error:', {
        error: progressError,
        questId: quest.id,
        userFid,
        slug
      });
    }
    
    console.log('[getQuestBySlug] Progress query result:', {
      questId: quest.id,
      questSlug: quest.slug,
      userFid,
      hasProgress: !!progress,
      progressData: progress,
      status: progress?.status,
      completedAt: progress?.completed_at
    });
    
    userProgress = progress as unknown as UserQuestProgress || undefined;
  }
  
  // Check if completed
  const isCompleted = userProgress?.status === 'completed';
  
  // Check if locked (viral points requirement)
  let isLocked = false;
  if (userFid && quest.min_viral_xp_required && quest.min_viral_xp_required > 0) {
    const { data: pointsData } = await (supabase as any)
      .from('user_points_balances')
      .select('viral_xp')
      .eq('fid', userFid)
      .single();
    
    const userViralPoints = pointsData?.viral_xp || 0;
    isLocked = userViralPoints < quest.min_viral_xp_required;
  }
  
  return {
    ...quest,
    user_progress: userProgress,
    is_completed: isCompleted,
    is_locked: isLocked,
  } as unknown as QuestWithProgress;
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
  
  const { data, error } = await (supabase as any)
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
 * PRODUCTION FIX: Now distributes XP and handles quest completion rewards
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
  
  // First, get quest details to check if this is the final task
  // SCHEMA FIX: Use correct column names after migration 003
  const { data: questData, error: questError } = await supabase
    .from('unified_quests')
    .select('id, reward_points_awarded, tasks')
    .eq('id', questId)
    .single();
  
  if (questError || !questData) {
    console.error('Failed to fetch quest details:', questError);
    return { success: false, message: 'Quest not found' };
  }
  
  const tasks = (questData.tasks as any[]) || [];
  const isFinalTask = taskIndex + 1 >= tasks.length;
  
  // Bug #31 Fix: Check if task is already completed (prevent duplicate insert)
  const { data: existingCompletion } = await supabase
    .from('task_completions')
    .select('task_index')
    .eq('user_fid', userFid)
    .eq('quest_id', questId)
    .eq('task_index', taskIndex)
    .maybeSingle();
  
  if (existingCompletion) {
    console.log('[Bug #31] Task already completed, skipping insert:', {
      userFid,
      questId,
      taskIndex
    });
    // Task already completed, return success (idempotent operation)
    return { 
      success: true, 
      message: 'Task already completed',
      already_completed: true 
    };
  }
  
  // Record task completion
  const { error: taskError } = await (supabase as any)
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
  
  // Bug #24 Fix: Verify RPC actually updated the array
  const { data: progressCheck } = await supabase
    .from('user_quest_progress')
    .select('completed_tasks')
    .eq('user_fid', userFid)
    .eq('quest_id', questId)
    .single();
  
  if (!progressCheck?.completed_tasks?.includes(taskIndex)) {
    console.error('[BUG #24] Task not in array after RPC:', {
      expected: taskIndex,
      actual: progressCheck?.completed_tasks,
      userFid,
      questId
    });
  }
  
  // BUG #24 FIX: Verify RPC actually updated the completed_tasks array
  const { data: verifyProgress, error: verifyError } = await supabase
    .from('user_quest_progress')
    .select('completed_tasks, progress_percentage')
    .eq('user_fid', userFid)
    .eq('quest_id', questId)
    .single();
  
  if (verifyError) {
    console.error('[BUG #24] Failed to verify progress update:', verifyError);
    // Don't fail the quest, task_completions record exists
  } else if (!verifyProgress?.completed_tasks?.includes(taskIndex)) {
    console.error('[BUG #24] Task not in completed_tasks array after RPC:', {
      expected: taskIndex,
      actual: verifyProgress?.completed_tasks,
      userFid,
      questId,
    });
    // Attempt to fix by calling RPC again (idempotent)
    const { error: retryError } = await supabase.rpc(
      'update_user_quest_progress',
      { p_user_fid: userFid, p_quest_id: questId, p_task_index: taskIndex }
    );
    if (retryError) {
      console.error('[BUG #24] Retry RPC failed:', retryError);
    } else {
      console.log('[BUG #24] Retry RPC succeeded');
    }
  } else {
    console.log('[BUG #24] Progress verification passed:', {
      taskIndex,
      completed_tasks: verifyProgress.completed_tasks,
      progress_percentage: verifyProgress.progress_percentage,
    });
  }
  
  // PRODUCTION FIX: Award XP if this is the final task
  // XP is unified/off-chain and separate from Points (onchain)
  // XP is calculated based on quest category (backend logic, not stored in quest definition)
  if (isFinalTask) {
    const pointsAwarded = (questData.reward_points_awarded as number) || 0;
    
    // Quest-category-based XP multipliers
    const XP_MULTIPLIERS: Record<string, number> = {
      social: 1.0,     // Daily social quests
      onchain: 1.5,    // Onchain verification quests
      creative: 1.2,   // Creative/content quests
      learn: 1.0,      // Educational quests
      hybrid: 2.0,     // Hybrid (social + onchain)
      custom: 1.0,     // Default
    };
    
    // Use category field (exists in unified_quests schema)
    const questCategory = ((questData as any).category as string) || 'custom';
    const multiplier = XP_MULTIPLIERS[questCategory] || 1.0;
    const xpAmount = Math.floor(pointsAwarded * multiplier);
    
    if (xpAmount > 0) {
      const { error: xpError } = await supabase.rpc('increment_user_xp', {
        p_fid: userFid,
        p_xp_amount: xpAmount,
        p_source: `quest_${questCategory}_${questId}`,
      });
      
      if (xpError) {
        console.error('Failed to award XP:', xpError);
        // Don't fail the quest completion, just log the error
      }
    }
    
    // Record quest completion
    const { error: completionError } = await supabase
      .from('quest_completions')
      .insert({
        quest_id: questId,
        completer_fid: userFid,
        completer_address: '', // TODO: Get from user session
        verification_proof: verificationProof,
        points_awarded: (questData.reward_points_awarded as number) || 0,
      });
    
    if (completionError) {
      console.error('Failed to record quest completion:', completionError);
      // Already awarded XP, so don't fail here
    }
  }
  
  return { success: true, message: 'Task completed successfully', quest_completed: isFinalTask };
}

/**
 * Check if user meets viral XP requirement (offline Farcaster engagement metric).
 * Note: Viral XP is a progression system (separate from Points currency).
 */
export async function checkViralXpRequirement(userFid: number, questId: number) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[Query] Supabase client not available");
    return null;
  }
  
  const { data, error } = await supabase.rpc('user_meets_viral_xp_requirement', {
    p_user_fid: userFid,
    p_quest_id: 0, // Pass quest ID if checking specific quest requirement
  });
  
  if (error) {
    console.error('Failed to check viral XP requirement:', error);
    return false;
  }
  
  return data as boolean;
}
