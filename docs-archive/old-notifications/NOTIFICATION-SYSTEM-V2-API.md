# Notification System V2 - API Reference & Usage Guide

**Status:** Production Ready ✅  
**Last Updated:** November 30, 2025

---

## Overview

The Notification System V2 provides a modern, event-based notification infrastructure with rich text formatting, enhanced animations, and a unified API. Built on tested template patterns with backwards compatibility.

### Key Features
- ✅ **Rich text formatting** - Automatic @username, points, emoji parsing
- ✅ **Enhanced animations** - Pulse (achievements), bounce (rewards), smooth exits
- ✅ **6 notification types** - success, error, info, warning, achievement, reward
- ✅ **9 categories** - gm, quest, badge, level, streak, tip, achievement, reward, guild, system
- ✅ **Actor support** - Display user avatars and names
- ✅ **Auto-dismiss** - Configurable durations
- ✅ **Error dialog system** - Modern modals for user interaction errors
- ✅ **Backwards compatible** - Old API patterns still work

---

## Basic Usage

### 1. Simple Notifications

```typescript
import { useNotifications } from '@/components/ui/live-notifications'

function MyComponent() {
  const { showNotification, push } = useNotifications()
  
  // Simple text notification
  showNotification('GM sent successfully!', 'success', 3000)
  
  // With category
  showNotification('Quest completed!', 'achievement', 5000, 'quest')
  
  // Rich object notation
  push({
    message: 'Badge minted!',
    tone: 'success',
    category: 'badge',
    duration: 4000
  })
}
```

---

## Rich Text Formatting

### Automatic Parsing

The system automatically detects and formats:
- **@usernames** → Blue, bold, clickable
- **Points (100 pts)** → Gold, bold
- **Emojis** → Inline icons (🎉🏆🎁💰✨🔥⚡️🌟💎🎊🎈)

```typescript
// This message:
"@alice has tipped you 100 pts on Farcaster 🎉"

// Renders as:
// [@alice](blue, bold) has tipped you [100 pts](gold, bold) on Farcaster 🎉
```

### Manual Rich Text

```typescript
import { RichTextSegment } from '@/components/ui/live-notifications'

const richText: RichTextSegment[] = [
  { type: 'username', content: '@alice', metadata: { color: 'text-blue-400 font-bold' } },
  { type: 'text', content: ' has tipped you ' },
  { type: 'points', content: '100 pts', metadata: { color: 'text-gold font-bold' } },
  { type: 'text', content: ' on Farcaster ' },
  { type: 'icon', content: '🎉' }
]

push({
  message: '@alice has tipped you 100 pts on Farcaster 🎉',
  richText, // Manual override
  tone: 'success',
  category: 'tip'
})
```

---

## Social Event Examples

### Tip Notification
```typescript
push({
  message: '@username has tipped you 100 pts on Farcaster',
  tone: 'success',
  category: 'tip',
  actor: {
    name: 'username',
    avatar: 'https://...',
    fid: 12345
  },
  duration: 5000
})
```

### Achievement Notification
```typescript
push({
  message: "You're eligible for badge/NFT mint! 🎉",
  tone: 'achievement', // Triggers pulse animation
  category: 'badge',
  duration: 6000
})
```

### Reward Notification
```typescript
push({
  message: "@username, you're eligible for airdrop 💰",
  tone: 'reward', // Triggers bounce animation
  category: 'reward',
  actor: { name: 'username', avatar: '...' },
  duration: 7000
})
```

---

## Notification Types & Animations

### Success (✅)
- **Use:** Successful actions, confirmations
- **Style:** Green theme
- **Animation:** Slide-in, fade
- **Duration:** 3000ms (default)

### Error (❌)
- **Use:** Failed operations, errors
- **Style:** Red theme
- **Animation:** Slide-in, fade
- **Duration:** 5000ms (default)

### Warning (⚠️)
- **Use:** Cautions, important notices
- **Style:** Yellow theme
- **Animation:** Slide-in, fade
- **Duration:** 4000ms (default)

### Info (ℹ️)
- **Use:** General information, updates
- **Style:** Blue theme
- **Animation:** Slide-in, fade
- **Duration:** 3000ms (default)

### Achievement (🏆)
- **Use:** Milestones, unlocks, eligibility
- **Style:** Purple theme
- **Animation:** **Pulse effect** (2s loop) + slide-in
- **Duration:** 6000ms (default)

### Reward (🎁)
- **Use:** Rewards, airdrops, gifts
- **Style:** Gold theme
- **Animation:** **Bounce effect** (0.6s) + slide-in
- **Duration:** 7000ms (default)

---

## Error Dialog System

### Basic Error Dialog

```typescript
import ErrorDialog from '@/components/ui/error-dialog'
import { useState } from 'react'

function MyForm() {
  const [showError, setShowError] = useState(false)
  
  return (
    <>
      <ErrorDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        title="Missing Required Fields"
        message="Please fill in your username and email address to continue."
        type="error"
        primaryAction={{
          label: "OK",
          onClick: () => setShowError(false)
        }}
      />
    </>
  )
}
```

### Confirmation Dialog

```typescript
<ErrorDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Delete Badge?"
  message="This action cannot be undone. Are you sure you want to delete this badge?"
  type="warning"
  primaryAction={{
    label: "Delete",
    onClick: handleDelete,
    variant: "danger" // Red button
  }}
  secondaryAction={{
    label: "Cancel",
    onClick: () => setShowConfirm(false)
  }}
/>
```

### Dialog Types

#### Error
- **Icon:** Warning (red)
- **Use:** User errors, validation failures

#### Warning
- **Icon:** Warning (yellow)
- **Use:** Confirmations, cautions

#### Confirm
- **Icon:** Info (blue)
- **Use:** User choices, decisions

#### Info
- **Icon:** CheckCircle (green)
- **Use:** Success confirmations, completed actions

---

## Advanced API

### Full NotificationItem Interface

```typescript
interface NotificationItem {
  id: string                    // Auto-generated if not provided
  message: string               // Plain text message
  title?: string                // Optional title (structured notifications)
  richText?: RichTextSegment[]  // Manual rich text override
  tone: NotificationTone        // success | error | info | warning | achievement | reward
  category?: NotificationCategory // gm | quest | badge | level | etc.
  duration?: number             // Auto-dismiss duration (ms), 0 = no auto-dismiss
  actor?: {
    name?: string               // Username (without @)
    avatar?: string             // Avatar URL
    fid?: number                // Farcaster ID
  }
  metadata?: Record<string, any> // Custom metadata (saved to history)
  timestamp?: number            // Auto-populated
}
```

### Context API Methods

```typescript
import { useNotifications } from '@/components/ui/live-notifications'

const {
  showNotification,   // (message, tone, duration, category, metadata) => void
  clearNotifications, // () => void - Clear all notifications
  items,              // NotificationItem[] - Current notifications
  dismiss,            // (id) => void - Dismiss specific notification
  push                // (notification) => void - Push full notification object
} = useNotifications()
```

### Legacy Adapter (Backwards Compatibility)

```typescript
import { useLegacyNotificationAdapter } from '@/components/ui/live-notifications'

const pushNotification = useLegacyNotificationAdapter()

// Old API still works
pushNotification({ type: 'success', title: 'GM sent!', message: 'Transaction confirmed' })

// New shortcuts available
pushNotification.success('GM sent!')
pushNotification.error('Transaction failed')
pushNotification.info('Loading...')
pushNotification.warning('Low balance')
```

---

## Migration Guide

### From Old API to New API

#### Before (Old)
```typescript
pushNotification({ 
  type: 'success', 
  title: 'Quest completed!', 
  message: 'You earned 100 pts' 
})
```

#### After (New - Recommended)
```typescript
push({
  message: 'Quest completed! You earned 100 pts',
  tone: 'success',
  category: 'quest',
  metadata: { pointsEarned: 100 }
})
```

#### After (New - Shortcut)
```typescript
// For simple cases
showNotification('Quest completed!', 'success', 3000, 'quest')
```

### Migrating from Toast Libraries

#### Before (React Hot Toast)
```typescript
import toast from 'react-hot-toast'

toast.success('Success!')
toast.error('Error!')
```

#### After
```typescript
import { useNotifications } from '@/components/ui/live-notifications'

const { showNotification } = useNotifications()

showNotification('Success!', 'success')
showNotification('Error!', 'error')
```

---

## Best Practices

### 1. Choose the Right Type
- **success** → Completed actions
- **error** → Failed operations
- **warning** → Cautions (rarely user-facing)
- **info** → General updates
- **achievement** → Milestones (use sparingly - has pulse animation)
- **reward** → Rewards, gifts (use sparingly - has bounce animation)

### 2. Rich Text Guidelines
- Let auto-parsing handle @usernames and points
- Use manual richText only for complex formatting
- Keep messages concise (< 100 characters)

### 3. Categories for Analytics
Always provide a category for tracking:
```typescript
showNotification('GM sent!', 'success', 3000, 'gm') // ← category
```

### 4. Actor Information
Include actor data for social events:
```typescript
push({
  message: '@alice tipped you',
  actor: { name: 'alice', avatar: '...' }, // ← Shows avatar
  category: 'tip'
})
```

### 5. Error Dialogs vs Notifications
- **Use notifications:** Event updates, confirmations, social activity
- **Use dialogs:** User errors, confirmations, blocking actions

---

## Examples Library

### GM Button Success
```typescript
showNotification('GM sent successfully!', 'success', 3000, 'gm')
```

### Quest Progress
```typescript
push({
  message: 'Quest 2/5 completed! Keep going 💪',
  tone: 'info',
  category: 'quest',
  duration: 4000
})
```

### Badge Eligibility
```typescript
push({
  message: "You're eligible for legendary badge mint! 🏆",
  tone: 'achievement', // Pulse animation
  category: 'badge',
  duration: 7000
})
```

### Level Up
```typescript
push({
  message: 'Level up! You reached level 10 🎉',
  tone: 'reward', // Bounce animation
  category: 'level',
  duration: 5000
})
```

### Tip Received
```typescript
push({
  message: '@alice has tipped you 500 pts on Farcaster 💎',
  tone: 'success',
  category: 'tip',
  actor: {
    name: 'alice',
    avatar: 'https://...',
    fid: 12345
  },
  metadata: {
    amount: 500,
    source: 'farcaster'
  },
  duration: 6000
})
```

### Form Validation Error
```typescript
<ErrorDialog
  isOpen={showError}
  onClose={() => setShowError(false)}
  title="Invalid Email"
  message="Please enter a valid email address (e.g., user@example.com)"
  type="error"
  primaryAction={{
    label: "OK",
    onClick: () => {
      setShowError(false)
      emailInputRef.current?.focus()
    }
  }}
/>
```

---

## CSS Animations Reference

### Notification Animations
```css
/* Entrance (all types) */
animate-in slide-in-from-right-5 fade-in

/* Achievement pulse (looping) */
@keyframes notification-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 10px 25px -12px rgba(139, 92, 246, 0.3); }
  50% { transform: scale(1.02); box-shadow: 0 15px 35px -12px rgba(139, 92, 246, 0.5); }
}

/* Reward bounce (one-time) */
@keyframes notification-bounce {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-8px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-4px); }
}

/* Exit animation */
@keyframes notification-slide-out {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(400px); opacity: 0; }
}
```

---

## Troubleshooting

### Notifications Not Showing
1. Verify `NotificationProvider` wraps your app:
```typescript
// app/providers.tsx
<NotificationProvider>
  {children}
</NotificationProvider>
```

2. Check z-index conflicts (notifications use `z-50`)

### Rich Text Not Formatting
- Ensure message includes @username or "pts" keywords
- Check emoji is in supported list: 🎉🏆🎁💰✨🔥⚡️🌟💎🎊🎈
- Use `richText` prop for manual control

### Animations Not Working
- Verify globals.css includes notification animations
- Check for CSS conflicts overriding animations

### Dialog Not Opening
- Ensure `isOpen` state is managed correctly
- Check for conflicting modals (Headlessui Dialog)

---

## API Changelog

### V2.0 (November 30, 2025)
- ✅ Added rich text formatting support
- ✅ Enhanced animations (pulse, bounce, exit)
- ✅ Created ErrorDialog component
- ✅ Auto-parsing of @usernames, points, emojis
- ✅ Improved stacking behavior
- ✅ Added metadata support
- ✅ History persistence

### V1.0 (Initial)
- Basic notification system
- 6 types, 9 categories
- Actor support
- Auto-dismiss

---

## Support

**Documentation:** See `PHASE-1-COMPLETE.md` for system architecture  
**Examples:** See `NOTIFICATION-REFACTOR-AUDIT.md` for implementation details  
**Issues:** Report in project repository

**Maintained by:** Gmeowbased Team  
**License:** MIT
