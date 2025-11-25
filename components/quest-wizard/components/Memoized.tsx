/**
 * Performance-optimized memoized components
 * 
 * These components use React.memo to prevent unnecessary re-renders
 * when parent components update but props remain the same.
 */

import { memo } from 'react'
import Image from 'next/image'
import type { TokenOption, NftOption } from '../shared'
import { CHAIN_LABEL } from '@/lib/gm-utils'
import { formatUsd, formatEth } from '../shared'

/**
 * Memoized token list item - only re-renders when token data changes
 */
export const TokenListItem = memo<{
	token: TokenOption
	isSelected: boolean
	isSelectable: boolean
	disabledReason?: string
	onSelect: (token: TokenOption) => void
	onMouseEnter?: () => void
}>(
	function TokenListItem({ token, isSelected, isSelectable, disabledReason, onSelect, onMouseEnter }) {
		return (
			<button
				type="button"
				onClick={() => isSelectable && onSelect(token)}
				onMouseEnter={onMouseEnter}
				disabled={!isSelectable}
				className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
					isSelectable ? 'cursor-pointer hover:bg-slate-100/90 dark:bg-white/5/5' : 'cursor-not-allowed opacity-60'
				} ${isSelected ? 'bg-sky-500/15 text-sky-100' : ''}`}
			>
				<span className="flex items-center gap-3">
					<Image
						src={token.icon}
						alt={`${token.symbol} icon`}
						width={32}
						height={32}
						className="h-8 w-8 rounded-full border border-white dark:border-slate-700/10 bg-slate-900 object-cover"
						unoptimized
					/>
					<span className="flex flex-col text-sm font-medium text-slate-100">
						<span>{token.name}</span>
						{disabledReason && (
							<span className="text-[10px] text-amber-200">{disabledReason}</span>
						)}
					</span>
				</span>
				<span className="flex flex-col items-end text-xs text-slate-300">
					<span className="font-semibold text-slate-200">{token.symbol}</span>
					<span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
						{CHAIN_LABEL[token.chain]}
					</span>
					{token.priceUsd != null ? (
						<span>{formatUsd(token.priceUsd)}</span>
					) : (
						<span className="text-slate-500">No price</span>
					)}
					<span
						className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[9px] uppercase tracking-[0.2em] ${
							token.verified ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-100'
						}`}
					>
						{token.verified ? 'Verified' : 'Manual review'}
					</span>
				</span>
			</button>
		)
	},
	(prev, next) => {
		// Only re-render if these specific props change
		return (
			prev.token.id === next.token.id &&
			prev.isSelected === next.isSelected &&
			prev.isSelectable === next.isSelectable &&
			prev.disabledReason === next.disabledReason
		)
	}
)

/**
 * Memoized NFT card item - only re-renders when NFT data changes
 */
export const NftListItem = memo<{
	nft: NftOption
	isSelected: boolean
	isSelectable: boolean
	disabledReason?: string
	onSelect: (nft: NftOption) => void
}>(
	function NftListItem({ nft, isSelected, isSelectable, disabledReason, onSelect }) {
		return (
			<button
				type="button"
				onClick={() => isSelectable && onSelect(nft)}
				disabled={!isSelectable}
				className={`flex w-full items-center gap-3 px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
					isSelected ? 'bg-sky-500/15 text-sky-100' : isSelectable ? 'hover:bg-slate-100/90 dark:bg-white/5/5' : 'cursor-not-allowed opacity-60'
				}`}
			>
				<Image
					src={nft.image}
					alt={`${nft.name} cover`}
					width={44}
					height={44}
					className="h-11 w-11 rounded-xl border border-white dark:border-slate-700/10 bg-slate-900 object-cover"
					unoptimized
				/>
				<div className="flex flex-col text-sm text-slate-100">
					<span className="font-semibold">{nft.name}</span>
					<span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
						{CHAIN_LABEL[nft.chain]}
					</span>
					{disabledReason && <span className="text-[10px] text-amber-200">{disabledReason}</span>}
				</div>
				<span className="ml-auto flex flex-col items-end gap-1 text-xs text-slate-300">
					<span>
						{nft.floorPriceEth != null ? `${formatEth(nft.floorPriceEth)} floor` : 'No floor data'}
					</span>
					<span
						className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
							nft.verified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'
						}`}
					>
						{nft.verified ? 'Verified' : 'Manual review'}
					</span>
				</span>
			</button>
		)
	},
	(prev, next) => {
		return (
			prev.nft.id === next.nft.id &&
			prev.isSelected === next.isSelected &&
			prev.isSelectable === next.isSelectable &&
			prev.disabledReason === next.disabledReason
		)
	}
)

/**
 * Memoized field component - prevents re-renders when sibling fields update
 */
export const MemoizedField = memo<{
	label: string
	error?: string | null
	children: React.ReactNode
	className?: string
}>(
	function MemoizedField({ label, error, children, className = '' }) {
		return (
			<div className={`space-y-2 ${className}`}>
				<label className="block text-sm font-medium text-slate-200">{label}</label>
				{children}
				{error && <p className="text-xs text-rose-400">{error}</p>}
			</div>
		)
	},
	(prev, next) => {
		return prev.label === next.label && prev.error === next.error && prev.children === next.children
	}
)
