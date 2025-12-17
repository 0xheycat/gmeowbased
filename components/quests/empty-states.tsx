/**
 * Quest System Error & Empty States
 * 
 * Professional error handling and empty state components
 * Pattern: gmeowbased0.6 + trezoadmin-41 patterns
 * 
 * Features:
 * - Error boundaries for component isolation
 * - Professional empty state designs
 * - Retry mechanisms
 * - User-friendly error messages
 * - Framer Motion entrance animations
 */

'use client';

import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WarningIcon from '@mui/icons-material/Warning';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/utils';

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      {icon && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1, duration: 0.3 }}
          className="mb-4 text-gray-400 dark:text-gray-600"
          aria-hidden="true"
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" id="empty-state-title">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md" id="empty-state-description">
          {description}
        </p>
      )}
      {action && (
        <motion.button
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={action.onClick}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label={action.label}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

// Error State Component
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        'rounded-lg border-2 border-dashed border-red-200 dark:border-red-900',
        'bg-red-50 dark:bg-red-950/20',
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby="error-title"
      aria-describedby="error-message"
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, rotate: 0 } : { opacity: 0, rotate: -10 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.1, duration: 0.4, type: 'spring' }}
        aria-hidden="true"
      >
        <ErrorIcon className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
      </motion.div>
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2" id="error-title">
        {title}
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-6 max-w-md" id="error-message">
        {message}
      </p>
      {onRetry && (
        <motion.button
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label="Retry loading data"
        >
          <RefreshIcon className="w-4 h-4" aria-hidden="true" />
          Try Again
        </motion.button>
      )}
    </motion.div>
  );
}

// No Quests Empty State
export function NoQuestsEmptyState({ onCreateQuest }: { onCreateQuest?: () => void }) {
  return (
    <EmptyState
      icon={<HelpOutlineIcon className="w-16 h-16" />}
      title="No quests found"
      description="Get started by creating your first quest or adjust your filters to see more results."
      action={
        onCreateQuest
          ? {
              label: 'Create Quest',
              onClick: onCreateQuest,
            }
          : undefined
      }
    />
  );
}

// No Search Results Empty State
export function NoSearchResultsEmptyState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={<SearchIcon className="w-16 h-16" />}
      title="No quests match your filters"
      description="Try adjusting your search criteria or clearing filters to see more quests."
      action={
        onClearFilters
          ? {
              label: 'Clear Filters',
              onClick: onClearFilters,
            }
          : undefined
      }
    />
  );
}

// No Data Empty State (for analytics)
export function NoDataEmptyState() {
  return (
    <EmptyState
      icon={<WarningIcon className="w-16 h-16" />}
      title="No data available"
      description="Quest analytics will appear here once quests are created and participants start completing them."
    />
  );
}

// Analytics Dashboard Empty State
export function AnalyticsDashboardEmptyState() {
  return (
    <div className="space-y-6">
      {/* Empty Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-center h-24">
              <span className="text-sm text-gray-500 dark:text-gray-400">No data yet</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center h-64">
            <NoDataEmptyState />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center h-64">
            <NoDataEmptyState />
          </div>
        </div>
      </div>
    </div>
  );
}

// Management Table Empty State
export function ManagementTableEmptyState({ onCreateQuest }: { onCreateQuest?: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <NoQuestsEmptyState onCreateQuest={onCreateQuest} />
    </div>
  );
}
