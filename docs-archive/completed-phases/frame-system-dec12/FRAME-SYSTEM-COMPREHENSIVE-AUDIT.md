# Frame System Comprehensive Audit & Redesign

**Created**: December 11, 2025, 7:45 AM CST  
**Updated**: December 11, 2025, 8:15 AM CST  
**Status**: ✅ ALIGNED - Hybrid Architecture Confirmed  
**Architecture**: Subsquid (Blockchain Events) + Supabase (Off-chain Data) + Hybrid Calculation Layer

---

## 🚨 CRITICAL FINDING: We're Missing The Big Picture!

### **What Just Happened**:
1. ✅ Migrated 6 basic frames (GM, Leaderboard, Points, Guild, Badge, Referral)
2. ❌ **DID NOT** audit all smart contract events being indexed
3. ❌ **DID NOT** check how leaderboard actually calculates scores
4. ❌ **DID NOT** map UI pages to their data requirements
5. ❌ **MISSED** advanced calculation logic (viral XP, tips, NFTs, guild bonuses)

### **The Real Problem**:
```
We have 9 LEADERBOARD CATEGORIES but only 6 basic frame types!
- All Pilots (total_score with 7+ components)
- Quest Masters (base_points + quest completions)
- Viral Legends (viral_xp from badge_casts)
- Guild Heroes (guild_bonus_points + officer bonuses)
- Referral Champions (referral_bonus)
- Streak Kings (streak_bonus from GM streaks)
- Badge Collectors (badge_prestige)
- Tip Lords (tip_points from TipHub)
- NFT Holders (nft_points from NFT rewards)
```

**WE NEED FRAMES FOR ALL 9 CATEGORIES!**

---

## 📊 Comprehensive Data Audit

### **1. Subsquid Events Being Indexed** (`gmeow-indexer/src/main.ts`)

#### **Core Contract Events** (GmeowCore):
```typescript
✅ GMEvent / GMSent 
   - Updates: User.totalXP, User.currentStreak, User.lastGMTimestamp
   - Creates: GMEvent entity
   - Used by: GM Frame ✅
```

#### **Guild Contract Events** (GmeowGuildStandalone):
```typescript
✅ GuildCreated
   - Creates: Guild, GuildMember (owner)
   - Creates: GuildEvent (type: CREATED)
   
✅ GuildJoined
   - Creates: GuildMember
   - Updates: Guild.totalMembers
   - Creates: GuildEvent (type: JOINED)
   
✅ GuildLeft
   - Updates: GuildMember.isActive = false
   - Updates: Guild.totalMembers
   - Creates: GuildEvent (type: LEFT)
   
❌ MISSING: Guild points deposit events (for guild_bonus calculation)
❌ MISSING: Guild officer promotion events (for is_guild_officer bonus)
```

#### **Badge/NFT Contract Events** (ERC721 Transfer):
```typescript
✅ Transfer (to Badge contract)
   - Creates: BadgeMint
   - Links: BadgeMint.user
   - Used by: Badge Frame ✅
   
✅ Transfer (to NFT contract)  
   - Creates: NFTMint or NFTTransfer
   - Used by: ❌ NO NFT FRAME YET!
```

#### **Referral Contract Events**:
```typescript
❌ MISSING IN PROCESSOR!
   - Subsquid schema HAS: ReferralCode, ReferralUse entities
   - Processor NOT indexing referral events yet!
   - Referral Frame won't work until processor fixed!
```

---

### **2. Leaderboard Calculation Logic** (`leaderboard_calculations` table)

```sql
-- The REAL score formula (from Supabase table):
total_score = base_points          -- Quest completions (from contract)
            + viral_xp              -- Badge cast engagement (from badge_casts table)
            + guild_bonus           -- Guild level * 100 (NOT IN SUBSQUID!)
            + referral_bonus        -- Referral count * 50 (from contract)
            + streak_bonus          -- GM streak * 10 (from GMEvent)
            + badge_prestige        -- Badge count * 25 (from BadgeMint)
            + guild_bonus_points    -- 10% member + 5% officer (NOT IN SUBSQUID!)
            + tip_points            -- Tip activity (NOT IN SUBSQUID!)
            + nft_points            -- NFT rewards (NOT IN SUBSQUID!)
```

#### **MAJOR GAPS**:
1. **Viral XP** (`badge_casts` table) - NOT in Subsquid!
   ```sql
   viral_score = (recasts × 10) + (replies × 5) + (likes × 2)
   viral_tier: none → active → engaging → popular → viral → mega_viral
   viral_bonus_xp: Milestone rewards (10 recasts = +50 XP)
   ```

2. **Guild Bonuses** - Partial in Subsquid
   - ✅ Guild membership tracked
   - ❌ Guild level/tier NOT tracked
   - ❌ Officer status NOT tracked
   - ❌ Guild bonus % calculation NOT implemented

3. **Tip Points** (`points_transactions` table) - NOT in Subsquid!
   ```sql
   tip_points = SUM(amount) WHERE source = 'tip_earned' OR 'tip_given'
   ```

4. **NFT Points** - NOT tracked anywhere!
   ```sql
   nft_points = NFT reward quests + NFT ownership bonuses
   ```

5. **Quest Points** - NOT in Subsquid!
   ```sql
   base_points = SUM(reward_points) FROM quest_completions
   ```

---

### **3. UI Pages Data Requirements**

#### **Leaderboard Page** (`app/leaderboard/page.tsx`):
```tsx
// 9 TABS with different calculations:
Tab 1: All Pilots       → total_score (ALL 9 components)
Tab 2: Quest Masters    → base_points (quest completions)
Tab 3: Viral Legends    → viral_xp (badge cast engagement)
Tab 4: Guild Heroes     → guild_bonus_points (guild membership bonuses)
Tab 5: Referral Champions → referral_bonus (referrals * 50)
Tab 6: Streak Kings     → streak_bonus (GM streak * 10)
Tab 7: Badge Collectors → badge_prestige (badges * 25)
Tab 8: Tip Lords        → tip_points (TipHub activity)
Tab 9: NFT Holders      → nft_points (NFT rewards)
```

**Current State**: Only Tab 1 (All Pilots) works via Subsquid LeaderboardEntry!
**Tabs 2-9**: Need dedicated queries with category-specific calculations!

#### **Profile Page** (`app/profile/[fid]/page.tsx`):
```tsx
// User profile shows ALL activity types:
- GM Streak & Total GMs (✅ Subsquid GMEvent)
- Quest Completions (❌ NOT in Subsquid - uses quest_completions table)
- Badge Collection (✅ Subsquid BadgeMint)
- Guild Membership (✅ Subsquid GuildMember)
- Referral Stats (❌ NOT indexed yet in Subsquid)
- NFT Collection (⚠️ Partially - NFTMint in Subsquid but no metadata)
- Viral Badges (❌ NOT in Subsquid - uses badge_casts table)
- Tip Activity (❌ NOT in Subsquid - uses points_transactions)
```

#### **Quest Page** (`app/quests/page.tsx`):
```tsx
// Quest system uses:
- quest_definitions table (quest templates)
- user_quests table (user progress)
- quest_completions table (completion records)
- unified_quests table (user-generated quests)

❌ NO Quest entities in Subsquid schema!
❌ Quest Frame can't work until Quest system in Subsquid!
```

#### **Guild Page** (`app/guild/[guildId]/page.tsx`):
```tsx
// Guild page needs:
- ✅ Guild basic info (Subsquid Guild entity)
- ✅ Member list (Subsquid GuildMember)
- ✅ Recent events (Subsquid GuildEvent)
- ❌ Guild metadata (name, desc, avatar) - Supabase guild_metadata table
- ❌ Guild level/tier - NOT tracked anywhere
- ❌ Guild treasury balance - NOT tracked
```

#### **Referral Page** (`app/referral/page.tsx`):
```tsx
// Referral system uses:
- referral_stats table (leaderboard data)
- referral_activity table (event timeline)
- referral_registrations table (code registry)
- referral_timeline table (daily analytics)

⚠️ ReferralCode/ReferralUse in Subsquid schema but NOT being indexed!
```

---

## 🎯 Hybrid Event-Driven Architecture (95/5 Rule)

### **Confirmed Architecture Pattern**:

```
Smart Contract Events (Blockchain - Source of Truth)
    ↓
Subsquid Indexer (95% - Blockchain Events ONLY)
    ├── GMEvent, Guild, Badge, NFT, Referral ✅
    └── GraphQL API for blockchain data
    ↓
External APIs (Off-chain - Secondary Sources)
    ├── Warpcast API (viral engagement)
    ├── TipHub API (tip activity)
    └── Quest System (user-generated content)
    ↓
Supabase (5% - Off-chain Data Storage)
    ├── user_profiles (FID→wallet mapping)
    ├── badge_casts (viral engagement cache)
    ├── quest_definitions (quest metadata)
    └── points_transactions (tip activity)
    ↓
Hybrid Calculation Layer (NEW - Combines Both Sources)
    ├── Queries Subsquid (blockchain data)
    ├── Queries Supabase (off-chain data)
    └── Computes combined scores
    ↓
API Layer (Frame Handlers, UI)
```

### **Architecture Benefits**:

1. **Clear Data Ownership**:
   ```
   ✅ Subsquid: ALL blockchain events (GM, Guild, Badge, NFT, Referral)
   ✅ Supabase: ALL off-chain data (Quest, Viral, Tip, FID mapping)
   ✅ Calculation Layer: Combines both sources for leaderboards
   ```

2. **Complete Event Processing Strategy**:
   ```
   ✅ Referral events: Add to Subsquid processor (PRIORITY)
   ✅ Quest events: Keep in Supabase (off-chain user content)
   ✅ Tip events: Keep in Supabase (external TipHub API)
   ✅ Viral events: Keep in Supabase (external Warpcast API)
   ```

3. **Unified Calculation Layer**:
   ```
   ✅ Create lib/scoring/hybrid-calculator.ts
   ✅ Combines Subsquid blockchain data + Supabase off-chain data
   ✅ Single source of truth for scoring formulas
   ✅ Powers all leaderboard categories
   ```

---

## 📋 Required Frame Types (Complete List)

### **Data-Driven Frames** (Need Subsquid + Calculation Logic):

1. **✅ GM Frame** - DONE
   - Entity: GMEvent
   - Calculation: currentStreak, lifetimeGMs, totalXP
   
2. **✅ Leaderboard Frame** - DONE (but only "All Pilots" category)
   - Entity: LeaderboardEntry
   - **MISSING**: Category-specific leaderboards (Quest, Viral, Guild, etc.)

3. **✅ Points Frame** - DONE (basic)
   - Entity: User.totalXP
   - **MISSING**: Points breakdown by source (quest/viral/guild/tip/NFT)

4. **✅ Guild Frame** - DONE
   - Entities: Guild, GuildMember, GuildEvent
   - **MISSING**: Guild level, treasury, officer status

5. **✅ Badge Frame** - DONE
   - Entity: BadgeMint
   - **MISSING**: Viral badge stats (from badge_casts)

6. **✅ Referral Frame** - DONE (but processor not indexing events!)
   - Entities: ReferralCode, ReferralUse
   - **PROBLEM**: Events not being processed yet!

7. **❌ Quest Frame** - DEFERRED
   - **BLOCKER**: No Quest entities in Subsquid schema
   - Needs: Quest, QuestCompletion, QuestProgress entities
   - Calculation: completion_count, rewards_earned

8. **❌ NFT Frame** - MISSING
   - Entity: NFTMint, NFTTransfer
   - Needs: NFT ownership, transfer history, rarity

9. **❌ Viral Frame** - MISSING
   - **BLOCKER**: No Viral entities in Subsquid (badge_casts in Supabase)
   - Needs: ViralCast entity with engagement metrics
   - Calculation: viral_score, viral_tier, viral_bonus_xp

10. **❌ Tip Frame** - MISSING
    - **BLOCKER**: No Tip entities in Subsquid (points_transactions in Supabase)
    - Needs: TipTransaction entity
    - Calculation: tips_sent, tips_received, tip_points

11. **❌ Leaderboard Category Frames** - MISSING (9 types!)
    - Quest Masters Frame (base_points)
    - Viral Legends Frame (viral_xp)
    - Guild Heroes Frame (guild_bonus_points)
    - Referral Champions Frame (referral_bonus)
    - Streak Kings Frame (streak_bonus)
    - Badge Collectors Frame (badge_prestige)
    - Tip Lords Frame (tip_points)
    - NFT Holders Frame (nft_points)
    - All Pilots Frame (total_score)

---

## 🔧 Required Architecture Changes

### **Phase 1: Complete Blockchain Event Indexing** (High Priority - Subsquid ONLY)

1. **Fix Referral Event Processing** (CRITICAL - Schema exists, processor missing):
   ```typescript
   // Events to index from GmeowReferralStandalone contract:
   ✅ ReferralCodeRegistered(user, code)
   ✅ ReferralRewardClaimed(referrer, referee, pointsReward, tokenReward)
   
   // Update entities:
   - ReferralCode.totalUses (count of claims)
   - ReferralCode.totalRewards (sum of rewards)
   - ReferralUse records (referrer, referee, reward, timestamp)
   ```

2. **Enhance NFT Event Processing**:
   ```typescript
   // Current: Basic ERC721 Transfer tracking ✅
   // Add: NFT metadata and ownership tracking
   
   - Track current NFT owners (for "NFT Holders" category)
   - Link NFT mints to badge quests (if applicable)
   - Calculate nft_points component for leaderboard
   ```

3. **Add Onchain Stats Events** (if contract emits them):
   ```typescript
   // Check Core contract for:
   - PointsAwarded events (beyond GM)
   - StreakMilestone events
   - LevelUp events (if implemented)
   ```

4. **DO NOT Add to Subsquid** (Keep in Supabase - Off-chain):
   ```
   ❌ Quest entities - User-generated content, not blockchain events
   ❌ Viral entities - External Warpcast API data
   ❌ Tip entities - External TipHub API data
   ```

### **Phase 2: Hybrid Calculation Layer** (Medium Priority)

1. **Create Hybrid Score Calculator** (Combines Subsquid + Supabase):
   ```typescript
   // lib/scoring/hybrid-calculator.ts
   import { getSubsquidStats } from '@/lib/subsquid-client'
   import { getSupabaseStats } from '@/lib/supabase/queries/stats'
   
   export async function calculateLeaderboardScore(fid: number, walletAddress: string) {
     // Subsquid: Blockchain data (60%)
     const subsquidData = await getSubsquidStats(walletAddress)
     const streakBonus = subsquidData.currentStreak * 10
     const badgePrestige = subsquidData.badgeCount * 25
     const referralBonus = subsquidData.referralCount * 50
     const nftPoints = subsquidData.nftRewards
     const guildBonus = subsquidData.guildLevel * 100
     
     // Supabase: Off-chain data (40%)
     const supabaseData = await getSupabaseStats(fid)
     const basePoints = supabaseData.questCompletions  // From quest_completions
     const viralXP = supabaseData.castEngagement       // From badge_casts
     const tipPoints = supabaseData.tipActivity        // From points_transactions
     const guildBonusPoints = calculateGuildMemberBonus(supabaseData)
     
     return {
       totalScore: basePoints + viralXP + guildBonus + referralBonus + 
                   streakBonus + badgePrestige + tipPoints + nftPoints + 
                   guildBonusPoints,
       breakdown: {
         basePoints,      // Supabase
         viralXP,         // Supabase
         guildBonus,      // Subsquid
         referralBonus,   // Subsquid
         streakBonus,     // Subsquid
         badgePrestige,   // Subsquid
         tipPoints,       // Supabase
         nftPoints,       // Subsquid
         guildBonusPoints // Supabase
       }
     }
   }
   ```

2. **Category-Specific Leaderboard Entities**:
   ```graphql
   type QuestLeaderboard @entity {
     user: User!
     rank: Int!
     basePoints: BigInt!
   }
   
   type ViralLeaderboard @entity {
     user: User!
     rank: Int!
     viralXP: BigInt!
     viralTier: String!
   }
   
   # ... 7 more leaderboard types
   ```

### **Phase 3: Frame System Redesign** (After Phase 1+2)

1. **Modularize Frame Handlers** (from earlier plan)
2. **Add Missing Frame Types** (Viral, Tip, NFT, Category frames)
3. **Consistent Data Layer** (all frames use Subsquid queries)

---

## 📊 Comparison: OLD vs NEW Foundation

### **OLD Foundation** (Current):
```
Smart Contracts
    ↓
Partial Subsquid Indexing (GM, Guild, Badge only)
    ↓
Mixed Data:
    - Some in Subsquid (GMEvent, Guild, Badge)
    - Some in Supabase (viral_xp, tip_points, quests)
    - Some nowhere (guild_level, nft_points)
    ↓
Scattered Calculations:
    - leaderboard_calculations table (Supabase stored proc)
    - Frame route.tsx handlers (inline logic)
    - UI components (client-side calc)
    ↓
6 Basic Frames (missing 3 frame types + 9 category variants)
```

**Problems**:
- ❌ Inconsistent data (3 sources of truth)
- ❌ Incomplete event coverage (missing Quest, Viral, Tip)
- ❌ Calculation logic duplicated (3 places)
- ❌ Missing frame types (can't serve all leaderboard categories)

### **NEW Foundation** (Target):
```
Smart Contracts (ALL events covered)
    ↓
Complete Subsquid Indexing
    - GM, Guild, Badge, NFT (✅ done)
    - Referral (schema done, indexing needed)
    - Quest, Viral, Tip (schema + indexing needed)
    ↓
Unified Calculation Engine (in Subsquid processor)
    - Single source of truth for all formulas
    - Materialized leaderboard views by category
    - Real-time score updates
    ↓
Complete Frame System:
    - 11 frame types (not 6!)
    - Modular handlers (one file per frame)
    - Consistent query pattern (all use Subsquid)
    ↓
Professional API:
    - Category-specific endpoints
    - Efficient pagination
    - Type-safe responses
```

**Benefits**:
- ✅ Single source of truth (Subsquid only)
- ✅ Complete event coverage (all contracts)
- ✅ Centralized calculations (one place)
- ✅ Full feature parity (all leaderboard categories)

---

## 🚀 Action Plan (Hybrid Architecture)

### **Confirmed Strategy: 95/5 Hybrid** ✅
- Subsquid: ALL blockchain events (95%)
- Supabase: Off-chain data ONLY (5%)
- Calculation Layer: Combines both sources

### **Phase 1: Fix Blockchain Indexing** (Week 1 - Subsquid)

1. **Day 1-2: Add Referral Event Handlers** (CRITICAL)
   - Import referral ABI in main.ts
   - Add ReferralCodeRegistered handler
   - Add ReferralRewardClaimed handler
   - Update ReferralCode/ReferralUse entities
   - Test with production data

2. **Day 3: Enhance NFT Tracking**
   - Add NFT ownership tracking
   - Link NFT mints to quest rewards
   - Calculate nft_points component

3. **Day 4: Add Onchain Stats Events**
   - Audit Core contract for additional events
   - Add any missing point/reward events
   - Verify all blockchain data indexed

4. **Day 5: Testing & Validation**
   - Compare Subsquid data vs RPC calls
   - Verify all blockchain events captured
   - Validate entity relationships

### **Phase 2: Hybrid Calculation Layer** (Week 2)

1. **Day 1-2: Create Hybrid Calculator**
   - Build lib/scoring/hybrid-calculator.ts
   - Implement subsquid + supabase queries
   - Test scoring formula accuracy

2. **Day 3-4: Category-Specific Calculators**
   - Quest Masters calculator (base_points)
   - Viral Legends calculator (viral_xp)
   - Guild Heroes calculator (guild bonuses)
   - Referral Champions calculator (referral_bonus)
   - Streak/Badge/Tip/NFT calculators

3. **Day 5: API Integration**
   - Create /api/leaderboard/category/[type] endpoints
   - Integrate hybrid calculator
   - Add caching layer (1-5 min cache)

### **Phase 3: Complete Frame System** (Week 3)

1. **Day 1-2: Add Missing Frames**
   - NFT Frame (use Subsquid NFTMint)
   - Category-specific frames (9 types)

2. **Day 3-4: Frame Modularization**
   - Extract frame handlers to lib/frames/
   - Shared utilities (FID resolver, scoring)
   - Type-safe frame responses

3. **Day 5: Testing & Deployment**
   - Test all 11+ frame types
   - Verify data accuracy across categories
   - Deploy to production

---

## 📚 Documentation Updates Needed

1. **FRAME-SUBSQUID-MIGRATION.md** - Mark as incomplete
   - Only 6/11 frames done
   - Foundation issues identified
   - Revised plan required

2. **FRAME-MODULARIZATION-PLAN.md** - Put on hold
   - Can't modularize incomplete foundation
   - Need to fix data layer first

3. **SUBSQUID-SCHEMA-EXPANSION.md** - NEW DOC
   - Document all missing entities
   - Quest, Viral, Tip systems
   - Guild extensions
   - Calculation logic

4. **LEADERBOARD-CATEGORY-FRAMES.md** - NEW DOC
   - Document 9 category frame types
   - Scoring formulas per category
   - API requirements

---

**Status**: 🔴 CRITICAL ARCHITECTURE REVIEW REQUIRED  
**Next Step**: Review this audit with team, decide on phased approach  
**Timeline**: 3 weeks to complete full foundation (not 1.5 days!)  
**Blocker**: Cannot proceed with Phase 3 until foundation complete
