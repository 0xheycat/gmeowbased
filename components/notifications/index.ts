/**
 * Notifications Module
 * 
 * Single notification system: NotificationBell (database-driven, persistent)
 * For user actions requiring confirmation: Use Dialog components
 * 
 * @see components/dialogs for confirmation/action dialogs
 */

// Components
export { NotificationBell } from './NotificationBell'
export { NotificationSettings } from './NotificationSettings'

// Types
export type { NotificationHistoryItem } from '@/lib/notifications'
