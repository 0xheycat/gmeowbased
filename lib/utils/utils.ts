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
// CACHE FUNCTIONS MOVED (Phase 8.1.6)
// ========================================
// readStorageCache, writeStorageCache, clearStorageCache
// → Migrated to lib/cache/client.ts
//
// Update imports:
// - import { readStorageCache } from '@/lib/utils/utils' (OLD)
// + import { readStorageCache } from '@/lib/cache/client' (NEW)
//
// Re-export for backward compatibility (will be removed in Phase 9)
export { readStorageCache, writeStorageCache, clearStorageCache } from '@/lib/cache/client'
