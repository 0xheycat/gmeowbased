/**
 * Quest Management Table - Phase 5.3
 * 
 * @component
 * Template: music/DataTable patterns (40% adaptation)
 * Features: Sortable table, bulk actions, status management, responsive design
 * 
 * Dialog Usage:
 * - useConfirmDialog: Promise-based confirmation for quest deletion (destructive variant)
 * - Async/await pattern for better error handling
 * 
 * Adaptation:
 * - Laravel/PHP → React/TypeScript
 * - Server pagination → Client-side sorting/filtering
 * - Simplified for quest management use case
 * 
 * Note: Virtual scrolling (@tanstack/react-virtual) can be added later if needed for 1000+ quests.
 * Current implementation handles up to ~100 quests efficiently.
 * 
 * Usage:
 * <QuestManagementTable quests={allQuests} onBulkAction={handleBulkAction} />
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import { useConfirmDialog } from '@/components/dialogs';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { cn } from '@/lib/utils/utils';
import { ManagementTableSkeleton } from './skeletons';
import { ManagementTableEmptyState, NoSearchResultsEmptyState, ErrorState } from './empty-states';

interface QuestData {
  id: string | number;
  slug: string; // Bug #49 Fix: Add slug property for proper routing
  title: string;
  category: 'onchain' | 'social';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'active' | 'completed' | 'archived';
  xpReward: number;
  participantCount: number;
  isFeatured: boolean;
  createdAt: Date;
}

interface QuestManagementTableProps {
  quests: QuestData[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onBulkAction?: (action: string, questIds: (string | number)[]) => void;
  onCreateQuest?: () => void;
  className?: string;
}

type SortField = 'title' | 'category' | 'difficulty' | 'status' | 'xpReward' | 'participantCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function QuestManagementTable({
  quests,
  isLoading = false,
  error,
  onRetry,
  onBulkAction,
  onCreateQuest,
  className,
}: QuestManagementTableProps) {
  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<QuestData['status'] | 'all'>('all');

  // Show loading skeleton
  if (isLoading) {
    return <ManagementTableSkeleton rows={8} />;
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

  // Show empty state for no quests
  if (quests.length === 0) {
    return <ManagementTableEmptyState onCreateQuest={onCreateQuest} />;
  }

  // Sort and filter logic
  const sortedAndFilteredQuests = useMemo(() => {
    let filtered = quests;
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(q => q.status === filterStatus);
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle dates
      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [quests, sortField, sortDirection, filterStatus]);

  // Show no results state for filtered results
  if (sortedAndFilteredQuests.length === 0) {
    return <NoSearchResultsEmptyState onClearFilters={() => setFilterStatus('all')} />;
  }

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedAndFilteredQuests.map(q => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string | number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Bulk action handler
  const handleBulkActionClick = async (action: string) => {
    if (selectedIds.size === 0) return;

    // Destructive actions need confirmation
    if (action === 'delete') {
      const confirmed = await confirm({
        title: 'Delete Quests?',
        description: `Delete ${selectedIds.size} quest${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone. All quest data will be permanently deleted.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'destructive',
      });

      if (!confirmed) return;
    }

    onBulkAction?.(action, Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const allSelected = sortedAndFilteredQuests.length > 0 && selectedIds.size === sortedAndFilteredQuests.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < sortedAndFilteredQuests.length;

  return (
    <>
      {ConfirmDialog}
      <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Quests</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => handleBulkActionClick('feature')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 transition-colors"
            >
              Feature
            </button>
            <button
              onClick={() => handleBulkActionClick('archive')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkActionClick('delete')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
            <tr>
              {/* Select All */}
              <th className="px-4 py-3 text-left w-12">
                <label className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500 cursor-pointer touch-manipulation"
                  />
                </label>
              </th>

              {/* Sortable Headers */}
              <SortableHeader field="title" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                Quest Title
              </SortableHeader>
              <SortableHeader field="category" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                Category
              </SortableHeader>
              <SortableHeader field="difficulty" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                Difficulty
              </SortableHeader>
              <SortableHeader field="status" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                Status
              </SortableHeader>
              <SortableHeader field="xpReward" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                XP Reward
              </SortableHeader>
              <SortableHeader field="participantCount" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                Participants
              </SortableHeader>
              <SortableHeader field="createdAt" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                Created
              </SortableHeader>

              {/* Actions */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {sortedAndFilteredQuests.map((quest) => (
              <tr key={quest.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {/* Select Checkbox */}
                <td className="px-4 py-3">
                  <label className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(quest.id)}
                      onChange={(e) => handleSelectOne(quest.id, e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-primary-600 focus:ring-primary-500 cursor-pointer touch-manipulation"
                    />
                  </label>
                </td>

                {/* Title with Featured Icon */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {quest.isFeatured && (
                      <StarIcon className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                    )}
                    <Link
                      href={`/quests/${quest.slug}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-xs"
                    >
                      {quest.title}
                    </Link>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    quest.category === 'onchain'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  )}>
                    {quest.category}
                  </span>
                </td>

                {/* Difficulty */}
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    quest.difficulty === 'beginner' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    quest.difficulty === 'intermediate' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                    quest.difficulty === 'advanced' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}>
                    {quest.difficulty}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    quest.status === 'draft' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                    quest.status === 'active' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    quest.status === 'completed' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    quest.status === 'archived' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  )}>
                    {quest.status}
                  </span>
                </td>

                {/* XP Reward */}
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {quest.xpReward} XP
                </td>

                {/* Participants */}
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {quest.participantCount.toLocaleString()}
                </td>

                {/* Created Date */}
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(quest.createdAt).toLocaleDateString()}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/quests/${quest.slug}`}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-primary-900/30 transition-colors"
                      title="View"
                    >
                      <VisibilityIcon className="w-4 h-4" />
                    </Link>
                    <button
                      className="p-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                      title="Edit"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Delete Quest?',
                          description: `Delete "${quest.title}"? This action cannot be undone. All quest data will be permanently deleted.`,
                          confirmText: 'Delete',
                          cancelText: 'Cancel',
                          variant: 'destructive',
                        });
                        if (confirmed) {
                          onBulkAction?.('delete', [quest.id]);
                        }
                      }}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete"
                      aria-label={`Delete quest: ${quest.title}`}
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {sortedAndFilteredQuests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No quests found</p>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {sortedAndFilteredQuests.length} of {quests.length} quests
      </div>
    </div>
    </>
  );
}

// Sortable Header Component
interface SortableHeaderProps {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

function SortableHeader({ field, currentField, direction, onSort, children }: SortableHeaderProps) {
  const isActive = currentField === field;

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        <div className="flex flex-col">
          <KeyboardArrowUpIcon
            className={cn(
              'w-3 h-3 -mb-1',
              isActive && direction === 'asc' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
            )}
          />
          <KeyboardArrowDownIcon
            className={cn(
              'w-3 h-3',
              isActive && direction === 'desc' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
            )}
          />
        </div>
      </div>
    </th>
  );
}
