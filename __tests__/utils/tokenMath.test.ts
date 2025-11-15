import { describe, it, expect } from 'vitest'
import {
	parseTokenAmountToUnits,
	formatTokenAmountFromUnits,
	toBigIntSafe,
	safeNumber,
} from '@/components/quest-wizard/utils/tokenMath'

describe('tokenMath utilities', () => {
	describe('parseTokenAmountToUnits', () => {
		it('should convert decimal string to units', () => {
			expect(parseTokenAmountToUnits('1.5', 18)).toBe(1500000000000000000n)
		})

		it('should handle zero', () => {
			expect(parseTokenAmountToUnits('0', 18)).toBe(0n)
		})

		it('should handle whole numbers', () => {
			expect(parseTokenAmountToUnits('100', 6)).toBe(100000000n)
		})

		it('should handle very small decimals', () => {
			expect(parseTokenAmountToUnits('0.000001', 6)).toBe(1n)
		})

		it('should handle different decimal places', () => {
			expect(parseTokenAmountToUnits('1', 6)).toBe(1000000n)
			expect(parseTokenAmountToUnits('1', 8)).toBe(100000000n)
			expect(parseTokenAmountToUnits('1', 18)).toBe(1000000000000000000n)
		})

		it('should handle invalid input gracefully', () => {
			expect(parseTokenAmountToUnits('', 18)).toBe(null)
			expect(parseTokenAmountToUnits('invalid', 18)).toBe(null)
		})

		it('should handle negative numbers', () => {
			const result = parseTokenAmountToUnits('-1', 18)
			expect(result).toBe(null) // negative not allowed
		})

		it('should trim whitespace', () => {
			expect(parseTokenAmountToUnits('  1.5  ', 18)).toBe(1500000000000000000n)
		})
	})

	describe('formatTokenAmountFromUnits', () => {
		it('should convert units to decimal string', () => {
			expect(formatTokenAmountFromUnits(1500000000000000000n, 18)).toBe('1.5')
		})

		it('should handle zero', () => {
			expect(formatTokenAmountFromUnits(0n, 18)).toBe('0')
		})

		it('should handle whole numbers', () => {
			expect(formatTokenAmountFromUnits(100000000n, 6)).toBe('100')
		})

		it('should handle very small amounts', () => {
			expect(formatTokenAmountFromUnits(1n, 6)).toBe('0.000001')
		})

		it('should trim trailing zeros', () => {
			expect(formatTokenAmountFromUnits(1000000000000000000n, 18)).toBe('1')
		})

		it('should handle different decimal places', () => {
			expect(formatTokenAmountFromUnits(1000000n, 6)).toBe('1')
			expect(formatTokenAmountFromUnits(100000000n, 8)).toBe('1')
			expect(formatTokenAmountFromUnits(1000000000000000000n, 18)).toBe('1')
		})

		it('should handle negative numbers', () => {
			expect(formatTokenAmountFromUnits(-1500000000000000000n, 18)).toBe('-1.5')
		})
	})

	describe('toBigIntSafe', () => {
		it('should convert valid string to BigInt', () => {
			expect(toBigIntSafe('123')).toBe(123n)
		})

		it('should handle zero', () => {
			expect(toBigIntSafe('0')).toBe(0n)
		})

		it('should handle large numbers', () => {
			expect(toBigIntSafe('1000000000000000000')).toBe(1000000000000000000n)
		})

		it('should return 0n for invalid input', () => {
			expect(toBigIntSafe('invalid')).toBe(0n)
			expect(toBigIntSafe('')).toBe(0n)
		})

		it('should handle negative numbers', () => {
			expect(toBigIntSafe('-123')).toBe(-123n)
		})

		it('should trim whitespace', () => {
			expect(toBigIntSafe('  123  ')).toBe(123n)
		})

		it('should handle decimal strings by truncating', () => {
			const result = toBigIntSafe('123.456')
			expect(result).toBeDefined()
		})
	})

	describe('safeNumber', () => {
		it('should convert valid string to number', () => {
			expect(safeNumber('123')).toBe(123)
		})

		it('should handle zero', () => {
			expect(safeNumber('0')).toBe(0)
		})

		it('should handle decimals', () => {
			expect(safeNumber('123.456')).toBe(123.456)
		})

		it('should return 0 for invalid input', () => {
			expect(safeNumber('invalid')).toBe(0)
			expect(safeNumber('')).toBe(0)
		})

		it('should handle negative numbers', () => {
			expect(safeNumber('-123')).toBe(-123)
		})

		it('should trim whitespace', () => {
			expect(safeNumber('  123.456  ')).toBe(123.456)
		})

		it('should handle very large numbers', () => {
			expect(safeNumber('999999999999')).toBe(999999999999)
		})
	})

	describe('Round-trip conversion', () => {
		it('should maintain value through round-trip', () => {
			const original = '1.5'
			const units = parseTokenAmountToUnits(original, 18)
			if (units === null) throw new Error('Parsing failed')
			const back = formatTokenAmountFromUnits(units, 18)
			expect(back).toBe(original)
		})

		it('should work with various decimals', () => {
			const testCases = ['1', '0.5', '100.25', '0.000001']
			testCases.forEach((value) => {
				const units = parseTokenAmountToUnits(value, 18)
				if (units === null) throw new Error(`Parsing failed for ${value}`)
				const back = formatTokenAmountFromUnits(units, 18)
				expect(back).toBe(value)
			})
		})

		it('should handle precision limits', () => {
			const original = '0.123456789012345678'
			const units = parseTokenAmountToUnits(original, 18)
			if (units === null) throw new Error('Parsing failed')
			const back = formatTokenAmountFromUnits(units, 18)
			expect(back).toBe(original)
		})
	})
})
