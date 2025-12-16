import { CHAIN_IDS, type ChainKey } from '@/lib/gmeow-utils'

export function getRpcUrl(chain: ChainKey): string {
  // Prefer env, fallback to public RPCs if any
  if (!(chain in CHAIN_IDS)) {
    throw new Error(`Unknown chain: ${chain}`)
  }
  if (chain === 'base') return process.env.RPC_BASE || process.env.BASE_RPC || process.env.NEXT_PUBLIC_RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
  throw new Error(`Unsupported chain configuration: ${chain}`)
}