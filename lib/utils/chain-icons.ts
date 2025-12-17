import { CHAIN_LABEL } from '@/lib/contracts/gmeow-utils'

// BLOCKSCOUT-SUPPORTED CHAINS ONLY (12 chains)
// Icons hosted on GitHub: https://github.com/0xheycat/image-
export const CHAIN_ICON_URLS: Record<string, string> = {
  base: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/base.svg',
  ethereum: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/eth.svg',
  optimism: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
  op: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
  arbitrum: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/arbitrum.svg',
  polygon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/polygon.svg',
  gnosis: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/gnosis.svg',
  celo: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/celo.png',
  scroll: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/scroll.svg',
  unichain: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/unichain.png',
  soneium: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/soneium.png',
  zksync: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/zksync.svg',
  zora: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/zora.svg',
}

export function getChainIconUrl(chainKey?: string | null): string {
  if (!chainKey) return CHAIN_ICON_URLS.base || ''
  const lower = chainKey.toLowerCase()
  if (CHAIN_ICON_URLS[lower]) return CHAIN_ICON_URLS[lower]

  const aliasKey = Object.keys(CHAIN_ICON_URLS).find((key) => key.toLowerCase() === lower)
  if (aliasKey) return CHAIN_ICON_URLS[aliasKey]

  const normalized = Object.entries(CHAIN_LABEL as Record<string, string>).find(([, label]) => label.toLowerCase() === lower)?.[0]
  if (normalized) {
    const normalizedLower = normalized.toLowerCase()
    if (CHAIN_ICON_URLS[normalizedLower]) return CHAIN_ICON_URLS[normalizedLower]
    if (CHAIN_ICON_URLS[normalized]) return CHAIN_ICON_URLS[normalized]
  }

  return ''
}
