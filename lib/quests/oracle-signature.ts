/**
 * @file lib/quests/oracle-signature.ts
 * @description Oracle signature generation for quest claiming
 * 
 * Phase: Quest On-Chain Claiming (December 31, 2025)
 * 
 * Generates cryptographic signatures that allow users to claim completed quests
 * on-chain. The signature proves off-chain quest verification and authorizes
 * the contract to distribute rewards.
 * 
 * FLOW:
 * 1. User completes quest verification (off-chain)
 * 2. Oracle generates signature with: questId, user, fid, deadline, nonce
 * 3. User calls contract.completeQuestWithSig() with signature
 * 4. Contract validates signature, distributes rewards, emits event
 * 5. Subsquid indexes QuestCompleted event
 * 
 * @module lib/quests/oracle-signature
 */

import { env } from '@/lib/config/env';
import { keccak256, encodePacked, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils';
import { getPublicClient } from '@/lib/contracts/rpc-client-pool';

/**
 * Signature data returned to client for claiming
 */
export interface QuestClaimSignature {
  questId: number;
  userAddress: Address;
  fid: number;
  action: number; // 0 = quest completion
  deadline: number; // Unix timestamp
  nonce: bigint;
  signature: `0x${string}`;
}

/**
 * Parameters for generating quest claim signature
 */
export interface GenerateSignatureParams {
  questId: number;
  userAddress: Address;
  fid: number;
}

/**
 * Get user nonce from contract (required for signature)
 * @param userAddress - User's wallet address
 * @returns Current nonce for the user
 */
async function getUserNonce(userAddress: Address): Promise<bigint> {
  try {
    // Use pooled RPC client (Phase 8.2 - connection pooling)
    const publicClient = getPublicClient();

    // Import ABI dynamically to avoid circular dependencies
    const { default: GmeowCombinedABI } = await import('@/abi/GmeowCombined.abi.json');

    const nonce = await publicClient.readContract({
      address: STANDALONE_ADDRESSES.base.core as Address,
      abi: GmeowCombinedABI,
      functionName: 'userNonce',
      args: [userAddress],
    }) as bigint;

    return nonce;
  } catch (error) {
    console.error('[OracleSignature] Failed to get user nonce:', error);
    throw new Error('Failed to fetch user nonce from contract');
  }
}

/**
 * Generate oracle signature for quest claiming
 * 
 * Creates a cryptographic signature that authorizes the user to claim their
 * quest rewards on-chain. The signature includes the user's nonce to prevent
 * replay attacks.
 * 
 * @param params - Quest and user parameters
 * @returns Signature data for contract call
 * @throws Error if oracle private key is not configured
 * @throws Error if nonce fetch fails
 */
export async function generateQuestClaimSignature(
  params: GenerateSignatureParams
): Promise<QuestClaimSignature> {
  const { questId, userAddress, fid } = params;

  // Validate oracle private key is configured
  if (!env.ORACLE_PRIVATE_KEY) {
    throw new Error('ORACLE_PRIVATE_KEY not configured - cannot generate signatures');
  }

  try {
    // Get current nonce from contract (prevents replay attacks)
    const nonce = await getUserNonce(userAddress);

    // Action code: 0 = quest completion
    const action = 0;

    // Deadline: 1 hour from now (gives user time to submit transaction)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Create hash matching contract's verification logic
    // Contract: keccak256(abi.encodePacked(chainId, address(this), questId, user, fid, action, deadline, nonce))
    const hash = keccak256(
      encodePacked(
        ['uint256', 'address', 'uint256', 'address', 'uint256', 'uint8', 'uint256', 'uint256'],
        [
          BigInt(8453), // chainId (Base chain)
          STANDALONE_ADDRESSES.base.core as Address, // contract address
          BigInt(questId), // quest ID
          userAddress, // user address
          BigInt(fid), // Farcaster FID
          action, // action code (0 = completion)
          BigInt(deadline), // signature expiration
          nonce, // user nonce
        ]
      )
    );

    // Sign hash with oracle private key
    const oracleAccount = privateKeyToAccount(env.ORACLE_PRIVATE_KEY as `0x${string}`);
    const signature = await oracleAccount.signMessage({
      message: { raw: hash },
    });

    console.log('[OracleSignature] Generated signature:', {
      questId,
      userAddress,
      fid,
      nonce: nonce.toString(),
      deadline,
      signatureLength: signature.length,
    });

    return {
      questId,
      userAddress,
      fid,
      action,
      deadline,
      nonce,
      signature,
    };
  } catch (error) {
    console.error('[OracleSignature] Signature generation failed:', error);
    throw error;
  }
}

/**
 * Validate signature parameters before generation
 * @param params - Parameters to validate
 * @returns True if valid, throws error if invalid
 */
export function validateSignatureParams(params: GenerateSignatureParams): boolean {
  if (!params.questId || params.questId <= 0) {
    throw new Error('Invalid questId: must be positive integer');
  }

  if (!params.userAddress || !params.userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid userAddress: must be valid Ethereum address');
  }

  if (!params.fid || params.fid <= 0) {
    throw new Error('Invalid fid: must be positive integer');
  }

  return true;
}
