/**
 * Quest Verification Orchestrator
 * Phase 2.7: Quest Page Rebuild
 * 
 * Coordinate on-chain and social verifications, update database
 */

import type { Address } from 'viem';
import { 
  verifyOnChainQuest, 
  type OnChainVerificationData, 
  type VerificationResult as OnChainResult 
} from './onchain-verification';
import { 
  verifySocialQuest, 
  type SocialVerificationData, 
  type SocialVerificationResult 
} from './farcaster-verification';
import { 
  completeQuestTask, 
  getQuestWithProgress 
} from '@/lib/supabase/queries/quests';
import type { Quest } from '@/lib/supabase/types/quest';

export interface QuestVerificationRequest {
  userFid: number;
  userAddress?: Address;
  questId: number;
  taskIndex?: number; // For multi-step quests
}

export interface QuestVerificationResponse {
  success: boolean;
  message: string;
  quest_completed: boolean;
  task_completed: boolean;
  next_task_index?: number;
  rewards?: {
    xp_earned: number;
    points_earned: number;
    token_earned?: number;
    nft_awarded?: boolean;
  };
  proof?: Record<string, any>;
}

/**
 * Main quest verification orchestrator
 */
export async function verifyQuest(
  request: QuestVerificationRequest
): Promise<QuestVerificationResponse> {
  try {
    // 1. Fetch quest details
    const questWithProgress = await getQuestWithProgress(request.questId, request.userFid);
    
    if (!questWithProgress) {
      return {
        success: false,
        message: 'Quest not found',
        quest_completed: false,
        task_completed: false,
      };
    }
    
    // 2. Check if quest is locked (viral XP requirement)
    if (questWithProgress.is_locked) {
      return {
        success: false,
        message: `Quest requires ${questWithProgress.min_viral_xp_required} Viral XP to unlock`,
        quest_completed: false,
        task_completed: false,
      };
    }
    
    // 3. Check if quest is already completed
    if (questWithProgress.is_completed) {
      return {
        success: false,
        message: 'Quest already completed',
        quest_completed: true,
        task_completed: true,
      };
    }
    
    // 4. Determine which task to verify
    const tasks = questWithProgress.tasks || [];
    const taskIndex = request.taskIndex ?? questWithProgress.user_progress?.current_task_index ?? 0;
    
    if (taskIndex >= tasks.length) {
      return {
        success: false,
        message: 'Invalid task index',
        quest_completed: false,
        task_completed: false,
      };
    }
    
    const currentTask = tasks[taskIndex];
    
    // 5. Run verification based on quest category
    let verificationResult: OnChainResult | SocialVerificationResult;
    
    if (questWithProgress.category === 'onchain') {
      // On-chain verification
      if (!request.userAddress) {
        return {
          success: false,
          message: 'Wallet address required for on-chain verification',
          quest_completed: false,
          task_completed: false,
        };
      }
      
      const verificationData = currentTask.verification_data as OnChainVerificationData;
      verificationResult = await verifyOnChainQuest(request.userAddress, verificationData);
    } else {
      // Social verification (Farcaster)
      const verificationData = currentTask.verification_data as SocialVerificationData;
      verificationResult = await verifySocialQuest(request.userFid, verificationData);
    }
    
    // 6. Handle verification failure
    if (!verificationResult.success) {
      return {
        success: false,
        message: verificationResult.message,
        quest_completed: false,
        task_completed: false,
      };
    }
    
    // 7. Record task completion in database
    const dbResult = await completeQuestTask(
      request.userFid,
      request.questId,
      taskIndex,
      verificationResult.proof || {}
    );
    
    if (!dbResult || !dbResult.success) {
      return {
        success: false,
        message: 'Failed to record quest completion',
        quest_completed: false,
        task_completed: false,
      };
    }
    
    // 8. Check if entire quest is completed
    const isQuestComplete = taskIndex + 1 >= tasks.length;
    const nextTaskIndex = isQuestComplete ? undefined : taskIndex + 1;
    
    // 9. Calculate rewards (only if entire quest is complete)
    const rewards = isQuestComplete
      ? {
          xp_earned: questWithProgress.reward_points,
          points_earned: questWithProgress.reward_points, // Points = XP for quest completion
          token_earned: questWithProgress.token_reward_amount,
          nft_awarded: !!questWithProgress.nft_reward_contract,
        }
      : undefined;
    
    return {
      success: true,
      message: isQuestComplete
        ? 'Quest completed! Rewards have been awarded.'
        : `Task ${taskIndex + 1} completed! ${tasks.length - taskIndex - 1} tasks remaining.`,
      quest_completed: isQuestComplete,
      task_completed: true,
      next_task_index: nextTaskIndex,
      rewards,
      proof: verificationResult.proof,
    };
  } catch (error) {
    console.error('Quest verification orchestrator error:', error);
    return {
      success: false,
      message: 'Internal verification error',
      quest_completed: false,
      task_completed: false,
    };
  }
}

/**
 * Check if user can start a quest (viral XP requirement)
 */
export async function canStartQuest(
  userFid: number,
  questId: number
): Promise<{ allowed: boolean; message: string }> {
  const quest = await getQuestWithProgress(questId, userFid);
  
  if (!quest) {
    return { allowed: false, message: 'Quest not found' };
  }
  
  if (quest.status !== 'active') {
    return { allowed: false, message: 'Quest is not active' };
  }
  
  if (quest.is_locked) {
    return { 
      allowed: false, 
      message: `Requires ${quest.min_viral_xp_required} Viral XP to unlock` 
    };
  }
  
  if (quest.is_completed) {
    return { allowed: false, message: 'Quest already completed' };
  }
  
  if (quest.max_completions && quest.completion_count && quest.completion_count >= quest.max_completions) {
    return { allowed: false, message: 'Quest has reached maximum completions' };
  }
  
  if (quest.expiry_date && new Date(quest.expiry_date) < new Date()) {
    return { allowed: false, message: 'Quest has expired' };
  }
  
  return { allowed: true, message: 'Quest available' };
}

/**
 * Get user's quest eligibility summary
 */
export async function getUserQuestEligibility(userFid: number, quests: Quest[]) {
  const results = await Promise.all(
    quests.map(async (quest) => {
      const eligibility = await canStartQuest(userFid, quest.id);
      return {
        quest_id: quest.id,
        title: quest.title,
        ...eligibility,
      };
    })
  );
  
  return results;
}
