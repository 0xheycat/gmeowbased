import { createPublicClient, http, formatEther, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { CONTRACT_ADDRESSES } from '../lib/gm-utils'

const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773'
const GM_ADDRESS = CONTRACT_ADDRESSES.base as `0x${string}`

async function checkRecentMints() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  })

  console.log('🔍 Checking recent badge mints on BASE...\n')
  console.log(`Oracle Wallet: ${ORACLE_WALLET}`)
  console.log(`GmeowMultichain: ${GM_ADDRESS}\n`)

  // Get BadgeMinted events from the contract
  const logs = await publicClient.getLogs({
    address: GM_ADDRESS,
    event: parseAbiItem('event BadgeMinted(address indexed user, uint256 tokenId, string badgeType)'),
    fromBlock: 'earliest',
    toBlock: 'latest',
  })

  console.log(`Found ${logs.length} BadgeMinted events:\n`)

  for (const log of logs.slice(-5)) {  // Show last 5
    const { user, tokenId, badgeType } = log.args as { user: string; tokenId: bigint; badgeType: string }
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
    
    console.log(`Block: ${log.blockNumber}`)
    console.log(`Time: ${new Date(Number(block.timestamp) * 1000).toISOString()}`)
    console.log(`Tx: ${log.transactionHash}`)
    console.log(`User: ${user}`)
    console.log(`Token ID: ${tokenId}`)
    console.log(`Badge Type: ${badgeType}`)
    console.log('---')
  }

  // Check oracle's current point balance
  const balance = await publicClient.readContract({
    address: GM_ADDRESS,
    abi: [
      {
        name: 'pointsBalance',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'pointsBalance',
    args: [ORACLE_WALLET as `0x${string}`],
  })

  console.log(`\n💰 Oracle Point Balance: ${formatEther(balance as bigint)} points`)
}

checkRecentMints().catch(console.error)
