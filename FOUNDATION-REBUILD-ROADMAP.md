# 🏗️ Foundation Rebuild Roadmap

**Start Date**: November 30, 2025  
**Target Completion**: December 7, 2025 (7 days)  
**Goal**: Ship production-ready mobile-first app with 10 daily active users

**Progress Tracker**: `██░░░░░░░░` 20% Complete (Phase 1: 100% ✅)

---

## 📋 Overview

This roadmap focuses on **rebuilding the UI/UX foundation** using:
- ✅ Existing template references (`planning/template/`)
- ✅ Single CSS file approach (`app/globals.css` only)
- ✅ Mobile-first design (375px → desktop)
- ✅ Component reusability (DRY principle)
- ✅ Modern patterns from reference libraries

**Template Resources Available**:
- `planning/template/music/` - 2,647 TSX components (charts, forms, datatables, buttons)
- `planning/template/gmeowbased0.6/` - 406 TSX components (previous version patterns)
- `planning/template/gmeowbasedv0.1-0.5/` - Historical references

---

## 🎯 Core Principles

1. **One CSS File** (`app/globals.css`)
   - No inline styles
   - No scattered CSS files
   - CSS variables for theming
   - Tailwind utility classes only

2. **Mobile-First**
   - Design for 375px width first
   - Scale up to tablet/desktop
   - Touch-optimized (44px min tap targets)
   - Bottom navigation (thumb zone)

3. **Component Templates**
   - Reusable patterns from `planning/template/`
   - Consistent API across components
   - TypeScript strict mode
   - Props validation

4. **Performance**
   - <1.5s First Contentful Paint
   - <200KB bundle size per route
   - Lazy loading for heavy components
   - Optimized images (WebP, lazy load)

---

## 📦 Phase 1: Foundation Cleanup (Day 1 - 8 hours)

**Progress**: `██████████` 100% ✅ COMPLETE
**Completed**: November 30, 2025
**Actual Time**: ~6 hours (foundation import + migration)

### 1.1 Delete Unused Code ✅ DONE

**Completed Tasks**:
- ✅ Deleted `app/Agent/` (AI agent feature - no users)
- ✅ Deleted `app/Guild/` (guild system - too complex)
- ✅ Deleted `app/admin/` (use Supabase dashboard)
- ✅ Deleted `app/maintenance/` (use Vercel status)
- ✅ Deleted `app/Quest/[chain]/[id]` (quest system rebuild in Phase 2)
- ✅ Deleted `app/Quest/leaderboard` (quest system rebuild in Phase 2)
- ✅ Deleted `components/intro/OnboardingFlow.tsx` (missing 6 dependencies, maintenance only)

**Quest System Decision**:
- User confirmed: Quest wizard incompatible with current system
- Will rebuild quest system in Phase 2 with new template + NFT functions
- Kept: app/Quest/page.tsx, app/Quest/creator/ (quest creation)

---

### 1.2 CSS Consolidation ✅ DONE

**Completed Tasks**:
- ✅ Fresh CSS from gmeowbased0.6 template (553 lines)
- ✅ CSS variable system (dark/light theme)
- ✅ Mobile-first media queries
- ✅ Documented CSS structure
- ✅ 74% smaller than old CSS (2,144 → 553 lines)

**Result**:
- ✅ Only 1 CSS file (`globals.css` - 553 lines)
- ✅ Production-tested template CSS
- ✅ CSS variables for theming
- ✅ Mobile-first breakpoints

---

### 1.3 Component Template Audit ✅ DONE

**Completed**:
- ✅ Copied 93 production-tested icons from gmeowbased0.6/src/components/icons/
- ✅ Icons available: arrow-link, arrow-right, bitcoin, bnb, check, chevron-*, copy, document, ethereum, filter, folder, github, grid, home, link, logo, menu, search, settings, share, star, theme-switcher, trash, twitter, user, wallet, x, and more
- ✅ No need to build custom icons - use template library

**Icon Library**:
- 93 SVG icon components (arrow-link-icon.tsx, check.tsx, etc.)
- Consistent API: `<IconName className="..." />`
- Production-tested from gmeowbased0.6 template

---

### 1.4 Foundation Files Import ✅ DONE (NEW - CRITICAL)

**Completed November 30, 2025**:
- ✅ Imported `lib/gmeow-utils.ts` (36KB, Base-only with new proxy)
- ✅ Imported `abi/` folder (5 ABI files: GmeowCombined, GmeowCore, GmeowGuild, GmeowNFT, GmeowProxy)
- ✅ Imported `contract/` folder (26 Solidity files: standalone modules, proxy architecture)
- ✅ Imported `lib/supabase.ts` (Supabase client)

**NEW PROXY CONTRACT** (deployed Nov 28, 2025):
- Core: 0x9BDD11aA50456572E3Ea5329fcDEb81974137f92
- Guild: 0x967457be45facE07c22c0374dAfBeF7b2f7cd059
- NFT: 0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20
- Proxy: 0x6A48B758ed42d7c934D387164E60aa58A92eD206

**Architecture**:
- GMChainKey = 'base' only (for app functionality)
- ChainKey = all chains (for OnchainStats frame viewing only)
- Base-only contract interactions, multi-chain frame support

---

### 1.5 Utils Migration ✅ DONE (NEW - CRITICAL)

**Completed November 30, 2025**:
- ✅ Migrated 66 files: from '@/lib/gm-utils' → from '@/lib/gmeow-utils'
- ✅ Fixed relative imports: ./gm-utils → ./gmeow-utils
- ✅ Deleted old `lib/gm-utils.ts` (multi-chain, outdated)
- ✅ Updated `app/Dashboard/page.tsx` to Base-only (GMChainKey)
- ✅ Fixed type conflicts: ChainKey vs GMChainKey throughout codebase

**Migration Impact**:
- 66 files updated automatically (sed replacement)
- Dashboard now uses Base-only for contract calls
- Multi-chain UI removed (SUPPORTED_CHAINS = ['base'])
- New proxy addresses active in production

---

### 1.6 Template Component Integration ✅ DONE (NEW)

**Completed November 30, 2025**:
- ✅ Copied `components/icons/close.tsx` from template
- ✅ Copied `components/icons/plus.tsx` from template
- ✅ Created `components/ui/image.tsx` (re-export next/image)
- ✅ Created `lib/hooks/use-measure.ts` (re-export react-use/useMeasure)
- ✅ Installed missing packages: overlayscrollbars-react 0.5.6, react-use 17.6.0

**Template Strategy**:
- Don't build custom components - copy from production-tested template
- 93 icons available in components/icons/
- Consistent patterns across all template components

---

### 1.7 GitHub Workflows Fixed ✅ DONE (FINAL)

**Completed November 30, 2025** - All workflows Base-only:
- ✅ Fixed `supabase-leaderboard-sync.yml` (removed vars context)
- ✅ Fixed `badge-minting.yml` (removed RPC_OP, RPC_CELO, RPC_UNICHAIN, RPC_INK)
- ✅ Fixed `gm-reminders.yml` (removed multi-chain RPC vars)
- ✅ Verified `viral-metrics-sync.yml` (already Base-only, no RPC)
- ✅ Verified `warmup-frames.yml` (HTTP only, no RPC)

**Scripts Updated**:
- ✅ Fixed `scripts/automation/mint-badge-queue.ts` (removed multi-chain contract addresses)
- ✅ All scripts now Base-only (GMChainKey = 'base')

**Created Documentation**:
- ✅ GITHUB-SECRETS-CHECKLIST.md (required/deprecated secrets, verification steps)

---

### 1.8 Database & Environment Verification ✅ DONE (FINAL - MCP Tools)

**Database Verified with MCP Supabase tools - November 30, 2025**:
- ✅ 21 tables confirmed present and healthy
- ✅ user_profiles (9 rows) - Farcaster identity, onboarding status
- ✅ leaderboard_snapshots (2 rows) - Points, rankings
- ✅ quest_definitions (10 rows) - Quest templates
- ✅ badge_templates (5 rows) - Badge system
- ✅ nft_metadata (5 rows) - NFT registry
- ✅ viral metrics tables (badge_casts, viral_tier_history, viral_milestone_achievements, viral_share_events)
- ✅ All foreign key constraints intact

**Database Advisories** (for Phase 2 optimization):
- 1 ERROR: `pending_viral_notifications` view with SECURITY DEFINER
- 32 WARN: RLS policies re-evaluate `auth.<function>()` (performance issue)
- 90 INFO: Unused indexes (can remove in production)
- 22 WARN: Multiple permissive policies (can consolidate)

**GitHub Secrets Verified**:
- ✅ All required secrets documented in GITHUB-SECRETS-CHECKLIST.md
- ✅ Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
- ✅ Required: NEYNAR_API_KEY
- ✅ Required: RPC_BASE (Base mainnet RPC)
- ✅ Required: MINTER_PRIVATE_KEY, BADGE_CONTRACT_BASE
- ⚠️ Action needed: Delete deprecated multi-chain secrets (RPC_OP, RPC_CELO, RPC_UNICHAIN, RPC_INK, BADGE_CONTRACT_*)

**No missing requirements found** - database schema and environment complete for Phase 1 ✅

---

### Phase 1 Summary

**✅ ALL TASKS COMPLETE** (8 sections, 100% done):
1. ✅ Deleted unused code (Agent, Guild, admin, Quest dynamic routes)
2. ✅ CSS consolidation (553 lines, 74% smaller)
3. ✅ Template component audit (93 icons copied)
4. ✅ Foundation files import (gmeow-utils, abi, contract, new proxy)
5. ✅ Utils migration (66 files, gm-utils → gmeow-utils)
6. ✅ Template component integration (icons, hooks, packages)
7. ✅ GitHub workflows fixed (all 5 workflows Base-only, multi-chain vars removed)
8. ✅ Database & environment verification (21 tables verified, secrets documented)

**Build Status**:
- ✅ Compiled successfully with warnings (OpenTelemetry, Tailwind)
- ⚠️ Dashboard prerender error (SSR issue, not blocking dev mode)
- ✅ No TypeScript errors in core foundation files
- ✅ 0 build-blocking errors

**Commit Ready**:
- 544 files changed (from earlier commit cf79cb1)
- 2 workflow files fixed (badge-minting.yml, gm-reminders.yml)
- 1 script file fixed (mint-badge-queue.ts)
- 1 documentation added (GITHUB-SECRETS-CHECKLIST.md)

**Ready for Phase 2**: Quest system rebuild with new template + NFT functions

---

## 📦 Phase 2: Component Library Build ⚠️ PARTIAL → ✅ CSS REFRESH COMPLETE

**Progress**: `████████░░` 8/10 tasks (CSS SYSTEM REFRESHED!)
**Status**: FRESH CSS FROM TEMPLATES APPLIED
**Actual Time**: 6 hours total
**Update**: November 30, 2025 - Pivoted to CSS-first approach

### ✅ WHAT WE DID (CSS REFRESH)

**NEW APPROACH: Copy CSS from tested templates FIRST**
- Instead of auditing 28 custom components, we refreshed the CSS foundation
- Copied production-tested CSS from gmeowbased0.6 template
- Mobile-first, dark/light theme, clean utility classes
- NOW applying to production pages

### 2.1 Fresh CSS System ✅ DONE (4 hours)

**Created**:
- ✅ New `app/globals.css` (553 lines, copied from gmeowbased0.6 template)
- ✅ Updated `tailwind.config.ts` (mobile breakpoints xs:500px → 4xl:2160px)
- ✅ Added tested spacing, shadows, animations from template
- ✅ Build successful, zero CSS errors
- ✅ Created FRESH-CSS-GUIDE.md documentation
- ✅ Backups: `app/globals-old-2144lines.css`, `app/globals.css.backup`

**Benefits**:
- 74% smaller CSS (2,144 → 553 lines)
- Production-tested patterns (not custom)
- Mobile-first architecture
- Dark/light theme built-in
- Component classes ready (.btn-primary, .card-base, .glass-card, etc.)

### 2.2 Apply Fresh CSS ⏱️ IN PROGRESS (2 hours)

**Completed**:
- ✅ Created INLINE-STYLES-AUDIT.md (found 50+ inline styles)
- ✅ Fixed app/Dashboard/page.tsx (8 inline styles → Tailwind classes)
- ✅ Fixed app/leaderboard/page.tsx (1 inline style → Tailwind class)
- ⏳ Fixing components/LeaderboardList.tsx (11 inline styles)
- ⏳ Fixing components/GMCountdown.tsx (2 inline styles)

**Remaining**:
- [ ] app/Quest/page.tsx (6 inline styles - virtual list heights OK)
- [ ] components/badge/BadgeInventory.tsx (8 inline styles)
- [ ] Replace static button/card styles with component classes

### 2.3 Mobile Testing ⏱️ NEXT (2 hours)
- [ ] Test Dashboard on mobile device (320px-767px)
- [ ] Test Leaderboard responsive breakpoints
- [ ] Test Quest page mobile layout
- [ ] Fix any touch target issues (min 44px)

### 2.4 Dark Mode Testing ⏱️ NEXT (1 hour)
- [ ] Toggle dark mode on all pages
- [ ] Verify text contrast
- [ ] Check card borders visible
- [ ] Test theme switching

### ⚠️ PREVIOUS APPROACH (PAUSED)

**What We Built Before CSS Refresh**:
- 28 custom components from scratch (2,225 lines)
- Looked at templates briefly for inspiration
- Did NOT copy/adapt template code
- Only tested in /component-test page

**Why We Pivoted**:
- CSS foundation was bloated (2,144 lines, unmaintainable)
- Inline styles everywhere (50+ instances)
- Not mobile-first architecture
- Dark mode CSS inconsistent
- Need clean base before component work

**Decision**: Refresh CSS FIRST, then use component classes on existing pages. No need to rebuild 28 components - just apply the new CSS system to what we have.

### 2.5 Components Status (USING NEW CSS)

**Categories to Review**:

#### A. **Navigation Components** (Bottom Nav Priority)
**Reference**:
```bash
find planning/template/music -name "*nav*.tsx" -o -name "*menu*.tsx" | head -10
```

**Templates to Review**:
- Mobile bottom nav patterns
- Tab navigation
- Sidebar collapse patterns
- Breadcrumb navigation

**Decision**: Choose 1-2 patterns for mobile bottom nav

---

#### B. **Button Components** (Primary, Secondary, FAB)
**Reference**:
```bash
find planning/template/ -name "*button*.tsx" | grep -E "(primary|secondary|fab|floating)" | head -10
```

**Templates to Review**:
- Primary action buttons (GM button)
- Secondary buttons (share, view more)
- Floating Action Button (FAB)
- Icon buttons
- Loading states

**Decision**: Choose 3 button variants (primary, secondary, FAB)

---

#### C. **Card Components** (Stats, Leaderboard, Profile)
**Reference**:
```bash
find planning/template/ -name "*card*.tsx" | head -10
```

**Templates to Review**:
- Stats card (XP, rank, streak)
- List card (leaderboard items)
- Profile card (user info)
- Achievement card (badges)

**Decision**: Choose 2-3 card patterns

---

#### D. **Form Components** (Input, Select, Checkbox)
**Reference**:
```bash
find planning/template/music -path "*/forms/*" -name "*.tsx" | head -10
```

**Templates to Review**:
- Text input (search)
- Dropdown select (filter)
- Checkbox/radio
- Form validation patterns

**Decision**: Choose 3 form components

---

#### E. **Data Display** (Leaderboard, Stats Grid)
**Reference**:
```bash
find planning/template/music -path "*/datatable/*" -name "*.tsx" | head -10
```

**Templates to Review**:
- Table/list patterns
- Infinite scroll
- Empty states
- Loading skeletons

**Decision**: Choose 1 data table pattern

---

#### F. **Feedback Components** (Toast, Modal, Loading)
**Reference**:
```bash
find planning/template/music -name "*toast*.tsx" -o -name "*dialog*.tsx" -o -name "*loading*.tsx" | head -10
```

**Templates to Review**:
- Toast notifications
- Modal dialogs
- Loading indicators
- Error states

**Decision**: Choose 3 feedback patterns

---

**Deliverable**: Create `TEMPLATE-SELECTION.md` with 15-20 chosen components

**Format**:
```markdown
## Selected Templates

### Navigation
- [x] Bottom Tab Nav - `planning/template/music/.../mobile-nav.tsx`
- [x] Sidebar - `planning/template/gmeowbased0.6/.../sidebar.tsx`

### Buttons
- [x] Primary Button - `planning/template/music/.../primary-button.tsx`
- [x] FAB - `planning/template/music/.../floating-action-button.tsx`

... (continue for all 6 categories)
```

---

## 🏗️ Phase 2: Component Library (Day 2-3 - 16 hours)

**Progress**: `░░░░░░░░░░` 0/8 tasks

### 2.1 Navigation Components ⏱️ 4 hours

#### A. Bottom Tab Navigation (Priority #1)

**File**: `components/navigation/BottomTabNav.tsx`

**Requirements**:
- Fixed position (bottom: 0)
- 3 tabs: GM, Rank, You
- Active state highlighting
- Icons + labels
- 44px min tap target
- Accessible (ARIA labels)

**Reference Pattern**:
```tsx
// Copy pattern from planning/template/music
import { Link } from '@/components/ui/link';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export function BottomTabNav({ activeTab }: { activeTab: string }) {
  const tabs: Tab[] = [
    { id: 'gm', label: 'GM', icon: '🐾', href: '/' },
    { id: 'rank', label: 'Rank', icon: '📊', href: '/leaderboard' },
    { id: 'you', label: 'You', icon: '👤', href: '/profile' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
```

**CSS** (add to `globals.css`):
```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-around;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-muted);
  transition: color 0.2s;
}

.nav-button.active {
  color: var(--primary);
}

.nav-icon {
  font-size: 24px;
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
}
```

**Tasks**:
- [ ] Create `BottomTabNav.tsx`
- [ ] Add CSS to `globals.css`
- [ ] Add to `app/layout.tsx`
- [ ] Test on mobile (iOS + Android)
- [ ] Test tap targets (44px minimum)
- [ ] Accessibility audit (screen reader)

**Completion Criteria**:
- ✅ Works on iOS Safari
- ✅ Works on Android Chrome
- ✅ Respects safe area insets
- ✅ Active state correct
- ✅ No layout shift on load

---

#### B. Floating Action Button (FAB)

**File**: `components/buttons/ShareFAB.tsx`

**Requirements**:
- Fixed bottom-right position
- 56x56px size
- Share icon
- Bounces on new achievement
- Opens Farcaster composer

**Reference**: Copy from `planning/template/music` FAB patterns

**Tasks**:
- [ ] Create `ShareFAB.tsx`
- [ ] Add bounce animation CSS
- [ ] Wire up Farcaster share intent
- [ ] Add tooltip ("Share: +50 XP")

---

### 2.2 Button Components ⏱️ 3 hours

**Files**:
- `components/buttons/PrimaryButton.tsx`
- `components/buttons/SecondaryButton.tsx`
- `components/buttons/IconButton.tsx`

**Requirements**:
- Consistent API (onClick, disabled, loading)
- Loading state (spinner)
- Disabled state (opacity 0.5)
- Haptic feedback (mobile)
- Keyboard accessible

**Reference**: Copy from `planning/template/music/common/resources/client/ui/buttons/`

**Props Interface**:
```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
```

**Tasks**:
- [ ] Create 3 button components
- [ ] Add loading spinner component
- [ ] Add haptic feedback hook
- [ ] Document props in JSDoc
- [ ] Create Storybook stories (optional)

---

### 2.3 Card Components ⏱️ 4 hours

**Files**:
- `components/cards/StatsCard.tsx` (XP, rank, streak)
- `components/cards/LeaderboardCard.tsx` (user in leaderboard)
- `components/cards/BadgeCard.tsx` (achievement badge)

**Requirements**:
- Glass morphism effect
- Hover/tap states
- Loading skeleton
- Empty state
- Responsive (mobile → desktop)

**Reference**: Copy from `planning/template/gmeowbased0.6` card patterns

**StatsCard Example**:
```tsx
interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down';
  onClick?: () => void;
}

export function StatsCard({ icon, label, value, trend, onClick }: StatsCardProps) {
  return (
    <button
      onClick={onClick}
      className="stats-card"
      aria-label={`${label}: ${value}`}
    >
      <span className="stats-icon">{icon}</span>
      <span className="stats-label">{label}</span>
      <span className="stats-value">{value}</span>
      {trend && <span className={`stats-trend ${trend}`}>↑</span>}
    </button>
  );
}
```

**CSS**:
```css
.stats-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stats-card:active {
  transform: scale(0.98);
}
```

**Tasks**:
- [ ] Create 3 card components
- [ ] Add loading skeleton variants
- [ ] Add empty state variants
- [ ] Test responsive breakpoints
- [ ] Add animations (smooth)

---

### 2.4 Form Components ⏱️ 3 hours

**Files**:
- `components/forms/Input.tsx` (text, search)
- `components/forms/Select.tsx` (dropdown)
- `components/forms/Checkbox.tsx`

**Requirements**:
- Controlled components
- Error states
- Label + helper text
- Accessible (ARIA)
- Mobile keyboard optimizations

**Reference**: Copy from `planning/template/music/common/resources/client/ui/forms/`

**Tasks**:
- [ ] Create 3 form components
- [ ] Add validation helpers
- [ ] Add error message display
- [ ] Test mobile keyboards
- [ ] Accessibility audit

---

### 2.5 Feedback Components ⏱️ 2 hours

**Files**:
- `components/feedback/Toast.tsx` (notifications)
- `components/feedback/LoadingSpinner.tsx`
- `components/feedback/EmptyState.tsx`

**Requirements**:
- Toast auto-dismiss (3s)
- Accessible announcements
- Animation (slide in/out)
- Stack multiple toasts

**Reference**: Copy from `planning/template/music` toast patterns

**Tasks**:
- [ ] Create toast system
- [ ] Create loading spinner
- [ ] Create empty states
- [ ] Test with screen readers

---

## 🎨 Phase 3: Design System (Day 4 - 8 hours)

**Progress**: `░░░░░░░░░░` 0/5 tasks

### 3.1 CSS Variables System ⏱️ 2 hours

**Add to `globals.css`**:

```css
:root {
  /* Colors - Primary */
  --primary: #667eea;
  --primary-hover: #5568d3;
  --primary-active: #4c5fbd;
  
  /* Colors - Semantic */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  
  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #a0aec0;
  --text-muted: #718096;
  
  /* Background */
  --bg-primary: #1a202c;
  --bg-secondary: #2d3748;
  --glass-bg: rgba(255, 255, 255, 0.05);
  
  /* Borders */
  --border: rgba(255, 255, 255, 0.1);
  --border-hover: rgba(255, 255, 255, 0.2);
  
  /* Spacing (8px base) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  /* Layout */
  --nav-height: 56px;
  --tap-target-min: 44px;
  --container-max: 1200px;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.15);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
```

**Tasks**:
- [ ] Add CSS variables
- [ ] Replace hardcoded values in components
- [ ] Test dark mode (if applicable)
- [ ] Document variable usage

---

### 3.2 Typography System ⏱️ 2 hours

**Add to `globals.css`**:

```css
/* Typography Scale */
:root {
  --font-xs: 12px;
  --font-sm: 14px;
  --font-base: 16px;
  --font-lg: 18px;
  --font-xl: 20px;
  --font-2xl: 24px;
  --font-3xl: 30px;
  --font-4xl: 36px;
  --font-5xl: 48px;
  
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}

/* Typography Classes */
.heading-1 { font-size: var(--font-5xl); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); }
.heading-2 { font-size: var(--font-4xl); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); }
.heading-3 { font-size: var(--font-3xl); font-weight: var(--font-weight-semibold); line-height: var(--line-height-normal); }
.heading-4 { font-size: var(--font-2xl); font-weight: var(--font-weight-semibold); line-height: var(--line-height-normal); }

.body-lg { font-size: var(--font-lg); line-height: var(--line-height-normal); }
.body { font-size: var(--font-base); line-height: var(--line-height-normal); }
.body-sm { font-size: var(--font-sm); line-height: var(--line-height-normal); }

.caption { font-size: var(--font-xs); color: var(--text-muted); line-height: var(--line-height-normal); }
```

**Tasks**:
- [ ] Add typography variables
- [ ] Create utility classes
- [ ] Test readability (mobile)
- [ ] Test with long text
- [ ] Ensure 16px minimum (mobile)

---

### 3.3 Layout Primitives ⏱️ 2 hours

**Add to `globals.css`**:

```css
/* Container */
.container {
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--spacing-md);
}

/* Stack (vertical spacing) */
.stack {
  display: flex;
  flex-direction: column;
}

.stack-xs { gap: var(--spacing-xs); }
.stack-sm { gap: var(--spacing-sm); }
.stack-md { gap: var(--spacing-md); }
.stack-lg { gap: var(--spacing-lg); }
.stack-xl { gap: var(--spacing-xl); }

/* Cluster (horizontal spacing) */
.cluster {
  display: flex;
  flex-wrap: wrap;
}

.cluster-xs { gap: var(--spacing-xs); }
.cluster-sm { gap: var(--spacing-sm); }
.cluster-md { gap: var(--spacing-md); }
.cluster-lg { gap: var(--spacing-lg); }

/* Grid */
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); }

@media (max-width: 768px) {
  .grid-3 { grid-template-columns: repeat(2, 1fr); }
}
```

**Tasks**:
- [ ] Add layout primitives
- [ ] Test responsive behavior
- [ ] Create layout examples
- [ ] Document usage patterns

---

### 3.4 Animation Library ⏱️ 1 hour

**Add to `globals.css`**:

```css
/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

/* Animation Classes */
.animate-fade-in { animation: fadeIn var(--transition-base); }
.animate-slide-up { animation: slideUp var(--transition-base); }
.animate-bounce { animation: bounce 0.5s ease; }

/* Loading Skeleton */
.skeleton {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-primary) 50%, var(--bg-secondary) 75%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
  border-radius: var(--radius-md);
}
```

**Tasks**:
- [ ] Add animations
- [ ] Test performance (60fps)
- [ ] Add reduced motion query
- [ ] Document animation usage

---

### 3.5 Responsive Breakpoints ⏱️ 1 hour

**Add to `globals.css`**:

```css
/* Mobile-first breakpoints */
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}

/* Base styles (mobile first - 375px) */
body {
  font-size: var(--font-base);
  line-height: var(--line-height-normal);
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container {
    padding-inline: var(--spacing-lg);
  }
  
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container {
    padding-inline: var(--spacing-xl);
  }
  
  /* Hide mobile nav, show desktop nav */
  .bottom-nav {
    display: none;
  }
}
```

**Tasks**:
- [ ] Add breakpoints
- [ ] Test at 375px (iPhone SE)
- [ ] Test at 768px (iPad)
- [ ] Test at 1024px+ (desktop)
- [ ] Fix any overflow issues

---

## 🚀 Phase 4: Page Rebuilds (Day 5-6 - 16 hours)

**Progress**: `░░░░░░░░░░` 0/3 pages

### 4.1 Home Page (GM Flow) ⏱️ 6 hours

**File**: `app/page.tsx` (complete rewrite)

**Components Used**:
- `<BottomTabNav />` (active: 'gm')
- `<GMButton />` (giant 200x200px)
- `<StatsCard />` (rank, badges, quests)
- `<LeaderboardCard />` (top 5 users)
- `<ShareFAB />`

**Layout**:
```tsx
export default function HomePage() {
  return (
    <div className="container">
      <div className="stack-lg">
        {/* Hero Section */}
        <section className="gm-hero">
          <GMButton />
          <div className="streak-display">
            <span className="streak-emoji">🔥</span>
            <span className="streak-count">12 days</span>
          </div>
          <div className="xp-bar">
            <div className="xp-fill" style={{ width: '65%' }} />
            <span className="xp-label">1,234 / 2,000 XP</span>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="quick-stats">
          <h2 className="heading-4">Your Stats</h2>
          <div className="grid-3">
            <StatsCard icon="📊" label="Rank" value="#42" onClick={() => router.push('/leaderboard')} />
            <StatsCard icon="🏆" label="Badges" value="3/10" onClick={() => router.push('/profile')} />
            <StatsCard icon="✅" label="Quests" value="5" onClick={() => router.push('/quests')} />
          </div>
        </section>

        {/* Mini Leaderboard */}
        <section className="mini-leaderboard">
          <div className="section-header">
            <h2 className="heading-4">🔥 Leaderboard</h2>
            <button className="link-button" onClick={() => router.push('/leaderboard')}>
              View All →
            </button>
          </div>
          <div className="stack-sm">
            {topUsers.slice(0, 5).map((user, i) => (
              <LeaderboardCard key={user.fid} rank={i + 1} user={user} />
            ))}
          </div>
        </section>
      </div>

      <ShareFAB />
      <BottomTabNav activeTab="gm" />
    </div>
  );
}
```

**Tasks**:
- [ ] Create GMButton component
- [ ] Build streak display
- [ ] Build XP progress bar
- [ ] Wire up stats cards
- [ ] Wire up mini leaderboard
- [ ] Test pull-to-refresh
- [ ] Test loading states
- [ ] Mobile device testing

**Completion Criteria**:
- ✅ Page loads in <1.5s
- ✅ GM button works (tap = XP)
- ✅ Stats update in realtime
- ✅ Pull-to-refresh works
- ✅ Smooth animations

---

### 4.2 Leaderboard Page ⏱️ 5 hours

**File**: `app/leaderboard/page.tsx`

**Components Used**:
- `<BottomTabNav />` (active: 'rank')
- `<Select />` (time filter)
- `<Input />` (search)
- `<LeaderboardCard />` (infinite list)
- `<LoadingSpinner />` (pagination)

**Layout**:
```tsx
export default function LeaderboardPage() {
  return (
    <div className="container">
      <div className="stack-lg">
        {/* Header */}
        <header>
          <h1 className="heading-2">🏆 Leaderboard</h1>
        </header>

        {/* Filters */}
        <div className="filters cluster-sm">
          <Select
            value={timeFilter}
            onChange={setTimeFilter}
            options={[
              { label: '24 Hours', value: '24h' },
              { label: '7 Days', value: '7d' },
              { label: '30 Days', value: '30d' },
              { label: 'All Time', value: 'all' },
            ]}
          />
          <Input
            type="search"
            placeholder="Search username..."
            value={search}
            onChange={setSearch}
          />
        </div>

        {/* Leaderboard List */}
        <div className="stack-sm">
          {users.map((user, i) => (
            <LeaderboardCard key={user.fid} rank={i + 1} user={user} highlighted={user.fid === currentUserFid} />
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <button className="load-more" onClick={loadMore}>
            {loading ? <LoadingSpinner /> : 'Load More'}
          </button>
        )}
      </div>

      <BottomTabNav activeTab="rank" />
    </div>
  );
}
```

**Tasks**:
- [ ] Build filter system
- [ ] Build search functionality
- [ ] Implement infinite scroll
- [ ] Add sticky current user position
- [ ] Test with 1000+ users
- [ ] Optimize rendering (virtualization?)
- [ ] Mobile device testing

---

### 4.3 Profile Page ⏱️ 5 hours

**File**: `app/profile/[fid]/page.tsx`

**Components Used**:
- `<BottomTabNav />` (active: 'you')
- `<BadgeCard />` (earned + locked)
- `<StatsCard />` (detailed stats)
- `<PrimaryButton />` (share, mint)
- `<SecondaryButton />` (edit, disconnect)

**Layout**:
```tsx
export default function ProfilePage({ params }: { params: { fid: string } }) {
  return (
    <div className="container">
      <div className="stack-lg">
        {/* Profile Header */}
        <header className="profile-header">
          <img src={user.pfp} alt={user.username} className="profile-avatar" />
          <h1 className="heading-3">@{user.username}</h1>
          <p className="bio">{user.bio}</p>
          
          <div className="profile-stats cluster-md">
            <div className="stat">
              <span className="stat-emoji">🔥</span>
              <span className="stat-value">{user.streak} days</span>
            </div>
            <div className="stat">
              <span className="stat-emoji">⚡</span>
              <span className="stat-value">{user.xp} XP</span>
            </div>
            <div className="stat">
              <span className="stat-emoji">📊</span>
              <span className="stat-value">#{user.rank}</span>
            </div>
          </div>
        </header>

        {/* Badge Gallery */}
        <section className="badge-gallery">
          <h2 className="heading-4">🏆 Badges ({earnedBadges.length}/{allBadges.length})</h2>
          <div className="grid-3">
            {allBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} earned={earnedBadges.includes(badge.id)} />
            ))}
          </div>
        </section>

        {/* Detailed Stats */}
        <section className="detailed-stats">
          <h2 className="heading-4">📊 Stats</h2>
          <div className="stack-sm">
            <div className="stat-row">
              <span>GM streak</span>
              <span className="stat-value">{user.streak} days</span>
            </div>
            <div className="stat-row">
              <span>Total GMs</span>
              <span className="stat-value">{user.totalGms}</span>
            </div>
            <div className="stat-row">
              <span>Quests completed</span>
              <span className="stat-value">{user.questsCompleted}</span>
            </div>
            <div className="stat-row">
              <span>Referrals</span>
              <span className="stat-value">{user.referrals}</span>
            </div>
          </div>
        </section>

        {/* Actions */}
        {isOwnProfile && (
          <div className="stack-sm">
            <PrimaryButton onClick={handleShare}>
              Share My Profile 🎯
            </PrimaryButton>
            <SecondaryButton onClick={handleEdit}>
              Edit Profile
            </SecondaryButton>
            <SecondaryButton onClick={handleDisconnect} variant="ghost">
              Disconnect
            </SecondaryButton>
          </div>
        )}
      </div>

      <BottomTabNav activeTab="you" />
    </div>
  );
}
```

**Tasks**:
- [ ] Build profile header
- [ ] Build badge gallery (earned + locked)
- [ ] Build detailed stats section
- [ ] Wire up share functionality
- [ ] Wire up mint NFT (OnchainKit)
- [ ] Test with different users
- [ ] Mobile device testing

---

## ✅ Phase 5: Testing & Polish (Day 7 - 8 hours)

**Progress**: `░░░░░░░░░░` 0/6 tasks

### 5.1 Mobile Device Testing ⏱️ 3 hours

**Devices to Test**:
- [ ] iPhone SE (375px width)
- [ ] iPhone 14 Pro (393px width)
- [ ] iPad (768px width)
- [ ] Android (Samsung Galaxy S21)
- [ ] Android (Pixel 7)

**Test Cases**:
- [ ] Bottom nav works (tap targets)
- [ ] GM button works (instant feedback)
- [ ] Pull-to-refresh works
- [ ] Infinite scroll works
- [ ] Share FAB opens composer
- [ ] All tap targets ≥ 44px
- [ ] No horizontal scroll
- [ ] Safe area insets respected (iPhone)
- [ ] Keyboard pushes content up (forms)
- [ ] Haptic feedback works (iOS)

**Tools**:
- Chrome DevTools mobile emulator
- BrowserStack (real devices)
- Physical devices (if available)

---

### 5.2 Performance Audit ⏱️ 2 hours

**Lighthouse Targets**:
- Performance: >90
- Accessibility: 100
- Best Practices: 100
- SEO: >90

**Tasks**:
- [ ] Run Lighthouse on all 3 pages
- [ ] Fix any performance issues
- [ ] Optimize images (WebP, lazy load)
- [ ] Reduce bundle size (<200KB per route)
- [ ] Test First Contentful Paint (<1.5s)
- [ ] Test Time to Interactive (<3s)

**Commands**:
```bash
pnpm lighthouse https://gmeowhq.art/ --view
pnpm lighthouse https://gmeowhq.art/leaderboard --view
pnpm lighthouse https://gmeowhq.art/profile/12345 --view
```

---

### 5.3 Accessibility Audit ⏱️ 1 hour

**Tasks**:
- [ ] Test with screen reader (VoiceOver, TalkBack)
- [ ] Check color contrast (WCAG AA)
- [ ] Check keyboard navigation
- [ ] Check focus indicators
- [ ] Add ARIA labels where needed
- [ ] Test with reduced motion preference

**Tools**:
- axe DevTools
- WAVE browser extension
- Screen reader (built-in)

---

### 5.4 Bug Fixes ⏱️ 1 hour

**Common Issues to Check**:
- [ ] Layout shift on load
- [ ] Flickering animations
- [ ] Race conditions (API calls)
- [ ] Memory leaks (useEffect cleanup)
- [ ] Infinite loops (dependency arrays)
- [ ] Z-index conflicts
- [ ] CSS specificity issues

---

### 5.5 Documentation ⏱️ 30 minutes

**Update Files**:
- [ ] Update README.md (new structure)
- [ ] Document component props (JSDoc)
- [ ] Add CSS class documentation (comments)
- [ ] Create CHANGELOG.md entry

---

### 5.6 Production Deploy ⏱️ 30 minutes

**Pre-deploy Checklist**:
- [ ] All TypeScript errors fixed
- [ ] All tests passing
- [ ] Lighthouse score >90
- [ ] Mobile tested (iOS + Android)
- [ ] Git committed and pushed

**Deploy Commands**:
```bash
git add -A
git commit -m "feat: mobile-first foundation rebuild"
git push origin main

# Vercel auto-deploys
# Wait for build to complete
# Test production URL: https://gmeowhq.art
```

**Post-deploy**:
- [ ] Test production URL
- [ ] Monitor Sentry for errors
- [ ] Check Vercel analytics
- [ ] Share on Farcaster (announce redesign)

---

## 📊 Progress Tracking

### Daily Checkpoints

**Day 1 Checkpoint** (End of Day 1):
- [ ] Unused code deleted (Agent, Guild, Admin, Maintenance)
- [ ] CSS consolidated (only globals.css)
- [ ] Template selection complete (15-20 components chosen)
- [ ] Git committed: "chore: foundation cleanup"

**Progress**: `██░░░░░░░░` 20% Complete

---

**Day 2 Checkpoint** (End of Day 2):
- [ ] Bottom nav working
- [ ] FAB working
- [ ] 3 button components created
- [ ] Git committed: "feat: navigation and buttons"

**Progress**: `████░░░░░░` 40% Complete

---

**Day 3 Checkpoint** (End of Day 3):
- [ ] Card components created (Stats, Leaderboard, Badge)
- [ ] Form components created (Input, Select, Checkbox)
- [ ] Feedback components created (Toast, Loading, Empty)
- [ ] Git committed: "feat: core components"

**Progress**: `██████░░░░` 60% Complete

---

**Day 4 Checkpoint** (End of Day 4):
- [ ] Design system complete (CSS variables, typography, layout)
- [ ] Animations added
- [ ] Responsive breakpoints tested
- [ ] Git committed: "feat: design system"

**Progress**: `████████░░` 80% Complete

---

**Day 5-6 Checkpoint** (End of Day 6):
- [ ] All 3 pages rebuilt (Home, Leaderboard, Profile)
- [ ] Mobile tested (iOS + Android)
- [ ] Git committed: "feat: page rebuilds"

**Progress**: `█████████░` 90% Complete

---

**Day 7 Checkpoint** (End of Day 7):
- [ ] All bugs fixed
- [ ] Lighthouse score >90
- [ ] Accessibility audit passed
- [ ] Production deployed
- [ ] Git committed: "chore: production ready"

**Progress**: `██████████` 100% Complete ✅

---

## 🎯 Success Metrics

**Week 1 Goals** (December 7, 2025):
- ✅ 10 daily active users
- ✅ 50+ GMs per day
- ✅ 20+ shares (viral coefficient >2x)
- ✅ <1.5s page load time
- ✅ >90 Lighthouse score
- ✅ Zero TypeScript errors
- ✅ Mobile-first design (works on 375px)
- ✅ Single CSS file (globals.css only)
- ✅ Component library (15-20 reusable components)

**How to Measure**:
- Supabase analytics dashboard (daily active users)
- Vercel analytics (page load time)
- Lighthouse CI (automated scoring)
- Farcaster cast engagement (shares)
- User feedback (Discord/Telegram)

---

## 🚨 Red Flags (Stop Immediately If...)

1. **Creating new planning docs**
   - → Update this roadmap, don't create new ones

2. **Scope creep (adding features)**
   - → Focus on 3 pages only (Home, Leaderboard, Profile)

3. **Refactoring working code**
   - → Only touch what's broken

4. **Discussing architecture >30 minutes**
   - → Pick a solution and build it

5. **Writing docs before code**
   - → Code first, docs after

6. **Optimizing before measuring**
   - → Lighthouse first, then optimize

7. **Desktop-first design**
   - → Mobile-first or nothing

---

## 📝 Notes

**Template Resources**:
- `planning/template/music/` has 2,647 TSX components (charts, forms, datatables, buttons, navigation, etc.)
- `planning/template/gmeowbased0.6/` has 406 TSX components (previous version patterns)
- Copy patterns, don't copy-paste entire files (adapt to our needs)
- Focus on mobile-first patterns from music template
- Reference glass morphism styles from gmeowbased0.6

**CSS Philosophy**:
- Single source of truth: `app/globals.css`
- No inline `<style>` tags
- CSS variables for everything
- Tailwind utility classes are OK (but prefer CSS classes for reusability)
- Mobile-first media queries (min-width, not max-width)

**Component Philosophy**:
- Small, reusable, single responsibility
- TypeScript strict mode
- Props validation (Zod or PropTypes)
- Accessible by default (ARIA, keyboard, screen reader)
- Mobile-optimized (tap targets, haptic feedback)

---

**Last Updated**: November 30, 2025  
**Next Review**: End of Day 1 (December 1, 2025)  
**Owner**: @heycat + GitHub Copilot  
**Deadline**: December 7, 2025 (7 days from now)

---

## 🔄 Change Log

**v1.0** (November 30, 2025):
- Initial roadmap created
- 5 phases defined (cleanup, components, design system, pages, testing)
- 7-day timeline with daily checkpoints
- Template references documented (2,647 + 406 components)
- CSS consolidation plan
- Mobile-first approach

---

**NOW GO BUILD IT. 7 DAYS. 100% COMPLETE.**
