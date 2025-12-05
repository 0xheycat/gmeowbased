/**
 * Quest Draft Save Indicator Component
 * Shows last saved time for quest draft auto-save
 * 
 * NEW FOUNDATION - Built for new quest creation system
 */

'use client'

/**
 * Auto-save indicator component
 * Shows last saved time
 */
export function QuestDraftSaveIndicator({ lastSaved }: { lastSaved?: number }) {
  if (!lastSaved) return null

  const elapsed = Date.now() - lastSaved
  const seconds = Math.floor(elapsed / 1000)

  let display = 'Just now'
  if (seconds > 60) {
    const minutes = Math.floor(seconds / 60)
    display = `${minutes}m ago`
  } else if (seconds > 5) {
    display = `${seconds}s ago`
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span>Saved {display}</span>
    </div>
  )
}
