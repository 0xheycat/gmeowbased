# ✅ CORRECT Template Reference Guide

**Date**: November 27, 2025  
**Status**: 🟢 **OFFICIAL TEMPLATE STRATEGY**

---

## ❌ **NEVER USE THIS**

```bash
temp-template/                    # ❌ OLD FOUNDATION STRUCTURE - DO NOT USE
├── src/
│   ├── assets/css/              # ❌ Old CSS patterns
│   ├── components/              # ❌ Old components
│   └── app/                     # ❌ Old structure
```

**Why NOT to use**:
- Old foundation structure from previous project
- Outdated component patterns
- Not following current architecture
- **Can ONLY reuse working APIs/logic** (NOT UI/UX/CSS)

---

## ✅ **USE THESE 5 TEMPLATES**

### **Location**: `planning/template/`

```
planning/template/
├── gmeowbasedv0.1/              ⭐ PRIMARY ASSETS
├── gmeowbasedv0.2/              UI/UX Inspiration
├── gmeowbasedv0.3/              ⭐ PRIMARY CSS & COMPONENTS
├── gmeowbasedv0.4/              UI/UX Inspiration
└── gmeowbasedv0.5/              (Future use)
```

---

## 1️⃣ **Gmeowbased v0.3** (Tailwick v2.0 Next.js TypeScript)

**Location**: `planning/template/gmeowbasedv0.3/Nextjs-TS/`

**⭐ PRIMARY SOURCE FOR:**
- ✅ Component Patterns (Card, Button, Badge, Stats)
- ✅ Theme System (Colors, Typography, Spacing)
- ✅ CSS Architecture (Variables, Dark Mode)
- ✅ Layout Utilities (Grids, Containers)
- ✅ Navigation Patterns (Sidebar, Top/Bottom Nav)

**Structure**:
```
Nextjs-TS/
├── src/
│   ├── app/                     # Page examples
│   ├── components/              # Tailwick components
│   ├── assets/
│   │   └── css/                 # CSS patterns (reference)
│   ├── helpers/                 # Utilities
│   └── types/                   # TypeScript types
├── tailwind.config.ts           # Tailwind setup
└── package.json                 # Dependencies
```

**What to extract**:
```typescript
// Component patterns (NOT direct copy, adapt to our structure)
Card → components/ui/card.tsx
Button → components/ui/button.tsx
Badge → components/ui/badge.tsx

// CSS patterns (variables, classes)
themes.css → styles/tailwick-theme.css
_card.css → styles/custom/card.css
_buttons.css → styles/custom/button.css
_sidenav.css → styles/structure/navigation.css
```

---

## 2️⃣ **Gmeowbased v0.1** (Asset Pack)

**Location**: `planning/template/gmeowbasedv0.1/`

**⭐ PRIMARY SOURCE FOR:**
- ✅ **55 SVG Icons** (Profile, Quests, Groups, Leaderboard, etc.)
- ✅ **Illustrations** (Avatars, Badges, Quest Medals)
- ✅ **Credits** (Stone, Token, Crystal)
- ✅ **Section Banners** (12 variants)
- ✅ **Brand Guidelines** (Theme files)

**Structure**:
```
gmeowbasedv0.1/
├── SVG Icons/                   # 55 icons
│   ├── Profile/                 # User profile icons
│   ├── Quests/                  # Quest-related icons
│   ├── Groups/                  # Guild/group icons
│   ├── Leaderboard/             # Ranking icons
│   └── ...                      # And more
├── Illustrations/
│   ├── Avatars/                 # 15 avatar illustrations
│   ├── Badges/                  # 24 badge designs
│   ├── Quest Medals/            # 13 medal designs
│   ├── Stone Credits/           # 8 stone credit designs
│   ├── Token Credits/           # 4 token credit designs
│   └── Crystal Credits/         # 6 crystal credit designs
├── Theme/
│   ├── gmeowbased/              # Main theme
│   └── gmeowbased-child/        # Child theme
└── Licensing/                   # License info
```

**Usage Example**:
```tsx
// Import SVG icons from v0.1
import ProfileIcon from '@/assets/gmeow-icons/profile/user.svg'
import QuestIcon from '@/assets/gmeow-icons/quests/daily-quest.svg'
import BadgeIcon from '@/assets/gmeow-illustrations/badges/legendary-badge.svg'

// Use in components
<ProfileIcon className="w-6 h-6 text-primary" />
<img src={BadgeIcon} alt="Legendary Badge" />
```

---

## 3️⃣ **Gmeowbased v0.2** (ProKit Flutter - social_prokit)

**Location**: `planning/template/gmeowbasedv0.2/`

**⚠️ UI/UX INSPIRATION ONLY** (NOT code)

**Extract:**
- ✅ Social feed layout patterns
- ✅ Post card designs
- ✅ Comment section structure
- ✅ User interaction flows
- ❌ DO NOT copy Flutter code

**Example**:
```tsx
// Flutter pattern (REFERENCE ONLY)
// lib/screens/SPDashboardScreen.dart
// - Social feed with cards
// - Like/Comment/Share actions
// - User profile headers

// Our Next.js implementation
// components/features/social/PostCard.tsx
export function PostCard() {
  return (
    <div className="card card-body">
      {/* Inspired by ProKit layout, NOT copied */}
      <div className="flex items-center gap-3">
        <Avatar />
        <UserInfo />
      </div>
      <PostContent />
      <PostActions />
    </div>
  )
}
```

---

## 4️⃣ **Gmeowbased v0.4/27-socialv_prokit** (ProKit Flutter)

**Location**: `planning/template/gmeowbasedv0.4/27-socialv_prokit/`

**⚠️ UI/UX INSPIRATION ONLY** (NOT code)

**Extract:**
- ✅ Profile page layouts
- ✅ Settings screen patterns
- ✅ Activity feed designs
- ✅ Notification structures
- ❌ DO NOT copy Flutter code

---

## 5️⃣ **Gmeowbased v0.4/30-nft_market_place** (ProKit Flutter)

**Location**: `planning/template/gmeowbasedv0.4/30-nft_market_place/`

**⚠️ UI/UX INSPIRATION ONLY** (NOT code)

**Extract:**
- ✅ Badge gallery layouts
- ✅ Marketplace patterns
- ✅ Collection displays
- ✅ Item card designs
- ❌ DO NOT copy Flutter code

**Example**:
```tsx
// Flutter pattern (REFERENCE ONLY)
// lib/screens/NFTCollection.dart
// - Grid layout for NFTs
// - Filter/Sort controls
// - Detail modal

// Our Next.js implementation
// components/features/badges/BadgeGallery.tsx
export function BadgeGallery() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map(badge => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </div>
  )
}
```

---

## 📝 **Migration Strategy**

### **Step 1: Analyze Template**
```bash
# Explore Gmeowbased v0.3 structure
cd planning/template/gmeowbasedv0.3/Nextjs-TS/
ls -la src/

# Review component patterns
cat src/components/ui/Card.tsx
cat src/assets/css/custom/_card.css
```

### **Step 2: Extract Patterns (NOT direct copy)**
```typescript
// ❌ WRONG: Direct copy from template
import { Card } from '@/temp-template/components/Card'

// ✅ CORRECT: Extract pattern, adapt to our structure
// 1. Study Card component in gmeowbasedv0.3/Nextjs-TS/src/components/
// 2. Extract CSS classes to styles/custom/card.css
// 3. Create our own Card component in components/ui/card.tsx
// 4. Match our architecture (shadcn/ui, TypeScript, Tailwind)

export function Card({ children, variant = 'default' }: CardProps) {
  return (
    <div className={cn('card', variant === 'gradient' && 'card-gradient-purple')}>
      {children}
    </div>
  )
}
```

### **Step 3: Adapt to Our Architecture**
```
Gmeowbased v0.3 Pattern          →  Our Implementation
────────────────────────────────────────────────────────────
src/components/ui/Card.tsx       →  components/ui/card.tsx
src/assets/css/custom/_card.css  →  styles/custom/card.css
src/helpers/utils.ts             →  lib/utils.ts
src/types/index.ts               →  types/index.ts
```

### **Step 4: Use Assets from v0.1**
```bash
# Copy SVG icons to our assets
cp -r planning/template/gmeowbasedv0.1/"SVG Icons"/* assets/gmeow-icons/

# Copy illustrations
cp -r planning/template/gmeowbasedv0.1/Illustrations/* assets/gmeow-illustrations/

# Organize by category
assets/
├── gmeow-icons/
│   ├── profile/
│   ├── quests/
│   └── groups/
└── gmeow-illustrations/
    ├── avatars/
    ├── badges/
    └── medals/
```

---

## 🚫 **What NOT to Do**

### ❌ **Don't Copy Entire Template**
```bash
# ❌ WRONG
cp -r planning/template/gmeowbasedv0.3/Nextjs-TS/src/* src/
# This overwrites our existing structure!
```

### ❌ **Don't Use temp-template**
```typescript
// ❌ WRONG
import Card from '@/temp-template/components/Card'
// temp-template is OLD foundation, NOT current templates
```

### ❌ **Don't Copy Flutter Code**
```dart
// ❌ WRONG: This is Dart/Flutter, not TypeScript
import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  // Can't use Flutter code in Next.js!
}
```

---

## ✅ **What TO Do**

### ✅ **Extract Component Patterns**
```typescript
// ✅ CORRECT: Study template, adapt to our structure
// 1. Review gmeowbasedv0.3/Nextjs-TS/src/components/ui/Card.tsx
// 2. Extract CSS classes to styles/custom/card.css
// 3. Create our own implementation in components/ui/card.tsx

export function Card({ children, variant }: CardProps) {
  return (
    <div className={cn('card', variantClasses[variant])}>
      {children}
    </div>
  )
}
```

### ✅ **Use CSS Variables from Tailwick**
```css
/* ✅ CORRECT: Extract Tailwick patterns to our CSS */
/* From gmeowbasedv0.3/Nextjs-TS CSS patterns */
@theme {
  --color-primary: #8B5CF6;      /* Farcaster Purple */
  --color-secondary: #0052FF;    /* Base Blue */
  --spacing-sidenav-width: 264px;
}
```

### ✅ **Copy Assets from v0.1**
```bash
# ✅ CORRECT: Assets can be copied directly
cp -r planning/template/gmeowbasedv0.1/"SVG Icons"/* assets/gmeow-icons/
```

### ✅ **Get UI/UX Inspiration from ProKit**
```typescript
// ✅ CORRECT: Inspired by ProKit layout patterns, adapted to Next.js
// Studied: gmeowbasedv0.4/30-nft_market_place/lib/screens/NFTCollection.dart
// Pattern: Grid layout with filter controls

export function BadgeGallery() {
  return (
    <div className="space-y-4">
      {/* Filter controls inspired by ProKit */}
      <div className="flex items-center gap-3">
        <FilterButton />
        <SortButton />
      </div>
      
      {/* Grid layout inspired by ProKit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map(badge => <BadgeCard key={badge.id} badge={badge} />)}
      </div>
    </div>
  )
}
```

---

## 📊 **Current Implementation Status**

### ✅ **Completed**
- [x] Created `/styles/tailwick-theme.css` (CSS variables from v0.3 patterns)
- [x] Created `/styles/custom/card.css` (Card classes from v0.3 patterns)
- [x] Created `/styles/custom/button.css` (Button classes from v0.3 patterns)
- [x] Created `/styles/structure/navigation.css` (Navigation from v0.3 patterns)
- [x] Updated `/app/globals.css` (Proper imports with @layer)

### 🔄 **In Progress**
- [ ] Refactor `components/tailwick-primitives.tsx` (Use CSS classes)
- [ ] Refactor `components/navigation/AppNavigation.tsx` (Use `.app-sidebar`)
- [ ] Update `tailwind.config.ts` (CSS variables)
- [ ] Import SVG icons from v0.1 (55 icons)
- [ ] Import illustrations from v0.1 (Avatars, Badges, Medals)

### ⏳ **Pending**
- [ ] Test dark mode (`[data-theme='dark']`)
- [ ] Test mobile responsive (bottom nav, top bar)
- [ ] TypeScript compilation (0 errors)
- [ ] Navigation flows (active states, gradients)

---

## 🎯 **Quick Reference**

| Need | Template | Location | Type |
|------|----------|----------|------|
| **CSS Variables** | v0.3 | `gmeowbasedv0.3/Nextjs-TS/` | Pattern |
| **Card Component** | v0.3 | `gmeowbasedv0.3/Nextjs-TS/src/components/` | Pattern |
| **Button Component** | v0.3 | `gmeowbasedv0.3/Nextjs-TS/src/components/` | Pattern |
| **Navigation** | v0.3 | `gmeowbasedv0.3/Nextjs-TS/src/assets/css/` | Pattern |
| **SVG Icons** | v0.1 | `gmeowbasedv0.1/SVG Icons/` | Copy |
| **Illustrations** | v0.1 | `gmeowbasedv0.1/Illustrations/` | Copy |
| **Social Feed Layout** | v0.2 | `gmeowbasedv0.2/lib/screens/` | Inspiration |
| **Profile Layout** | v0.4/27 | `27-socialv_prokit/lib/screens/` | Inspiration |
| **Badge Gallery** | v0.4/30 | `30-nft_market_place/lib/screens/` | Inspiration |

---

## 🔗 **Related Docs**

- `MIGRATION-STATUS.md` - Overall migration status ✅ (Has correct refs)
- `CSS-AUDIT-AND-IMPROVEMENTS.md` - CSS audit ✅ (Just corrected)
- `TEMPLATE-COMPLIANCE-AUDIT.md` - Template compliance ⚠️ (Needs update)
- `MIGRATION-QUICK-START.md` - Migration guide ⚠️ (Needs update)
- `PRE-PHASE-D-FINAL-CHECK.md` - Phase D checklist ⚠️ (Needs update)

---

**Last Updated**: November 27, 2025  
**Reviewed By**: Agent + User Correction  
**Status**: 🟢 OFFICIAL GUIDE - Use this as source of truth
