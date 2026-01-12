import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SCORING_ADDRESS = '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6' as `0x${string}`;
const ORACLE_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`;

async function addTestPoints() {
  console.log('🎯 Adding 100k Test Points to Oracle Address\n');

  if (!process.env.ORACLE_PRIVATE_KEY) {
    throw new Error('ORACLE_PRIVATE_KEY not found in .env.local');
  }

  const account = privateKeyToAccount(process.env.ORACLE_PRIVATE_KEY as `0x${string}`);
  
  const client = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  console.log(`Oracle: ${account.address}`);
  console.log(`Target: ${ORACLE_ADDRESS}`);
  console.log(`Contract: ${SCORING_ADDRESS}`);
  console.log(`Amount: 100,000 viral points\n`);

  // Add 100k viral points to oracle address
  // Oracle is authorized for setViralPoints function
  const pointsToAdd = BigInt(100_000);

  try {
    const hash = await client.writeContract({
      address: SCORING_ADDRESS,
      abi: parseAbi([
        'function setViralPoints(address user, uint256 amount) external'
      ]),
      functionName: 'setViralPoints',
      args: [ORACLE_ADDRESS, pointsToAdd],
    });

    console.log(`✅ Transaction submitted: ${hash}`);
    console.log(`🔗 View on BaseScan: https://basescan.org/tx/${hash}`);
    console.log(`\n⏳ Waiting for confirmation...`);
    
    // Wait a bit for the transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`\n✅ COMPLETE: Added 100,000 viral points to ${ORACLE_ADDRESS}`);
    console.log(`📊 Next: Verify on leaderboard after indexer syncs (~30 seconds)`);
    
  } catch (error: any) {
    console.error('❌ Error adding points:', error.message);
    throw error;
  }
}

addTestPoints().catch(console.error);
