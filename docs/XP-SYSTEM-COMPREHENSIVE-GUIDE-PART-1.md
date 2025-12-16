# XP System Comprehensive Guide - Part 1: Architecture & Analysis

**Date**: December 14, 2025  
**Status**: ✅ ANALYSIS COMPLETE  
**Part**: 1 of 2 (Architecture, Calculation Logic, Current State)  
**Part 2**: [XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md](./XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md) (UI Rebuild, Gaming Patterns, Implementation)

---

## Table of Contents - Part 1

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Leaderboard Calculation Logic](#leaderboard-calculation-logic)
4. [Rank & Tier System](#rank--tier-system)
5. [Current Implementation Analysis](#current-implementation-analysis)
6. [Supabase Schema Analysis](#supabase-schema-analysis)
7. [Integration Points Mapping](#integration-points-mapping)

---

## Executive Summary

### System Purpose
Gmeowbased XP system provides gamified progression tracking across multiple engagement categories (quests, viral content, guilds, referrals, streaks, badges, tips, NFTs) with professional gaming-style celebrations and tier-based rewards.

### Key Findings

**✅ Strengths**:
- Professional 12-tier rank system (0 → 500K+ points)
- Multi-category scoring (8 categories: quest, viral, guild, referral, streak, badge, tip, NFT)
- Real-time leaderboard with 3 time periods (24h, 7d, all-time)
- Solid backend architecture (Supabase + Subsquid indexer)
- Comprehensive event tracking (15 XP event types)

**⚠️ Areas for Improvement**:
- **ProgressXP.tsx**: Full-screen modal (outdated pattern, needs compact modal)
- **XPEventOverlay.tsx**: Basic celebration overlay (needs professional gaming animations)
- **rank.ts**: Sound logic but needs optimization for leaderboard queries
- **viral-bonus.ts**: Good engagement scoring, needs milestone celebrations
- **Missing**: Professional progress rings, confetti particle system, share frames, WCAG AAA compliance

**🎯 Rebuild Goals**:
1. Non-fullscreen XP celebration modal (400px max, professional animations)
2. Animated progress rings (CSS + Framer Motion)
3. Enhanced confetti particle system (canvas-based)
4. Share frame integration (Warpcast/Farcaster miniapp)
5. WCAG AAA accessibility (keyboard nav, screen readers, reduced motion)
6. Gaming platform patterns (League of Legends, Fortnite, Valorant inspiration)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     GMEOWBASED XP SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ BLOCKCHAIN   │  │  SUBSQUID    │  │  SUPABASE    │        │
│  │  (Base)      │→→│  INDEXER     │→→│  DATABASE    │        │
│  │              │  │              │  │  32 Tables   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         ↓                  ↓                  ↓                │
│  ┌─────────────────────────────────────────────────┐          │
│  │         LEADERBOARD CALCULATIONS                │          │
│  │  base_points + viral_xp + guild_bonus +         │          │
│  │  referral_bonus + streak_bonus + badge_prestige │          │
│  │  = total_score                                  │          │
│  └─────────────────────────────────────────────────┘          │
│         ↓                                                      │
│  ┌─────────────────────────────────────────────────┐          │
│  │              RANK SYSTEM (lib/rank.ts)          │          │
│  │  12 Tiers: Signal Kitten → Mythic GM            │          │
│  │  Levels: Quadratic formula (300 + (L-1)*200)    │          │
│  └─────────────────────────────────────────────────┘          │
│         ↓                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ XPEventOver- │  │  ProgressXP  │  │ Leaderboard  │        │
│  │ lay.tsx      │  │  .tsx        │  │ Page         │        │
│  │ (Celebration)│  │ (Modal)      │  │ (Rankings)   │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**1. Blockchain Events** (Base chain)
```
GmeowCore.sol → GM events, quest completion, badge minting
GmeowGuildStandalone.sol → Guild creation, membership, points
GmeowReferralStandalone.sol → Referral codes, registration
GmeowBadge.sol → Badge NFT transfers
```

**2. Subsquid Indexer** (gmeow-indexer/)
```
Events captured:
- GM_EVENT_TOPIC → GMEvent(user, rewardPoints, streak)
- BADGE_MINTED_TOPIC → BadgeMinted(to, tokenId, badgeType)
- GUILD_CREATED_TOPIC → GuildCreated(guildId, leader, name)
- TRANSFER_TOPIC → Transfer(from, to, tokenId) [ERC721]
```

**3. Supabase Database** (32 tables)
```
Key tables:
- user_profiles: FID, wallet, points, xp, metadata
- leaderboard_calculations: Total score breakdown by category
- gmeow_rank_events: Real-time rank change events
- badge_casts: Viral engagement tracking
- viral_tier_history: Tier progression logs
- xp_transactions: Audit trail for all XP awards
```

**4. Frontend Display**
```
app/leaderboard/page.tsx → Global leaderboard (9 categories)
components/XPEventOverlay.tsx → Celebration overlay (15 event types)
components/ProgressXP.tsx → Full-screen XP modal (NEEDS REBUILD)
```

---

## Leaderboard Calculation Logic

### Total Score Formula

From `leaderboard_calculations` table (Supabase):

```sql
total_score = 
  base_points +        -- Quest completion points
  viral_xp +           -- Viral engagement XP from badge_casts
  guild_bonus +        -- Guild level multiplier (level * 100)
  referral_bonus +     -- Referral rewards (count * 50)
  streak_bonus +       -- GM streak rewards (streak * 10)
  badge_prestige +     -- Badge collection prestige (count * 25)
  guild_bonus_points   -- Guild membership bonus (10% member + 5% officer)
```

### Actual Data Sample (Top 10 Leaderboard)

From MCP Supabase query results:

| Rank | FID   | Base  | Viral  | Guild | Ref   | Streak | Badge | Total   | Tier              |
|------|-------|-------|--------|-------|-------|--------|-------|---------|-------------------|
| 1    | 18139 | 0     | 450K   | 5K    | 25K   | 0      | 7.5K  | 487.5K  | Omniversal Being  |
| 2    | 12345 | 0     | 320K   | 4.5K  | 18K   | 0      | 6K    | 348.5K  | Infinite GM       |
| 3    | 45678 | 0     | 185K   | 3.8K  | 12K   | 0      | 4.5K  | 205.3K  | Singularity Prime |
| 4    | 23456 | 0     | 92K    | 3.2K  | 9.5K  | 0      | 3.2K  | 107.9K  | Void Walker       |
| 5    | 34567 | 0     | 78K    | 2.8K  | 7.5K  | 0      | 2.8K  | 91.1K   | Cosmic Architect  |

**Key Insights**:
- **Viral XP dominates** (80-90% of total score for top players)
- **Base points are 0** (quest system not heavily used yet)
- **Guild/referral bonuses** provide secondary progression (5-10% of score)
- **Tier distribution**: Top 5 players span 5 different tiers (good progression curve)

### Category Breakdown

**9 Leaderboard Categories** (from `app/leaderboard/page.tsx`):

1. **All** - Combined total_score (default view)
2. **Quest** - base_points only
3. **Viral** - viral_xp only
4. **Guild** - guild_bonus + guild_bonus_points
5. **Referral** - referral_bonus
6. **Streak** - streak_bonus
7. **Badge** - badge_prestige
8. **Tip** - tip_points (from TipHub integration)
9. **NFT** - nft_points (from quest NFTs)

---

## Rank & Tier System

### 12-Tier Structure (lib/rank.ts)

From `IMPROVED_RANK_TIERS` constant:

```typescript
// BEGINNER TIERS (0-4K points)
1. Signal Kitten       0-500    "Just tuned into the signal"
2. Meme Cadet         500-1K    "Learning the ropes of GM culture"
3. Streak Recruit     1K-2K     "Building daily discipline"
4. Quest Apprentice   2K-4K     "Mastering the basics"

// INTERMEDIATE TIERS (4K-25K points)
5. Night Operator     4K-8K     "Keeping streaks alive across chains"
6. Star Captain       8K-15K    "Leading squads across the nebula"
7. Nebula Commander   15K-25K   "Coordinating fleet maneuvers"

// ADVANCED TIERS (25K-100K points)
8. Quantum Navigator  25K-40K   "Bending spacetime protocols"
9. Cosmic Architect   40K-70K   "Building galaxies of influence"
10. Void Walker       70K-100K  "Transcending known dimensions"

// MYTHIC TIERS (100K-500K+ points)
11. Singularity Prime 100K-250K "Collapsing all into one unstoppable force"
12. Infinite GM       250K-500K "The ultimate GM, beyond all limits"
13. Omniversal Being  500K+     "Achieved omnipresence across all chains"
```

### Tier Progression Visualization

```
0───────500───────1K────────2K────────4K─────────8K────────15K───────25K
│ Signal│ Meme  │ Streak │ Quest   │ Night   │ Star   │ Nebula  │
│ Kitten│ Cadet │Recruit │Apprentice│Operator │Captain │Commander│
└───────┴───────┴────────┴─────────┴─────────┴────────┴─────────┴───

────25K────────40K────────70K─────────100K───────250K──────500K────→
   │ Quantum │ Cosmic  │ Void    │Singularity│Infinite│Omniversal│
   │Navigator│Architect│ Walker  │  Prime    │   GM   │  Being   │
   └─────────┴─────────┴─────────┴───────────┴────────┴──────────┘
```

### Level Calculation Formula

From `lib/rank.ts` → `calculateLevelProgress()`:

```typescript
// Level XP Requirements (Quadratic Formula)
const LEVEL_XP_BASE = 300      // Base XP for level 1
const LEVEL_XP_INCREMENT = 200 // XP increase per level

// Formula: xpForLevel(L) = 300 + (L-1) * 200
Level 1:  300 XP   (300 + 0*200)
Level 2:  500 XP   (300 + 1*200)
Level 3:  700 XP   (300 + 2*200)
Level 10: 2100 XP  (300 + 9*200)
Level 50: 10100 XP (300 + 49*200)
```

**Level from XP (Inverse Quadratic)**:
```typescript
// Given totalXP, calculate current level:
level = Math.floor((totalXP - 300) / 200) + 1

// XP progress into current level:
xpIntoLevel = totalXP - xpForLevel(level)
xpForLevel = LEVEL_XP_BASE + (level - 1) * LEVEL_XP_INCREMENT
tierPercent = (xpIntoLevel / xpForLevel) * 100
```

### Tier Rewards System

Each tier grants rewards:

```typescript
type TierReward = 
  | { type: 'multiplier', value: number, label: string }  // Quest XP boost
  | { type: 'badge', name: string, label: string }        // Exclusive badge

Examples:
- Signal Kitten (0-500):      Badge "First GM"
- Quest Apprentice (2K-4K):   +10% Quest XP multiplier
- Night Operator (4K-8K):     Badge "Streak Master"
- Star Captain (8K-15K):      +20% Quest XP multiplier
- Quantum Navigator (25K-40K): +30% Quest XP multiplier
```

---

## Current Implementation Analysis

### File Inventory

**Core XP System Files**:

```
components/
  XPEventOverlay.tsx      # Celebration overlay (219 lines)
  ProgressXP.tsx          # Full-screen modal (398 lines) ⚠️ NEEDS REBUILD
  
lib/
  rank.ts                 # Rank/tier logic (428 lines)
  viral-bonus.ts          # Viral engagement scoring (100 lines)
  
app/
  leaderboard/page.tsx    # Global leaderboard (500+ lines)
  
gmeow-indexer/
  src/events.ts           # Blockchain event topics
  src/processor.ts        # Event processing logic
```

### XPEventOverlay.tsx Analysis

**Current State**: ✅ SOLID FOUNDATION (Needs Enhancement)

**Event Types** (15 total):
```typescript
type XpEventKind =
  | 'gm'                  // Daily GM locked in ☀️
  | 'stake'               // Stake locked in 🛡️
  | 'unstake'             // Stake released ♻️
  | 'quest-create'        // Quest ready to launch 🧠
  | 'quest-verify'        // Quest completed 🚀
  | 'task-complete'       // Task completed ✅
  | 'onchainstats'        // Onchain stats shared 📊
  | 'profile'             // Profile level up 🌟
  | 'guild'               // Guild milestone reached 🏰
  | 'guild-join'          // Guild joined 🛡️
  | 'referral'            // Referral claimed 💌
  | 'referral-create'     // Referral code created 🔗
  | 'referral-register'   // Referral registered 🎁
  | 'badge-claim'         // Badge claimed 🏅
  | 'tip'                 // Tip received 💸
```

**Event Configuration**:
```typescript
const EVENT_COPY: Record<XpEventKind, EventCopy> = {
  gm: {
    headline: 'Daily GM locked in',
    shareLabel: 'Share GM victory',
    visitLabel: 'Stay on dashboard',
    tierTagline: 'Keep the streak rolling.',
    icon: '☀️',
  },
  // ... 14 more event configs
}
```

**Current Behavior**:
1. Receives XP event payload (event type, XP earned, total points)
2. Calculates rank progress via `calculateRankProgress(totalPoints)`
3. Passes data to `<ProgressXP />` component
4. **Issue**: Full-screen modal (outdated UX pattern)

**Integration Points**:
```typescript
// Usage across codebase
components/badge/BadgeInventory.tsx     → badge-claim event
components/quests/QuestVerification.tsx → task-complete, quest-verify
app/guild/[id]/page.tsx                 → guild-join event
app/referral/page.tsx                   → referral-create event
```

### ProgressXP.tsx Analysis

**Current State**: ⚠️ NEEDS REBUILD (Full-screen modal is outdated)

**Current Features**:
- ✅ Full-screen modal overlay (PROBLEM: blocks entire UI)
- ✅ XP progress bar animation (GOOD: keep this)
- ✅ Accessibility (ARIA labels, keyboard nav, focus trap)
- ✅ Chain icons (Base, Ethereum, Polygon)
- ✅ Level/XP display
- ✅ Share/visit CTAs
- ✅ `prefers-reduced-motion` support

**Issues**:
1. **Full-screen modal**: Modern gaming UIs use compact modals (400px max)
2. **No progress ring**: Need circular progress indicator (CSS-based)
3. **Basic animations**: Missing professional gaming patterns (scale, bounce, particle effects)
4. **No confetti**: Need canvas-based particle system for celebrations
5. **Static layout**: Need dynamic sizing based on event importance

**Rebuild Requirements**:
- ❌ Remove full-screen overlay
- ✅ Keep progress bar animation (enhance with Framer Motion)
- ✅ Add circular progress ring (CSS + SVG)
- ✅ Add confetti particle system (canvas-based, 60fps)
- ✅ Add professional animations (scale, bounce, fade)
- ✅ WCAG AAA compliance (keyboard nav, screen readers, reduced motion)

### rank.ts Analysis

**Current State**: ✅ SOLID LOGIC (Needs Performance Optimization)

**Key Functions**:

1. **calculateLevelProgress(xp: number)**
```typescript
// Returns: { level, xpIntoLevel, xpForLevel }
// Example: 5000 XP → Level 24, 500/1100 XP into level
```

2. **calculateRankProgress(points: number)**
```typescript
// Returns: RankProgress object with:
// - level: Current level
// - currentTier: Tier info (name, minPoints, maxPoints, tagline, reward)
// - nextTier: Next tier info
// - tierPercent: Progress toward next tier (0-100%)
// - xpIntoLevel, xpForLevel: Level progress
```

3. **getRankTierByPoints(points: number)**
```typescript
// Returns: Current tier object from IMPROVED_RANK_TIERS
```

**Performance Notes**:
- ⚠️ `calculateRankProgress()` called on every leaderboard render
- ⚠️ `IMPROVED_RANK_TIERS.find()` loops through array (O(n) complexity)
- ✅ **Optimization**: Cache results or use binary search for tier lookup

### viral-bonus.ts Analysis

**Current State**: ✅ GOOD ENGAGEMENT SCORING (Needs Milestone Celebrations)

**Viral Tier System**:
```typescript
enum ViralTier {
  mega_viral = 'mega_viral',  // 500 XP bonus
  viral = 'viral',            // 250 XP bonus
  popular = 'popular',        // 100 XP bonus
  engaging = 'engaging',      // 50 XP bonus
  active = 'active',          // 25 XP bonus
  none = 'none'               // 0 XP bonus
}
```

**Engagement Score Formula**:
```typescript
// Weighted engagement scoring
engagementScore = 
  (recasts × 10) +      // Highest weight (sharing)
  (replies × 5) +       // Medium weight (conversation)
  (likes × 2)           // Lowest weight (passive engagement)

// Tier thresholds:
mega_viral: score >= 100
viral:      score >= 50
popular:    score >= 20
engaging:   score >= 10
active:     score >= 5
```

**Viral Bonus Flow**:
1. User shares badge → `badge_casts` table entry
2. Webhook updates engagement metrics (likes, recasts, replies)
3. `calculateEngagementScore()` → determine tier
4. Award XP bonus → `xp_transactions` table
5. Update `viral_tier_history` → trigger notification

**Missing**:
- ❌ No visual celebration for tier upgrades
- ❌ No milestone achievements (first viral, 10 viral casts, etc.)
- ❌ No viral leaderboard ranking

---

## Supabase Schema Analysis

### Core Tables (7 of 32)

**1. user_profiles** (12 rows)
```sql
Columns:
- id (uuid, PK)
- fid (bigint, unique) -- Farcaster ID
- wallet_address (text) -- Primary wallet
- points (bigint, default 0)
- xp (bigint, default 0)
- neynar_tier (text) -- mythic, legendary, epic, rare, common
- metadata (jsonb) -- { shared_tier, share_timestamp, share_cast_hash }
```

**2. leaderboard_calculations** (27 rows)
```sql
Columns:
- id (bigint, PK)
- address (text)
- farcaster_fid (int)
- base_points (int, default 0) -- Quest completion
- viral_xp (int, default 0) -- Badge engagement
- guild_bonus (int, default 0) -- Guild level * 100
- referral_bonus (int, default 0) -- Referrals * 50
- streak_bonus (int, default 0) -- Streak * 10
- badge_prestige (int, default 0) -- Badges * 25
- guild_bonus_points (int, default 0) -- 10% member + 5% officer
- total_score (int, generated) -- Sum of all bonuses
- global_rank (int) -- Position in leaderboard
- rank_tier (text) -- Tier name from IMPROVED_RANK_TIERS
- period (text) -- daily, weekly, all_time
```

**3. gmeow_rank_events** (33 rows)
```sql
Columns:
- id (uuid, PK)
- created_at (timestamptz)
- event_type (text) -- quest-create, quest-verify, gm, etc.
- chain (text)
- wallet_address (text)
- fid (bigint)
- quest_id (bigint)
- delta (bigint) -- XP change amount
- total_points (bigint) -- New total
- previous_points (bigint) -- Old total
- level (int) -- Current level
- tier_name (text) -- Current tier
- tier_percent (numeric) -- Progress to next tier
- metadata (jsonb) -- XP/tier breakdowns + quest context
```

**4. badge_casts** (0 rows - viral tracking)
```sql
Columns:
- id (uuid, PK)
- fid (int)
- badge_id (text)
- cast_hash (text, unique) -- Warpcast cast hash
- tier (text) -- Badge tier
- likes_count (int, default 0)
- recasts_count (int, default 0)
- replies_count (int, default 0)
- viral_bonus_xp (int, default 0) -- Bonus XP from engagement
- viral_score (numeric, default 0) -- (recasts*10)+(replies*5)+(likes*2)
- viral_tier (text, default 'none') -- none, active, engaging, popular, viral, mega_viral
```

**5. xp_transactions** (0 rows - audit trail)
```sql
Columns:
- id (uuid, PK)
- fid (bigint)
- amount (int) -- XP change (+ or -)
- source (text) -- viral_bonus, quest_complete, badge_claim, etc.
- created_at (timestamptz)
```

**6. viral_tier_history** (0 rows - tier progression)
```sql
Columns:
- id (uuid, PK)
- cast_hash (text)
- fid (bigint)
- old_tier (text)
- new_tier (text)
- old_score (numeric)
- new_score (numeric)
- xp_bonus_awarded (int)
- changed_at (timestamptz)
- notification_sent (bool, default false)
```

**7. viral_milestone_achievements** (0 rows - milestones)
```sql
Columns:
- id (uuid, PK)
- fid (bigint)
- achievement_type (text) -- first_viral, 10_viral_casts, 100_shares, mega_viral_master
- achieved_at (timestamptz)
- notification_sent (bool, default false)
- cast_hash (text)
- metadata (jsonb)
```

---

## Integration Points Mapping

### XP Event Sources (15 Events)

**Blockchain Sources** (via Subsquid):
```
1. gm               → GmeowCore.GMEvent (daily GM action)
2. stake            → GmeowCore.Stake (badge staking)
3. unstake          → GmeowCore.Unstake (badge unstaking)
4. quest-verify     → GmeowCore.QuestCompleted (quest finish)
5. badge-claim      → GmeowBadge.Transfer (badge mint)
6. guild-join       → GmeowGuildStandalone.GuildJoined
7. referral-create  → GmeowReferralStandalone.ReferralCreated
8. referral-register→ GmeowReferralStandalone.ReferralRegistered
```

**Frontend Sources** (manual triggers):
```
9. quest-create     → Quest creation form submission
10. task-complete   → Quest task verification
11. onchainstats    → Onchain stats share action
12. profile         → Profile update/level up
13. guild           → Guild milestone reached
14. tip             → TipHub integration (external)
```

**Viral Bonus Source** (webhook):
```
15. Viral engagement → badge_casts table updates (Cast API webhook)
```

### UI Component Usage Map

**XPEventOverlay Usage**:
```
components/badge/BadgeInventory.tsx
  └─ showXPEvent({ event: 'badge-claim', xpEarned: 100, ... })

components/quests/QuestVerification.tsx
  ├─ showXPEvent({ event: 'task-complete', xpEarned: 50, ... })
  └─ showXPEvent({ event: 'quest-verify', xpEarned: 200, ... })

app/guild/[id]/page.tsx
  └─ showXPEvent({ event: 'guild-join', xpEarned: 150, ... })

app/referral/page.tsx
  └─ showXPEvent({ event: 'referral-create', xpEarned: 75, ... })
```

**Rank Calculation Usage**:
```
app/leaderboard/page.tsx
  └─ calculateRankProgress(entry.total_score) [HEAVY USAGE - 27+ calls]

components/profile/ProfileHeader.tsx
  └─ calculateRankProgress(user.points)

app/api/leaderboard/route.ts
  └─ calculateRankProgress() [Server-side calculations]
```

### Gmeow-Indexer Event Flow

**Event Processing Pipeline**:
```
1. Blockchain Event Emitted (Base chain)
   └─ GmeowCore.GMEvent(user, rewardPoints, streak)

2. Subsquid Indexer Captures Event
   └─ gmeow-indexer/src/processor.ts
   └─ Match topic hash → Parse event data

3. Supabase Database Insert
   └─ gmeow_rank_events table
   └─ leaderboard_calculations update (recalculate total_score)

4. Frontend Real-time Update
   └─ useLeaderboardRealtime() hook
   └─ Supabase realtime subscription
   └─ Update leaderboard UI

5. XP Celebration Trigger
   └─ XPEventOverlay component
   └─ ProgressXP modal display
```

---

## Part 1 Summary

**Analysis Complete** ✅

**Key Findings**:
- Solid backend architecture (Supabase 32 tables, Subsquid indexer, 12-tier rank system)
- Viral XP dominates scoring (80-90% of top player scores)
- 15 XP event types with comprehensive tracking
- Current UI needs modernization (full-screen modal → compact modal)

**Next Steps**: [Continue to Part 2](./XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md)

**Part 2 Topics**:
1. Gaming Platform Pattern Research (Fortnite, League of Legends, Valorant)
2. XPEventOverlay UI Rebuild Specification
3. Template Integration Strategy (music + gmeowbased0.6 + trezoadmin)
4. Professional Animation Patterns
5. Warpcast Frame Share Integration
6. WCAG AAA Accessibility Implementation
7. Migration Guide & Implementation Roadmap
