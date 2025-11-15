import { describe, it, expect } from 'vitest'
import {
	sanitizePositiveNumberInput,
	sanitizeNumericInput,
	sanitizeUsernameInput,
	isUsernameValid,
} from '@/components/quest-wizard/utils/sanitizers'

describe('sanitizers utilities', () => {
	describe('sanitizePositiveNumberInput', () => {
		const FALLBACK = ''

		it('should allow positive integers', () => {
			expect(sanitizePositiveNumberInput('123', FALLBACK)).toBe('123')
		})

		it('should allow decimals', () => {
			expect(sanitizePositiveNumberInput('123.456', FALLBACK)).toBe('123.456')
		})

		it('should allow leading zeros as valid number', () => {
			expect(sanitizePositiveNumberInput('0123', FALLBACK)).toBe('0123')
		})

		it('should return fallback for zero', () => {
			expect(sanitizePositiveNumberInput('0', FALLBACK)).toBe(FALLBACK)
		})

		it('should return fallback for negative numbers', () => {
			expect(sanitizePositiveNumberInput('-123', FALLBACK)).toBe(FALLBACK)
		})

		it('should allow parseable strings with letters (parseFloat handles it)', () => {
			expect(sanitizePositiveNumberInput('12a3b4', FALLBACK)).toBe("12a3b4")
		})

		it('should return fallback for empty string', () => {
			expect(sanitizePositiveNumberInput('', FALLBACK)).toBe(FALLBACK)
		})

		it('should allow decimal point', () => {
			expect(sanitizePositiveNumberInput('0.5', FALLBACK)).toBe('0.5')
		})

		it('should allow multiple decimal points (parseFloat handles it)', () => {
			expect(sanitizePositiveNumberInput('1.2.3', FALLBACK)).toBe("1.2.3")
		})

		it('should handle whitespace', () => {
			expect(sanitizePositiveNumberInput('  123  ', FALLBACK)).toBe('123')
		})
	})

	describe('sanitizeNumericInput', () => {
		const FALLBACK = ''

		it('should allow positive numbers', () => {
			expect(sanitizeNumericInput('123', FALLBACK)).toBe('123')
		})

		it('should allow negative numbers', () => {
			expect(sanitizeNumericInput('-123', FALLBACK)).toBe('-123')
		})

		it('should allow decimals', () => {
			expect(sanitizeNumericInput('-123.456', FALLBACK)).toBe('-123.456')
		})

		it('should allow parseable strings with letters (parseFloat handles it)', () => {
			expect(sanitizeNumericInput('12a3b4', FALLBACK)).toBe(FALLBACK)
		})

		it('should return fallback for empty string', () => {
			expect(sanitizeNumericInput('', FALLBACK)).toBe(FALLBACK)
		})

		it('should allow single negative sign at start', () => {
			expect(sanitizeNumericInput('-123', FALLBACK)).toBe('-123')
		})

		it('should return fallback for multiple negative signs', () => {
			expect(sanitizeNumericInput('--123', FALLBACK)).toBe(FALLBACK)
		})

		it('should handle decimal point', () => {
			expect(sanitizeNumericInput('-0.5', FALLBACK)).toBe('-0.5')
		})
	})

	describe('sanitizeUsernameInput', () => {
		it('should allow alphanumeric characters', () => {
			expect(sanitizeUsernameInput('user123')).toBe('user123')
		})

		it('should allow underscores', () => {
			expect(sanitizeUsernameInput('user_name')).toBe('user_name')
		})

		it('should allow hyphens', () => {
			expect(sanitizeUsernameInput('user-name')).toBe('user-name')
		})

		it('should remove @ symbol', () => {
			expect(sanitizeUsernameInput('@username')).toBe('username')
		})

		it('should keep special characters (validation handles rejection)', () => {
			expect(sanitizeUsernameInput('user!@#$name')).toBe('user!@#$name') // only @ at start removed
		})

		it('should handle empty string', () => {
			expect(sanitizeUsernameInput('')).toBe('')
		})

		it('should convert to lowercase', () => {
			expect(sanitizeUsernameInput('UserName')).toBe('username')
		})

		it('should handle numbers', () => {
			expect(sanitizeUsernameInput('user123')).toBe('user123')
		})

		it('should keep spaces (validation handles rejection)', () => {
			expect(sanitizeUsernameInput('user name')).toBe('user name')
		})

		it('should handle dots', () => {
			expect(sanitizeUsernameInput('user.name')).toBe('user.name')
		})
	})

	describe('isUsernameValid', () => {
		it('should validate alphanumeric usernames', () => {
			expect(isUsernameValid('user123')).toBe(true)
		})

		it('should validate usernames with underscores', () => {
			expect(isUsernameValid('user_name')).toBe(true)
		})

		it('should validate usernames with hyphens', () => {
			expect(isUsernameValid('user-name')).toBe(true)
		})

		it('should reject empty string', () => {
			expect(isUsernameValid('')).toBe(false)
		})

		it('should reject usernames with spaces', () => {
			expect(isUsernameValid('user name')).toBe(false)
		})

		it('should reject usernames with special characters', () => {
			expect(isUsernameValid('user!name')).toBe(false)
		})

		it('should reject @ symbol', () => {
			expect(isUsernameValid('@username')).toBe(false)
		})

		it('should reject usernames shorter than 3 chars', () => {
			expect(isUsernameValid('a')).toBe(false)
			expect(isUsernameValid('ab')).toBe(false)
		})

		it('should reject usernames longer than 32 chars', () => {
			const longUsername = 'a'.repeat(33)
			expect(isUsernameValid(longUsername)).toBe(false)
		})

		it('should require lowercase', () => {
			expect(isUsernameValid('UserName')).toBe(false)
			expect(isUsernameValid('USERNAME')).toBe(false)
			expect(isUsernameValid('username')).toBe(true)
		})

		it('should validate 3-32 character length range', () => {
			expect(isUsernameValid('abc')).toBe(true)
			expect(isUsernameValid('a'.repeat(32))).toBe(true)
		})
	})

	describe('Integration', () => {
		it('should work with sanitize then validate flow', () => {
			const input = '@user_name123'
			const sanitized = sanitizeUsernameInput(input)
			expect(isUsernameValid(sanitized)).toBe(true)
		})

		it('should handle complex username cleaning', () => {
			const input = '@user-123_test'
			const sanitized = sanitizeUsernameInput(input)
			expect(sanitized).toBe('user-123_test')
			expect(isUsernameValid(sanitized)).toBe(true)
		})

		it('should handle number inputs consistently', () => {
			const fallback = ''
			const inputs = ['123', '123.456', '0.5', '1000000']
			inputs.forEach((input) => {
				const positive = sanitizePositiveNumberInput(input, fallback)
				const numeric = sanitizeNumericInput(input, fallback)
				expect(positive).toBe(numeric)
			})
		})

		it('should sanitize and then reject invalid usernames', () => {
			const input = '@a' // too short after @ removal
			const sanitized = sanitizeUsernameInput(input)
			expect(sanitized).toBe('a')
			expect(isUsernameValid(sanitized)).toBe(false)
		})
	})
})
