import { createPublicClient, http, formatEther } from 'viem'
import { base, optimism, celo } from 'viem/chains'

const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773'

// Custom chains
const ink = {
  id: 57073,
  name: 'Ink',
  network: 'ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_INK || 'https://rpc.inkonchain.com'] },
    public: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
  },
}

const unichain = {
  id: 130,
  name: 'Unichain',
  network: 'unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_UNICHAIN || 'https://mainnet.unichain.org'] },
    public: { http: ['https://sepolia.unichain.org'] },
  },
}

// GmeowMultichain contract addresses
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

async function checkBalances() {
  console.log(`🔍 Checking oracle point balances across all chains\n`)
  console.log(`Oracle: ${ORACLE_WALLET}\n`)

  for (const { name, chain, address } of chains) {
    try {
      const client = createPublicClient({
        chain,
        transport: http(),
      })

      const balance = await client.readContract({
        address: address as `0x${string}`,
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

      const formatted = formatEther(balance as bigint)
      console.log(`${name.padEnd(12)} ${address}`)
      console.log(`             Balance: ${formatted} points`)
      console.log()
    } catch (error: any) {
      console.log(`${name.padEnd(12)} ${address}`)
      console.log(`             ERROR: ${error.message}`)
      console.log()
    }
  }
}

checkBalances().catch(console.error)
