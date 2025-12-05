'use client'

/**
 * Tier Filter Component
 * 
 * Allows filtering leaderboard by tier/skill level:
 * - All Tiers (default)
 * - Beginner (0-5K)
 * - Intermediate (5K-25K)
 * - Advanced (25K-100K)
 * - Legendary (100K-250K)
 * - Mythic (250K+)
 * 
 * NO EMOJIS - Icons only from components/icons
 */

import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckIcon from '@mui/icons-material/Check'

export type TierFilterOption = {
  value: string
  label: string
  minPoints: number
  maxPoints?: number
}

export const TIER_OPTIONS: TierFilterOption[] = [
  { value: 'all', label: 'All Tiers', minPoints: 0 },
  { value: 'beginner', label: 'Beginner', minPoints: 0, maxPoints: 5000 },
  { value: 'intermediate', label: 'Intermediate', minPoints: 5000, maxPoints: 25000 },
  { value: 'advanced', label: 'Advanced', minPoints: 25000, maxPoints: 100000 },
  { value: 'legendary', label: 'Legendary', minPoints: 100000, maxPoints: 250000 },
  { value: 'mythic', label: 'Mythic', minPoints: 250000 },
]

interface TierFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TierFilter({ value, onChange, className = '' }: TierFilterProps) {
  const selectedOption = TIER_OPTIONS.find((opt) => opt.value === value) || TIER_OPTIONS[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className}`}>
        <Listbox.Button className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 pr-10 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 dark:border-gray-700 dark:bg-dark-bg-card dark:text-gray-100 dark:hover:bg-dark-bg-elevated">
          <span className="block truncate">{selectedOption.label}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <KeyboardArrowDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 text-base shadow-lg focus:outline-none dark:border-gray-700 dark:bg-dark-bg-elevated sm:text-sm">
            {TIER_OPTIONS.map((option) => (
              <Listbox.Option
                key={option.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active
                      ? 'bg-brand/10 text-brand dark:bg-brand/20'
                      : 'text-gray-900 dark:text-gray-100'
                  }`
                }
                value={option.value}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}
