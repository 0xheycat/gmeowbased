import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import {
  celo,
  soneium,
  katana,
  fraxtal,
  taiko,
  optimism,
  arbitrum,
  gnosis,
  polygon,
  berachain,
  avalanche,
  bsc,
  mainnet,
} from 'viem/chains'
import { ink } from 'viem/chains'
import type { PublicClient } from 'viem'
import type { Config } from '@wagmi/core'
import { getPublicClient } from '@wagmi/core'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

const RPC_BASE = process.env.NEXT_PUBLIC_RPC_BASE ?? process.env.RPC_BASE ?? 'https://mainnet.base.org'
const RPC_OPTIMISM = process.env.NEXT_PUBLIC_RPC_OPTIMISM ?? process.env.RPC_OPTIMISM ?? 'https://mainnet.optimism.io'
const RPC_CELO = process.env.NEXT_PUBLIC_RPC_CELO ?? process.env.RPC_CELO ?? 'https://forno.celo.org'
const RPC_UNICHAIN = process.env.NEXT_PUBLIC_RPC_UNICHAIN ?? process.env.RPC_UNICHAIN ?? 'https://mainnet.unichain.org'
const RPC_INK = process.env.NEXT_PUBLIC_RPC_INK ?? process.env.RPC_INK ?? 'https://rpc.inkonchain.com'

export const unichain = {
  id: 130,
  name: 'Unichain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_UNICHAIN] } },
} as const

export const wagmiConfig = createConfig({
  chains: [
    base,
    mainnet,       // Ethereum
    optimism,
    arbitrum,
    avalanche,     // AVAX C-Chain
    bsc,           // BNB Smart Chain
    celo,
    fraxtal,
    taiko,
    gnosis,
    polygon,
    berachain,
    soneium,
    katana,
    unichain,
    ink,
  ],
  transports: {
    [base.id]: http(RPC_BASE),
    [mainnet.id]: http('https://cloudflare-eth.com'),
    [optimism.id]: http(RPC_OPTIMISM),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [avalanche.id]: http('https://api.avax.network/ext/bc/C/rpc'),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [celo.id]: http(RPC_CELO),
    [fraxtal.id]: http('https://rpc.frax.com'),
    [taiko.id]: http('https://rpc.mainnet.taiko.xyz'),
    [gnosis.id]: http('https://rpc.gnosischain.com'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [berachain.id]: http('https://rpc.berachain.com'),
    [soneium.id]: http('https://rpc.minato.soneium.org'),
    [katana.id]: http('https://rpc.katana.org'),
    [unichain.id]: http(RPC_UNICHAIN),
    [ink.id]: http(RPC_INK),
  },
  connectors: [
    // Prefer Farcaster Mini App in miniapp context
    miniAppConnector(),
    // ...keep your other connectors (injected, walletConnect, etc.)...
  ],
  // autoConnect: true, // REMOVE: not supported in this wagmi version
})

// Ensure your createConfig(...) is assigned to `config`
export const config = wagmiConfig

export function requirePublicClient(config: Config, chainId: number): PublicClient {
  const client = getPublicClient(config, { chainId })
  if (!client) throw new Error(`No public client for chainId=${chainId}`)
  return client
}