import { createWalletClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SCORING_ADDRESS = '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6'

async function main() {
  const privateKey = process.env.ORACLE_PRIVATE_KEY as `0x${string}`
  if (!privateKey) throw new Error('ORACLE_PRIVATE_KEY not set')

  const account = privateKeyToAccount(privateKey)
  const client = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org')
  })

  console.log('🔄 Triggering StatsUpdated event for user 2...')
  console.log('User: 0x8a3094e44577579d6f41f6214a86c250b7dbdc4e')
  console.log('Setting viralPoints: 300 → 305')

  const hash = await client.writeContract({
    address: SCORING_ADDRESS,
    abi: parseAbi(['function setViralPoints(address user, uint256 points) external']),
    functionName: 'setViralPoints',
    args: ['0x8a3094e44577579d6f41f6214a86c250b7dbdc4e', 305n]
  })

  console.log('✅ Transaction sent:', hash)
  console.log('Waiting for indexer to process (5-30 seconds)...')
}

main()
