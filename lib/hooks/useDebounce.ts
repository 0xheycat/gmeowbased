import { useEffect, useState } from 'react'

/**
 * Debounce hook - delays updating a value until after a specified delay
 * Useful for search inputs, filters, and other high-frequency updates
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 * 
 * // searchTerm updates immediately on every keystroke
 * // debouncedSearch only updates 300ms after user stops typing
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: cancel the timer if value changes before delay expires
    // This ensures we only update after user stops typing
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
