/**
 * Custom Chain Definitions
 * 
 * Viem chain definitions for chains not included in viem/chains by default.
 */

import { defineChain } from 'viem'

/**
 * Unichain Mainnet
 * https://unichain.org
 */
export const unichain = defineChain({
  id: 1301,
  name: 'Unichain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_UNICHAIN || 
        process.env.RPC_UNICHAIN || 
        'https://unichain-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Uniscan',
      url: 'https://uniscan.xyz',
    },
  },
  testnet: false,
})

/**
 * Ink Mainnet
 * https://inkonchain.com
 */
export const ink = defineChain({
  id: 57073,
  name: 'Ink',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_INK || 
        process.env.RPC_INK || 
        'https://ink-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg'
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Inkscan',
      url: 'https://explorer.inkonchain.com',
    },
  },
  testnet: false,
})
