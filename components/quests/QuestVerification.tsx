/**
 * QuestVerification - Unified quest completion verification UI
 * Task 8.4: Quest Completion Verification (REBUILT for NEW API - December 4, 2025)
 * 
 * NEW SYSTEM (Supabase-based):
 * - Uses verification-orchestrator.ts (direct database updates)
 * - No oracle signatures (removed old on-chain contract flow)
 * - Automatic reward distribution (XP + Points)
 * - Real-time progress tracking
 * 
 * Features:
 * - Onchain verification (NFT mint, token swap, liquidity, bridge)
 * - Social verification (follow, cast, recast, like, reply)
 * - Multi-step task progression
 * - Wallet connection for onchain verification
 * - FID input for social verification
 * - Real-time status updates
 * - Professional error handling
 * 
 * Bug #30 Fix (December 29, 2025):
 * - Added useEffect to sync taskIndex when quest progress changes
 * - Prevents reset to task 0 on page reload for multi-task quests
 * 
 * Template: gmeowbased0.6 (0-10% adaptation)
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ErrorIcon from '@mui/icons-material/Error'
import LoopIcon from '@mui/icons-material/Loop'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import { WalletButton } from '@/components/WalletButton'
import { useDialog, ErrorDialog } from '@/components/dialogs'
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'
import { QuestClaimButton } from '@/components/quests/QuestClaimButton'
import type { QuestWithProgress, QuestTask } from '@/lib/supabase/types/quest'
import type { QuestClaimSignature } from '@/lib/quests/oracle-signature'

interface QuestVerificationProps {
  quest: QuestWithProgress
  userFid?: number
  onVerificationComplete?: (taskIndex: number) => void
  onQuestComplete?: () => void
}

interface VerificationState {
  taskIndex: number
  status: 'idle' | 'verifying' | 'success' | 'error'
  message?: string
  rewards?: {
    xp_earned: number
    points_earned: number
  }
  proof?: any
  claimSignature?: QuestClaimSignature | null
  questCompleted?: boolean
}

export function QuestVerification({ 
  quest, 
  userFid,
  onVerificationComplete,
  onQuestComplete 
}: QuestVerificationProps) {
  const { address, isConnected } = useAccount()
  const { isOpen: errorOpen, open: openError, close: closeError } = useDialog()
  const [errorMessage, setErrorMessage] = useState('')
  const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
  const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)
  
  // Bug #40 Fix: Initialize with correct task index from database
  // Use quest.user_progress?.current_task_index as the source of truth
  const initialTaskIndex = quest.user_progress?.current_task_index ?? 0
  
  const [verificationState, setVerificationState] = useState<VerificationState>({
    taskIndex: initialTaskIndex,
    status: 'idle'
  })
  
  const [fidInput, setFidInput] = useState(userFid?.toString() || '')

  // Fetch claim signature from database if quest is already completed
  useEffect(() => {
    if (quest.is_completed && userFid && !verificationState.claimSignature) {
      console.log('[QuestVerification] Quest already completed, checking claim status');
      
      async function fetchClaimSignature() {
        try {
          // Check if quest has onchain_quest_id (requires blockchain claim)
          if (!quest.onchain_quest_id) {
            console.log('[QuestVerification] Database-only quest (no onchain_quest_id), no claim button needed');
            setVerificationState(prev => ({
              ...prev,
              questCompleted: true,
              status: 'success'
            }));
            return;
          }

          const response = await fetch(`/api/quests/unclaimed?fid=${userFid}`);
          if (!response.ok) {
            console.error('[QuestVerification] Failed to fetch unclaimed quests');
            return;
          }
          
          const data = await response.json();
          const unclaimedQuest = data.unclaimed_quests?.find(
            (q: any) => q.quest_id === quest.id
          );
          
          if (unclaimedQuest && unclaimedQuest.claim_signature) {
            const signature = unclaimedQuest.claim_signature;
            
            // Check if signature userAddress matches connected wallet
            if (signature.userAddress?.toLowerCase() !== address?.toLowerCase()) {
              console.log('[QuestVerification] Wallet mismatch detected, regenerating signature', {
                signatureAddress: signature.userAddress,
                connectedAddress: address
              });
              
              // Regenerate signature for current wallet
              try {
                const regenResponse = await fetch('/api/quests/regenerate-signature', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    quest_id: quest.id,
                    fid: userFid,
                    userAddress: address
                  })
                });
                
                if (regenResponse.ok) {
                  const regenData = await regenResponse.json();
                  console.log('[QuestVerification] Signature regenerated for current wallet');
                  setVerificationState(prev => ({
                    ...prev,
                    claimSignature: regenData.signature,
                    questCompleted: true,
                    status: 'success'
                  }));
                  return;
                } else {
                  console.error('[QuestVerification] Failed to regenerate signature');
                }
              } catch (regenError) {
                console.error('[QuestVerification] Error regenerating signature:', regenError);
              }
            }
            
            console.log('[QuestVerification] Found claim signature in database');
            setVerificationState(prev => ({
              ...prev,
              claimSignature: signature,
              questCompleted: true,
              status: 'success'
            }));
          } else {
            console.log('[QuestVerification] No claim signature found or quest already claimed');
          }
        } catch (error) {
          console.error('[QuestVerification] Error fetching claim signature:', error);
        }
      }
      
      fetchClaimSignature();
    }
  }, [quest.is_completed, quest.id, userFid, verificationState.claimSignature, address]);

  // Bug #30 & #40 Fix: Sync taskIndex when quest progress updates (e.g., after verification or page reload)
  useEffect(() => {
    const dbTaskIndex = quest.user_progress?.current_task_index
    if (dbTaskIndex !== undefined && dbTaskIndex !== verificationState.taskIndex) {
      console.log('[QuestVerification] Syncing taskIndex from database:', {
        current: verificationState.taskIndex,
        database: dbTaskIndex,
        questId: quest.id,
        reason: 'Quest progress updated'
      })
      setVerificationState(prev => ({
        ...prev,
        taskIndex: dbTaskIndex,
        status: 'idle' // Reset status when syncing from DB
      }))
    }
  }, [quest.user_progress?.current_task_index, quest.id, verificationState.taskIndex])

  // Bug #41 Fix: Detect if database shows quest completed but quest.is_completed is false
  // This happens when page hasn't refreshed after completion
  useEffect(() => {
    if (quest.user_progress?.status === 'completed' && !quest.is_completed) {
      console.warn('[Bug #41] Quest completed in database but not reflected in UI:', {
        questId: quest.id,
        questSlug: quest.slug,
        dbStatus: quest.user_progress.status,
        isCompleted: quest.is_completed,
        action: 'Triggering onQuestComplete to refresh quest data'
      })
      // Trigger parent to refetch quest data
      onQuestComplete?.()
    }
  }, [quest.user_progress?.status, quest.is_completed, quest.id, quest.slug, onQuestComplete])

  const tasks = (quest.tasks || []) as QuestTask[]
  const currentTask = tasks[verificationState.taskIndex]
  const isOnchain = quest.category === 'onchain'
  const isSocial = quest.category === 'social'

  // Check if user has completed this task
  const isTaskCompleted = quest.user_progress?.completed_tasks?.includes(verificationState.taskIndex) || false
  const isQuestCompleted = quest.is_completed || false

  // Verify quest completion (NEW API - uses verification orchestrator)
  const handleVerify = useCallback(async () => {
    // Debug logging
    console.log('[QuestVerification] Starting verification:', {
      userFid,
      fidInput,
      isOnchain,
      isSocial,
      isConnected,
      address
    });

    // Validation
    if (isOnchain && (!isConnected || !address)) {
      setErrorMessage('Connect your wallet to verify onchain quests')
      openError()
      return
    }

    // Bug #17 fix: Use userFid prop if available, otherwise parse from input
    const currentFid = userFid || parseInt(fidInput)
    console.log('[QuestVerification] Calculated currentFid:', currentFid, 'from userFid:', userFid, 'or fidInput:', fidInput);
    
    if (isSocial && (!currentFid || currentFid <= 0 || isNaN(currentFid))) {
      setErrorMessage('Enter your Farcaster ID to verify social quests')
      openError()
      return
    }

    // Onchain quests also need userFid for reward distribution
    if (isOnchain && (!currentFid || isNaN(currentFid))) {
      setErrorMessage('User ID required for quest verification')
      openError()
      return
    }

    setVerificationState(prev => ({
      ...prev,
      status: 'verifying',
      message: 'Verifying your action...'
    }))

    // Verification status shown in UI state (verificationState.status = 'verifying')

    try {
      // Call NEW verification API (uses verification-orchestrator.ts)
      // API expects quest slug, not numeric ID
      const questSlug = quest.slug || quest.id.toString();
      
      // Log request for debugging
      const requestBody = {
        userFid: currentFid,
        userAddress: address,
        taskIndex: verificationState.taskIndex
      };
      console.log('[QuestVerification] Request:', {
        url: `/api/quests/${questSlug}/verify`,
        body: requestBody
      });
      
      const response = await fetch(`/api/quests/${questSlug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      // Handle HTTP errors
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('[QuestVerification] API error response:', errorData);
        } catch (parseError) {
          console.error('[QuestVerification] Failed to parse error response:', parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Extract detailed error message
        const errorMsg = errorData.message 
          || errorData.details?.message 
          || errorData.error
          || `Server error: ${response.status}`;
        
        console.error('[QuestVerification] HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          extractedMessage: errorMsg
        });
        
        throw new Error(errorMsg);
      }

      const result = await response.json()

      // Log full response for debugging
      console.log('[QuestVerification] API response:', {
        success: result.success,
        message: result.message,
        details: result.details
      })

      if (!result.success) {
        // Show detailed error message from API
        const errorMsg = result.message || result.details?.message || 'Verification failed'
        throw new Error(errorMsg)
      }

      // Verification successful - rewards automatically distributed
      setVerificationState(prev => ({
        ...prev,
        status: 'success',
        message: result.message || 'Verification successful!',
        rewards: result.rewards,
        proof: result.proof,
        claimSignature: result.claim_signature || null,
        questCompleted: result.quest_completed || false
      }))

      // XP and Points are separate reward systems (see QUEST-NAMING-AUDIT-REPORT.md)
      const xp = result.rewards?.xp_earned || quest.reward_points_awarded || 0
      const points = result.rewards?.points_earned || quest.reward_points_awarded || 0

      // Show XPEventOverlay celebration for task or quest completion
      if (result.quest_completed) {
        // Quest fully completed - big celebration
        const questSlug = quest.slug || quest.id.toString()
        setXpPayload({
          event: 'quest-verify',
          chainKey: 'base',
          xpEarned: xp,
          totalPoints: points,
          headline: `${quest.title} completed!`,
          shareLabel: 'Share quest completion',
          visitUrl: `/quests/${questSlug}`,
          visitLabel: 'View quest details',
          tierTagline: `+${xp} XP earned • +${points} Points awarded`,
        })
        setXpOverlayOpen(true)
        onQuestComplete?.()
      } else if (result.task_completed) {
        // Individual task completed - smaller celebration
        const questSlug = quest.slug || quest.id.toString()
        setXpPayload({
          event: 'task-complete',
          chainKey: 'base',
          xpEarned: xp,
          totalPoints: points,
          headline: `Task ${verificationState.taskIndex + 1} complete!`,
          shareLabel: 'Share task progress',
          visitUrl: `/quests/${questSlug}`,
          visitLabel: 'Continue quest',
          tierTagline: `+${xp} XP earned • Task ${verificationState.taskIndex + 1}/${quest.tasks?.length || 0}`,
        })
        setXpOverlayOpen(true)
      }

      onVerificationComplete?.(verificationState.taskIndex)

      // Move to next task after celebration (Bug #47 Fix: Wait full 30 seconds for overlay)
      if (result.task_completed && result.next_task_index !== undefined && !result.quest_completed) {
        setTimeout(() => {
          setVerificationState(prev => ({
            taskIndex: result.next_task_index,
            status: 'idle'
          }))
        }, 30000) // Match ANIMATION_TIMINGS.modalAutoDismiss (30 seconds)
      }

    } catch (error) {
      console.error('Verification failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Verification failed'
      
      setVerificationState(prev => ({
        ...prev,
        status: 'error',
        message: errorMessage
      }))

      setErrorMessage(errorMessage)
      openError()
    }
  }, [
    isOnchain, 
    isSocial, 
    isConnected, 
    address, 
    fidInput, 
    userFid,  // Bug #37 Fix: Added missing dependency
    quest.id,
    quest.slug,  // Bug #37 Fix: Added for API calls
    quest.title,
    quest.reward_points_awarded,
    quest.tasks,  // Bug #37 Fix: Added to track task array changes
    currentTask, 
    verificationState.taskIndex, 
    tasks.length,
    onVerificationComplete,
    onQuestComplete
  ])

  // Render verification requirements
  const renderRequirements = () => {
    if (!currentTask) return null

    const verificationData = currentTask.verification_data as any

    if (isOnchain) {
      return (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Onchain Requirements:
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {verificationData?.type === 'mint_nft' && (
              <>
                <li>• Mint NFT from contract: {verificationData?.contract_address?.slice(0, 10)}...</li>
                <li>• Minimum balance: {verificationData?.min_amount || 1}</li>
              </>
            )}
            {verificationData?.type === 'swap_token' && (
              <>
                <li>• Swap to token: {verificationData?.token_address?.slice(0, 10)}...</li>
                <li>• Minimum amount: {verificationData?.min_amount?.toString() || '0'}</li>
              </>
            )}
            {verificationData?.type === 'provide_liquidity' && (
              <>
                <li>• Provide liquidity to pool</li>
                <li>• Minimum LP tokens: {verificationData?.min_amount?.toString() || '0'}</li>
              </>
            )}
          </ul>
        </div>
      )
    }

    if (isSocial) {
      return (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Social Requirements:
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {verificationData?.type === 'follow_user' && (
              <li>• Follow @{verificationData?.target_username || `FID ${verificationData?.target_fid}`}</li>
            )}
            {verificationData?.type === 'like_cast' && (
              <li>• Like cast: {verificationData?.target_cast_hash?.slice(0, 10)}...</li>
            )}
            {verificationData?.type === 'recast' && (
              <li>• Recast: {verificationData?.target_cast_hash?.slice(0, 10)}...</li>
            )}
            {verificationData?.type === 'reply_to_cast' && (
              <>
                <li>• Reply to cast: {verificationData?.target_cast_hash?.slice(0, 10)}...</li>
                {verificationData?.required_tag && (
                  <li>• Include tag: {verificationData?.required_tag}</li>
                )}
              </>
            )}
            {verificationData?.type === 'create_cast_with_tag' && (
              <li>• Create cast with tag: {verificationData?.required_tag}</li>
            )}
          </ul>
        </div>
      )
    }

    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Verification
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isQuestCompleted 
              ? 'Quest completed! Rewards claimed.'
              : `Complete task ${verificationState.taskIndex + 1} of ${tasks.length}`
            }
          </p>
        </div>

        {/* Status Indicator */}
        {verificationState.status !== 'idle' && (
          <div className="flex items-center gap-2">
            {verificationState.status === 'verifying' && (
              <LoopIcon className="w-5 h-5 animate-spin text-primary-500" />
            )}
            {verificationState.status === 'success' && (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            )}
            {verificationState.status === 'error' && (
              <ErrorIcon className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Task Progress */}
      {!isQuestCompleted && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            {tasks.map((task, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                  index < verificationState.taskIndex
                    ? 'bg-green-500 border-green-500'
                    : index === verificationState.taskIndex
                    ? 'bg-primary-500 border-primary-500'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}>
                  {index < verificationState.taskIndex ? (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  ) : index === verificationState.taskIndex ? (
                    <RadioButtonUncheckedIcon className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </span>
                  )}
                </div>
                {index < tasks.length - 1 && (
                  <div className={`w-12 h-0.5 ${
                    index < verificationState.taskIndex
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Current Task */}
          {currentTask && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {currentTask.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {currentTask.description}
              </p>
              {renderRequirements()}
            </div>
          )}
        </div>
      )}

      {/* Wallet Connection (Onchain) */}
      {isOnchain && !isQuestCompleted && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            <AccountBalanceWalletIcon className="w-4 h-4 inline mr-2" />
            Wallet Connection
          </h3>
          {isConnected && address ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                Connected: {address.slice(0, 6)}...{address.slice(-4)}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Connect your wallet to verify onchain activities
              </p>
              <WalletButton />
            </div>
          )}
        </div>
      )}

      {/* FID Input (Social) */}
      {isSocial && !isQuestCompleted && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Farcaster ID
          </h3>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Enter your Farcaster ID to verify social activities
            </p>
            <input
              type="number"
              placeholder="Enter your FID (e.g., 18139)"
              value={fidInput}
              onChange={(e) => setFidInput(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={verificationState.status === 'verifying'}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {verificationState.message && (
        <div className={`rounded-lg p-3 mb-4 ${
          verificationState.status === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : verificationState.status === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          <p className={`text-sm ${
            verificationState.status === 'success'
              ? 'text-green-800 dark:text-green-200'
              : verificationState.status === 'error'
              ? 'text-red-800 dark:text-red-200'
              : 'text-blue-800 dark:text-blue-200'
          }`}>
            {verificationState.message}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {!isQuestCompleted && (
        <div className="flex gap-3">
          <button
            onClick={handleVerify}
            disabled={
              verificationState.status === 'verifying' ||
              (isOnchain && !isConnected) ||
              (isSocial && !fidInput) ||
              isTaskCompleted
            }
            className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTaskCompleted ? (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Task {verificationState.taskIndex + 1} Completed
              </>
            ) : verificationState.status === 'verifying' ? (
              <>
                <LoopIcon className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : verificationState.status === 'success' && verificationState.rewards ? (
              <>
                <EmojiEventsIcon className="w-5 h-5" />
                Task Complete! +{verificationState.rewards.xp_earned} XP, +{verificationState.rewards.points_earned} Points
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Verify Task {verificationState.taskIndex + 1}
              </>
            )}
          </button>

          {/* View Proof */}
          {verificationState.proof && (
            <button
              onClick={() => {
                console.log('Verification Proof:', verificationState.proof)
                // Debug info logged to console only
              }}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <OpenInNewIcon className="w-4 h-4" />
              View Proof
            </button>
          )}
        </div>
      )}

      {/* Completed State */}
      {isQuestCompleted && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500 to-primary-500 rounded-xl p-6 text-white text-center">
            <EmojiEventsIcon className="w-12 h-12 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-1">Quest Complete!</h3>
            <div className="flex items-center justify-center gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <EmojiEventsIcon className="w-4 h-4" />
                <span>+{(() => {
                  // Calculate XP based on quest category (offline metric)
                  const pointsReward = quest.reward_points_awarded || 0;
                  const category = quest.category || 'custom';
                  const XP_MULTIPLIERS: Record<string, number> = {
                    social: 1.0,
                    onchain: 1.5,
                    creative: 1.2,
                    learn: 1.0,
                    hybrid: 2.0,
                    custom: 1.0,
                  };
                  const multiplier = XP_MULTIPLIERS[category] || 1.0;
                  return Math.floor(pointsReward * multiplier);
                })()} XP</span>
              </div>
              <div className="flex items-center gap-1">
                <MonetizationOnIcon className="w-4 h-4" />
                <span>+{quest.reward_points_awarded} Points</span>
              </div>
            </div>
          </div>

          {/* Claim Button - Show immediately after quest completion */}
          {verificationState.claimSignature && userFid && address && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-blue-300 dark:border-blue-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">
                🎉 Ready to claim your rewards on-chain!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Claim your {quest.reward_points_awarded} points on the blockchain to use them in the GMeowbased ecosystem.
              </p>
              <QuestClaimButton
                questId={quest.id}
                questTitle={quest.title}
                signature={verificationState.claimSignature}
                userFid={userFid}
                onClaimSuccess={() => {
                  // Refresh quest data to show claimed status
                  window.location.reload();
                }}
              />
            </div>
          )}

          {/* No claim signature - show message */}
          {verificationState.questCompleted && !verificationState.claimSignature && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                ⏳ Claim signature is being generated. Please refresh the page in a moment to claim your rewards.
              </p>
            </div>
          )}
        </div>
      )}

      <ErrorDialog
        isOpen={errorOpen}
        onClose={closeError}
        title="Verification Error"
        message={errorMessage}
      />

      <XPEventOverlay
        open={xpOverlayOpen}
        payload={xpPayload}
        onClose={() => {
          setXpOverlayOpen(false)
          // Note: Removed page reload - users stay on page to see claim button
          // The quest data is already updated and claim button is now visible
        }}
      />
    </div>
  )
}
