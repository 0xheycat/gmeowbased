import { CHAIN_LABEL } from './gmeow-utils'

export const CHAIN_ICON_URLS: Record<string, string> = {
  base: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/base.svg',
  celo: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/celo.png',
  op: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
  optimism: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
  ethereum: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/eth.svg',
  arbitrum: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/arbitrum.svg',
  avax: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/avax.svg',
  berachain: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/berachain.svg',
  bnb: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/bnb.svg',
  fraxtal: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/fraxtal.svg',
  katana: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/katana.svg',
  soneium: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/soneium.png',
  taiko: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/taiko.svg',
  unichain: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/unichain.png',
  ink: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/ink.png',
  hyperevm: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/hyper.png',
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
