# Leaderboard Old Patterns Audit

**Date**: December 1, 2025  
**File**: `components/leaderboard/LeaderboardTable.tsx`  
**Issue**: Using OLD custom patterns instead of tested template patterns  
**Status**: ❌ **NEEDS REBUILD**

---

## 🚨 CRITICAL ISSUES FOUND

### 1. Using Manual `dark:` Utility Classes (20 instances)
**Problem**: Not using CSS system with `@media (prefers-color-scheme: dark)`

**Found Patterns**:
```tsx
// ❌ OLD PATTERN (20 times)
className="bg-slate-100/5 dark:bg-white/5"
className="text-slate-950 dark:text-white"
className="bg-black dark:bg-slate-950/60"
className="border-slate-200 dark:border-slate-700/10"
className="text-gray-500 dark:text-gray-400"
className="hover:bg-slate-100/5 dark:hover:bg-white/5"
```

**Why It's Wrong**:
1. Requires `html.dark` class toggling (extra JavaScript)
2. Not using our CSS system (`globals.css` with `@media`)
3. Inconsistent with template patterns
4. More code, harder to maintain

**Template Pattern** (from `globals.css`):
```css
/* ✅ CORRECT PATTERN */
.card-base {
  background: var(--card);
  color: var(--card-foreground);
}

/* Automatic dark mode with @media */
@media (prefers-color-scheme: dark) {
  .card-base {
    background: var(--dark-bg-card);
  }
}
```

---

### 2. Using Non-Existent Classes (`primary-500`)
**Problem**: `primary-500` doesn't exist in tailwind.config.ts

**Found**:
- Line 142: `focus:ring-primary-500/50`
- Line 142: `focus:border-primary-500/50`
- Line 197: `text-primary-500`
- Line 201: `text-primary-500`
- Line 206: `text-primary-500`

**We Already Fixed This** in CSS file (Round 3), but TSX file still has it!

**Should Be**:
```tsx
// ❌ OLD
className="focus:ring-primary-500/50"

// ✅ CORRECT
className="focus:ring-primary/50"
```

---

### 3. Inconsistent Color System
**Problem**: Mixing custom colors with template colors

**Found Patterns**:
```tsx
// Mix of systems
bg-slate-100/5    // Custom
text-gray-200      // Tailwind default
bg-black           // Hardcoded
text-yellow-400    // Tailwind default
border-slate-700/30 // Custom
```

**Template Pattern** (should use):
```tsx
// ✅ From template
bg-body           // Uses CSS variable
bg-dark-bg-card   // Uses CSS variable
text-foreground   // Uses CSS variable
border-border     // Uses CSS variable
```

---

### 4. Not Using Template Table Pattern
**Problem**: Custom table structure instead of template pattern

**Current** (custom):
```tsx
<table className="w-full">
  <thead className="bg-slate-100/5 dark:bg-white/5">
    <tr>
      <th>Rank</th>
    </tr>
  </thead>
</table>
```

**Template Pattern** (from trezoadmin):
Should use table component classes with proper styling system

---

## 📊 OLD PATTERN STATISTICS

| Pattern Type | Count | Lines Affected |
|--------------|-------|----------------|
| `dark:` utility classes | 20 | 88, 101, 142, 231, 260, 278, 338, 370, 610, 614, 618, 649, 736 |
| `primary-500` (non-existent) | 5 | 142, 197, 201, 206 |
| Custom color mixing | 30+ | Throughout |
| Custom spacing | 15+ | Throughout |

**Total Issues**: 70+ instances of old patterns

---

## 🎯 REQUIRED CHANGES

### A. Remove ALL `dark:` Utility Classes
**Replace With**: CSS classes that handle dark mode automatically

```tsx
// ❌ BEFORE
className="bg-slate-100/5 dark:bg-white/5"

// ✅ AFTER
className="bg-card" // Uses CSS variable with @media
```

### B. Use Template Color System
**Replace With**: CSS variables from `globals.css`

```tsx
// ❌ BEFORE
className="text-slate-950 dark:text-white"

// ✅ AFTER
className="text-foreground" // Automatic dark mode
```

### C. Fix All `primary-500` References
**Replace With**: `primary` (HSL variable)

```tsx
// ❌ BEFORE
className="text-primary-500"

// ✅ AFTER  
className="text-primary"
```

### D. Use Roster CSS Classes (Already Created!)
**Replace With**: `.roster-chip`, `.roster-stat`, `.roster-backdrop`

```tsx
// ❌ BEFORE
className="px-3 py-1.5 rounded-lg bg-slate-100/10 border border-slate-700/30"

// ✅ AFTER
className="roster-chip"
```

---

## 🔍 WHY THIS HAPPENED

### Root Cause Analysis:

1. **Built from scratch** instead of adapting template
   - Didn't follow TEMPLATE-SELECTION.md guidance
   - Created custom patterns instead of using tested ones

2. **Mixed old + new systems**
   - CSS file uses `@media` (correct)
   - TSX file uses `dark:` (old pattern)
   - Not synchronized

3. **Didn't check tailwind.config.ts**
   - Used `primary-500` without verifying it exists
   - Should use `primary` (HSL variable)

4. **Chrome MCP test didn't catch this**
   - Only checked for inline styles
   - Didn't validate class patterns
   - Need additional testing tools

---

## ✅ SOLUTION: Complete Rebuild

### Step 1: Install Testing Tools
```bash
# Accessibility testing
pnpm add -D @axe-core/playwright

# CSS validation
pnpm add -D stylelint stylelint-config-standard

# Component testing
pnpm add -D @testing-library/react @testing-library/jest-dom
```

### Step 2: Create Playwright Accessibility Test
```typescript
// tests/leaderboard-accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('leaderboard accessibility', async ({ page }) => {
  await page.goto('http://localhost:3000/leaderboard');
  await injectAxe(page);
  await checkA11y(page);
});
```

### Step 3: Create CSS Validation Config
```json
// .stylelintrc.json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "selector-class-pattern": "^[a-z][a-z0-9-]*$",
    "no-invalid-position-at-import-rule": null
  }
}
```

### Step 4: Rebuild LeaderboardTable
**Reference**:
- `globals.css` - For proper CSS classes
- `tailwind.config.ts` - For available colors
- `docs/migration/TEMPLATE-SELECTION.md` - For template patterns

**Patterns to Use**:
1. CSS variables: `bg-card`, `text-foreground`, `border-border`
2. Roster classes: `.roster-chip`, `.roster-stat`
3. Template spacing: From tested templates only
4. No `dark:` utilities
5. No `primary-500` (use `primary`)

---

## 📈 TESTING STRATEGY

### Chrome MCP (Already Done) ✅
- Visual layout check
- Inline CSS detection
- Dark mode toggle

### NEW: Playwright + axe-core
- Accessibility compliance (WCAG 2.1)
- Color contrast ratios
- ARIA labels validation
- Keyboard navigation

### NEW: stylelint
- Invalid CSS classes
- Color inconsistencies
- Spacing violations

### NEW: Lighthouse CI
- Performance score
- Best practices
- SEO validation

---

## 🎓 KEY LEARNINGS

1. **Always use template patterns** - Don't build from scratch
2. **Check tailwind.config.ts** - Before using any class
3. **Use CSS system** - Not manual `dark:` utilities
4. **Test with multiple tools** - Chrome MCP alone isn't enough
5. **Follow TEMPLATE-SELECTION.md** - It exists for this reason

---

## 📁 FILES TO UPDATE

1. ✅ `components/leaderboard/LeaderboardTable.tsx` - Complete rebuild
2. ✅ `app/globals.css` - Already correct (keep as is)
3. ✅ `tailwind.config.ts` - Already correct (keep as is)
4. NEW: `tests/leaderboard.spec.ts` - Add Playwright tests
5. NEW: `.stylelintrc.json` - Add CSS validation
6. NEW: `jest.config.js` - Add Jest configuration

---

## 🚀 NEXT STEPS

### Immediate (Phase 2.2 - Round 4):
1. Install testing tools (5 min)
2. Create stylelint config (5 min)
3. Run stylelint on current code (see all issues)
4. Rebuild LeaderboardTable with template patterns (2-3 hours)
5. Run all tests (Playwright + stylelint + Lighthouse)

### Future (Phase 2.3):
1. Mobile responsive testing
2. Cross-browser testing
3. Performance optimization

---

**Status**: ❌ **REBUILD REQUIRED**  
**Priority**: 🔴 **HIGH** - Blocking Phase 2.2 completion  
**Effort**: 3-4 hours (rebuild + testing)  
**Blocker**: Cannot proceed to Phase 2.3 without fixing this

---

**Created By**: GitHub Copilot  
**Date**: December 1, 2025  
**Phase**: 2.2 - Leaderboard Quality Audit
