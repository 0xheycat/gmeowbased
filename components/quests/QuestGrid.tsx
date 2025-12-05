'use client';

import { Fragment, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Listbox, RadioGroup, Switch } from '@headlessui/react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import QuestCard, { type QuestCardProps } from './QuestCard';
import type { Quest } from '@/lib/supabase/types/quest';

const sortOptions = [
  { id: 1, name: 'Trending' },
  { id: 2, name: 'Highest XP' },
  { id: 3, name: 'Newest' },
  { id: 4, name: 'Ending Soon' },
  { id: 5, name: 'Most Participants' },
];

interface SortListProps {
  id: number;
  name: string;
}

function SortDropdown({
  sortData,
  className,
}: {
  sortData: SortListProps[];
  className?: string;
}) {
  const [selectedItem, setSelectedItem] = useState(sortData[0]);
  
  return (
    <div className="relative w-full lg:w-auto">
      <Listbox value={selectedItem} onChange={setSelectedItem}>
        <Listbox.Button
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-lg bg-gray-100 px-4 text-sm text-gray-900 dark:bg-gray-800 dark:text-white md:w-40 lg:w-48',
            className,
          )}
        >
          {selectedItem.name}
          <KeyboardArrowDownIcon className="w-4 h-4" />
        </Listbox.Button>
        
        <Listbox.Options className="absolute z-20 mt-2 w-full min-w-[150px] origin-top-right rounded-lg bg-white p-2 shadow-lg dark:bg-gray-800 ltr:right-0 rtl:left-0">
          {sortData.map((item) => (
            <Listbox.Option key={item.id} value={item}>
              {({ selected }) => (
                <div
                  className={cn(
                    'block cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition',
                    selected
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  {item.name}
                </div>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </Listbox>
    </div>
  );
}

function SearchBox() {
  return (
    <form
      className="relative flex w-full rounded-lg lg:w-auto lg:basis-72"
      noValidate
      role="search"
    >
      <label className="flex w-full items-center">
        <input
          className="h-11 w-full appearance-none rounded-lg border-2 border-gray-200 bg-transparent py-1 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-600 focus:border-gray-900 ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-gray-600"
          placeholder="Search quests..."
          autoComplete="off"
        />
        <span className="pointer-events-none absolute flex h-full w-10 cursor-pointer items-center justify-center text-gray-600 ltr:left-0 rtl:right-0 dark:text-gray-500">
          <SearchIcon className="h-4 w-4" />
        </span>
      </label>
    </form>
  );
}

function CompletedFilter() {
  const [showCompleted, setShowCompleted] = useState(false);
  
  return (
    <Switch
      checked={showCompleted}
      onChange={setShowCompleted}
      className="group inline-flex items-center gap-2 sm:gap-3 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
      aria-label={showCompleted ? "Hide completed quests" : "Show completed quests"}
    >
      <span
        className={cn(
          'relative inline-flex h-6 w-11 items-center justify-start rounded-full transition-colors duration-300',
          showCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
          'group-hover:shadow-md'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
            showCompleted ? 'translate-x-[22px]' : 'translate-x-[2px]'
          )}
        />
      </span>
      <span className="text-xs font-medium tracking-wider text-gray-900 dark:text-white sm:text-sm select-none">
        Show Completed
      </span>
    </Switch>
  );
}

function StatusFilter() {
  const [status, setStatus] = useState('active');
  
  return (
    <RadioGroup
      value={status}
      onChange={setStatus}
      className="flex items-center gap-2 sm:gap-3"
    >
      <RadioGroup.Option value="active">
        {({ checked }) => (
          <span
            className={cn(
              'relative flex h-11 w-24 cursor-pointer items-center justify-center rounded-lg text-center text-xs font-medium tracking-wider sm:text-sm transition-colors',
              checked ? 'text-white' : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {checked && (
              <motion.span
                className="absolute inset-0 rounded-lg bg-primary shadow-lg"
                layoutId="statusIndicator"
              />
            )}
            <span className="relative">ACTIVE</span>
          </span>
        )}
      </RadioGroup.Option>
      
      <RadioGroup.Option value="upcoming">
        {({ checked }) => (
          <span
            className={cn(
              'relative flex h-11 w-24 cursor-pointer items-center justify-center rounded-lg text-center text-xs font-medium tracking-wider sm:text-sm transition-colors',
              checked ? 'text-white' : 'text-gray-600 dark:text-gray-400'
            )}
          >
            {checked && (
              <motion.span
                className="absolute inset-0 rounded-lg bg-primary shadow-lg"
                layoutId="statusIndicator"
              />
            )}
            <span className="relative">UPCOMING</span>
          </span>
        )}
      </RadioGroup.Option>
    </RadioGroup>
  );
}

export interface QuestGridProps {
  quests: Quest[];
  userFid?: number;
  /** Show filter controls */
  showFilters?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * QuestGrid - Professional quest grid with filters and search
 * Task 7: Real Data Integration - Uses Farcaster API data
 * 
 * @component
 * @example
 * <QuestGrid 
 *   quests={questsData} 
 *   userFid={3}
 *   showFilters={true}
 * />
 * 
 * @source Adapted from gmeowbased0.6/src/components/farms/farms.tsx (10% adaptation)
 */
export default function QuestGrid({
  quests,
  userFid,
  showFilters = true,
  className,
}: QuestGridProps) {
  // Convert Quest type to QuestCardProps
  const questCards: QuestCardProps[] = quests.map(quest => ({
    id: quest.id,
    title: quest.title,
    slug: quest.slug,
    category: quest.category,
    coverImage: quest.cover_image_url || '/images/quest-default.jpg',
    badgeImage: quest.badge_image_url || '/images/badge-default.png',
    xpReward: quest.reward_points,
    creator: {
      name: `Creator ${quest.creator_fid}`, // TODO: Fetch actual creator data
      fid: quest.creator_fid,
      avatar: '/images/avatar-default.png', // TODO: Fetch actual avatar
    },
    participantCount: quest.participant_count,
    estimatedTime: quest.estimated_time_minutes ? `${quest.estimated_time_minutes}min` : '0min',
    status: quest.status === 'paused' ? 'active' : quest.status as 'active' | 'completed' | 'locked' | 'upcoming',
  }));
  
  return (
    <div className={cn('mx-auto w-full', className)}>
      {showFilters && (
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center md:gap-6">
          <div className="flex items-center justify-between gap-4">
            <StatusFilter />
            <div className="md:hidden">
              <CompletedFilter />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 lg:gap-6">
            <div className="hidden shrink-0 md:block">
              <CompletedFilter />
            </div>
            <SearchBox />
            <SortDropdown sortData={sortOptions} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {questCards.map((quest, index) => (
          <QuestCard key={quest.id} {...quest} priority={index < 3} />
        ))}
      </div>
      
      {questCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrackChangesIcon sx={{ fontSize: 80 }} className="text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No quests found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Check back soon for new challenges!
          </p>
        </div>
      )}
    </div>
  );
}
