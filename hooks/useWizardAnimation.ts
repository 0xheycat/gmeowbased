import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Hook to manage wizard animation configurations based on user's motion preferences.
 * 
 * Provides Framer Motion animation variants that respect the user's reduced-motion
 * system preference for accessibility. Returns optimized animation configs for
 * section and aside elements with appropriate transitions.
 * 
 * @returns Object containing:
 *   - sectionMotion: Animation variants for main section content
 *   - asideMotion: Animation variants for aside/sidebar elements
 *   - prefersReducedMotion: Boolean indicating if user prefers reduced motion
 * 
 * @example
 * ```tsx
 * import { motion } from 'framer-motion'
 * 
 * const { sectionMotion, asideMotion } = useWizardAnimation()
 * 
 * return (
 *   <>
 *     <motion.section {...sectionMotion}>
 *       {content}
 *     </motion.section>
 *     <motion.aside {...asideMotion}>
 *       {sidebar}
 *     </motion.aside>
 *   </>
 * )
 * ```
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
