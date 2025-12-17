/**
 * Quest Components - Professional pattern-first components
 * 
 * @module components/quests
 * @description Quest system UI components adapted from production-tested templates
 * 
 * Phase 1-4 Components (Professional Patterns):
 * - QuestCard: jumbo-7.4/JumboCardFeatured (60% adaptation) - Material Design elevation
 * - QuestProgress: gmeowbased0.6/progressbar (0% adaptation) - Professional progress bars
 * - QuestGrid: gmeowbased0.6/farms (10% adaptation) - Responsive grid layout
 * 
 * Phase 5 Components (Multi-Template Hybrid):
 * - QuestImageUploader: 20% adaptation from gmeowbased0.7/FileUploader
 * - QuestAnalyticsDashboard: 50% adaptation from trezoadmin-41/Analytics
 * - QuestManagementTable: 40% adaptation from music/DataTable
 * - QuestFilters: 40% adaptation from trezoadmin-41/Filters
 * 
 * Task 8.4 Components (Quest Verification):
 * - QuestVerification: gmeowbased0.6 (0-10% adaptation) - Unified verification UI
 * 
 * Phase 5 Enhancements:
 * - Loading States: Professional skeleton screens with shimmer animations
 * - Skeleton Components: Reusable loading skeletons for all components
 * - Error & Empty States: Professional error handling with retry mechanisms
 * - Toast Notifications: Real-time user feedback for all actions
 * 
 * @source Multi-template hybrid strategy (best pattern wins)
 */

export { default as QuestProgress } from './QuestProgress';
export type { QuestProgressProps } from './QuestProgress';

export { default as QuestCard } from './QuestCard';
export type { QuestCardProps } from './QuestCard';

export { default as QuestGrid } from './QuestGrid';
export type { QuestGridProps } from './QuestGrid';

// Task 8.4: Quest Verification
export { QuestVerification } from './QuestVerification';

// Phase 5: Professional enhancements
export { default as QuestImageUploader } from './QuestImageUploader';
export type { QuestFileType } from './QuestImageUploader';
export { default as QuestAnalyticsDashboard } from './QuestAnalyticsDashboard';
export { default as QuestManagementTable } from './QuestManagementTable';
export { default as QuestFilters } from './QuestFilters';
export type { QuestFilterState, QuestSortOption } from './QuestFilters';

// Phase 5 Enhancement: Loading States
export {
  Skeleton,
  MetricCardSkeleton,
  ChartSkeleton,
  AnalyticsDashboardSkeleton,
  TableRowSkeleton,
  ManagementTableSkeleton,
  FilterPanelSkeleton,
  QuestFiltersSkeleton,
} from './skeletons';

// Phase 5 Enhancement: Error & Empty States
export {
  EmptyState,
  ErrorState,
  NoQuestsEmptyState,
  NoSearchResultsEmptyState,
  NoDataEmptyState,
  AnalyticsDashboardEmptyState,
  ManagementTableEmptyState,
} from './empty-states';