'use client'

import { CalendarIcon } from '@/components/icons/calendar-icon'
import { TargetIcon } from '@/components/icons/target-icon'
import { TrophyIcon } from '@/components/icons/trophy-icon'

const STEPS = [
  {
    icon: CalendarIcon,
    title: 'GM DAILY',
    description: 'Check in every 24h to grow your streak. Longer streaks unlock bonus Paw Points.',
  },
  {
    icon: TargetIcon,
    title: 'COMPLETE QUESTS',
    description: 'Finish cinematic quests for points, ERC20 drops, and animated profile upgrades.',
  },
  {
    icon: TrophyIcon,
    title: 'UNLOCK BADGES',
    description: 'Burn or stake points to mint Soulbound badges and flex them across Farcaster.',
  },
] as const

export function HowItWorks() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-primary-600 dark:text-primary-400 shadow-md">
                  {String(index + 1).padStart(2, '0')}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
