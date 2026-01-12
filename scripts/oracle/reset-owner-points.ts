import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SCORING_ADDRESS = '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6' as `0x${string}`;
const ORACLE_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`;

async function resetOwnerPoints() {
  console.log('🔄 Resetting Owner Points to Baseline\n');

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
  console.log(`Removing all test points\n`);

  try {
    // Deduct 100,010 regular points
    console.log('Step 1: Deducting 100,010 regular points...');
    const deductHash = await client.writeContract({
      address: SCORING_ADDRESS,
      abi: parseAbi([
        'function deductPoints(address user, uint256 amount, string reason) external'
      ]),
      functionName: 'deductPoints',
      args: [ORACLE_ADDRESS, BigInt(100_010), "Reset to baseline for production"],
    });

    console.log(`✅ Deduction tx: ${deductHash}`);
    console.log(`⏳ Waiting 5 seconds...\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Reset viral points to 0
    console.log('Step 2: Resetting viral points to 0...');
    const viralHash = await client.writeContract({
      address: SCORING_ADDRESS,
      abi: parseAbi([
        'function setViralPoints(address user, uint256 amount) external'
      ]),
      functionName: 'setViralPoints',
      args: [ORACLE_ADDRESS, BigInt(0)],
    });

    console.log(`✅ Viral reset tx: ${viralHash}`);
    console.log(`⏳ Waiting 5 seconds...\n`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Reset quest points to 10
    console.log('Step 3: Setting quest points to 10...');
    const questHash = await client.writeContract({
      address: SCORING_ADDRESS,
      abi: parseAbi([
        'function addQuestPoints(address user, uint256 amount) external'
      ]),
      functionName: 'addQuestPoints',
      args: [ORACLE_ADDRESS, BigInt(10)],
    });

    console.log(`✅ Quest points tx: ${questHash}`);
    console.log(`🔗 View on BaseScan: https://basescan.org/tx/${questHash}`);
    console.log(`\n✅ COMPLETE: Owner address reset to baseline`);
    console.log(`📊 Total score: 10 (0 regular + 0 viral + 10 quest)`);
    console.log(`💰 Points available for guild creation, quests, and rewards`);
    console.log(`📝 Verify after ~30 seconds for indexer to sync`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

resetOwnerPoints().catch(console.error);
