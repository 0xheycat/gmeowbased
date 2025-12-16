# Old Notification Documentation - Archived

**Date Archived**: December 15, 2025  
**Reason**: References non-existent notification system from pre-Phase 1-6

---

## ⚠️ DO NOT USE THESE DOCUMENTS

These files reference a **live-notifications system that was NEVER implemented** in the Phase 1-6 notification system. They contain:

- ❌ `@/components/ui/live-notifications` (module does NOT exist)
- ❌ `useNotifications()` hook (does NOT exist)
- ❌ `NotificationProvider` context (does NOT exist)
- ❌ `pushNotification()` method (does NOT exist)

## ✅ Use This Instead

**Single Source of Truth**: `NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md` (project root)

**Actual Phase 1-6 Notification System**:
- Database-driven notifications (NOT live provider pattern)
- Components: `NotificationBell.tsx`, `NotificationSettings.tsx`
- Libraries: `lib/notifications/` (8 modules)
- Tables: `user_notification_history`, `notification_preferences`
- Functions: `saveNotification()`, `fetchNotifications()`, `notifyWithXPReward()`

## Archived Files (13 total)

1. `NOTIFICATION-SYSTEM-AUDIT.md` - References live-notifications throughout
2. `NOTIFICATION-SYSTEM-SUMMARY.md` - Describes non-existent system
3. `NOTIFICATION-TESTING-SYSTEM.md` - Test patterns for old system
4. `NOTIFICATION-SYSTEM-V2-API.md` - API for useNotifications hook
5. `NOTIFICATION-CONVERSION-SUMMARY.md` - Migration to provider pattern
6. `NOTIFICATION-DIALOG-AUDIT.md` - Old audit referencing toasts
7. `NOTIFICATION-REFACTOR-AUDIT.md` - Refactor to provider pattern
8. `NOTIFICATION-SYSTEM-FIX.md` - Fixes for non-existent system
9. `NOTIFICATION-SYSTEM-REALITY-CHECK.md` - Reality check of old system
10. `PHASE-1-NOTIFICATION-DIALOG-COMPLETE.md` - Phase 1 with NotificationProvider
11. `PHASE-1-NOTIFICATION-FINAL-AUDIT.md` - Final audit with old patterns
12. `PHASE-1-NOTIFICATION-V2-SUMMARY.md` - V2 summary with useNotifications

**These files were causing import errors** because code was referencing patterns documented here that don't actually exist in the codebase.

---

## Phase 1-6 System Quick Reference

```typescript
// ✅ CORRECT: Save notification to database
import { saveNotification } from '@/lib/notifications'

await saveNotification({
  fid: user.fid,
  category: 'quest',
  title: 'Quest Completed!',
  description: 'You earned 100 XP',
  tone: 'success',
  metadata: { xp: 100 }
})

// ✅ CORRECT: Fetch user notifications
import { fetchNotifications } from '@/lib/notifications'

const notifications = await fetchNotifications({
  fid: user.fid,
  category: 'quest',
  limit: 20
})

// ✅ CORRECT: Trigger notification with XP
import { notifyWithXPReward } from '@/lib/notifications'

await notifyWithXPReward({
  fid: user.fid,
  eventType: 'quest_completed',
  metadata: { questId: 'daily-gm', xp: 100 }
})
```

**NotificationBell Component** automatically displays all notifications from database in header dropdown.

**NotificationSettings Component** allows users to manage preferences (mute, pause, priority levels).

---

## Why These Were Archived

During Phase 6 implementation (December 15, 2025), we discovered:

1. **Import Crisis**: Multiple files importing from `@/components/ui/live-notifications`
2. **Runtime Errors**: Calls to `useNotifications()` causing crashes
3. **Documentation Confusion**: New developers copying patterns from these docs
4. **System Mismatch**: Phase 1-6 was built as database-driven, NOT live provider

The actual notification system (Phase 1-6) was always database-driven with Supabase persistence. There was never a live-notifications provider/context system implemented.

---

**For current documentation, see**: `NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md`
