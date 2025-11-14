import { useEffect, useState } from 'react'

/**
 * Smoothly animates a number from 0 → targetValue over `duration` milliseconds.
 * Returns a string formatted with the current locale for display.
 */
export function useAnimatedCount(targetValue: number, duration = 1200) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (Number.isNaN(targetValue)) {
      setDisplayValue(0)
      return
    }

    const start = performance.now()

    const frame = (time: number) => {
      const progress = Math.min((time - start) / duration, 1)
      setDisplayValue(Math.round(targetValue * progress))
      if (progress < 1) requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)
  }, [targetValue, duration])

  return displayValue.toLocaleString()
}
