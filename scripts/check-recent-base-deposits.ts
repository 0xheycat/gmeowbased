import { createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'

async function checkRecentDeposits() {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.RPC_BASE_HTTP || 'https://mainnet.base.org'),
  })

  const currentBlock = await client.getBlockNumber()
  const fromBlock = currentBlock - BigInt(10000) // Last 10k blocks (~8 hours on Base)

  console.log(`Checking blocks ${fromBlock} to ${currentBlock}\n`)

  const logs = await client.getLogs({
    address: '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F',
    event: parseAbiItem('event PointsDeposited(address indexed who, uint256 amount)'),
    fromBlock,
    toBlock: 'latest',
  })

  console.log(`Found ${logs.length} PointsDeposited events in last 10k blocks:\n`)
  
  for (const log of logs) {
    const { who, amount } = log.args as { who: string; amount: bigint }
    const block = await client.getBlock({ blockNumber: log.blockNumber })
    console.log(`Address: ${who}`)
    console.log(`Amount:  ${amount} points`)
    console.log(`Tx:      ${log.transactionHash}`)
    console.log(`Time:    ${new Date(Number(block.timestamp) * 1000).toISOString()}`)
    console.log()
  }

  if (logs.length === 0) {
    console.log('⚠️  No recent deposits found in last 10,000 blocks')
    console.log('   Did you deposit on a different chain?')
    console.log('   Or was it more than ~8 hours ago?')
  }
}

checkRecentDeposits().catch(console.error)
