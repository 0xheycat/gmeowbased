/**
 * Quest System Loading Skeletons
 * 
 * Professional skeleton screens for quest components
 * Pattern: trezoadmin-41 shimmer with animate-pulse
 * 
 * Features:
 * - Shimmer animation with Tailwind animate-pulse
 * - Dark mode support
 * - Reusable skeleton primitives
 * - Component-specific skeletons
 */

import { cn } from '@/lib/utils';

// Base skeleton primitive
export function Skeleton({ 
  className,
  style 
}: { 
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
        className
      )}
      style={style}
    />
  );
}

// Metric card skeleton (for analytics dashboard)
export function MetricCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}

// Chart skeleton (for analytics dashboard)
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-12" />
            <Skeleton 
              className="h-8" 
              style={{ width: `${Math.random() * 60 + 20}%` }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Analytics dashboard skeleton
export function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Completion Rate Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-12 w-32" />
      </div>
    </div>
  );
}

// Table row skeleton (for management table)
export function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700">
      <td className="py-4 px-4">
        <Skeleton className="h-4 w-4 rounded" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-4 w-48" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      <td className="py-4 px-6">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="py-4 px-6 text-right">
        <Skeleton className="h-4 w-12 ml-auto" />
      </td>
      <td className="py-4 px-6 text-right">
        <Skeleton className="h-4 w-16 ml-auto" />
      </td>
      <td className="py-4 px-6 text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </td>
      <td className="py-4 px-4 text-right">
        <Skeleton className="h-8 w-8 rounded ml-auto" />
      </td>
    </tr>
  );
}

// Management table skeleton
export function ManagementTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 px-4 text-left">
                  <Skeleton className="h-4 w-4 rounded" />
                </th>
                <th className="py-3 px-6 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="py-3 px-6 text-left">
                  <Skeleton className="h-4 w-20" />
                </th>
                <th className="py-3 px-6 text-left">
                  <Skeleton className="h-4 w-16" />
                </th>
                <th className="py-3 px-6 text-left">
                  <Skeleton className="h-4 w-14" />
                </th>
                <th className="py-3 px-6 text-right">
                  <Skeleton className="h-4 w-12 ml-auto" />
                </th>
                <th className="py-3 px-6 text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </th>
                <th className="py-3 px-6 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </th>
                <th className="py-3 px-4 text-right">
                  <Skeleton className="h-4 w-12 ml-auto" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

// Filter panel skeleton
export function FilterPanelSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter Groups */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      ))}

      {/* Range Sliders */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// Quest filters skeleton (compact version with expand button)
export function QuestFiltersSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Active Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      {/* Expanded Filters */}
    </div>
  );
}

// Quest grid skeleton (Task 7: Real Data Integration)
export function QuestGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative group">
          <Skeleton className="aspect-[8/11] w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
