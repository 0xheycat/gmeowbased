# UI/UX Restructuring Plan - Gmeowbased Foundation Rebuild

**Date**: 2025-11-30  
**Branch**: foundation-rebuild  
**Focus**: Major UI/UX restructure for Farcaster miniapps & base.dev integration  
**Target Scope**: Quest Wizard, Dashboard, Profile pages

---

## 🎯 Executive Summary

This plan outlines a comprehensive UI/UX restructuring of Gmeowbased's core user-facing components with focus on:
1. Farcaster miniapp optimization
2. base.dev integration best practices
3. Mobile-first responsive design
4. Component library standardization with 6 core templates
5. Performance optimization
6. Accessibility (WCAG 2.1 AA)

**Estimated Timeline**: 4-6 weeks (120-150 hours)  
**Risk Level**: Medium (iterative approach minimizes disruption)  
**ROI**: High (improved UX = better retention, conversion, engagement)

---

## 📊 Current State Analysis

### Component Inventory (As Of Nov 30, 2025)

**✅ Well-Structured Components:**
- Quest Wizard (323 lines) - Good foundation, needs UX polish
- ProfileStats (compact) - Solid, needs mobile refinement
- OnchainStats - Recently fixed, working well
- MobileNavigation - Good base, needs expansion
- ConnectWallet - Solid wallet integration

**⚠️ Needs Attention:**
- Dashboard layout - Lacks responsive breakpoints
- Profile page - Limited Farcaster miniapp optimization
- Quest display cards - Inconsistent styling
- Leaderboard - Mobile experience needs work

**❌ Missing Components:**
- Unified design system
- Consistent icon library
- Standardized time/date formatting
- Loading states library
- Error boundaries for each section

### Current Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v3 (staying, v4 deferred to Q2 2026)
- **UI Components**: Custom pixel/retro aesthetic
- **Wallet**: Wagmi + OnchainKit (Quest only, expanding)
- **Farcaster**: Neynar SDK + official SDK
- **State**: React Context + Server Components
- **Database**: Supabase (PostgreSQL)

---

## 🎨 Design System Foundation

### 6 Core Template Categories

#### Template 1: **Card Layouts** 🃏
**Purpose**: Display items in grid/list format  
**Use Cases**: Quest cards, profile badges, leaderboard entries, achievement cards

**Variants**:
- **QuestCard** (Yu-Gi-Oh style) - Already implemented ✅
  - 383 lines
  - Animated hover states
  - Rarity indicators
  - Mobile-optimized
  
- **ProfileCard** - NEW 🆕
  - User avatar + stats
  - Farcaster PFP integration
  - Power badge display
  - Action buttons (Follow, Tip, View)
  
- **AchievementCard** - NEW 🆕
  - Badge/NFT display
  - Progress indicators
  - Unlock conditions
  - Share functionality

**Components to Create**:
```
components/
├── cards/
│   ├── BaseCard.tsx              # Shared card wrapper (150 lines)
│   ├── QuestCard.tsx             # ✅ Already exists (383 lines)
│   ├── ProfileCard.tsx           # NEW (250 lines)
│   ├── AchievementCard.tsx       # NEW (200 lines)
│   ├── LeaderboardCard.tsx       # NEW (180 lines)
│   └── types.ts                  # Shared types (50 lines)
```

**Features**:
- Consistent padding/margins
- Hover/focus states
- Loading skeletons
- Error states
- Empty states
- Mobile touch-friendly (min 44x44px)

**Pros**:
- ✅ Reusable across entire app
- ✅ Consistent spacing/styling
- ✅ Easy to maintain
- ✅ Accessible by default

**Cons**:
- ⚠️ Initial setup time (8-10 hours)
- ⚠️ Need to refactor existing cards

**Time Estimate**: 10 hours

---

#### Template 2: **Form Inputs & Validation** 📝
**Purpose**: Standardized form fields with validation  
**Use Cases**: Quest wizard, profile edit, admin forms, settings

**Variants**:
- **TextInput** - Text/email/URL fields
- **TextArea** - Long-form text (descriptions)
- **Select** - Dropdowns with search
- **Toggle** - Boolean switches
- **Slider** - Numeric ranges
- **DatePicker** - Time-based inputs
- **TokenSelector** - Token search with icons ✅ (exists)
- **NFTSelector** - NFT search with previews ✅ (exists)

**Components to Create**:
```
components/
├── forms/
│   ├── Input.tsx                 # NEW (180 lines)
│   ├── TextArea.tsx              # NEW (120 lines)
│   ├── Select.tsx                # NEW (200 lines)
│   ├── Toggle.tsx                # NEW (80 lines)
│   ├── Slider.tsx                # NEW (150 lines)
│   ├── DatePicker.tsx            # NEW (220 lines)
│   ├── FormField.tsx             # Wrapper with label/error (100 lines)
│   ├── validation.ts             # Validation helpers (150 lines)
│   └── types.ts                  # Form types (60 lines)
```

**Features**:
- Real-time validation
- Error messages with icons
- Success states
- Disabled states
- Loading states
- ARIA labels
- Keyboard navigation
- Auto-focus management

**Quest Wizard Integration**:
- Replace current inputs with standardized versions
- Add inline validation feedback
- Improve placeholder text
- Add tooltips for complex fields
- Mobile-optimized keyboards (inputMode)

**Pros**:
- ✅ Consistent UX across all forms
- ✅ Reduced validation bugs
- ✅ Better accessibility
- ✅ Mobile-optimized inputs

**Cons**:
- ⚠️ Quest Wizard refactor needed (10-12 hours)
- ⚠️ Potential breaking changes

**Time Estimate**: 14 hours (8 hours components + 6 hours Quest Wizard integration)

---

#### Template 3: **Navigation & Menus** 🧭
**Purpose**: Consistent navigation patterns  
**Use Cases**: Header, sidebar, mobile menu, dropdowns, breadcrumbs

**Variants**:
- **MobileNavigation** ✅ (exists, needs expansion)
- **DesktopHeader** - NEW 🆕
- **ProfileDropdown** - NEW 🆕 (Farcaster PFP integration)
- **Breadcrumbs** - NEW 🆕
- **TabNavigation** - NEW 🆕

**Components to Create**:
```
components/
├── navigation/
│   ├── MobileNav.tsx             # ✅ Refactor existing (200 lines)
│   ├── DesktopHeader.tsx         # NEW (250 lines)
│   ├── ProfileDropdown.tsx       # NEW (180 lines)
│   ├── Breadcrumbs.tsx           # NEW (100 lines)
│   ├── TabNav.tsx                # NEW (120 lines)
│   ├── NavLink.tsx               # Shared link component (80 lines)
│   └── types.ts                  # Navigation types (40 lines)
```

**Features**:
- **ProfileDropdown**:
  - Farcaster PFP (48x48px)
  - Username + FID
  - Mini stats (Points, Streak, Rank)
  - Quick links (Profile, Dashboard, Leaderboard)
  - Wallet address (truncated)
  - Power badge indicator
  
- **MobileNav Enhancements**:
  - Bottom tab bar (Quest, Dashboard, Profile, Leaderboard)
  - Active state indicators
  - Badge counts (notifications, quests)
  - Smooth transitions
  
- **DesktopHeader**:
  - Logo + branding
  - Main navigation links
  - Search bar (quests/users)
  - Profile dropdown
  - Wallet connection
  - Chain switcher

**Farcaster Miniapp Optimization**:
- Native feel (no URL bar clutter)
- Bottom navigation (thumb-friendly)
- Pull-to-refresh support
- Deep linking support

**Pros**:
- ✅ Unified navigation experience
- ✅ Farcaster miniapp best practices
- ✅ Mobile-first design
- ✅ Better discoverability

**Cons**:
- ⚠️ Needs layout restructure (6-8 hours)
- ⚠️ Testing across all pages

**Time Estimate**: 12 hours

---

#### Template 4: **Data Display & Stats** 📊
**Purpose**: Visualize metrics, progress, and stats  
**Use Cases**: Dashboard, profile, leaderboard, quest progress

**Variants**:
- **StatCard** - Single metric display
- **ProgressBar** - Linear progress ✅ (ProgressXP exists, needs polish)
- **CircularProgress** - Circular progress (streak, completion)
- **ChartCard** - Mini charts (XP over time, engagement)
- **MiniStats** - Compact 3-column stats
- **OnchainStats** ✅ (exists, recently fixed)

**Components to Create**:
```
components/
├── stats/
│   ├── StatCard.tsx              # NEW (150 lines)
│   ├── ProgressBar.tsx           # ✅ Refactor existing (120 lines)
│   ├── CircularProgress.tsx      # NEW (180 lines)
│   ├── ChartCard.tsx             # NEW (200 lines)
│   ├── MiniStats.tsx             # NEW (100 lines)
│   ├── OnchainStats.tsx          # ✅ Polish existing (current)
│   └── types.ts                  # Stats types (50 lines)
```

**Features**:
- Real-time updates
- Loading skeletons
- Error states (no data)
- Animated transitions
- Color-coded thresholds
- Tooltips with details
- Mobile-optimized sizing

**Dashboard Integration**:
- **Hero Stats Section**:
  - Total XP (with level progress)
  - Current streak (with fire icon)
  - Rank (with position change)
  - Active quests count
  
- **Quick Stats Grid** (2x2 on mobile, 4x1 on desktop):
  - Badges earned
  - Quests completed
  - Total earnings (tokens)
  - Referrals count
  
- **Recent Activity Chart**:
  - XP earned (last 7 days)
  - Quest completions
  - Engagement metrics

**Profile Integration**:
- **Profile Header Stats**:
  - XP + Level
  - Streak
  - Rank
  - Member since
  
- **Achievement Progress**:
  - Badges (with rarity)
  - NFTs held
  - Quest completion rate
  - Social proof (followers, following)

**Pros**:
- ✅ Clear data visualization
- ✅ Gamification elements
- ✅ Motivates users
- ✅ base.dev onchain stats integration

**Cons**:
- ⚠️ Chart library dependency needed (~50KB bundle)
- ⚠️ Real-time updates = more API calls

**Time Estimate**: 10 hours

---

#### Template 5: **Feedback & States** 🔔
**Purpose**: Loading, error, success, and empty states  
**Use Cases**: All pages, toasts, modals, inline feedback

**Variants**:
- **LoadingSpinner** - Global/inline loaders
- **Skeleton** - Content placeholders
- **Toast** - Notifications ✅ (exists, needs polish)
- **Modal** - Dialogs and confirmations
- **EmptyState** - No data states
- **ErrorBoundary** ✅ (exists)

**Components to Create**:
```
components/
├── feedback/
│   ├── LoadingSpinner.tsx        # NEW (80 lines)
│   ├── Skeleton.tsx              # NEW (120 lines)
│   ├── Toast.tsx                 # ✅ Refactor existing (150 lines)
│   ├── Modal.tsx                 # NEW (200 lines)
│   ├── EmptyState.tsx            # NEW (100 lines)
│   ├── ErrorBoundary.tsx         # ✅ Polish existing
│   ├── ConfirmDialog.tsx         # NEW (150 lines)
│   └── types.ts                  # Feedback types (40 lines)
```

**Features**:
- **Toast Improvements**:
  - Success/error/info/warning variants
  - Icons per type
  - Auto-dismiss with countdown
  - Action buttons (undo, view)
  - Stack management (max 3 visible)
  - Mobile positioning (top on iOS, bottom on Android)
  
- **Skeleton Loaders**:
  - Match actual content dimensions
  - Animated shimmer effect
  - Card skeletons
  - Text line skeletons
  - Image skeletons
  
- **Empty States**:
  - Contextual illustrations
  - Clear messaging
  - Call-to-action buttons
  - "No quests yet" → "Create your first quest"
  - "No badges" → "Complete quests to earn badges"

**Pros**:
- ✅ Professional UX feel
- ✅ Reduces perceived loading time
- ✅ Clear user feedback
- ✅ Reduces confusion

**Cons**:
- ⚠️ Need illustrations/icons (2-3 hours)
- ⚠️ Animation performance testing

**Time Estimate**: 8 hours

---

#### Template 6: **Action Buttons & CTAs** 🎯
**Purpose**: Consistent button styles and behaviors  
**Use Cases**: All interactive elements, forms, cards, navigation

**Variants**:
- **PrimaryButton** - Main actions
- **SecondaryButton** - Secondary actions
- **DangerButton** - Destructive actions
- **GhostButton** - Minimal actions
- **IconButton** - Icon-only actions
- **ConnectWallet** ✅ (exists, polish)
- **GMButton** ✅ (exists, core feature)

**Components to Create**:
```
components/
├── buttons/
│   ├── Button.tsx                # Base button (200 lines)
│   ├── IconButton.tsx            # NEW (100 lines)
│   ├── ButtonGroup.tsx           # NEW (80 lines)
│   ├── FAB.tsx                   # Floating action button (120 lines)
│   ├── ConnectWallet.tsx         # ✅ Polish existing
│   ├── GMButton.tsx              # ✅ Keep as-is (core feature)
│   └── types.ts                  # Button types (50 lines)
```

**Features**:
- Loading states (spinner)
- Disabled states (with tooltip)
- Icon support (left/right)
- Size variants (sm/md/lg)
- Full-width option
- Keyboard support (Enter/Space)
- Focus indicators
- Haptic feedback (mobile)
- Success animations

**Quest Wizard CTAs**:
- "Next Step" → Add progress indicator
- "Create Quest" → Add success confetti animation
- "Save Draft" → Add auto-save indicator
- "Preview" → Add preview modal

**Dashboard CTAs**:
- "Create Quest" (floating action button on mobile)
- "Complete Daily GM" (prominent hero CTA)
- "View All Quests" (secondary)
- "Share Profile" (secondary)

**Profile CTAs**:
- "Edit Profile" (if own profile)
- "Follow" / "Unfollow" (if other profile)
- "Tip" (base.dev transaction)
- "Share Profile" (Farcaster share)

**Pros**:
- ✅ Clear visual hierarchy
- ✅ Consistent interactions
- ✅ Better conversion rates
- ✅ Accessibility built-in

**Cons**:
- ⚠️ Refactor existing button usage (4-5 hours)
- ⚠️ Animation performance testing

**Time Estimate**: 6 hours

---

## 🎨 Icon & SVG Strategy

### Current State
- Mixed icon sources (no unified library)
- Inline SVGs in components
- Inconsistent sizing
- No icon tree-shaking

### Proposed Solution

**Option A: React Icons** (Recommended ⭐)
- **Library**: `react-icons` (~40KB with tree-shaking)
- **Icon Sets**: Lucide (modern), Heroicons (Tailwind style), Ionicons (mobile)
- **Pros**: 
  - ✅ Thousands of icons
  - ✅ Consistent styling
  - ✅ Tree-shakeable
  - ✅ TypeScript support
- **Cons**:
  - ⚠️ Bundle size (+40KB)
  - ⚠️ Migration effort (3-4 hours)

**Option B: Custom SVG Library**
- **Approach**: Curated set of ~50 icons
- **Tools**: SVGR for React components
- **Pros**:
  - ✅ Minimal bundle size (~5KB)
  - ✅ Full control over styling
  - ✅ Brand consistency
- **Cons**:
  - ⚠️ Need to design/source icons (6-8 hours)
  - ⚠️ Limited selection

**Recommendation**: Option A (React Icons)  
**Reason**: Time-to-value, maintenance ease, professional appearance

**Icon Usage Guide**:
```typescript
// Standard sizes
const ICON_SIZES = {
  xs: 12,  // Inline text icons
  sm: 16,  // Form inputs, buttons
  md: 20,  // Cards, navigation
  lg: 24,  // Headers, hero sections
  xl: 32,  // Illustrations, empty states
}

// Color variants
const ICON_COLORS = {
  primary: 'text-blue-500',
  secondary: 'text-gray-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  muted: 'text-gray-400',
}
```

**Component Structure**:
```
components/
├── icons/
│   ├── Icon.tsx                  # Wrapper component (80 lines)
│   ├── index.ts                  # Export all icons (50 lines)
│   └── README.md                 # Usage guide
```

**Time Estimate**: 4 hours (migration + documentation)

---

## ⏱️ Time Calculations & Formatting

### Current State
- Inconsistent time formatting
- Mixed approaches (moment, date-fns, native Date)
- No unified utilities

### Proposed Solution

**Utility Library**: `date-fns` (recommended, already in use)  
**Reasoning**: 
- Tree-shakeable (only import what you need)
- Immutable API
- TypeScript support
- No timezone issues (use UTC)

**Utility Functions**:
```typescript
// lib/time-utils.ts (~200 lines)

// Relative time
formatRelativeTime(date: Date): string
// "2 hours ago", "3 days ago", "Just now"

// Duration
formatDuration(seconds: number): string
// "2h 30m", "5d 12h", "45s"

// Countdown
formatCountdown(targetDate: Date): string
// "2h 30m 45s remaining", "Expired"

// Date display
formatDate(date: Date, format: 'short' | 'long' | 'relative'): string
// Short: "Nov 30, 2025"
// Long: "November 30, 2025 at 4:30 PM"
// Relative: "2 days ago"

// Quest deadlines
formatQuestDeadline(endDate: Date): {
  text: string
  urgency: 'low' | 'medium' | 'high'
  color: string
}
// "Ends in 2 days" (urgency: low, color: green)
// "Ends in 3 hours" (urgency: high, color: red)

// Streak tracking
formatStreakTime(lastGM: Date, currentTime: Date): {
  isActive: boolean
  hoursRemaining: number
  text: string
}
```

**Components**:
```
components/
├── time/
│   ├── RelativeTime.tsx          # Auto-updating relative time (100 lines)
│   ├── Countdown.tsx             # Real-time countdown (120 lines)
│   ├── TimeEmoji.tsx             # ✅ Already exists
│   └── types.ts                  # Time types (30 lines)
```

**Usage Examples**:

```tsx
// Quest card deadline
<Countdown
  targetDate={quest.endDate}
  urgency={calculateUrgency(quest.endDate)}
  onExpire={() => handleQuestExpired(quest.id)}
/>

// Profile last activity
<RelativeTime
  date={user.lastSeenAt}
  updateInterval={60000} // Update every 60s
/>

// Streak countdown
<StreakCountdown
  lastGM={user.lastGM}
  showProgress
  showIcon
/>
```

**Pros**:
- ✅ Consistent formatting sitewide
- ✅ Automatic updates (countdowns)
- ✅ Internationalization ready
- ✅ Urgency indicators (UX improvement)

**Cons**:
- ⚠️ Migration effort (refactor all time displays, 3-4 hours)
- ⚠️ Testing edge cases (timezones, DST)

**Time Estimate**: 6 hours

---

## 🏗️ Page-Specific Rebuilds

### Quest Wizard (Priority: HIGH 🔴)

**Current State**: 
- 323 lines
- Good foundation from Sprint 3
- Template system ✅
- Auto-save ✅
- QuestCard integration ✅
- UX audit completed

**Rebuild Goals**:
1. Apply Template 2 (Forms) - Standardize all inputs
2. Apply Template 6 (Buttons) - Better CTAs
3. Mobile optimization - SwipeableSteps
4. Add Template 1 (Cards) - Preview improvements
5. Add Template 5 (Feedback) - Better validation UX

**Changes**:

**Step 1: Basics**
- Replace inputs with Form template components
- Add inline validation with icons
- Add quest type visual picker (not just dropdown)
- Add chain icons to network selector
- Add "What is this?" tooltips

**Step 2: Eligibility**
- TokenSelector ✅ (polish existing)
- NFTSelector ✅ (polish existing)
- Add "No results" empty states
- Add loading skeletons
- Better error messages

**Step 3: Rewards**
- Add reward calculator preview
- Add token amount validator (balance check)
- Add NFT rarity display
- Add estimated gas costs

**Step 4: Preview**
- QuestCard ✅ (already integrated)
- Add mobile preview toggle
- Add social share preview
- Add frame preview (Farcaster)

**Step 5: Finalize**
- Add success animation (confetti)
- Add "Share on Farcaster" button
- Add "View Quest" button
- Add analytics tracking

**Mobile Enhancements**:
- SwipeableSteps for touch navigation
- Bottom progress bar
- Floating "Next" button
- Pull-down to save draft
- Haptic feedback on step completion

**Testing Requirements**:
- E2E tests for all flows ✅ (already planned)
- Mobile device testing (iOS Safari, Android Chrome)
- Accessibility audit (screen reader testing)

**Time Breakdown**:
- Input standardization: 4 hours
- Mobile optimization: 6 hours
- Preview enhancements: 3 hours
- Testing & polish: 4 hours
- **Total**: 17 hours

---

### Dashboard (Priority: HIGH 🔴)

**Current State**:
- Basic layout
- Lacks responsive breakpoints
- Limited stats visualization
- Missing quick actions

**Rebuild Goals**:
1. Apply Template 3 (Navigation) - ProfileDropdown, better nav
2. Apply Template 4 (Stats) - Rich data visualization
3. Apply Template 1 (Cards) - Quest cards, activity feed
4. Apply Template 6 (Buttons) - Prominent CTAs
5. Farcaster miniapp optimization

**New Layout Structure**:

```
Dashboard/
├── Hero Section
│   ├── Welcome message ("GM, @username! 🐾")
│   ├── Mini stats (XP, Streak, Rank, Active Quests)
│   └── Primary CTA ("Complete Daily GM" or "Create Quest")
├── Quick Actions
│   ├── Create Quest (FAB on mobile)
│   ├── View Profile
│   ├── Share on Farcaster
│   └── View Leaderboard
├── Active Quests (2-3 visible, scroll horizontally on mobile)
│   ├── QuestCard components
│   ├── Progress indicators
│   └── "Complete" CTAs
├── Recent Activity Feed
│   ├── XP earned notifications
│   ├── Badge unlocks
│   ├── Streak milestones
│   ├── Quest completions
│   └── Referral earnings
├── Stats Overview
│   ├── XP chart (last 7 days)
│   ├── Quest completion rate
│   ├── Engagement metrics
│   └── Onchain activity (base.dev)
└── Footer
    ├── Quick links
    └── Social proof (total users, quests, rewards)
```

**Responsive Breakpoints**:
```css
/* Mobile: < 768px */
- Single column layout
- Bottom tab navigation
- FAB for primary actions
- Horizontal scrolling cards

/* Tablet: 768px - 1024px */
- 2-column layout
- Side navigation
- Grid card layouts

/* Desktop: > 1024px */
- 3-column layout
- Persistent sidebar
- More stats visible
- Larger charts
```

**Farcaster Miniapp Features**:
- Pull-to-refresh
- Deep linking to quests
- Native share sheet integration
- Optimized for 375px width
- No horizontal scroll

**Time Breakdown**:
- Layout restructure: 8 hours
- Stats integration: 6 hours
- Mobile optimization: 5 hours
- Testing & polish: 4 hours
- **Total**: 23 hours

---

### Profile Page (Priority: MEDIUM 🟡)

**Current State**:
- Basic stats display
- Limited Farcaster integration
- Missing social features

**Rebuild Goals**:
1. Apply Template 1 (Cards) - Profile card, achievement cards
2. Apply Template 4 (Stats) - Rich profile stats
3. Apply Template 6 (Buttons) - Social actions
4. Farcaster PFP integration
5. base.dev transaction history

**New Layout Structure**:

```
Profile/
├── Header
│   ├── Farcaster PFP (large, 120x120px)
│   ├── Username + FID
│   ├── Power badge indicator
│   ├── Bio (from Farcaster)
│   ├── Member since date
│   └── Action buttons (Edit/Follow/Tip/Share)
├── Stats Grid (4 columns on desktop, 2 on mobile)
│   ├── Total XP + Level + Progress bar
│   ├── Current streak + Longest streak
│   ├── Rank + Position change
│   ├── Quests completed / Total
│   ├── Badges earned + Rarity breakdown
│   ├── Referrals count
│   ├── Total earnings (tokens)
│   └── Farcaster followers
├── Achievements Section
│   ├── Badges earned (grid of achievement cards)
│   ├── NFTs held (base chain)
│   ├── Rare items highlighted
│   └── "View All" link
├── Activity Tab Navigation
│   ├── Quests (Created + Completed)
│   ├── Badges (Earned + In Progress)
│   ├── Transactions (base.dev history)
│   └── Social (Farcaster activity)
├── Quest List
│   ├── Created quests (if creator)
│   ├── Completed quests
│   ├── In-progress quests
│   └── Failed quests (expired)
└── Footer
    ├── Social links
    └── Wallet address (truncated, copyable)
```

**Farcaster Integration**:
- **PFP**: Fetch from Farcaster profile
- **Bio**: Display Farcaster bio
- **Followers**: Show follower count
- **Casts**: Link to recent casts
- **Share**: Share profile via Farcaster frame
- **Verification**: Show verified badge if applicable

**base.dev Integration**:
- **Transaction History**:
  - GM button clicks (onchain)
  - Quest rewards received
  - Tips sent/received
  - NFT mints
  - Token transfers
- **Wallet Balance**:
  - Native ETH
  - GMEOW tokens
  - Quest reward tokens
- **NFT Gallery**:
  - Badge NFTs
  - Quest completion NFTs
  - Partner NFTs

**Social Actions**:
- **Follow/Unfollow**: Via Farcaster API
- **Tip**: Base transaction (ETH or tokens)
- **Share**: Farcaster frame with profile stats
- **Message**: Open Farcaster DM (if supported)

**Time Breakdown**:
- Layout rebuild: 8 hours
- Farcaster integration: 6 hours
- base.dev integration: 5 hours
- Social features: 4 hours
- Testing & polish: 4 hours
- **Total**: 27 hours

---

## 🎮 Farcaster Miniapp Optimization

### Current State
- Basic miniapp support
- Registered on Farcaster: https://farcaster.xyz/miniapps/uhjwm4MTUVBr/gmeowbased-adventure
- Missing optimizations

### Optimization Checklist

#### 1. **Mobile-First Design**
- [ ] All touch targets ≥ 44x44px
- [ ] Bottom navigation (thumb-friendly)
- [ ] Pull-to-refresh support
- [ ] Swipe gestures (back, dismiss)
- [ ] Haptic feedback on interactions
- [ ] No horizontal scroll (except carousels)
- [ ] Optimized for 375px width

#### 2. **Performance**
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse score > 90
- [ ] Bundle size < 200KB (gzipped)
- [ ] Image optimization (WebP, lazy loading)
- [ ] Code splitting (per route)
- [ ] Service worker (offline support)

#### 3. **Deep Linking**
- [ ] Quest links: `/quest/:id`
- [ ] Profile links: `/profile/:fid`
- [ ] Leaderboard: `/leaderboard`
- [ ] Share links with metadata
- [ ] URL scheme: `gmeowbased://`

#### 4. **Native Features**
- [ ] Share sheet integration
- [ ] Clipboard API (copy addresses)
- [ ] Camera API (upload quest images)
- [ ] Notifications (push permissions)
- [ ] Geolocation (location-based quests)

#### 5. **Farcaster Integration**
- [ ] Frame support (quest previews)
- [ ] Cast actions (complete quest from cast)
- [ ] Profile linking (FID → profile page)
- [ ] Sign-in with Farcaster
- [ ] Farcaster notifications

#### 6. **Testing**
- [ ] iOS Safari (iPhone 12+)
- [ ] Android Chrome (Pixel 5+)
- [ ] Farcaster iOS app
- [ ] Warpcast iOS app
- [ ] Landscape orientation
- [ ] Slow 3G network

**Time Estimate**: 12 hours (spread across all rebuilds)

---

## ⛓️ base.dev Integration Strategy

### Current State
- Basic Base support
- OnchainKit in Quest only
- Limited wallet integration

### Integration Goals

#### 1. **Wallet Connection**
- **Current**: Wagmi (Dashboard, Profile)
- **Goal**: OnchainKit everywhere
- **Benefits**: Better Base UX, wallet UI components, transaction flows

**Migration Steps**:
1. Add OnchainKit to Dashboard (replace wagmi selectively)
2. Add OnchainKit to Profile
3. Add OnchainKit wallet UI components
4. Test transaction flows
5. Monitor bundle size impact

#### 2. **Transaction Flows**
- **GM Button**: Already onchain ✅
- **Quest Rewards**: Add transaction confirmation UI
- **Tips**: P2P ETH/token transfers
- **NFT Minting**: Quest completion badges
- **Token Swaps**: Reward token → ETH (if needed)

**Transaction UI Components**:
```
components/
├── transactions/
│   ├── TransactionButton.tsx     # Wrapper for tx actions (150 lines)
│   ├── TransactionModal.tsx      # Tx confirmation modal (200 lines)
│   ├── TransactionStatus.tsx     # Pending/success/error (120 lines)
│   ├── GasEstimate.tsx           # Show estimated gas (80 lines)
│   └── types.ts                  # Tx types (40 lines)
```

#### 3. **Onchain Data Display**
- **Profile**: Show onchain activity (GM history, rewards received)
- **Leaderboard**: Show onchain GM counts
- **Quest**: Show reward distribution (who claimed)
- **Dashboard**: Show recent transactions

**OnchainStats Component** (already exists, enhance):
- Add transaction history
- Add token balances
- Add NFT holdings
- Add gas spent
- Add reward earnings

#### 4. **Base Chain Features**
- **Smart Wallet Support**: Coinbase Smart Wallet
- **Gas Sponsorship**: Sponsor quest completion tx (if budget allows)
- **Batched Transactions**: Claim multiple rewards in one tx
- **Account Abstraction**: Better UX for non-crypto users

**Time Estimate**: 15 hours

---

## 📦 Component Library Structure

### Proposed File Organization

```
components/
├── cards/                        # Template 1
│   ├── BaseCard.tsx
│   ├── QuestCard.tsx
│   ├── ProfileCard.tsx
│   ├── AchievementCard.tsx
│   ├── LeaderboardCard.tsx
│   └── types.ts
├── forms/                        # Template 2
│   ├── Input.tsx
│   ├── TextArea.tsx
│   ├── Select.tsx
│   ├── Toggle.tsx
│   ├── Slider.tsx
│   ├── DatePicker.tsx
│   ├── FormField.tsx
│   ├── validation.ts
│   └── types.ts
├── navigation/                   # Template 3
│   ├── MobileNav.tsx
│   ├── DesktopHeader.tsx
│   ├── ProfileDropdown.tsx
│   ├── Breadcrumbs.tsx
│   ├── TabNav.tsx
│   ├── NavLink.tsx
│   └── types.ts
├── stats/                        # Template 4
│   ├── StatCard.tsx
│   ├── ProgressBar.tsx
│   ├── CircularProgress.tsx
│   ├── ChartCard.tsx
│   ├── MiniStats.tsx
│   ├── OnchainStats.tsx
│   └── types.ts
├── feedback/                     # Template 5
│   ├── LoadingSpinner.tsx
│   ├── Skeleton.tsx
│   ├── Toast.tsx
│   ├── Modal.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   ├── ConfirmDialog.tsx
│   └── types.ts
├── buttons/                      # Template 6
│   ├── Button.tsx
│   ├── IconButton.tsx
│   ├── ButtonGroup.tsx
│   ├── FAB.tsx
│   ├── ConnectWallet.tsx
│   ├── GMButton.tsx
│   └── types.ts
├── icons/                        # Icon system
│   ├── Icon.tsx
│   ├── index.ts
│   └── README.md
├── time/                         # Time utilities
│   ├── RelativeTime.tsx
│   ├── Countdown.tsx
│   ├── TimeEmoji.tsx
│   └── types.ts
├── transactions/                 # base.dev components
│   ├── TransactionButton.tsx
│   ├── TransactionModal.tsx
│   ├── TransactionStatus.tsx
│   ├── GasEstimate.tsx
│   └── types.ts
├── legacy/                       # Old components (to be migrated)
│   └── ...
└── ui/                           # Shadcn/ui components (keep if used)
    └── ...
```

### Documentation Structure

```
components/
├── README.md                     # Component library overview
├── cards/
│   └── README.md                 # Usage examples, props, variants
├── forms/
│   └── README.md
├── navigation/
│   └── README.md
├── stats/
│   └── README.md
├── feedback/
│   └── README.md
├── buttons/
│   └── README.md
└── CONTRIBUTING.md               # Component creation guidelines
```

**Time Estimate**: 3 hours (documentation)

---

## 📊 Pros & Cons Analysis

### Overall Restructuring

**Pros**:
- ✅ **Consistency**: Unified design language across entire app
- ✅ **Maintainability**: DRY principle, single source of truth for components
- ✅ **Performance**: Tree-shaking, code splitting, optimized bundles
- ✅ **Accessibility**: Built-in WCAG 2.1 AA compliance
- ✅ **Developer Experience**: Easier onboarding, faster feature development
- ✅ **User Experience**: Professional feel, better mobile UX, Farcaster miniapp optimized
- ✅ **Scalability**: Easy to add new features using templates
- ✅ **Testing**: Easier to test isolated components
- ✅ **Documentation**: Self-documenting code with READMEs
- ✅ **SEO**: Better loading times = better SEO

**Cons**:
- ⚠️ **Time Investment**: 120-150 hours total (4-6 weeks)
- ⚠️ **Breaking Changes**: Need careful migration strategy
- ⚠️ **Bundle Size**: Initial increase (~100KB), then optimized
- ⚠️ **Learning Curve**: Team needs to learn new component API
- ⚠️ **Migration Effort**: Refactor existing pages to use new components
- ⚠️ **Testing Overhead**: More components = more tests
- ⚠️ **Risk**: Potential bugs during migration if not careful

---

## 🗓️ Implementation Roadmap

### Phase 1: Foundation (Week 1-2, 40 hours)
**Goal**: Set up component library structure

- [ ] Create component library folders
- [ ] Set up icon system (React Icons)
- [ ] Create time utilities
- [ ] Template 6: Buttons (6 hours)
- [ ] Template 5: Feedback (8 hours)
- [ ] Template 1: Cards (10 hours)
- [ ] Documentation (3 hours)
- [ ] Testing setup (3 hours)
- [ ] Git commit: "feat: component library foundation"

**Deliverables**:
- Component library structure
- Buttons, feedback, and cards templates
- Icon system
- Time utilities
- Documentation
- Unit tests

---

### Phase 2: Forms & Navigation (Week 3, 26 hours)
**Goal**: Build form and navigation templates

- [ ] Template 2: Forms (14 hours)
- [ ] Template 3: Navigation (12 hours)
- [ ] ProfileDropdown with Farcaster PFP
- [ ] MobileNav enhancements
- [ ] Documentation updates
- [ ] Git commit: "feat: forms and navigation templates"

**Deliverables**:
- Form components with validation
- Navigation components
- Mobile navigation
- Profile dropdown
- Unit tests

---

### Phase 3: Stats & Transactions (Week 3-4, 25 hours)
**Goal**: Build stats and transaction templates

- [ ] Template 4: Stats (10 hours)
- [ ] Transaction components (15 hours)
- [ ] base.dev integration
- [ ] OnchainKit wallet components
- [ ] Documentation updates
- [ ] Git commit: "feat: stats and transaction components"

**Deliverables**:
- Stats visualization components
- Transaction flow components
- base.dev integration
- Unit tests

---

### Phase 4: Quest Wizard Rebuild (Week 4-5, 17 hours)
**Goal**: Apply templates to Quest Wizard

- [ ] Input standardization (4 hours)
- [ ] Mobile optimization (6 hours)
- [ ] Preview enhancements (3 hours)
- [ ] Testing & polish (4 hours)
- [ ] E2E tests
- [ ] Git commit: "feat: Quest Wizard rebuild with new templates"

**Deliverables**:
- Rebuilt Quest Wizard
- Mobile-optimized
- E2E tests
- User documentation

---

### Phase 5: Dashboard Rebuild (Week 5-6, 23 hours)
**Goal**: Apply templates to Dashboard

- [ ] Layout restructure (8 hours)
- [ ] Stats integration (6 hours)
- [ ] Mobile optimization (5 hours)
- [ ] Testing & polish (4 hours)
- [ ] Git commit: "feat: Dashboard rebuild with new templates"

**Deliverables**:
- Rebuilt Dashboard
- Rich stats visualization
- Mobile-optimized
- Performance optimized

---

### Phase 6: Profile Rebuild (Week 6-7, 27 hours)
**Goal**: Apply templates to Profile

- [ ] Layout rebuild (8 hours)
- [ ] Farcaster integration (6 hours)
- [ ] base.dev integration (5 hours)
- [ ] Social features (4 hours)
- [ ] Testing & polish (4 hours)
- [ ] Git commit: "feat: Profile rebuild with Farcaster & base.dev"

**Deliverables**:
- Rebuilt Profile page
- Farcaster PFP integration
- base.dev transaction history
- Social features

---

### Phase 7: Final Polish (Week 7, 12 hours)
**Goal**: Farcaster miniapp optimization and testing

- [ ] Farcaster miniapp optimizations (6 hours)
- [ ] Performance testing (2 hours)
- [ ] Accessibility audit (2 hours)
- [ ] Bug fixes (2 hours)
- [ ] Documentation updates
- [ ] Git commit: "feat: UI/UX restructure complete"

**Deliverables**:
- Farcaster miniapp optimized
- Performance benchmarks
- Accessibility report
- Final documentation
- Migration guide

---

## 📈 Success Metrics

### Performance
- **Lighthouse Score**: > 90 (mobile)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 200KB (gzipped, per route)

### User Experience
- **Mobile Score**: > 85% (user testing)
- **Task Completion Rate**: > 90%
- **Error Rate**: < 5%
- **User Satisfaction**: > 4/5

### Accessibility
- **WCAG 2.1 AA Compliance**: 100%
- **Keyboard Navigation**: Full support
- **Screen Reader**: Full support
- **Color Contrast**: AAA level

### Engagement
- **Quest Creation Rate**: +30% increase
- **Mobile Usage**: +40% increase
- **Session Duration**: +25% increase
- **Return Rate**: +20% increase

---

## 🚀 Next Steps (Immediate)

1. **Review & Approve Plan** (User action required)
   - Review this document
   - Provide feedback
   - Approve Phase 1 start

2. **Create GitHub Issues** (1 hour)
   - Break down phases into issues
   - Add labels (enhancement, ui/ux, mobile)
   - Assign to milestones

3. **Set Up Project Board** (30 min)
   - Create Kanban board
   - Add phases as columns
   - Track progress

4. **Start Phase 1** (40 hours)
   - Set up component library structure
   - Build Template 6 (Buttons)
   - Build Template 5 (Feedback)
   - Build Template 1 (Cards)

5. **Documentation Sync** (Per GLOBAL DOC-SYNC PROTOCOL)
   - Update relevant planning docs
   - Commit before continuing

---

## 🔗 References

- **Farcaster Miniapp Guidelines**: https://miniapps.farcaster.xyz/llms-full.txt
- **Neynar Documentation**: https://docs.neynar.com/llms.txt
- **OnchainKit Documentation**: https://docs.base.org/onchainkit/llms.txt
- **Tailwind CSS v3**: https://tailwindcss.com/docs
- **React Icons**: https://react-icons.github.io/react-icons/
- **date-fns**: https://date-fns.org/docs/
- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

---

## 📝 Change Log

**2025-11-30**:
- Initial plan created
- 6 template categories defined
- Quest Wizard, Dashboard, Profile rebuild plans detailed
- Farcaster miniapp optimization checklist
- base.dev integration strategy
- Time estimates and roadmap

---

**End of Plan**

**Total Estimated Time**: 120-150 hours (4-6 weeks)  
**Risk Level**: Medium  
**ROI**: High  
**Status**: Awaiting approval ⏳
