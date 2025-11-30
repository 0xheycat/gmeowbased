'use client'

import { QuestWizardErrorBoundary } from '@/components/ErrorBoundary'
import CreateQuestView from '../CreateQuestView'

export default function QuestCreatorPage() {
  return (
    <QuestWizardErrorBoundary>
      <CreateQuestView />
    </QuestWizardErrorBoundary>
  )
}
