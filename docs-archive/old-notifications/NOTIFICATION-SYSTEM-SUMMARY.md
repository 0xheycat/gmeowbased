# Gmeowbased Notification System Summary

## Overview
Your notification system consists of **two main components**:
1. **NotificationBell** - UI component for displaying notifications in the app
2. **Farcaster Push Notifications** - Using Neynar's miniapp notification API

---

## 1. NotificationBell Component (UI Notifications)

### Location
- `components/notifications/NotificationBell.tsx`
- `components/notifications/NotificationSettings.tsx`

### Data Source
- Reads from `user_notification_history` table in Supabase
- Fetches user's notifications when FID is available
- Shows unread count and recent notifications (max 5 in dropdown)

### Features
- Bell icon with unread badge count
- Dropdown with recent notifications
- Category icons (gm, quest, badge, level, streak, etc.)
- Clear all notifications functionality
- Real-time updates based on FID

### Database Table
```sql
user_notification_history
- fid (user identifier)
- category (gm, quest, badge, level, streak, tip, achievement, reward, guild, social)
- tone (success, error, warning, level_up, badge_earned, streak_milestone)
- title
- message
- dismissed_at (for read/unread status)
- created_at
```

---

## 2. Farcaster Push Notifications (Broadcast to Farcaster)

### Core Infrastructure

#### Dispatcher
**File:** `supabase/functions/_shared/miniapp_notification_dispatcher.ts`
- Sends push notifications via Neynar's `publishFrameNotifications` API
- Handles batch processing (max 50 FIDs per batch)
- Retry logic (3 attempts with 400ms delay)
- Logs to `miniapp_notification_dispatches` table

#### Token Management
**File:** `lib/notifications/miniapp.ts`
- Manages notification tokens in `miniapp_notification_tokens` table
- Stores FID, token, notification_url, status (enabled/disabled/removed)
- Tracks last event and GM reminder timestamps

#### Viral Notifications
**File:** `lib/notifications/viral.ts`
- Handles viral milestones and tier upgrades
- Rate limiting: 1 notification per 30 seconds per token, 100 per day
- Notification types: `tier_upgrade`, `achievement`, `generic`

---

## 3. Events That Trigger Farcaster Notifications

### A. **Viral Engagement Events** ✅ ACTIVE
**Trigger:** When badge share casts reach viral tiers
**File:** `app/api/neynar/webhook/route.ts` (lines 426-443)

**Events:**
1. **Tier Upgrades** - When cast reaches new viral tier
   - Tiers: active → engaging → popular → viral → mega_viral
   - Example: "🔥 Viral Tier Upgrade! Your cast reached 'viral' tier! +50 XP bonus"
   
2. **Achievements** - Viral milestones
   - First viral cast
   - 10 viral casts
   - 100 shares milestone
   - Mega viral master

**Code:**
```typescript
// app/api/neynar/webhook/route.ts
if (syncResult.tierUpgrade && badgeCast.fid) {
  await dispatchViralNotification({
    type: 'tier_upgrade',
    fid: badgeCast.fid,
    castHash,
    oldTier: syncResult.oldTier,
    newTier: syncResult.newTier,
    xpBonus: syncResult.additionalXp,
  })
}
```

### B. **GM Streak Reminders** ✅ ACTIVE
**Trigger:** Automated script runs periodically
**File:** `scripts/automation/send-gm-reminders.ts`

**Events:**
1. **Streak Reset Warning** - When user hasn't GM'd and streak is about to reset
   - Example: "⏰ GM streak check-in: 2h 30m until your streak resets. Current streak: 5. Log today's GM to stay alive!"
   - Window: Default 180 minutes before reset
   - Checks: Has wallet, hasn't GM'd today, not already reminded

**Code:**
```typescript
await client.publishFrameNotifications({
  targetFids: [fid],
  notification: {
    title: '⏰ GM streak check-in',
    body: '2h 30m until your streak resets. Current streak: 5',
    target_url: 'https://gmeowhq.art/Quest',
    uuid,
  },
})
```

### C. **MiniApp Lifecycle Events** ✅ ACTIVE
**Trigger:** User adds/removes miniapp or enables/disables notifications
**File:** `app/api/neynar/webhook/route.ts` (lines 130-235)

**Events:**
1. `miniapp_added` - User adds Gmeow miniapp
2. `miniapp_removed` - User removes Gmeow miniapp
3. `notifications_enabled` - User enables notifications
4. `notifications_disabled` - User disables notifications

**Action:** Updates `miniapp_notification_tokens` table status

---

## 4. Notification Flow

### Viral Tier Upgrade Flow
```
1. User shares badge cast
2. Cast gets engagement (likes, recasts, replies)
3. Webhook receives cast.created event
4. handleViralEngagementSync() runs in background
5. syncCastEngagement() checks Neynar for updated metrics
6. Detects tier upgrade (e.g., engaging → popular)
7. dispatchViralNotification() called
8. Checks rate limits (30s interval, 100/day)
9. publishFrameNotifications() sends to Neynar
10. Neynar delivers push notification to user's Warpcast app
```

### GM Reminder Flow
```
1. Cron job runs send-gm-reminders.ts
2. Fetches active notification tokens
3. For each user:
   - Gets wallet address
   - Checks onchain GM status
   - Calculates time until streak reset
4. Filters users in reminder window (default 3 hours)
5. Builds notification copy
6. publishFrameNotifications() sends to Neynar
7. Records reminder in miniapp_notification_tokens
```

---

## 5. Database Tables

### `miniapp_notification_tokens`
Stores user notification tokens for push notifications
```sql
id, fid, token, notification_url, status
last_event, last_event_at, last_seen_at
last_gm_reference_at, last_gm_reminder_sent_at
wallet_address, client_fid, created_at, updated_at
```

### `miniapp_notification_dispatches`
Logs all notification dispatches
```sql
id, notification_title, notification_body
target_count, payload, results, created_at
```

### `user_notification_history`
Stores notification history for UI display
```sql
id, fid, category, tone, title, message
target_url, metadata, dismissed_at, created_at
```

---

## 6. Rate Limits

### Warpcast/Neynar Limits
- **Per token:** 1 notification every 30 seconds
- **Daily limit:** 100 notifications per token
- Enforced in `lib/notifications/viral.ts` via `NotificationRateLimiter` class

### Implementation
```typescript
class NotificationRateLimiter {
  private readonly PER_TOKEN_INTERVAL_MS = 30000 // 30 seconds
  private readonly PER_TOKEN_DAILY_LIMIT = 100
  
  canSendNotification(token: string): boolean {
    // Check 30-second interval + daily limit
  }
}
```

---

## 7. Testing & Monitoring

### Check Notification Logs
```sql
-- View recent dispatches
SELECT * FROM miniapp_notification_dispatches 
ORDER BY created_at DESC LIMIT 10;

-- View active notification tokens
SELECT fid, status, last_event, last_event_at 
FROM miniapp_notification_tokens 
WHERE status = 'enabled'
ORDER BY last_event_at DESC;

-- View user notification history
SELECT fid, category, title, message, created_at 
FROM user_notification_history 
WHERE dismissed_at IS NULL
ORDER BY created_at DESC LIMIT 20;
```

### Manual Test (send-gm-reminders.ts)
```bash
# Dry run (no actual notifications)
tsx scripts/automation/send-gm-reminders.ts --dry-run

# Send to max 10 users in 60-minute window
tsx scripts/automation/send-gm-reminders.ts --window-minutes 60 --max 10
```

---

## 8. Summary: Which Events Are Broadcasting?

### ✅ **CURRENTLY BROADCASTING TO FARCASTER:**

1. **Viral Tier Upgrades** - When badge share casts reach new viral tiers
2. **Viral Achievements** - First viral, 10 viral casts, 100 shares, mega viral master
3. **GM Streak Reminders** - Automated reminders when streak about to reset

### 📱 **IN-APP NOTIFICATIONS ONLY** (NotificationBell):

These show in the UI but DON'T broadcast to Farcaster:
- GM logged
- Quest completed
- Badge earned
- Level up
- Tip received
- Guild invites
- System messages

### 🔧 **TO ADD FARCASTER BROADCAST:**

To broadcast any event to Farcaster, call:
```typescript
import { dispatchViralNotification } from '@/lib/viral-notifications'

await dispatchViralNotification({
  type: 'generic',
  fid: userFid,
  title: 'New Badge Earned!',
  body: 'You just earned the Streak Master badge!',
  targetUrl: '/profile?tab=badges',
})
```

---

## 9. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SYSTEM                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐      ┌──────────────────────────────┐
│   NotificationBell   │      │   Farcaster Push (Neynar)    │
│   (UI Component)     │      │   (Push Notifications)        │
└──────────────────────┘      └──────────────────────────────┘
         │                                    │
         │ Reads from                         │ Sends to
         ▼                                    ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│ user_notification_   │      │  miniapp_notification_       │
│ history table        │      │  tokens table                │
└──────────────────────┘      └──────────────────────────────┘
         ▲                                    ▲
         │ Written by                         │ Dispatches via
         │ API routes                         │
┌──────────────────────┐      ┌──────────────────────────────┐
│ app/api/             │      │ Neynar publishFrame          │
│ notifications/       │      │ Notifications API            │
└──────────────────────┘      └──────────────────────────────┘
                                              ▲
                    ┌─────────────────────────┼─────────────────┐
                    │                         │                 │
         ┌──────────┴─────────┐  ┌───────────┴────────┐  ┌────┴────────┐
         │ Viral Engagement   │  │ GM Reminders       │  │ Generic     │
         │ (webhook handler)  │  │ (cron script)      │  │ Events      │
         └────────────────────┘  └────────────────────┘  └─────────────┘
```

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `components/notifications/NotificationBell.tsx` | UI notification bell component |
| `supabase/functions/_shared/miniapp_notification_dispatcher.ts` | Core Farcaster push notification dispatcher |
| `lib/notifications/viral.ts` | Viral notification logic with rate limiting |
| `lib/notifications/miniapp.ts` | MiniApp token management |
| `lib/notifications/history.ts` | UI notification history helpers |
| `app/api/neynar/webhook/route.ts` | Webhook handler (triggers viral notifications) |
| `scripts/automation/send-gm-reminders.ts` | GM reminder cron script |

---

## 11. Next Steps

To add more events to Farcaster broadcast:

1. **Badge Earned** - Call `dispatchViralNotification()` when badge minted
2. **Level Up** - Notify when user levels up (25 XP intervals)
3. **Quest Completed** - First quest, streak milestones
4. **Guild Events** - Guild invites, guild achievements

Example:
```typescript
// In your badge earning logic
await dispatchViralNotification({
  type: 'generic',
  fid: userFid,
  title: '🎖️ Badge Earned!',
  body: `You earned the ${badgeName} badge!`,
  targetUrl: '/profile?tab=badges',
})
```
