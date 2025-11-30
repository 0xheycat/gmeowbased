/**
 * Token math utilities for decimal arithmetic and formatting.
 * 
 * These utilities handle the conversion between human-readable decimal values
 * and blockchain integer representations, accounting for token decimals.
 */

/**
 * Parse human-readable token amount string to units (bigint).
 * Handles decimals, commas, and precision.
 * 
 * @param value - Token amount string (e.g., "1.5", "1,234.56")
 * @param decimals - Number of decimal places (e.g., 18 for ETH, 6 for USDC)
 * @returns Bigint representation, or null if input is invalid
 * 
 * @example
 * ```ts
 * parseTokenAmountToUnits('1.5', 18) // 1500000000000000000n
 * parseTokenAmountToUnits('1,234.56', 6) // 1234560000n
 * ```
 */
export function parseTokenAmountToUnits(value: string, decimals: number): bigint | null {
	if (typeof value !== 'string') return null
	const trimmed = value.replace(/,/g, '').trim()
	if (!trimmed) return null
	if (!/^\d*(?:\.\d*)?$/.test(trimmed)) return null
	
	const parts = trimmed.split('.')
	const wholePart = parts[0] && parts[0].length ? parts[0] : '0'
	const fractionPart = parts.length > 1 ? parts[1] : ''
	
	const safeDecimals = Math.min(Math.max(Number.isFinite(decimals) ? Math.trunc(decimals) : 18, 0), 36)
	const fractionNormalized = fractionPart.slice(0, safeDecimals)
	const paddedFraction = fractionNormalized.padEnd(safeDecimals, '0')
	const combined = `${wholePart.replace(/^0+(?=\d)/, '') || '0'}${safeDecimals > 0 ? paddedFraction : ''}`
	
	try {
		return BigInt(combined || '0')
	} catch {
		return null
	}
}

/**
 * Format token units (bigint) to human-readable string
 * 
 * @example
 * formatTokenAmountFromUnits(1500000000000000000n, 18) // '1.5'
 * formatTokenAmountFromUnits(1234560000n, 6) // '1234.56'
 */
export function formatTokenAmountFromUnits(amount: bigint, decimals: number): string {
	const safeDecimals = Math.min(Math.max(Number.isFinite(decimals) ? Math.trunc(decimals) : 18, 0), 36)
	if (safeDecimals === 0) return amount.toString()
	
	const negative = amount < 0n
	const absolute = negative ? -amount : amount
	const base = absolute.toString().padStart(safeDecimals + 1, '0')
	const whole = base.slice(0, base.length - safeDecimals) || '0'
	const fractionRaw = base.slice(base.length - safeDecimals)
	const fraction = fractionRaw.replace(/0+$/, '')
	const formatted = fraction ? `${whole}.${fraction}` : whole
	
	return negative ? `-${formatted}` : formatted
}

/**
 * Convert bigint to safe number (with overflow check)
 */
export function toBigIntSafe(value: unknown): bigint {
	if (typeof value === 'bigint') return value
	if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value))
	if (typeof value === 'string' && value.trim()) {
		try {
			return BigInt(value.trim())
		} catch {
			return 0n
		}
	}
	return 0n
}

/**
 * Safe number conversion (handles bigint, string, number)
 */
export function safeNumber(value: unknown): number {
	if (typeof value === 'bigint') {
		const asNumber = Number(value)
		return Number.isFinite(asNumber) ? asNumber : 0
	}
	const asNumber = Number(value)
	return Number.isFinite(asNumber) ? asNumber : 0
}
