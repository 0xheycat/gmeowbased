/**
 * Decode transaction data to see what parameters were sent
 */
import { createPublicClient, http, type Address, decodeEventLog } from 'viem';
import { base } from 'viem/chains';

const txHash = '0x65b5ff313622a6cc2645779301ad4de7b013c2f6e9aa78118aedca3d17f6567d';

async function main() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  const tx = await publicClient.getTransaction({
    hash: txHash as `0x${string}`,
  });

  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  console.log('Transaction Details:');
  console.log('From:', tx.from);
  console.log('To:', tx.to);
  console.log('Status:', receipt.status === 'success' ? 'Success' : 'Failed');
  console.log('Gas Used:', receipt.gasUsed.toString());
  
  if (receipt.status === 'reverted') {
    console.log('\n❌ Transaction REVERTED');
  }
  
  // Decode input data
  console.log('\nInput Data (first 200 chars):', tx.input.slice(0, 200));
}

main().catch(console.error);
