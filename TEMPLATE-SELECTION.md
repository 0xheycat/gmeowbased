# 🎨 Template Selection - Foundation Rebuild

**Selection Date**: November 30, 2025  
**Total Templates Reviewed**: 7,973 TSX components  
**Selected Components**: 28 patterns  
**Primary Goal**: Mobile-first UI with SVG icons (NO emojis)

---

## 📊 Template Sources Overview

| Folder | TSX Count | Best For | Version |
|--------|-----------|----------|---------|
| **trezoadmin-41** | 4,431 | Modern dashboards, Tailwind + Material-UI | Latest |
| **music** | 2,647 | **SVG icons (1,998!)**,  forms, charts | Production |
| **gmeowbased0.6** | 406 | Previous patterns, glass morphism | v0.6 |
| **gmeowbasedv0.3** | 489 | Sidenav patterns, layouts | v0.3 |
| **TOTAL** | **7,973** | | |

---

## 🎯 Selection Criteria

1. **Mobile-First** ✅ Bottom nav, large tap targets (44px min)
2. **SVG Icons** ✅ No emojis, use professional SVG icons
3. **Modern Design** ✅ Glass morphism, gradients, animations
4. **Performance** ✅ Lightweight, lazy loading, optimized
5. **Accessibility** ✅ ARIA labels, keyboard navigation, screen reader
6. **Tailwind-Compatible** ✅ Works with our CSS system

---

## 🧩 Selected Components (28 Total)

### 1️⃣ Navigation Components (6 selected)

#### A. **Bottom Tab Navigation** (Mobile Priority #1)
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/Layout/`
- **File**: SidebarMenu (adapt to bottom nav)
- **Why**: Modern Tailwind design, responsive, touch-optimized
- **Adapt**: Convert vertical sidebar to horizontal bottom nav
- **Features**: Active state, icon support, badge support
- **Estimated Effort**: 3 hours

**Backup Source**: `music/common/resources/client/admin/appearance/appearance-listener.tsx`
- Sidebar toggle patterns can be adapted for mobile

---

#### B. **Desktop Sidebar Navigation**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/Layout/SidebarMenu/`
- **File**: SidebarMenu (desktop version)
- **Why**: Collapsible, modern design, icon + label
- **Features**: Hover states, nested menus, collapse/expand
- **Estimated Effort**: 2 hours

---

#### C. **Top Header/Navbar**
**Source**: `trezoadmin-41/trezo-landing-pages/react-nextjs-tailwindcss/crypto-landing/src/components/Layout/Navbar.tsx`
- **File**: Navbar
- **Why**: Mobile-responsive, sticky header, hamburger menu
- **Features**: Logo, CTA button, mobile menu toggle
- **Estimated Effort**: 2 hours

---

#### D. **Breadcrumb Navigation**
**Source**: `music/common/resources/client/ui/breadcrumbs/breadcrumbs.tsx`
- **File**: Breadcrumbs
- **Why**: Accessible, customizable separators
- **Features**: Current page highlight, truncation for long paths
- **Estimated Effort**: 1 hour

---

#### E. **Tab Navigation** (Sub-pages)
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/UIElements/Tabs/`
- **File**: BasicTabs, IconTabs
- **Why**: Clean design, icon support, scrollable on mobile
- **Features**: Underline animation, active state, badge support
- **Estimated Effort**: 1.5 hours

---

#### F. **Pagination**
**Source**: `music/common/resources/client/ui/pagination/pagination.tsx`
- **File**: Pagination
- **Why**: Accessible, keyboard navigation, mobile-optimized
- **Features**: First/last buttons, ellipsis for long lists, size variants
- **Estimated Effort**: 1 hour

---

### 2️⃣ Button Components (7 selected)

#### A. **Primary Action Button**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/UIElements/Buttons/BasicButtons.tsx`
- **File**: BasicButtons
- **Why**: Modern gradients, Tailwind-based, size variants
- **Features**: Gradient backgrounds, hover effects, loading state
- **Variants**: sm, md, lg, xl
- **Estimated Effort**: 1.5 hours

---

#### B. **Secondary/Outline Button**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/UIElements/Buttons/OutlineButtons.tsx`
- **File**: OutlineButtons
- **Why**: Clean outline style, pairs well with primary button
- **Features**: Border animation on hover, multiple colors
- **Estimated Effort**: 1 hour

---

#### C. **Icon Button**
**Source**: `music/common/resources/client/ui/buttons/icon-button.tsx`
- **File**: IconButton
- **Why**: Lightweight, size-aware, accessible
- **Features**: Circular/square variants, size inheritance, tooltip support
- **Props**: `size`, `padding`, `equalWidth`, `variant`
- **Estimated Effort**: 1 hour

---

#### D. **Floating Action Button (FAB)**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-material-ui/src/components/UiKit/FloatingActionButton/FloatingActionButtons.tsx`
- **File**: FloatingActionButtons
- **Why**: Material Design, position variants (bottom-right, etc.)
- **Features**: Shadow elevation, ripple effect, icon support
- **Estimated Effort**: 1.5 hours

---

#### E. **Button Group**
**Source**: `music/common/resources/client/ui/buttons/button-group.tsx`
- **File**: ButtonGroup
- **Why**: Segmented control pattern, mobile-friendly
- **Features**: Horizontal/vertical, equal width option, exclusive selection
- **Estimated Effort**: 1 hour

---

#### F. **Loading Button**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-material-ui/src/components/UiKit/Buttons/LoadingButtons.tsx`
- **File**: LoadingButtons
- **Why**: Built-in loading spinner, disables on load
- **Features**: Spinner position (start/end), maintains button width
- **Estimated Effort**: 1 hour

---

#### G. **Link Button**
**Source**: `music/common/resources/client/ui/buttons/button.tsx`
- **File**: Button (styled as link)
- **Why**: Accessible, router-aware, external link detection
- **Features**: `asChild` prop for Next.js Link integration
- **Estimated Effort**: 30 minutes

---

### 3️⃣ Card Components (5 selected)

#### A. **Stats Card** (XP, Rank, Streak)
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/Dashboard/Finance/Cards.tsx`
- **File**: Cards (Finance Dashboard)
- **Why**: Perfect for numeric stats, icon + value + label layout
- **Features**: Icon color variants, trend indicators (up/down), glassmorphism
- **Layout**: Flex column, centered, 16px padding
- **Estimated Effort**: 2 hours

---

#### B. **Leaderboard Item Card**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/Dashboard/Crypto/CryptocurrencyWatchlist/`
- **File**: Crypto watchlist items
- **Why**: Perfect for ranked lists, avatar + name + stats
- **Features**: Hover effects, highlight current user, rank badge
- **Layout**: Flex row, space-between, 12px padding
- **Estimated Effort**: 2 hours

---

#### C. **Badge/Achievement Card**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-material-ui/src/components/UiKit/Card/MediaCard.tsx`
- **File**: MediaCard
- **Why**: Image + title + description, perfect for badges
- **Features**: Locked/unlocked states, overlay for locked badges
- **Layout**: Vertical card, image top, text below
- **Estimated Effort**: 2 hours

---

#### D. **Profile Header Card**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/MyProfile/`
- **File**: Profile components
- **Why**: Avatar + username + bio + stats, complete profile layout
- **Features**: Large avatar (96px), gradient background, stats pills
- **Estimated Effort**: 2.5 hours

---

#### E. **Action Card** (with CTA button)
**Source**: `trezoadmin-41/trezo-landing-pages/react-nextjs-tailwindcss/analytics-landing/src/components/Features/FeaturesCard.tsx`
- **File**: FeaturesCard
- **Why**: Icon + title + description + button, good for CTAs
- **Features**: Hover lift effect, gradient border, responsive
- **Estimated Effort**: 1.5 hours

---

### 4️⃣ Form Components (4 selected)

#### A. **Text Input Field**
**Source**: `music/common/resources/client/ui/forms/input-field/text-field/text-field.tsx`
- **File**: TextField
- **Why**: Complete input system with label, error, helper text
- **Features**: Size variants, prefix/suffix icons, character count, error states
- **Props**: `label`, `error`, `helperText`, `startAdornment`, `endAdornment`
- **Estimated Effort**: 2 hours

---

#### B. **Search Input**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/Layout/Header/SearchForm/`
- **File**: SearchForm
- **Why**: Mobile-optimized search, autocomplete ready
- **Features**: Search icon, clear button, keyboard shortcuts (/)
- **Estimated Effort**: 1.5 hours

---

#### C. **Select Dropdown**
**Source**: `music/common/resources/client/ui/forms/select/select.tsx`
- **File**: Select
- **Why**: Accessible, searchable, mobile-friendly
- **Features**: Virtual scrolling (large lists), multi-select, custom options
- **Props**: `options`, `value`, `onChange`, `searchable`, `multiple`
- **Estimated Effort**: 2.5 hours

---

#### D. **Checkbox & Radio**
**Source**: `music/common/resources/client/ui/forms/toggle/`
- **File**: Checkbox, Switch, Radio
- **Why**: Accessible, animated, custom styled
- **Features**: Indeterminate state (checkbox), size variants, label support
- **Estimated Effort**: 1.5 hours

---

### 5️⃣ Feedback Components (4 selected)

#### A. **Toast Notification System**
**Source**: `music/common/resources/client/ui/overlays/toast/`
- **File**: Toast, Toaster
- **Why**: Complete toast system with queue, animations, types
- **Features**: Success/error/warning/info variants, auto-dismiss, pauseOnHover
- **Position**: Top-right, bottom-right, top-center, etc.
- **Estimated Effort**: 2.5 hours

---

#### B. **Modal/Dialog**
**Source**: `music/common/resources/client/ui/overlays/dialog/dialog.tsx`
- **File**: Dialog
- **Why**: Accessible (ARIA), backdrop, esc to close, mobile-optimized
- **Features**: Size variants, scrollable body, sticky header/footer
- **Estimated Effort**: 2 hours

---

#### C. **Loading Spinner**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/UIElements/Spinners/`
- **File**: Spinners (multiple variants)
- **Why**: Multiple styles (circle, dots, bars), size variants
- **Features**: Centered overlay option, inline option, color variants
- **Estimated Effort**: 1 hour

---

#### D. **Empty State**
**Source**: `music/common/resources/client/datatable/empty-state-message.tsx`
- **File**: EmptyStateMessage
- **Why**: Icon + message + CTA button, good for no-data states
- **Features**: Customizable icon, action button, multiple sizes
- **Estimated Effort**: 1 hour

---

### 6️⃣ Data Display Components (2 selected)

#### A. **Leaderboard/List Table**
**Source**: `music/common/resources/client/datatable/`
- **File**: DataTable components (complete system)
- **Why**: Virtual scrolling, infinite scroll, sorting, filtering
- **Features**: Mobile-responsive, sticky header, loading skeletons
- **Components**: DataTable, DataTableHeader, DataTableRow, DataTablePagination
- **Estimated Effort**: 4 hours (complex)

---

#### B. **Progress Bar**
**Source**: `trezoadmin-41/trezo-admin-full-version/react-nextjs-tailwindcss/src/components/UIElements/Progress/`
- **File**: Progress components
- **Why**: XP bars, streak progress, loading progress
- **Features**: Gradient fill, label (percentage/value), size variants
- **Variants**: Linear, circular
- **Estimated Effort**: 1.5 hours

---

## 🎨 SVG Icon System (PRIORITY)

### **1,998 Material Design SVG Icons Available!**

**Source**: `music/common/resources/client/icons/`

**Key Files**:
- `create-svg-icon.tsx` - Icon factory (creates icon components)
- `svg-icon.tsx` - Base icon component with size/color props
- `material/` - 1,998 pre-built Material Design icons

**Icons We Need** (20 selected):

| Icon Name | File | Use Case |
|-----------|------|----------|
| `Home` | material/Home.tsx | Bottom nav - Home tab |
| `Leaderboard` | material/Leaderboard.tsx | Bottom nav - Rank tab |
| `Person` | material/Person.tsx | Bottom nav - You tab |
| `Share` | material/Share.tsx | FAB share button |
| `LocalFireDepartment` | material/LocalFireDepartment.tsx | Streak icon (fire) |
| `Bolt` | material/Bolt.tsx | XP icon (lightning) |
| `EmojiEvents` | material/EmojiEvents.tsx | Badge/trophy icon |
| `TrendingUp` | material/TrendingUp.tsx | Stats trending up |
| `TrendingDown` | material/TrendingDown.tsx | Stats trending down |
| `Search` | material/Search.tsx | Search input icon |
| `FilterList` | material/FilterList.tsx | Filter dropdown icon |
| `Close` | material/Close.tsx | Close modal/drawer |
| `Menu` | material/Menu.tsx | Mobile hamburger menu |
| `ChevronLeft` | material/ChevronLeft.tsx | Back navigation |
| `ChevronRight` | material/ChevronRight.tsx | Forward navigation |
| `ExpandMore` | material/ExpandMore.tsx | Dropdown arrow |
| `CheckCircle` | material/CheckCircle.tsx | Success toast icon |
| `Error` | material/Error.tsx | Error toast icon |
| `Info` | material/Info.tsx | Info toast icon |
| `Warning` | material/Warning.tsx | Warning toast icon |

**How to Use**:
```tsx
import { HomeIcon } from '@/components/icons/material/Home';
import { LeaderboardIcon } from '@/components/icons/material/Leaderboard';

<HomeIcon size="md" className="text-primary" />
<LeaderboardIcon size="lg" className="text-white" />
```

**Icon Size System** (from `svg-icon.tsx`):
```tsx
size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
// xs: 16px
// sm: 20px
// md: 24px (default)
// lg: 32px
// xl: 40px
```

**Estimated Effort**: 2 hours (copy icon system + 20 icons)

---

## 📦 Implementation Plan

### Phase 1: Core Infrastructure (Day 1 - 2 hours)

1. **Copy Icon System** (30 minutes)
   - Copy `create-svg-icon.tsx` to `lib/icons/`
   - Copy `svg-icon.tsx` to `components/icons/`
   - Copy 20 selected icons to `components/icons/material/`

2. **Set Up Button Base** (30 minutes)
   - Copy `button-base.tsx` from music template
   - Adapt to our Tailwind system

3. **Create Utility Hooks** (1 hour)
   - Copy `use-media-query.ts` (responsive hooks)
   - Copy `use-previous.ts` (animation helpers)
   - Copy `use-id.ts` (accessibility IDs)

---

### Phase 2: Navigation Components (Day 1 - 4 hours)

1. **Bottom Tab Nav** (2 hours)
   - Adapt trezoadmin SidebarMenu to horizontal bottom nav
   - Add active state, badges, mobile-optimized
   - File: `components/navigation/BottomTabNav.tsx`

2. **FAB Share Button** (1 hour)
   - Copy FloatingActionButton pattern
   - Add share icon, bounce animation
   - File: `components/buttons/ShareFAB.tsx`

3. **Top Header** (1 hour)
   - Adapt Navbar pattern from trezoadmin landing
   - Add mobile menu toggle
   - File: `components/navigation/TopHeader.tsx`

---

### Phase 3: Button Components (Day 2 - 3 hours)

1. **Primary Button** (45 minutes)
   - Copy BasicButtons from trezoadmin
   - Add gradient variants, loading state
   - File: `components/buttons/PrimaryButton.tsx`

2. **Secondary Button** (30 minutes)
   - Copy OutlineButtons pattern
   - File: `components/buttons/SecondaryButton.tsx`

3. **Icon Button** (45 minutes)
   - Copy from music template
   - File: `components/buttons/IconButton.tsx`

4. **Button Group** (1 hour)
   - Copy from music template
   - File: `components/buttons/ButtonGroup.tsx`

---

### Phase 4: Card Components (Day 2 - 4 hours)

1. **Stats Card** (1 hour)
   - Adapt Finance Cards from trezoadmin
   - File: `components/cards/StatsCard.tsx`

2. **Leaderboard Card** (1.5 hours)
   - Adapt Crypto watchlist pattern
   - File: `components/cards/LeaderboardCard.tsx`

3. **Badge Card** (1.5 hours)
   - Adapt MediaCard from trezoadmin
   - Add locked/unlocked states
   - File: `components/cards/BadgeCard.tsx`

---

### Phase 5: Form Components (Day 3 - 4 hours)

1. **Text Input** (1.5 hours)
   - Copy TextField from music template
   - Adapt to Tailwind
   - File: `components/forms/Input.tsx`

2. **Search Input** (1 hour)
   - Adapt SearchForm from trezoadmin
   - File: `components/forms/SearchInput.tsx`

3. **Select Dropdown** (1.5 hours)
   - Copy Select from music template
   - File: `components/forms/Select.tsx`

---

### Phase 6: Feedback Components (Day 3 - 3 hours)

1. **Toast System** (1.5 hours)
   - Copy Toast/Toaster from music template
   - Adapt styling
   - File: `components/feedback/Toast.tsx`

2. **Modal/Dialog** (1 hour)
   - Copy Dialog from music template
   - File: `components/feedback/Modal.tsx`

3. **Loading Spinner** (30 minutes)
   - Copy from trezoadmin
   - File: `components/feedback/LoadingSpinner.tsx`

---

### Phase 7: Data Display (Day 4 - 3 hours)

1. **Progress Bar** (1 hour)
   - Copy from trezoadmin
   - File: `components/data/ProgressBar.tsx`

2. **Simple List Table** (2 hours)
   - Simplify DataTable from music template
   - Focus on infinite scroll only
   - File: `components/data/SimpleTable.tsx`

---

## 📊 Effort Summary

| Phase | Components | Hours | Day |
|-------|------------|-------|-----|
| **Phase 1: Infrastructure** | Icon system, hooks | 2h | Day 1 |
| **Phase 2: Navigation** | Bottom nav, FAB, header | 4h | Day 1 |
| **Phase 3: Buttons** | 4 button variants | 3h | Day 2 |
| **Phase 4: Cards** | 3 card types | 4h | Day 2 |
| **Phase 5: Forms** | Input, search, select | 4h | Day 3 |
| **Phase 6: Feedback** | Toast, modal, spinner | 3h | Day 3 |
| **Phase 7: Data** | Progress, table | 3h | Day 4 |
| **TOTAL** | **28 components** | **23 hours** | **4 days** |

---

## ✅ Quality Checklist (Per Component)

Before marking a component as "complete", verify:

- [ ] **Mobile-first** - Works at 375px width
- [ ] **SVG icons** - No emojis, proper icon components
- [ ] **Accessible** - ARIA labels, keyboard navigation, screen reader
- [ ] **TypeScript** - Proper types, no `any`
- [ ] **Responsive** - Adapts to tablet/desktop
- [ ] **Performance** - <5ms render time, memoized if needed
- [ ] **Styled** - Uses globals.css classes, no inline styles
- [ ] **Tested** - Manual testing on iOS + Android Chrome

---

## 🚀 Priority Order (If Time Limited)

**Must-Have** (Week 1):
1. ✅ Icon system (20 SVG icons)
2. ✅ Bottom Tab Nav
3. ✅ Primary Button
4. ✅ Stats Card
5. ✅ Leaderboard Card
6. ✅ Text Input
7. ✅ Toast notification
8. ✅ Loading Spinner

**Nice-to-Have** (Week 2):
9. ✅ FAB Share Button
10. ✅ Badge Card
11. ✅ Select Dropdown
12. ✅ Modal/Dialog
13. ✅ Progress Bar
14. ✅ Icon Button

**Can Wait** (Week 3+):
15. Search Input (can use Text Input + icon)
16. Button Group (can use multiple buttons)
17. Secondary Button (can style Primary Button)
18. Simple Table (can use divs for now)
19. Empty State (can use text placeholder)
20. Top Header (bottom nav is priority)

---

## 📂 File Structure (After Implementation)

```
components/
├── icons/
│   ├── svg-icon.tsx (base component)
│   └── material/
│       ├── Home.tsx
│       ├── Leaderboard.tsx
│       ├── Person.tsx
│       ├── Share.tsx
│       ├── LocalFireDepartment.tsx
│       ├── Bolt.tsx
│       ├── EmojiEvents.tsx
│       ├── TrendingUp.tsx
│       ├── TrendingDown.tsx
│       ├── Search.tsx
│       ├── FilterList.tsx
│       ├── Close.tsx
│       ├── Menu.tsx
│       ├── ChevronLeft.tsx
│       ├── ChevronRight.tsx
│       ├── ExpandMore.tsx
│       ├── CheckCircle.tsx
│       ├── Error.tsx
│       ├── Info.tsx
│       └── Warning.tsx
├── navigation/
│   ├── BottomTabNav.tsx
│   ├── TopHeader.tsx
│   ├── Breadcrumbs.tsx
│   └── Tabs.tsx
├── buttons/
│   ├── PrimaryButton.tsx
│   ├── SecondaryButton.tsx
│   ├── IconButton.tsx
│   ├── ShareFAB.tsx
│   ├── ButtonGroup.tsx
│   └── LoadingButton.tsx
├── cards/
│   ├── StatsCard.tsx
│   ├── LeaderboardCard.tsx
│   ├── BadgeCard.tsx
│   ├── ProfileCard.tsx
│   └── ActionCard.tsx
├── forms/
│   ├── Input.tsx
│   ├── SearchInput.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── Radio.tsx
│   └── Switch.tsx
├── feedback/
│   ├── Toast.tsx
│   ├── Toaster.tsx
│   ├── Modal.tsx
│   ├── LoadingSpinner.tsx
│   └── EmptyState.tsx
├── data/
│   ├── ProgressBar.tsx
│   ├── SimpleTable.tsx
│   └── Pagination.tsx
└── lib/
    └── icons/
        └── create-svg-icon.tsx
```

---

## 🎨 Design Tokens (From Templates)

**Colors** (from trezoadmin):
```css
--primary: #6366f1; /* Indigo-500 */
--primary-hover: #4f46e5; /* Indigo-600 */
--success: #10b981; /* Green-500 */
--error: #ef4444; /* Red-500 */
--warning: #f59e0b; /* Amber-500 */
--info: #3b82f6; /* Blue-500 */
```

**Shadows** (from trezoadmin):
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.15);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.2);
```

**Border Radius** (from music template):
```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-full: 9999px;
```

**Spacing** (8px base):
```css
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
```

---

## 📝 Notes

**Why These Templates?**

1. **trezoadmin-41** (4,431 components):
   - Modern Tailwind + Material-UI dashboard
   - Production-ready, responsive, accessible
   - Perfect for stats cards, finance widgets, dashboards
   - **Best for**: Cards, buttons, navigation

2. **music** (2,647 components):
   - **1,998 SVG Material Design icons!** (HUGE WIN)
   - Complete form system (validation, accessibility)
   - Advanced data table with virtual scrolling
   - **Best for**: Icons, forms, tables, utilities

3. **gmeowbased0.6** (406 components):
   - Previous version patterns (know what worked)
   - Glass morphism effects (our brand)
   - **Best for**: Reference, brand consistency

4. **gmeowbasedv0.3** (489 components):
   - Sidenav patterns (can adapt to bottom nav)
   - Layout systems
   - **Best for**: Navigation patterns

**What We're NOT Using**:
- ❌ gmeowbasedv0.1, v0.2, v0.4, v0.5 (0 TSX files, likely old/incomplete)

---

## 🚨 Critical: NO EMOJIS

**Replace ALL emojis with SVG icons**:

| OLD (Emoji) | NEW (SVG Icon) | File |
|-------------|----------------|------|
| 🐾 | `<HomeIcon />` | material/Home.tsx |
| 📊 | `<LeaderboardIcon />` | material/Leaderboard.tsx |
| 👤 | `<PersonIcon />` | material/Person.tsx |
| 🎯 | `<ShareIcon />` | material/Share.tsx |
| 🔥 | `<LocalFireDepartmentIcon />` | material/LocalFireDepartment.tsx |
| ⚡ | `<BoltIcon />` | material/Bolt.tsx |
| 🏆 | `<EmojiEventsIcon />` | material/EmojiEvents.tsx |
| ✅ | `<CheckCircleIcon />` | material/CheckCircle.tsx |

**Why?**
- Professional appearance
- Consistent sizing across platforms
- Color customization
- Accessibility (screen readers)
- Better performance

---

**Selection Complete**: November 30, 2025  
**Next Step**: Start Phase 1 (Icon System - 2 hours)  
**Estimated Completion**: December 3, 2025 (4 days, 23 hours total)
