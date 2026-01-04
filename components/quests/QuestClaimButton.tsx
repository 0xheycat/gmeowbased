/**
 * @file components/quests/QuestClaimButton.tsx
 * @description Button component for claiming completed quests on-chain
 * 
 * Phase: Quest On-Chain Claiming (December 31, 2025)
 * 
 * Allows users to claim their verified quest rewards on the blockchain.
 * Uses oracle signature from verification API to authorize the claim.
 * 
 * FLOW:
 * 1. User completes quest verification → receives signature
 * 2. User clicks "Claim Rewards" button
 * 3. Button calls contract.completeQuestWithSig() with signature
 * 4. Contract validates, distributes rewards, emits QuestCompleted event
 * 5. Button marks quest as claimed in Supabase
 * 6. Subsquid indexes event and updates user points
 * 
 * @module components/quests/QuestClaimButton
 */

'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createCompleteQuestWithSigTx } from '@/lib/contracts/gmeow-utils';
import type { QuestClaimSignature } from '@/lib/quests/oracle-signature';
import { invalidateUserScoringCache } from '@/lib/scoring/unified-calculator';

export interface QuestClaimButtonProps {
  questId: number;
  questTitle: string;
  signature: QuestClaimSignature;
  userFid: number;
  onClaimSuccess?: () => void;
}

type ClaimState = 'idle' | 'claiming' | 'waiting' | 'success' | 'error';

export function QuestClaimButton({
  questId,
  questTitle,
  signature,
  userFid,
  onClaimSuccess,
}: QuestClaimButtonProps) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleClaim = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    // Validate signature deadline
    const now = Math.floor(Date.now() / 1000);
    if (signature.deadline < now) {
      alert('Signature expired - please verify quest again');
      return;
    }

    try {
      setClaimState('claiming');
      setErrorMessage(null);

      console.log('[QuestClaimButton] Initiating claim:', {
        questId,
        userAddress: address,
        fid: userFid,
        nonce: signature.nonce.toString(),
        deadline: signature.deadline,
      });

      // Build transaction using existing utility
      // Convert nonce to BigInt if it's a string (from database)
      const nonce = typeof signature.nonce === 'string' 
        ? BigInt(signature.nonce) 
        : signature.nonce;
      
      const tx = createCompleteQuestWithSigTx(
        signature.questId,
        signature.userAddress,
        signature.fid,
        signature.action,
        signature.deadline,
        nonce,
        signature.signature,
        'base'
      );

      // Submit transaction
      writeContract(tx);

      console.log('Transaction submitted - waiting for confirmation...');
      setClaimState('waiting');
    } catch (error) {
      console.error('[QuestClaimButton] Claim failed:', error);
      setClaimState('error');
      
      const message = error instanceof Error ? error.message : 'Failed to claim quest';
      setErrorMessage(message);
      alert(`Claim failed: ${message}`);
    }
  };

  // Handle transaction confirmation
  if (isConfirmed && claimState === 'waiting') {
    setClaimState('success');
    
    // Invalidate scoring cache to show updated points immediately
    if (address) {
      invalidateUserScoringCache(address).catch((err) => {
        console.error('[QuestClaimButton] Failed to invalidate cache:', err);
      });
    }
    
    // Mark quest as claimed in database
    markQuestClaimed(questId, userFid, hash!).catch((err) => {
      console.error('[QuestClaimButton] Failed to mark as claimed:', err);
    });

    console.log(`Quest "${questTitle}" claimed successfully!`);
    onClaimSuccess?.();
  }

  // Handle transaction errors
  if (writeError && claimState === 'claiming') {
    setClaimState('error');
    const message = writeError.message || 'Transaction failed';
    setErrorMessage(message);
    alert(`Transaction failed: ${message}`);
  }

  // Render button based on state
  if (claimState === 'success') {
    return (
      <Button disabled className="w-full" variant="outline">
        <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
        Quest Claimed!
      </Button>
    );
  }

  if (claimState === 'error') {
    return (
      <div className="space-y-2">
        <Button onClick={handleClaim} className="w-full" variant="destructive">
          <AlertCircle className="mr-2 h-4 w-4" />
          Retry Claim
        </Button>
        {errorMessage && (
          <p className="text-sm text-red-500 text-center">{errorMessage}</p>
        )}
      </div>
    );
  }

  if (claimState === 'claiming' || claimState === 'waiting' || isConfirming) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {claimState === 'claiming' ? 'Preparing...' : 'Claiming...'}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClaim}
      className="w-full"
      disabled={!isConnected || !address}
    >
      Claim Rewards On-Chain
    </Button>
  );
}

/**
 * Mark quest as claimed in Supabase after successful transaction
 */
async function markQuestClaimed(
  questId: number,
  userFid: number,
  txHash: `0x${string}`
): Promise<void> {
  try {
    const response = await fetch('/api/quests/mark-claimed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quest_id: questId,
        user_fid: userFid,
        tx_hash: txHash,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to mark as claimed: ${response.statusText}`);
    }

    console.log('[QuestClaimButton] Quest marked as claimed:', { questId, userFid, txHash });
  } catch (error) {
    console.error('[QuestClaimButton] Error marking quest as claimed:', error);
    throw error;
  }
}
