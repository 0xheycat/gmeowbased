/**
 * Fully decode the transaction input
 */
import { createPublicClient, http, decodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import GmeowCombinedABI from '@/abi/GmeowCombined.abi.json';

const txHash = '0x65b5ff313622a6cc2645779301ad4de7b013c2f6e9aa78118aedca3d17f6567d';

async function main() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  const tx = await publicClient.getTransaction({
    hash: txHash as `0x${string}`,
  });

  console.log('Transaction From:', tx.from);
  console.log('Transaction To:', tx.to);
  console.log('\nDecoding function call...\n');

  try {
    const decoded = decodeFunctionData({
      abi: GmeowCombinedABI,
      data: tx.input,
    });

    console.log('Function:', decoded.functionName);
    console.log('Arguments:', JSON.stringify(decoded.args, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (error) {
    console.error('Failed to decode:', error);
    console.log('\nRaw input:', tx.input);
  }
}

main().catch(console.error);
