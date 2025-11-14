import { useState, useEffect } from 'react'

/**
 * Custom hook for responsive design based on CSS media queries
 * @param query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns Whether the media query currently matches
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState<boolean>(() => {
		if (typeof window === 'undefined') return false
		return window.matchMedia(query).matches
	})

	useEffect(() => {
		if (typeof window === 'undefined') return undefined
		const mql = window.matchMedia(query)
		const handler = (event: MediaQueryListEvent) => setMatches(event.matches)
		setMatches(mql.matches)
		mql.addEventListener('change', handler)
		return () => {
			mql.removeEventListener('change', handler)
		}
	}, [query])

	return matches
}
