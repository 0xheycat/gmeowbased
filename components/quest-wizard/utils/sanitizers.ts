/**
 * Input sanitization and validation utilities for security and data integrity.
 * 
 * These utilities protect against XSS attacks, validate user input, and ensure
 * data consistency throughout the application.
 */

/**
 * Sanitize positive number input (remove invalid characters).
 * 
 * Ensures input is a valid positive number, stripping whitespace and
 * validating the numeric value.
 * 
 * @param value - User input string to sanitize
 * @param fallback - Value to return if input is invalid
 * @returns Sanitized positive number string, or fallback if invalid
 * 
 * @example
 * ```ts
 * sanitizePositiveNumberInput('123', '0')    // '123'
 * sanitizePositiveNumberInput('  456 ', '0') // '456'
 * sanitizePositiveNumberInput('-100', '0')   // '0' (negative not allowed)
 * sanitizePositiveNumberInput('abc', '0')    // '0' (not a number)
 * ```
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
 * Sanitize numeric input (allow negative numbers and decimals).
 * 
 * Validates input as a numeric value, allowing negative numbers
 * and decimal points.
 * 
 * @param value - User input string to sanitize
 * @param fallback - Value to return if input is invalid
 * @returns Sanitized numeric string, or fallback if invalid
 * 
 * @example
 * ```ts
 * sanitizeNumericInput('123', '0')      // '123'
 * sanitizeNumericInput('-45.67', '0')   // '-45.67'
 * sanitizeNumericInput('12.34', '0')    // '12.34'
 * sanitizeNumericInput('abc', '0')      // '0'
 * ```
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
