import { CHAIN_IDS, type ChainKey } from '@/lib/gm-utils'

export function getRpcUrl(chain: ChainKey): string {
  // Prefer env, fallback to public RPCs if any
  if (!(chain in CHAIN_IDS)) {
    throw new Error(`Unknown chain: ${chain}`)
  }
  if (chain === 'base') return process.env.RPC_BASE || process.env.BASE_RPC || process.env.NEXT_PUBLIC_RPC_BASE || 'https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
  if (chain === 'unichain') return process.env.RPC_UNICHAIN || process.env.NEXT_PUBLIC_RPC_UNICHAIN || 'https://unichain-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
  if (chain === 'celo') return process.env.RPC_CELO || process.env.NEXT_PUBLIC_RPC_CELO || 'https://celo-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
  if (chain === 'ink') return process.env.RPC_INK || process.env.NEXT_PUBLIC_RPC_INK || 'https://ink-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
  if (chain === 'op') return process.env.RPC_OP || process.env.NEXT_PUBLIC_RPC_OP || 'https://opt-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
  throw new Error(`Unsupported chain configuration: ${chain}`)
}