/**
 * List all quests on the contract
 */
import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils';
import GmeowCombinedABI from '@/abi/GmeowCombined.abi.json';

async function main() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.RPC_BASE || process.env.BASE_RPC),
  });

  // Get active quest IDs
  const activeQuestIds = await publicClient.readContract({
    address: STANDALONE_ADDRESSES.base.core as Address,
    abi: GmeowCombinedABI,
    functionName: 'getActiveQuestIds',
    args: [],
  }) as bigint[];

  console.log('Active Quest IDs on contract:', activeQuestIds.map(id => id.toString()));
  console.log('Total:', activeQuestIds.length);
  
  // Check if quest 11 is in the list
  if (activeQuestIds.some(id => id === 11n)) {
    console.log('\n✅ Quest 11 is active on the contract');
  } else {
    console.log('\n❌ Quest 11 is NOT in active quests list');
  }
}

main().catch(console.error);
