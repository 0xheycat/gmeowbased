import { createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SCORING_ADDRESS = '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6' as `0x${string}`;
const ORACLE_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`;

async function removeTestPoints() {
  console.log('🔄 Removing Test Viral Points\n');

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
  console.log(`Restoring viral points to 30 (original value)\n`);

  try {
    const hash = await client.writeContract({
      address: SCORING_ADDRESS,
      abi: parseAbi([
        'function setViralPoints(address user, uint256 amount) external'
      ]),
      functionName: 'setViralPoints',
      args: [ORACLE_ADDRESS, BigInt(30)],
    });

    console.log(`✅ Transaction submitted: ${hash}`);
    console.log(`🔗 View on BaseScan: https://basescan.org/tx/${hash}`);
    console.log(`\n✅ COMPLETE: Viral points restored to 30`);
    console.log(`📊 Total score now: 930 (30 viral + 900 quest)`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

removeTestPoints().catch(console.error);
