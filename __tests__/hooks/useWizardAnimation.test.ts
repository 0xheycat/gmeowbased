import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWizardAnimation } from '@/hooks/useWizardAnimation'

// Mock framer-motion's useReducedMotion
vi.mock('framer-motion', () => ({
	useReducedMotion: vi.fn(),
}))

import { useReducedMotion } from 'framer-motion'

describe('useWizardAnimation', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('With Motion Enabled', () => {
		beforeEach(() => {
			vi.mocked(useReducedMotion).mockReturnValue(false)
		})

		it('should return animated section motion config', () => {
			const { result } = renderHook(() => useWizardAnimation())

			expect(result.current.sectionMotion).toEqual({
				initial: { opacity: 0, y: 16 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: -16 },
				transition: { duration: 0.24, ease: 'easeOut' },
			})
		})

		it('should return animated aside motion config', () => {
			const { result } = renderHook(() => useWizardAnimation())

			expect(result.current.asideMotion).toEqual({
				initial: { opacity: 0, scale: 0.97 },
				animate: { opacity: 1, scale: 1 },
				transition: { duration: 0.25, ease: 'easeOut' },
			})
		})

		it('should return prefersReducedMotion as false', () => {
			const { result } = renderHook(() => useWizardAnimation())

			expect(result.current.prefersReducedMotion).toBe(false)
		})
	})

	describe('With Reduced Motion', () => {
		beforeEach(() => {
			vi.mocked(useReducedMotion).mockReturnValue(true)
		})

		it('should return static section motion config', () => {
			const { result } = renderHook(() => useWizardAnimation())

			expect(result.current.sectionMotion).toEqual({
				initial: { opacity: 1, y: 0 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 1, y: 0 },
				transition: { duration: 0 },
			})
		})

		it('should return static aside motion config', () => {
			const { result } = renderHook(() => useWizardAnimation())

			expect(result.current.asideMotion).toEqual({
				initial: { opacity: 1, scale: 1 },
				animate: { opacity: 1, scale: 1 },
				transition: { duration: 0 },
			})
		})

		it('should return prefersReducedMotion as true', () => {
			const { result } = renderHook(() => useWizardAnimation())

			expect(result.current.prefersReducedMotion).toBe(true)
		})

		it('should respect accessibility preferences', () => {
			const { result } = renderHook(() => useWizardAnimation())

			// All transitions should be instant (duration 0)
			expect(result.current.sectionMotion.transition.duration).toBe(0)
			expect(result.current.asideMotion.transition.duration).toBe(0)

			// All animations should be static (no movement)
			expect(result.current.sectionMotion.initial).toEqual(result.current.sectionMotion.animate)
			expect(result.current.asideMotion.initial).toEqual(result.current.asideMotion.animate)
		})
	})

	describe('Memoization', () => {
		it('should memoize motion configs when preference does not change', () => {
			vi.mocked(useReducedMotion).mockReturnValue(false)

			const { result, rerender } = renderHook(() => useWizardAnimation())

			const firstSectionMotion = result.current.sectionMotion
			const firstAsideMotion = result.current.asideMotion

			rerender()

			// Same references should be maintained
			expect(result.current.sectionMotion).toBe(firstSectionMotion)
			expect(result.current.asideMotion).toBe(firstAsideMotion)
		})

		it('should update configs when preference changes', () => {
			vi.mocked(useReducedMotion).mockReturnValue(false)

			const { result, rerender } = renderHook(() => useWizardAnimation())

			const firstSectionMotion = result.current.sectionMotion

			// Change preference
			vi.mocked(useReducedMotion).mockReturnValue(true)
			rerender()

			// New references should be created
			expect(result.current.sectionMotion).not.toBe(firstSectionMotion)
			expect(result.current.sectionMotion.transition.duration).toBe(0)
		})
	})

	describe('Integration', () => {
		it('should provide all required properties for framer-motion', () => {
			vi.mocked(useReducedMotion).mockReturnValue(false)

			const { result } = renderHook(() => useWizardAnimation())

			// Section motion should have all required properties
			expect(result.current.sectionMotion).toHaveProperty('initial')
			expect(result.current.sectionMotion).toHaveProperty('animate')
			expect(result.current.sectionMotion).toHaveProperty('exit')
			expect(result.current.sectionMotion).toHaveProperty('transition')

			// Aside motion should have all required properties
			expect(result.current.asideMotion).toHaveProperty('initial')
			expect(result.current.asideMotion).toHaveProperty('animate')
			expect(result.current.asideMotion).toHaveProperty('transition')
		})

		it('should use appropriate easing functions', () => {
			vi.mocked(useReducedMotion).mockReturnValue(false)

			const { result } = renderHook(() => useWizardAnimation())

			expect(result.current.sectionMotion.transition.ease).toBe('easeOut')
			expect(result.current.asideMotion.transition.ease).toBe('easeOut')
		})
	})
})
