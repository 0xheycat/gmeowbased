/**
 * Accessibility Utilities and Components
 * 
 * ARIA labels, keyboard navigation, focus management, screen reader support
 */

'use client'

import { useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react'

/**
 * Screen reader only text (visually hidden but accessible)
 */
export function ScreenReaderOnly({ children }: { children: ReactNode }) {
	return (
		<span className="sr-only">
			{children}
		</span>
	)
}

/**
 * Skip to content link for keyboard navigation
 */
export function SkipToContent({ targetId = 'main-content' }: { targetId?: string }) {
	return (
		<a
			href={`#${targetId}`}
			className="absolute left-4 top-4 z-50 -translate-y-24 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white dark:text-slate-950 dark:text-white transition focus:translate-y-0"
		>
			Skip to main content
		</a>
	)
}

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(isActive: boolean) {
	const containerRef = useRef<HTMLDivElement>(null)
	const previousFocus = useRef<HTMLElement | null>(null)

	useEffect(() => {
		if (!isActive) return

		// Save previous focus
		previousFocus.current = document.activeElement as HTMLElement

		// Get all focusable elements
		const getFocusableElements = () => {
			if (!containerRef.current) return []
			
			return Array.from(
				containerRef.current.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			)
		}

		// Focus first element
		const focusableElements = getFocusableElements()
		if (focusableElements.length > 0) {
			focusableElements[0].focus()
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return

			const focusableElements = getFocusableElements()
			if (focusableElements.length === 0) return

			const firstElement = focusableElements[0]
			const lastElement = focusableElements[focusableElements.length - 1]

			if (e.shiftKey) {
				// Shift + Tab
				if (document.activeElement === firstElement) {
					e.preventDefault()
					lastElement.focus()
				}
			} else {
				// Tab
				if (document.activeElement === lastElement) {
					e.preventDefault()
					firstElement.focus()
				}
			}
		}

		// @ts-ignore - addEventListener types
		document.addEventListener('keydown', handleKeyDown)

		return () => {
			// @ts-ignore
			document.removeEventListener('keydown', handleKeyDown)
			
			// Restore focus
			if (previousFocus.current) {
				previousFocus.current.focus()
			}
		}
	}, [isActive])

	return containerRef
}

/**
 * Announce to screen readers via ARIA live region
 */
export function useAnnouncer() {
	const announcerRef = useRef<HTMLDivElement>(null)

	const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
		if (!announcerRef.current) return

		// Clear existing announcement
		announcerRef.current.textContent = ''
		
		// Set new announcement after a brief delay
		setTimeout(() => {
			if (announcerRef.current) {
				announcerRef.current.setAttribute('aria-live', priority)
				announcerRef.current.textContent = message
			}
		}, 100)
	}

	const AnnouncerRegion = () => (
		<div
			ref={announcerRef}
			role="status"
			aria-live="polite"
			aria-atomic="true"
			className="sr-only"
		/>
	)

	return { announce, AnnouncerRegion }
}

/**
 * Accessible button with loading and disabled states
 */
export function AccessibleButton({
	children,
	onClick,
	disabled = false,
	loading = false,
	ariaLabel,
	className = '',
	variant = 'primary',
}: {
	children: ReactNode
	onClick: () => void
	disabled?: boolean
	loading?: boolean
	ariaLabel?: string
	className?: string
	variant?: 'primary' | 'secondary' | 'danger'
}) {
	const variants = {
		primary: 'bg-sky-500 hover:bg-sky-600 text-slate-900 dark:text-slate-950 dark:text-white',
		secondary: 'bg-slate-100/90 dark:bg-white/5/10 hover:bg-slate-100/90 dark:bg-white/5/20 text-slate-900 dark:text-slate-950 dark:text-white',
		danger: 'bg-red-500 hover:bg-red-600 text-slate-900 dark:text-slate-950 dark:text-white',
	}

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			aria-label={ariaLabel}
			aria-busy={loading}
			aria-disabled={disabled || loading}
			className={`rounded-xl px-4 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
		>
			{loading ? (
				<span className="flex items-center gap-2">
					<span className="animate-spin">⟳</span>
					<span>Loading...</span>
				</span>
			) : (
				children
			)}
		</button>
	)
}

/**
 * Accessible form field with proper labeling
 */
export function AccessibleField({
	id,
	label,
	error,
	hint,
	required = false,
	children,
}: {
	id: string
	label: string
	error?: string | null
	hint?: string
	required?: boolean
	children: ReactNode
}) {
	const errorId = `${id}-error`
	const hintId = `${id}-hint`
	
	const describedBy = [
		hint ? hintId : null,
		error ? errorId : null,
	].filter(Boolean).join(' ') || undefined

	return (
		<div className="space-y-2">
			<label htmlFor={id} className="block text-sm font-medium text-slate-200">
				{label}
				{required && <span className="ml-1 text-red-400" aria-label="required">*</span>}
			</label>
			
			{hint && (
				<p id={hintId} className="text-xs text-slate-400">
					{hint}
				</p>
			)}
			
			<div aria-describedby={describedBy}>
				{children}
			</div>
			
			{error && (
				<p id={errorId} role="alert" className="text-xs text-red-400">
					{error}
				</p>
			)}
		</div>
	)
}

/**
 * Keyboard navigation helper for lists
 */
export function useKeyboardList<T>({
	items,
	onSelect,
	isActive,
}: {
	items: T[]
	onSelect: (item: T) => void
	isActive: boolean
}) {
	const activeIndexRef = useRef(0)

	const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
		if (!isActive || items.length === 0) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				activeIndexRef.current = Math.min(activeIndexRef.current + 1, items.length - 1)
				break
			case 'ArrowUp':
				e.preventDefault()
				activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0)
				break
			case 'Home':
				e.preventDefault()
				activeIndexRef.current = 0
				break
			case 'End':
				e.preventDefault()
				activeIndexRef.current = items.length - 1
				break
			case 'Enter':
			case ' ':
				e.preventDefault()
				if (items[activeIndexRef.current]) {
					onSelect(items[activeIndexRef.current])
				}
				break
			default:
				break
		}
	}

	return { activeIndex: activeIndexRef.current, handleKeyDown }
}

/**
 * Progress indicator with ARIA attributes
 */
export function ProgressIndicator({
	current,
	total,
	label,
}: {
	current: number
	total: number
	label?: string
}) {
	const percentage = Math.round((current / total) * 100)

	return (
		<div
			role="progressbar"
			aria-valuenow={current}
			aria-valuemin={0}
			aria-valuemax={total}
			aria-label={label || `Step ${current} of ${total}`}
			className="space-y-2"
		>
			<div className="flex justify-between text-sm text-slate-300">
				<span>{label || 'Progress'}</span>
				<span>{percentage}%</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-slate-100/10 dark:bg-slate-100/90 dark:bg-white/5/5">
				<div
					className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	)
}
