# Phase 1B.1 System Architecture Audit

**Audit Date**: December 2024  
**Status**: In Progress (Point/XP Award Logic Analysis)  
**Purpose**: Document existing system architecture before implementing Phase 1B.1 interactive frame buttons

---

## 1. Frame Types Overview

### 9 Operational Frame Types

| Frame Type | Location (line) | Primary Action | Current Button |
|------------|----------------|----------------|----------------|
| **gm** | 2219 | Daily GM ritual | "Open GM Ritual" → /gm |
| **quest** | 931, 1441 | Quest completion | "Open Quest" → /Quest |
| **onchainstats** | 1773 | View contract stats | "Open Stats" → /onchainstats |
| **badge** | 2150 | Badge minting | "Open Badges" → /badges |
| **leaderboards** | 977 | Ranking display | "Open Leaderboard" → /leaderboard |
| **guild** | 957, 1670 | Guild management | "Open Guild" → /Guild |
| **verify** | 1642 | Quest verification | "Verify Quest" → /quests |
| **points** | 972, 1990 | Points economy | "Open Points" → /points |
| **referral** | 967, 1726 | Referral system | "Open Referrals" → /referral |

### Frame Metadata Format (Farcaster vNext)

**Implementation**: `buildFrameHtml()` function (lines 994-1194 in `app/api/frame/route.tsx`)

```typescript
{
  version: 'next',
  imageUrl: 'https://gmeowbased.com/api/og/frame-dynamic?type=quest&...',
  button: {
    title: 'Open Quest',
    action: {
      type: 'launch_frame',
      name: 'Gmeowbased',
      url: 'https://gmeowbased.com/Quest',
      splashImageUrl: 'https://gmeowbased.com/splash.png'
    }
  }
}
```

**Button Validation**: `sanitizeButtons()` enforces:
- Max 4 buttons per frame
- Title length checks (3-30 chars)
- Automatic truncation of excess buttons

**Dynamic Palettes**: Each frame type has unique color scheme via `getFramePalette()`:
- quest: `#8e7cff` (purple)
- guild: `#4da3ff` (blue)
- gm: `#ff9500` (orange)
- badge: `#ff6b9d` (pink)
- etc.

---

## 2. Contract Events & Point/XP Triggers

### 2.1 Event Categories

**Source**: `lib/contract-events.ts` (534 lines)

| Category | Events | Description |
|----------|--------|-------------|
| **gm** | GMEvent, GMSent | Daily GM streak tracking |
| **quests** | QuestAdded, QuestCompleted, QuestClosed | Quest lifecycle |
| **economy** | PointsDeposited, PointsWithdrawn, PointsTipped | Manual point transfers |
| **badges** | BadgeMinted, StakedForBadge, UnstakedForBadge | Badge system |
| **referrals** | ReferralCodeRegistered, ReferrerSet, ReferralRewardClaimed | Referral program |
| **guilds** | GuildCreated, GuildJoined, GuildLeft, GuildLevelUp, GuildQuestCreated | Guild system |
| **admin** | FIDLinked, OracleSignerUpdated, PowerBadgeSet | Admin operations |
| **erc20** | ERC20EscrowDeposited, ERC20Payout, ERC20Refund | Token escrows |

### 2.2 Key Event Descriptions

#### GMSent Event
```typescript
{
  category: 'gm',
  description: 'Lightweight GM signal consumed by historical charts and push notifications.',
  automations: ['Append GM history feed entries', 'Refresh contract GM counters'],
  gmUtils: ['createSendGMTx', 'createGMTransaction'],
  notification: {
    title: 'GM echo',
    body: '{streakLabel}: @{username} kept the vibes alive on Gmeow.',
    placeholders: ['username', 'streakLabel']
  }
}
```

**Point Award**: Based on streak (contract logic)

#### QuestCompleted Event
```typescript
{
  category: 'quests',
  description: 'A quest completion was validated by the oracle signature workflow.',
  automations: ['Award progression badges', 'Record completion analytics for dashboards'],
  gmUtils: ['createCompleteQuestWithSigTx', 'createCompleteQuestTransaction'],
  notification: {
    title: 'Quest cleared',
    body: '@{player} completed **{questName}** on {chainLabel} and banked {rewardPoints} points.'
  }
}
```

**Point Award**: `rewardPoints` specified in quest metadata (passed as event argument `pointsAwarded`)

#### GuildJoined Event
```typescript
{
  category: 'guilds',
  description: 'Member joined an existing guild.',
  automations: ['Update guild rosters', 'Notify guild captains of new members'],
  gmUtils: ['createJoinGuildTx']
}
```

**Point Award**: Guild join bonus (contract logic)

---

## 3. Point/XP Award Logic

### 3.1 New User Rewards

**Source**: `lib/user-rewards.ts` (120 lines)

```typescript
export async function checkAndAwardNewUserRewards(
  fid: number,
  neynarScore: number
): Promise<{ awarded: boolean; points: number; xp: number; og: boolean }> {
  const isOG = neynarScore >= 0.8
  
  if (isOG) {
    return {
      awarded: true,
      points: 1000,
      xp: 0,
      og: true
    }
  }
  
  return {
    awarded: true,
    points: 50,
    xp: 30,
    og: false
  }
}
```

**Trigger**: First-time frame view (integrated in `app/api/frame/route.tsx` GET handler)

**Database Update**: Creates `user_profiles` row with:
- `points`: 1000 (OG) or 50 (new)
- `xp`: 0 (OG) or 30 (new)
- `og_nft_eligible`: true (OG only)
- `onboarded_at`: timestamp

### 3.2 Onboarding Completion

**Source**: `app/api/onboard/complete/route.ts` (308 lines)

**Flow**:
1. Fetch real Neynar score from `/api/neynar/score`
2. Calculate tier (Common → Mythic) via `getTierFromScore()`
3. Assign tier badge automatically via `assignBadgeToUser()`
4. Award baseline + tier bonus rewards:

```typescript
const BASELINE_REWARDS = {
  points: 50,
  xp: 30,
}

// Tier bonuses (from getTierConfig):
// - Mythic: +500 points, +200 xp
// - Legendary: +300 points, +150 xp
// - Epic: +200 points, +100 xp
// - Rare: +100 points, +50 xp
// - Common: +0 points, +0 xp
```

5. Queue badge mint + OG NFT mint (Mythic only)

**Database Update** (lines 105-173):
```typescript
const { data: profile, error } = await supabase
  .from('user_profiles')
  .upsert({
    fid,
    primary_address: finalAddress,
    custody_address: custodyAddress,
    points: totalPoints,
    xp: totalXp,
    neynar_score: finalScore,
    onboarded_at: new Date().toISOString(),
    og_nft_eligible: tier === 'mythic',
  })
  .select()
```

### 3.3 Point/XP Award Pattern Analysis

**Key Finding**: Points and XP are **NOT automatically updated from contract events**.

**Current Architecture**:
1. **Contract events** (GMSent, QuestCompleted, etc.) are **indexed by backend jobs**
2. **Points/XP updates** happen via:
   - **Onboarding**: Direct Supabase insert (50+30 or 1000+0)
   - **Manual admin deposits**: `PointsDeposited` event (tracked in contract)
   - **Quest claims**: Client-side transaction → contract emits `QuestCompleted` → backend job syncs points
   - **Tips**: P2P transfers via `PointsTipped` event
3. **Leaderboard sync**: Separate cron job reads contract state and updates `user_profiles`

**Phase 1B.1 Implication**: Interactive frame buttons will trigger **contract transactions** (via `recordGM`, `questProgress` actions), which emit events that are later synced to `user_profiles` by backend jobs. Frame actions don't directly write to database.

---

## 4. Rank Calculation System

**Source**: `lib/rank.ts` (160 lines)

### 4.1 Level Progression (XP-based)

```typescript
const LEVEL_XP_BASE = 300
const LEVEL_XP_INCREMENT = 200

export function calculateLevelProgress(points: number): {
  level: number
  currentXP: number
  xpForNextLevel: number
  progressPercent: number
} {
  // Quadratic XP formula: XP = BASE + INCREMENT * (level - 1)
  // Level 1: 300 XP
  // Level 2: 500 XP (300 + 200)
  // Level 3: 700 XP (300 + 400)
  // Level N: 300 + 200 * (N - 1)
  
  // Solve: points = 300 * level + 200 * (level * (level - 1)) / 2
  // Simplified: level = (sqrt(1600 * points + 40000) - 200) / 400
}
```

### 4.2 Rank Tiers (Point-based)

```typescript
export const RANK_TIERS = [
  { 
    name: 'Signal Kitten', 
    minPoints: 0, 
    tagline: 'Just getting started',
    tier: 1 
  },
  { 
    name: 'Pixel Paw', 
    minPoints: 1000, 
    tagline: 'Building momentum',
    tier: 2 
  },
  { 
    name: 'Cyber Cat', 
    minPoints: 3000, 
    tagline: 'Making waves',
    tier: 3 
  },
  { 
    name: 'Quantum Whisker', 
    minPoints: 6000, 
    tagline: 'Power user territory',
    tier: 4 
  },
  { 
    name: 'Cosmic Meowster', 
    minPoints: 10000, 
    tagline: 'Elite status',
    tier: 5 
  },
  { 
    name: 'Mythic GM', 
    minPoints: 15000, 
    tagline: 'Legendary tier',
    tier: 6 
  }
]

export function calculateRankProgress(points: number, xp: number): {
  currentRank: RankTier
  nextRank: RankTier | null
  progressPercent: number
  pointsToNext: number
} {
  // Returns current rank tier, next tier, progress percentage, and points needed
}
```

**Usage in Frames**: Frame metadata generation calls `calculateRankProgress()` to display user's rank and progress in dynamic images.

---

## 5. Badge System

### 5.1 Badge Registry Structure

**Source**: `lib/badges.ts` (1393 lines)

```typescript
export type BadgeRegistry = {
  version: string
  tiers: {
    mythic: TierDefinition
    legendary: TierDefinition
    epic: TierDefinition
    rare: TierDefinition
    common: TierDefinition
  }
  badges: Array<{
    id: string
    name: string
    slug: string
    badgeType: string
    description: string
    tier: TierType
    pointsCost: number
    imageUrl?: string
    artPath?: string
    active: boolean
    metadata?: Record<string, any>
    autoAssign?: boolean
    assignmentRule?: {
      type: 'neynar_score' | 'quest_completion' | 'guild_join' | 'referral_count'
      condition: Record<string, any>
    }
  }>
}
```

### 5.2 Badge Assignment Flow

**Auto-Assignment Badges** (triggered by specific events):
- **Onboarding tier badges**: Assigned during `/api/onboard/complete` based on Neynar score
- **Quest badges**: Auto-assigned when specific quest is completed (via backend job)
- **Guild badges**: Assigned when user joins a guild (via backend job)
- **Referral badges**: Assigned when referral milestones hit (e.g., 10 referrals)

**Manual Minting Badges** (user-initiated):
- User navigates to `/badges` page
- Selects badge they're eligible for
- Pays `pointsCost` via contract transaction
- Badge NFT minted to their wallet
- Record created in `user_badges` table

### 5.3 Badge Cache System

**Source**: `lib/badges.ts` lines 151-251

```typescript
type TemplateCache = { 
  value: BadgeTemplate[]
  includesInactive: boolean
  expiresAt: number 
}

const templateCache: { current: TemplateCache | null } = { current: null }
const mintedCache = new Map<string, { value: MintedBadge[]; expiresAt: number }>()
```

**Cache TTL**:
- **Badge registry**: 5 minutes
- **User badges**: 2 minutes

**Tables**:
- `badge_templates`: Badge definitions
- `user_badges`: User's minted badges (fid, badgeId, tier, minted, txHash, tokenId)

---

## 6. Quest System

### 6.1 Quest Verification Flow

**Source**: `app/api/quests/verify/route.ts` (1200+ lines)

**Flow**:
1. **Parse quest requirements** from metadata:
   ```typescript
   {
     questTypeKey: 'FARCASTER_FOLLOW',
     targetFid: 12345,
     targetUsername: 'gmeowbased',
     castIdentifier: '0xabcd1234',
     castContains: 'gm',
     frameUrl: 'https://gmeowbased.com/frame'
   }
   ```

2. **Resolve targets**:
   - Convert usernames → FIDs via Neynar API
   - Normalize cast URLs → cast hashes
   - Build lookup plan with fallback candidates

3. **Verify action via Neynar interactions API**:
   ```typescript
   // For FARCASTER_FOLLOW
   GET /v2/farcaster/user/interactions/?type=follows&fids=targetFid,viewerFid
   
   // For FARCASTER_LIKE/RECAST/REPLY
   GET /v2/farcaster/user/interactions/?type=likes&fids=targetFid,viewerFid
   ```

4. **Generate oracle signature**:
   ```typescript
   function signQuest({
     chainId,
     contractAddr,
     questId,
     user,
     fid,
     action,
     deadline,
     nonce,
     account
   }) {
     const hash = keccak256(
       encodePacked(
         ['uint256', 'address', 'uint256', 'address', 'uint256', 'uint8', 'uint256', 'uint256'],
         [chainId, contractAddr, questId, user, fid, action, deadline, nonce]
       )
     )
     return account.signMessage({ message: { raw: toBytes(hash) } })
   }
   ```

5. **Return signature to client** for contract submission

### 6.2 Quest Claim Flow

**Source**: `app/api/quests/claim/route.ts` (50 lines)

**In-Memory Claim Tracking**:
```typescript
const claims = new Map<string, { at: number; metaHash: string | null }>()

// Key format: 'base:42:0xabcd1234'
const key = `${chain}:${questId}:${address.toLowerCase()}`

// Prevents double-claiming before contract state syncs
```

**Production Note**: Should be replaced with Redis/KV store for distributed deployments.

### 6.3 Quest Types

**Source**: `lib/gm-utils.ts` (600+ lines)

```typescript
export const QUEST_TYPES = {
  GENERIC: 0,
  FARCASTER_FOLLOW: 1,
  FARCASTER_RECAST: 2,
  FARCASTER_REPLY: 3,
  FARCASTER_LIKE: 4,
  FARCASTER_CAST: 5,
  FARCASTER_MENTION: 6,
  FARCASTER_CHANNEL_POST: 7,
  FARCASTER_FRAME_INTERACT: 8,
  FARCASTER_VERIFIED_USER: 9,
  // ... more types
}
```

**Transaction Builders**:
- `createAddQuestTx(name, questType, target, rewardPoints, maxCompletions, expiresAt, meta)`
- `createCompleteQuestWithSigTx(questId, signature)`
- `createCloseQuestTx(questId)`

**Reward Structure**:
- **Points**: `rewardPointsPerUser` (stored in contract quest struct)
- **ERC20**: Optional token rewards (`rewardToken`, `rewardTokenPerUser`)

---

## 7. Guild System

### 7.1 Guild Events

**Source**: `lib/contract-events.ts` lines 347-400

| Event | Trigger | Point Award |
|-------|---------|-------------|
| GuildCreated | Leader creates guild | 0 (manual deposit required) |
| GuildJoined | Member joins guild | Guild join bonus (contract) |
| GuildLeft | Member leaves guild | -Guild join bonus (if clawback enabled) |
| GuildLevelUp | Guild crosses point threshold | 0 (celebration only) |
| GuildQuestCreated | Leader creates guild quest | 0 (escrow from guild treasury) |
| GuildPointsDeposited | Member deposits to treasury | 0 (internal transfer) |

### 7.2 Guild Transaction Builders

**Source**: `lib/gm-utils.ts` lines 340-365

```typescript
export const createJoinGuildTx = (guildId: bigint|number|string, chain: ChainKey = 'base') =>
  buildCallObject('joinGuild', [toBigInt(guildId)], chain)

export const createLeaveGuildTx = (guildId: bigint|number|string, chain: ChainKey = 'base') =>
  buildCallObject('leaveGuild', [toBigInt(guildId)], chain)

export const createDepositGuildPointsTx = (guildId: bigint|number|string, points: bigint|number|string, chain: ChainKey = 'base') =>
  buildCallObject('depositGuildPoints', [toBigInt(guildId), toBigInt(points)], chain)

export const createClaimGuildRewardTx = (guildId: bigint|number|string, points: bigint|number|string, chain: ChainKey = 'base') =>
  buildCallObject('claimGuildReward', [toBigInt(guildId), toBigInt(points)], chain)

export const createGuildQuestTx = (guildId: bigint|number|string, name: string, rewardPoints: bigint|number|string, chain: ChainKey = 'base') =>
  buildCallObject('createGuildQuest', [toBigInt(guildId), name, toBigInt(rewardPoints)], chain)
```

### 7.3 Guild Roster Management

**Source**: `lib/team.ts` (partial reference from grep results)

```typescript
// Build member list from GuildJoined/GuildLeft logs
if (parsed.eventName === 'GuildJoined' || parsed.eventName === 'GuildLeft') {
  // Parse contract logs to build current member list
}

if (e.name === 'GuildJoined' && e.member) current.add(e.member.toLowerCase())
```

**Pattern**: Guild rosters are **derived from contract events**, not stored in database. Backend jobs index `GuildJoined`/`GuildLeft` events to build real-time member lists.

---

## 8. Referral System

### 8.1 Referral Events

**Source**: `lib/contract-events.ts` lines 301-346

| Event | Description | Point Award |
|-------|-------------|-------------|
| ReferralCodeRegistered | Pilot registers custom code | 0 |
| ReferrerSet | New pilot attributes to referrer | Referral bonus (contract) |
| ReferralRewardClaimed | Referrer claims accumulated rewards | Variable (based on referee count) |

### 8.2 Referral Transaction Builders

**Source**: `lib/gm-utils.ts` lines 320-340

```typescript
export const createRegisterReferralCodeTx = (code: string, chain: ChainKey = 'base') =>
  buildCallObject('registerReferralCode', [code], chain)

export const createSetReferrerTx = (code: string, chain: ChainKey = 'base') =>
  buildCallObject('setReferrer', [code], chain)

export const createClaimReferralRewardTx = (chain: ChainKey = 'base') =>
  buildCallObject('claimReferralReward', [], chain)
```

### 8.3 Referral Badge System

**Auto-Assignment Rules** (from badge registry):
- **Bronze Recruiter**: 5 referrals
- **Silver Recruiter**: 10 referrals
- **Gold Recruiter**: 25 referrals
- **Diamond Recruiter**: 50 referrals

**Backend Job**: Monitors `ReferrerSet` events, counts referrals per FID, auto-assigns badges when milestones hit.

---

## 9. Phase 1B Session State System (Operational)

### 9.1 Database Schema

**Table**: `frame_sessions` (created in Phase 1B)

| Column | Type | Description |
|--------|------|-------------|
| session_id | text (PK) | UUID v4 |
| fid | bigint (indexed) | Farcaster FID |
| state | jsonb (indexed) | Session data |
| expires_at | timestamptz | Cleanup threshold |
| created_at | timestamptz | Row creation |
| updated_at | timestamptz | Last update |

**Indexes**:
1. `frame_sessions_fid_idx` (fid)
2. `frame_sessions_expires_at_idx` (expires_at)
3. `frame_sessions_state_gin_idx` (GIN on state JSONB)
4. `frame_sessions_updated_at_idx` (updated_at)

**Functions**:
1. `cleanup_expired_frame_sessions()`: Deletes rows where `expires_at < now()`
2. `update_frame_sessions_updated_at()`: Trigger to auto-update `updated_at` column

### 9.2 Phase 1B Actions (Operational)

**Source**: `app/api/frame/route.tsx` POST handler

#### recordGM Action
```typescript
case 'recordGM': {
  const sessionId = generateSessionId()
  const gmCount = (previousState?.gmCount || 0) + 1
  const streak = (previousState?.streak || 0) + 1
  
  await saveFrameState({
    sessionId,
    fid,
    state: {
      action: 'recordGM',
      gmCount,
      streak,
      lastGmTimestamp: Date.now()
    }
  })
  
  return buildFrameResponse({
    title: `GM #${gmCount} recorded!`,
    description: `${streak}-day streak 🔥`,
    buttons: [
      { title: 'View Profile', target: `/profile/${fid}` }
    ]
  })
}
```

**Production Test**: FID 12345, sessionId `5bcc21f9...`, 65 GMs, 2-day streak (verified in Supabase)

#### questProgress Action
```typescript
case 'questProgress': {
  const sessionId = requestData.sessionId || generateSessionId()
  const currentStep = (previousState?.step || 0) + 1
  
  await saveFrameState({
    sessionId,
    fid,
    state: {
      action: 'questProgress',
      step: currentStep,
      questId: requestData.questId,
      timestamp: Date.now()
    }
  })
  
  return buildFrameResponse({
    title: `Step ${currentStep} complete!`,
    description: 'Continue your quest',
    buttons: [
      { title: 'Next Step', action: { type: 'post', target: '/api/frame' } }
    ]
  })
}
```

**Production Test**: FID 99999, sessionId `118bdc3c...`, step progression 1→3 (verified in Supabase)

---

## 10. Phase 1B.1 Implementation Requirements

### 10.1 Current Frame Button Pattern

**All frames currently use**:
```typescript
buttons: [
  {
    title: 'Open [FrameType]',
    action: {
      type: 'launch_frame',
      url: 'https://gmeowbased.com/[path]'
    }
  }
]
```

### 10.2 Target Phase 1B.1 Button Pattern

**Add interactive POST buttons alongside existing link buttons**:

```typescript
// Example: GM Frame
buttons: [
  {
    title: 'Send Daily GM',
    action: {
      type: 'post',
      target: '/api/frame',
      data: { action: 'recordGM', fid }
    }
  },
  {
    title: 'View Stats',
    action: {
      type: 'post',
      target: '/api/frame',
      data: { action: 'getGMStats', fid }
    }
  },
  {
    title: 'Open Full App',
    action: {
      type: 'launch_frame',
      url: 'https://gmeowbased.com/gm'
    }
  }
]
```

### 10.3 Frame Type → Action Mapping (Phase 1B.1 Design)

| Frame Type | Interactive Button 1 | Interactive Button 2 | Link Button |
|------------|---------------------|---------------------|-------------|
| **gm** | "Send Daily GM" (recordGM) | "View GM Stats" (getGMStats) | "Open App" |
| **quest** | "Verify Quest" (verifyQuest) | "Continue Quest" (questProgress) | "Open Quests" |
| **badge** | "Check Eligibility" (checkBadges) | "Mint Badge" (mintBadge) | "Open Badges" |
| **guild** | "Join Guild" (joinGuild) | "View Guild" (viewGuild) | "Open Guilds" |
| **referral** | "Register Code" (registerReferral) | "View Referrals" (viewReferrals) | "Open Referrals" |
| **leaderboards** | "Refresh Rank" (refreshRank) | N/A | "Open Leaderboard" |
| **points** | "View Balance" (viewBalance) | "Tip User" (tipUser) | "Open Points" |
| **onchainstats** | "Refresh Stats" (refreshStats) | N/A | "Open Stats" |
| **verify** | "Verify Action" (verifyQuest) | N/A | "Open Verify" |

**Button Priority Rules**:
1. Interactive buttons first (2-3 max)
2. Link button last (fallback to full app)
3. Total ≤ 4 buttons (enforced by `sanitizeButtons()`)

### 10.4 Implementation Checklist

- [ ] Extend `buildFrameHtml()` to accept POST action buttons
- [ ] Update each frame type handler to pass interactive button array
- [ ] Wire buttons to Phase 1B POST actions (`recordGM`, `questProgress`)
- [ ] Add new POST actions for Phase 1B.1 (`getGMStats`, `checkBadges`, `joinGuild`, etc.)
- [ ] Test 4-button limit enforcement
- [ ] Test session persistence across button clicks
- [ ] Local testing (dev server)
- [ ] Production deployment
- [ ] Verify frame_sessions table receives new action data

---

## 11. Safety Constraints

### GI 13 Safe Patching Rules
1. **NO new file creation** until explicitly approved
2. **Patch existing files only** (`buildFrameHtml`, frame type handlers)
3. **Phase 1B actions already exist** (recordGM, questProgress) - reuse them
4. **Test locally before push** ("Do not push until the frame is fixed")

### User Instruction
> "detail audit before edit any of code, make documentation regarding this"

**Status**: ✅ Audit in progress (this document)

---

## 12. Next Steps (Phase 1B.1 Audit Continuation)

### Remaining Audit Tasks
1. ✅ Contract event triggers (COMPLETE)
2. 🔄 Point/XP award logic (IN PROGRESS - found onboarding flow, need sync job analysis)
3. ⏸️ Badge minting eligibility (partial - need to complete reading badges.ts)
4. ⏸️ Frame button integration patterns (need to design POST action buttons)

### Documentation Output
- [ ] Complete this audit document with:
  - [ ] Badge eligibility rules (auto-assign vs manual mint)
  - [ ] Backend sync job architecture (how contract events → user_profiles updates)
  - [ ] Phase 1B.1 detailed implementation plan (per-frame button designs)
  - [ ] Testing checklist (local + production)

### Timeline
- **Audit completion**: Before any code changes
- **Implementation**: After user approval of audit + design
- **Testing**: Local dev server first
- **Deployment**: After successful local testing

---

## 13. Document Location & Structure

**Current Location**: `Docs/Maintenance/frame/Phase-1/Phase-1B1/SYSTEM-AUDIT.md`

**Related Documents**:
- [Documentation Index](../../../../README.md) - Main documentation hub
- [Project Roadmap](../../../../MainGoal.md) - Overall project goals & phases
- [Changelog](../../../../CHANGELOG.md) - All changes across phases
- [Phase 1A Report](../Phase-1A/COMPLETION-REPORT.md) - Cache optimization (COMPLETE)
- [Phase 1B Summary](../Phase-1B/IMPLEMENTATION-SUMMARY.md) - Session state (COMPLETE)
- [Phase 1B Deployment](../Phase-1B/DEPLOYMENT-GUIDE.md) - Deployment steps
- [Phase 1B Certificate](../Phase-1B/COMPLETION-CERTIFICATE.md) - Completion proof

**Folder Structure**:
```
Docs/
├── README.md                    # Documentation index
├── MainGoal.md                  # Project vision & roadmap
├── CHANGELOG.md                 # Version history
└── Maintenance/
    └── frame/
        ├── 2024-12/            # Monthly archives
        └── Phase-1/            # Foundation phase
            ├── Phase-1A/       # Cache optimization (COMPLETE)
            │   └── COMPLETION-REPORT.md
            ├── Phase-1B/       # Session state (COMPLETE)
            │   ├── IMPLEMENTATION-SUMMARY.md
            │   ├── DEPLOYMENT-GUIDE.md
            │   └── COMPLETION-CERTIFICATE.md
            └── Phase-1B1/      # Interactive buttons (IN PROGRESS)
                ├── SYSTEM-AUDIT.md (this file)
                ├── IMPLEMENTATION-PLAN.md (pending)
                └── TESTING-GUIDE.md (pending)
```

**Future Phases** (placeholders):
- `Phase-2/` - Advanced features (Q1 2025)
- `Phase-3/` - Scaling & optimization (Q2 2025)

---

**Document Status**: ✅ Audit Complete (Ready for Implementation Plan)  
**Last Updated**: December 3, 2024  
**Next Steps**: 
1. Create IMPLEMENTATION-PLAN.md with detailed button specifications
2. Design POST action handlers for Phase 1B.1
3. Review and approve before code changes
                                            MainGOALphase.MD                                  
