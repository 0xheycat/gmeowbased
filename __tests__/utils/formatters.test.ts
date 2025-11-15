import { describe, it, expect } from 'vitest'
import {
	formatUnknownError,
	isAbortError,
	shortenAddress,
} from '@/components/quest-wizard/utils/formatters'

describe('formatters utilities', () => {
	describe('formatUnknownError', () => {
		it('should format Error objects', () => {
			const error = new Error('Test error message')
			expect(formatUnknownError(error, 'Unknown error')).toBe('Test error message')
		})

		it('should format string errors', () => {
			expect(formatUnknownError('Simple error', 'Unknown error')).toBe('Simple error')
		})

		it('should use fallback for objects without message', () => {
			const error = { code: 'ERR_001' }
			expect(formatUnknownError(error, 'Unknown error')).toBe('Unknown error')
		})

		it('should use fallback for null', () => {
			expect(formatUnknownError(null, 'Unknown error')).toBe('Unknown error')
		})

		it('should use fallback for undefined', () => {
			expect(formatUnknownError(undefined, 'Unknown error')).toBe('Unknown error')
		})

		it('should use fallback for empty string', () => {
			expect(formatUnknownError('', 'Unknown error')).toBe('Unknown error')
		})

		it('should use fallback for whitespace only', () => {
			expect(formatUnknownError('   ', 'Unknown error')).toBe('Unknown error')
		})

		it('should trim string errors', () => {
			expect(formatUnknownError('  Error message  ', 'Unknown error')).toBe('Error message')
		})
	})

	describe('isAbortError', () => {
		it('should detect AbortError by name', () => {
			const error = new Error('Aborted')
			error.name = 'AbortError'
			expect(isAbortError(error)).toBe(true)
		})

		it('should return false for normal Error', () => {
			const error = new Error('The operation was aborted')
			expect(isAbortError(error)).toBe(false)
		})

		it('should return false for non-abort errors', () => {
			const error = new Error('Normal error')
			expect(isAbortError(error)).toBe(false)
		})

		it('should return false for null', () => {
			expect(isAbortError(null)).toBe(false)
		})

		it('should return false for undefined', () => {
			expect(isAbortError(undefined)).toBe(false)
		})

		it('should return false for non-error objects', () => {
			expect(isAbortError({ message: 'not an error' })).toBe(false)
		})

		it('should detect DOMException AbortError', () => {
			const error = new DOMException('Request aborted', 'AbortError')
			expect(isAbortError(error)).toBe(true)
		})
	})

	describe('shortenAddress', () => {
		const fullAddress = '0x1234567890123456789012345678901234567890'

		it('should shorten valid Ethereum address', () => {
			const shortened = shortenAddress(fullAddress)
			expect(shortened).toBe('0x1234…7890')
			expect(shortened.length).toBeLessThan(fullAddress.length)
		})

		it('should use default format (6 chars + ellipsis + 4 chars)', () => {
			const shortened = shortenAddress(fullAddress)
			expect(shortened).toMatch(/^0x\w{4}…\w{4}$/)
		})

		it('should handle short addresses', () => {
			const shortAddr = '0x1234'
			const shortened = shortenAddress(shortAddr)
			expect(shortened).toBe(shortAddr)
		})

		it('should preserve 0x prefix', () => {
			const shortened = shortenAddress(fullAddress)
			expect(shortened.startsWith('0x')).toBe(true)
		})

		it('should include ellipsis character (…)', () => {
			const shortened = shortenAddress(fullAddress)
			expect(shortened.includes('…')).toBe(true)
		})

		it('should handle empty string', () => {
			const shortened = shortenAddress('')
			expect(shortened).toBe('')
		})
	})
})
