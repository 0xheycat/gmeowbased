/**
 * Quest Draft Recovery Prompt Component
 * Asks user to restore or discard saved draft
 * 
 * NEW FOUNDATION - Built for new quest creation system
 */

'use client'

import type { QuestDraftMetadata } from '@/lib/hooks/use-quest-draft-autosave'

/**
 * Recovery prompt component
 * Asks user to restore or discard saved draft
 */
export function QuestDraftRecoveryPrompt({
  metadata,
  onRestore,
  onDiscard,
}: {
  metadata: QuestDraftMetadata
  onRestore: () => void
  onDiscard: () => void
}) {
  const elapsed = Date.now() - metadata.lastSaved
  const minutes = Math.floor(elapsed / 1000 / 60)

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-sm mb-2">Resume Quest Draft?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Found saved draft "{metadata.title}" from {minutes} minutes ago
        </p>
        <div className="flex gap-2">
          <button
            onClick={onRestore}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Restore Draft
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  )
}
