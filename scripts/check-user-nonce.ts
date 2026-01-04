/**
 * Quick script to check a user's current nonce on the contract
 */
import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils';
import GmeowCombinedABI from '@/abi/GmeowCombined.abi.json';

const userAddress = '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e' as Address;

async function main() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.RPC_BASE || process.env.BASE_RPC),
  });

  const nonce = await publicClient.readContract({
    address: STANDALONE_ADDRESSES.base.core as Address,
    abi: GmeowCombinedABI,
    functionName: 'userNonce',
    args: [userAddress],
  }) as bigint;

  console.log('User Address:', userAddress);
  console.log('Current Nonce:', nonce.toString());
  console.log('Signature Nonce: 0');
  console.log('Match:', nonce === 0n ? 'YES ✅' : 'NO ❌ - Signature nonce is outdated!');
}

main().catch(console.error);
