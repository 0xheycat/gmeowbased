/**
 * Check PointsDeposited events to verify if depositTo() was called successfully
 */
import { createPublicClient, http, parseAbiItem } from 'viem'
import { base, optimism, celo } from 'viem/chains'

const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773'

const ink = {
  id: 57073,
  name: 'Ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_INK || 'https://rpc.inkonchain.com'] },
  },
}

const unichain = {
  id: 130,
  name: 'Unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.unichain.org'] },
  },
}

const GM_ADDRESSES = {
  BASE: '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F',
  INK: '0x6081a70c2F33329E49cD2aC673bF1ae838617d26',
  UNICHAIN: '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f',
  OP: '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6',
  CELO: '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52',
}

const chains = [
  { name: 'BASE', chain: base, address: GM_ADDRESSES.BASE },
  { name: 'INK', chain: ink, address: GM_ADDRESSES.INK },
  { name: 'UNICHAIN', chain: unichain, address: GM_ADDRESSES.UNICHAIN },
  { name: 'OPTIMISM', chain: optimism, address: GM_ADDRESSES.OP },
  { name: 'CELO', chain: celo, address: GM_ADDRESSES.CELO },
]

async function checkDepositEvents() {
  console.log(`🔍 Checking PointsDeposited events for oracle: ${ORACLE_WALLET}\n`)

  for (const { name, chain, address } of chains) {
    try {
      const client = createPublicClient({
        chain,
        transport: http(),
      })

      // Get PointsDeposited events for oracle wallet
      const logs = await client.getLogs({
        address: address as `0x${string}`,
        event: parseAbiItem('event PointsDeposited(address indexed who, uint256 amount)'),
        args: {
          who: ORACLE_WALLET as `0x${string}`,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      })

      console.log(`━━━ ${name} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Contract: ${address}`)
      
      if (logs.length === 0) {
        console.log(`❌ No deposits found for oracle`)
      } else {
        console.log(`✅ Found ${logs.length} deposit(s):`)
        for (const log of logs) {
          const { amount } = log.args as { who: string; amount: bigint }
          const block = await client.getBlock({ blockNumber: log.blockNumber })
          console.log(`   Amount: ${amount} (${Number(amount) / 1e18} if in wei)`)
          console.log(`   Block:  ${log.blockNumber}`)
          console.log(`   Tx:     ${log.transactionHash}`)
          console.log(`   Time:   ${new Date(Number(block.timestamp) * 1000).toISOString()}`)
        }
      }
      console.log()
    } catch (error: any) {
      console.log(`━━━ ${name} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`ERROR: ${error.message}`)
      console.log()
    }
  }
}

checkDepositEvents().catch(console.error)
