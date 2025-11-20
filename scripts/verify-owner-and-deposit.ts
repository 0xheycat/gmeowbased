import { createPublicClient, http, formatEther, parseAbi } from 'viem'
import { base, optimism, celo } from 'viem/chains'

const OWNER_ADDRESS = '0x7539472DAd6a371e6E152C5A203469aA32314130'
const ORACLE_WALLET = '0x8870C155666809609176260F2B65a626C000D773'

// Custom chains
const ink = {
  id: 57073,
  name: 'Ink',
  network: 'ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://ink-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'] },
    public: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
  },
}

const unichain = {
  id: 130,
  name: 'Unichain',
  network: 'unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://unichain-mainnet.g.alchemy.com/v2/AQYbCkrkuEDaD_hCDse6ezP2W-zUCEFe'] },
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

const ABI = parseAbi([
  'function owner() view returns (address)',
  'function pointsBalance(address) view returns (uint256)',
])

async function verifyOwnerAndDeposits() {
  console.log(`🔍 Verifying owner and checking deposits\n`)
  console.log(`Expected Owner: ${OWNER_ADDRESS}`)
  console.log(`Oracle Wallet:  ${ORACLE_WALLET}\n`)

  for (const { name, chain, address } of chains) {
    try {
      const client = createPublicClient({
        chain,
        transport: http(),
      })

      // Check contract owner
      const contractOwner = await client.readContract({
        address: address as `0x${string}`,
        abi: ABI,
        functionName: 'owner',
      }) as string

      // Check oracle balance
      const oracleBalance = await client.readContract({
        address: address as `0x${string}`,
        abi: ABI,
        functionName: 'pointsBalance',
        args: [ORACLE_WALLET as `0x${string}`],
      }) as bigint

      // Check owner's balance (to see if they have points to deposit)
      const ownerBalance = await client.readContract({
        address: address as `0x${string}`,
        abi: ABI,
        functionName: 'pointsBalance',
        args: [OWNER_ADDRESS as `0x${string}`],
      }) as bigint

      const ownerMatch = contractOwner.toLowerCase() === OWNER_ADDRESS.toLowerCase()
      
      console.log(`━━━ ${name} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Contract:       ${address}`)
      console.log(`Owner:          ${contractOwner}`)
      console.log(`Owner Match:    ${ownerMatch ? '✅ YES' : '❌ NO'}`)
      console.log(`Owner Balance:  ${formatEther(ownerBalance)} points`)
      console.log(`Oracle Balance: ${formatEther(oracleBalance)} points`)
      
      if (!ownerMatch) {
        console.log(`⚠️  WARNING: You are NOT the owner of this contract!`)
        console.log(`    Only owner can call depositTo()`)
      }
      
      if (ownerBalance === BigInt(0)) {
        console.log(`⚠️  WARNING: Owner has 0 points! Cannot deposit to oracle.`)
      }
      
      console.log()
    } catch (error: any) {
      console.log(`━━━ ${name} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`Contract: ${address}`)
      console.log(`ERROR: ${error.message}`)
      console.log()
    }
  }
}

verifyOwnerAndDeposits().catch(console.error)
