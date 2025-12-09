# Homepage Audit & Rebuild Plan

**Date**: December 8, 2025  
**Scope**: Complete homepage rebuild with Base/Farcaster patterns + hybrid templates  
**Goal**: 100/100 homepage quality with wallet-first onboarding, live data, professional UI  
**Sources**: Current homepage audit + TEMPLATE-SELECTION.md + farcaster.instructions.md

---

## 🎯 Current Homepage Audit (app/page.tsx)

### What Exists Now

**File Structure**:
```
app/page.tsx (136 lines)
├── OnchainHub (dynamic import)
├── HowItWorks
├── LiveQuests (hardcoded QUEST_PREVIEWS)
├── GuildsShowcase (hardcoded GUILD_PREVIEWS)
├── LeaderboardSection (hardcoded LEADERBOARD_PREVIEW)
├── FAQSection
└── ConnectWalletSection (bottom, hydration-gated)
```

**Component Analysis**:

#### 1. OnchainHub (components/home/OnchainHub.tsx)
- **Purpose**: "Command your multichain dossier" - OnchainStats widget
- **Current**: Lazy-loaded OnchainStatsV2 component
- **Problem**: No hero CTA, wallet connection buried below fold
- **Status**: Keep but move to sub-section

#### 2. HowItWorks (components/home/HowItWorks.tsx)
- **Purpose**: 3-step explainer (GM Daily → Complete Quests → Unlock Badges)
- **Current**: Static steps with emoji titles
- **Problem**: Uses emojis (violates farcaster.instructions.md - must use 93 SVG icons)
- **Status**: ❌ REPLACE with IconStep pattern from templates

#### 3. LiveQuests (components/home/LiveQuests.tsx)
- **Purpose**: Quest preview grid with filters
- **Current**: Receives hardcoded `QUEST_PREVIEWS` array (3 quests)
- **Problem**: No live data, uses placeholder QuestCard
- **Status**: ⚠️ UPDATE to fetch from `/api/quests?featured=true&limit=6`

#### 4. GuildsShowcase (components/home/GuildsShowcase.tsx)
- **Purpose**: Top 3 guilds by points
- **Current**: Receives hardcoded `GUILD_PREVIEWS` array
- **Problem**: No live data, emoji icons (🛡️)
- **Status**: ⚠️ UPDATE to fetch from `/api/guilds?sort=points&limit=3`

#### 5. LeaderboardSection (components/home/LeaderboardSection.tsx)
- **Purpose**: Top 5 users preview
- **Current**: Receives hardcoded `LEADERBOARD_PREVIEW` array
- **Problem**: No live data, simple table
- **Status**: ⚠️ UPDATE to fetch from `/api/leaderboard?limit=5`

#### 6. FAQSection (components/home/FAQSection.tsx)
- **Purpose**: Collapsible FAQ (5 questions)
- **Current**: Accordion with +/− icons
- **Problem**: None - functional and simple
- **Status**: ✅ KEEP (maybe minor styling updates)

#### 7. ConnectWalletSection (components/home/ConnectWalletSection.tsx)
- **Purpose**: Wallet connection CTA
- **Current**: Bottom of page, hydration-gated
- **Problem**: Should be in hero (primary action)
- **Status**: ❌ DELETE, move to hero

### Critical Gaps

1. **No Hero Section** - Missing wallet-first hero with primary CTA
2. **Static Data** - All previews use hardcoded arrays (no live fetching)
3. **Emoji Usage** - Violates farcaster.instructions.md (must use 93 SVG icons from components/icons/)
4. **No Live Activity** - No real-time feeds or social proof
5. **Wallet CTA Buried** - Connect wallet at bottom, should be hero
6. **No Template Patterns** - Custom components, not using hybrid templates
7. **No Performance Optimization** - No lazy loading, caching, or skeleton states

---

## 🏗️ Hybrid Template Strategy (TEMPLATE-SELECTION.md)

### Available Templates (Priority Order)

**Tier 1 - Primary**:
- **gmeowbased0.6** (476 files) - Crypto/gaming UI, 0-10% adaptation
  - NFT cards, collection grids, progress bars
  - Framer Motion animations, gradient overlays
  - Best for: Badge showcase, quest cards, profile stats
  
- **trezoadmin-41** (10,056 files) - Professional admin UI, 30-50% adaptation
  - Dashboard layouts, stat cards, analytics
  - Material Design, responsive grids
  - Best for: Platform stats, leaderboard, hero sections

- **music** (3,130 files) - DataTables/charts/forms, 30-40% adaptation
  - Professional tables, pagination, filters
  - Form validation, charts
  - Best for: Quest tables, leaderboard with filters

**Component Mapping**:
| Homepage Section | Best Template | Files | Adaptation % |
|------------------|---------------|-------|--------------|
| Hero Section | trezoadmin-41/Dashboard/Hero | 2-3 | 35% |
| Platform Stats | trezoadmin-41/Dashboard/Finance/Cards | 1 | 30% |
| Badge Showcase | gmeowbased0.6/nft-card.tsx | 1 | 5% |
| Quest Grid | gmeowbased0.6/collection-card.tsx | 1 | 10% |
| Guild Cards | trezoadmin-41/Crypto/CryptocurrencyWatchlist | 1 | 40% |
| Leaderboard | music/datatable/ + trezoadmin-41 | 3 | 40% |
| How It Works | trezoadmin-41/Timeline or custom | 1 | 50% |
| FAQ Accordion | Keep existing (good enough) | 0 | 0% |

---

## 📋 Core Features Inventory (What We Built)

### 1. Quests System (95/100 ✅)
- **APIs**: `/api/quests`, `/api/quests/[slug]`, `/api/quests/claim`
- **Components**: QuestCard, QuestVerification, QuestWizard (5 steps)
- **Features**: Daily quests, streak tracking, XP rewards, 3 quest types
- **Homepage Need**: Live quest preview (6 featured quests)

### 2. Badges & NFTs
- **APIs**: `/api/badges/list`, `/api/badges/recent`, `/api/badges/mint`
- **Components**: BadgeCard, BadgeCollection, BadgeHoverCard
- **Features**: Soulbound NFTs, tiers, collection showcase
- **Homepage Need**: Recent badges gallery (12 latest mints)

### 3. Guilds (95/100 ✅)
- **APIs**: `/api/guild/list`, `/api/guild/[slug]`, `/api/guild/leaderboard`
- **Components**: GuildCard, GuildLeaderboard, GuildAnalytics
- **Features**: Team pooling, treasury, member management (Base-only)
- **Homepage Need**: Top 3 guilds by points

### 4. Referral System (95/100 ✅)
- **APIs**: `/api/referral/[code]`, `/api/referral/track`, `/api/referral/leaderboard`
- **Components**: ReferralDashboard, ReferralLinkGenerator, ReferralLeaderboard
- **Features**: Invite tracking, bonus rewards, tiered rewards
- **Homepage Need**: Maybe a "Refer & Earn" CTA card

### 5. Leaderboard (95/100 ✅)
- **APIs**: `/api/leaderboard`, `/api/leaderboard/sync`
- **Components**: LeaderboardTable (music DataTable pattern)
- **Features**: Real-time rankings, filters, pagination
- **Homepage Need**: Top 5 users preview

### 6. OnchainStats (90/100)
- **APIs**: `/api/onchain-stats/[chain]` (13 chains, Blockscout-only)
- **Components**: OnchainStatsV2, StatsCards, ChainSwitcher
- **Features**: Multi-chain wallet analytics, gas prices, token holdings
- **Homepage Need**: Include in hero or separate section

### 7. Profile System (95/100 ✅)
- **APIs**: `/api/user/profile/[fid]`, `/api/user/activity/[fid]`
- **Components**: ProfileHeader, ProfileStats, ProfileTabs, SocialLinks
- **Features**: Edit profile, social links, activity feed, badge collection
- **Homepage Need**: Not needed (profile page)

### 8. Tip System
- **APIs**: `/api/tips/ingest`, `/api/tips/stream`, `/api/tips/summary`
- **Components**: TipIngestion, TipSummary, TipScoring
- **Features**: Farcaster tip tracking, SSE streaming, scoring
- **Homepage Need**: Maybe live tip feed (optional)

---

## 🎨 Professional Patterns Research

### A. Base Ecosystem Patterns

**Base.org Homepage Pattern**:
```
[Real-time activity ticker]
"Bring the world onchain"
24.2M transactions • $1.2B TVL • 50K+ developers
[Start Building] [Deploy Contract]
```

**Key Takeaways**:
- Live data immediately visible (not promises)
- Big numbers for social proof
- Action-oriented CTAs ("Build", "Deploy" not "Learn More")
- Developer-first but accessible

**Applied to Gmeowbased**:
- Live activity feed: Quest completions, badge mints, guild joins
- Platform stats: Active cats, points earned, guilds competing
- Primary CTA: "Connect Wallet to Start" (not "Sign Up")

### B. Coinbase Wallet Pattern

**Coinbase Wallet Homepage**:
```
[Shield + Wallet Icon]
"The safest way to explore web3"
✓ Self-custody ✓ 130M+ users ✓ 1000s of dapps
[Download Wallet] [Explore Apps]
[Trust badges: SOC 2, Licensed, Insured]
```

**Key Takeaways**:
- Security-first messaging
- Clear benefits (3 bullets, no fluff)
- Trust signals above fold
- Dual CTAs (primary + secondary)

**Applied to Gmeowbased**:
- Security: "Built on Base L2" + "Soulbound NFT Badges"
- Benefits: "No gas fees" + "Earn daily" + "Guild competition"
- Trust: "2,840 active cats" + "18,200 badges earned"
- Dual CTA: "Connect Wallet" + "Try Frame in Warpcast"

### C. Zora Pattern

**Zora Homepage**:
```
[NFT art showcase]
"Create and collect NFTs"
[Live gallery: 6 newest NFTs]
[Trending Creators]
[Mint Now (Free)] [Explore]
```

**Key Takeaways**:
- Visual-first (show product immediately)
- Live content (not static screenshots)
- Creator showcase (social proof)
- Low friction ("Free" minting)

**Applied to Gmeowbased**:
- Badge gallery: Last 12 badges minted (live)
- Quest showcase: 6 featured quests (live data)
- User avatars: Show recent active users
- CTA: "View All Badges" + "Browse Quests"

### D. Warpcast/Farcaster Pattern

**Warpcast Homepage**:
```
[Frame preview]
"The best way to use Farcaster"
[Sign in with Warpcast] [or create account]
[Frame Gallery: Daily games, Mint NFTs, Follow channels]
```

**Key Takeaways**:
- Social-first onboarding (no wallet required initially)
- Frame preview (instant engagement)
- Dual path: Warpcast OR wallet
- Content-first discovery

**Applied to Gmeowbased**:
- Frame preview: Show "Daily GM" frame
- Dual onboarding: "Start from Warpcast" OR "Connect Wallet"
- Let users choose their path (frame = low friction, web = full features)

---

## 🎯 New Homepage Architecture

### Layout Structure (Top to Bottom)

```
1. Hero Section (New - Wallet-First)
   ├── Value proposition headline
   ├── Subheadline (benefits)
   ├── Primary CTA: Connect Wallet button
   ├── Secondary CTA: Try Frame in Warpcast
   ├── Trust signals (active users, badges earned)
   └── Template: trezoadmin-41/Dashboard/Hero (35% adaptation)

2. Platform Stats (New - Live Data)
   ├── 3 stat cards: Active Cats, Points Earned, Guilds Competing
   ├── Animated counters (useAnimatedCount hook)
   ├── Updates from /api/analytics/summary (5min cache)
   └── Template: trezoadmin-41/Dashboard/Finance/Cards (30% adaptation)

3. OnchainHub (Keep - Move Below Hero)
   ├── "Command your multichain dossier" section
   ├── OnchainStatsV2 component (13 chains)
   ├── Chain switcher, stats cards
   └── Template: Existing (OnchainStatsV2.tsx)

4. Recent Badges Gallery (New - Live Data)
   ├── "Recently Earned Badges" heading
   ├── 12 badge cards (4 cols desktop, 2 tablet, 1 mobile)
   ├── User avatar, badge name, "earned X ago"
   ├── Fetch from /api/badges/recent?limit=12 (60s cache)
   └── Template: gmeowbased0.6/nft-card.tsx (5% adaptation)

5. Live Quests (Update - Live Data)
   ├── Keep filter tabs (ALL, CAST, FRAME, UTILITY)
   ├── Replace hardcoded array with API fetch
   ├── Show 6 featured quests
   ├── Fetch from /api/quests?featured=true&limit=6
   └── Template: gmeowbased0.6/collection-card.tsx (10% adaptation)

6. Top Guilds (Update - Live Data)
   ├── Top 3 guilds by points
   ├── Replace hardcoded array with API fetch
   ├── Show guild icon (SVG not emoji), members, points
   ├── Fetch from /api/guilds?sort=points&limit=3
   └── Template: trezoadmin-41/Crypto cards (40% adaptation)

7. Leaderboard Preview (Update - Better Table)
   ├── Top 5 users
   ├── Replace hardcoded array with API fetch
   ├── Professional table (not simple divs)
   ├── Fetch from /api/leaderboard?limit=5
   └── Template: music/datatable patterns (40% adaptation)

8. How It Works (Replace - No Emojis)
   ├── 3 steps with SVG icons (not emojis)
   ├── GM Daily → Complete Quests → Unlock Badges
   ├── Use components/icons/ (93 SVG icons available)
   └── Template: trezoadmin-41/Timeline or custom (50% adaptation)

9. FAQ Section (Keep - Minor Updates)
   ├── Keep accordion functionality
   ├── Maybe update styling to match new theme
   └── Template: Existing FAQSection.tsx (0% adaptation)

10. Footer (Optional - If Needed)
    └── Template: trezoadmin-41/Footer or existing FooterSection.tsx
```

### Delete These:
- ❌ ConnectWalletSection.tsx (move to hero)
- ❌ Hardcoded arrays (QUEST_PREVIEWS, GUILD_PREVIEWS, LEADERBOARD_PREVIEW)

---

## 🔧 Technical Implementation Plan

### Phase 1: Hero Section (3-4h)

**Create**: `components/home/HeroWalletFirst.tsx`

**Template**: trezoadmin-41/Dashboard/Hero (35% adaptation)

**Features**:
- Gradient background (Base brand colors)
- Large headline: "Earn rewards for being onchain"
- Subheadline: "Connect wallet, complete quests, earn soulbound badges"
- Primary CTA: `<ConnectWallet size="xl" />` component
- Secondary CTA: Link to `/frame` (Try Warpcast Frame)
- Trust metrics: "2,840 active cats • 18,200 badges earned • Built on Base"

**API**: None (static content + ConnectWallet component)

**CSS**: Use Tailwind + existing globals.css patterns

**Acceptance Criteria**:
- [ ] Wallet button prominent (56px+ height)
- [ ] Dual path clear (Wallet vs Frame)
- [ ] Trust signals above fold
- [ ] Mobile-first (375px optimized)
- [ ] <1.5s LCP

---

### Phase 2: Platform Stats (2h)

**Create**: `components/home/PlatformStats.tsx`

**Template**: trezoadmin-41/Dashboard/Finance/Cards (30% adaptation)

**Features**:
- 3 stat cards: Active Cats, Points Earned, Guilds Competing
- Animated counters using `useAnimatedCount` hook (already exists)
- "Updated X ago" timestamp
- Refresh button (manual reload)

**API**: `/api/analytics/summary` (5min cache)

**Response Shape**:
```typescript
{
  activeUsers: number
  pointsEarnedWeek: number
  activeGuilds: number
  lastUpdated: string
}
```

**Acceptance Criteria**:
- [ ] Numbers count up on load (animation)
- [ ] 5min cache (s-maxage=300)
- [ ] Loading skeleton while fetching
- [ ] Error state if API fails
- [ ] 3 cols desktop, 1 col mobile

---

### Phase 3: Recent Badges Gallery (2-3h)

**Create**: `components/home/RecentBadgesGallery.tsx`

**Template**: gmeowbased0.6/nft-card.tsx (5% adaptation)

**Features**:
- 12 badge cards in responsive grid
- Badge image, name, user avatar, "earned X ago"
- Hover effects (card lift, shadow)
- Link to `/badges` for full collection

**API**: `/api/badges/recent?limit=12` (60s cache)

**Response Shape**:
```typescript
{
  badges: Array<{
    id: string
    name: string
    imageUrl: string
    ownerFid: number
    ownerUsername: string
    ownerAvatar: string
    mintedAt: string
  }>
}
```

**Acceptance Criteria**:
- [ ] 4 cols desktop, 2 tablet, 1 mobile
- [ ] Lazy load images (Next.js Image)
- [ ] 60s cache (frequent updates)
- [ ] Empty state if no badges
- [ ] Link to full badge collection

---

### Phase 4: Update LiveQuests (1-2h)

**Update**: `components/home/LiveQuests.tsx`

**Changes**:
- Replace hardcoded `QUEST_PREVIEWS` with API fetch
- Use `gmeowbased0.6/collection-card.tsx` pattern (10% adaptation)
- Add loading skeleton while fetching
- Add error state

**API**: `/api/quests?featured=true&limit=6` (5min cache)

**Acceptance Criteria**:
- [ ] Fetches live data (no hardcoded array)
- [ ] Shows 6 featured quests
- [ ] Filter tabs still work
- [ ] Loading skeleton matches layout
- [ ] Error boundary catches failures

---

### Phase 5: Update GuildsShowcase (1-2h)

**Update**: `components/home/GuildsShowcase.tsx`

**Changes**:
- Replace hardcoded `GUILD_PREVIEWS` with API fetch
- Use SVG icons (not emoji 🛡️) from `components/icons/`
- Use `trezoadmin-41/Crypto` card pattern (40% adaptation)
- Add loading skeleton

**API**: `/api/guilds?sort=points&limit=3` (5min cache)

**Acceptance Criteria**:
- [ ] Fetches live data
- [ ] Uses SVG icons (no emojis)
- [ ] Shows top 3 guilds by points
- [ ] Loading skeleton matches layout
- [ ] Error boundary

---

### Phase 6: Update LeaderboardSection (1-2h)

**Update**: `components/home/LeaderboardSection.tsx`

**Changes**:
- Replace hardcoded `LEADERBOARD_PREVIEW` with API fetch
- Use `music/datatable` pattern for professional table (40% adaptation)
- Add loading skeleton
- Keep medal icons for top 3

**API**: `/api/leaderboard?limit=5` (5min cache)

**Acceptance Criteria**:
- [ ] Fetches live data
- [ ] Professional table styling
- [ ] Medal icons for top 3 (🥇🥈🥉 or SVG)
- [ ] Loading skeleton
- [ ] Link to full leaderboard

---

### Phase 7: Replace HowItWorks (1-2h)

**Replace**: `components/home/HowItWorks.tsx`

**Changes**:
- Remove emoji titles (🐱 🎯 🏆)
- Use SVG icons from `components/icons/` (93 available)
- Keep 3 steps: GM Daily → Complete Quests → Unlock Badges
- Use `trezoadmin-41/Timeline` or custom step pattern

**Icons Needed**:
- Step 1: Calendar or Clock icon (GM Daily)
- Step 2: Target or Quest icon (Complete Quests)
- Step 3: Trophy or Badge icon (Unlock Badges)

**Acceptance Criteria**:
- [ ] No emojis (uses SVG icons)
- [ ] 3 steps clearly visible
- [ ] Step numbers (01, 02, 03)
- [ ] Responsive (vertical stack on mobile)

---

### Phase 8: Performance Optimization (2h)

**Tasks**:
- [ ] Lazy load below-fold sections (use `dynamic()`)
- [ ] Add skeleton loaders for all async data
- [ ] Implement caching strategy (5min for most, 60s for badges)
- [ ] Prefetch `/dashboard` on hero CTA hover
- [ ] Optimize images (WebP, Next.js Image)
- [ ] Verify Core Web Vitals (LCP <2.5s)

**Lazy Load Order**:
1. Hero + Platform Stats: Load immediately (above fold)
2. OnchainHub: Dynamic import (below fold)
3. Recent Badges: Dynamic import
4. LiveQuests: Dynamic import
5. GuildsShowcase: Dynamic import
6. LeaderboardSection: Dynamic import
7. HowItWorks: Dynamic import
8. FAQSection: Dynamic import

---

### Phase 9: Testing & Polish (2h)

**Tests**:
- [ ] All APIs return data correctly
- [ ] Loading states work for each section
- [ ] Error boundaries catch failures
- [ ] Wallet connection flow works
- [ ] Frame link works (redirects to /frame)
- [ ] Mobile 375px layout correct
- [ ] Desktop 1920px layout correct
- [ ] All CTAs clickable (56px+ height)
- [ ] No emojis in UI (only SVG icons)
- [ ] TypeScript compiles (0 errors)

---

## 📊 Success Metrics

### Performance Targets
- **LCP**: <2.5s (hero visible)
- **FID**: <100ms (CTA clickable)
- **CLS**: <0.1 (no layout shifts)
- **Bundle Size**: <200KB (homepage JS)

### Quality Targets
- **Lighthouse Score**: 95+ (all categories)
- **WCAG Compliance**: AAA (already achieved)
- **Mobile Usability**: 100% (no errors)
- **Real Data**: 100% (no hardcoded previews)

### Conversion Targets
- **Wallet Connection Rate**: >20% (visitors → connected)
- **Frame Click Rate**: >10% (visitors → try frame)
- **Scroll Depth**: >60% (see all sections)
- **Bounce Rate**: <50%

---

## 🎯 Template Adaptation Estimates

| Component | Template | Files Needed | Adaptation % | Time Estimate |
|-----------|----------|--------------|--------------|---------------|
| HeroWalletFirst | trezoadmin-41/Dashboard/Hero | 1 | 35% | 3-4h |
| PlatformStats | trezoadmin-41/Finance/Cards | 1 | 30% | 2h |
| RecentBadgesGallery | gmeowbased0.6/nft-card.tsx | 1 | 5% | 2-3h |
| LiveQuests | gmeowbased0.6/collection-card.tsx | 1 | 10% | 1-2h |
| GuildsShowcase | trezoadmin-41/Crypto cards | 1 | 40% | 1-2h |
| LeaderboardSection | music/datatable | 3 | 40% | 1-2h |
| HowItWorks | trezoadmin-41/Timeline | 1 | 50% | 1-2h |
| **TOTAL** | | **9 files** | **29% avg** | **12-17h** |

---

## 🚀 Implementation Order

### Week 1 (8-10h)
1. **Hero Section** (3-4h) - Primary CTA, wallet-first
2. **Platform Stats** (2h) - Live numbers, social proof
3. **Update LiveQuests** (1-2h) - Replace hardcoded data
4. **Update GuildsShowcase** (1-2h) - Replace hardcoded data

### Week 2 (4-7h)
5. **Recent Badges Gallery** (2-3h) - Showcase achievements
6. **Update LeaderboardSection** (1-2h) - Professional table
7. **Replace HowItWorks** (1-2h) - No emojis, use SVG icons

### Week 3 (2-4h)
8. **Performance Optimization** (2h) - Lazy load, caching
9. **Testing & Polish** (2h) - QA, fix bugs, verify metrics

**Total Timeline**: 14-21 hours (2-3 weeks part-time)

---

## 📝 Next Steps

1. ✅ **Review this plan** with team
2. **Create HeroWalletFirst** component (start with trezoadmin-41 template)
3. **Create PlatformStats** API endpoint (`/api/analytics/summary`)
4. **Update LiveQuests** to fetch live data
5. **Continue with remaining phases**

**Status**: Ready for implementation  
**Next**: Start Phase 1 (Hero Section)
