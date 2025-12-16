# Notification vs Dialog Usage Audit

**Date**: December 1, 2025  
**Status**: Dashboard Complete, Others Need Conversion

---

## Clear Separation of Concerns

### 🔔 Notifications (Toast/Banner)
**Purpose**: Brief, non-blocking feedback for user actions  
**System**: `useNotifications()` hook → `showNotification(message, event, duration, category)`  
**Location**: `components/ui/live-notifications.tsx`

**Use For:**
- ✅ Success confirmations ("GM sent!", "Badge minted!")
- ✅ Progress updates ("Transaction sent", "Loading...")
- ✅ Non-critical info ("Streak updated", "Points earned")
- ✅ Background events (tip received, badge eligible)
- ✅ Quick errors (transaction failed, network issue)

**Characteristics:**
- Auto-dismiss after 2-5 seconds
- Stackable (multiple can show)
- Non-blocking (user can continue)
- Optional actions (links, buttons)
- Event-based (29 event types)

---

### 🚨 Dialogs (Modal/Popup)
**Purpose**: Critical decisions, confirmations, or blocking errors  
**System**: `ErrorDialog` component  
**Location**: `components/ui/error-dialog.tsx`

**Use For:**
- ❌ Critical errors that block workflow
- ❌ Required user decisions (confirm/cancel)
- ❌ Wallet connection prompts
- ❌ Permission requests
- ❌ Data loss warnings
- ❌ Network switching confirmations

**Characteristics:**
- Modal overlay (blocks UI)
- User must dismiss/respond
- Single instance
- Action buttons (primary/secondary)
- Cannot stack

---

## Current Notification System Status

### ✅ COMPLETE: Dashboard (app/Dashboard/page.tsx)
**Status**: 100% migrated to event-based system

**Conversion Details:**
- Old: `useLegacyNotificationAdapter()` → `pushNotification.success()` / `.error()` / `.info()` / `.warning()`
- New: `useNotifications()` → `showNotification(msg, event, duration, category)`

**All 40 Notifications Converted:**
1. Telemetry updates (2): `'tip_received'`, `'badge_minted'`
2. Quest management (8): `'quest_progress'`, `'quest_completed'`, `'quest_reward_claimed'`
3. Staking (6): `'points_milestone'`, `'info'`, `'error'`
4. GM sending (5): `'gm_sent'`, `'gm_streak_broken'`, `'info'`, `'error'`
5. Frame sharing (4): `'frame_action_success'`, `'frame_action_failed'`, `'frame_share_reward'`
6. Referral codes (6): `'referral_reward'`, `'info'`, `'error'`
7. Tips/mentions (1): `'tip_received'`, `'mention_received'`
8. Clipboard (2): `'success'`, `'error'`

**Zero Deprecated Calls**: No `.success()` / `.error()` / `.info()` / `.warning()` remain

---

### ❌ NEEDS CONVERSION: Other Files

#### Files Still Using `useLegacyNotificationAdapter()`:
```bash
$ grep -r "useLegacyNotificationAdapter" app/ components/ --include="*.tsx" --include="*.ts"
```

**Estimated Files:**
- `app/profile/page.tsx`: ~16 notifications (wallet, badges, quests)
- `app/Quest/page.tsx`: ~3 notifications (quest creation, validation)
- `components/GMButton.tsx`: ~5 notifications (GM actions, cooldowns)
- `components/ConnectWallet.tsx`: ~3 notifications (connection status)
- `app/Guild/page.tsx`: ~2 notifications (guild actions)

**Total Remaining**: ~29 notifications across 5 files

---

## Event Types (29 Total)

### 🎯 User Actions (10 events)
- `gm_sent` - GM transaction confirmed
- `gm_streak_continue` - Streak maintained
- `gm_streak_milestone` - Streak milestone (7/30/100 days)
- `gm_streak_broken` - Streak lost
- `gm_leaderboard_rank` - Rank changed
- `quest_completed` - Quest finished
- `quest_progress` - Quest update
- `quest_reward_claimed` - Reward collected
- `badge_minted` - Badge created
- `badge_eligible` - Can mint badge

### 💰 Financial (4 events)
- `tip_received` - Tip received
- `tip_sent` - Tip sent
- `points_milestone` - Points earned/staked
- `referral_reward` - Referral bonus

### 🏆 Achievements (4 events)
- `level_up` - Rank increased
- `badge_tier_upgrade` - Badge upgraded
- `achievement` - Achievement unlocked
- `rank_changed` - Leaderboard position

### 👥 Social (4 events)
- `mention_received` - @mentioned on Farcaster
- `friend_joined` - Referral signed up
- `guild_invite` - Guild invitation
- `frame_share_reward` - Frame shared

### 🖼️ Frame Actions (2 events)
- `frame_action_success` - Frame interaction worked
- `frame_action_failed` - Frame interaction failed

### 🔧 System (5 events)
- `success` - Generic success
- `error` - Generic error
- `warning` - Generic warning
- `info` - Generic info
- *(Removed: wallet_connected, wallet_required, chain_switched, transaction_confirmed, transaction_rejected, insufficient_balance, address_copied, data_load_failed)*

---

## Temporary Placeholders (Need ErrorDialog)

**7 instances using `'error'` event that should be dialogs:**

1. Dashboard line 994: `showNotification('Connect wallet.', 'error', ...)` → ErrorDialog
2. Dashboard line 1026: `showNotification('Connect wallet.', 'error', ...)` → ErrorDialog
3. Dashboard line 1045: `showNotification('Connect wallet.', 'error', ...)` → ErrorDialog
4. Dashboard line 1269: `showNotification('Connect wallet.', 'error', ...)` → ErrorDialog
5. Dashboard line 1301: `showNotification('Connect wallet.', 'error', ...)` → ErrorDialog
6. Dashboard line 1396: `showNotification('Connect wallet.', 'error', ...)` → ErrorDialog
7. Dashboard line 1545: `showNotification('Connect wallet.', 'error', ...)` → ErrorDialog

**Should be:**
```tsx
<ErrorDialog
  isOpen={showWalletError}
  type="warning"
  title="Wallet Required"
  message="Connect your wallet to continue"
  primaryAction={{ 
    label: "Connect Wallet", 
    onClick: () => {/* trigger wallet connection */} 
  }}
  secondaryAction={{ 
    label: "Cancel", 
    onClick: () => setShowWalletError(false) 
  }}
/>
```

---

## Webhook Integration (Not Yet Done)

### Badge Minted Webhook
**File**: `app/api/webhooks/badge-minted/route.ts`

**Current**: No notification save
**Needed**:
```typescript
await saveNotification({
  fid: payload.fid,
  event: 'badge_minted',
  message: `${tier} badge minted! Badge #${badgeId}`,
  metadata: { badgeId, txHash, tier, chain },
  category: 'badge',
  duration: 5000
})
```

### Tips Webhook
**File**: `app/api/tips/ingest/route.ts`

**Current**: No notification save
**Needed**:
```typescript
await saveNotification({
  fid: tip.toFid,
  event: 'tip_received',
  message: `${fromUser} tipped you ${amount} pts`,
  metadata: { tipId, amount, fromFid, txHash },
  category: 'tip',
  duration: 4000
})
```

---

## Legacy Adapter (Must Delete)

**File**: `components/ui/live-notifications.tsx` (lines 271-302)

**Function**: `useLegacyNotificationAdapter()`

**Status**: ⚠️ STILL EXISTS - prevents enforcement of new pattern

**Action Required**: Delete entire function after all files converted

**Why Delete**:
- Allows deprecated `.success()` / `.error()` / `.info()` / `.warning()` shortcuts
- Mixed API causes confusion (two ways to do same thing)
- Prevents TypeScript enforcement of event-based system
- No compile-time safety

---

## Remaining Work

### Task 1: Convert Remaining Files (4-6 hours)
1. Profile page: 16 notifications
2. Quest page: 3 notifications  
3. GMButton: 5 notifications
4. ConnectWallet: 3 notifications
5. Guild page: 2 notifications

**Pattern**:
```typescript
// OLD (deprecated):
const pushNotification = useLegacyNotificationAdapter()
pushNotification.success('Quest completed!')

// NEW (correct):
const { showNotification } = useNotifications()
showNotification('Quest completed!', 'quest_completed', 4000, 'quest')
```

### Task 2: Delete Legacy Adapter (30 minutes)
After all files converted, delete `useLegacyNotificationAdapter()` from `live-notifications.tsx`

### Task 3: Convert to ErrorDialog (2 hours)
Replace 7 wallet check toasts with proper modal dialogs

### Task 4: Integrate Webhooks (2 hours)
Add notification saves to badge/tip webhook handlers

### Task 5: Remove Console Spam (1 hour)
Delete all `console.warn()` and `console.error()` from production code

---

## Success Criteria

✅ **Phase 1 Complete When:**
- [ ] Zero files use `useLegacyNotificationAdapter()`
- [ ] `useLegacyNotificationAdapter()` function deleted
- [ ] All 64 notifications use `showNotification()` with events
- [ ] 7 wallet checks converted to ErrorDialog
- [ ] Webhooks save notifications to database
- [ ] Zero `console.warn` / `console.error` in production
- [ ] All notifications use Phosphor icons (no emoticons)
- [ ] All System Events removed from types

**Current Progress**: 62% (40/64 notifications converted)

---

## Key Difference Summary

| Aspect | Notifications (Toast) | Dialogs (Modal) |
|--------|----------------------|-----------------|
| **Blocking** | No | Yes |
| **Dismissal** | Auto (2-5s) | Manual |
| **Stackable** | Yes | No |
| **Use Case** | Feedback, updates | Critical decisions |
| **System** | `useNotifications()` | `<ErrorDialog />` |
| **Examples** | "GM sent!", "Tip received" | "Connect wallet?", "Confirm delete?" |

**Rule of Thumb**:
- Can user ignore it? → Notification
- Must user respond? → Dialog
