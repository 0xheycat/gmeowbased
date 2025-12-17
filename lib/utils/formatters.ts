const numberFormatter = new Intl.NumberFormat('en-US')

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatQuestTypeLabel(value: string): string {
  return value
    .split('_')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Format expiry timestamp in short format (e.g., "Dec 15, 02:30 PM")
 */
export function formatExpiryShort(expiresAt: number): string {
  try {
    const d = new Date(expiresAt * 1000)
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Unknown'
  }
}

/**
 * Format relative time in long format (e.g., "Synced 5 minutes ago")
 */
export function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return 'Awaiting first sync'
  const delta = Date.now() - timestamp
  if (delta < 30_000) return 'Synced just now'
  if (delta < 60_000) return 'Synced under a minute ago'
  if (delta < 3_600_000) {
    const minutes = Math.round(delta / 60_000)
    return `Synced ${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  if (delta < 86_400_000) {
    const hours = Math.round(delta / 3_600_000)
    return `Synced ${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.round(delta / 86_400_000)
  return `Synced ${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Format relative time in short format (e.g., "5m ago")
 */
export function formatRelativeTimeShort(timestamp: number | null): string {
  if (!timestamp) return 'just now'
  const delta = Date.now() - timestamp
  if (delta < 60_000) return 'just now'
  if (delta < 3_600_000) {
    const minutes = Math.round(delta / 60_000)
    return `${minutes}m ago`
  }
  if (delta < 86_400_000) {
    const hours = Math.round(delta / 3_600_000)
    return `${hours}h ago`
  }
  const days = Math.round(delta / 86_400_000)
  return `${days}d ago`
}
