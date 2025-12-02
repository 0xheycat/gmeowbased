# 🎨 Fresh CSS Classes Reference (gmeowbased0.6 Pattern)

**Source**: `app/globals.css` (553 lines from gmeowbased0.6 template)  
**Principle**: "One pattern for all" - Use ONLY these classes  
**No mixing**: Do NOT use old quest-card-yugioh, gacha-animation, or custom CSS

---

## Available CSS Classes

### 🔘 Buttons
```css
.btn-base       /* Base button styles */
.btn-primary    /* Primary action button (purple/brand color) */
.btn-secondary  /* Secondary button (muted) */
```

**Usage**: 
```tsx
<button className="btn-primary">Click Me</button>
<button className="btn-secondary">Cancel</button>
```

---

### 🎴 Cards
```css
.card-base      /* Base card container */
.glass-card     /* Glass morphism card */
.glass-card.dark /* Dark mode glass card */
```

**Usage**:
```tsx
<div className="card-base">Basic card</div>
<div className="glass-card">Glass effect card</div>
```

---

### 🏷️ Badges
```css
.badge-base     /* Base badge */
.badge-success  /* Green success badge */
.badge-warning  /* Yellow warning badge */
.badge-error    /* Red error badge */
```

**Usage**:
```tsx
<span className="badge-success">Active</span>
<span className="badge-error">Failed</span>
```

---

### 📝 Inputs
```css
.input-base     /* Base input field */
```

**Usage**:
```tsx
<input className="input-base" />
```

---

### 🎮 Pixel/Retro
```css
.pixel-border   /* Pixel-style border */
.pixel-text     /* Pixel-style text */
```

---

### 📜 Scrollbar
```css
.custom-scrollbar       /* Custom scrollbar styling */
.coin-list-scrollbar    /* Scrollbar for lists */
```

---

### 🎞️ Swiper/Carousel
```css
.swiper                 /* Swiper container */
.swiper-wrapper         /* Swiper wrapper */
.swiper-scrollbar       /* Scrollbar for swiper */
```

---

## ⚠️ DO NOT USE (Old CSS Classes)

These classes are NO LONGER AVAILABLE:

❌ `.quest-card-yugioh` (deleted)  
❌ `.quest-card-glass` (deleted)  
❌ `.gacha-reveal-container` (deleted)  
❌ `.theme-shell-header` (deleted)  
❌ `.safe-area-bottom` (deleted)  
❌ Any class from the 7 deleted CSS files

---

## ✅ Migration Guide

### Old → New

| Old Class | New Class | Notes |
|-----------|-----------|-------|
| `.quest-card-yugioh` | `.card-base` or `.glass-card` | Use fresh card pattern |
| `.gacha-reveal-container` | `.glass-card` + custom animation | Use fresh pattern |
| `.theme-shell-header` | Use Tailwind classes | No custom header CSS |
| `.retro-btn` | `.btn-primary` | Use fresh button |
| Custom quest CSS | `.card-base` + Tailwind | Build with fresh pattern |

---

## 🎯 Pattern Philosophy

**"One pattern for all"** = gmeowbased0.6 template pattern

- All buttons use `.btn-primary` / `.btn-secondary`
- All cards use `.card-base` / `.glass-card`
- All badges use `.badge-success` / `.badge-warning` / `.badge-error`
- Spacing/layout uses Tailwind utilities
- No custom CSS per feature

**Benefits**:
- ✅ Consistent design across all features
- ✅ Easier to maintain (one pattern)
- ✅ Mobile-first built-in (xs:500px breakpoint)
- ✅ Dark mode built-in (CSS variables)
- ✅ Production-tested (from working template)

---

**Last Updated**: November 30, 2025  
**CSS Lines**: 553 (gmeowbased0.6 pattern only)
