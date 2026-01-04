/**
 * Test if we can call the contract to validate the signature
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

  const contractAddress = STANDALONE_ADDRESSES.base.core as Address;
  
  console.log('Contract:', contractAddress);
  console.log('\nChecking quest 11...\n');

  try {
    // Try reading quest data using raw call
    const data = await publicClient.call({
      to: contractAddress,
      data: '0x77b03e0d000000000000000000000000000000000000000000000000000000000000000b' as `0x${string}`, // getQuest(11)
    });
    
    console.log('Quest data returned:', data);
  } catch (error: any) {
    console.error('Error reading quest:', error.message);
  }

  // Check if oracle is authorized
  try {
    const oracleAddress = process.env.ORACLE_ADDRESS || '0x...';
    console.log('\nChecking oracle authorization for:', oracleAddress);
    
    const isAuthorized = await publicClient.readContract({
      address: contractAddress,
      abi: GmeowCombinedABI,
      functionName: 'authorizedOracles',
      args: [oracleAddress as Address],
    });
    
    console.log('Oracle authorized:', isAuthorized);
  } catch (error: any) {
    console.error('Error checking oracle:', error.message);
  }
}

main().catch(console.error);
