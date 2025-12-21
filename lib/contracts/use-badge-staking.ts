/**
 * Badge Staking Contract Hooks
 * Phase 8.3: Wagmi hooks for stake/unstake operations
 */

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { CORE_ABI } from './abis'
import { STANDALONE_ADDRESSES } from './gmeow-utils'
import { base } from 'wagmi/chains'

/**
 * Hook to stake a badge
 * Calls GmeowCore.stakeForBadge(badgeId)
 */
export function useStakeBadge() {
  const { address } = useAccount()
  const { 
    data: hash, 
    error, 
    isPending, 
    writeContract 
  } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const stakeBadge = (badgeId: bigint) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    const coreAddress = STANDALONE_ADDRESSES.base.core
    
    writeContract({
      address: coreAddress,
      abi: CORE_ABI,
      functionName: 'stakeForBadge',
      args: [badgeId],
      chainId: base.id,
    })
  }

  return {
    stakeBadge,
    hash,
    error,
    isPending,
    isConfirming,
    isSuccess,
  }
}

/**
 * Hook to unstake a badge
 * Calls GmeowCore.unstakeForBadge(badgeId)
 */
export function useUnstakeBadge() {
  const { address } = useAccount()
  const { 
    data: hash, 
    error, 
    isPending, 
    writeContract 
  } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const unstakeBadge = (badgeId: bigint) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    const coreAddress = STANDALONE_ADDRESSES.base.core
    
    writeContract({
      address: coreAddress,
      abi: CORE_ABI,
      functionName: 'unstakeForBadge',
      args: [badgeId],
      chainId: base.id,
    })
  }

  return {
    unstakeBadge,
    hash,
    error,
    isPending,
    isConfirming,
    isSuccess,
  }
}
