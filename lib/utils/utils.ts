import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

// ========================================
// CACHE FUNCTIONS REMOVED
// ========================================
// Cache functions were removed as the cache module no longer exists.
// If needed, they can be restored from _archive.
