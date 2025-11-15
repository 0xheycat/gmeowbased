# Phase 4.5 + 4.6 Deployment Guide

## ✅ What's Complete

### Phase 4.5: Notification History & Persistence
- ✅ SQL migration file created: `scripts/sql/create_user_notification_history.sql`
- ✅ API layer implemented: `lib/notification-history.ts` (329 lines, 7 functions)
- ✅ Test script created: `scripts/test-notification-history.ts`

### Phase 4.6: Cross-Page Cache Migration
- ✅ `guildDataCache` added to unified cache system
- ✅ `OnchainStats.tsx` migrated to use `chainStateCache`
- ✅ `GMHistory.tsx` migrated to use `chainStateCache`
- ✅ Build successful: 0 errors, 0 warnings

---

## 🚀 Deployment Steps

### Step 1: Run SQL Migration

**Option A: Supabase Dashboard (Recommended)**

1. Open SQL Editor: https://supabase.com/dashboard/project/bgnerptdanbgvcjentbt/sql/new
2. Copy the entire contents of `scripts/sql/create_user_notification_history.sql`
3. Paste into the SQL Editor
4. Click **"Run"** button
5. Verify success message appears

**What this creates:**
- ✅ Table: `user_notification_history` (12 columns)
- ✅ Indexes: 4 indexes for query optimization
- ✅ RLS Policies: 3 security policies
- ✅ Function: `cleanup_old_notifications()` for auto-cleanup

**Option B: Automated (if connection works)**
```bash
# Install pg if not already installed
pnpm add -D pg

# Run migration script
export $(cat .env.local | grep -E "SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY" | xargs)
npx tsx scripts/run-migration-pg.ts
```

---

### Step 2: Verify Migration

Run the test script to verify the API layer:

```bash
export $(cat .env.local | grep -E "SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY" | xargs)
npx tsx scripts/test-notification-history.ts
```

**Expected output:**
```
🧪 Testing Notification History API...

1️⃣ Testing saveNotification...
   ✅ Notification saved successfully

2️⃣ Testing fetchNotifications...
   ✅ Fetched 1 notifications
   📋 Latest: "Test Notification"

3️⃣ Testing getNotificationCount...
   ✅ Unread count: 1

🎉 All tests passed!
```

---

### Step 3: Verify Cache System

Check that all 7 cache instances are working:

```bash
npm run build
```

**Expected:**
- ✅ Build successful
- ✅ 0 errors, 0 warnings
- ✅ Profile page: ~67.9 kB

---

## 📦 API Reference

### Notification History Functions

#### 1. `saveNotification(input)`
Saves a notification to history with auto-cleanup.

```typescript
import { saveNotification } from '@/lib/notification-history'

const success = await saveNotification({
  fid: 12345,                    // Optional: Farcaster FID
  walletAddress: '0x...',        // Optional: Ethereum address
  category: 'quest',             // Required: system | quest | badge | guild | reward | tip | level | reminder | mention | streak
  title: 'Quest Complete!',      // Required: Notification title
  description: 'You earned...',  // Optional: Detail text
  tone: 'success',               // Required: info | success | warning | error
  metadata: { questId: 123 },    // Optional: Additional data
  actionLabel: 'View Quest',     // Optional: Button text
  actionHref: '/Quest/base/123', // Optional: Button link
})
```

#### 2. `fetchNotifications(input)`
Query notifications with filters and pagination.

```typescript
import { fetchNotifications } from '@/lib/notification-history'

const notifications = await fetchNotifications({
  fid: 12345,                  // Filter by FID
  walletAddress: '0x...',      // Or filter by wallet
  category: 'quest',           // Optional: filter by category
  limit: 50,                   // Default: 50, max: 100
  offset: 0,                   // For pagination
  includeDismissed: true,      // Default: true
})
```

#### 3. `dismissNotification(id)`
Mark a single notification as dismissed.

```typescript
import { dismissNotification } from '@/lib/notification-history'

const success = await dismissNotification('uuid-here')
```

#### 4. `dismissAllNotifications(fid, walletAddress)`
Bulk dismiss all user notifications.

```typescript
import { dismissAllNotifications } from '@/lib/notification-history'

const success = await dismissAllNotifications(12345, null)
```

#### 5. `clearHistory(fid, walletAddress)`
Permanently delete all user notifications.

```typescript
import { clearHistory } from '@/lib/notification-history'

const success = await clearHistory(12345, null)
```

#### 6. `getNotificationCount(fid, walletAddress, includeDismissed)`
Get count of notifications.

```typescript
import { getNotificationCount } from '@/lib/notification-history'

const count = await getNotificationCount(12345, null, false) // Unread only
```

---

## 🗄️ Cache System Summary

Now 7 cache instances in `lib/cache-storage.ts`:

| Cache Name | Storage | TTL | Max Entries | Purpose |
|------------|---------|-----|-------------|---------|
| `farcasterVerificationCache` | localStorage | 2 min | 100 | Farcaster user verification |
| `profileDataCache` | sessionStorage | 1 min | 50 | Profile data |
| `userContextCache` | localStorage | 5 min | 10 | User context (FID, wallet) |
| `questDataCache` | sessionStorage | 30 sec | 50 | Quest details |
| `chainStateCache` | memory | 10 sec | 20 | Chain state (OnchainStats, GMHistory) |
| `notificationPreferencesCache` | localStorage | 1 year | 20 | Notification settings |
| `guildDataCache` | sessionStorage | 2 min | 30 | Guild team data |

**Cache Migrations (Phase 4.6):**
- ✅ `OnchainStats.tsx`: Module-level Map → `chainStateCache`
- ✅ `GMHistory.tsx`: useRef Map → `chainStateCache`

---

## 🔄 Next Steps (Optional Enhancements)

### 1. Auto-Save Notifications
Integrate notification persistence into `NotificationProvider`:

```typescript
// components/ui/live-notifications.tsx
import { saveNotification } from '@/lib/notification-history'

// In NotificationProvider, add useEffect:
useEffect(() => {
  const latest = items[items.length - 1]
  if (latest && userFid) {
    saveNotification({
      fid: userFid,
      category: latest.category,
      title: latest.title,
      description: latest.message,
      tone: latest.type,
      metadata: latest.metadata,
      actionLabel: latest.actionLabel,
      actionHref: latest.actionHref,
    }).catch(err => console.error('Failed to save notification:', err))
  }
}, [items, userFid])
```

### 2. Notification History Page
Create `/profile/notifications` page to view full history:

```typescript
// app/profile/notifications/page.tsx
import { fetchNotifications } from '@/lib/notification-history'

export default async function NotificationHistoryPage() {
  // Fetch user's notification history
  // Display with pagination, filtering, search
}
```

### 3. Cleanup Scheduler
Enable automatic cleanup in Supabase:

```sql
-- In Supabase SQL Editor, if pg_cron is available:
select cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',  -- Daily at 2 AM
  'select cleanup_old_notifications()'
);
```

---

## 🐛 Troubleshooting

### Migration fails
- Verify you're logged into Supabase dashboard
- Check that project ref `bgnerptdanbgvcjentbt` is correct
- Use manual SQL Editor method (Option A)

### API returns errors
- Confirm migration was successful: check for `user_notification_history` table in Supabase dashboard
- Verify environment variables in `.env.local`:
  - `SUPABASE_URL=https://bgnerptdanbgvcjentbt.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=...`
- Check RLS policies are enabled

### Cache not working
- Verify build is successful: `npm run build`
- Check browser console for cache errors
- Try clearing localStorage/sessionStorage: `localStorage.clear(); sessionStorage.clear()`

---

## 📊 Build Summary

**Before Phase 4.5+4.6:**
- Profile page: 67.8 kB
- 6 cache instances

**After Phase 4.5+4.6:**
- Profile page: 67.9 kB (+0.1 kB)
- 7 cache instances (+guildDataCache)
- ✅ Notification persistence ready
- ✅ All caches unified

---

## ✅ Deployment Checklist

- [ ] Run SQL migration in Supabase dashboard
- [ ] Verify table creation: `user_notification_history` exists
- [ ] Run test script: `npx tsx scripts/test-notification-history.ts`
- [ ] Verify build: `npm run build` (0 errors)
- [ ] Test in browser: Check that OnchainStats and GMHistory still work
- [ ] Optional: Integrate auto-save in NotificationProvider
- [ ] Optional: Create notification history page
- [ ] Optional: Enable pg_cron cleanup scheduler

---

## 📁 Files Modified/Created

### Phase 4.5 Files
- ✅ `scripts/sql/create_user_notification_history.sql` (NEW - 70 lines)
- ✅ `lib/notification-history.ts` (NEW - 329 lines)
- ✅ `scripts/test-notification-history.ts` (NEW - test script)
- ✅ `scripts/run-migration.ts` (NEW - Supabase JS migration)
- ✅ `scripts/run-migration-pg.ts` (NEW - Postgres direct migration)

### Phase 4.6 Files
- ✅ `lib/cache-storage.ts` (MODIFIED - added guildDataCache)
- ✅ `components/OnchainStats.tsx` (MODIFIED - use chainStateCache)
- ✅ `components/GMHistory.tsx` (MODIFIED - use chainStateCache)

---

**Status:** ✅ Ready for deployment
**Build:** ✅ Passing (0 errors, 0 warnings)
**Next:** Run SQL migration in Supabase dashboard
