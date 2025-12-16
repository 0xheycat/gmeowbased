/**
 * Quest Enhanced Filters - Phase 5.5 + Task 8.2 Sorting
 * 
 * @component
 * Template: trezoadmin-41/Filter patterns (40% adaptation)
 * Features: Filter chips, multi-select, XP range slider, date range, sorting
 * 
 * Adaptation:
 * - MUI → Tailwind CSS
 * - Custom filter chip component
 * - Native HTML range inputs (simple, no external library needed)
 * - Flexible filter state management
 * - Framer Motion animations (expand/collapse, chips)
 * - Sorting: trending, highest XP, newest, ending soon, most participants
 * 
 * Usage:
 * <QuestFilters filters={filters} onFiltersChange={setFilters} sortBy={sortBy} onSortChange={setSortBy} />
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QuestFiltersSkeleton } from './skeletons';
import { ErrorState } from './empty-states';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SearchIcon from '@mui/icons-material/Search';

export type QuestSortOption = 
  | 'trending'
  | 'xp-high'
  | 'xp-low'
  | 'newest'
  | 'ending-soon'
  | 'most-participants';

export interface QuestFilterState {
  categories: string[];
  difficulties: string[];
  statuses: string[];
  xpRange: { min: number; max: number };
  participantRange: { min: number; max: number };
  dateRange: { start: string; end: string } | null;
  isFeatured: boolean | null;
  search: string;
}

interface QuestFiltersProps {
  filters: QuestFilterState;
  sortBy: QuestSortOption;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onFiltersChange: (filters: QuestFilterState) => void;
  onSortChange: (sortBy: QuestSortOption) => void;
  className?: string;
}

const CATEGORIES = ['onchain', 'social'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const STATUSES = ['draft', 'active', 'completed', 'archived'];

const SORT_OPTIONS: { value: QuestSortOption; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'xp-high', label: 'Highest XP' },
  { value: 'xp-low', label: 'Lowest XP' },
  { value: 'newest', label: 'Newest' },
  { value: 'ending-soon', label: 'Ending Soon' },
  { value: 'most-participants', label: 'Most Popular' },
];

export default function QuestFilters({
  filters,
  sortBy,
  isLoading = false,
  error,
  onRetry,
  onFiltersChange,
  onSortChange,
  className,
}: QuestFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading skeleton
  if (isLoading) {
    return <QuestFiltersSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={onRetry}
      />
    );
  }

  // Category toggle
  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  // Difficulty toggle
  const toggleDifficulty = (difficulty: string) => {
    const newDifficulties = filters.difficulties.includes(difficulty)
      ? filters.difficulties.filter(d => d !== difficulty)
      : [...filters.difficulties, difficulty];
    onFiltersChange({ ...filters, difficulties: newDifficulties });
  };

  // Status toggle
  const toggleStatus = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  // XP Range
  const updateXpRange = (key: 'min' | 'max', value: number) => {
    onFiltersChange({
      ...filters,
      xpRange: { ...filters.xpRange, [key]: value }
    });
  };

  // Participant Range
  const updateParticipantRange = (key: 'min' | 'max', value: number) => {
    onFiltersChange({
      ...filters,
      participantRange: { ...filters.participantRange, [key]: value }
    });
  };

  // Date Range
  const updateDateRange = (key: 'start' | 'end', value: string) => {
    const currentRange = filters.dateRange || { start: '', end: '' };
    onFiltersChange({
      ...filters,
      dateRange: { ...currentRange, [key]: value }
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      difficulties: [],
      statuses: [],
      xpRange: { min: 0, max: 10000 },
      participantRange: { min: 0, max: 1000 },
      dateRange: null,
      isFeatured: null,
      search: '',
    });
  };

  // Count active filters
  const activeFilterCount = 
    filters.categories.length +
    filters.difficulties.length +
    filters.statuses.length +
    (filters.isFeatured !== null ? 1 : 0) +
    (filters.dateRange !== null ? 1 : 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search quests by title or description..."
          className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
        />
        {searchInput && (
          <motion.button
            whileHover={prefersReducedMotion ? undefined : { scale: 1.1 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
            onClick={() => setSearchInput('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear search"
          >
            <CloseIcon className="w-5 h-5" />
          </motion.button>
        )}
      </div>
      
      {/* Sort Dropdown */}
      <div className="flex items-center gap-3">\n        <label htmlFor="quest-sort" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <SwapVertIcon className="w-4 h-4" />
          Sort by:
        </label>
        <select
          id="quest-sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as QuestSortOption)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-controls="filter-panel"
          aria-expanded={isExpanded}
          aria-label={`Filters ${isExpanded ? 'expanded' : 'collapsed'}. ${activeFilterCount} active ${activeFilterCount === 1 ? 'filter' : 'filters'}`}
        >
          <FilterListIcon className="w-4 h-4" aria-hidden="true" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <motion.span
              initial={prefersReducedMotion ? { scale: 1 } : { scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-0.5 rounded-full bg-primary-500 text-white text-xs font-bold"
              aria-hidden="true"
            >
              {activeFilterCount}
            </motion.span>
          )}
        </motion.button>

        {activeFilterCount > 0 && (
          <motion.button
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            onClick={clearAllFilters}
            className="min-h-[44px] px-4 text-sm text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded touch-manipulation"
            aria-label="Clear all active filters"
          >
            Clear All
          </motion.button>
        )}
      </div>

      {/* Active Filter Chips */}
      <AnimatePresence mode="popLayout">
        {activeFilterCount > 0 && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap gap-2"
          >
            {filters.categories.map((category, index) => (
              <FilterChip
                key={`cat-${category}`}
                label={category}
                color="blue"
                index={index}
                onRemove={() => toggleCategory(category)}
              />
            ))}
            {filters.difficulties.map((difficulty, index) => (
              <FilterChip
                key={`diff-${difficulty}`}
                label={difficulty}
                color="purple"
                index={filters.categories.length + index}
                onRemove={() => toggleDifficulty(difficulty)}
              />
            ))}
            {filters.statuses.map((status, index) => (
              <FilterChip
                key={`status-${status}`}
                label={status}
                color="green"
                index={filters.categories.length + filters.difficulties.length + index}
                onRemove={() => toggleStatus(status)}
              />
            ))}
          {filters.isFeatured !== null && (
            <FilterChip
              label="Featured"
              color="yellow"
              onRemove={() => onFiltersChange({ ...filters, isFeatured: null })}
            />
          )}
          {filters.dateRange && (
            <FilterChip
              label={`${filters.dateRange.start} - ${filters.dateRange.end}`}
              color="gray"
              onRemove={() => onFiltersChange({ ...filters, dateRange: null })}
            />
          )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
            id="filter-panel"
            role="region"
            aria-label="Quest filtering options"
          >
            <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-6">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    filters.categories.includes(category)
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              Difficulty
            </label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map(difficulty => (
                <button
                  key={difficulty}
                  onClick={() => toggleDifficulty(difficulty)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    filters.difficulties.includes(difficulty)
                      ? difficulty === 'beginner' ? 'bg-green-500 text-white hover:bg-green-600'
                        : difficulty === 'intermediate' ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(status => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    filters.statuses.includes(status)
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* XP Range Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              XP Reward Range
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={filters.xpRange.min}
                  onChange={(e) => updateXpRange('min', parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Min"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  value={filters.xpRange.max}
                  onChange={(e) => updateXpRange('max', parseInt(e.target.value) || 10000)}
                  className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Max"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">XP</span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={filters.xpRange.max}
                onChange={(e) => updateXpRange('max', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>
          </div>

          {/* Participant Range */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              Participant Count Range
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={filters.participantRange.min}
                  onChange={(e) => updateParticipantRange('min', parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Min"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  value={filters.participantRange.max}
                  onChange={(e) => updateParticipantRange('max', parseInt(e.target.value) || 1000)}
                  className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Max"
                />
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={filters.participantRange.max}
                onChange={(e) => updateParticipantRange('max', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              <CalendarMonthIcon className="w-4 h-4 inline mr-2" />
              Creation Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => updateDateRange('start', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => updateDateRange('end', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Featured Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isFeatured === true}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  isFeatured: e.target.checked ? true : null
                })}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Show only featured quests
              </span>
            </label>
          </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Filter Chip Component
interface FilterChipProps {
  label: string;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'gray';
  index?: number;
  onRemove: () => void;
}

function FilterChip({ label, color, index = 0, onRemove }: FilterChipProps) {
  const prefersReducedMotion = useReducedMotion();

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
    green: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
    gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <motion.button
      initial={prefersReducedMotion ? { scale: 1 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : {
        delay: index * 0.05,
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      onClick={onRemove}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-colors touch-manipulation',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        colorClasses[color]
      )}
      aria-label={`Remove ${label} filter`}
    >
      <span>{label}</span>
      <CloseIcon className="w-4 h-4" aria-hidden="true" />
    </motion.button>
  );
}
