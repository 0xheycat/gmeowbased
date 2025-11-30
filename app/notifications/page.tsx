'use client'

import { Bell } from '@phosphor-icons/react'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Bell size={32} weight="bold" className="text-blue-500" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        {/* Placeholder content */}
        <div className="glass-card p-8 text-center">
          <Bell size={64} weight="thin" className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">No notifications yet</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You&apos;ll see notifications about quests, rewards, and community updates here.
          </p>
        </div>
      </div>
    </div>
  )
}
