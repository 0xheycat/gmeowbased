import type { Metadata } from 'next'

// @edit-start 2025-02-14 — Agent stream page
import { AgentHero } from '@/components/agent/AgentHero'
import { AgentStreamShell } from '@/components/agent/AgentStreamShell'

export const metadata: Metadata = {
  title: 'Agent · Gmeowbased Adventure',
  description: 'Mobile-first command center for GMEOW community events, quest completions, and streak telemetry.',
}

export default function AgentPage() {
  return (
    <main className="space-y-6 px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <AgentHero />
      <AgentStreamShell />
    </main>
  )
}
// @edit-end
