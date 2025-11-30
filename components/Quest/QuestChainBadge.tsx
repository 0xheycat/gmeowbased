import Image from 'next/image'
import { getChainIconUrl } from '@/lib/chain-icons'
import { CHAIN_LABEL, type ChainKey } from '@/lib/gmeow-utils'

export function QuestChainChip({ chain, label }: { chain: ChainKey; label?: string }) {
  const displayLabel = label || CHAIN_LABEL[chain] || chain
  return (
    <span className="pixel-pill quest-chain-chip">
      <span className="quest-chain-chip__icon" aria-hidden>
        <ChainIcon chain={chain} label={displayLabel} size={18} />
      </span>
      {displayLabel}
    </span>
  )
}

export function ChainIcon({ chain, label, size = 28 }: { chain: ChainKey; label?: string; size?: number }) {
  const displayLabel = label || CHAIN_LABEL[chain] || chain
  const src = getChainIconUrl(chain)

  if (!src) {
    return (
      <span className="quest-chain-placeholder" aria-hidden>
        {displayLabel.slice(0, 1).toUpperCase()}
      </span>
    )
  }

  return (
    <Image
      src={src}
      alt={`${displayLabel} icon`}
      width={size}
      height={size}
      unoptimized
      className="quest-chain-img"
    />
  )
}
