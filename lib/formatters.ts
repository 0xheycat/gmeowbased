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
