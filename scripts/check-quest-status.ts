/**
 * Check quest status on the contract
 */
import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils';
import GmeowCombinedABI from '@/abi/GmeowCombined.abi.json';

const questId = 11; // On-chain quest ID for "Follow gmeowbased"

async function main() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.RPC_BASE || process.env.BASE_RPC),
  });

  const quest = await publicClient.readContract({
    address: STANDALONE_ADDRESSES.base.core as Address,
    abi: GmeowCombinedABI,
    functionName: 'getQuest',
    args: [BigInt(questId)],
  }) as any;

  console.log('Quest ID:', questId);
  console.log('Quest Data:', {
    isActive: quest.isActive,
    rewardPoints: quest.rewardPoints.toString(),
    maxCompletions: quest.maxCompletions.toString(),
    claimedCount: quest.claimedCount.toString(),
    escrowedPoints: quest.escrowedPoints.toString(),
    expiresAt: quest.expiresAt.toString(),
  });
  
  console.log('\nValidation:');
  console.log('- Is Active:', quest.isActive ? '✅' : '❌ Quest not active!');
  console.log('- Has Capacity:', quest.claimedCount < quest.maxCompletions ? '✅' : '❌ Max completions reached!');
  console.log('- Not Expired:', quest.expiresAt === 0n || Date.now() / 1000 < Number(quest.expiresAt) ? '✅' : '❌ Quest expired!');
  console.log('- Has Escrow:', quest.escrowedPoints >= quest.rewardPoints ? '✅' : '❌ Insufficient escrow!');
}

main().catch(console.error);
