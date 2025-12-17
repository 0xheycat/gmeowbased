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

const STORAGE_PREFIX = 'gmeow_cache::'

type StoredPayload<T> = {
  value: T
  timestamp: number
}

export function readStorageCache<T>(key: string, maxAgeMs: number): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPayload<T>
    if (!parsed || typeof parsed.timestamp !== 'number') return null
    if (Number.isFinite(maxAgeMs) && maxAgeMs > 0) {
      const age = Date.now() - parsed.timestamp
      if (age > maxAgeMs) {
        window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
        return null
      }
    }
    return parsed.value ?? null
  } catch (err) {
    console.warn('readStorageCache failed', err)
    return null
  }
}

export function writeStorageCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    const payload: StoredPayload<T> = { value, timestamp: Date.now() }
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload))
  } catch (err) {
    console.warn('writeStorageCache failed', err)
  }
}

export function clearStorageCache(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
  } catch (err) {
    console.warn('clearStorageCache failed', err)
  }
}
