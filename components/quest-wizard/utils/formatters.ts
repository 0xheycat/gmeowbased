/**
 * Formatting Utilities
 * Display formatting for errors, addresses, and other UI elements
 */

/**
 * Format unknown error to user-friendly string
 */
export function formatUnknownError(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message) {
		return error.message
	}
	if (typeof error === 'string' && error.trim().length > 0) {
		return error.trim()
	}
	return fallback
}

/**
 * Check if error is an AbortError (from fetch cancellation)
 */
export function isAbortError(error: unknown): boolean {
	if (!error) return false
	if (error instanceof DOMException) {
		return error.name === 'AbortError'
	}
	if (error instanceof Error) {
		return error.name === 'AbortError'
	}
	return false
}

/**
 * Shorten Ethereum address for display
 * @example shortenAddress('0x1234...5678') // '0x1234…5678'
 */
export function shortenAddress(address: string): string {
	if (!address || address.length < 10) return address
	return `${address.slice(0, 6)}…${address.slice(-4)}`
}
