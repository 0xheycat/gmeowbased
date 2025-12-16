# Professional UI Feedback Patterns Guide

**Last Updated**: December 14, 2025  
**Status**: ✅ Toast System Removed - Modern Patterns Only

---

## 🎯 Core Philosophy

**Single Responsibility**: Each UI pattern serves one purpose
- **ErrorDialog**: Errors that need acknowledgment
- **Tooltip**: Informational hints for disabled/unavailable states
- **XPEventOverlay**: Success celebrations with XP/points rewards
- **UI State**: Loading, processing, and inline feedback

**Anti-Patterns Eliminated**:
- ❌ Toast notifications (removed Dec 14, 2025)
- ❌ ErrorDialog for non-errors (info messages)
- ❌ Page reloads after success (use XPEventOverlay)
- ❌ Silent success (users need feedback)

---

## 📋 Pattern Decision Matrix

### When to Use Each Pattern

| Scenario | Pattern | Example |
|----------|---------|---------|
| **Validation failed** | ErrorDialog | "Please connect wallet" |
| **Button disabled** | Tooltip | "Badge already minted" |
| **Action succeeded with XP** | XPEventOverlay | "Badge claimed! +100 XP" |
| **Processing action** | Button loading state | `disabled={loading}` |
| **Network error** | ErrorDialog | "Transaction failed: {reason}" |
| **Info about disabled state** | Tooltip | "Complete quest 1 first" |
| **Task completed** | XPEventOverlay | "Task 2/5 complete! +50 XP" |
| **Quest completed** | XPEventOverlay | "Quest done! +500 XP" |
| **Guild joined** | XPEventOverlay | "Welcome to guild! +200 XP" |
| **Referral registered** | XPEventOverlay | "Code created! +75 XP" |

---

## 🛠️ Implementation Patterns

### 1. ErrorDialog (Errors Only)

**Use For**: Validation errors, network failures, permission issues

**Implementation**:
```tsx
import { useDialog, ErrorDialog } from '@/components/dialogs'

const { isOpen: errorOpen, open: openError, close: closeError } = useDialog()
const [errorMessage, setErrorMessage] = useState('')

// Trigger error
if (!address) {
  setErrorMessage('Please connect your wallet to continue')
  openError()
  return
}

// JSX
<ErrorDialog
  isOpen={errorOpen}
  onClose={closeError}
  title="Action Failed"
  message={errorMessage}
/>
```

**Examples in Codebase**:
- `components/badge/BadgeInventory.tsx` - Wallet connection errors
- `components/quests/QuestVerification.tsx` - Verification failures

---

### 2. Tooltip (Info/Disabled States)

**Use For**: Explaining why buttons are disabled, providing context

**Implementation**:
```tsx
import { Tooltip } from '@/components/ui/tooltip'

// Disabled button with explanation
{badge.minted ? (
  <Tooltip content="This badge is already minted on-chain" side="bottom">
    <button
      disabled
      className="... opacity-50 cursor-not-allowed"
    >
      <CheckIcon />
      Minted
    </button>
  </Tooltip>
) : (
  <button onClick={handleClaim}>
    Claim Badge
  </button>
)}
```

**Examples in Codebase**:
- `components/badge/BadgeInventory.tsx` - "Already minted" info

**Tooltip Props**:
- `content`: React.ReactNode (text or JSX)
- `side`: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
- `delay`: number (default: 200ms)

---

### 3. XPEventOverlay (Success Celebrations)

**Use For**: All actions that earn XP/points/rewards

**Implementation**:
```tsx
import { XPEventOverlay, type XpEventPayload } from '@/components/XPEventOverlay'

const [xpOverlayOpen, setXpOverlayOpen] = useState(false)
const [xpPayload, setXpPayload] = useState<XpEventPayload | null>(null)

// Trigger celebration
setXpPayload({
  event: 'badge-claim', // See XpEventKind types
  chainKey: 'base',
  xpEarned: 100,
  totalPoints: userTotalPoints,
  headline: 'Badge claimed!', // Optional (uses default)
  shareLabel: 'Share your badge', // Optional
  visitUrl: '/badges', // Optional
  visitLabel: 'View collection', // Optional
})
setXpOverlayOpen(true)

// JSX
<XPEventOverlay
  open={xpOverlayOpen}
  payload={xpPayload}
  onClose={() => setXpOverlayOpen(false)}
/>
```

**Available Event Types** (`XpEventKind`):
- `'gm'` - Daily GM action
- `'stake'` / `'unstake'` - Badge staking
- `'quest-create'` - New quest created
- `'quest-verify'` - Quest completed (all tasks)
- `'task-complete'` - Individual task done
- `'badge-claim'` - Badge minted
- `'guild-join'` - Joined guild
- `'referral-create'` - Referral code registered
- `'referral-register'` - Used someone's referral
- `'onchainstats'` - Stats shared
- `'profile'` - Profile updated
- `'guild'` - Guild milestone
- `'tip'` - Tip received

**Examples in Codebase**:
- `components/badge/BadgeInventory.tsx` - Badge claim celebration
- `components/quests/QuestVerification.tsx` - Task/quest completion

---

### 4. UI State (Loading/Processing)

**Use For**: Inline feedback during async operations

**Implementation**:
```tsx
const [isProcessing, setIsProcessing] = useState(false)

// Processing state
<button
  onClick={handleAction}
  disabled={isProcessing}
  className="disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isProcessing ? (
    <>
      <LoadingIcon className="animate-spin" />
      Processing...
    </>
  ) : (
    'Submit'
  )}
</button>
```

**Visual Feedback Patterns**:
- Loading spinner: `<LoadingIcon className="animate-spin" />`
- Disabled opacity: `disabled:opacity-50`
- Cursor change: `disabled:cursor-not-allowed`
- Status badge: `<StatusBadge status="pending" />`

---

## 🔄 Migration from Toast System

### Before (Toast Anti-Pattern)
```tsx
// ❌ OLD - Toast for everything
showNotification('Badge claimed!', 'success')
showNotification('Already minted', 'info')
showNotification('Failed to claim', 'error')
```

### After (Professional Patterns)
```tsx
// ✅ NEW - Appropriate patterns

// Success with XP → XPEventOverlay
setXpPayload({ event: 'badge-claim', xpEarned: 100, ... })
setXpOverlayOpen(true)

// Info about disabled → Tooltip
<Tooltip content="Already minted">
  <button disabled>Minted</button>
</Tooltip>

// Error → ErrorDialog
setErrorMessage('Failed to claim badge')
openError()
```

---

## 📍 Integration Points (Pending)

### Components Ready for XPEventOverlay

1. **GuildProfilePage.tsx** (`handleJoinGuild` success)
   - Event: `'guild-join'`
   - XP: 200 points
   - Trigger: After `writeContract` success

2. **Referral Page** (code registration)
   - Event: `'referral-create'`
   - XP: 75 points
   - Trigger: After registration success

3. **Referral Page** (using referral code)
   - Event: `'referral-register'`
   - XP: 25 points (user) + 50 points (referrer)
   - Trigger: After code redemption

4. **Dashboard** (GM action - future)
   - Event: `'gm'`
   - XP: Daily bonus
   - Trigger: After GM button click

5. **Profile Updates** (future)
   - Event: `'profile'`
   - XP: Varies
   - Trigger: After profile save

---

## ✅ Best Practices

### Do's
- ✅ Use ErrorDialog for actual errors that need user attention
- ✅ Use Tooltip for informational hints on disabled elements
- ✅ Use XPEventOverlay for all success actions with rewards
- ✅ Show loading states during async operations
- ✅ Keep error messages concise and actionable
- ✅ Provide clear next steps in XPEventOverlay (visitUrl, shareUrl)

### Don'ts
- ❌ Don't use ErrorDialog for info messages
- ❌ Don't show success without celebration (if XP earned)
- ❌ Don't use page reloads as feedback (use overlay then reload)
- ❌ Don't leave buttons enabled during processing
- ❌ Don't show multiple overlays simultaneously
- ❌ Don't use toast notifications (removed system)

---

## 🎨 Professional Animation Guidelines

### ErrorDialog
- Entry: Scale 0.95 → 1.0 with fade-in
- Duration: 200ms
- Backdrop: Click to dismiss

### XPEventOverlay
- Entry: Scale + confetti animation
- Duration: 3-5 seconds (auto-close or manual)
- Celebration: Framer Motion animations
- WCAG: Prefers-reduced-motion support

### Tooltip
- Entry: Fade-in with zoom
- Duration: 200ms
- Delay: 200ms hover
- Position: Auto-adjust for screen bounds

---

## 📊 Current Implementation Status

**Completed** ✅:
- BadgeInventory.tsx (claim + minted state)
- QuestVerification.tsx (task + quest completion)
- XPEventOverlay.tsx (all event types added)

**Pending** 🔲:
- GuildProfilePage.tsx (join guild)
- Referral page (code registration)
- Dashboard (GM action)
- Profile updates

**Removed** ❌:
- NotificationProvider.tsx (toast system)
- useNotifications hook
- All showNotification calls

---

## 🔍 Quick Reference

**Need to show an error?** → ErrorDialog  
**Button is disabled?** → Tooltip  
**User earned XP?** → XPEventOverlay  
**Action is processing?** → UI loading state  
**Connection state?** → Button UI (connected/disconnected)  

**Questions?**  
Check examples in:
- `/components/badge/BadgeInventory.tsx`
- `/components/quests/QuestVerification.tsx`
- `/components/XPEventOverlay.tsx`
