# Component System Guidelines

**Last Updated**: 2024-11-24  
**Maintainer**: GitHub Copilot (Claude Sonnet 4.5)  
**Category**: UI/UX Component Architecture  
**Status**: Phase 3 Category 7 Documentation

---

## Overview

Gmeowbased maintains **two component systems** that coexist intentionally:

1. **React Components** (`components/ui/`): Modern design system with TypeScript props, variants, and advanced features
2. **CSS Classes** (`app/globals.css`, `app/styles.css`): Pixel art aesthetic with glass morphism effects

This document provides guidelines for when to use each system and why both exist.

---

## Button System

### React `<Button>` Component

**Location**: `components/ui/button.tsx`  
**Usage Count**: ~40+ components

#### When to Use:
- ✅ Dynamic variants needed (colors, sizes, shapes)
- ✅ Loading states required (spinner animation)
- ✅ Drip animation desired (ripple effect)
- ✅ TypeScript props needed (type safety)
- ✅ Modern glass morphism aesthetic
- ✅ Accessibility features (focus-visible, ARIA)

#### Features:
- **7 Colors**: primary, white, gray, success, info, warning, danger
- **4 Sizes**: large (56-64px), medium (48-52px), small (40px), mini (32px)*
- **3 Shapes**: rounded, pill, circle
- **3 Variants**: solid, ghost, transparent
- **Total Combinations**: 252 variants (7 × 4 × 3 × 3)

**\*Mini size note**: 32px is below Apple HIG touch target (44px). Use only for desktop-only, non-primary actions (tags, badges, compact UI).

#### Example:
```tsx
import { Button } from '@/components/ui/button'

<Button
  color="primary"
  size="large"
  shape="rounded"
  variant="solid"
  isLoading={isSubmitting}
  onClick={handleSubmit}
>
  Submit GM
</Button>
```

---

### CSS `.pixel-button` Class

**Location**: `app/styles.css`  
**Usage Count**: ~40+ components

#### When to Use:
- ✅ Pixel art aesthetic required (retro game feel)
- ✅ Simple static buttons (no dynamic states)
- ✅ Legacy page compatibility (existing pixel UI)
- ✅ Consistent with surrounding pixel elements

#### Features:
- **1 Style**: Pixel art borders, hover/active transforms
- **Animation**: translateY(-1px) on hover, translateY(1px) on active
- **Customization**: Via inline styles or additional classes

#### Example:
```tsx
<button className="pixel-button" onClick={handleClick}>
  Click Me
</button>
```

---

## Input System

### React `<Input>` Component

**Location**: `components/ui/button.tsx` (line 408+)  
**Usage Count**: ~10+ components

#### When to Use:
- ✅ Form validation required (React Hook Form, Zod)
- ✅ Size variants needed (sm, md, lg)
- ✅ TypeScript props needed (type, disabled, onChange)
- ✅ Modern glass morphism aesthetic
- ✅ Focus states with emerald ring

#### Features:
- **3 Sizes**: sm (36px), md (40px), lg (44px)
- **Focus States**: Emerald-200/70 ring + border change
- **Disabled States**: Opacity 50%, cursor-not-allowed
- **Placeholder**: 40% opacity, white/40

#### Example:
```tsx
import { Input } from '@/components/ui/button'

<Input
  size="md"
  type="email"
  placeholder="Enter your email"
  disabled={isLoading}
  aria-invalid={errors.email ? 'true' : 'false'}
  {...register('email')}
/>
```

---

### CSS `.pixel-input` Class

**Location**: `app/globals.css` (lines 994-1046)  
**Usage Count**: ~30+ components

#### When to Use:
- ✅ Glass morphism aesthetic required (heavy blur + saturation)
- ✅ Error state styling needed (`aria-invalid="true"`)
- ✅ Legacy form compatibility (existing pixel UI)
- ✅ Consistent with surrounding pixel elements

#### Features:
- **Glass Effect**: Backdrop-filter blur(12px) + saturate(150%)
- **Focus States**: Sky blue ring + glow (0 0 20px rgba)
- **Error States**: Red border when `[aria-invalid="true"]`
- **Hover States**: Border brightens on hover

#### Example:
```tsx
<input
  className="pixel-input"
  type="text"
  placeholder="Enter username"
  aria-invalid={hasError ? 'true' : 'false'}
/>
```

---

## Card System

### React `<Card>` Component

**Location**: `components/ui/button.tsx` (line 301+)  
**Usage Count**: ~20+ components

#### When to Use:
- ✅ Semantic tones needed (accent, danger, info)
- ✅ Interactive hover effects desired (lift + shadow)
- ✅ Subcomponents needed (CardTitle, CardSection, CardFooter)
- ✅ TypeScript props needed (tone, padding, interactive)
- ✅ Modern glass morphism aesthetic

#### Features:
- **6 Tones**: neutral, frosted (default), accent, muted, danger, info
- **5 Padding Levels**: none, xs (12-14px), sm (16-20px, default), md (20-24px), lg (24-32px)
- **Interactive Mode**: Hover lift (-1px) + shadow enhancement
- **Subcomponents**: CardSection, CardTitle, CardDescription, CardFooter
- **Radix UI Support**: `asChild` prop for composition

#### Example:
```tsx
import { Card, CardTitle, CardDescription, CardFooter } from '@/components/ui/button'

<Card tone="accent" padding="md" interactive>
  <CardTitle>Quest Complete!</CardTitle>
  <CardDescription>You earned 50 XP</CardDescription>
  <CardFooter>
    <Button color="success">Claim Reward</Button>
  </CardFooter>
</Card>
```

---

### CSS `.pixel-card` Class

**Location**: `app/styles.css` (line 173)  
**Usage Count**: ~50+ components

#### When to Use:
- ✅ Pixel art aesthetic required (retro game feel)
- ✅ Heavy glass morphism desired (blur + glow gradient)
- ✅ Legacy layout compatibility (existing pixel UI)
- ✅ Consistent with surrounding pixel elements

#### Features:
- **Glass Effect**: Backdrop-filter blur(20px) + dark glass background
- **Glow Gradient**: Subtle cyan glow overlay (::after pseudo-element)
- **Deep Shadows**: 0 24px 80px rgba (dramatic depth)
- **Padding**: Fixed 2rem (32px)

#### Example:
```tsx
<div className="pixel-card">
  <h2 className="pixel-section-title">Leaderboard</h2>
  <p>Top 10 GMs this week</p>
</div>
```

---

## Form Controls (CSS-Based)

### `.pixel-textarea` Class

**Location**: `app/globals.css`  
**Usage Count**: ~10 components

#### Features:
- Same styles as `.pixel-input`
- **Minimum Height**: 80px (usability)
- **Resize**: Vertical only (`resize: vertical`)

#### Example:
```tsx
<textarea
  className="pixel-textarea"
  placeholder="Enter your message..."
  rows={4}
/>
```

---

### `.pixel-select` Class

**Location**: `app/globals.css`  
**Usage Count**: ~5 components

#### Features:
- Same styles as `.pixel-input`
- **Appearance**: None (removes native dropdown arrow)
- **Cursor**: Pointer

#### Example:
```tsx
<select className="pixel-select">
  <option value="base">Base</option>
  <option value="ethereum">Ethereum</option>
</select>
```

---

## Touch Target Guidelines

Per **Apple Human Interface Guidelines** and **Material Design**:

### Standards:
- **Minimum**: 44px × 44px (Apple HIG)
- **Preferred**: 48px × 48px (Material Design)
- **Exception**: Button mini (32px × 32px)

### Button Size Compliance:

| Size | Height (Mobile) | Height (Desktop) | Touch Target | Usage |
|------|----------------|------------------|--------------|-------|
| Large | 56px | 64px | ✅ PASS (44px+) | Primary actions |
| Medium | 48px | 52px | ✅ PASS (44px+) | Secondary actions |
| Small | 40px | 40px | ⚠️ BORDERLINE | Tertiary actions |
| Mini | 32px | 32px | ❌ FAIL (below 44px) | Desktop-only, non-primary |

### Mini Size Guidelines:
- ✅ **Use for**: Tags, badges, compact UI elements, desktop-only actions
- ❌ **Avoid for**: Primary actions, mobile touch targets, critical buttons
- ⚠️ **Context**: Desktop hover/click only (not touch-optimized)

---

## Modal/Dialog System

### Best Practices (from GI-11 Modal Audit)

**Location**: Various components (ProgressXP.tsx example)  
**WCAG Status**: 100% AAA Compliant

#### Required ARIA:
```tsx
<div
  ref={dialogRef}
  tabIndex={-1}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  onKeyDown={handleKeyDown}  // Escape to close
>
```

#### Features:
- ✅ **Focus Trap**: Tab loop within modal
- ✅ **Keyboard Navigation**: Arrow keys, Tab, Escape
- ✅ **Focus Management**: Auto-focus first element, restore on close
- ✅ **Backdrop**: Click-to-close with overlay (bg-black/80 backdrop-blur-sm)
- ✅ **ARIA Roles**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

#### Common Dialog Pattern:
```tsx
{isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Backdrop */}
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
      onClick={onClose}
      aria-hidden="true"
    />
    
    {/* Dialog Content */}
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="relative z-10 max-w-md w-full"
    >
      <h2 id="dialog-title">Modal Title</h2>
      {/* Content */}
    </div>
  </div>
)}
```

---

## Other UI Primitives

### `<EmptyState>` Component

**Location**: `components/ui/button.tsx`

#### Features:
- Inherits Card tone system (6 variants)
- Optional icon (4xl size, 50% opacity)
- Title + description + action slot
- Centered layout with gap-3

#### Example:
```tsx
import { EmptyState } from '@/components/ui/button'

<EmptyState
  tone="muted"
  icon="📭"
  title="No GMs yet"
  description="Be the first to say GM today!"
  action={<Button color="primary">Say GM</Button>}
/>
```

---

### `<Loader>` Component

**Location**: `components/ui/loader.tsx`

#### Features:
- **3 Sizes**: small (14px), normal (18px), large (24px)
- **4 Variants**: scaleUp, moveUp, moveUpSmall, blink
- **Inline/Block**: `tag="span"` or `tag="div"`

#### Example:
```tsx
import { Loader } from '@/components/ui/loader'

<Loader size="normal" variant="moveUp" tag="span" />
```

---

## Migration Guidelines

### When to Migrate from CSS to React:

✅ **Migrate if**:
- Component needs dynamic variants (colors, sizes)
- Loading/disabled states required
- TypeScript props would improve DX
- Form validation needed

❌ **Keep CSS if**:
- Pixel art aesthetic is intentional
- Legacy page with consistent pixel UI
- Simple static element (no dynamic behavior)
- High touch count with low benefit

---

## Decision Rationale (Why Dual Systems?)

### Historical Context:
1. **Original**: CSS-based pixel art aesthetic (`.pixel-button`, `.pixel-card`, `.pixel-input`)
2. **Evolution**: React components added for dynamic features, TypeScript safety
3. **Current**: Both coexist to support different visual styles and contexts

### Benefits of Dual System:
- ✅ **Flexibility**: Choose aesthetic based on context (pixel vs modern)
- ✅ **Backward Compatibility**: Legacy pages continue working
- ✅ **Progressive Enhancement**: New features use React, old pages stable
- ✅ **Visual Variety**: Pixel art for retro feel, modern glass for clean UI

### Drawbacks:
- ⚠️ **Maintenance**: Two systems to update
- ⚠️ **Consistency**: Developers unsure which to use
- ⚠️ **DX**: More decisions = cognitive load

### Future Plans (Category 11):
- **Option A**: Consolidate to React components only (120+ file migration)
- **Option B**: Add pixel tones to React components, keep CSS for legacy
- **Decision**: Deferred to Category 11 CSS Architecture (requires visual audit)

---

## Related Documentation

- **Category 7 Audit**: `MINIAPP-LAYOUT-AUDIT.md` (Component System section)
- **Spacing Standards**: `SPACING-STANDARDS.md` (Touch targets, padding, gaps)
- **Container Hierarchy**: `CONTAINER-HIERARCHY.md` (Layout widths, responsive)
- **Typography System**: `MINIAPP-LAYOUT-AUDIT.md` (Category 4 - Typography)

---

## Quick Reference

### Component Selection Matrix

| Need | React Component | CSS Class |
|------|----------------|-----------|
| Dynamic variants | ✅ Button | ❌ |
| Loading states | ✅ Button | ❌ |
| Form validation | ✅ Input | ❌ |
| Semantic tones | ✅ Card | ❌ |
| Interactive hover | ✅ Card | ❌ |
| TypeScript props | ✅ All | ❌ |
| Pixel aesthetic | ⚠️ (use CSS) | ✅ All |
| Heavy glass morphism | ⚠️ (use CSS) | ✅ Card, Input |
| Legacy compatibility | ⚠️ (use CSS) | ✅ All |
| Simple static UI | Either | ✅ Simpler |

### Touch Target Compliance

| Element | Minimum | Preferred | Exception |
|---------|---------|-----------|-----------|
| Primary Button | 44px | 48px | - |
| Secondary Button | 44px | 48px | - |
| Tertiary Button | 44px | 48px | - |
| Mini Button | ❌ 32px | - | Desktop-only |
| Input (lg) | 44px | 48px | ✅ Use this |
| Input (md) | 40px | 44px | ⚠️ Borderline |
| Input (sm) | ❌ 36px | - | Avoid mobile |

---

**Last Updated**: 2024-11-24  
**Next Review**: Category 11 CSS Architecture  
**Maintainer**: @Copilot

---

## Z-Index Scale (MCP Best Practice)

**Last Updated**: 2024-11-24 (Category 8: Modals/Dialogs/Popovers)  
**Status**: Recommended standard (migration to Category 11)

### Current State: Z-Index Chaos

**29 z-index values found** across 12 files:
- ⛔ **3 extreme outliers**: z-10000, z-9999 (×2)
- ⚠️ **5 high values**: z-2100, z-2000, z-1600, z-1000 (×2)
- ✅ **21 reasonable**: z-90 and below

### Standard Z-Index Scale

```css
:root {
  /* Background layers */
  --z-bg: -1;              /* Background patterns, overlays */
  --z-bg-overlay: -10;     /* Decorative background effects */
  
  /* Content layers */
  --z-content: 0;          /* Base page content */
  --z-elevated: 10;        /* Raised cards, sections */
  
  /* Navigation layers */
  --z-dropdown: 40;        /* Dropdown menus */
  --z-header: 45;          /* Page header */
  --z-mobile-nav: 48;      /* Bottom mobile navigation */
  
  /* Overlay layers */
  --z-modal-backdrop: 50;  /* Modal backdrop */
  --z-modal: 60;           /* Modal dialogs */
  --z-sheet: 65;           /* Bottom sheets */
  --z-toast: 70;           /* Toast notifications */
  --z-tooltip: 80;         /* Tooltips, popovers */
  
  /* Critical layers */
  --z-critical: 90;        /* Onboarding, full-screen loading */
  --z-dev-tools: 9999;     /* Dev-only (DO NOT USE in production) */
}
```

### Layering Hierarchy (Bottom to Top)

| Layer | Z-Index | Usage | Examples |
|-------|---------|-------|----------|
| **Background** | -10 to -1 | Decorative effects | Gradients, patterns |
| **Content** | 0 to 10 | Page content | Cards, sections |
| **Navigation** | 40 to 48 | Menus, headers | Dropdowns, nav bars |
| **Overlays** | 50 to 80 | Floating UI | Modals, toasts, tooltips |
| **Critical** | 90 | Full-screen | Onboarding, loading |
| **Dev Tools** | 9999 | Dev-only | Debug panels (never production) |

### Usage Guidelines

#### ✅ DO:
- **Use CSS variables**: `z-index: var(--z-modal);` instead of `z-index: 60;`
- **Follow hierarchy**: Content → Navigation → Overlays → Critical
- **Stay within range**: 0-90 for production UI (9999 dev-only)
- **Document exceptions**: If you must deviate, explain why

#### ⛔ AVOID:
- **z-index > 100**: Breaks layering expectations (except z-9999 for dev)
- **Arbitrary values**: z-1600, z-10000, z-2100 (chaos)
- **Escalation wars**: "Just use z-10001" to fix conflicts
- **Inline styles**: Use CSS variables or Tailwind classes

### Migration Guide (Category 11)

**Current Issues** (to be fixed in Category 11):

| Current | Status | Should Be | File |
|---------|--------|-----------|------|
| z-10000 | ⛔ EXTREME | z-90 (--z-critical) | app/providers.tsx |
| z-9999 (×2) | ⛔ EXTREME | z-90 (--z-critical) | OnboardingFlow, gacha-animation |
| z-2100, z-2000 | ⚠️ HIGH | z-80 (--z-tooltip) | live-notifications.tsx |
| z-1600 | ⚠️ HIGH | z-60 (--z-modal) | GuildTeamsPage.tsx |
| z-1000 (×2) | ⚠️ HIGH | z-70 (--z-toast), z-50 (--z-backdrop) | PixelToast, quest-fab |
| z-100 | ⚠️ HIGH | z-48 (--z-mobile-nav) | mobile-miniapp.css |

**Migration Steps**:
1. Create CSS variables in `app/globals.css` (--z-* scale)
2. Migrate extreme outliers first (z-9999, z-10000 → z-90)
3. Migrate high values (z-1000 to z-2100 → z-50 to z-80)
4. Migrate mobile nav (z-100 → z-48)
5. Visual regression testing (modal layering QA)

### Examples

#### ✅ GOOD (Using CSS Variables):
```css
/* app/globals.css */
.modal-backdrop {
  z-index: var(--z-modal-backdrop);  /* 50 */
}

.modal-content {
  z-index: var(--z-modal);  /* 60 */
}
```

#### ⚠️ NEEDS MIGRATION (Arbitrary Values):
```tsx
// BEFORE: Arbitrary z-index
<div className="fixed inset-0 z-[1600] ...">

// AFTER: Use CSS variable
<div className="fixed inset-0 z-[60] ...">  /* --z-modal */
```

---

## Modal Accessibility Pattern (WCAG AAA)

**Last Updated**: 2024-11-24 (Category 8: Modals/Dialogs/Popovers)  
**Status**: Required for all dialogs (5 modals need migration in Category 11)

### Current State: Mixed Accessibility

**8 modals audited**:
- ✅ **2 PERFECT**: ProgressXP (100/100), XPEventOverlay (100/100)
- ⚠️ **5 NEEDS ARIA**: GuildTeams, BadgeManager (×2), QuestWizard, OnboardingFlow
- ⚠️ **5 NEEDS FOCUS TRAP**: Same 5 modals

### Required ARIA Attributes

Every modal/dialog MUST have:

```tsx
<div
  ref={dialogRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title-id"
  aria-describedby="modal-description-id"  // Optional but recommended
  tabIndex={-1}
>
  <h2 id="modal-title-id">Modal Title</h2>
  <p id="modal-description-id">Description of what this modal does</p>
</div>
```

**Why each attribute matters**:
- **role="dialog"**: Identifies modal to screen readers (WCAG 4.1.2 Level A)
- **aria-modal="true"**: Restricts screen reader navigation to modal content
- **aria-labelledby**: Links modal to title element (screen reader reads title first)
- **aria-describedby**: Links to description (provides context)
- **tabIndex={-1}**: Allows programmatic focus (not keyboard focus)

### Focus Trap Implementation

**Use existing hook**: `components/quest-wizard/components/Accessibility.tsx`

```tsx
import { useFocusTrap } from '@/components/quest-wizard/components/Accessibility'

export function MyModal({ isOpen, onClose }: ModalProps) {
  const dialogRef = useFocusTrap(isOpen)
  
  return isOpen ? (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-modal-title"
    >
      <h2 id="my-modal-title">Modal Title</h2>
      {/* Modal content */}
    </div>
  ) : null
}
```

**What the hook does**:
1. **Saves previous focus**: `previousFocus.current = document.activeElement`
2. **Focuses first element**: Auto-focus button/input on modal open
3. **Traps Tab key**: Loops focus within modal (forward + backward)
4. **Restores focus**: Returns focus to trigger element on close

### Keyboard Navigation

**Required keyboard handlers**:

```tsx
useEffect(() => {
  if (!isOpen) return

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onClose])
```

**Keyboard requirements**:
- **Escape**: Close modal (WCAG 2.1.1 Keyboard Level A)
- **Tab**: Loop within modal (forward)
- **Shift+Tab**: Loop within modal (backward)
- **Enter/Space**: Activate focused button

### Backdrop Click-to-Close

**Safe implementation** (prevents accidental closes):

```tsx
const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
  // Only close if clicking backdrop itself, not modal content
  if (event.target === event.currentTarget) {
    onClose()
  }
}

return (
  <div
    className="fixed inset-0 bg-black/80"
    onMouseDown={handleBackdropMouseDown}
  >
    <div className="modal-content">
      {/* Modal content - clicks here won't trigger onClose */}
    </div>
  </div>
)
```

**Why onMouseDown instead of onClick**:
- Prevents click propagation from modal content
- User can press mouse inside modal, release outside → no close

### Complete Modal Example (ProgressXP Pattern)

**PERFECT 100/100 WCAG AAA implementation**:

```tsx
'use client'

import { useCallback, useEffect, useId, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ProgressXP({ open, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Backdrop click-to-close
  const handleBackdropMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose]
  )

  // Focus management + keyboard handlers
  useEffect(() => {
    if (!open) return

    const dialogNode = dialogRef.current
    if (!dialogNode) return

    // Focus first element
    const focusable = Array.from(
      dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    )
    if (focusable.length) {
      focusable[0].focus()
    } else {
      dialogNode.focus()
    }

    // Keyboard handlers
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      // Tab trap logic
      const focusable = Array.from(
        dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        (element) => !element.hasAttribute('aria-hidden')
      )

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else {
        // Tab
        if (document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      onMouseDown={handleBackdropMouseDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal content */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative max-w-md w-full"
      >
        <h2 id={titleId}>XP Earned!</h2>
        <p id={descriptionId}>You gained 50 XP from completing this quest.</p>
        
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
```

### Migration Checklist (Category 11)

**5 modals need ARIA + focus trap**:

- [ ] **GuildTeamsPage.tsx** (z-1600)
  - Add role="dialog", aria-modal="true"
  - Add useFocusTrap hook
  - Add Escape key handler
  - Reduce z-index to z-60 (--z-modal)

- [ ] **BadgeManagerPanel.tsx** (×2 modals, z-90)
  - Add role="dialog", aria-modal="true" (both modals)
  - Add useFocusTrap hook (both)
  - Add Escape key handler (both)
  - Z-index already good (90)

- [ ] **QuestWizardSheet (Mobile.tsx)** (z-40/z-50)
  - Add role="dialog", aria-modal="true"
  - Add useFocusTrap hook
  - Add Escape key handler
  - Z-index already good (40/50)

- [ ] **OnboardingFlow.tsx** (z-9999)
  - Already has role="dialog", aria-modal="true" ✅
  - Add useFocusTrap hook (missing)
  - Reduce z-index to z-90 (--z-critical)

### Testing Checklist

After migration, test each modal:

**Keyboard Navigation**:
- [ ] Press Tab → Focus loops within modal
- [ ] Press Shift+Tab → Focus loops backward
- [ ] Press Escape → Modal closes
- [ ] Focus returns to trigger element after close

**Screen Reader** (NVDA/JAWS/VoiceOver):
- [ ] Modal announced as "dialog"
- [ ] Title read first (aria-labelledby)
- [ ] Description read (aria-describedby)
- [ ] Navigation restricted to modal (aria-modal)

**Mouse/Touch**:
- [ ] Click backdrop → Modal closes
- [ ] Click modal content → Modal stays open
- [ ] All buttons clickable

---

**Last Updated**: 2024-11-24  
**Next Migration**: Category 11 CSS Architecture  
**Maintainer**: @Copilot
