'use client'

import type { ReactNode } from 'react'
import { QuestCreatorMiniKitProvider } from './providers'

// @edit-start 2025-11-12 — Wrap quest creator route with MiniKit provider
export default function QuestCreatorLayout({ children }: { children: ReactNode }) {
	return <QuestCreatorMiniKitProvider>{children}</QuestCreatorMiniKitProvider>
}
// @edit-end
