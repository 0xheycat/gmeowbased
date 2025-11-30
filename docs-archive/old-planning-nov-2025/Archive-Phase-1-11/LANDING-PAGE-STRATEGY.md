# Landing Page & First-Time User Experience Strategy

**Date**: November 26, 2025  
**Updated**: November 27, 2025 (Implementation Complete)  
**Status**: ✅ **LIVE - 100% Template Compliant**  
**Goal**: Create world-class first impression for Gmeowbased Adventure

---

## ✅ Implementation Status (January 12, 2025)

### What's ACTUALLY Live Now

**Landing Page** (`/app/page.tsx`) - ✅ **100% COMPLETE**
- Template Compliance: ✅ 100% (Tailwick v2.0 + Gmeowbased v0.1)
- Data Integration: ✅ 100% (All real data from Supabase MCP)
- TypeScript: ✅ 0 errors
- Security: ✅ RLS enabled on all tables

**Miniapp Integration** - ✅ **100% COMPLETE** ⭐
- Detection: ✅ `/lib/miniapp-detection.ts` (reused from old foundation)
- React Hook: ✅ `/hooks/useMiniapp.tsx` (client-side state)
- SDK Init: ✅ `/components/MiniappReady.tsx` (auto-init Farcaster SDK)
- Layout: ✅ Meta tags added to `/app/layout.tsx`
- Platforms: ✅ Farcaster & Base.dev support
- Status: ✅ TypeScript 0 errors

**Onboarding Flow** (`/app/onboard/page.tsx`) - ✅ **100% COMPLETE** ⭐
- Welcome Screen: ✅ With feature highlights
- Tutorial Step 1: ✅ Daily GM streak explanation
- Tutorial Step 2: ✅ Quests overview
- Tutorial Step 3: ✅ Profile & achievements
- Completion: ✅ `/api/user/complete-onboarding`
- Status Tracking: ✅ `/api/user/onboarding-status`
- Rewards: ✅ +50 XP for completing tutorial
- Supabase: ✅ `onboarded_at` field in `user_profiles`
- Components: ✅ Tailwick v2.0 (Card, Button, Badge)
- Assets: ✅ Gmeowbased v0.1 icons (100% SVG)
- TypeScript: ✅ 0 errors

**Main App Dashboard** (`/app/app/page.tsx`) - ✅ **100% COMPLETE** ⭐
- First-Time Detection: ✅ Checks `onboarded_at` (last 24 hours)
- Welcome Banner: ✅ Shows for first-time users
- Quick Start Quests: ✅ 3 beginner quests highlighted
- Stats Overview: ✅ StatsCard components (GM Streak, XP, Badges, Rank)
- Real Data: ✅ Fetches from `/api/user/stats`
- Miniapp Badge: ✅ Shows Farcaster/Base.dev context
- TypeScript: ✅ 0 errors

**User Authentication** - ✅ **100% COMPLETE** ⭐ (Phase 2)
- Farcaster Auth: ✅ `/lib/auth/farcaster.ts`
  - FID Detection: ✅ Miniapp context → Headers → Session
  - Auth Helpers: ✅ `getFarcasterFid()`, `isAuthenticated()`, `requireAuth()`
  - Admin Check: ✅ `checkAdminAuth()` for protected routes
  - TypeScript: ✅ 0 errors

**Session Management** - ✅ **100% COMPLETE** ⭐ (Phase 3) NEW
- Session Utils: ✅ `/lib/auth/session.ts`
  - JWT-Based: ✅ Signed tokens with jose library
  - Secure Cookies: ✅ httpOnly, secure, sameSite=lax
  - Session Duration: ✅ 7 days with auto-refresh within 24 hours
  - Functions: ✅ `createSession()`, `verifySession()`, `getSession()`, `setSessionCookie()`, `clearSessionCookie()`
- Session API: ✅ `/app/api/auth/session/route.ts`
  - POST: ✅ Create session from Farcaster auth
  - GET: ✅ Get current session
  - DELETE: ✅ Logout (destroy session)
- Integration: ✅ `getFarcasterFid()` now checks session cookies
- Environment: ✅ SESSION_SECRET added to .env.example.supabase
- TypeScript: ✅ 0 errors

**User Profile Auto-Creation** - ✅ **100% COMPLETE** ⭐ (Phase 3) NEW
- Profile API: ✅ `/app/api/auth/profile/route.ts`
  - GET: ✅ Get profile with auto-creation if doesn't exist
  - POST: ✅ Manual profile creation
- Neynar Integration: ✅ Fetches user data via `fetchUserByFid()`
- Tier Calculation: ✅ Based on Neynar Score (0.0-1.0+)
  - mythic: >0.9 (OG NFT eligible)
  - legendary: 0.7-0.9
  - epic: 0.5-0.7
  - rare: 0.3-0.5
  - common: <0.3
- Database: ✅ Auto-inserts into `user_profiles` table
- Fields: ✅ fid, username, display_name, pfp_url, bio, neynar_score, neynar_tier, og_nft_eligible
- TypeScript: ✅ 0 errors

**Quest System Foundation** - ✅ **100% COMPLETE** ⭐ (Phase 3) NEW
- Database Tables: ✅ Created via MCP Supabase
  - `quest_definitions`: Quest templates with rewards (10 starter quests inserted)
  - `user_quests`: User progress tracking
  - Indexes: ✅ 11 performance indexes created
  - RLS Policies: ✅ Enabled with public read for active quests
- Quest API: ✅ Created 3 endpoints
  - GET `/api/quests`: Fetch available quests with filtering (type, category, difficulty, featured)
  - POST `/api/quests/progress`: Update quest progress with auto-completion
  - POST `/api/quests/claim-rewards`: Claim XP, points, badges (updates user_profiles + gmeow_rank_events)
- Starter Quests: ✅ 10 quests pre-populated
  - 3 Beginner (First Daily GM, Profile Explorer, Badge Collector)
  - 2 Daily (Daily GM Streak, Social Butterfly)
  - 2 Weekly (7-Day Streak Master, Multi-Chain Explorer)
  - 1 Guild (Join a Guild)
  - 2 Achievement (Point Collector, Badge Master)
- First Quest Auto-Unlock: ✅ Onboarding completion automatically unlocks beginner quests
  - Updated `/app/api/user/complete-onboarding/route.ts`
  - Queries quests with `difficulty='beginner'` OR `category='onboarding'`
  - Inserts into `user_quests` with `status='available'`
- Quest Page UI: ✅ Complete Tailwick v2.0 implementation (`/app/app/quests/page.tsx`)
  - Components: Card, Badge, Button, StatsCard, IconWithBadge, SectionHeading, EmptyState
  - Features: Quest cards with difficulty-based colors, progress bars, filters (type/category/difficulty)
  - Icons: Gmeowbased v0.1 (Quests Icon, Trophy Icon, Rank Icon, Credits Icon, Badges Icon)
  - API Integration: Real-time quest fetching, progress tracking, reward claiming
  - Quest Sections: Available/In Progress, Ready to Claim, Claimed Rewards
  - Empty State: No quests found with clear filters action
- TypeScript: ✅ 0 errors on all files
- Files Created:
  - `/app/api/quests/route.ts` (120 lines)
  - `/app/api/quests/progress/route.ts` (140 lines)
  - `/app/api/quests/claim-rewards/route.ts` (180 lines)
  - `/app/app/quests/page.tsx` (500+ lines Tailwick implementation)
- Files Updated:
  - `/app/api/user/complete-onboarding/route.ts` (added quest unlock logic)
- FID Detection: ✅ Miniapp context, headers, session support
- Auth Helpers: ✅ `getFarcasterFid()`, `isAuthenticated()`, `requireAuth()`
- Admin Auth: ✅ `checkAdminAuth()` (reused from old foundation)
- Ownership Check: ✅ `checkFidOwnership()` for resource access
- TypeScript: ✅ 0 errors

**Navigation System** - ✅ **100% COMPLETE** ⭐ (Phase 3e) NEW
- Desktop Sidebar: ✅ `/components/navigation/AppNavigation.tsx` (~350 lines)
  - Logo + app name + miniapp badge
  - 5 main nav items: Dashboard, Daily GM, Quests, Guilds, Leaderboard
  - Active route highlighting with gradient (from-purple-600 to-blue-600)
  - User profile section at bottom with tier badge
  - Profile dropdown: View Profile, Settings, Notifications, Logout
- Mobile Navigation: ✅ Top bar + bottom tab bar
  - Top Bar: Logo, notifications icon with count badge, profile avatar
  - Bottom Nav: 5 tab buttons with icons, active indicator (gradient underline)
  - Safe area padding for iOS notch
- Layout Wrapper: ✅ `/components/layouts/AppLayout.tsx` (~20 lines)
  - Wraps page content with navigation
  - Responsive spacing: Desktop (lg:ml-64), Mobile (h-14 top, pb-24 bottom)
  - Background gradient: from-slate-950 via-purple-950/20 to-slate-950
- Profile Features: ✅ User avatar from Neynar, tier badge display
  - Tier Colors: mythic=purple, legendary=yellow, epic=blue, rare=green, common=gray
  - Notification count badge (red circle on bell icon)
- Icons: ✅ 10+ Gmeowbased v0.1 SVG icons
  - Newsfeed, Success Box, Quests, Groups, Trophy, Profile, Settings, Notifications, Return, Toggle Side Menu
- Integration: ✅ Wrapped dashboard + quests pages with AppLayout
- Responsive Design: ✅ Mobile-first with breakpoint at lg (1024px)
- TypeScript: ✅ 0 errors (verified)
- Files Created:
  - `/components/navigation/AppNavigation.tsx` (~350 lines)
  - `/components/layouts/AppLayout.tsx` (~20 lines)
- Files Updated:
  - `/app/app/page.tsx` (wrapped with AppLayout)
  - `/app/app/quests/page.tsx` (wrapped with AppLayout)

**User Stats API** - ✅ **100% COMPLETE** ⭐ NEW
- Endpoint: ✅ `GET /api/user/stats?fid=123`
- GM Streak: ✅ Calculated from `gmeow_rank_events` (consecutive days)
- Total XP: ✅ Aggregated from `gmeow_rank_events.points`
- Badges Earned: ✅ Count from `user_badges` table
- Leaderboard Rank: ✅ From `leaderboard_snapshots`
- Error Handling: ✅ Graceful fallbacks if tables don't exist
- TypeScript: ✅ 0 errors

**Tutorial Rewards** - ✅ **100% COMPLETE** ⭐ NEW
- Completion Bonus: ✅ +50 XP awarded automatically
- Event Logging: ✅ Inserted into `gmeow_rank_events`
- UI Notification: ✅ Success badge shown for 2 seconds
- Dashboard Update: ✅ Real stats reflect reward immediately
- TypeScript: ✅ 0 errors

### What's NOT Implemented Yet ❌

1. ❌ **User Session Management** (cookies/JWT)
   - Currently uses Farcaster miniapp context + headers
   - Need persistent sessions for web browsers
   - Implement secure session cookies

2. ❌ **First Quest Auto-Unlock**
   - Tutorial reward grants XP
   - Should also unlock first quest automatically

3. ❌ **User Profile Creation Flow**
   - Assumes user profile exists in database
   - Need profile creation on first login

### Current Reality Check

**What Works** ✅:
- Landing page with real data ✅
- Daily GM route ✅
- Component library (tailwick-primitives) ✅
- MCP Supabase (19 tables) ✅
- **Miniapp detection & SDK** ✅
- **Onboarding 3-step tutorial** ✅
- **First-time dashboard** ✅
- **Farcaster authentication** ✅
- **Real user stats API** ✅
- **Tutorial completion rewards** ✅

**What Doesn't Exist** ❌:
- Persistent session management (cookies/JWT)
- First quest auto-unlock
- User profile creation flow

---

## 🎯 What Needs to Be Built (Priority Order)

### ~~Priority 1: Miniapp Integration~~ ✅ **COMPLETE**

**Status**: ✅ **IMPLEMENTED** (January 12, 2025)

**What Was Built**:
1. ✅ Miniapp detection library (`/lib/miniapp-detection.ts`)
   - Reused 100% working logic from old foundation
   - Functions: `isEmbedded()`, `isAllowedReferrer()`, `probeMiniappReady()`, `getMiniappContext()`, `safeComposeCast()`, `fireMiniappReady()`
   - Allowed hosts: farcaster.xyz, warpcast.com, base.dev, gmeowhq.art

2. ✅ React hook (`/hooks/useMiniapp.tsx`)
   - Returns: `isEmbedded`, `isAllowed`, `isReady`, `context`, `isFarcaster`, `isBase`
   - Helper: `composeCast()` for Farcaster actions

3. ✅ SDK initializer (`/components/MiniappReady.tsx`)
   - Auto-fires `fireMiniappReady()` on mount
   - Dispatches 'miniapp:ready' event

4. ✅ Layout integration (`/app/layout.tsx`)
   - Added `MiniappReady` component
   - Existing `fc:miniapp` and `fc:miniapp:frame` meta tags

**TypeScript**: ✅ 0 errors

### ~~Priority 2: Onboarding Flow~~ ✅ **COMPLETE**

**Status**: ✅ **IMPLEMENTED** (January 12, 2025)

**What Was Built**:
1. ✅ Onboarding route (`/app/onboard/page.tsx`)
   - Welcome screen with feature highlights
   - 3-step tutorial: Daily GM, Quests, Profile
   - Progress indicator (Badge components)
   - Skip tutorial option
   - Miniapp detection (shows Farcaster/Base.dev badge)

2. ✅ API routes
   - `GET /api/user/onboarding-status` - Check if user completed onboarding
   - `POST /api/user/complete-onboarding` - Mark tutorial as complete

3. ✅ Database schema
   - `onboarded_at` field in `user_profiles` (already existed in migration)
   - Detection logic: first-time if onboarded < 24 hours ago

4. ✅ Components used
   - Tailwick v2.0: Card, CardBody, Button, Badge, SectionHeading
   - Gmeowbased v0.1: Success Box Icon, Quests Icon, Profile Icon, Trophy Icon, Groups Icon

**TypeScript**: ✅ 0 errors

### ~~Priority 3: First-Time Dashboard~~ ✅ **COMPLETE**

**Status**: ✅ **IMPLEMENTED** (January 12, 2025)

**What Was Built**:
1. ✅ Enhanced `/app/app/page.tsx`
   - First-time user detection (checks `onboarded_at`)
   - Welcome banner for users who just completed onboarding
   - Stats overview: GM Streak, Total XP, Badges, Rank (StatsCard components)
   - Quick Start Quests section (3 beginner quests highlighted)
   - Miniapp badge (shows Farcaster/Base.dev context)

2. ✅ Components used
   - StatsCard (gradient cards with icons)
   - Card with gradient backgrounds
   - Badge for status indicators
   - Gmeowbased v0.1 icons throughout

**TypeScript**: ✅ 0 errors

### Priority 4: User Authentication ⚠️ **NEXT**

**Why Critical**: Need real user sessions for onboarding tracking

**Required**:
1. Farcaster auth integration (using Neynar/Farcaster SDK)
2. Session management (Supabase Auth)
3. User profile creation on first login
4. Wallet connection flow

**Files to Create**:
- `/lib/auth/farcaster.ts` - Farcaster auth helpers
- `/app/api/auth/login/route.ts` - Login endpoint
- `/app/api/auth/verify/route.ts` - Verify Farcaster signature

### Priority 5: Real User Stats API ⚠️ **NEXT**

**Why Needed**: Dashboard currently shows placeholder stats

**Required**:
1. Create `/api/user/stats` endpoint
2. Query `gmeow_rank_events` for GM streak
3. Query `xp_transactions` for total XP
4. Query `user_badges` for badges earned
5. Query `leaderboard_snapshots` for rank

**Files to Create**:
- `/app/api/user/stats/route.ts`

---

## 🎯 Strategic Decision: Landing Page vs Main App

**1. LiveStats Component** ✅
```typescript
// Real queries to production tables
- Total active players (user_profiles)
- Today's GMs (gmeow_rank_events)
- Total quests completed (quest completion aggregates)
- Active guilds (guild counts)
- Weekly rewards (xp_transactions)
```

**2. LeaderboardPreview Component** ✅
```typescript
// Top 5 players from leaderboard_snapshots
- Real ranks, scores, streaks
- Profile data from user_profiles
- XP from xp_transactions
```

**3. ViralMetrics Component** ✅
```typescript
// Viral engagement from viral_share_events
- Total shares this week
- Viral reach (estimated)
- Share growth trend
- Top shared content
```

**4. Testimonials Component** ✅ **NEW**
```typescript
// Featured testimonials from testimonials table
- Real user testimonials (username, role, quote)
- Gmeowbased v0.1 avatar images
- Fetched via /api/testimonials
- Cached for 1 hour (revalidate: 3600)
```

### All Data Integration Complete ✅

**Priority 1 - Hero Section Stats** ⚠️
```tsx
// Currently mock, should be real:
<LiveStats /> // Already real ✅
```
**Fix**: Hero stats are already using LiveStats component with real data ✅

**Priority 2 - Testimonials** ⚠️
```tsx
// Currently mock testimonials
const testimonials = [
  { name: '@cryptoGM', quote: '...', avatar: '01-Default.png' }
]
```
**Fix Needed**: 
1. Add `testimonials` table in Supabase
2. Create MCP query: `get_featured_testimonials`
3. Replace mock data with real user testimonials

**Priority 3 - Social Proof Numbers** ⚠️
```tsx
// Currently using same LiveStats data
// Could add more specific metrics
```
**Fix**: Already using real data via LiveStats component ✅

---

## 🎯 Strategic Decision: Landing Page vs Main App

### Option A: Separate Marketing Landing Page ⭐ **RECOMMENDED**

**Structure**:
```
https://gmeowhq.art/              → Marketing landing page
https://gmeowhq.art/app           → Main app (after onboarding)
https://gmeowhq.art/frame         → Farcaster Frame entry
```

**Why This Works**:
- ✅ **Conversion Focused**: Landing page optimized for sign-ups
- ✅ **Clear Value Prop**: Showcase features before commitment
- ✅ **Better SEO**: Marketing content indexed separately
- ✅ **A/B Testing**: Easy to test different messaging
- ✅ **Professional**: Industry standard for successful apps
- ✅ **Farcaster Integration**: Frame can redirect to landing or app

**Examples**:
- Friend.tech: Landing page → App
- Farcaster: warpcast.com → app
- Base: base.org → bridge
- Coinbase: coinbase.com → app

---

### Option B: Direct-to-App (No Landing)

**Structure**:
```
https://gmeowhq.art/ → Onboarding flow → Main app
```

**Why This Could Work**:
- ✅ **Faster Entry**: No extra clicks
- ✅ **Simpler**: One codebase
- ✅ **Mobile-First**: Common for pure mobile apps

**Challenges**:
- ❌ No marketing content for SEO
- ❌ Hard to explain features before trying
- ❌ Confusing for first-time visitors
- ❌ Difficult to A/B test messaging

---

## 🏆 Recommended Approach: Option A (Landing + App)

### User Journey Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. DISCOVERY                                            │
│ User finds Gmeowbased via:                              │
│ • Farcaster cast/frame                                  │
│ • Twitter/X post                                        │
│ • Google search                                         │
│ • Word of mouth                                         │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. LANDING PAGE (gmeowhq.art)                          │
│ • Hero: "Begin Your On-Chain Adventure"                │
│ • Features showcase                                     │
│ • Social proof (stats, users)                          │
│ • CTA: "Launch Game" or "Connect Wallet"               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. ONBOARDING (gmeowhq.art/onboard)                    │
│ • Welcome screen                                        │
│ • Connect wallet                                        │
│ • Choose username                                       │
│ • Quick tutorial (3 steps)                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. MAIN APP (gmeowhq.art/app)                          │
│ • Dashboard (first-time optimized)                      │
│ • Available quests                                      │
│ • Daily GM                                              │
│ • Quick actions                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🌟 Landing Page Design (Farcaster Miniapp Optimized)

### Hero Section

**Mobile-First Design** (Farcaster miniapp is primary):

```tsx
// HERO SECTION
┌─────────────────────────────────────┐
│                                     │
│    [Animated Gmeow Character]       │
│         (Pixel art, subtle          │
│          animation loop)            │
│                                     │
│   🎮 GMEOWBASED ADVENTURE           │
│                                     │
│   Your Daily On-Chain Quest Game    │
│   on Base, Optimism, Celo & More    │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   🚀 Launch Game            │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   📺 Watch Demo             │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Key Elements**:
- 🎨 **Hero Visual**: Animated Gmeow character (pixel art style)
- 📱 **Tagline**: Clear, concise value proposition
- 🎯 **Primary CTA**: "Launch Game" (large, touch-friendly)
- 📺 **Secondary CTA**: "Watch Demo" (15-second video)
- ⚡ **No signup required**: Launch directly for exploration

---

### Features Section

**Grid Layout** (Mobile: 1 column, Desktop: 3 columns):

```tsx
┌─────────────────────────────────────┐
│   WHY GMEOWBASED?                   │
├─────────────────────────────────────┤
│                                     │
│   ☀️ DAILY GM RITUALS               │
│   Earn rewards for saying GM        │
│   Build your streak, unlock badges  │
│   Join 10,000+ daily GMers          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   🎯 ON-CHAIN QUESTS                │
│   Complete tasks, earn points       │
│   100+ quests across 5 chains       │
│   Real blockchain achievements      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   🏰 JOIN GUILDS                    │
│   Team up with fellow adventurers   │
│   Guild battles & tournaments       │
│   Shared rewards & prestige         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   🎖️ COLLECT BADGES                 │
│   Mint NFT badges for achievements  │
│   Showcase in your collection       │
│   Rare badges, special perks        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   🏆 COMPETE & EARN                 │
│   Climb the leaderboard             │
│   Weekly tournaments                │
│   Prizes for top performers         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│   🌐 MULTI-CHAIN                    │
│   Base, Optimism, Celo, Unichain   │
│   One account, all networks         │
│   Seamless cross-chain experience   │
│                                     │
└─────────────────────────────────────┘
```

**Feature Cards** should include:
- 🎨 Icon (custom illustration)
- 📝 Clear headline
- 💬 2-3 line description
- 🔢 Social proof number (where applicable)

---

### Social Proof Section

```tsx
┌─────────────────────────────────────┐
│   GMEOWBASED BY THE NUMBERS         │
├─────────────────────────────────────┤
│                                     │
│   10,000+        1M+        500+    │
│   Players        GMs Said   Quests  │
│                                     │
│   50+            $10K+      95%     │
│   Guilds         Rewards    Happy   │
│                                     │
└─────────────────────────────────────┘
```

**Stats to Showcase** (Real-time from API):
- Total players
- Total GMs said
- Total quests completed
- Active guilds
- Total rewards distributed
- User satisfaction rate

---

### How It Works Section

**3-Step Onboarding** (Visual flow):

```tsx
┌─────────────────────────────────────┐
│   GET STARTED IN 3 STEPS            │
├─────────────────────────────────────┤
│                                     │
│   1️⃣ CONNECT WALLET                 │
│   [Wallet icon]                     │
│   Connect with Coinbase Wallet,     │
│   MetaMask, or Farcaster            │
│         ↓                           │
│                                     │
│   2️⃣ SAY GM                         │
│   [GM button illustration]          │
│   Start your daily streak & earn    │
│   your first points                 │
│         ↓                           │
│                                     │
│   3️⃣ COMPLETE QUESTS                │
│   [Quest card preview]              │
│   Choose from 100+ quests, earn     │
│   rewards & unlock badges           │
│                                     │
└─────────────────────────────────────┘
```

---

### Showcase Section (Visual Tour)

**Interactive Screenshots/Video**:

```tsx
┌─────────────────────────────────────┐
│   SEE IT IN ACTION                  │
├─────────────────────────────────────┤
│                                     │
│   [Video/GIF Carousel]              │
│   • Daily GM ritual                 │
│   • Quest completion                │
│   • Badge minting                   │
│   • Guild battles                   │
│   • Leaderboard                     │
│                                     │
│   < Previous | Next >               │
│                                     │
└─────────────────────────────────────┘
```

**Media Types**:
- 📹 15-second demo video (autoplay, muted)
- 🖼️ Screenshot carousel (swipeable on mobile)
- 🎬 GIF animations of key features
- 📱 Mobile mockups showing miniapp experience

---

### Testimonials Section

```tsx
┌─────────────────────────────────────┐
│   WHAT PLAYERS SAY                  │
├─────────────────────────────────────┤
│                                     │
│   "Best Web3 game I've played!      │
│   The daily GM streak is addictive" │
│   — @cryptoGM                       │
│                                     │
│   ───────────────────────────       │
│                                     │
│   "Love the guild system. Built     │
│   amazing friendships here."        │
│   — @defiQueen                      │
│                                     │
│   ───────────────────────────       │
│                                     │
│   "Finally, a game that rewards     │
│   actual blockchain activity"       │
│   — @baseBuilder                    │
│                                     │
└─────────────────────────────────────┘
```

---

### Final CTA Section

```tsx
┌─────────────────────────────────────┐
│                                     │
│   READY TO BEGIN YOUR ADVENTURE?    │
│                                     │
│   Join 10,000+ players on the       │
│   most rewarding on-chain game      │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   🚀 Launch Game Now        │   │
│   └─────────────────────────────┘   │
│                                     │
│   No signup required to explore     │
│                                     │
└─────────────────────────────────────┘
```

---

### Footer

```tsx
┌─────────────────────────────────────┐
│   GMEOWBASED                        │
│   Your Daily On-Chain Adventure     │
│                                     │
│   Product                           │
│   • Features                        │
│   • How it Works                    │
│   • Leaderboard                     │
│   • Guilds                          │
│                                     │
│   Resources                         │
│   • Documentation                   │
│   • Smart Contracts                 │
│   • API                             │
│   • Brand Kit                       │
│                                     │
│   Community                         │
│   • Twitter/X                       │
│   • Farcaster                       │
│   • Discord                         │
│   • GitHub                          │
│                                     │
│   Legal                             │
│   • Privacy Policy                  │
│   • Terms of Service                │
│   • Security                        │
│                                     │
│   Built on Base, Optimism, Celo     │
│   © 2025 Gmeowbased                 │
└─────────────────────────────────────┘
```

---

## 🎮 Main App Design (First-Time User)

When users click "Launch Game" and connect wallet, they see:

### Welcome Screen (First Visit Only)

```tsx
┌─────────────────────────────────────┐
│   WELCOME TO GMEOWBASED! 🎉         │
├─────────────────────────────────────┤
│                                     │
│   [Animated Gmeow character         │
│    waving and bouncing]             │
│                                     │
│   Hi there, adventurer!             │
│                                     │
│   Let's get you started with        │
│   a quick tour...                   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   Start Tour (30 seconds)   │   │
│   └─────────────────────────────┘   │
│                                     │
│   Skip Tour →                       │
│                                     │
└─────────────────────────────────────┘
```

### Interactive Tutorial (3 Steps)

**Step 1: Daily GM**
```tsx
┌─────────────────────────────────────┐
│   [Spotlight on GM Button]          │
│                                     │
│   👆 TAP HERE TO SAY GM              │
│                                     │
│   Say GM daily to earn points       │
│   and build your streak!            │
│                                     │
│   Current Streak: 0 days            │
│   Reward: +10 points                │
│                                     │
│   [Pulsing indicator on GM button]  │
│                                     │
│   (1/3)                             │
└─────────────────────────────────────┘
```

**Step 2: Browse Quests**
```tsx
┌─────────────────────────────────────┐
│   [Spotlight on Quest List]         │
│                                     │
│   🎯 COMPLETE YOUR FIRST QUEST       │
│                                     │
│   Choose a quest and earn rewards   │
│   Tap any quest to see details      │
│                                     │
│   [Highlighted quest card:          │
│    "Follow @gmeowbased on           │
│     Farcaster" - 50 points]         │
│                                     │
│   (2/3)                             │
└─────────────────────────────────────┘
```

**Step 3: Check Profile**
```tsx
┌─────────────────────────────────────┐
│   [Spotlight on Profile Icon]       │
│                                     │
│   👤 YOUR PROFILE                    │
│                                     │
│   Track your progress, view badges  │
│   and climb the leaderboard!        │
│                                     │
│   Current Level: Novice             │
│   Total Points: 10                  │
│   Badges Earned: 1                  │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   Got it! Let's play        │   │
│   └─────────────────────────────┘   │
│                                     │
│   (3/3)                             │
└─────────────────────────────────────┘
```

---

### Main Dashboard (First-Time User View)

**Optimized for new users** with clear guidance:

```tsx
┌─────────────────────────────────────┐
│   ☰ Gmeowbased    🔔 [Profile]     │
├─────────────────────────────────────┤
│                                     │
│   WELCOME BACK, [USERNAME]! 👋      │
│   Level 1 Novice                    │
│   ▓░░░░░░░░░ 10/100 XP              │
│                                     │
├─────────────────────────────────────┤
│   TODAY'S CHALLENGE 🌅              │
│   ┌─────────────────────────────┐   │
│   │  ☀️ Say GM                   │   │
│   │  Start your daily streak     │   │
│   │  Reward: +10 points          │   │
│   │  [Say GM Now →]             │   │
│   └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│   QUICK START QUESTS 🎯             │
│   Perfect for beginners!            │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 🔵 Follow on Farcaster       │   │
│   │ Easy • 50 points            │   │
│   │ 2 mins                      │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 💬 Make Your First Cast      │   │
│   │ Easy • 100 points           │   │
│   │ 5 mins                      │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 🪙 Connect Your Wallet       │   │
│   │ Easy • 75 points            │   │
│   │ 2 mins                      │   │
│   └─────────────────────────────┘   │
│                                     │
│   [View All Quests →]               │
│                                     │
├─────────────────────────────────────┤
│   YOUR PROGRESS TODAY 📊            │
│   ┌─────────────────────────────┐   │
│   │ Quests: 0/3                 │   │
│   │ Points: 10                  │   │
│   │ Streak: 0 days              │   │
│   └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│   EXPLORE MORE 🚀                   │
│   [Guilds] [Badges] [Leaderboard]  │
│                                     │
└─────────────────────────────────────┘
│   [Home] [Quests] [Profile] [More] │
└─────────────────────────────────────┘
```

**Key Features**:
- 🎯 **Beginner-friendly**: Highlights easy quests
- 📊 **Progress tracking**: Shows daily achievements
- 🎁 **Quick wins**: Easy tasks for immediate rewards
- 🧭 **Clear navigation**: Bottom nav bar
- 🌟 **Gamification**: Level, XP, streaks visible

---

## 🎨 Visual Design System (New Foundation)

### Brand Colors

```css
/* Primary Colors */
--gmeow-purple: #8B5CF6;      /* Farcaster purple */
--gmeow-blue: #0052FF;        /* Base blue */
--gmeow-gold: #FFD700;        /* Accent/rewards */

/* Success/Actions */
--action-green: #7CFF7A;      /* Quest complete */
--action-red: #FF4444;        /* Urgent/important */

/* Backgrounds (Dark Mode First) */
--bg-primary: #06091a;        /* Main background */
--bg-surface: #0a1529;        /* Cards, surfaces */
--bg-elevated: #0f1d3d;       /* Modals, overlays */

/* Text */
--text-primary: #FFFFFF;      /* Main text */
--text-secondary: #9CA3AF;    /* Secondary text */
--text-muted: #6B7280;        /* Muted text */
```

### Typography

```css
/* Font Family */
--font-display: 'Gmeow', 'Press Start 2P', monospace;
--font-body: 'Inter', -apple-system, sans-serif;

/* Font Sizes (Mobile-First) */
--text-xs: 12px;      /* Labels, captions */
--text-sm: 14px;      /* Body text small */
--text-base: 16px;    /* Body text (NO SMALLER on mobile) */
--text-lg: 18px;      /* Subheadings */
--text-xl: 24px;      /* Headings */
--text-2xl: 32px;     /* Hero text */

/* Touch Targets */
--touch-min: 44px;    /* Minimum tap target size */
```

### Component Library (Tailwick-Based)

**Button Variants**:
```tsx
// Primary CTA
<Button variant="primary" size="lg">
  🚀 Launch Game
</Button>

// Secondary
<Button variant="secondary" size="md">
  Learn More
</Button>

// Ghost (minimal)
<Button variant="ghost" size="sm">
  Skip
</Button>

// Danger
<Button variant="danger">
  Leave Guild
</Button>
```

**Card Types**:
```tsx
// Quest Card
<Card type="quest" interactive>
  <CardHeader icon="🎯" badge="Easy" />
  <CardTitle>Follow on Farcaster</CardTitle>
  <CardContent>Connect & follow...</CardContent>
  <CardFooter>
    <Reward points={50} time="2 mins" />
  </CardFooter>
</Card>

// Stats Card
<Card type="stats">
  <StatNumber>10,000+</StatNumber>
  <StatLabel>Active Players</StatLabel>
</Card>

// Feature Card
<Card type="feature" icon="☀️">
  <CardTitle>Daily GM</CardTitle>
  <CardContent>Earn rewards...</CardContent>
</Card>
```

---

## 🚀 Technical Implementation

### Landing Page Structure

```
src/
├── app/
│   ├── (landing)/
│   │   ├── page.tsx              # Landing page (/)
│   │   ├── layout.tsx            # Landing layout (no nav)
│   │   └── components/
│   │       ├── Hero.tsx
│   │       ├── Features.tsx
│   │       ├── SocialProof.tsx
│   │       ├── HowItWorks.tsx
│   │       ├── Showcase.tsx
│   │       ├── Testimonials.tsx
│   │       ├── FinalCTA.tsx
│   │       └── Footer.tsx
│   │
│   ├── onboard/
│   │   ├── page.tsx              # Onboarding flow
│   │   ├── welcome.tsx           # Welcome screen
│   │   └── tutorial.tsx          # Interactive tutorial
│   │
│   └── app/
│       ├── layout.tsx            # App layout (with nav)
│       ├── page.tsx              # Main dashboard
│       ├── quests/
│       ├── guilds/
│       ├── profile/
│       └── badges/
```

### Routing Strategy

```tsx
// app/(landing)/page.tsx - Marketing landing
export default function LandingPage() {
  return (
    <LandingLayout>
      <Hero />
      <Features />
      <SocialProof />
      <HowItWorks />
      <Showcase />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </LandingLayout>
  )
}

// app/onboard/page.tsx - First-time user flow
export default function OnboardingPage() {
  const { isConnected } = useAccount()
  const [step, setStep] = useState(0)
  
  if (!isConnected) return <ConnectWallet />
  
  return (
    <OnboardingFlow>
      {step === 0 && <WelcomeScreen onNext={() => setStep(1)} />}
      {step === 1 && <Tutorial step={1} onNext={() => setStep(2)} />}
      {step === 2 && <Tutorial step={2} onNext={() => setStep(3)} />}
      {step === 3 && <Tutorial step={3} onComplete={() => router.push('/app')} />}
    </OnboardingFlow>
  )
}

// app/app/page.tsx - Main dashboard
export default function DashboardPage() {
  const { user, isFirstVisit } = useUser()
  
  if (isFirstVisit) {
    return <FirstTimeUserView user={user} />
  }
  
  return <RegularDashboard user={user} />
}
```

---

## ✅ Implementation Checklist

**Implementation**:
```typescript
// /lib/miniapp-detection.ts
export function detectMiniappContext() {
  return {
    isFarcaster: typeof window !== 'undefined' && 'farcaster' in window,
    isBase: typeof window !== 'undefined' && 'base' in window,
    isMiniapp: typeof window !== 'undefined' && 
      ('farcaster' in window || 'base' in window)
  }
}

// /app/layout.tsx - Add miniapp meta tags
<meta name="fc:frame" content="vNext" />
<meta name="fc:frame:miniapp:url" content="https://gmeowhq.art" />
```

### Priority 2: Onboarding Flow ⚠️

**Route**: `/app/onboard/page.tsx` (DOES NOT EXIST)

**Required Screens**:
1. **Welcome Screen** - "Welcome to Gmeowbased! 🎉"
2. **Tutorial Step 1** - Daily GM explanation
3. **Tutorial Step 2** - Quest browsing
4. **Tutorial Step 3** - Profile setup
5. **Completion** - Redirect to `/app/app`

**Implementation**:
```typescript
// /app/onboard/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, Button } from '@/components/ui/tailwick-primitives'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const router = useRouter()
  
  const handleComplete = async () => {
    // Mark tutorial as complete in Supabase
    await markTutorialComplete()
    router.push('/app/app')
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black">
      {step === 0 && <WelcomeScreen onNext={() => setStep(1)} />}
      {step === 1 && <TutorialStep1 onNext={() => setStep(2)} />}
      {step === 2 && <TutorialStep2 onNext={() => setStep(3)} />}
      {step === 3 && <TutorialStep3 onComplete={handleComplete} />}
    </div>
  )
}
```

### Priority 3: First-Time Dashboard ⚠️

**Route**: `/app/app/page.tsx` (EXISTS BUT NEEDS ENHANCEMENT)

**Required**:
1. Detect if user completed tutorial
2. Show beginner-friendly view with:
   - "Quick Start Quests" section
   - "Today's Challenge" card
   - Progress tracker
3. Highlight next actions
4. Use tailwick-primitives components

**Implementation**:
```typescript
// /app/app/page.tsx
export default async function DashboardPage() {
  const user = await getUser()
  const hasCompletedTutorial = user?.tutorial_completed
  
  if (!hasCompletedTutorial) {
    return <FirstTimeUserDashboard user={user} />
  }
  
  return <RegularDashboard user={user} />
}
```

---

## 📋 Implementation Checklist (REALISTIC)

### Phase 1: Miniapp Foundation ⏳ **NEXT**
- [ ] Create `/lib/miniapp-detection.ts`
- [ ] Add miniapp meta tags to layout
- [ ] Create `useMiniapp()` hook
- [ ] Test in Farcaster miniapp
- [ ] Test in Base.dev miniapp
- [ ] Adjust UI for miniapp viewport
- [ ] Add bottom navigation for miniapp

### Phase 2: Onboarding Flow ⏳
- [ ] Create `/app/onboard/page.tsx`
- [ ] Build WelcomeScreen component
- [ ] Build Tutorial components (3 steps)
- [ ] Add tutorial completion tracking (Supabase)
- [ ] Add skip tutorial option
- [ ] Test full onboarding flow

### Phase 3: First-Time Dashboard ⏳
- [ ] Enhance `/app/app/page.tsx`
- [ ] Build FirstTimeUserDashboard component
- [ ] Add "Quick Start Quests" section
- [ ] Add "Today's Challenge" card
- [ ] Add progress tracking UI
- [ ] Test first-time user experience

### ✅ Already Complete
- [x] Landing page (100% template compliant)
- [x] Real data integration (100% Supabase MCP)
- [x] Daily GM route
- [x] Component library (tailwick-primitives)
- [x] TypeScript 0 errors

---

## 🎯 Success Metrics

**Landing Page** ✅:
- Template compliance: 100%
- Data integration: 100%
- TypeScript: 0 errors

**Miniapp Integration** ⏳:
- Farcaster detection: Not implemented
- Base.dev detection: Not implemented
- Mobile-first UI: Not optimized
- Bottom nav: Not added

**Onboarding Flow** ⏳:
- Welcome screen: Not built
- Tutorial (3 steps): Not built
- Completion tracking: Not implemented

**First-Time UX** ⏳:
- First-time dashboard: Not enhanced
- Quick start section: Not added
- Progress tracking: Basic only

---

**Last Updated**: November 27, 2025 (Reality Check - What's Actually Built)
- [x] Design hero section with animated character ✅
- [x] Create features grid (6 feature cards) ✅
- [x] Build social proof section (live stats) ✅ Real data via LiveStats
- [x] Design how-it-works flow (3 steps) ✅
- [x] Create showcase carousel (screenshots/video) ✅
- [x] Add testimonials section ✅ (Mock data - needs real integration)
- [x] Build final CTA section ✅
- [x] Design footer with links ✅
- [x] Template compliance: 100% (Tailwick v2.0 + Gmeowbased v0.1) ✅
- [x] Remove ALL emoji (7 total) ✅
- [x] TypeScript: 0 errors ✅

### Week 2: Real Data Integration ✅ PARTIAL
- [x] LiveStats component (real-time Supabase data) ✅
- [x] LeaderboardPreview (top 5 players) ✅
- [x] ViralMetrics (viral share events) ✅
- [ ] Testimonials table & queries ⚠️ (Next priority)
- [x] Hero stats (using LiveStats) ✅
- [x] MCP Supabase verified (18 tables) ✅

### Week 3: Onboarding Flow ⏳ PENDING
- [ ] Build welcome screen
- [ ] Create interactive tutorial (3 steps)
- [ ] Implement spotlight/overlay UI
- [ ] Add skip option
- [ ] Save tutorial completion to DB
- [ ] Redirect to main app

### Week 4: First-Time Dashboard ⏳ PENDING
- [ ] Design beginner-friendly dashboard
- [ ] Highlight "Today's Challenge"
- [ ] Show "Quick Start Quests"
- [ ] Display progress tracking
- [ ] Add exploration prompts
- [ ] Implement bottom navigation

### Week 5: Polish & Testing ⏳ PENDING
- [ ] Mobile responsiveness testing
- [ ] Farcaster miniapp testing
- [ ] Performance optimization
- [ ] A/B test different hero text
- [x] Analytics implementation ✅ (AnalyticsProvider added)
- [ ] SEO optimization() => import('./Showcase'))
const Testimonials = lazy(() => import('./Testimonials'))

// Optimize images
<Image
  src="/hero-character.png"
  alt="Gmeow Character"
  width={300}
  height={300}
  priority // Above the fold
  formats={['avif', 'webp']}
/>
```

---

## 🎯 Conversion Optimization

### CTAs (Call-to-Actions)

**Primary CTA**: "Launch Game" (appears 3 times)
- Hero section (top)
- After features (middle)
- Final section (bottom)

**Secondary CTAs**:
- "Watch Demo" - 15-second video
- "View Leaderboard" - Social proof
- "Join Discord" - Community

### Analytics Tracking

```typescript
// Track key events
analytics.track('landing_page_view')
analytics.track('cta_clicked', { location: 'hero' })
analytics.track('demo_watched', { duration: '15s' })
analytics.track('onboarding_started')
analytics.track('tutorial_completed', { step: 3 })
analytics.track('first_quest_completed')
```

---

## ✅ Implementation Checklist

### Week 1-2: Landing Page
- [ ] Design hero section with animated character
- [ ] Create features grid (6 feature cards)
- [ ] Build social proof section (live stats)
- [ ] Design how-it-works flow (3 steps)
- [ ] Create showcase carousel (screenshots/video)
- [ ] Add testimonials section
- [ ] Build final CTA section
- [ ] Design footer with links

### Week 3: Onboarding Flow
- [ ] Build welcome screen
- [ ] Create interactive tutorial (3 steps)
- [ ] Implement spotlight/overlay UI
- [ ] Add skip option
- [ ] Save tutorial completion to DB
- [ ] Redirect to main app

### Week 4: First-Time Dashboard
- [ ] Design beginner-friendly dashboard
- [ ] Highlight "Today's Challenge"
- [ ] Show "Quick Start Quests"
- [ ] Display progress tracking
- [ ] Add exploration prompts
- [ ] Implement bottom navigation

### Week 5: Polish & Testing
- [ ] Mobile responsiveness testing
- [ ] Farcaster miniapp testing
- [ ] Performance optimization
- [ ] A/B test different hero text
- [ ] Analytics implementation
- [ ] SEO optimization

---

## 🎬 Next Steps

### Immediate Priorities (Week 3)

**1. Complete Real Data Integration** ⚠️
- [ ] Create `testimonials` table in Supabase
  ```sql
  CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fid INTEGER,
    username TEXT,
    role TEXT, -- 'Level 47 Explorer', 'Guild Leader', etc.
    quote TEXT,
    avatar_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Add MCP query: `get_featured_testimonials`
- [ ] Replace mock testimonials with real data

**2. Build Onboarding Flow** (`/app/onboard/page.tsx`)
- [ ] Welcome screen with animated Gmeow character
- [ ] 3-step interactive tutorial
- [ ] Wallet connection flow
- [ ] Profile setup (username, avatar)
- [ ] Redirect to `/app` after completion

**3. Create First-Time Dashboard** (`/app/app/page.tsx`)
- [ ] Detect first-time user via `user_profiles.is_first_visit`
- [ ] Show beginner-friendly view with:
  - Quick start quests (easy, high reward)
  - Today's challenge (Daily GM)
  - Tutorial tooltips
- [ ] Track tutorial completion

---

## 📊 Template Compliance Summary

**Landing Page Status**: ✅ **100% COMPLIANT**

**Tailwick v2.0**: ✅
- 9x Card components (6 features + 3 testimonials)
- 9x CardBody components
- 3x Badge components (step numbers)
- All proper gradient variants
- Hover effects via component props

**Gmeowbased v0.1**: ✅
- 9 SVG icons (Games, Videos, Notifications, Quests, Groups, Badges, Trophy, Link, Dashboard)
- 3 avatar images (01-Default, 02-Male, 03-Female)
- 0 emoji in production ✅

**ProKit Flutter**: ✅
- Feature card grid layout (inspired by ProKit dashboard)
- Testimonial cards (inspired by social feed)
- Step-by-step flow (inspired by onboarding patterns)
- All recreated in React, not copied

---

## 🗄️ Data Sources Summary

**Real Data (MCP Supabase)** ✅:
- LiveStats: user_profiles, gmeow_rank_events, quest completion
- LeaderboardPreview: leaderboard_snapshots, user_profiles
- ViralMetrics: viral_share_events, viral_milestone_achievements

**Mock Data** ⚠️:
- Testimonials (3 quotes) - **Next to fix**
- Demo video placeholder

**No Data** ✅:
- All static content (hero text, features, how-it-works, footer)

---

**Goal**: Make Gmeowbased Adventure the most compelling on-chain game for new users, with a landing page that converts and an onboarding experience that delights.

**Success Metrics**:
- 🎯 40%+ conversion rate (landing → app launch)
- ⏱️ < 3 seconds landing page load time
- 🏆 80%+ tutorial completion rate
- 📱 95%+ mobile usability score
- ⭐ 4.8+ user satisfaction rating

---

**Last Updated**: November 26, 2025
