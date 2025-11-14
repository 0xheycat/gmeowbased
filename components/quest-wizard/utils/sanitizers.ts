/**
 * Input Sanitization Utilities
 * Clean and validate user input
 */

/**
 * Sanitize positive number input (remove invalid characters)
 * @returns Sanitized string or fallback if invalid
 */
export function sanitizePositiveNumberInput(value: string | undefined, fallback: string): string {
	if (typeof value !== 'string') return fallback
	const trimmed = value.trim()
	if (!trimmed) return fallback
	const numeric = Number.parseFloat(trimmed)
	if (!Number.isFinite(numeric) || numeric <= 0) return fallback
	return trimmed
}

/**
 * Sanitize numeric input (allow negative, decimals)
 */
export function sanitizeNumericInput(value: string | undefined, fallback: string): string {
	if (typeof value !== 'string') return fallback
	const trimmed = value.trim()
	if (!trimmed) return fallback
	// Allow negative and decimal
	if (!/^-?\d*\.?\d*$/.test(trimmed)) return fallback
	return trimmed
}

/**
 * Sanitize username input (lowercase, no @, alphanumeric + underscore/dash)
 */
export function sanitizeUsernameInput(input: unknown): string {
	if (typeof input !== 'string') return ''
	return input.trim().replace(/^@/, '').toLowerCase()
}

/**
 * Validate if username is valid format
 */
export function isUsernameValid(username: string): boolean {
	return /^[a-z0-9_-]{3,32}$/.test(username)
}
