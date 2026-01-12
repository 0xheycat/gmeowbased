import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SCORING_ADDRESS = '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6' as `0x${string}`;
const ORACLE_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`;

async function addOwnerPoints() {
  console.log('👑 Adding Regular Points as Owner\n');

  if (!process.env.ORACLE_PRIVATE_KEY) {
    throw new Error('ORACLE_PRIVATE_KEY not found in .env.local');
  }

  const account = privateKeyToAccount(process.env.ORACLE_PRIVATE_KEY as `0x${string}`);
  
  const client = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });

  console.log(`Owner: ${account.address}`);
  console.log(`Target: ${ORACLE_ADDRESS}`);
  console.log(`Adding: 100,000 REGULAR POINTS for production use\n`);

  const pointsToAdd = BigInt(100_000);

  try {
    console.log('Adding 100k regular points for production usage...');
    const hash = await client.writeContract({
      address: SCORING_ADDRESS,
      abi: parseAbi([
        'function addPoints(address user, uint256 amount) external'
      ]),
      functionName: 'addPoints',
      args: [ORACLE_ADDRESS, pointsToAdd],
    });

    console.log(`✅ Transaction submitted: ${hash}`);
    console.log(`🔗 View on BaseScan: https://basescan.org/tx/${hash}`);
    console.log(`\n✅ COMPLETE: Added 100,000 REGULAR points to ${ORACLE_ADDRESS}`);
    console.log(`📊 Total score: ~100,910 (100k regular + 0 viral + 910 quest)`);
    console.log(`🏆 Points available for:`);
    console.log(`   - Creating guilds (costs points)`);
    console.log(`   - Creating quests (escrowed points)`);
    console.log(`   - Giving rewards (deducted points)`);
    console.log(`📝 Verify after ~30 seconds for indexer to sync`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

addOwnerPoints().catch(console.error);
