/**
 * Yu-Gi-Oh style Quest Card Component
 * 
 * Features:
 * - Holographic foil effect on hover
 * - Card flip animation to show details
 * - Stats display (attack/defense style)
 * - Rarity indicator
 * - Particle effects
 */

'use client'

import { useState, useRef, type MouseEvent } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import type { QuestSummary } from '../shared'

export type QuestCardProps = {
	summary: QuestSummary
	variant?: 'normal' | 'rare' | 'epic' | 'legendary'
	showFlip?: boolean
	className?: string
}

const RARITY_COLORS = {
	normal: { border: 'border-slate-400', glow: 'shadow-slate-400/20', bg: 'bg-gradient-to-br from-slate-700 to-slate-800' },
	rare: { border: 'border-blue-400', glow: 'shadow-blue-400/30', bg: 'bg-gradient-to-br from-blue-700 to-blue-900' },
	epic: { border: 'border-purple-400', glow: 'shadow-purple-400/40', bg: 'bg-gradient-to-br from-purple-700 to-purple-900' },
	legendary: { border: 'border-amber-400', glow: 'shadow-amber-400/50', bg: 'bg-gradient-to-br from-amber-600 to-orange-700' },
}

export function QuestCard({ summary, variant = 'rare', showFlip = true, className = '' }: QuestCardProps) {
	const [isFlipped, setIsFlipped] = useState(false)
	const [isHovering, setIsHovering] = useState(false)
	const cardRef = useRef<HTMLDivElement>(null)
	
	// Holographic effect
	const mouseX = useMotionValue(0)
	const mouseY = useMotionValue(0)
	
	const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10])
	const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10])
	const glareX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%'])
	const glareY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%'])

	const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
		if (!cardRef.current || !isHovering) return
		
		const rect = cardRef.current.getBoundingClientRect()
		const x = (e.clientX - rect.left) / rect.width - 0.5
		const y = (e.clientY - rect.top) / rect.height - 0.5
		
		mouseX.set(x)
		mouseY.set(y)
	}

	const handleMouseEnter = () => {
		setIsHovering(true)
	}

	const handleMouseLeave = () => {
		setIsHovering(false)
		mouseX.set(0)
		mouseY.set(0)
	}

	const colors = RARITY_COLORS[variant]

	// Calculate quest stats (Yu-Gi-Oh ATK/DEF style)
	const attackPoints = 1000 // Default attack power
	const defensePoints = 500 // Default defense power

	return (
		<div className={`perspective-1000 ${className}`}>
			<motion.div
				ref={cardRef}
				className="relative w-full max-w-[320px] cursor-pointer"
				style={{ transformStyle: 'preserve-3d' }}
				animate={{ rotateY: isFlipped ? 180 : 0 }}
				transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
				onClick={() => showFlip && setIsFlipped(!isFlipped)}
				onMouseMove={handleMouseMove}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				{/* Front Face */}
				<motion.div
					className="absolute inset-0 rounded-2xl backface-hidden"
					style={{
						rotateX: isHovering ? rotateX : 0,
						rotateY: isHovering ? rotateY : 0,
						transformStyle: 'preserve-3d',
					}}
					transition={{ type: 'spring', stiffness: 400, damping: 30 }}
				>
					<div className={`relative h-[440px] overflow-hidden rounded-2xl border-2 ${colors.border} ${colors.glow} shadow-2xl`}>
						{/* Holographic glare effect */}
						{isHovering && (
							<motion.div
								className="pointer-events-none absolute inset-0 opacity-40"
								style={{
									background: `radial-gradient(circle at ${glareX.get()} ${glareY.get()}, rgba(255,255,255,0.8) 0%, transparent 50%)`,
								}}
							/>
						)}

						{/* Card header */}
						<div className={`relative ${colors.bg} px-4 py-3`}>
							<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<h3 className="truncate text-lg font-bold text-slate-950 dark:text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
											{summary.title || 'Untitled Quest'}
										</h3>
										<p className="text-xs uppercase tracking-wider text-slate-950 dark:text-white/80">{summary.questTypeLabel}</p>
								</div>
								<RarityBadge variant={variant} />
							</div>
						</div>

					{/* Card image/illustration area */}
							<div className="relative h-[200px] overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
								{summary.mediaPreview ? (
									<Image 
										src={summary.mediaPreview} 
										alt={summary.title}
										fill
										sizes="(max-width: 768px) 100vw, 400px"
										className="object-cover opacity-60"
										loading="lazy"
									/>
								) : (
								<div className="flex h-full items-center justify-center">
									<div className="text-6xl opacity-20">🎴</div>
								</div>
							)}
							
							{/* Particle overlay effect */}
							{isHovering && <ParticleEffect />}
						</div>

						{/* Description box */}
						<div className="border-t-2 border-white dark:border-slate-700/10 bg-slate-950/90 px-4 py-3">
							<p className="line-clamp-3 text-xs leading-relaxed text-slate-300">
								{summary.subtitle || summary.description || 'A legendary quest awaits brave adventurers...'}
							</p>
						</div>

						{/* Stats footer (ATK/DEF style) */}
						<div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t-2 border-white dark:border-slate-700/10 bg-slate-950/95 px-4 py-2">
							<StatBadge label="ATK" value={attackPoints} color="text-red-400" />
							<ChainBadge chain={summary.chainLabel} />
							<StatBadge label="DEF" value={defensePoints} color="text-blue-400" />
						</div>
					</div>
				</motion.div>

				{/* Back Face */}
				{showFlip && (
					<motion.div
						className="absolute inset-0 rounded-2xl backface-hidden"
						style={{
							rotateY: 180,
							transformStyle: 'preserve-3d',
						}}
					>
						<div className={`relative h-[440px] overflow-hidden rounded-2xl border-2 ${colors.border} ${colors.glow} shadow-2xl`}>
							<div className={`h-full ${colors.bg} p-6`}>
								<h4 className="mb-4 text-center text-xl font-bold text-slate-950 dark:text-white">Quest Details</h4>
								
								<div className="space-y-3 text-sm text-slate-950 dark:text-white/90">
									<DetailRow label="Type" value={summary.questTypeLabel} />
									<DetailRow label="Chain" value={summary.chainLabel} />
									<DetailRow label="Reward" value={summary.rewardBadge || 'TBD'} />
									<DetailRow label="Eligibility" value={summary.eligibilityBadge || 'Open to all'} />
									{summary.partnerCopy && (
										<DetailRow label="Partner" value={summary.partnerCopy} />
									)}
								</div>

								<div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white dark:border-slate-700/20 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 p-3 text-center backdrop-blur">
									<p className="text-xs text-slate-950 dark:text-white/70">Click to flip back</p>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</motion.div>
		</div>
	)
}

function RarityBadge({ variant }: { variant: QuestCardProps['variant'] }) {
	const stars = variant === 'legendary' ? 5 : variant === 'epic' ? 4 : variant === 'rare' ? 3 : 1
	
	return (
		<div className="flex gap-0.5">
			{Array.from({ length: stars }).map((_, i) => (
				<span key={i} className="text-amber-300" style={{ textShadow: '0 0 8px rgba(252, 211, 77, 0.8)' }}>
					★
				</span>
			))}
		</div>
	)
}

function StatBadge({ label, value, color }: { label: string; value: number | string; color: string }) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-[10px] font-bold uppercase tracking-wider text-slate-950 dark:text-white/60">{label}</span>
			<span className={`text-lg font-black ${color}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
				{value}
			</span>
		</div>
	)
}

function ChainBadge({ chain }: { chain: string }) {
	const chainIcons: Record<string, string> = {
		base: '🔵',
		op: '🔴',
		celo: '🟡',
		eth: '💎',
	}

	return (
		<div className="rounded-full border border-white dark:border-slate-700/20 bg-slate-100/5 dark:bg-slate-100/90 dark:bg-white/5 px-3 py-1 backdrop-blur">
			<span className="text-sm">{chainIcons[chain] || '⛓️'}</span>
		</div>
	)
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between">
			<span className="font-semibold text-slate-950 dark:text-white/60">{label}:</span>
			<span className="text-right text-slate-950 dark:text-white">{value}</span>
		</div>
	)
}

function ParticleEffect() {
	const particles = Array.from({ length: 20 }).map((_, i) => ({
		id: i,
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: Math.random() * 3 + 1,
		duration: Math.random() * 2 + 1,
	}))

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{particles.map((p) => (
				<motion.div
					key={p.id}
					className="absolute rounded-full bg-slate-100/60 dark:bg-slate-100/90 dark:bg-white/5"
					style={{
						left: `${p.x}%`,
						top: `${p.y}%`,
						width: p.size,
						height: p.size,
					}}
					animate={{
						y: [0, -50, 0],
						opacity: [0, 1, 0],
						scale: [0, 1.5, 0],
					}}
					transition={{
						duration: p.duration,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
			))}
		</div>
	)
}
