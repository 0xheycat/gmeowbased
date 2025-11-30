# Inline Styles Audit - November 30, 2025

## Summary
Found **50+ inline style** attributes across app/ and components/

## Priority Files to Fix

### HIGH PRIORITY (User-facing pages)
1. **app/Dashboard/page.tsx** (8 inline styles)
   - SVG display styles
   - Progress bar widths
   - Image object-fit

2. **app/leaderboard/page.tsx** (1 inline style)
   - Progress bar width

3. **app/Quest/page.tsx** (6 inline styles)
   - Virtual list heights
   - Scroll container styles

### MEDIUM PRIORITY (Components)
4. **components/LeaderboardList.tsx** (11 inline styles)
   - Loading skeletons
   - Progress bars
   - Avatar styles
   - Text shadows

5. **components/GMCountdown.tsx** (2 inline styles)
   - SVG animations
   - Text shadows

6. **components/badge/BadgeInventory.tsx** (8 inline styles)
   - Animations
   - Colors
   - Transforms

### LOW PRIORITY (OG Images - OK to keep inline)
- app/share/[fid]/route.tsx (React OG images - inline required)
- app/api/og/tier-card/route.tsx (React OG images - inline required)

## Replacement Strategy

### Progress Bars
❌ Before:
```tsx
<div style={{ width: `${progress}%` }} />
```

✅ After:
```tsx
<div className="transition-all duration-300" style={{ width: `${progress}%` }} />
// Dynamic width MUST stay inline, but add Tailwind transition
```

### SVG Display
❌ Before:
```tsx
<svg style={{ display: 'inline-block', verticalAlign: 'middle' }}>
```

✅ After:
```tsx
<svg className="inline-block align-middle">
```

### Text Shadows
❌ Before:
```tsx
<h3 style={{ fontWeight: 700, textShadow: '0 2px 0 var(--px-outer)' }}>
```

✅ After:
```tsx
<h3 className="font-bold pixel-text">
// Use .pixel-text class from globals.css
```

### Loading Skeletons
❌ Before:
```tsx
<div style={{ background: 'rgba(138,99,210,0.18)' }} />
```

✅ After:
```tsx
<div className="skeleton">
// Use .skeleton class from globals.css
```

### Image Object Fit
❌ Before:
```tsx
<Image style={{ objectFit: 'cover' }} />
```

✅ After:
```tsx
<Image className="object-cover" />
```

## Rules

### ✅ OK to Keep Inline
- Dynamic calculated values (progress %, transforms)
- CSS custom properties (--bar-height)
- OG image styles (React ImageResponse)
- Virtual list positioning (react-window)

### ❌ Must Remove
- Static display/layout styles → Tailwind classes
- Colors/backgrounds → Tailwind or CSS classes
- Fonts/text → Tailwind classes
- Spacing → Tailwind classes

## Status

- [ ] app/Dashboard/page.tsx (8 styles)
- [ ] app/leaderboard/page.tsx (1 style)
- [ ] app/Quest/page.tsx (6 styles)
- [ ] components/LeaderboardList.tsx (11 styles)
- [ ] components/GMCountdown.tsx (2 styles)
- [ ] components/badge/BadgeInventory.tsx (8 styles)
- [ ] app/loading.tsx (1 style - CSS var)
- [ ] app/layout.tsx (1 style - CSS var)

**Total to fix**: ~30 inline styles (excluding OG images and dynamic values)
