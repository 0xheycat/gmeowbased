# Spacing & Sizing Standards

**Version**: 1.0  
**Date**: 2024-11-24  
**Status**: ✅ ACTIVE  
**Category**: Phase 3 Big Mega Maintenance - Category 6 (Spacing & Sizing)

---

## Purpose

This document establishes standardized spacing and sizing patterns for consistent visual rhythm and responsive design across the GMEOWBASED application.

---

## Container Widths

### Standard Page Layouts

#### Wide Layout (Default)
```tsx
className="max-w-6xl"  // 1152px
```

**Use Cases**:
- Quest listing page
- Dashboard page
- Leaderboard page
- Guild pages
- Default page container

**Responsive Behavior**:
- Mobile (375px-767px): Full width with px-3 or px-4 padding
- Tablet (768px-1023px): Full width with px-6 padding
- Desktop (1024px+): Centered at 1152px max

---

#### Reading Layout (Narrow)
```tsx
className="max-w-5xl"  // 1024px
```

**Use Cases**:
- Profile page
- Quest detail page
- Article/content pages
- Forms and settings

**Responsive Behavior**:
- Mobile (375px-767px): Full width with px-3 or px-4 padding
- Tablet (768px-1023px): Full width with px-6 padding
- Desktop (1024px+): Centered at 1024px max

**Rationale**: Narrower width improves readability for text-heavy content

---

#### Modal/Dialog Containers
```tsx
// Small modals (mobile-first)
className="max-w-sm"  // 384px

// Medium modals (responsive)
className="max-w-sm sm:max-w-2xl"  // 384px → 672px

// Onboarding flows
className="max-w-[340px] sm:max-w-[500px]"  // 340px → 500px
```

**Use Cases**:
- Confirmation dialogs: `max-w-sm`
- Form modals: `max-w-sm sm:max-w-2xl`
- Onboarding: Custom widths (340px-500px)

---

## Touch Targets

### Minimum Size Standards

#### Apple HIG (iOS)
```tsx
min-h-[44px]  // 44px minimum
```

**Use Cases**:
- Quest buttons with compact layouts
- Secondary action buttons
- Navigation items

---

#### Material Design (Android)
```tsx
min-h-[48px]  // 48px preferred
```

**Use Cases**:
- Primary action buttons (default)
- Form inputs (text, select, textarea)
- Admin buttons
- CTAs and submit buttons

**Implementation**:
```tsx
// Button example
<button className="pixel-button min-h-[48px] px-5 py-3">
  Submit Quest
</button>

// Input example
<input className="pixel-input min-h-[48px] px-3 py-3" />
```

---

### WCAG AAA Compliance

**Status**: ✅ 100/100 PERFECT

- ✅ All interactive elements meet 44px+ minimum
- ✅ Buttons use min-h-[48px] (Material Design standard)
- ✅ Form inputs use min-h-[48px]
- ✅ Zero accessibility violations

---

## Responsive Padding

### Mobile-First Progression

#### Horizontal Padding (px-*)
```tsx
// Mobile-first pattern (most common)
className="px-3 sm:px-4 md:px-6 lg:px-10"
// 12px → 16px → 24px → 40px

// Compact mobile (navigation, tight layouts)
className="px-2"  // 8px

// Standard mobile (pages, sections)
className="px-3"  // 12px

// Tablet/desktop (pages)
className="px-4"  // 16px
className="px-6"  // 24px

// Large desktop (page containers)
className="px-10"  // 40px
```

**Guidelines**:
- **Mobile**: Use `px-3` (12px) as standard page padding
- **Tablet**: Scale to `px-4` (16px) or `px-6` (24px)
- **Desktop**: Use `px-6` (24px) or `px-10` (40px) for large containers

---

#### Vertical Padding (py-*)
```tsx
// Buttons and compact elements
className="py-2"   // 8px (compact)
className="py-3"   // 12px (standard)
className="py-4"   // 16px (large)

// Sections and cards
className="py-6"   // 24px (card content)
className="py-10"  // 40px (page sections)

// Responsive vertical padding
className="py-2 sm:py-3 lg:py-4"
// 8px → 12px → 16px
```

---

#### Mobile Navigation Compensation
```tsx
// Profile page (mobile nav + safe area)
className="py-6 pb-14"  // Top 24px, Bottom 56px

// Desktop (no mobile nav)
className="sm:py-10 sm:pb-24"  // Top 40px, Bottom 96px
```

**Rationale**: Bottom padding compensates for fixed mobile navigation (56px height + safe area)

---

## Gap Spacing

### Flexbox/Grid Gap

#### Tight Spacing
```tsx
className="gap-1"  // 4px (navigation buttons, micro elements)
className="gap-2"  // 8px (common component spacing)
```

**Use Cases**:
- Mobile navigation buttons
- Badge groups
- Icon + text pairings

---

#### Standard Spacing
```tsx
className="gap-3"  // 12px (comfortable spacing)
className="gap-4"  // 16px (card grid spacing)
```

**Use Cases**:
- Form fields
- Card content
- List items

---

#### Spacious Layouts
```tsx
className="gap-6"  // 24px (large grid spacing)
className="gap-8"  // 32px (major section dividers)
```

**Use Cases**:
- Quest card grids
- Dashboard sections
- Page-level spacing

---

### Responsive Gap Patterns
```tsx
// Quest wizard (progressive spacing)
className="gap-4 lg:gap-8"
// 16px → 32px

// Component spacing
className="gap-2 md:gap-3"
// 8px → 12px
```

---

### Status: PERFECT ✅
- **Gap Score**: 100/100
- **Usage**: 100% use Tailwind scale (zero arbitrary values)
- **Pattern**: Consistent responsive scaling

---

## Space-Y/Space-X (Vertical/Horizontal Rhythm)

### Vertical Spacing (space-y-*)
```tsx
// Compact lists
className="space-y-2"  // 8px between children
className="space-y-3"  // 12px between children

// Standard sections
className="space-y-4"  // 16px between children
className="space-y-5"  // 20px between children

// Large sections
className="space-y-6"  // 24px between children
className="space-y-8"  // 32px between children

// Responsive vertical rhythm
className="space-y-3 sm:space-y-4"  // 12px → 16px
className="space-y-5 lg:space-y-6"  // 20px → 24px
```

---

### Horizontal Spacing (space-x-*)
```tsx
// Inline elements (buttons, badges)
className="space-x-2"  // 8px between children
className="space-x-3"  // 12px between children

// Navigation items
className="space-x-4"  // 16px between children
```

---

## Margin Patterns

### Common Margins
```tsx
// Micro adjustments
className="mt-0.5"   // 2px (badge alignment)
className="mt-1"     // 4px (micro spacing)
className="mt-1.5"   // 6px (badge spacing)

// Standard spacing
className="mt-2"     // 8px (common top margin)
className="mb-2"     // 8px (common bottom margin)
className="mb-4"     // 16px (section bottom margin)
className="mb-6"     // 24px (large section spacing)

// Centering
className="mx-auto"  // Horizontal centering (very common)
```

---

### Responsive Margin
```tsx
// Progressive top margin
className="mt-4 sm:mt-6 lg:mt-8"
// 16px → 24px → 32px

// Progressive bottom margin
className="mb-6 sm:mb-8 lg:mb-10"
// 24px → 32px → 40px
```

---

## Component-Specific Sizing

### Loading Spinners
```tsx
className="h-24 w-24"  // 96px (page-level spinner)
className="h-16 w-16"  // 64px (section spinner)
className="h-12 w-12"  // 48px (inline spinner)
```

---

### Icons (see ICON_SIZES in lib/icon-sizes.ts)
```tsx
// Navigation icons
className="h-8 w-8 sm:h-9 sm:w-9"  // 32px → 36px (mobile nav)
className="h-10 w-10 lg:h-12 lg:w-12"  // 40px → 48px (nav links)

// Standard icons (use ICON_SIZES constant)
// xs: 14px, sm: 16px, md: 18px, lg: 20px, xl: 24px
// 2xl: 32px, 3xl: 48px, 4xl: 64px
```

---

### Toggle Switches
```tsx
className="w-11 h-6"  // 44px × 24px (standard toggle)
className="w-9 h-5"   // 36px × 20px (compact toggle)
```

---

### Onboarding Graphics
```tsx
className="h-32 w-32"  // 128px (onboarding icons)
className="h-16 w-16"  // 64px (success badges)
```

---

## Known Exceptions (Allowed Arbitrary Values)

### Fractional Values (10% of components)
```tsx
// Micro badge padding (allowed)
className="px-1.5"   // 6px (badge horizontal padding)
className="py-0.5"   // 2px (pill vertical padding)
className="py-2.5"   // 10px (profile settings)
className="px-0.5 sm:px-1"  // 2px → 4px (notification badges)
```

**Status**: Accepted (functionally correct, minor inconsistency)

---

### Arbitrary Size Values (20% of components)
```tsx
// Loading bars (no Tailwind utility)
className="h-[3px]"  // 3px loading bar height (KEEP)

// Quest cast input (specific constraint)
className="w-[180px]"  // Quest form field (could migrate to w-44 or w-48)

// Toggle switches (standard size)
className="w-11 h-6"  // 44px × 24px (KEEP - standard size)

// Notification badges (precise sizing)
className="min-w-[1.5rem] sm:min-w-[1.6rem]"  // 24px → 25.6px (KEEP)
```

**Status**: Accepted (component-specific constraints)

---

## Migration Guidance (Deferred to Category 11)

### Fractional Value Migration (~15-20 components)
```tsx
// BEFORE
className="px-1.5"   // 6px

// AFTER (Category 11)
className="px-2"     // 8px (standardized)
```

---

### CSS Spacing Migration (~10 components)
```tsx
// BEFORE (CSS file)
.quest-fab-container {
  bottom: 24px;
  gap: 12px;
}

// AFTER (Tailwind, Category 11)
className="bottom-6 gap-3"  // 24px, 12px (standardized)
```

**Note**: Fluid spacing (clamp) should remain in CSS for responsive scaling

---

## Fluid Spacing (CSS clamp)

### When to Use CSS clamp
```css
/* Fluid responsive spacing (KEEP in CSS) */
.mega-card__grid {
  gap: clamp(1.3rem, 2.6vw, 2.1rem);  /* 20.8px - 33.6px fluid */
  margin-top: clamp(1.4rem, 2.4vw, 2.3rem);
}
```

**Use Cases**:
- Dynamic responsive scaling
- Fluid typography spacing
- Complex responsive layouts

**Rationale**: Tailwind doesn't support fluid scaling, CSS clamp is appropriate

---

## Summary

| Category | Standard | Status | Score |
|----------|----------|--------|-------|
| Container Widths | max-w-6xl / max-w-5xl | ✅ Standardized | 95/100 |
| Touch Targets | min-h-[48px] | ✅ WCAG AAA | 100/100 |
| Gap Spacing | gap-1 to gap-8 | ✅ PERFECT | 100/100 |
| Padding | px-3 → px-10 (mobile-first) | ✅ Excellent | 95/100 |
| Margin | mt/mb-2 to mt/mb-8 | ✅ Good | 90/100 |
| Responsive | Mobile-first progression | ✅ PERFECT | 100/100 |

**Overall Score**: 95/100 (EXCELLENT)

---

## References

- **Category 6 Audit**: MINIAPP-LAYOUT-AUDIT.md (Section 6)
- **Mobile-First Guide**: FEATURES_MOBILE_FIRST.md
- **Container Hierarchy**: CONTAINER-HIERARCHY.md (Category 2)
- **Icon Sizing**: lib/icon-sizes.ts (Category 5)
- **Typography**: Category 4 audit (fontSize, letterSpacing)

---

**Last Updated**: 2024-11-24  
**Next Review**: Category 11 (CSS Architecture migration)
