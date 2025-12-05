# 📄 Page Restructure Plan - Viral Features Integration

**Created**: December 1, 2025  
**Purpose**: Map existing pages to viral mechanics from research  
**Reference**: VIRAL-FEATURES-RESEARCH.md, FOUNDATION-REBUILD-ROADMAP.md

---

## 📊 Current Pages Inventory

### ✅ Existing Pages (8 total)
1. `/` - Home page (landing + marketing)
2. `/Dashboard` - User dashboard (GM button, stats, quests)
3. `/Quest` - Quest hub (browse all quests)
4. `/Quest/creator` - Quest creation tool
5. `/leaderboard` - Global leaderboard
6. `/profile` - User profile (own)
7. `/profile/[fid]/badges` - Badge showcase
8. `/notifications` - Notification center

---

## 🎯 Viral Mechanics Mapping (From Research)

### Pattern 1: Simple Daily Mechanics ⭐⭐⭐ (CRITICAL)
**Where**: `/Dashboard` (primary) + `/` (secondary CTA)

**Current Features**:
- ✅ GM button (exists)
- ✅ Streak tracking (exists)
- ✅ XP display (exists)
- ❌ Daily reward preview (missing)
- ❌ Streak milestone indicators (missing)
- ❌ "GM Sent!" celebration animation (basic only)

**Needed Improvements**:
- [ ] **Pre-GM State**: Show "Today's Reward: +50 XP 🔥" BEFORE click
- [ ] **Streak Milestones**: Visual indicators at 7, 30, 100, 365 days
- [ ] **Celebration**: Bigger animation with confetti on streak milestones
- [ ] **Next Reward Timer**: "Next GM available in 18h 23m"
- [ ] **Home Page CTA**: "Send GM Now" button (redirects to Dashboard if logged in)

**Priority**: 🔥 HIGH - Core retention mechanic

---

### Pattern 2: Viral Sharing Loops ⭐⭐ (HIGH)
**Where**: `/Dashboard`, `/leaderboard`, `/profile/[fid]/badges`

**Current Features**:
- ✅ Leaderboard screenshot (exists - lib/share.ts)
- ✅ Badge showcase (exists)
- ❌ One-click share buttons (missing)
- ❌ "Share to earn bonus" prompts (missing)
- ❌ Tag-3-friends mechanic (missing)

**Needed Improvements**:
- [ ] **Dashboard**: "Share Your Streak" button (instant Warpcast composer)
- [ ] **Leaderboard**: "Share Rank #42" button with auto-generated image
- [ ] **Badge Page**: "Flex This Badge" button (pre-filled cast with image)
- [ ] **Viral Bonus**: "+10 XP for sharing" indicator on share buttons
- [ ] **Tag Mechanic**: "Tag 3 friends to unlock bonus chest" (optional quest)

**Priority**: 🔥 HIGH - Growth driver

---

### Pattern 3: Mobile-First UI ⭐⭐⭐ (CRITICAL)
**Where**: ALL pages

**Current Status**:
- ✅ Bottom navigation (MobileNav.tsx - DONE Section 1.10)
- ✅ Safe area support (iOS notch - DONE)
- ✅ Responsive Header (DONE Section 1.10)
- ⚠️ Quest cards need touch optimization
- ⚠️ Dashboard stats cards too small on mobile
- ⚠️ Forms not optimized (input sizes, validation)

**Needed Improvements**:
- [ ] **Quest Hub**: Larger tap targets (min 44x44px), card redesign
- [ ] **Dashboard**: Bigger stat cards, clearer hierarchy
- [ ] **Forms** (Quest creator): Larger inputs, better validation UI (Phase 2)
- [ ] **Pull-to-refresh**: Add to Dashboard, Quest hub, Leaderboard
- [ ] **Loading states**: Skeleton screens (not just spinners)

**Priority**: 🔥 CRITICAL - 90% mobile users

---

### Pattern 4: Instant Onchain Actions ⭐ (MEDIUM)
**Where**: `/Dashboard` (GM button), `/Quest` (quest completion)

**Current Features**:
- ✅ GM transaction (Base only)
- ✅ Quest completion tracking
- ❌ Transaction progress indicator unclear
- ❌ Gas estimation missing
- ❌ Success/failure states basic

**Needed Improvements**:
- [ ] **Transaction Status**: Clear 3-step UI (1. Sign, 2. Broadcasting, 3. Confirmed)
- [ ] **Gas Display**: "Est. gas: $0.02" before transaction
- [ ] **Success State**: Bigger celebration + "Share Transaction" CTA
- [ ] **Failure State**: Clear error + retry button
- [ ] **Loading State**: Animated spinner with step descriptions

**Priority**: 🟡 MEDIUM - UX polish

---

## 📄 Page-by-Page Breakdown

### 1. `/` - Home Page (Landing)
**Current**: Marketing content, quest previews, FAQ  
**Purpose**: Convert visitors → sign up  
**Needed**: 
- [ ] Clearer hero section (value prop in 5 words)
- [ ] "Try GM Button" demo (no login required)
- [ ] Social proof (X users, Y GMs sent today)
- [ ] Video demo (15 seconds, autoplay muted)
- [ ] Testimonials (real user quotes)

**Template Reference**: `music/dashboards/` marketing templates  
**Priority**: 🟡 MEDIUM (Phase 2)

---

### 2. `/Dashboard` - User Dashboard ⭐⭐⭐ (MOST CRITICAL)
**Current**: GM button, streak, XP, quests, analytics  
**Purpose**: Daily engagement hub  

**Section A: Hero Section (Above fold)**
- [ ] GM Button (HUGE, centered, glowing if available)
- [ ] Streak display (fire emoji + number + milestone indicator)
- [ ] XP/Level progress bar (visual + numbers)
- [ ] Next reward preview ("Tomorrow: +55 XP")
- [ ] Daily bonus timer ("18h 23m until next GM")

**Section B: Quick Actions (2nd screen)**
- [ ] Active quests (3 cards max, scrollable)
- [ ] "Share Streak" button (viral mechanic)
- [ ] "View Leaderboard" CTA (your rank preview)
- [ ] Notification center (condensed, link to /notifications)

**Section C: Analytics (3rd screen - optional)**
- [ ] Weekly activity graph
- [ ] Badge collection preview (top 4 badges)
- [ ] Referral stats (if implemented)

**Template Reference**: 
- `music/dashboards/dashboard-01-default.tsx` (layout)
- `trezoadmin-41/Header/` (notification patterns)

**Priority**: 🔥🔥🔥 CRITICAL - Core retention page

---

### 3. `/Quest` - Quest Hub
**Current**: Quest list, filters, search  
**Purpose**: Quest discovery + completion  

**Needed Improvements**:
- [ ] Featured quests section (top 3, auto-rotate)
- [ ] Filter chips (All / Social / Onchain / Token Rewards)
- [ ] Sort options (Ending soon, Highest reward, Popular)
- [ ] Quest cards: Bigger, clearer rewards, progress indicators
- [ ] "Bookmark" feature (save for later)
- [ ] Empty state (when no quests match filter)
- [ ] Pull-to-refresh

**Template Reference**: 
- `music/applications/projects-list-grid.tsx` (card grid)
- `music/ui/forms/input.tsx` (search bar)

**Priority**: 🔥 HIGH

---

### 4. `/leaderboard` - Global Leaderboard
**Current**: Ranked list, filters, season info  
**Purpose**: Competition + social proof  

**Needed Improvements**:
- [ ] Your rank highlight (sticky at top on mobile)
- [ ] Podium view (top 3 users, special design)
- [ ] "Share Rank" button (viral mechanic)
- [ ] Filter tabs (All / Farcaster / Onchain)
- [ ] Infinite scroll (currently paginated?)
- [ ] Pull-to-refresh
- [ ] Avatar images (currently just addresses)

**Template Reference**: 
- `music/applications/users-list-default.tsx` (list layout)
- `music/ui/datatables/` (table if needed)

**Priority**: 🔥 HIGH

---

### 5. `/profile` + `/profile/[fid]/badges` - User Profile
**Current**: User stats, badge collection  
**Purpose**: Achievement showcase + social proof  

**Needed Improvements**:
- [ ] Profile header (avatar, name, bio, stats row)
- [ ] Badge grid (larger images, click to expand)
- [ ] "Flex Badge" share button (viral mechanic)
- [ ] Activity timeline (recent GMs, quests completed)
- [ ] Streak calendar (visual grid showing GM history)
- [ ] Edit profile button (if own profile)

**Template Reference**: 
- `music/applications/user-profile-default.tsx`
- `music/ui/overlays/modal-*.tsx` (badge detail modal)

**Priority**: 🟡 MEDIUM

---

### 6. `/Quest/creator` - Quest Creation Tool
**Current**: Form to create quests  
**Purpose**: User-generated content  

**Needed Improvements**:
- [ ] Step-by-step wizard (not one long form)
- [ ] Quest preview (see before publish)
- [ ] Template selection (clone existing quest type)
- [ ] Better validation (inline, clear errors)
- [ ] Success state (share new quest CTA)

**Template Reference**: 
- `music/ui/forms/` (form components)
- `music/applications/projects-create.tsx` (wizard pattern)

**Priority**: 🟢 LOW (Phase 2+)

---

### 7. `/notifications` - Notification Center
**Current**: Notification history  
**Purpose**: View all notifications  

**Needed Improvements**:
- [ ] Grouped by date (Today, Yesterday, This Week)
- [ ] Mark all as read button
- [ ] Filter tabs (All / Quests / Social / Rewards)
- [ ] Swipe to delete (mobile)
- [ ] Empty state (cute illustration)
- [ ] Pull-to-refresh

**Template Reference**: 
- `trezoadmin-41/Header/Notifications.tsx` (notification item)
- `music/applications/mail-inbox-default.tsx` (list layout)

**Priority**: 🟢 LOW (Phase 2)

---

## 🗺️ Migration Priority Order

### Phase 1: Foundation (CURRENT - Section 1.14 & 1.15)
1. ✅ Navigation/Layout (DONE - Section 1.10)
2. ✅ Notification Dropdown (DONE - Section 1.11)
3. ⏳ **Button Library** (Section 1.14 - TODAY)
4. ⏳ **Dialog System** (Section 1.15 - TODAY)

### Phase 1.5: Auth System Consolidation ✅ **COMPLETE!**
**Status**: ✅ COMPLETE (Dec 1, 2025)
**Document**: `PHASE-1.5-AUTH-CONSOLIDATION.md` (root)
**Duration**: 6 hours (on time)

**Completed**:
- ✅ AuthContext with unified auth state (267 lines)
- ✅ useAuth hook for all pages (119 lines)
- ✅ Fixed miniapp loading (10s timeout + base.dev detection)
- ✅ useMiniKitAuth marked deprecated with migration guide
- ✅ Comprehensive documentation (1,097 lines across 3 files)
- ✅ Integration tests passed (5/5)

**Deliverables**:
- `lib/contexts/AuthContext.tsx` - Unified auth provider
- `lib/hooks/use-auth.ts` - Type-safe hook
- `docs/api/auth/unified-auth.md` - API reference
- `docs/troubleshooting/auth-issues.md` - Troubleshooting guide
- `docs/development/mcp-usage.md` - MCP findings

**Phase 2 Unblocked**: All pages can now use `useAuth()` hook! 🎉

---

### Phase 2: Dashboard Enhancements (Dec 1-2) 🚀 **READY TO START!**
1. **Dashboard Hero Section** (GM button mega-upgrade)
   - Pre-GM reward preview
   - Streak milestone indicators
   - Bigger celebration animation
   - Daily bonus timer
   
2. **Viral Sharing Buttons** (All pages)
   - Share streak (Dashboard)
   - Share rank (Leaderboard)
   - Flex badge (Profile)
   - Viral bonus indicators

3. **Mobile Optimizations** (All pages)
   - Larger tap targets (Quest cards)
   - Pull-to-refresh (Dashboard, Quests, Leaderboard)
   - Skeleton loading states
   - Better touch feedback

### Phase 3: Quest Hub Enhancement (Dec 4-5)
1. **Quest Cards Redesign**
   - Larger, clearer rewards
   - Progress indicators
   - Bookmark feature
   - Featured quests section

2. **Quest Filtering**
   - Filter chips (better UX than dropdowns)
   - Sort options
   - Search improvements
   - Empty states

### Phase 4: Profile & Polish (Dec 6-7)
1. **Profile Enhancements**
   - Profile header redesign
   - Badge grid improvements
   - Streak calendar
   - Activity timeline

2. **Final Polish**
   - Transaction status UI
   - Form validation (Quest creator)
   - Leaderboard podium view
   - Animation polish

---

## 📊 Template Utilization Plan

**Current**: 1.26% (100/7,973 files used)  
**Target Phase 1**: 3% (~240 files) - Buttons, Dialogs, Forms  
**Target Phase 2**: 5% (~400 files) - Dashboard cards, Quest cards  
**Target Phase 3**: 7% (~560 files) - Tables, Charts, Overlays  
**Target Phase 4**: 10% (~800 files) - Full component library

**Key Template Folders**:
- `music/ui/buttons/` (46 files) - Button variants ← Section 1.14
- `music/ui/overlays/` (86 files) - Dialogs, modals ← Section 1.15
- `music/ui/forms/` (91 files) - Input, validation (Phase 2)
- `music/dashboards/` (33 files) - Dashboard layouts (Phase 2)
- `music/applications/` (124 files) - Page templates (Phase 2-3)
- `music/ui/datatables/` (44 files) - Leaderboard tables (Phase 3)

---

## ✅ Next Actions (TODAY - Dec 1)

1. ✅ **Created**: This PAGE-RESTRUCTURE-PLAN.md document
2. ⏳ **Execute**: Section 1.14 - Button Library (2 hours)
3. ⏳ **Execute**: Section 1.15 - Dialog System (3 hours)
4. ⏳ **Update**: FOUNDATION-REBUILD-ROADMAP.md + CURRENT-TASK.md (mark complete)

**After Sections 1.14 & 1.15**:
- Declare Phase 1 complete at 68.75% (11/16 sections)
- Move Forms/Tables/Dropdowns to Phase 2
- Start Phase 2 planning with THIS document as guide

---

## 📝 Notes

- Root docs are CLEAN (only 8 markdown files) ✅
- No old docs to delete - they were already moved to `/docs/` ✅
- Focus is on VIRAL MECHANICS from research, not just template copying
- Every page improvement must serve retention/growth metrics
- Mobile-first is NON-NEGOTIABLE (90% of users)

**Remember**: We have 10 users. Every feature must make them come back DAILY. That's the mission. 🎯
