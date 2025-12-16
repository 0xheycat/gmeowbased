# 🖼️ Frame Migration Plan - Frog Framework
## Modern Farcaster Frames with Fast Image Generation & Easy Maintenance

**Date**: December 11, 2025  
**Status**: 🔴 PLANNING - Ready to Execute  
**Goal**: Migrate from legacy Frame implementation to Frog framework with structured, maintainable, and fast Frame system  
**Priority**: HIGH - Frame system needs modernization before NFT/Quest integration

---

## ⚡ CRITICAL CLARIFICATION - Frame Patterns Status (Dec 11, 2025)

**✅ FRAMES POST/BUTTON PATTERNS ARE NOT DEPRECATED**

After verifying with official Farcaster documentation (https://miniapps.farcaster.xyz/docs/specification):

- ✅ **Legacy Frames format is FULLY SUPPORTED** (POST requests, button meta tags, etc.)
- ✅ **Your current Frame implementation WILL CONTINUE WORKING** - no breaking changes
- ✅ **Backward compatibility**: `fc:frame` meta tag still supported for legacy Frames
- 🆕 **Mini Apps (v1)** is the NEW standard introduced Oct 2025 for advanced features
- 🆕 Mini Apps offer: iframe SDK, wallet provider (EIP-1193), notifications, manifest (farcaster.json)
- 📋 Mini Apps use `fc:miniapp` meta tag (coexists with `fc:frame` for backward compatibility)

**Why We're Still Migrating**:
- ❌ Current implementation has 3,003 line monolith (maintenance nightmare)
- ❌ Slow image generation (~300ms vs modern <100ms)
- ❌ Hardcoded logic (quest types, chains embedded in code)
- ❌ No component structure (difficult to extend)
- ✅ Frog provides better architecture while keeping legacy Frame format
- ✅ Future-ready for Mini Apps migration (Phase 2) when we need notifications

**Migration Strategy**:
1. **Phase 1 (NOW)**: Migrate to Frog (legacy Frames format) → Better code, same functionality
2. **Phase 2 (LATER)**: Upgrade to Mini Apps SDK → When we need push notifications, wallet provider, etc.

**TL;DR**: We're upgrading for **better architecture**, not fixing deprecation. Current Frames work fine.

---

## 🆕 Mini Apps vs Legacy Frames (Technical Comparison)

### **What Are Mini Apps?**

Mini Apps are the **NEW Farcaster standard** (v1 spec, Oct 2025) for building rich interactive applications. They replace meta tag-based Frames with a full JavaScript SDK and iframe/WebView communication.

### **Key Differences**

| Feature | Legacy Frames (Current) | Mini Apps (New Standard) |
|---------|------------------------|--------------------------|
| **Communication** | HTTP POST to server | JavaScript SDK (`@farcaster/miniapp-sdk`) |
| **Meta Tag** | `fc:frame` | `fc:miniapp` (backward compatible with `fc:frame`) |
| **Button Actions** | Meta tags (`<meta name="fc:frame:button:1" />`) | SDK methods (`sdk.actions.composeCast()`) |
| **Wallet Access** | Limited (via OnchainKit) | Full EIP-1193 provider (`sdk.wallet.ethProvider`) |
| **Notifications** | ❌ None | ✅ Push notifications (via webhooks) |
| **User Context** | Frame payload only | Rich context (`sdk.context` with FID, username, etc.) |
| **Manifest** | ❌ Not required | ✅ `farcaster.json` with app metadata |
| **App Store** | ❌ No listing | ✅ Listed in Farcaster app store |
| **Domain Verification** | ❌ None | ✅ JFS signature (JSON Farcaster Signature) |
| **Splash Screen** | ❌ None | ✅ Custom splash with icon + background |
| **Actions** | Basic (redirect, post) | Rich (composeCast, viewProfile, viewCast, swapToken, etc.) |
| **Development** | Frog, OnchainKit, Frames.js | `@farcaster/miniapp-sdk` + React |

### **When to Use Each**

**Use Legacy Frames (Frog) When**:
- Simple interactive content (polls, games, info cards)
- No need for notifications
- Quick development and deployment
- Backward compatibility important
- **Our current use case** ✅

**Use Mini Apps When**:
- Need push notifications to users
- Require full wallet provider access
- Building complex app with multiple screens
- Want app store listing and discovery
- Need rich user context and actions

### **Migration Path**

1. ✅ **Now**: Migrate to Frog (legacy Frames) - better code structure, same format
2. ⏭️ **Later**: Upgrade to Mini Apps SDK - when we need notifications/advanced features

**No Rush**: Legacy Frames are not deprecated and will continue working. Mini Apps are optional for apps needing advanced features.

---

## 📊 Current Frame System Audit

### **Existing Implementation Analysis**

**Framework**: Custom implementation with @coinbase/onchainkit v1.1.2  
**Total Routes**: 6 Frame routes  
**Lines of Code**: 3,003 lines in main route.tsx (massive monolith)  
**Image Generation**: Custom JSX → HTML → PNG (slow, complex)  
**Button Interactions**: Using legacy POST endpoints (⚠️ May be deprecated)  
**State Management**: frame_sessions table in Supabase (JSONB state)

```
Current Frame Routes:
├── /api/frame/route.tsx (3,003 lines - MONOLITH ⚠️)
├── /api/frame/badge/route.ts
├── /api/frame/badgeShare/route.ts
├── /api/frame/badgeShare/image/route.tsx
├── /api/frame/identify/route.ts
├── /api/frame/image/route.tsx (multiple backups - unorganized)
└── /api/frame/og/route.tsx
```

### **Critical Issues Identified**

1. ⚠️ **Should Migrate to Mini Apps**: Legacy Frames still work but Farcaster now recommends Mini Apps (spec updated Oct 2025)
2. 🐌 **Slow Image Generation**: Custom JSX → HTML → PNG pipeline (~300ms vs modern <100ms)
3. 🗂️ **Hardcoded Logic**: Quest types, chains, frame types embedded in 3,000 line file
4. 🧩 **No Component Structure**: Monolithic approach, difficult to maintain
5. 📦 **Mixed Concerns**: Business logic + rendering + state management in one file
6. 🔄 **Multiple Backups**: .backup, .backup-task3, .backup-v2 files (technical debt)

### **Framework Comparison Research**

| Framework | Status | Pros | Cons | Recommendation |
|-----------|--------|------|------|----------------|
| **Frog** | ✅ Active | - Lightweight (< 100 lines for basic frames)<br>- Built-in image gen<br>- Type-safe<br>- Vercel-ready<br>- Neynar integration<br>- **Supports legacy Frames format** | - Legacy Frames format (still works)<br>- Should migrate to Mini Apps eventually | ✅ **RECOMMENDED for Phase 1** |
| **Mini App SDK** | ✅ **LATEST** | - **Official Farcaster standard (v1)**<br>- Modern iframe/WebView communication<br>- Built-in wallet provider (EIP-1193)<br>- Rich actions (composeCast, viewProfile, etc.)<br>- Notification support<br>- Manifest-based (farcaster.json) | - Requires full app conversion<br>- More complex than Frames<br>- Need to learn new patterns | ✅ **RECOMMENDED for Phase 2** |
| **OnchainKit** | ✅ Active | - Coinbase-backed<br>- Comprehensive<br>- Wallet integration<br>- Production-ready | - Heavier (requires React setup)<br>- Current v1.1.2 may need update | ⚠️ Keep for wallet features |
| **Frames.js** | ✅ Active | - Framework-agnostic<br>- Analytics built-in<br>- Neynar support | - More setup required<br>- Less opinionated | ⏭️ Consider for analytics |
| **Custom** | ❌ Legacy | - Full control | - High maintenance<br>- Slow image gen<br>- No modern features | ❌ **REPLACE** |

**Decision**: **2-Phase Migration Strategy**
- **Phase 1**: Migrate to **Frog** (legacy Frames format still fully supported, no deprecation)
- **Phase 2**: Upgrade to **Mini Apps SDK** when ready for full interactive app features

**✅ IMPORTANT CLARIFICATION**: Legacy Frames POST/button patterns are **NOT deprecated**. They still work and are fully supported. However, Farcaster introduced **Mini Apps** (v1 spec, Oct 2025) as the modern standard for richer interactive experiences. Our current Frames will continue working, but Mini Apps offer better features for complex apps.

---

## 🎯 Migration Goals & Principles

### **Core Principles**

1. ⚡ **Fast Image Generation**: < 100ms PNG rendering (Frog built-in)
2. 🏗️ **Structured Components**: Reusable Frame components, not monoliths
3. 🔧 **Easy Maintenance**: Small files (< 200 lines), clear separation of concerns
4. 🚫 **No Hardcoding**: Configuration-driven, not embedded logic
5. 🔄 **Modern SDK**: Use latest Farcaster Frame specifications
6. 📊 **Backend Calculation**: Quest/NFT/Leaderboard logic in database/API, not Frame routes

### **Success Metrics**

- Frame response time: < 200ms (currently ~500ms+)
- Image generation: < 100ms (currently ~300ms+)
- Code maintainability: < 200 lines per route (currently 3,003)
- Modern architecture with component reusability
- 100% TypeScript type safety
- Ready for Mini Apps migration (Phase 2 future upgrade path)

---

## 🗄️ Quest & NFT System Architecture Analysis

### **Quest System (Current State)**

**Database Schema**: ✅ Well-structured (10 tables)

```
Quest Tables (Supabase):
├── unified_quests (main quest definitions)
│   ├── category: 'onchain' | 'social'
│   ├── reward_points: bigint
│   ├── reward_mode: 'points' | 'token' | 'nft'
│   ├── verification_data: jsonb
│   ├── tasks: jsonb (multi-step quests)
│   └── difficulty: 'beginner' | 'intermediate' | 'advanced'
├── quest_definitions (templates)
├── user_quests (progress tracking)
├── user_quest_progress (multi-step tasks)
├── quest_completions (verification proof)
├── quest_creator_earnings (10% creator fee)
├── quest_templates (wizard presets)
└── task_completions (individual task verification)
```

**API Routes**: ✅ Clean, validated with Zod

```
Quest APIs:
├── GET /api/quests - List all quests (with filters)
├── GET /api/quests/[slug] - Quest details + user progress
├── POST /api/quests/create - Create new quest (100 points cost)
├── POST /api/quests/[slug]/verify - Verify completion (onchain + social)
├── POST /api/quests/claim - Claim rewards (points/tokens/NFTs)
└── POST /api/quests/seed - Admin seed data
```

**Calculation Logic**: ✅ Backend-driven

- **Onchain Verification**: Contract event checks (viem + public RPC)
- **Social Verification**: Neynar API (cast likes, follows, etc.)
- **Multi-step Tasks**: task_completions table tracks progress
- **Creator Earnings**: 10% of completion rewards (quest_creator_earnings)
- **Points Cost**: 100 points to create quest (anti-spam)

**Quest Page Components**: ✅ Modern, filtered

```typescript
// app/quests/page.tsx
- QuestGrid: Display all quests
- QuestFilters: Category, difficulty, status, XP range, search
- Sorting: trending, xp-high, xp-low, newest, ending-soon
- User Progress: Real-time from user_quest_progress table
```

**🔄 Frame Integration Readiness**: ✅ READY

- All quest data available via `/api/quests/[slug]`
- Verification logic in `/api/quests/[slug]/verify`
- Frame can call API → no hardcoded logic needed
- Multi-step tasks already tracked in DB

---

### **NFT System (Current State)**

**Status**: ⚠️ **Backend/App NOT BUILT** (Contract ready, DB ready, APIs missing)

**Database Schema**: ✅ Prepared (5 tables)

```
NFT Tables (Supabase):
├── user_badges (unified badge + NFT storage)
│   ├── nft_type: 'badge' | 'nft'
│   ├── rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
│   ├── category: 'quest' | 'guild' | 'event' | 'achievement' | 'onboarding'
│   ├── minted: boolean
│   ├── tx_hash: text (onchain proof)
│   ├── token_id: bigint
│   └── metadata: jsonb
├── nft_metadata (NFT type registry)
│   ├── nft_type_id: unique identifier
│   ├── name, description, rarity, category
│   ├── image_url, animation_url
│   ├── max_supply, current_supply
│   ├── mint_price_wei
│   └── requirements: jsonb (eligibility rules)
├── mint_queue (pending mints)
├── badge_templates (badge definitions)
└── badge_casts (viral share tracking)
```

**Contract**: ✅ Verified on BaseScan

```
GmeowNFT Contract (0xCE9596a992e38c5fa2d997ea916a277E0F652D5C):
- ERC721 standard
- Base chain only
- Verified: Dec 11, 2025
- Functions: mint, transfer, tokenURI, ownerOf, etc.
- Events: Transfer, Approval, ApprovalForAll
```

**⚠️ Missing Components**:

1. ❌ NFT minting API (`/api/nft/mint`)
2. ❌ NFT gallery page (`/app/nft/page.tsx`)
3. ❌ NFT detail view (`/app/nft/[tokenId]/page.tsx`)
4. ❌ NFT components (`components/nft/NFTCard.tsx`, etc.)
5. ❌ Leaderboard integration (nft_points column exists but unused)

---

### **NFT Bonus Calculation System (NEW DESIGN)**

**Goal**: Add NFT points to leaderboard similar to guild/referral system

**Leaderboard Formula (Current - 6 Sources)**:

```sql
total_score = base_points + viral_xp + guild_bonus + 
              referral_bonus + streak_bonus + badge_prestige
```

**Proposed Formula (7 Sources - Add NFT Bonus)**:

```sql
total_score = base_points + viral_xp + guild_bonus + 
              referral_bonus + streak_bonus + badge_prestige + nft_bonus

-- NFT Bonus Calculation Logic:
nft_bonus = 
  (nft_common_count * 10) +      -- Common: 10 points each
  (nft_rare_count * 25) +         -- Rare: 25 points each
  (nft_epic_count * 50) +         -- Epic: 50 points each
  (nft_legendary_count * 100) +   -- Legendary: 100 points each
  (nft_mythic_count * 250) +      -- Mythic: 250 points each
  (quest_nft_bonus * 50)          -- Quest NFT completion: 50 bonus

-- Rarity Multipliers (same as badge system):
-- Common: 10 points (basic achievement)
-- Rare: 25 points (2.5x multiplier)
-- Epic: 50 points (5x multiplier)
-- Legendary: 100 points (10x multiplier)
-- Mythic: 250 points (25x multiplier)

-- Special Bonuses:
-- Quest NFT: +50 if NFT earned from quest completion (not purchased)
-- Collection Bonus: +100 if user owns all 5 rarities (completionist)
-- Event NFT: +150 if NFT from limited-time event
```

**Database Migration Required**:

```sql
-- Step 1: Add nft_bonus column to leaderboard_calculations
ALTER TABLE leaderboard_calculations
ADD COLUMN nft_bonus INTEGER DEFAULT 0 NOT NULL;

-- Step 2: Update total_score formula to include nft_bonus
ALTER TABLE leaderboard_calculations
DROP COLUMN total_score;

ALTER TABLE leaderboard_calculations
ADD COLUMN total_score INTEGER GENERATED ALWAYS AS (
  base_points + viral_xp + guild_bonus + 
  referral_bonus + streak_bonus + badge_prestige + nft_bonus
) STORED;

-- Step 3: Add NFT count tracking columns (for quick calculation)
ALTER TABLE leaderboard_calculations
ADD COLUMN nft_common_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN nft_rare_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN nft_epic_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN nft_legendary_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN nft_mythic_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN nft_quest_earned_count INTEGER DEFAULT 0 NOT NULL;

-- Step 4: Create index for NFT bonus sorting
CREATE INDEX idx_leaderboard_nft_bonus ON leaderboard_calculations(nft_bonus DESC);

-- Step 5: Add comments
COMMENT ON COLUMN leaderboard_calculations.nft_bonus IS 'NFT collection prestige bonus (rarity-weighted)';
COMMENT ON COLUMN leaderboard_calculations.nft_common_count IS 'Count of Common NFTs owned';
COMMENT ON COLUMN leaderboard_calculations.nft_rare_count IS 'Count of Rare NFTs owned';
COMMENT ON COLUMN leaderboard_calculations.nft_epic_count IS 'Count of Epic NFTs owned';
COMMENT ON COLUMN leaderboard_calculations.nft_legendary_count IS 'Count of Legendary NFTs owned';
COMMENT ON COLUMN leaderboard_calculations.nft_mythic_count IS 'Count of Mythic NFTs owned';
COMMENT ON COLUMN leaderboard_calculations.nft_quest_earned_count IS 'Count of NFTs earned from quest completion';
```

**API Integration** (For leaderboard sync cron):

```typescript
// lib/nft-leaderboard-sync.ts
export async function calculateNFTBonus(farcasterFid: number): Promise<number> {
  const supabase = createClient()
  
  // 1. Get all NFTs owned by user
  const { data: nfts } = await supabase
    .from('user_badges')
    .select('rarity, category, metadata')
    .eq('fid', farcasterFid)
    .eq('nft_type', 'nft')
    .eq('minted', true)
  
  if (!nfts) return 0
  
  // 2. Count NFTs by rarity
  const counts = {
    common: nfts.filter(n => n.rarity === 'common').length,
    rare: nfts.filter(n => n.rarity === 'rare').length,
    epic: nfts.filter(n => n.rarity === 'epic').length,
    legendary: nfts.filter(n => n.rarity === 'legendary').length,
    mythic: nfts.filter(n => n.rarity === 'mythic').length,
    quest_earned: nfts.filter(n => n.category === 'quest').length,
  }
  
  // 3. Calculate bonus
  let bonus = 0
  bonus += counts.common * 10
  bonus += counts.rare * 25
  bonus += counts.epic * 50
  bonus += counts.legendary * 100
  bonus += counts.mythic * 250
  bonus += counts.quest_earned * 50
  
  // 4. Check collection completion bonus
  const hasAllRarities = counts.common > 0 && counts.rare > 0 && 
                          counts.epic > 0 && counts.legendary > 0 && 
                          counts.mythic > 0
  if (hasAllRarities) bonus += 100
  
  // 5. Check event NFT bonus
  const eventNFTs = nfts.filter(n => n.category === 'event').length
  bonus += eventNFTs * 150
  
  return bonus
}

// Usage in leaderboard sync cron:
const nftBonus = await calculateNFTBonus(user.fid)
const nftCounts = await getNFTCountsByRarity(user.fid)

await supabase
  .from('leaderboard_calculations')
  .update({
    nft_bonus: nftBonus,
    nft_common_count: nftCounts.common,
    nft_rare_count: nftCounts.rare,
    nft_epic_count: nftCounts.epic,
    nft_legendary_count: nftCounts.legendary,
    nft_mythic_count: nftCounts.mythic,
    nft_quest_earned_count: nftCounts.quest_earned,
  })
  .eq('farcaster_fid', user.fid)
```

**Leaderboard Tab Integration**:

```typescript
// app/leaderboard/page.tsx
// Add new tab for "NFT Collectors" (similar to Referral Champions)

<Tab>NFT Collectors</Tab>

// Sort by nft_bonus
<CategoryLeaderboard 
  orderBy="nft_bonus" 
  category="NFT Collectors"
  description="Top NFT collectors ranked by rarity and collection size"
/>
```

**🎯 NFT Frame Integration Plan**:

1. **Minting Frame**: `/api/frame/nft/mint` - Display available NFTs, mint with 1-click
2. **Gallery Frame**: `/api/frame/nft/gallery` - Show user's NFT collection
3. **NFT Detail Frame**: `/api/frame/nft/[tokenId]` - NFT details, share, transfer
4. **Leaderboard Frame**: `/api/frame/leaderboard/nft` - Top NFT collectors

---

## 🛠️ Frog Framework Migration Plan

### **Phase 1: Setup & Infrastructure (Week 1)**

**1.1 Install Frog & Dependencies**

```bash
# Install Frog framework
pnpm add frog hono

# Install image generation dependencies
pnpm add satori sharp @vercel/og

# Keep OnchainKit for wallet features
# pnpm add @coinbase/onchainkit (already installed v1.1.2)

# Neynar SDK (already installed @neynar/nodejs-sdk v3.84.0)
```

**1.2 Create Frog Configuration**

```typescript
// lib/frog-config.ts
import { Frog } from 'frog'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { neynar } from 'frog/middlewares'

// Frog instance with Neynar integration
export const app = new Frog({
  basePath: '/api/frame',
  hub: {
    apiUrl: 'https://hub.farcaster.xyz',
    fetchOptions: {
      headers: {
        'x-farcaster-auth': process.env.NEYNAR_API_KEY || '',
      },
    },
  },
  imageOptions: {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        source: 'google',
        weight: 400,
      },
      {
        name: 'Inter',
        source: 'google',
        weight: 700,
      },
    ],
  },
  title: 'Gmeow - Social XP Platform',
})

// Neynar middleware for user data
app.use(
  neynar({
    apiKey: process.env.NEYNAR_API_KEY || '',
    features: ['interactor', 'cast'],
  })
)

// Dev tools (localhost only)
if (process.env.NODE_ENV === 'development') {
  devtools(app, { serveStatic })
}
```

**1.3 Create Frame Component Library**

```typescript
// lib/frame-components.tsx
import { Box, Text, Image, Heading } from 'frog/ui'

// Reusable Frame components
export const FrameHeader = ({ title }: { title: string }) => (
  <Box
    grow
    alignVertical="center"
    backgroundColor="brand"
    padding="32"
  >
    <Heading color="white" size="48" weight="700">
      {title}
    </Heading>
  </Box>
)

export const QuestCard = ({ 
  quest 
}: { 
  quest: { title: string; reward_points: number; difficulty: string } 
}) => (
  <Box
    grow
    alignVertical="center"
    backgroundColor="background"
    padding="24"
    borderRadius="16"
  >
    <Text size="32" weight="600">
      {quest.title}
    </Text>
    <Box flexDirection="row" gap="8">
      <Text size="20" color="gray">
        {quest.difficulty}
      </Text>
      <Text size="20" color="success">
        +{quest.reward_points} XP
      </Text>
    </Box>
  </Box>
)

export const NFTCard = ({ 
  nft 
}: { 
  nft: { name: string; image_url: string; rarity: string } 
}) => (
  <Box
    grow
    alignVertical="center"
    backgroundColor="background"
    padding="24"
    borderRadius="16"
  >
    <Image src={nft.image_url} width="300" height="300" />
    <Text size="32" weight="600">
      {nft.name}
    </Text>
    <Text size="20" color="legendary">
      {nft.rarity}
    </Text>
  </Box>
)

export const LeaderboardRow = ({ 
  entry 
}: { 
  entry: { rank: number; username: string; total_score: number; avatar: string } 
}) => (
  <Box flexDirection="row" gap="16" padding="12">
    <Text size="24" weight="700">
      #{entry.rank}
    </Text>
    <Image src={entry.avatar} width="48" height="48" borderRadius="24" />
    <Text size="24" weight="600">
      {entry.username}
    </Text>
    <Text size="24" color="success">
      {entry.total_score.toLocaleString()}
    </Text>
  </Box>
)
```

---

### **Phase 2: Quest Frame Migration (Week 1-2)**

**2.1 Quest List Frame**

```typescript
// app/api/frame/quest/route.tsx
import { app } from '@/lib/frog-config'
import { FrameHeader, QuestCard } from '@/lib/frame-components'
import { Button } from 'frog'

// GET /api/frame/quest - Display quest list
app.frame('/quest', async (c) => {
  const { buttonValue, status } = c
  
  // Fetch quests from API (backend calculation)
  const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/quests?limit=5`)
  const { data: quests } = await response.json()
  
  // Filter by button click
  const category = buttonValue === '2' ? 'social' : 'onchain'
  const filteredQuests = quests.filter((q: any) => q.category === category)
  
  return c.res({
    image: (
      <Box grow flexDirection="column" gap="16" padding="32">
        <FrameHeader title="🎯 Active Quests" />
        {filteredQuests.slice(0, 3).map((quest: any) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </Box>
    ),
    intents: [
      <Button value="1">🔗 Onchain</Button>,
      <Button value="2">💬 Social</Button>,
      <Button.Link href={`${process.env.NEXT_PUBLIC_URL}/quests`}>
        View All
      </Button.Link>,
    ],
  })
})

export const GET = app.fetch
export const POST = app.fetch
```

**2.2 Quest Detail Frame**

```typescript
// app/api/frame/quest/[slug]/route.tsx
import { app } from '@/lib/frog-config'
import { Button } from 'frog'

app.frame('/quest/:slug', async (c) => {
  const { slug } = c.req.param()
  const { frameData } = c
  const userFid = frameData?.fid
  
  // Fetch quest details + user progress from API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/quests/${slug}?userFid=${userFid}`
  )
  const { data: quest } = await response.json()
  
  // Progress percentage
  const progress = quest.user_progress?.progress_percentage || 0
  
  return c.res({
    image: (
      <Box grow flexDirection="column" padding="32">
        <Heading size="48">{quest.title}</Heading>
        <Text size="24" color="gray">
          {quest.description}
        </Text>
        <Box flexDirection="row" gap="16">
          <Text size="28" color="success">
            +{quest.reward_points} XP
          </Text>
          <Text size="28" color="brand">
            {quest.difficulty}
          </Text>
        </Box>
        
        {/* Progress bar */}
        <Box width="100%" height="24" backgroundColor="gray200" borderRadius="12">
          <Box 
            width={`${progress}%`} 
            height="24" 
            backgroundColor="success" 
            borderRadius="12" 
          />
        </Box>
        <Text size="20">{progress}% Complete</Text>
      </Box>
    ),
    intents: [
      <Button action={`/quest/${slug}/verify`}>✅ Verify</Button>,
      <Button.Link href={`${process.env.NEXT_PUBLIC_URL}/quests/${slug}`}>
        View Details
      </Button.Link>,
    ],
  })
})

// Verification handler
app.frame('/quest/:slug/verify', async (c) => {
  const { slug } = c.req.param()
  const { frameData } = c
  const userFid = frameData?.fid
  
  // Call verification API (backend logic)
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/quests/${slug}/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userFid }),
    }
  )
  
  const result = await response.json()
  
  if (result.success) {
    return c.res({
      image: (
        <Box grow flexDirection="column" alignVertical="center" padding="32">
          <Text size="64">🎉</Text>
          <Heading size="48">Quest Complete!</Heading>
          <Text size="32" color="success">
            +{result.reward_points} XP Earned
          </Text>
        </Box>
      ),
      intents: [
        <Button action="/quest">More Quests</Button>,
        <Button.Link href={`${process.env.NEXT_PUBLIC_URL}/profile`}>
          View Profile
        </Button.Link>,
      ],
    })
  } else {
    return c.res({
      image: (
        <Box grow flexDirection="column" alignVertical="center" padding="32">
          <Text size="64">❌</Text>
          <Heading size="48">Not Complete</Heading>
          <Text size="24" color="gray">
            {result.message}
          </Text>
        </Box>
      ),
      intents: [
        <Button action={`/quest/${slug}`}>Try Again</Button>,
        <Button.Link href={`${process.env.NEXT_PUBLIC_URL}/quests/${slug}`}>
          View Requirements
        </Button.Link>,
      ],
    })
  }
})

export const GET = app.fetch
export const POST = app.fetch
```

---

### **Phase 3: NFT Frame Implementation (Week 2)**

**3.1 NFT Minting Frame**

```typescript
// app/api/frame/nft/mint/route.tsx
import { app } from '@/lib/frog-config'
import { NFTCard } from '@/lib/frame-components'
import { Button } from 'frog'

app.frame('/nft/mint', async (c) => {
  const { frameData, buttonValue } = c
  const userFid = frameData?.fid
  
  // Fetch available NFTs from nft_metadata table
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/nft/available`
  )
  const { data: nfts } = await response.json()
  
  // Filter by rarity (button navigation)
  const rarity = buttonValue || 'all'
  const filteredNFTs = rarity === 'all' 
    ? nfts 
    : nfts.filter((n: any) => n.rarity === rarity)
  
  return c.res({
    image: (
      <Box grow flexDirection="column" gap="16" padding="32">
        <FrameHeader title="🖼️ Mint NFT" />
        {filteredNFTs.slice(0, 2).map((nft: any) => (
          <NFTCard key={nft.id} nft={nft} />
        ))}
      </Box>
    ),
    intents: [
      <Button value="common">Common</Button>,
      <Button value="rare">Rare</Button>,
      <Button value="epic">Epic</Button>,
      <Button action={`/nft/mint/${filteredNFTs[0]?.nft_type_id}`}>
        Mint First
      </Button>,
    ],
  })
})

// Mint handler
app.frame('/nft/mint/:nftTypeId', async (c) => {
  const { nftTypeId } = c.req.param()
  const { frameData } = c
  const userFid = frameData?.fid
  
  // Call mint API (backend handles contract interaction)
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/nft/mint`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userFid, nftTypeId }),
    }
  )
  
  const result = await response.json()
  
  if (result.success) {
    return c.res({
      image: (
        <Box grow flexDirection="column" alignVertical="center" padding="32">
          <Image src={result.nft.image_url} width="400" height="400" />
          <Heading size="48">NFT Minted!</Heading>
          <Text size="32">{result.nft.name}</Text>
          <Text size="24" color="legendary">{result.nft.rarity}</Text>
        </Box>
      ),
      intents: [
        <Button action="/nft/gallery">View Gallery</Button>,
        <Button.Link href={`https://basescan.org/tx/${result.tx_hash}`}>
          View Transaction
        </Button.Link>,
      ],
    })
  } else {
    return c.res({
      image: (
        <Box grow flexDirection="column" alignVertical="center" padding="32">
          <Text size="64">❌</Text>
          <Heading size="48">Mint Failed</Heading>
          <Text size="24" color="gray">{result.message}</Text>
        </Box>
      ),
      intents: [
        <Button action="/nft/mint">Try Again</Button>,
      ],
    })
  }
})

export const GET = app.fetch
export const POST = app.fetch
```

**3.2 NFT Gallery Frame**

```typescript
// app/api/frame/nft/gallery/route.tsx
import { app } from '@/lib/frog-config'
import { NFTCard } from '@/lib/frame-components'
import { Button } from 'frog'

app.frame('/nft/gallery', async (c) => {
  const { frameData, buttonValue } = c
  const userFid = frameData?.fid
  
  // Fetch user's NFTs from user_badges table
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_URL}/api/nft/owned?userFid=${userFid}`
  )
  const { data: nfts } = await response.json()
  
  // Pagination (3 NFTs per page)
  const page = parseInt(buttonValue || '0')
  const perPage = 3
  const startIdx = page * perPage
  const pageNFTs = nfts.slice(startIdx, startIdx + perPage)
  
  return c.res({
    image: (
      <Box grow flexDirection="column" gap="16" padding="32">
        <FrameHeader title={`🖼️ Your Collection (${nfts.length})`} />
        {pageNFTs.map((nft: any) => (
          <NFTCard key={nft.id} nft={nft} />
        ))}
      </Box>
    ),
    intents: [
      page > 0 && <Button value={String(page - 1)}>← Prev</Button>,
      startIdx + perPage < nfts.length && (
        <Button value={String(page + 1)}>Next →</Button>
      ),
      <Button.Link href={`${process.env.NEXT_PUBLIC_URL}/nft`}>
        View All
      </Button.Link>,
    ].filter(Boolean),
  })
})

export const GET = app.fetch
export const POST = app.fetch
```

---

### **Phase 4: Leaderboard NFT Tab (Week 2)**

**4.1 Database Migration**

```bash
# Run migration script
pnpm tsx scripts/add-nft-bonus-to-leaderboard.ts
```

```typescript
// scripts/add-nft-bonus-to-leaderboard.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addNFTBonusColumn() {
  console.log('🔄 Adding nft_bonus column to leaderboard_calculations...')
  
  // Step 1: Add nft_bonus column
  await supabase.rpc('execute_sql', {
    query: `
      ALTER TABLE leaderboard_calculations
      ADD COLUMN IF NOT EXISTS nft_bonus INTEGER DEFAULT 0 NOT NULL;
    `
  })
  
  // Step 2: Drop old total_score (generated column)
  await supabase.rpc('execute_sql', {
    query: `
      ALTER TABLE leaderboard_calculations
      DROP COLUMN IF EXISTS total_score;
    `
  })
  
  // Step 3: Re-create total_score with nft_bonus
  await supabase.rpc('execute_sql', {
    query: `
      ALTER TABLE leaderboard_calculations
      ADD COLUMN total_score INTEGER GENERATED ALWAYS AS (
        base_points + viral_xp + guild_bonus + 
        referral_bonus + streak_bonus + badge_prestige + nft_bonus
      ) STORED;
    `
  })
  
  // Step 4: Add NFT count columns
  await supabase.rpc('execute_sql', {
    query: `
      ALTER TABLE leaderboard_calculations
      ADD COLUMN IF NOT EXISTS nft_common_count INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS nft_rare_count INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS nft_epic_count INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS nft_legendary_count INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS nft_mythic_count INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS nft_quest_earned_count INTEGER DEFAULT 0 NOT NULL;
    `
  })
  
  // Step 5: Create index
  await supabase.rpc('execute_sql', {
    query: `
      CREATE INDEX IF NOT EXISTS idx_leaderboard_nft_bonus 
      ON leaderboard_calculations(nft_bonus DESC);
    `
  })
  
  console.log('✅ Migration complete!')
}

addNFTBonusColumn()
```

**4.2 Add NFT Tab to Leaderboard Page**

```typescript
// app/leaderboard/page.tsx (add new tab)

<Tab>NFT Collectors</Tab>

// Below existing tabs, add:
<CategoryLeaderboard 
  orderBy="nft_bonus" 
  category="NFT Collectors"
  description="Top NFT collectors ranked by rarity and collection size"
  icon="🖼️"
/>
```

**4.3 Update Leaderboard Sync Cron**

```typescript
// app/api/cron/sync-leaderboard/route.ts
import { calculateNFTBonus, getNFTCountsByRarity } from '@/lib/nft-leaderboard-sync'

// In sync loop:
for (const user of users) {
  // ... existing calculations ...
  
  // NFT bonus calculation
  const nftBonus = await calculateNFTBonus(user.fid)
  const nftCounts = await getNFTCountsByRarity(user.fid)
  
  await supabase
    .from('leaderboard_calculations')
    .upsert({
      farcaster_fid: user.fid,
      address: user.wallet_address,
      base_points: basePoints,
      viral_xp: viralXP,
      guild_bonus: guildBonus,
      referral_bonus: referralBonus,
      streak_bonus: streakBonus,
      badge_prestige: badgePrestige,
      nft_bonus: nftBonus, // NEW
      nft_common_count: nftCounts.common, // NEW
      nft_rare_count: nftCounts.rare, // NEW
      nft_epic_count: nftCounts.epic, // NEW
      nft_legendary_count: nftCounts.legendary, // NEW
      nft_mythic_count: nftCounts.mythic, // NEW
      nft_quest_earned_count: nftCounts.quest_earned, // NEW
      period: 'all_time',
    })
}
```

---

### **Phase 5: Image Generation Optimization (Week 3)**

**5.1 Fast Image Generation with Satori**

```typescript
// lib/frame-image-generator.ts
import satori from 'satori'
import sharp from 'sharp'

// Pre-load fonts (cache in memory)
const interRegular = await fetch(
  'https://fonts.googleapis.com/css2?family=Inter:wght@400'
).then(res => res.arrayBuffer())

const interBold = await fetch(
  'https://fonts.googleapis.com/css2?family=Inter:wght@700'
).then(res => res.arrayBuffer())

export async function generateFrameImage(
  element: React.ReactElement,
  options?: { width?: number; height?: number }
): Promise<Buffer> {
  const width = options?.width || 1200
  const height = options?.height || 630
  
  // Generate SVG with Satori (< 50ms)
  const svg = await satori(element, {
    width,
    height,
    fonts: [
      {
        name: 'Inter',
        data: interRegular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: interBold,
        weight: 700,
        style: 'normal',
      },
    ],
  })
  
  // Convert SVG → PNG with Sharp (< 50ms)
  const png = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()
  
  return png
}

// Usage in Frame routes:
import { generateFrameImage } from '@/lib/frame-image-generator'

const imageBuffer = await generateFrameImage(
  <Box grow flexDirection="column">
    <Heading>Fast Image</Heading>
  </Box>
)

return new Response(imageBuffer, {
  headers: {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=3600',
  },
})
```

**Performance Target**: < 100ms total (50ms satori + 50ms sharp)

---

### **Phase 6: Migration Checklist & Testing (Week 3)**

**6.1 Pre-Migration Checklist**

- [ ] ✅ Frog installed and configured
- [ ] ✅ Frame component library created
- [ ] ✅ Image generation optimized (< 100ms)
- [ ] ✅ NFT database migration complete
- [ ] ✅ NFT bonus calculation logic implemented
- [ ] ✅ Quest API endpoints tested
- [ ] ✅ NFT minting API created
- [ ] ✅ Leaderboard sync cron updated

**6.2 Migration Steps**

1. **Backup Current Frame Routes**
   ```bash
   mkdir -p app/api/frame-legacy
   cp -r app/api/frame/* app/api/frame-legacy/
   ```

2. **Create New Frog Routes** (Phases 2-3 above)

3. **Test Locally with Framegear**
   ```bash
   pnpm dev
   # Visit: https://framegear.xyz
   # Enter: http://localhost:3000/api/frame/quest
   ```

4. **Deploy to Staging**
   ```bash
   vercel --prod
   ```

5. **Test on Warpcast**
   - Use: https://warpcast.com/~/developers/frames
   - Test URL: https://yourdomain.com/api/frame/quest

6. **Monitor Performance**
   - Frame response time: < 200ms ✓
   - Image generation: < 100ms ✓
   - Error rate: < 1% ✓

7. **Gradual Rollout**
   - Week 1: 10% traffic to new Frog frames
   - Week 2: 50% traffic
   - Week 3: 100% traffic, remove legacy routes

**6.3 Testing Checklist**

Quest Frames:
- [ ] Quest list displays correctly
- [ ] Quest detail shows progress
- [ ] Quest verification works
- [ ] Rewards are credited correctly
- [ ] Multi-step quests track progress

NFT Frames:
- [ ] NFT minting flow completes
- [ ] Gallery displays user's NFTs
- [ ] Pagination works correctly
- [ ] Transaction links are valid
- [ ] NFT bonus updates leaderboard

Leaderboard:
- [ ] NFT Collectors tab displays
- [ ] Sorting by nft_bonus works
- [ ] NFT counts display correctly
- [ ] Total score includes nft_bonus
- [ ] Sync cron runs successfully

Performance:
- [ ] All frames load < 200ms
- [ ] Images generate < 100ms
- [ ] No deprecated SDK warnings
- [ ] Mobile-friendly display
- [ ] Cache headers set correctly

---

## 📊 Success Metrics

### **Before Migration (Current State)**

| Metric | Current | Issues |
|--------|---------|--------|
| Frame Response Time | ~500ms+ | Slow custom pipeline |
| Image Generation | ~300ms+ | JSX → HTML → PNG |
| Code Maintainability | 3,003 lines/file | Monolithic, hardcoded |
| Modern Architecture | No | Monolithic, no components |
| NFT Integration | ❌ No | Backend not built |
| Quest Frame | ❌ No | Not integrated |

### **After Migration (Target State)**

| Metric | Target | Solution |
|--------|--------|----------|
| Frame Response Time | < 200ms | Frog optimized pipeline |
| Image Generation | < 100ms | Satori + Sharp |
| Code Maintainability | < 200 lines/file | Component-based, config-driven |
| Modern Architecture | ✅ Yes | Component library, reusable patterns |
| NFT Integration | ✅ Complete | Minting + Gallery + Leaderboard |
| Quest Frame | ✅ Complete | List + Detail + Verify |

---

## 🚀 Next Steps

### **Phase 1: Frog Migration (Legacy Frames Format)** - Immediate Priority

1. **Immediate (This Week)**:
   - ✅ Mark referral system complete in migration plan
   - ✅ Verify Frame patterns are NOT deprecated (confirmed Dec 11, 2025)
   - ⏭️ Install Frog and create config (1 hour)
   - ⏭️ Create frame component library (2 hours)
   - ⏭️ Implement quest list frame (3 hours)

2. **Week 1-2**:
   - Quest detail + verification frames
   - NFT database migration
   - NFT minting frame
   - NFT gallery frame

3. **Week 2-3**:
   - Leaderboard NFT tab integration
   - Image generation optimization
   - Testing and QA
   - Gradual rollout

4. **Week 3-4**:
   - Monitor performance metrics
   - Remove legacy frame routes
   - Documentation and training
   - Celebrate 🎉

### **Phase 2: Mini Apps Migration** - Future Enhancement (Optional)

**When to Consider**: After Frog migration is complete and stable, and when we need:
- Push notifications to users
- Richer wallet integration (EIP-1193 provider)
- Advanced actions (composeCast, viewProfile, viewCast, etc.)
- Mini App manifest (farcaster.json) with app store listing
- Better mobile app integration (iframe/WebView communication)

**Requirements for Phase 2**:
1. Install `@farcaster/miniapp-sdk` (replaces Frog)
2. Create `/.well-known/farcaster.json` manifest
3. Add JFS (JSON Farcaster Signature) for domain verification
4. Update meta tags from `fc:frame` to `fc:miniapp`
5. Replace Frog routes with SDK actions (`sdk.actions.ready()`, etc.)
6. Implement webhook endpoint for notifications
7. Convert from meta tag buttons to SDK-driven UI

**Timeline**: Not urgent. Mini Apps are for apps needing notifications/advanced features. Current Frames work perfectly for our use case.

**Resources**:
- Mini Apps Spec: https://miniapps.farcaster.xyz/docs/specification
- Mini App SDK: https://github.com/farcasterxyz/miniapps
- Neynar Mini App Guide: https://docs.neynar.com/docs/create-farcaster-miniapp-in-60s

---

## 📚 Resources

### **Documentation**

- **Frog Framework**: https://frog.fm (legacy Frames format - still fully supported)
- **Mini Apps Specification** (v1): https://miniapps.farcaster.xyz/docs/specification (NEW standard, Oct 2025)
- **Mini App SDK**: https://github.com/farcasterxyz/miniapps (for Phase 2 migration)
- **Neynar Frog Guide**: https://docs.neynar.com/docs/analytics-frame-neynar-frog
- **Neynar Mini App Guide**: https://docs.neynar.com/docs/create-farcaster-miniapp-in-60s
- **Coinbase OnchainKit**: https://docs.cdp.coinbase.com/onchainkit
- **Satori Image Gen**: https://github.com/vercel/satori

### **Important Notes**

- ✅ **Legacy Frames (POST/button) are NOT deprecated** - they still work perfectly
- 🆕 **Mini Apps** are the new standard for advanced features (notifications, wallet provider, etc.)
- 📋 **Backward compatibility**: `fc:frame` meta tag still supported alongside `fc:miniapp`
- 🔄 **Migration path**: Frog (Phase 1) → Mini Apps SDK (Phase 2 optional)

### **Testing Tools**

- Framegear (localhost): https://framegear.xyz
- Warpcast Frame Validator: https://warpcast.com/~/developers/frames
- Frame Debugger: Browser DevTools → Network tab

### **Support**

- Frog Discord: https://frog.fm/discord
- Neynar Slack: https://neynar.com/slack
- Farcaster Dev Chat: https://warpcast.com/~/channel/fc-devs

---

**Document Status**: ✅ READY FOR IMPLEMENTATION  
**Created**: December 11, 2025  
**Last Updated**: December 11, 2025  
**Author**: AI Agent + 0xheycat
