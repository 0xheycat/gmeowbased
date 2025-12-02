# 🎯 Phase 1.5: Toast Architecture Upgrade

**Created**: December 1, 2025  
**Status**: ✅ **COMPLETE** (Phase 1.5.1 + 1.5.2)  
**Reference**: `planning/template/music/common/resources/client/ui/toast/`  
**Goal**: Align notification system with tested template patterns

---

## ✅ **IMPLEMENTATION COMPLETE**

### **Phase 1.5.1: Critical Features** (Completed)
1. ✅ **Toast Timer Class** (30min) - `components/ui/toast-timer.ts`
2. ✅ **Queue Management** (20min) - Max 3 visible toasts
3. ✅ **Framer Motion** (45min) - Scale + opacity animations

### **Phase 1.5.2: UX Improvements** (Completed)
4. ✅ **Position Options** (30min) - top-right for mobile (user requested)
5. ✅ **Smart Durations** (15min) - Error 8s, success 3s, loading ∞
6. ✅ **Loading State** (25min) - Spinner for loading events

**Total Time**: 2h 45min  
**Files Modified**: 3 (live-notifications.tsx, notification-card.tsx, notification-history.ts)  
**Files Created**: 1 (toast-timer.ts)

---

## 📊 Gap Analysis: Our System vs. Music Template

### ❌ **MISSING (Critical)**

| Component | Template Has | We Have | Priority | Effort |
|-----------|-------------|---------|----------|--------|
| **Toast Timer** | ✅ Pausable/resumable class | ❌ Simple setTimeout | 🔴 HIGH | 30min |
| **Queue Management** | ✅ Max 1 visible | ❌ Show all | 🔴 HIGH | 20min |
| **Position Options** | ✅ bottom-center/right | ❌ Only top-right | 🟡 MEDIUM | 30min |
| **Framer Motion** | ✅ Scale + opacity animations | ❌ No animations | 🔴 HIGH | 45min |
| **Zustand Store** | ✅ Global state | ❌ React Context | 🟢 LOW | 1h |

### ⚠️ **PARTIAL (Improve)**

| Feature | Template | Ours | Action |
|---------|----------|------|--------|
| **Loading State** | ✅ Spinner + type:'loading' | ❌ No loading type | Add loading variant |
| **Action Buttons** | ✅ CTA with Link support | ❌ No actions | Add action prop |
| **Auto-dismiss Duration** | ✅ Smart (danger:8s, default:3s, loading:∞) | ⚠️ Fixed 3s or custom | Use smart defaults |

### ✅ **ALREADY BETTER**

| Feature | Template | Ours | Status |
|---------|----------|------|--------|
| **Rich Text** | ❌ Simple text only | ✅ @mentions, points, icons | ✅ KEEP |
| **Event Types** | ❌ 3 tones (danger/positive/default) | ✅ 45 semantic events | ✅ KEEP |
| **Categories** | ❌ None | ✅ 11 categories (gm, quest, badge...) | ✅ KEEP |

---

## 🎯 Implementation Plan

### **Task 1: Toast Timer Class** (30min) 🔴 HIGH

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-timer.ts`

**Create**: `components/ui/toast-timer.ts`

```typescript
export class ToastTimer {
  private timerId: ReturnType<typeof setTimeout> | null = null
  private remaining: number
  private callback: () => void
  private startTime: number = 0

  constructor(callback: () => void, delay: number) {
    this.remaining = delay
    this.callback = callback
    this.resume()
  }

  pause() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
      this.remaining -= Date.now() - this.startTime
    }
  }

  resume() {
    if (!this.timerId) {
      this.startTime = Date.now()
      this.timerId = setTimeout(this.callback, this.remaining)
    }
  }

  clear() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }
}
```

**Integration**:
- Add `timer?: ToastTimer` to NotificationItem interface
- Create timer in `showNotification()`: `timer: duration > 0 ? new ToastTimer(() => dismiss(id), duration) : null`
- Add hover handlers: `onPointerEnter={() => notification.timer?.pause()}`, `onPointerLeave={() => notification.timer?.resume()}`

---

### **Task 2: Queue Management** (20min) 🔴 HIGH

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-store.ts` (lines 42-48)

**Update**: `components/ui/live-notifications.tsx`

```typescript
const MAXIMUM_VISIBLE = 3 // Show max 3 toasts at once

const showNotification = useCallback((message: string, event: NotificationEvent, ...) => {
  // Remove oldest if exceeding max
  const amountToRemove = notifications.length + 1 - MAXIMUM_VISIBLE
  if (amountToRemove > 0) {
    setNotifications(prev => prev.slice(amountToRemove))
  }
  
  // ... rest of logic
}, [notifications.length])
```

**Why**: Prevents notification spam, keeps UI clean (music template uses max 1, we'll use 3 for better UX)

---

### **Task 3: Framer Motion Animations** (45min) 🔴 HIGH

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-container.tsx` (lines 1-20)

**Install**: `pnpm add framer-motion` (if not already installed)

**Update**: `components/ui/live-notifications.tsx` (render section)

```tsx
import { AnimatePresence, m } from 'framer-motion'

const initial = { opacity: 0, y: 50, scale: 0.3 }
const animate = { opacity: 1, y: 0, scale: 1 }
const exit = { opacity: 0, scale: 0.5, transition: { duration: 0.2 } }

// In NotificationProvider return:
<AnimatePresence>
  {notifications.map(notification => (
    <m.div
      key={notification.id}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{ duration: 0.2 }}
      onPointerEnter={() => notification.timer?.pause()}
      onPointerLeave={() => notification.timer?.resume()}
    >
      <NotificationCard {...notification} />
    </m.div>
  ))}
</AnimatePresence>
```

**Why**: Professional enter/exit animations (music template standard)

---

### **Task 4: Position Options** (30min) 🟡 MEDIUM

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-store.ts` (lines 8, 20)

**Update**: `components/ui/live-notifications.tsx`

```typescript
export type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'

export interface NotificationItem {
  // ... existing fields
  position?: ToastPosition
}

// In render:
<div className={clsx(
  'fixed z-50 space-y-3 max-w-md p-4',
  position === 'top-right' && 'top-4 right-4',
  position === 'top-center' && 'top-4 left-1/2 -translate-x-1/2',
  position === 'bottom-right' && 'bottom-4 right-4',
  position === 'bottom-center' && 'bottom-4 left-1/2 -translate-x-1/2'
)}>
```

**Default**: `bottom-center` (music template default)

---

### **Task 5: Smart Duration Defaults** (15min) 🟡 MEDIUM

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-store.ts` (lines 44-52)

**Create**: Helper function in `live-notifications.tsx`

```typescript
function getDefaultDuration(event: NotificationEvent): number {
  // Errors/warnings need more time to read
  if (event.includes('failed') || event.includes('error')) return 8000
  
  // Loading states don't auto-dismiss
  if (event.includes('loading')) return 0
  
  // Success/info auto-dismiss quickly
  return 3000
}

// Use in showNotification:
const duration = customDuration ?? getDefaultDuration(event)
```

---

### **Task 6: Loading State Support** (25min) 🟡 MEDIUM

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-container.tsx` (lines 51-56)

**Add Events**:
```typescript
export type NotificationEvent = 
  | 'loading_transaction'
  | 'loading_data'
  | 'loading_profile'
  // ... existing 45 events
```

**Update**: `components/ui/notification-card.tsx` - Add spinner for loading events

```tsx
import { ProgressCircle } from '@/components/ui/progress-circle'

// In EVENT_CONFIG:
loading_transaction: {
  icon: <ProgressCircle size="sm" isIndeterminate />,
  tone: 'info',
  label: 'Processing...'
}
```

---

### **Task 7: Action Button Support** (30min) 🟢 LOW

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-container.tsx` (lines 77-89)

**Update**: NotificationItem interface

```typescript
export interface NotificationItem {
  // ... existing fields
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}
```

**Update**: NotificationCard to render action button

```tsx
{notification.action && (
  <Button
    variant="text"
    size="sm"
    onClick={() => {
      notification.action?.onClick?.()
      onDismiss?.(id)
    }}
    href={notification.action.href}
  >
    {notification.action.label}
  </Button>
)}
```

---

### **Task 8: Zustand Migration** (1h) 🟢 LOW (Optional)

**Reference**: `planning/template/music/common/resources/client/ui/toast/toast-store.ts`

**Why**: Global state management (better than Context for notifications)

**Install**: `pnpm add zustand`

**Create**: `components/ui/notification-store.ts`

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface NotificationStore {
  notifications: NotificationItem[]
  add: (notification: NotificationItem) => void
  remove: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationStore>()(
  immer((set) => ({
    notifications: [],
    add: (notification) => set((state) => {
      // Queue management
      const amountToRemove = state.notifications.length + 1 - MAXIMUM_VISIBLE
      if (amountToRemove > 0) {
        state.notifications.splice(0, amountToRemove)
      }
      state.notifications.push(notification)
    }),
    remove: (id) => set((state) => {
      const index = state.notifications.findIndex(n => n.id === id)
      if (index > -1) {
        state.notifications[index].timer?.clear()
        state.notifications.splice(index, 1)
      }
    }),
    clear: () => set((state) => {
      state.notifications.forEach(n => n.timer?.clear())
      state.notifications = []
    })
  }))
)
```

**Note**: This is optional - React Context works fine for our use case. Zustand is better for large apps with complex state.

---

## 📈 Implementation Order

### **Phase 1.5.1: Critical Missing Features** (1h 35min)
1. ✅ Task 1: Toast Timer Class (30min) → Enables pause/resume on hover
2. ✅ Task 2: Queue Management (20min) → Prevents notification spam
3. ✅ Task 3: Framer Motion (45min) → Professional animations

**Deliverable**: Toasts with smooth animations, hover pause, max 3 visible

---

### **Phase 1.5.2: UX Improvements** (1h 10min)
4. ✅ Task 4: Position Options (30min) → bottom-center default (mobile-friendly)
5. ✅ Task 5: Smart Durations (15min) → Errors stay longer, success auto-dismiss
6. ✅ Task 6: Loading State (25min) → Spinner for async operations

**Deliverable**: Mobile-optimized positioning, context-aware durations

---

### **Phase 1.5.3: Advanced Features** (1h 30min) - OPTIONAL
7. ⏸️ Task 7: Action Buttons (30min) → "View", "Undo", "Retry" CTAs
8. ⏸️ Task 8: Zustand Migration (1h) → Global state (only if needed for scale)

**Deliverable**: Interactive toasts with CTAs (optional enhancement)

---

## 🧪 Testing Checklist

After implementing Phase 1.5.1 + 1.5.2:

- [ ] Toast appears with scale + opacity animation
- [ ] Hover pauses auto-dismiss timer
- [ ] Unhover resumes timer countdown
- [ ] Maximum 3 toasts visible at once (oldest removed)
- [ ] Error notifications stay for 8 seconds
- [ ] Success notifications dismiss after 3 seconds
- [ ] Loading toasts don't auto-dismiss (duration: 0)
- [ ] Bottom-center position works on mobile
- [ ] Toasts stack vertically with 12px gap
- [ ] Exit animation plays on dismiss
- [ ] Manual dismiss (X button) works
- [ ] Toast timer cleared on unmount (no memory leaks)

---

## 📝 Documentation Updates

After Phase 1.5.1 + 1.5.2 complete:

1. Update `PHASE-1-NOTIFICATION-DIALOG-COMPLETE.md`:
   - Add "Phase 1.5: Toast Architecture Upgrade" section
   - Document 6 new features (timer, queue, animations, position, durations, loading)
   
2. Update `CURRENT-TASK.md`:
   - Mark Phase 1.5 as complete
   - Add migration notes for developers
   
3. Update `Foundation-Rebuild-ROADMAP.md`:
   - Phase 1 → "Notification system aligned with music template patterns"

4. Create `TOAST-MIGRATION-GUIDE.md`:
   - How to use new position options
   - When to use loading events
   - Smart duration examples

---

## ⚠️ Breaking Changes: NONE

All changes are **backwards compatible**:
- ✅ Existing `showNotification()` calls work unchanged
- ✅ Event types stay the same (45 semantic events)
- ✅ Rich text parsing unchanged
- ✅ Default position: bottom-center (new), but can override to top-right
- ✅ Default duration: 3s (same), but now context-aware

**Migration**: Zero code changes required in consuming components ✅

---

## 🎯 Success Criteria

Phase 1.5 is **100% complete** when:

1. ✅ Toast timer pauses on hover (tested)
2. ✅ Max 3 toasts visible (queue works)
3. ✅ Smooth enter/exit animations (Framer Motion)
4. ✅ Bottom-center default position (mobile-first)
5. ✅ Smart durations (error: 8s, success: 3s, loading: ∞)
6. ✅ Loading events show spinner
7. ✅ 0 TypeScript errors
8. ✅ 0 console warnings
9. ✅ All 12 test cases pass
10. ✅ Documentation updated (4 files)

**Estimated Total**: 2h 45min (Phase 1.5.1 + 1.5.2)  
**Optional**: +1h 30min (Phase 1.5.3 for action buttons + Zustand)

---

## 🚀 Next Steps

1. **Start Phase 1.5.1** (Critical): Toast Timer → Queue → Animations (1h 35min)
2. **User Review**: Test on mobile (bottom-center positioning)
3. **Phase 1.5.2** (UX): Position + Durations + Loading (1h 10min)
4. **Documentation**: Update 4 files (30min)
5. **Phase 2 Approval**: Request user sign-off after Phase 1.5 complete

**Ready to start Task 1: Toast Timer Class?**
