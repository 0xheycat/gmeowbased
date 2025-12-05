/**
 * Quest System Toast Notifications
 * 
 * Professional toast notification utilities using Sonner
 * Pattern: gmeowbased0.6 toast patterns
 * 
 * Features:
 * - Success, error, warning, info toast types
 * - Action buttons (retry, undo, etc.)
 * - Auto-dismiss with custom duration
 * - Dark mode support
 * - Icon integration with Lucide React
 */

import { toast as sonnerToast } from 'sonner';
import type { ExternalToast } from 'sonner';

// Toast configuration
const defaultDuration = 3000;

// Success toast
export function toastSuccess(message: string, options?: ExternalToast) {
  return sonnerToast.success(message, {
    duration: defaultDuration,
    ...options,
  });
}

// Error toast
export function toastError(message: string, options?: ExternalToast) {
  return sonnerToast.error(message, {
    duration: defaultDuration,
    ...options,
  });
}

// Warning toast
export function toastWarning(message: string, options?: ExternalToast) {
  return sonnerToast.warning(message, {
    duration: defaultDuration,
    ...options,
  });
}

// Info toast
export function toastInfo(message: string, options?: ExternalToast) {
  return sonnerToast.info(message, {
    duration: defaultDuration,
    ...options,
  });
}

// Loading toast (returns ID for updating)
export function toastLoading(message: string) {
  return sonnerToast.loading(message);
}

// Quest-specific toast messages
export const questToasts = {
  // Quest operations
  questCreated: () => toastSuccess('Quest created successfully'),
  questUpdated: () => toastSuccess('Quest updated successfully'),
  questDeleted: () => toastSuccess('Quest deleted successfully'),
  questArchived: () => toastSuccess('Quest archived successfully'),
  questPublished: () => toastSuccess('Quest published successfully'),
  
  // Bulk operations
  bulkActionSuccess: (count: number, action: string) =>
    toastSuccess(`${count} quest${count > 1 ? 's' : ''} ${action} successfully`),
  
  // Data operations
  dataExported: (format: string) => toastSuccess(`Data exported as ${format.toUpperCase()}`),
  filtersCleared: () => toastInfo('Filters cleared'),
  filtersSaved: (name: string) => toastSuccess(`Filter preset "${name}" saved`),
  
  // Errors
  loadError: (retry?: () => void) =>
    toastError('Failed to load data', {
      action: retry
        ? {
            label: 'Retry',
            onClick: retry,
          }
        : undefined,
    }),
  
  deleteError: () => toastError('Failed to delete quest'),
  updateError: () => toastError('Failed to update quest'),
  exportError: () => toastError('Failed to export data'),
  
  // Warnings
  unsavedChanges: () => toastWarning('You have unsaved changes'),
  noSelection: () => toastWarning('Please select at least one quest'),
  
  // Info
  noData: () => toastInfo('No data available'),
  comingSoon: (feature: string) => toastInfo(`${feature} coming soon!`),
};

// Update an existing toast (useful for loading states)
export function updateToast(id: string | number, message: string, type: 'success' | 'error') {
  if (type === 'success') {
    sonnerToast.success(message, { id });
  } else {
    sonnerToast.error(message, { id });
  }
}

// Dismiss a toast
export function dismissToast(id?: string | number) {
  if (id) {
    sonnerToast.dismiss(id);
  } else {
    sonnerToast.dismiss();
  }
}

// Dismiss all toasts
export function dismissAllToasts() {
  sonnerToast.dismiss();
}
