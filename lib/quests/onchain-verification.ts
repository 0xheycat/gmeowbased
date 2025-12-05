/**
 * On-Chain Quest Verification
 * Phase 2.7: Quest Page Rebuild
 * 
 * Verify on-chain activities via Base Mainnet proxy contract
 * Proxy Address: 0x6A48B758ed42d7c934D387164E60aa58A92eD206
 */

import { createPublicClient, http, parseAbi, type Address } from 'viem';
import { base } from 'viem/chains';

// Base Mainnet proxy contract (deployed Nov 28, 2025)
const PROXY_CONTRACT_ADDRESS = '0x6A48B758ed42d7c934D387164E60aa58A92eD206' as Address;

// Create Viem client for Base Mainnet
const client = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_BASE || process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org'),
});

/**
 * Quest verification data types
 */
export interface OnChainVerificationData {
  type: 'mint_nft' | 'swap_token' | 'provide_liquidity' | 'bridge' | 'custom';
  contract_address?: Address;
  token_address?: Address;
  min_amount?: bigint;
  function_signature?: string;
  custom_check?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  proof?: {
    transaction_hash: string;
    block_number: bigint;
    timestamp: number;
    verified_data: Record<string, any>;
  };
}

/**
 * Verify NFT mint
 */
export async function verifyNFTMint(
  userAddress: Address,
  nftContract: Address,
  minBalance: bigint = 1n
): Promise<VerificationResult> {
  try {
    const balance = await client.readContract({
      address: nftContract,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [userAddress],
    });
    
    if (balance >= minBalance) {
      return {
        success: true,
        message: `Successfully verified NFT ownership (balance: ${balance})`,
        proof: {
          transaction_hash: '0x', // Would come from event logs in production
          block_number: 0n,
          timestamp: Date.now(),
          verified_data: {
            nft_contract: nftContract,
            user_address: userAddress,
            balance: balance.toString(),
          },
        },
      };
    }
    
    return {
      success: false,
      message: `Insufficient NFT balance. Required: ${minBalance}, Found: ${balance}`,
    };
  } catch (error) {
    console.error('NFT verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify NFT ownership',
    };
  }
}

/**
 * Verify token swap
 */
export async function verifyTokenSwap(
  userAddress: Address,
  tokenAddress: Address,
  minAmount: bigint
): Promise<VerificationResult> {
  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [userAddress],
    });
    
    if (balance >= minAmount) {
      return {
        success: true,
        message: `Successfully verified token balance`,
        proof: {
          transaction_hash: '0x',
          block_number: 0n,
          timestamp: Date.now(),
          verified_data: {
            token_address: tokenAddress,
            user_address: userAddress,
            balance: balance.toString(),
            required_amount: minAmount.toString(),
          },
        },
      };
    }
    
    return {
      success: false,
      message: `Insufficient token balance. Required: ${minAmount}, Found: ${balance}`,
    };
  } catch (error) {
    console.error('Token swap verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify token swap',
    };
  }
}

/**
 * Verify liquidity provision
 */
export async function verifyLiquidityProvision(
  userAddress: Address,
  poolAddress: Address,
  minLPTokens: bigint
): Promise<VerificationResult> {
  try {
    const lpBalance = await client.readContract({
      address: poolAddress,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [userAddress],
    });
    
    if (lpBalance >= minLPTokens) {
      return {
        success: true,
        message: `Successfully verified liquidity provision`,
        proof: {
          transaction_hash: '0x',
          block_number: 0n,
          timestamp: Date.now(),
          verified_data: {
            pool_address: poolAddress,
            user_address: userAddress,
            lp_token_balance: lpBalance.toString(),
          },
        },
      };
    }
    
    return {
      success: false,
      message: `Insufficient LP tokens. Required: ${minLPTokens}, Found: ${lpBalance}`,
    };
  } catch (error) {
    console.error('Liquidity verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify liquidity provision',
    };
  }
}

/**
 * Verify transaction occurred via Base proxy contract
 */
export async function verifyTransactionViaProxy(
  transactionHash: string
): Promise<VerificationResult> {
  try {
    const tx = await client.getTransaction({
      hash: transactionHash as `0x${string}`,
    });
    
    if (!tx) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }
    
    const receipt = await client.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });
    
    if (!receipt) {
      return {
        success: false,
        message: 'Transaction receipt not found',
      };
    }
    
    // Verify transaction was successful
    if (receipt.status !== 'success') {
      return {
        success: false,
        message: 'Transaction failed on-chain',
      };
    }
    
    return {
      success: true,
      message: 'Transaction verified successfully',
      proof: {
        transaction_hash: transactionHash,
        block_number: receipt.blockNumber,
        timestamp: Date.now(),
        verified_data: {
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          gas_used: receipt.gasUsed.toString(),
        },
      },
    };
  } catch (error) {
    console.error('Transaction verification failed:', error);
    return {
      success: false,
      message: 'Failed to verify transaction',
    };
  }
}

/**
 * Main verification dispatcher for on-chain quests
 */
export async function verifyOnChainQuest(
  userAddress: Address,
  verificationData: OnChainVerificationData
): Promise<VerificationResult> {
  switch (verificationData.type) {
    case 'mint_nft':
      if (!verificationData.contract_address) {
        return { success: false, message: 'NFT contract address required' };
      }
      return verifyNFTMint(
        userAddress,
        verificationData.contract_address,
        verificationData.min_amount || 1n
      );
    
    case 'swap_token':
      if (!verificationData.token_address || !verificationData.min_amount) {
        return { success: false, message: 'Token address and minimum amount required' };
      }
      return verifyTokenSwap(
        userAddress,
        verificationData.token_address,
        verificationData.min_amount
      );
    
    case 'provide_liquidity':
      if (!verificationData.contract_address || !verificationData.min_amount) {
        return { success: false, message: 'Pool address and minimum LP tokens required' };
      }
      return verifyLiquidityProvision(
        userAddress,
        verificationData.contract_address,
        verificationData.min_amount
      );
    
    default:
      return {
        success: false,
        message: `Unsupported verification type: ${verificationData.type}`,
      };
  }
}
