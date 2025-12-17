/**
 * Points Escrow Service
 * Phase 3: Business Logic - Quest Creation System
 * Task 8.5: Quest Creation UI
 * 
 * Manages BASE POINTS escrow for quest creation:
 * - Deduct points from creator (leaderboard_calculations.base_points)
 * - Store escrow record in quest_creation_costs
 * - Refund unused points when quest expires
 * - Transaction safety with Supabase
 * 
 * Created: December 4, 2025
 */

import { getSupabaseServerClient } from '@/lib/supabase';
import { logError } from '@/lib/error-handler';

export interface EscrowPointsInput {
  fid: number;
  amount: number;
  questData: {
    title: string;
    category: string;
    slug?: string;
  };
}

export interface EscrowResult {
  success: boolean;
  error?: string;
  escrow_id?: string;
}

export interface RefundResult {
  success: boolean;
  amount_refunded?: number;
  error?: string;
}

/**
 * Escrow points from creator for quest creation
 * 
 * Transaction flow:
 * 1. Deduct points from leaderboard_calculations.base_points
 * 2. Insert escrow record in quest_creation_costs
 * 3. Return success/error
 * 
 * @param input - Escrow parameters
 * @returns Result with success status and escrow_id
 */
export async function escrowPoints(input: EscrowPointsInput): Promise<EscrowResult> {
  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    return {
      success: false,
      error: 'Database connection failed',
    };
  }
  
  try {
    // 1. GET CURRENT POINTS BALANCE
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard_calculations')
      .select('base_points')
      .eq('fid', input.fid)
      .single();
    
    if (leaderboardError || !leaderboardData) {
      return {
        success: false,
        error: 'Creator not found in leaderboard',
      };
    }
    
    const currentPoints = leaderboardData.base_points || 0;
    
    if (currentPoints < input.amount) {
      return {
        success: false,
        error: `Insufficient points: need ${input.amount}, have ${currentPoints}`,
      };
    }
    
    // 2. DEDUCT POINTS FROM LEADERBOARD
    const newBalance = currentPoints - input.amount;
    
    const { error: deductError } = await supabase
      .from('leaderboard_calculations')
      .update({ base_points: newBalance })
      .eq('fid', input.fid);
    
    if (deductError) {
      logError('Points deduction failed', {
        fid: input.fid,
        amount: input.amount,
        error: deductError,
      });
      
      return {
        success: false,
        error: 'Failed to deduct points from leaderboard',
      };
    }
    
    // 3. INSERT ESCROW RECORD (quest_creation_costs)
    // NOTE: quest_id will be updated after quest creation
    const { data: escrowData, error: escrowError } = await supabase
      .from('quest_creation_costs')
      .insert({
        creator_fid: input.fid,
        points_escrowed: input.amount,
        quest_title: input.questData.title,
        quest_category: input.questData.category,
        quest_slug: input.questData.slug || null,
        is_refunded: false,
      })
      .select('id')
      .single();
    
    if (escrowError) {
      // ROLLBACK: Restore points if escrow record fails
      await supabase
        .from('leaderboard_calculations')
        .update({ base_points: currentPoints })
        .eq('fid', input.fid);
      
      logError('Escrow record creation failed', {
        fid: input.fid,
        amount: input.amount,
        error: escrowError,
      });
      
      return {
        success: false,
        error: 'Failed to create escrow record',
      };
    }
    
    // 4. SUCCESS
    return {
      success: true,
      escrow_id: String(escrowData.id),
    };
    
  } catch (error) {
    logError('Escrow points error', {
      fid: input.fid,
      amount: input.amount,
      error,
    });
    
    return {
      success: false,
      error: 'Internal error during points escrow',
    };
  }
}

/**
 * Refund points to creator when quest expires
 * 
 * Refund logic:
 * - Total escrowed: creation cost
 * - Total spent: reward_points × completion_count
 * - Refund amount: escrowed - spent
 * 
 * @param questId - Quest ID to refund
 * @returns Result with refund amount
 */
export async function refundPoints(questId: number): Promise<RefundResult> {
  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    return {
      success: false,
      error: 'Database connection failed',
    };
  }
  
  try {
    // 1. GET QUEST DATA
    const { data: questData, error: questError } = await supabase
      .from('unified_quests')
      .select('creator_fid, reward_points, completion_count')
      .eq('id', questId)
      .single();
    
    if (questError || !questData) {
      return {
        success: false,
        error: 'Quest not found',
      };
    }
    
    // 2. GET ESCROW RECORD
    const { data: escrowData, error: escrowError } = await supabase
      .from('quest_creation_costs')
      .select('id, points_escrowed, is_refunded')
      .eq('quest_id', String(questId))
      .single();
    
    if (escrowError || !escrowData) {
      return {
        success: false,
        error: 'Escrow record not found',
      };
    }
    
    if (escrowData.is_refunded) {
      return {
        success: false,
        error: 'Points already refunded',
      };
    }
    
    // 3. CALCULATE REFUND AMOUNT
    const totalEscrowed = escrowData.points_escrowed;
    const totalSpent = questData.reward_points * (questData.completion_count || 0);
    const refundAmount = Math.max(0, totalEscrowed - totalSpent);
    
    if (refundAmount === 0) {
      // Mark as refunded even if nothing to refund
      await supabase
        .from('quest_creation_costs')
        .update({ is_refunded: true, refunded_amount: 0 })
        .eq('id', escrowData.id);
      
      return {
        success: true,
        amount_refunded: 0,
      };
    }
    
    // 4. REFUND POINTS TO CREATOR
    const { error: refundError } = await supabase.rpc('increment_base_points', {
      user_fid: questData.creator_fid,
      points: refundAmount,
    });
    
    if (refundError) {
      logError('Points refund failed', {
        questId,
        creatorFid: questData.creator_fid,
        refundAmount,
        error: refundError,
      });
      
      return {
        success: false,
        error: 'Failed to refund points to creator',
      };
    }
    
    // 5. UPDATE ESCROW RECORD
    await supabase
      .from('quest_creation_costs')
      .update({ 
        is_refunded: true, 
        refunded_amount: refundAmount,
      })
      .eq('id', escrowData.id);
    
    // 6. SUCCESS
    return {
      success: true,
      amount_refunded: refundAmount,
    };
    
  } catch (error) {
    logError('Refund points error', {
      questId,
      error,
    });
    
    return {
      success: false,
      error: 'Internal error during points refund',
    };
  }
}

/**
 * Calculate potential refund amount for a quest
 * (Does not perform refund, just calculates)
 * 
 * @param questId - Quest ID
 * @returns Refund amount or null if cannot calculate
 */
export async function calculateRefund(questId: number): Promise<number | null> {
  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    return null;
  }
  
  try {
    const { data: questData, error: questError } = await supabase
      .from('unified_quests')
      .select('reward_points, completion_count')
      .eq('id', questId)
      .single();
    
    if (questError || !questData) {
      return null;
    }
    
    const { data: escrowData, error: escrowError } = await supabase
      .from('quest_creation_costs')
      .select('points_escrowed, is_refunded')
      .eq('quest_id', String(questId))
      .single();
    
    if (escrowError || !escrowData || escrowData.is_refunded) {
      return null;
    }
    
    const totalEscrowed = escrowData.points_escrowed;
    const totalSpent = questData.reward_points * (questData.completion_count || 0);
    const refundAmount = Math.max(0, totalEscrowed - totalSpent);
    
    return refundAmount;
    
  } catch (error) {
    logError('Calculate refund error', {
      questId,
      error,
    });
    
    return null;
  }
}

/**
 * Check if user can afford to create a quest
 * 
 * @param fid - User FID
 * @param cost - Quest creation cost
 * @returns Boolean indicating affordability
 */
export async function canAffordQuest(fid: number, cost: number): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('leaderboard_calculations')
      .select('base_points')
      .eq('fid', fid)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return (data.base_points || 0) >= cost;
    
  } catch (error) {
    logError('Can afford quest check error', {
      fid,
      cost,
      error,
    });
    
    return false;
  }
}
