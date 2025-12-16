/**
 * Notifications Library - Unified Exports
 * 
 * TODO:
 * - [x] Export priority module (Phase 1 complete)
 * - [x] Phase 2 infrastructure complete (Redis idempotency, priority filtering, XP rewards)
 * - [ ] Add NotificationManager class for centralized notification logic (Phase 3)
 * - [ ] Export notification templates for consistent messaging (Phase 3)
 * - [ ] Add notification scheduling utilities (Phase 4)
 * 
 * FEATURES:
 * - History tracking (notification_history table queries)
 * - Error tracking (error logging and retry logic)
 * - Priority filtering (4-tier system with XP rewards)
 * - Miniapp integration (Farcaster frame notifications)
 * - Viral notifications (tier upgrades, viral achievements)
 * 
 * PHASE: Phase 1 - Priority System Integration (Dec 15, 2025)
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (769 lines)
 * - System Audit: NOTIFICATION-SYSTEM-AUDIT.md (Phase 4 restructuring)
 * - Priority Logic: ./priority.ts (9 helper functions, 295 lines)
 * - farcaster.instructions.md: Section 3.6 (Dialog vs Notification Usage)
 * 
 * MODULES:
 * - history: Notification history queries and utilities
 * - error-tracking: Error logging and retry logic for failed notifications
 * - priority: 4-tier priority system (critical/high/medium/low) with XP rewards
 * - miniapp: Farcaster frame notification integration
 * - viral: Viral tier upgrade notifications and achievements
 * 
 * SUGGESTIONS:
 * - Create NotificationManager class to encapsulate all notification logic
 * - Add notification template system for consistent messaging
 * - Implement notification queuing with priority-based scheduling
 * - Add notification analytics dashboard (excluded per user request)
 * 
 * PHASE 2 RESOLVED:
 * - ✅ Priority filtering implemented (shouldSendNotification in viral.ts)
 * - ✅ Unified dispatch function (dispatchNotificationWithPriority in viral.ts)
 * - ✅ XP display respects user preferences (xp_rewards_display column)
 * - ✅ All API routes use Redis-backed infrastructure (lib/idempotency.ts)
 * - ✅ 0 duplicate code (removed in-memory cache from api-helpers)
 * 
 * REMAINING (Phase 3+):
 * - Multiple export sources (5 modules) without centralized management
 * - Missing notification scheduling utilities
 * - No notification template system (inconsistent messaging)
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO circular dependencies between notification modules
 * - ❌ NO missing exports (all public functions must be exported)
 * - ❌ NO `export *` without documentation (document each module)
 * - ❌ NO exporting internal utilities (prefix with _ for internal-only)
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - ✅ TypeScript strict mode (0 errors)
 * - ✅ Documented exports (JSDoc for each module)
 * - ✅ Null-safety checks in all exported functions
 * - ✅ Professional headers with TODO, FEATURES, PHASE, REFERENCE
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-SYSTEM-AUDIT.md - Phase 4 code restructuring
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Phase 1 priority system
 * @see lib/notifications/priority.ts - Priority helper functions
 */

// Core modules
export * from './history'
export * from './error-tracking'
export * from './miniapp'

// Phase 6.1: Mark as read functionality (Week 1 Day 2 - Dec 15, 2025)
export { markAsRead } from './history'

// Phase 1: Priority system (Dec 15, 2025)
export * from './priority'
export type { NotificationPriority } from './priority'

// Phase 2: API infrastructure (Dec 15, 2025)
export * from './api-helpers'

// Phase 2: XP rewards + Viral dispatcher (Dec 15, 2025)
// Note: viral.ts exports shouldSendNotification, dispatchNotificationWithPriority
// Note: xp-rewards.ts exports getXPRewardForEvent, notifyWithXPReward
export {
  // XP Rewards
  getXPRewardForEvent,
  formatXPDisplay,  // NOTE: Currently unused, kept for backward compatibility
  notifyWithXPReward,
  getAllXPRewards,
  hasXPReward,
  type NotificationWithXP,
} from './xp-rewards'

export {
  // Viral Dispatcher
  dispatchViralNotification,
  processPendingNotifications,
  shouldSendNotification,
  dispatchNotificationWithPriority,
  NotificationRateLimiter,
  type NotificationDependencies,
  type NotificationType,
  type ViralNotification,
  type NotificationResult,
} from './viral'
