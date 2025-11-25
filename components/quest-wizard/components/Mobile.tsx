/**
 * Mobile UX Enhancements
 * 
 * Touch gestures, swipe navigation, and mobile-optimized components
 */

'use client'

import { useState, useRef, useEffect, type TouchEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'

/**
 * Swipeable wizard step container with gesture support
 */
export function SwipeableStep({
	children,
	onSwipeLeft,
	onSwipeRight,
	canSwipeLeft = true,
	canSwipeRight = true,
}: {
	children: ReactNode
	onSwipeLeft?: () => void
	onSwipeRight?: () => void
	canSwipeLeft?: boolean
	canSwipeRight?: boolean
}) {
	const x = useMotionValue(0)
	const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5])
	
	// First-time swipe tutorial
	const [showTutorial, setShowTutorial] = useState(false)
	
	useEffect(() => {
		const hasSeenTutorial = localStorage.getItem('quest-wizard-swipe-tutorial')
		if (!hasSeenTutorial) {
			setShowTutorial(true)
			// Auto-hide after 5 seconds
			const timer = setTimeout(() => {
				setShowTutorial(false)
				localStorage.setItem('quest-wizard-swipe-tutorial', 'seen')
			}, 5000)
			return () => clearTimeout(timer)
		}
	}, [])
	
	const handleDragEnd = (_: any, info: PanInfo) => {
		const threshold = 50
		
		if (info.offset.x > threshold && canSwipeRight && onSwipeRight) {
			onSwipeRight()
		} else if (info.offset.x < -threshold && canSwipeLeft && onSwipeLeft) {
			onSwipeLeft()
		}
	}

	return (
		<motion.div
			drag="x"
			dragConstraints={{ left: 0, right: 0 }}
			dragElastic={0.2}
			onDragEnd={handleDragEnd}
			style={{ x, opacity }}
			className="touch-pan-y"
		>
			{children}
			
			{/* Swipe indicators with tutorial */}
			<div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-4 lg:hidden">
				{canSwipeRight && (
					<motion.div
						className={`rounded-full bg-slate-100/90 dark:bg-white/5/10 p-3 backdrop-blur ${
							showTutorial ? 'animate-bounce' : ''
						}`}
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: showTutorial ? 0.9 : 0.5, x: 0 }}
						transition={{ duration: 0.3 }}
					>
						<span className="text-2xl">←</span>
					</motion.div>
				)}
				{canSwipeLeft && (
					<motion.div
						className={`rounded-full bg-slate-100/90 dark:bg-white/5/10 p-3 backdrop-blur ${
							showTutorial ? 'animate-bounce' : ''
						}`}
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: showTutorial ? 0.9 : 0.5, x: 0 }}
						transition={{ duration: 0.3 }}
					>
						<span className="text-2xl">→</span>
					</motion.div>
				)}
			</div>
			
			{/* Tutorial tooltip */}
			{showTutorial && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 lg:hidden"
				>
					<div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 backdrop-blur-xl">
						<p className="text-center text-sm font-medium text-sky-200">
							👆 Swipe left or right to navigate steps
						</p>
					</div>
				</motion.div>
			)}
		</motion.div>
	)
}

/**
 * Mobile-optimized bottom sheet component
 */
export function BottomSheet({
	isOpen,
	onClose,
	title,
	children,
}: {
	isOpen: boolean
	onClose: () => void
	title: string
	children: ReactNode
}) {
	const [, setIsDragging] = useState(false)
	const y = useMotionValue(0)
	
	const handleDragEnd = (_: any, info: PanInfo) => {
		setIsDragging(false)
		
		if (info.offset.y > 100) {
			onClose()
		}
	}

	useEffect(() => {
		if (isOpen) {
			// Prevent body scroll when sheet is open
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		
		return () => {
			document.body.style.overflow = ''
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<>
			{/* Backdrop */}
			<motion.div
				className="fixed inset-0 z-40 bg-black dark:bg-slate-950/60 backdrop-blur-sm lg:hidden"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				onClick={onClose}
			/>
			
			{/* Sheet */}
			<motion.div
				className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-3xl border-t border-white dark:border-slate-700/10 bg-slate-950/95 backdrop-blur-xl lg:hidden"
				drag="y"
				dragConstraints={{ top: 0, bottom: 0 }}
				dragElastic={0.2}
				onDragStart={() => setIsDragging(true)}
				onDragEnd={handleDragEnd}
				style={{ y }}
				initial={{ y: '100%' }}
				animate={{ y: 0 }}
				exit={{ y: '100%' }}
				transition={{ type: 'spring', damping: 30, stiffness: 300 }}
			>
				{/* Drag handle */}
				<div className="flex justify-center py-3">
					<div className="h-1 w-12 rounded-full bg-slate-100/20 dark:bg-slate-100/90 dark:bg-white/5/5" />
				</div>
				
				{/* Header */}
				<div className="border-b border-white dark:border-slate-700/10 px-6 pb-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold text-white dark:text-slate-950 dark:text-white">{title}</h3>
						<button
							onClick={onClose}
							className="rounded-full p-2 text-white dark:text-slate-950 dark:text-slate-700 dark:text-white/60 transition hover:bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5/5 hover:text-white dark:text-slate-950 dark:text-white"
							aria-label="Close"
						>
							✕
						</button>
					</div>
				</div>
				
				{/* Content */}
				<div className="max-h-[70vh] overflow-y-auto px-6 py-4">
					{children}
				</div>
			</motion.div>
		</>
	)
}

/**
 * Mobile-optimized step progress indicator
 */
export function MobileStepIndicator({
	steps,
	activeIndex,
	onStepClick,
}: {
	steps: Array<{ label: string; status: 'done' | 'active' | 'waiting' }>
	activeIndex: number
	onStepClick?: (index: number) => void
}) {
	return (
		<div className="flex gap-2 overflow-x-auto px-4 py-3 lg:hidden">
			{steps.map((step, index) => {
				const isActive = index === activeIndex
				const isDone = step.status === 'done'
				const isClickable = isDone && onStepClick
				
				return (
					<button
						key={step.label}
						onClick={() => isClickable && onStepClick(index)}
						disabled={!isClickable}
						className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
							isActive
								? 'bg-sky-500 text-slate-900 dark:text-slate-950 dark:text-white'
								: isDone
									? 'bg-emerald-500/20 text-emerald-300'
									: 'bg-slate-100/90 dark:bg-white/5/5 text-slate-900 dark:text-slate-950 dark:text-slate-700 dark:text-white/40'
						} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
					>
						<span className="flex items-center gap-1.5">
							{isDone && <span>✓</span>}
							<span>{step.label}</span>
						</span>
					</button>
				)
			})}
		</div>
	)
}

/**
 * Touch-optimized input with better mobile UX
 */
export function TouchInput({
	value,
	onChange,
	onBlur,
	placeholder,
	type = 'text',
	className = '',
	...props
}: {
	value: string
	onChange: (value: string) => void
	onBlur?: () => void
	placeholder?: string
	type?: 'text' | 'number' | 'email' | 'url'
	className?: string
	[key: string]: any
}) {
	const [isFocused, setIsFocused] = useState(false)

	return (
		<div className="relative">
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => setIsFocused(true)}
				onBlur={() => {
					setIsFocused(false)
					onBlur?.()
				}}
				placeholder={placeholder}
				className={`w-full rounded-xl border px-4 py-3 text-base transition ${
					isFocused
						? 'border-sky-500 ring-2 ring-sky-500/20'
						: 'border-white/10 hover:border-white/20'
				} bg-slate-950/60 text-slate-900 dark:text-slate-950 dark:text-white placeholder:text-slate-500 ${className}`}
				{...props}
			/>
			
			{/* Touch feedback indicator */}
			{isFocused && (
				<motion.div
					className="pointer-events-none absolute -inset-1 rounded-xl border-2 border-sky-500/40"
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0 }}
				/>
			)}
		</div>
	)
}

/**
 * Pull-to-refresh component for mobile
 */
export function PullToRefresh({
	children,
	onRefresh,
}: {
	children: ReactNode
	onRefresh: () => Promise<void>
}) {
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [pullDistance, setPullDistance] = useState(0)
	const startY = useRef(0)
	const threshold = 80

	const handleTouchStart = (e: TouchEvent) => {
		startY.current = e.touches[0].clientY
	}

	const handleTouchMove = (e: TouchEvent) => {
		if (window.scrollY === 0 && !isRefreshing) {
			const distance = e.touches[0].clientY - startY.current
			if (distance > 0) {
				setPullDistance(Math.min(distance, threshold * 1.5))
			}
		}
	}

	const handleTouchEnd = async () => {
		if (pullDistance > threshold && !isRefreshing) {
			setIsRefreshing(true)
			try {
				await onRefresh()
			} finally {
				setIsRefreshing(false)
				setPullDistance(0)
			}
		} else {
			setPullDistance(0)
		}
	}

	const opacity = Math.min(pullDistance / threshold, 1)
	const rotation = (pullDistance / threshold) * 360

	return (
		<div
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			className="relative"
		>
			{/* Pull indicator */}
			<motion.div
				className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5/5 backdrop-blur"
				style={{
					top: pullDistance / 2,
					opacity,
					width: 40,
					height: 40,
				}}
				animate={{ rotate: rotation }}
			>
				{isRefreshing ? (
					<span className="text-sky-400">⟳</span>
				) : (
					<span className="text-white dark:text-slate-950 dark:text-white">↓</span>
				)}
			</motion.div>
			
			<motion.div
				style={{
					transform: `translateY(${isRefreshing ? 40 : pullDistance / 3}px)`,
				}}
				transition={{ type: 'spring', stiffness: 300, damping: 30 }}
			>
				{children}
			</motion.div>
		</div>
	)
}
