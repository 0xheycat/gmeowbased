/**
 * Decode quest data properly
 */
import { createPublicClient, http, type Address, decodeAbiParameters, parseAbiParameters } from 'viem';
import { base } from 'viem/chains';

const contractAddress = '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73';

async function main() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  console.log('Reading Quest 11 data...\n');

  const data = await publicClient.call({
    to: contractAddress as Address,
    data: '0x77b03e0d000000000000000000000000000000000000000000000000000000000000000b' as `0x${string}`,
  });

  if (!data.data) {
    console.log('No data returned');
    return;
  }

  // Decode according to Quest struct
  const decoded = decodeAbiParameters(
    parseAbiParameters('string name, uint8 questType, uint256 target, uint256 rewardPoints, address creator, uint256 maxCompletions, uint256 expiresAt, string meta, bool isActive, uint256 escrowedPoints, uint256 claimedCount, address rewardToken, uint256 rewardTokenPerUser, uint256 tokenEscrowRemaining'),
    data.data
  );

  console.log('Quest 11 Details:');
  console.log('================');
  console.log('Name:', decoded[0]);
  console.log('Quest Type:', decoded[1]);
  console.log('Target:', decoded[2].toString());
  console.log('Reward Points:', decoded[3].toString());
  console.log('Creator:', decoded[4]);
  console.log('Max Completions:', decoded[5].toString());
  console.log('Expires At:', decoded[6].toString());
  console.log('Meta:', decoded[7]);
  console.log('Is Active:', decoded[8]);
  console.log('Escrowed Points:', decoded[9].toString());
  console.log('Claimed Count:', decoded[10].toString());
  console.log('Reward Token:', decoded[11]);
  console.log('Reward Token Per User:', decoded[12].toString());
  console.log('Token Escrow Remaining:', decoded[13].toString());
}

main().catch(console.error);
