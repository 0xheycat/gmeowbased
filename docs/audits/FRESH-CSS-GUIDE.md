# Fresh CSS Application Guide

**Created**: November 30, 2025  
**Based on**: `planning/template/gmeowbased0.6/src/assets/css/globals.css`  
**Status**: ✅ CSS Activated, Build Successful

---

## What Changed

### Old CSS (2,144 lines) → Fresh CSS (553 lines)
- **74% reduction** in CSS size
- Copied from **tested production template**
- Mobile-first architecture
- Dark/light theme support built-in
- Zero inline styles approach
- Clean utility classes

### Files Updated
1. ✅ `app/globals.css` (553 lines - fresh from template)
2. ✅ `tailwind.config.ts` (mobile-first breakpoints, spacing, shadows)
3. ✅ Backup: `app/globals-old-2144lines.css`
4. ✅ Backup: `app/globals.css.backup`

---

## CSS Architecture

### 1. Mobile-First Breakpoints (Tailwind Config)
```typescript
screens: {
  'xs': '500px',   // Large phones
  'sm': '640px',   // Tablets portrait
  'md': '768px',   // Tablets landscape
  'lg': '1024px',  // Laptops
  'xl': '1280px',  // Desktops
  '2xl': '1440px', // Large desktops
  '3xl': '1780px', // Extra large
  '4xl': '2160px', // 4K displays
}
```

**Usage**: Design for mobile first, then add breakpoints up
```tsx
<div className="px-4 md:px-8 lg:px-16">  // Mobile → Tablet → Desktop
```

### 2. Dark/Light Theme System

**CSS Variables** (auto-switching):
```css
:root {
  --color-brand: 139 92 246;  /* Farcaster purple */
  --background: 252 252 252;  /* Light mode */
}

html.dark {
  --background: 13 19 33;     /* Dark mode */
}
```

**Usage in Components**:
```tsx
<div className="bg-body dark:bg-dark">
  <p className="text-foreground">Auto switches!</p>
</div>
```

### 3. Component Classes (Ready to Use)

#### Buttons
```tsx
// Primary button
<button className="btn-primary">Click me</button>

// Secondary button
<button className="btn-secondary">Cancel</button>

// Custom button with base styles
<button className="btn-base bg-blue-500 hover:bg-blue-600">
  Custom
</button>
```

#### Cards
```tsx
// Glass card with blur effect
<div className="glass-card p-6">
  <h3>Glass morphism card</h3>
</div>

// Standard card
<div className="card-base p-4">
  <p>Standard card with shadows</p>
</div>
```

#### Inputs
```tsx
// Standard input
<input className="input-base" placeholder="Email" />

// Number input (no spin buttons)
<input type="number" className="input-base spin-button-hidden" />
```

#### Badges
```tsx
<span className="badge-success">Active</span>
<span className="badge-warning">Pending</span>
<span className="badge-error">Failed</span>
```

#### Pixel/Retro Style (Gmeowbased specific)
```tsx
<div className="pixel-border pixel-text">
  RETRO GAMING VIBES
</div>
```

### 4. Spacing & Layout

**From Template**:
```typescript
spacing: {
  '13': '3.375rem',  // Custom spacing
}
margin: {
  '1/2': '50%',      // 50% margin
}
padding: {
  'full': '100%',    // 100% padding
}
width: {
  'calc-320': 'calc(100% - 320px)',  // Sidebar calculations
  'calc-358': 'calc(100% - 358px)',
}
```

### 5. Shadows (Production-Tested)

```tsx
// Light shadow for cards
<div className="shadow-card">

// Main shadow for elevated elements
<div className="shadow-main">

// Large shadow for modals
<div className="shadow-large">

// Button shadow with multiple layers
<button className="shadow-button">
```

---

## How to Apply to Codebase

### Step 1: Remove Inline Styles

❌ **Before**:
```tsx
<div style={{ padding: '16px', background: '#fff' }}>
```

✅ **After**:
```tsx
<div className="p-4 bg-white dark:bg-dark">
```

### Step 2: Use Component Classes

❌ **Before**:
```tsx
<button className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
```

✅ **After**:
```tsx
<button className="btn-primary">
```

### Step 3: Mobile-First Responsive

❌ **Before** (desktop-first):
```tsx
<div className="w-full lg:w-1/2">
```

✅ **After** (mobile-first):
```tsx
<div className="w-full md:w-1/2">
```

### Step 4: Use Utility Classes

**Container (mobile-aware)**:
```tsx
<div className="container-mobile">
  // Auto-padding: px-4 (mobile), px-6 (tablet), px-8 (desktop)
</div>
```

**Custom scrollbar**:
```tsx
<div className="custom-scrollbar overflow-y-auto">
  // Hidden scrollbar, shows on hover
</div>
```

**Animation delays**:
```tsx
<div className="animate-fade-in animation-delay-200">
<div className="animate-fade-in animation-delay-500">
```

---

## Testing Checklist

### Mobile (320px - 767px)
- [ ] Bottom navigation visible
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scroll
- [ ] Text readable (min 16px)
- [ ] Cards stack vertically

### Tablet (768px - 1023px)
- [ ] Bottom nav hidden
- [ ] Desktop nav visible
- [ ] 2-column layouts
- [ ] Spacing increased

### Desktop (1024px+)
- [ ] Full navigation
- [ ] 3+ column layouts
- [ ] Hover states work
- [ ] Shadows visible

### Dark Mode
- [ ] All text readable
- [ ] Cards have borders
- [ ] Shadows adapted
- [ ] Brand colors consistent

---

## Common Patterns

### Dashboard Card
```tsx
<div className="card-base p-6 hover:shadow-large transition-shadow">
  <h3 className="text-lg font-medium mb-2">Stats</h3>
  <p className="text-muted-foreground">Your progress</p>
</div>
```

### Mobile-First Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Responsive Navigation
```tsx
{/* Mobile */}
<nav className="mobile-nav md:hidden">
  <BottomTabNav />
</nav>

{/* Desktop */}
<nav className="desktop-nav hidden md:block">
  <SidebarNav />
</nav>
```

### Loading Skeleton
```tsx
<div className="skeleton h-20 w-full rounded-lg" />
```

### Focus States (Accessibility)
```tsx
<button className="focus-visible-ring">
  Keyboard accessible
</button>
```

---

## Next Steps

### Priority 1: Remove Inline Styles (2 hours)
1. Search codebase: `style={{` or `style="`
2. Replace with utility classes
3. Test each page

### Priority 2: Apply Component Classes (3 hours)
1. Replace button styles with `btn-primary`/`btn-secondary`
2. Replace card styles with `card-base`/`glass-card`
3. Replace input styles with `input-base`
4. Test forms and interactions

### Priority 3: Mobile Testing (2 hours)
1. Test on actual device (iPhone, Android)
2. Check responsive breakpoints (resize browser)
3. Verify touch targets
4. Fix any layout issues

### Priority 4: Dark Mode Testing (1 hour)
1. Toggle dark mode on all pages
2. Check text contrast
3. Verify card borders visible
4. Test with `html.dark` class

---

## Files to Update

### High Priority (Inline Styles)
- `app/Dashboard/page.tsx`
- `app/Quest/[id]/page.tsx`
- `app/profile/[username]/page.tsx`
- `components/GMButton.tsx`
- `components/OnchainStats.tsx`

### Medium Priority (Component Classes)
- All files in `components/ui/` (use our new classes)
- `app/leaderboard/page.tsx`
- `app/gm/page.tsx`

### Low Priority (Optimization)
- Remove unused Tailwind classes
- Consolidate duplicate styles
- Add more utility classes if needed

---

## Troubleshooting

### CSS Not Loading
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Dark Mode Not Working
```tsx
// Ensure html has class="dark"
<html className={isDark ? 'dark' : ''}>
```

### Mobile Layout Broken
```tsx
// Check for fixed widths, use responsive classes
❌ <div className="w-[500px]">
✅ <div className="w-full md:w-[500px]">
```

### Tailwind Classes Not Found
```bash
# Rebuild CSS
npx tailwindcss -i app/globals.css -o app/output.css --watch
```

---

## Resources

- **Template Source**: `planning/template/gmeowbased0.6/`
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Mobile Testing**: Chrome DevTools → Toggle device toolbar
- **Dark Mode**: Add `class="dark"` to `<html>` tag

---

**Status**: ✅ CSS system ready  
**Build**: ✅ Successful  
**Next**: Apply to production pages
