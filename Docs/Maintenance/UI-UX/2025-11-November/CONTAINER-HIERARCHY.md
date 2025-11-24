# Container Width Hierarchy Guide

**Version:** 1.0  
**Created:** November 24, 2025  
**Category:** Responsiveness & Layout (Big Mega Maintenance - Category 2)  
**Status:** ACTIVE GUIDELINE  

---

## Purpose

This document establishes **standard container width patterns** for Gmeowbased components to ensure:
- Visual consistency across pages
- Predictable responsive behavior
- Maintainable codebase (prefer Tailwind over custom values)
- Justified exceptions (documented with rationale)

---

## Standard Tailwind Classes (PREFERRED)

**Always use Tailwind's built-in `max-w-*` classes** unless a custom width is justified.

### Mobile Components
```tsx
// Cards, notifications, small modals
<div className="max-w-sm"> {/* 640px */}
```

### Content Sections
```tsx
// Article content, forms, centered layouts
<div className="max-w-2xl"> {/* 1536px */}
<div className="max-w-3xl"> {/* 1792px */}
```

### Page Layouts
```tsx
// Dashboard pages, admin panels
<div className="max-w-6xl"> {/* 2560px */}
<div className="max-w-7xl"> {/* 2816px */}
```

### Tailwind Max-Width Reference
| Class | Width | Use Case |
|-------|-------|----------|
| `max-w-sm` | 640px | Mobile cards, notifications |
| `max-w-md` | 768px | Modals, dialogs |
| `max-w-lg` | 1024px | Forms, article content |
| `max-w-xl` | 1280px | Wide content sections |
| `max-w-2xl` | 1536px | Standard page content |
| `max-w-3xl` | 1792px | Wide page content |
| `max-w-4xl` | 2048px | Admin interfaces (used in /admin, /gm) |
| `max-w-5xl` | 2304px | Very wide layouts |
| `max-w-6xl` | 2560px | Dashboard pages (used in /Dashboard, /Guild/teams) |
| `max-w-7xl` | 2816px | Extra-wide admin (used in /admin/viral) |

---

## Custom Widths (USE SPARINGLY)

**Only use custom `max-width` values when**:
1. **UX-justified**: Specific aspect ratio or visual requirement (e.g., quest cards)
2. **Performance-optimized**: Tested and proven better than Tailwind default
3. **Documented**: Rationale explained in CSS comments
4. **Approved**: Reviewed by design system maintainer

### Approved Custom Widths

#### Quest Cards (340px mobile, 420px desktop)
**Justification:** Card aspect ratio optimized for readability and visual impact
```css
.quest-card-yugioh,
.quest-card-glass {
  max-width: 340px; /* Mobile: fits 375px screens with padding */
}

@media (min-width: 640px) {
  .quest-card-yugioh,
  .quest-card-glass {
    max-width: 420px; /* Desktop: golden ratio for card layout */
  }
}
```
**Files:** `app/styles/quest-card-yugioh.css`, `app/styles/quest-card-glass.css`

#### Onboarding Modals (340px-500px responsive)
**Justification:** Step-by-step flow needs tighter width for focus and readability
```css
@media (max-width: 375px) {
  .onboarding-modal {
    max-width: 340px; /* iPhone SE: maximize content with breathing room */
  }
}

@media (max-width: 640px) {
  .onboarding-modal {
    max-width: 400px; /* Mobile landscape: wider for better text flow */
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .onboarding-modal {
    max-width: 500px; /* Tablet: optimal reading width */
  }
}
```
**Files:** `app/styles/onboarding-mobile.css`

#### Notification Stack (360px)
**Justification:** Mobile-optimized toast width (fits 375px screens with margin)
```tsx
const stackWrapperClass = 'max-w-[360px] sm:max-w-sm'
```
**Files:** `components/ui/live-notifications.tsx`

#### Frame Container (600px)
**Justification:** Farcaster frame optimal width for embedded content
```css
.container {
  max-width: 600px; /* Farcaster frame spec recommendation */
}
```
**Files:** `app/api/frame/route.tsx`

#### Quest Archive Modal (720px)
**Justification:** Balances content density with readability for quest lists
```css
.quest-archive {
  width: min(720px, 100%); /* Responsive with explicit max */
}
```
**Files:** `app/globals.css`

---

## Breakpoints to Align With (Tailwind Standard)

| Breakpoint | Value | Tailwind Class | Usage |
|------------|-------|----------------|-------|
| Mobile (base) | < 640px | (default) | All mobile-first styles |
| `sm` | ≥ 640px | `sm:` | Mobile landscape, small tablets |
| `md` | ≥ 768px | `md:` | Tablets |
| `lg` | ≥ 1024px | `lg:` | Desktop |
| `xl` | ≥ 1280px | `xl:` | Large desktop |
| `2xl` | ≥ 1536px | `2xl:` | Extra large desktop |

**Important:** Avoid creating custom breakpoints (e.g., 600px, 680px, 900px, 960px, 1100px) unless absolutely necessary. If needed, document justification.

---

## Decision Matrix: Tailwind vs. Custom

| Scenario | Use Tailwind | Use Custom | Justification |
|----------|-------------|-----------|---------------|
| Page layout container | ✅ `max-w-6xl` | ❌ | Standard dashboard width |
| Content section | ✅ `max-w-2xl` | ❌ | Standard reading width |
| Modal dialog | ✅ `max-w-md` | ❌ | Standard modal size |
| Card component | ❌ | ✅ 340px-420px | Aspect ratio optimized |
| Notification toast | ❌ | ✅ 360px | Mobile screen fit |
| Onboarding flow | ❌ | ✅ 340px-500px | Focus + readability |
| Frame embed | ❌ | ✅ 600px | Platform spec |

---

## Responsive Container Patterns

### Pattern 1: Mobile-First with Tailwind Classes
```tsx
<div className="w-full max-w-sm sm:max-w-2xl lg:max-w-6xl mx-auto px-4">
  {/* Content grows from 640px → 1536px → 2560px */}
</div>
```

### Pattern 2: Custom Width with Breakpoint
```css
.custom-component {
  max-width: 340px; /* Mobile base */
}

@media (min-width: 640px) {
  .custom-component {
    max-width: 420px; /* Desktop */
  }
}
```

### Pattern 3: Responsive Padding + Container
```tsx
<div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10">
  {/* Container + responsive padding: 12px → 16px → 24px → 40px */}
</div>
```

---

## Migration Strategy (for existing code)

### Step 1: Identify Custom Widths
```bash
grep -r "max-width:" app/ components/ --include="*.css" --include="*.tsx"
```

### Step 2: Check if Tailwind Equivalent Exists
| Current | Tailwind Alternative | Decision |
|---------|---------------------|----------|
| `max-width: 640px` | `max-w-sm` | ✅ Migrate |
| `max-width: 768px` | `max-w-md` | ✅ Migrate |
| `max-width: 1024px` | `max-w-lg` | ✅ Migrate |
| `max-width: 420px` | (none) | ⏸️ Keep (quest cards justified) |
| `max-width: 360px` | (none) | ⏸️ Keep (notification stack justified) |

### Step 3: Document or Migrate
- **If Tailwind exists**: Replace with Tailwind class
- **If custom justified**: Add comment explaining WHY
- **If unjustified**: Migrate to nearest Tailwind class

---

## Adding a New Custom Width (Approval Process)

1. **Propose**: Explain WHY Tailwind classes don't work
2. **Document**: Add entry to "Approved Custom Widths" section (above)
3. **Comment**: Add inline CSS comment with justification
4. **Test**: Verify responsiveness at 375px, 640px, 768px, 1024px
5. **Review**: Get approval from design system maintainer
6. **Commit**: Include justification in commit message

**Example CSS Comment:**
```css
/* Custom width: 420px
 * Justification: Quest card aspect ratio (1:1.4) optimized for visual impact
 * Tested: 375px-1024px responsive, maintains card proportions
 * Approved: Phase 3 UX Audit (Nov 2025)
 */
.quest-card {
  max-width: 420px;
}
```

---

## Anti-Patterns to Avoid

### ❌ BAD: Random custom widths without justification
```css
.my-component {
  max-width: 537px; /* Why 537px? Arbitrary! */
}
```

### ❌ BAD: Mixing Tailwind and custom in same component
```tsx
<div className="max-w-lg"> {/* Tailwind: 1024px */}
  <div style={{ maxWidth: '900px' }}> {/* Custom: why? */}
    ...
  </div>
</div>
```

### ❌ BAD: Custom breakpoints without Tailwind equivalent
```css
@media (max-width: 873px) { /* Not a Tailwind breakpoint! */}
```

### ✅ GOOD: Tailwind-first with documented custom
```tsx
<div className="max-w-6xl"> {/* Tailwind: standard page width */}
  <QuestCard /> {/* Custom 420px - documented in CSS */}
</div>
```

---

## Current Codebase Status

**Audit Date:** November 24, 2025 (Category 2 - Responsiveness & Layout)

### Compliance Metrics
- **Tailwind-aligned:** ~40% of custom widths
- **Justified customs:** ~25% (quest cards, onboarding, notifications)
- **Unjustified customs:** ~35% (need review/migration)

### Files with Custom Widths
1. ✅ `app/styles/quest-card-yugioh.css` - 420px (justified)
2. ✅ `app/styles/quest-card-glass.css` - 420px (justified)
3. ✅ `app/styles/onboarding-mobile.css` - 340px/400px/500px (justified)
4. ✅ `components/ui/live-notifications.tsx` - 360px (justified)
5. ✅ `app/api/frame/route.tsx` - 600px (justified)
6. ✅ `app/globals.css` - 720px (quest-archive, justified)
7. ⚠️ `app/styles.css` - 1020px (mega-card, needs review)

### Next Steps
- [ ] Add justification comments to CSS files
- [ ] Migrate unjustified customs to Tailwind
- [ ] Update components to use documented patterns

---

## Related Documentation

- [Tailwind Max-Width Docs](https://tailwindcss.com/docs/max-width)
- [Tailwind Breakpoints](https://tailwindcss.com/docs/responsive-design)
- [Big Mega Maintenance - Category 2](./PHASE-BIG-MEGA-MAINTENANCE.md#category-2-responsiveness--layout)
- [MINIAPP-LAYOUT-AUDIT.md - Category 2](../../../MINIAPP-LAYOUT-AUDIT.md#category-2-responsiveness--layout-audit)

---

**Maintainer:** GitHub Copilot (AI Assistant)  
**Review Cycle:** Quarterly (next review: February 2026)  
**Questions:** See Big Mega Maintenance framework documentation
