import { useId } from 'react'

import type { ChainKey } from '@/lib/gm-utils'

const CHAIN_BADGE: Record<ChainKey, { icon: string; label: string }> = {
  base: { icon: '🟦', label: '' },
  op: { icon: '🔴', label: '' },
  celo: { icon: '🟡', label: '' },
  unichain: { icon: '🟣', label: '' },
  ink: { icon: '🧡', label: '' },
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

export type RewardAssetInfo = {
  type: 'points' | 'token' | 'nft' | 'unknown'
  label: string
  unitLabel: string
  name: string | null
  symbol: string | null
  descriptor: string | null
  contractAddress: string | null
  tokenId: string | null
  collectionName: string | null
}

export type RewardDetail = {
  label: string
  value: string
}

export type QuestRewardCapsuleProps = {
  chain: ChainKey
  rewardPoints: number
  rewardToken: string | null
  rewardTokenPerUser?: number | null
  multiplier?: number | null
  details?: RewardDetail[] | null
  rewardTokenSymbol?: string | null
  tier?: 'common' | 'rare' | 'epic' | 'legendary'
  rewardAsset?: RewardAssetInfo | null
}

export function QuestRewardCapsule({
  chain,
  rewardPoints,
  rewardToken,
  rewardTokenPerUser,
  multiplier,
  details,
  rewardTokenSymbol,
  tier,
  rewardAsset,
}: QuestRewardCapsuleProps) {
  const chainMeta = CHAIN_BADGE[chain] ?? { icon: '✨', label: 'Gmeow' }
  const assetType = rewardAsset?.type ?? (rewardToken ? 'token' : rewardPoints > 0 ? 'points' : 'unknown')
  const usesTokenLikeValue = assetType !== 'points'
  let primaryValue = normalizeRewardValue(usesTokenLikeValue ? rewardTokenPerUser : rewardPoints)
  if (assetType === 'nft' && (!primaryValue || primaryValue < 1)) primaryValue = 1
  const formatted = formatNumber(primaryValue || 0)
  const displaySymbol = rewardAsset?.symbol?.trim() || rewardTokenSymbol?.trim() || null
  const assetLabel = (rewardAsset?.label ?? '').trim() || (assetType === 'points' ? 'Points' : displaySymbol ?? 'Reward')
  const rawUnitLabel = (rewardAsset?.unitLabel ?? '').trim()
  const unit = rawUnitLabel || (assetType === 'points' ? 'Points' : displaySymbol ?? (Math.abs(primaryValue) === 1 ? 'token' : 'tokens'))
  const showMultiplier = typeof multiplier === 'number' && Number.isFinite(multiplier) && multiplier > 1
  const detailList = Array.isArray(details) ? details.filter((detail) => detail.value.trim().length > 0) : []
  const perPilotDetail = detailList.find((detail) => detail.label === 'Per Pilot') ?? null
  const hiddenDetailLabels = new Set(['Per Pilot', 'Symbol', 'Token'])
  const sanitizedDetails = detailList.filter((detail) => {
    if (perPilotDetail && detail === perPilotDetail) return false
    return !hiddenDetailLabels.has(detail.label)
  })
  const hasDetails = sanitizedDetails.length > 0
  const descriptorParts =
    assetType === 'points'
      ? []
      : [rewardAsset?.descriptor, rewardAsset?.collectionName, chainMeta.label, displaySymbol]
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean)
  const rewardDescriptor = descriptorParts.length ? descriptorParts.filter((value, index, arr) => arr.indexOf(value) === index).join(' • ') : null
  const metaChips: Array<{ label: string; kind: string; className?: string }> = []
  if (perPilotDetail) metaChips.push({ label: `Per Pilot ${perPilotDetail.value}`, kind: 'per' })
  if (showMultiplier) metaChips.push({ label: `x${formatNumber(multiplier as number)}`, kind: 'multiplier', className: 'quest-reward__chip--multiplier' })
  const hasMetaChips = metaChips.length > 0
  const tooltipId = useId()
  const ariaParts = [`${formatted} ${unit}`]
  if (perPilotDetail) ariaParts.push(`per pilot ${perPilotDetail.value}`)
  if (rewardDescriptor) ariaParts.push(rewardDescriptor)
  const ariaLabel = `${assetLabel}: ${ariaParts.join(' · ')}`
  const titleParts = [assetLabel, rewardDescriptor].filter(Boolean)
  const title = titleParts.length ? titleParts.join(' • ') : assetLabel

  return (
    <div
      className="quest-reward"
      title={title}
      data-has-tooltip={hasDetails}
      data-tier={tier ?? 'common'}
      aria-label={ariaLabel}
      tabIndex={hasDetails ? 0 : undefined}
      aria-describedby={hasDetails ? tooltipId : undefined}
      role="group"
    >
      <div className="quest-reward__badge" aria-hidden>
        <span className="quest-reward__emoji">{chainMeta.icon}</span>
      </div>
      <div className="quest-reward__body">
        <span className="quest-reward__headline">{assetLabel}</span>
        <strong className="quest-reward__value">
          {formatted}
          {unit ? <span className="quest-reward__unit"> {unit}</span> : null}
        </strong>
        {rewardDescriptor ? <span className="quest-reward__token">{rewardDescriptor}</span> : null}
        {hasMetaChips ? (
          <div className="quest-reward__meta" aria-hidden>
            {metaChips.map((chip) => (
              <span
                key={`${chip.kind}-${chip.label}`}
                className={`quest-reward__chip${chip.className ? ` ${chip.className}` : ''}`}
                data-kind={chip.kind}
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {hasDetails ? (
        <div className="quest-reward__tooltip" id={tooltipId} role="note">
          <ul className="quest-reward__tooltip-list">
            {sanitizedDetails.map((item, index) => (
              <li key={`${item.label}-${index}`} className="quest-reward__tooltip-item">
                <span className="quest-reward__tooltip-label">{item.label}</span>
                <span className="quest-reward__tooltip-value">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function normalizeRewardValue(value: number | null | undefined) {
  if (value == null) return 0
  if (!Number.isFinite(value)) return 0
  return value
}
