'use client'

/**
 * DataTable Component - Professional table with sorting, filtering, pagination
 * Based on: gmeowbased0.6 table patterns
 * Features:
 * - Sortable columns
 * - Responsive design (card view on mobile)
 * - Loading states
 * - Empty states
 * - Pagination
 * - Dark mode support
 */

import { useState, useMemo } from 'react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T) => string | number
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  className?: string
  // Pagination
  pagination?: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    pageSize: number
  }
  // Mobile responsive
  mobileCardRender?: (row: T) => React.ReactNode
}

type SortConfig = {
  key: string
  direction: 'asc' | 'desc'
} | null

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className,
  pagination,
  mobileCardRender,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null)

  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key]
      const bValue = (b as any)[sortConfig.key]

      if (aValue === bValue) return 0

      const comparison = aValue < bValue ? -1 : 1
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortConfig])

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return

    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' }
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return null
    })
  }

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <CaretDown size={14} className="opacity-30" />
    }
    return sortConfig.direction === 'asc' ? (
      <CaretUp size={14} />
    ) : (
      <CaretDown size={14} />
    )
  }

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700', className)}>
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!loading && sortedData.length === 0) {
    return (
      <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700', className)}>
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none',
                      column.headerClassName
                    )}
                    onClick={() => handleSort(column.key, column.sortable)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-bg-card divide-y divide-gray-200 dark:divide-gray-700">
              {sortedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-4 text-sm text-gray-900 dark:text-gray-100',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String((row as any)[column.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedData.map((row) => (
          <div
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-bg-card p-4',
              onRowClick && 'cursor-pointer active:scale-98 transition-transform'
            )}
          >
            {mobileCardRender ? (
              mobileCardRender(row)
            ) : (
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={column.key} className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {column.label}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {column.render
                        ? column.render(row)
                        : String((row as any)[column.key] || '-')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
