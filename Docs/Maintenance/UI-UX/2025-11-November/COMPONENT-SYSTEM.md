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
