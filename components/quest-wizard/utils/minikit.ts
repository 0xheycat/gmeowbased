import { parseSignInMessage, type ParsedMiniKitSignIn } from '@coinbase/onchainkit/minikit'

/**
 * Safely parse MiniKit sign-in message with error handling
 * @param message - Raw sign-in message string from MiniKit
 * @returns Parsed message or null if parsing fails
 */
export function safeParseSignInMessage(message: string): ParsedMiniKitSignIn | null {
	try {
		return parseSignInMessage(message)
	} catch (error) {
		console.warn('Failed to parse MiniKit sign-in message:', error)
		return null
	}
}

/**
 * Extract Farcaster FID from parsed MiniKit sign-in message
 * @param parsed - Parsed sign-in message from MiniKit
 * @returns FID number or null if not found
 */
export function extractFidFromSignIn(parsed: ParsedMiniKitSignIn | null): number | null {
	if (!parsed) return null
	for (const resource of parsed.resources) {
		if (typeof resource !== 'string') continue
		if (!resource.startsWith('farcaster://fid/')) continue
		const fidSegment = resource.slice('farcaster://fid/'.length)
		const fidValue = Number.parseInt(fidSegment, 10)
		if (Number.isFinite(fidValue) && fidValue > 0) {
			return fidValue
		}
	}
	return null
}
