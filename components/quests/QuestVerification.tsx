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
 * Template: gmeowbased0.6 (0-10% adaptation)
 */

'use client'

import { useState, useCallback } from 'react'
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
import { useNotifications } from '@/components/ui/live-notifications'
import type { QuestWithProgress, QuestTask } from '@/lib/supabase/types/quest'

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
}

export function QuestVerification({ 
  quest, 
  userFid,
  onVerificationComplete,
  onQuestComplete 
}: QuestVerificationProps) {
  const { address, isConnected } = useAccount()
  const { showNotification } = useNotifications()
  
  const [verificationState, setVerificationState] = useState<VerificationState>({
    taskIndex: quest.user_progress?.current_task_index || 0,
    status: 'idle'
  })
  
  const [fidInput, setFidInput] = useState(userFid?.toString() || '')

  const tasks = (quest.tasks || []) as QuestTask[]
  const currentTask = tasks[verificationState.taskIndex]
  const isOnchain = quest.category === 'onchain'
  const isSocial = quest.category === 'social'

  // Check if user has completed this task
  const isTaskCompleted = quest.user_progress?.completed_tasks?.includes(verificationState.taskIndex) || false
  const isQuestCompleted = quest.is_completed || false

  // Verify quest completion (NEW API - uses verification orchestrator)
  const handleVerify = useCallback(async () => {
    // Validation
    if (isOnchain && (!isConnected || !address)) {
      showNotification(
        'Connect your wallet to verify onchain quests',
        'wallet_connection_failed',
        5000
      )
      return
    }

    const currentFid = parseInt(fidInput)
    if (isSocial && (!currentFid || currentFid <= 0)) {
      showNotification(
        'Enter your Farcaster ID to verify social quests',
        'fid_linking_failed',
        5000
      )
      return
    }

    setVerificationState(prev => ({
      ...prev,
      status: 'verifying',
      message: 'Verifying your action...'
    }))

    showNotification(
      `Verifying task ${verificationState.taskIndex + 1} of ${tasks.length}`,
      'quest_verification_pending',
      0 // Don't auto-dismiss during verification
    )

    try {
      // Call NEW verification API (uses verification-orchestrator.ts)
      const response = await fetch(`/api/quests/${quest.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userFid: currentFid,
          userAddress: address,
          taskIndex: verificationState.taskIndex
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Verification failed')
      }

      // Verification successful - rewards automatically distributed
      setVerificationState(prev => ({
        ...prev,
        status: 'success',
        message: result.message || 'Verification successful!',
        rewards: result.rewards,
        proof: result.proof
      }))

      const xp = result.rewards?.xp_earned || quest.reward_points || 0
      const points = result.rewards?.points_earned || 0

      showNotification(
        `Task ${verificationState.taskIndex + 1} complete! +${xp} XP, +${points} Points`,
        'quest_verification_success',
        5000
      )

      onVerificationComplete?.(verificationState.taskIndex)

      // Check if quest is fully completed
      if (result.quest_completed) {
        showNotification(
          `"${quest.title}" completed!`,
          'quest_completed',
          5000
        )
        onQuestComplete?.()
      } else if (result.task_completed && result.next_task_index !== undefined) {
        // Move to next task
        setTimeout(() => {
          setVerificationState(prev => ({
            taskIndex: result.next_task_index,
            status: 'idle'
          }))
        }, 2000)
      }

    } catch (error) {
      console.error('Verification failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Verification failed'
      
      setVerificationState(prev => ({
        ...prev,
        status: 'error',
        message: errorMessage
      }))

      showNotification(
        errorMessage,
        'quest_verification_failed',
        8000 // Errors need more time to read
      )
    }
  }, [
    isOnchain, 
    isSocial, 
    isConnected, 
    address, 
    fidInput, 
    quest.id,
    quest.title,
    quest.reward_points,
    currentTask, 
    verificationState.taskIndex, 
    tasks.length,
    showNotification,
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
              (isSocial && !fidInput)
            }
            className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {verificationState.status === 'verifying' ? (
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
                showNotification(
                  'Check browser console for verification details',
                  'quest_progress',
                  3000
                )
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
      {isQuestCompleted && verificationState.rewards && (
        <div className="bg-gradient-to-r from-green-500 to-primary-500 rounded-xl p-6 text-white text-center">
          <EmojiEventsIcon className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-1">Quest Complete!</h3>
          <div className="flex items-center justify-center gap-4 text-white/90">
            <div className="flex items-center gap-1">
              <EmojiEventsIcon className="w-4 h-4" />
              <span>+{verificationState.rewards.xp_earned} XP</span>
            </div>
            <div className="flex items-center gap-1">
              <MonetizationOnIcon className="w-4 h-4" />
              <span>+{verificationState.rewards.points_earned} Points</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
