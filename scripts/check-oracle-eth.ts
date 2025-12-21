import { createPublicClient, http, formatEther } from 'viem'
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

const chains = [
  { name: 'BASE', chain: base },
  { name: 'INK', chain: ink },
  { name: 'UNICHAIN', chain: unichain },
  { name: 'OPTIMISM', chain: optimism },
  { name: 'CELO', chain: celo },
]

async function checkNativeBalances() {
  console.log(`🔍 Checking oracle's native ETH balances\n`)
  console.log(`Oracle: ${ORACLE_WALLET}\n`)

  for (const { name, chain } of chains) {
    try {
      const client = createPublicClient({
        chain,
        transport: http(),
      })

      const balance = await client.getBalance({
        address: ORACLE_WALLET as `0x${string}`,
      })

      console.log(`${name.padEnd(12)} ${formatEther(balance)} ETH`)
      
      if (balance === BigInt(0)) {
        console.log(`             ⚠️  NO GAS! Oracle needs ETH to send transactions`)
      }
    } catch (error: any) {
      console.log(`${name.padEnd(12)} ERROR: ${error.message}`)
    }
  }
}

checkNativeBalances().catch(console.error)
