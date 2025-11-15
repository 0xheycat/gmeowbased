import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Hook to manage wizard animation configurations based on user's motion preferences.
 * Respects user's reduced-motion system preference for accessibility.
 * 
 * @returns Object containing animation variants and transition configs for section and aside elements
 */
export function useWizardAnimation() {
	const prefersReducedMotion = useReducedMotion()

	const sectionMotion = useMemo(
		() =>
			prefersReducedMotion
				? {
					initial: { opacity: 1, y: 0 },
					animate: { opacity: 1, y: 0 },
					exit: { opacity: 1, y: 0 },
					transition: { duration: 0 },
				}
				: {
					initial: { opacity: 0, y: 16 },
					animate: { opacity: 1, y: 0 },
					exit: { opacity: 0, y: -16 },
					transition: { duration: 0.24, ease: 'easeOut' },
				},
		[prefersReducedMotion],
	)

	const asideMotion = useMemo(
		() =>
			prefersReducedMotion
				? {
					initial: { opacity: 1, scale: 1 },
					animate: { opacity: 1, scale: 1 },
					transition: { duration: 0 },
				}
				: {
					initial: { opacity: 0, scale: 0.97 },
					animate: { opacity: 1, scale: 1 },
					transition: { duration: 0.25, ease: 'easeOut' },
				},
		[prefersReducedMotion],
	)

	return {
		sectionMotion,
		asideMotion,
		prefersReducedMotion,
	}
}
