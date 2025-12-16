/**
 * XP Celebration System - Test Page
 * 
 * Manual testing interface for all XP celebration features
 * Includes all 15 event types, tier variations, and accessibility testing
 * 
 * PHASE: Phase 2 - Testing
 * DATE: December 14, 2025
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { useState } from 'react'
import { XPEventOverlay } from '@/components/XPEventOverlay'
import type { XpEventKind } from '@/components/XPEventOverlay'
import { calculateRankProgress } from '@/lib/rank'

const EVENT_TYPES: XpEventKind[] = [
  'gm',
  'stake',
  'unstake',
  'quest-create',
  'quest-verify',
  'task-complete',
  'onchainstats',
  'profile',
  'guild',
  'guild-join',
  'referral',
  'referral-create',
  'referral-register',
  'badge-claim',
  'tip',
]

const TIER_PRESETS = [
  { name: 'Signal Kitten', points: 250, category: 'beginner' },
  { name: 'Star Captain', points: 10000, category: 'intermediate' },
  { name: 'Quantum Navigator', points: 30000, category: 'advanced' },
  { name: 'Omniversal Being', points: 550000, category: 'mythic' },
]

export default function XPTestPage() {
  const [open, setOpen] = useState(false)
  const [eventType, setEventType] = useState<XpEventKind>('gm')
  const [xpAmount, setXpAmount] = useState(250)
  const [totalPoints, setTotalPoints] = useState(5250)

  const handleTrigger = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const progress = calculateRankProgress(totalPoints)

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">
            XP Celebration System - Test Page
          </h1>
          <p className="mt-2 text-lg text-zinc-400">
            Manual testing interface for all XP celebration features
          </p>
        </div>

        {/* Test Controls */}
        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold text-white">Test Controls</h2>

          {/* Event Type Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Event Type (15 types)
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as XpEventKind)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* XP Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              XP Amount (test milestones: 1000, 5000, 10000)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={xpAmount}
                onChange={(e) => setXpAmount(Number(e.target.value))}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100000"
              />
              <button
                onClick={() => setXpAmount(250)}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
              >
                250
              </button>
              <button
                onClick={() => setXpAmount(1000)}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500"
              >
                1K
              </button>
              <button
                onClick={() => setXpAmount(5000)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                5K
              </button>
              <button
                onClick={() => setXpAmount(10000)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
              >
                10K
              </button>
            </div>
          </div>

          {/* Total Points (Tier) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Total Points (determines tier)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={totalPoints}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="1000000"
              />
              {TIER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setTotalPoints(preset.points)}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
                  title={preset.category}
                >
                  {preset.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Current Tier: {progress.currentTier.name} ({progress.currentTier.tier})
            </p>
          </div>

          {/* Trigger Button */}
          <div>
            <button
              onClick={handleTrigger}
              className="w-full rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold text-white hover:bg-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
            >
              🎉 Trigger XP Celebration
            </button>
            <p className="mt-2 text-sm text-zinc-500">
              Note: 30-second cooldown per event type
            </p>
          </div>
        </div>

        {/* Testing Checklist */}
        <div className="mt-8 space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-semibold text-white">Testing Checklist</h2>

          <div className="space-y-4">
            <div className="rounded-lg bg-zinc-800 p-4">
              <h3 className="mb-2 font-semibold text-white">1. Keyboard Navigation</h3>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>• Press Tab to navigate through elements</li>
                <li>• Press Shift+Tab for reverse navigation</li>
                <li>• Press ESC to close modal</li>
                <li>• Press Enter/Space on focused button</li>
              </ul>
            </div>

            <div className="rounded-lg bg-zinc-800 p-4">
              <h3 className="mb-2 font-semibold text-white">2. Focus Trap</h3>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>• Focus stays within modal</li>
                <li>• Tab cycles through all elements</li>
                <li>• Close button focused on open</li>
              </ul>
            </div>

            <div className="rounded-lg bg-zinc-800 p-4">
              <h3 className="mb-2 font-semibold text-white">3. Auto-Dismiss</h3>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>• Modal auto-closes after 4 seconds</li>
                <li>• Hover pauses auto-dismiss</li>
                <li>• Focus pauses auto-dismiss</li>
              </ul>
            </div>

            <div className="rounded-lg bg-zinc-800 p-4">
              <h3 className="mb-2 font-semibold text-white">4. Cooldown System</h3>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>• Same event type blocked for 30 seconds</li>
                <li>• Check console for cooldown messages</li>
                <li>• Different event types not affected</li>
              </ul>
            </div>

            <div className="rounded-lg bg-zinc-800 p-4">
              <h3 className="mb-2 font-semibold text-white">5. Visual Verification</h3>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>• Circular progress ring animates smoothly</li>
                <li>• XP counter increments from 0</li>
                <li>• Confetti particles render (60fps)</li>
                <li>• Tier badge shows correct shield icon</li>
                <li>• Milestone badges for 1K/5K/10K XP</li>
                <li>• Mythic tiers show gradient + dual glow</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Browser Testing */}
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-2xl font-semibold text-white">Browser Testing</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-zinc-800 p-4 text-center">
              <div className="text-2xl">🌐</div>
              <div className="mt-2 font-semibold text-white">Chrome 90+</div>
              <div className="text-sm text-zinc-400">Recommended</div>
            </div>
            <div className="rounded-lg bg-zinc-800 p-4 text-center">
              <div className="text-2xl">🦊</div>
              <div className="mt-2 font-semibold text-white">Firefox 88+</div>
              <div className="text-sm text-zinc-400">Test focus</div>
            </div>
            <div className="rounded-lg bg-zinc-800 p-4 text-center">
              <div className="text-2xl">🧭</div>
              <div className="mt-2 font-semibold text-white">Safari 14.1+</div>
              <div className="text-sm text-zinc-400">Test GPU</div>
            </div>
            <div className="rounded-lg bg-zinc-800 p-4 text-center">
              <div className="text-2xl">📱</div>
              <div className="mt-2 font-semibold text-white">Mobile</div>
              <div className="text-sm text-zinc-400">Bottom sheet</div>
            </div>
          </div>
        </div>
      </div>

      {/* XP Event Overlay */}
      <XPEventOverlay
        open={open}
        onClose={handleClose}
        payload={{
          event: eventType,
          xpEarned: xpAmount,
          totalPoints,
          chainKey: 'base',
        }}
      />
    </div>
  )
}
