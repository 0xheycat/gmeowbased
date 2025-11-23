# Phase 1F: Comprehensive Frame Improvement Plan
**Created:** November 23, 2025  
**Updated:** January 23, 2025 (Task 12 Complete ✅)  
**Status:** Layer 2 In Progress - Task 5/6/13 Remaining (64% Complete)  
**Previous Phase:** Phase 1E (POST button removal + onchainstats image fix)  
**Document Size:** 1830 lines (661 → 1166 → 1830 lines)  
**Commits:** `8665b72` (Layer 1), `9f061de`, `fc67af7` (Layer 2), `296d5ae` (Task 8), `39953b6` (Task 9), `6b5435c` (Task 10 ✅), `93089f8` (Task 11 ✅), `8cdd64d` (Task 12 ✅)

---

## Executive Summary

Phase 1F focuses on **consistency, completeness, and cleanup** across all 9 frame types. After fixing onchainstats frame with username display and improved layout, we expanded the audit to **3 layers**:

### Audit Scope:
- **Layer 1 (Functional):** Username gaps, layout issues, missing handlers (5 frames, 7 tasks, 24.5h)
- **Layer 2 (Infrastructure):** Design system, chain icons, XP integration, text composition (5 tasks, 20.5h)
- **Layer 3 (System Documentation):** Share button architecture, frame spec gaps, legacy cleanup (2 tasks, 5h)

### Impact Categories:
- 🔴 **CRITICAL**: Username display missing (social recognition), share button undocumented
- 🟡 **HIGH**: Layout improvements (flex appeal + readability), design system fragmentation
- 🟢 **MEDIUM**: Infrastructure gaps (chain icons, XP integration), frame spec compliance
- 🔵 **LOW**: Minor enhancements (polish, animations, text composition)

---

## 🔍 Complete Frame Audit Results

### Frame Types Analyzed:
1. ✅ **OnchainStats** - Fixed in Phase 1E (commit 7c5554d)
2. ❌ **GM** - Missing username, shows address/FID
3. ❌ **Quest** - Missing username in image
4. ❌ **Points** - Missing username, no dedicated image handler
5. ❌ **Badge** - Missing username display
6. ❌ **Leaderboard** - Not audited yet
7. ❌ **Guild** - Not audited yet
8. ❌ **Referral** - Not audited yet
9. ❌ **Verify** - Not audited yet

---

## 🔴 CRITICAL ISSUES

### Issue 1: Username Display Missing (5 frames)

**Frames Affected:** GM, Quest, Points, Badge, Verify

**Current State:**
```typescript
// GM Frame Image (line 341)
👤 {user ? shortenAddress(user) : `FID ${fid}`}
// Shows: "👤 0x7539...4130" or "👤 FID 18139"
// Should show: "@heycat"
```

**Root Cause:**
- Frame routes resolve username correctly via Neynar
- buildDynamicFrameImageUrl NOT passing `username` parameter
- Image routes NOT reading `username` parameter from URL

**Impact:**
- **Social Recognition:** Users can't flex with @username
- **Consistency:** OnchainStats shows @username, others show address
- **Engagement:** Generic address less shareable than @username

**Dependency Graph:**
```
Frame Route Handler
  ├─> Profile Resolution (Neynar API) ✅ Working
  ├─> buildDynamicFrameImageUrl() ❌ Missing username param
  └─> Frame Metadata ✅ Shows @username in description

Image Route Handler
  ├─> readParam(url, 'username') ❌ Not reading
  ├─> Identity Display ❌ Uses address/FID fallback
  └─> Layout Rendering ❌ No @username in card
```

**Fix Requirements:**
1. Update 5 frame routes to pass `username` + `displayName` in `extra` params
2. Update 5 image routes to read `username` + `displayName` params
3. Update 5 image layouts to prioritize `@username` over address
4. Test profile resolution for each frame type (address, FID, username input)

---

### Issue 2: Points Frame Has No Dedicated Image Handler

**Current State:**
- Points frame uses DEFAULT onchainstats fallback (line 1701 in image route)
- Shows generic "Onchain Stats" instead of "Points & XP"
- Missing level, XP bar, tier visualization

**Impact:**
- **Functionality:** Points data passed but not displayed properly
- **UX:** Confusing - users expect "Points" but see "Onchain Stats"
- **Branding:** Points system not visually distinct

**Fix Requirements:**
1. Create dedicated `if (type === 'points')` handler in image route
2. Design XP/Level card layout (similar to GM streak card)
3. Add visual XP progress bar
4. Display tier badge prominently
5. Test with real user points data

---

## 🟡 HIGH PRIORITY IMPROVEMENTS

### Issue 3: GM Frame Layout Outdated

**Current Problems:**
- Large wasted space: 180x180px icon (☀️)
- Small user identity box below icon
- Stats cramped in right column
- No visual hierarchy for streak milestones

**Comparison with OnchainStats:**
```
GM Frame (OLD)          OnchainStats (NEW)
┌─────────┬────┐       ┌──────────────────┐
│ ☀️      │Stat│       │   @username      │
│ 180x180│box │       ├────────┬─────────┤
│         │    │       │Primary │Reputation│
│ Address │    │       │Stats   │Scores    │
└─────────┴────┘       └────────┴─────────┘
Wasted: 60%            Wasted: 10%
```

**Recommended Layout:**
```
┌─────────────────────────────────┐
│ [GM]    @heycat        [Base]   │ ← Username prominent
├─────────────────────────────────┤
│        🔥 7-Day Streak          │ ← Large streak badge
├───────────────┬─────────────────┤
│ GM Stats      │ Milestones      │
│ Count: 22     │ ⚡ Week Warrior │
│ Streak: 7     │ 🎯 23 to Legend │
│ Rank: #142    │                 │
└───────────────┴─────────────────┘
```

---

### Issue 4: Quest Frame Missing User Context

**Current Problems:**
- No username display in image
- Quest stats only (no personal progress emphasis)
- Missing user's quest history context

**Recommended Additions:**
- User's completion rate for this chain
- User's total quests completed
- Username displayed prominently
- Personal achievement badges

---

### Issue 5: Badge Frame Missing Collection Stats

**Current Problems:**
- Only shows FID or address
- No visual badge showcase
- Missing collection completion percentage

**Recommended Additions:**
- @username display
- "X of Y badges earned" prominently
- Rarity tier of best badge
- Visual badge grid (if space allows)

---

---

## 🎨 LAYER 2 AUDIT: DESIGN SYSTEM & INFRASTRUCTURE

### Design System Audit (Fonts, Colors, Styles)

**Current State: FRAGMENTED**

#### Font System
**Primary Fonts:**
- `Gmeow` (custom font) - `/fonts/gmeow.woff2`, `/fonts/gmeow.otf`
- `Space Grotesk` - Used in PixelToast, buttons, UI elements
- `Space Mono` - Bold variant for code/numbers (700 weight)

**Frame Image Fonts (Satori):**
- Currently using default system fonts
- No custom font loading in image/route.tsx
- ⚠️ **MISSING**: Phase 1C web font loading NOT implemented yet

**Font Sizes (Frame Images):**
```typescript
// OnchainStats (lines 1365-1420):
identity: 20px (bold)
stat labels: 12px (uppercase)
stat values: 16-20px (bold)
power badge: 16px

// GM Frame (lines 350-380):
user identity: 14px
streak text: 16px (bold)
gm count: 18px (bold)

// ❌ INCONSISTENT: No standardized scale
```

**Recommended Font Scale:**
```typescript
const FRAME_FONTS = {
  identity: 20,     // @username header
  title: 18,        // Main stat/metric
  subtitle: 16,     // Secondary stat
  label: 12,        // Uppercase labels
  caption: 10,      // Footer/attribution
}
```

#### Color System
**Frame Palettes (route.tsx lines 1176-1182):**
```typescript
gm: { primary: '#7CFF7A', secondary: '#9bffaa', bg: '#052010', accent: '#ffd700' }
quest: { primary: '#61DFFF', secondary: '#8dddff', bg: '#052030', accent: '#ffb700' }
onchainstats: { primary: '#00d4ff', secondary: '#5ae4ff', bg: '#051520', accent: '#ffd700' }
points: { primary: '#ffb700', secondary: '#ffc840', bg: '#201405', accent: '#8e7cff' }
badge: { primary: '#a855f7', secondary: '#c084fc', bg: '#150520', accent: '#ffd700' }
leaderboards: { primary: '#ffd700', secondary: '#ffed4e', bg: '#201a05', accent: '#ff6b6b' }
guild: { primary: '#ff6b6b', secondary: '#ff8585', bg: '#200505', accent: '#ffd700' }
verify: { primary: '#7CFF7A', secondary: '#9bffaa', bg: '#052010', accent: '#5ad2ff' }
referral: { primary: '#ff6b9d', secondary: '#ff8db4', bg: '#200510', accent: '#ffd700' }
```

**Tailwind Colors (tailwind.config.ts):**
```typescript
'farcaster-purple': '#8B5CF6'
'base-blue': '#0052FF'
primary: 'hsl(var(--primary))' // 280deg, 80% saturation (purple)
```

**Tier Colors (badge system):**
```typescript
mythic: '#9C27FF' (purple)
legendary: '#FFD966' (gold)
epic: '#61DFFF' (blue)
rare: '#A18CFF' (light purple)
common: '#D3D7DC' (gray)
```

**❌ GAPS IDENTIFIED:**
1. No unified color constant file (colors scattered across 4+ files)
2. Frame palettes use hex, Tailwind uses HSL, tier colors use different hex
3. No dark mode variants for frames (always dark background)
4. Accent colors inconsistent (#ffd700 gold used everywhere)

**Recommended Consolidation:**
```typescript
// lib/frame-design-system.ts (NEW FILE)
export const FRAME_COLORS = {
  // Accent colors (shared)
  gold: '#ffd700',
  goldLight: '#ffed4e',
  
  // Frame type palettes
  gm: { primary: '#7CFF7A', secondary: '#9bffaa', bg: '#052010' },
  // ... etc
}

export const TIER_COLORS = {
  mythic: '#9C27FF',
  // ... matches badge system exactly
}
```

#### UI Element Patterns
**Frame Image Layout Patterns:**

**Pattern A: 2-Column Grid (OnchainStats - ✅ PROVEN)**
```
┌────────────────────────────┐
│      @username header      │
├──────────────┬─────────────┤
│ Primary Stats│  Reputation │
│ (left col)   │  (right col)│
└──────────────┴─────────────┘
```

**Pattern B: Icon + Stats (GM - ❌ OUTDATED)**
```
┌────────────┬───────┐
│            │ Stats │
│  180x180   │ Small │
│   Icon     │ Box   │
│            │       │
└────────────┴───────┘
60% wasted space
```

**Pattern C: Single Column (Quest, Badge - ⚠️ BASIC)**
```
┌────────────────┐
│   Quest Icon   │
│   Quest Name   │
│  Progress Bar  │
│    Rewards     │
└────────────────┘
```

**Recommended Standard:**
- **All frames use 2-column grid** (Pattern A)
- **Icon size max: 60x60px** (vs current 180x180px)
- **Header: @username + chain icon** (20px font)
- **Footer: "@gmeowbased • [context]"** (10px font)

---

### Chain Icon System Audit

**Current State: COMPLETE & FUNCTIONAL ✅**

**Infrastructure:**
- **Source:** `lib/chain-icons.ts` (40 lines)
- **Function:** `getChainIconUrl(chainKey)` - Returns GitHub-hosted SVG/PNG URLs
- **Usage:** `app/api/frame/route.tsx` (line 26, 145, 383)

**Supported Chains (15 total):**
```typescript
base: 'https://.../base.svg'          ✅ Primary chain
celo: 'https://.../celo.png'          ✅ Deployed contract
op/optimism: 'https://.../op.svg'     ✅ Deployed contract
ethereum: 'https://.../eth.svg'       ✅ Stats support
arbitrum: 'https://.../arbitrum.svg'  ✅ Stats support
avax: 'https://.../avax.svg'          ⚠️ Stats only (no contract)
berachain: 'https://.../berachain.svg' ⚠️ Upcoming
bnb: 'https://.../bnb.svg'            ⚠️ Stats only
fraxtal: 'https://.../fraxtal.svg'    ⚠️ Planned
katana: 'https://.../katana.svg'      ⚠️ Planned
soneium: 'https://.../soneium.png'    ⚠️ Planned
taiko: 'https://.../taiko.svg'        ⚠️ Planned
unichain: 'https://.../unichain.png'  ✅ Deployed contract
ink: 'https://.../ink.png'            ✅ Deployed contract
hyperevm: 'https://.../hyper.png'     ⚠️ Planned
```

**Component Usage:**
- `components/ChainSwitcher.tsx` - SVG icon generator (bg + label text)
- `components/Quest/QuestChainBadge.tsx` - Chain badge chip with icon
- `components/OnchainStats.tsx` - Chain config with 15 chains
- `components/Guild/GuildManagementPage.tsx` - ChainIcon component (18px)

**Frame Integration:**
```typescript
// app/api/frame/route.tsx (line 145, 383):
const chainIcon = getChainIconUrl(chainKey)
if (chainIcon) fcMeta[frameKey('chain_icon')] = chainIcon

// HTML overlay (line 1106):
${chainIconClean ? `<img class="overlay-chain-icon" src="${escapeHtml(chainIconClean)}" alt="${chainLabelEsc} icon" />` : ''}
```

**❌ GAPS IDENTIFIED:**
1. **Frame images NOT using chain icons** - Only HTML overlay has icons
2. **Image route doesn't read chainIcon param** - Passed but not displayed
3. **Missing icon rendering in 6 frame image handlers:**
   - GM (line 155-435): No chain icon display
   - Quest (line 939-1193): No chain icon
   - OnchainStats (line 1194-1460): ❌ Missing (only added username)
   - Points: No dedicated handler
   - Badge: No dedicated handler
   - Leaderboards (line 1632-1771): No chain icon

**Recommended Fix:**
```typescript
// Add to ALL frame image handlers:
const chainIconUrl = readParam(url, 'chainIcon', '')

// Render in header:
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  {chainIconUrl && (
    <img src={chainIconUrl} width={24} height={24} alt="chain" />
  )}
  <div>{chainName || 'Multichain'}</div>
</div>
```

---

### XP System Integration Audit

**Current State: PARTIALLY INTEGRATED**

**Core Infrastructure:**

**1. Level Calculation (`lib/rank.ts` - 150 lines)**
```typescript
LEVEL_XP_BASE = 300
LEVEL_XP_INCREMENT = 200

// Quadratic progression:
// Level 1: 0-300 XP
// Level 2: 300-500 XP (300 + 200)
// Level 3: 500-700 XP (300 + 400)
// Level N: BASE + INCREMENT * (N-1)

calculateLevelProgress(points): {
  level: number
  xpIntoLevel: number
  xpForLevel: number
  levelPercent: number
}
```

**2. Tier System (`lib/rank.ts` - 90 lines)**
```typescript
RANK_TIERS = [
  { name: 'Rookie', minPoints: 0, tagline: 'Just starting out' },
  { name: 'Apprentice', minPoints: 2000 },
  { name: 'Adventurer', minPoints: 5000 },
  { name: 'Veteran', minPoints: 10000 },
  { name: 'Champion', minPoints: 15000 },
  { name: 'Elite GM', minPoints: 25000 },
  { name: 'Mythic GM', minPoints: 50000, tagline: 'Legendary tier' }
]

getRankTierByPoints(points): RankTier
calculateRankProgress(points): RankProgress // Includes both level + tier
```

**3. Viral Bonus System (`lib/viral-bonus.ts` - 270 lines)**
```typescript
ENGAGEMENT_WEIGHTS = {
  RECAST: 10,  // Highest value
  REPLY: 5,    // Mid value
  LIKE: 1,     // Base value
}

VIRAL_TIERS = {
  mega_viral: { xp: 500, minScore: 1000, emoji: '🚀' },
  viral: { xp: 250, minScore: 500, emoji: '🔥' },
  popular: { xp: 100, minScore: 200, emoji: '⭐' },
  engaging: { xp: 50, minScore: 50, emoji: '💫' },
  active: { xp: 25, minScore: 5, emoji: '🌟' },
  none: { xp: 0, minScore: 0 }
}

calculateViralBonus(metrics: EngagementMetrics): { score, tier, xp, breakdown }
```

**4. UI Components:**
- `components/ProgressXP.tsx` (465 lines) - XP modal with progress bar
- `components/XPEventOverlay.tsx` (200 lines) - Wrapper for event-specific XP
- `components/profile/ProfileHeroStats.tsx` (80 lines) - Hero stats with level badge

**✅ WORKING INTEGRATIONS:**
1. **Profile Pages:** Level + tier displayed prominently
2. **GM Button:** XP modal after successful GM cast
3. **Quest Completion:** XP overlay with progress bar
4. **Viral Sharing:** Engagement-based XP bonuses tracked
5. **Leaderboard:** Total XP + tier sorting

**❌ GAPS IN FRAME INTEGRATION:**

**Points Frame (CRITICAL):**
- Frame route passes: `level`, `xp`, `xpMax`, `tier` (line 2250)
- ❌ No dedicated image handler (uses onchainstats fallback)
- ❌ No XP progress bar visualization
- ❌ No level badge rendering
- ❌ No tier display

**Quest Frame:**
- Quest has `points` + `xpReward` fields in database
- Frame shows reward amount but not "X XP" label
- ❌ No user's current level/tier context
- ❌ No "Complete to gain X XP toward Level Y" messaging

**GM Frame:**
- User has total XP + level calculated
- Frame shows GM count + streak only
- ❌ No "Earn X XP daily" messaging
- ❌ No level progress visualization

**OnchainStats Frame:**
- Shows all onchain metrics
- ❌ No XP/level display despite having user's total points
- ❌ Missing opportunity to flex "Level 42 Mythic GM"

**Recommended Additions:**

```typescript
// Points Frame Image (NEW HANDLER):
<div style={{ /* 2-column layout */ }}>
  <div style={{ /* Left: Level Badge */ }}>
    <div style={{ fontSize: 48 }}>Lvl {level}</div>
    <div>{tierName}</div>
  </div>
  <div style={{ /* Right: XP Progress */ }}>
    <div>XP: {xp} / {xpMax}</div>
    <div style={{ /* Progress bar */ width: `${(xp/xpMax)*100}%` }} />
    <div>{xpToNextLevel} XP to Level {level+1}</div>
  </div>
</div>

// Quest Frame (ADD XP CONTEXT):
<div style={{ /* Bottom section */ }}>
  ⚡ Complete for {quest.xpReward} XP
  Level {currentLevel} → {nextLevel} ({xpRemaining} XP away)
</div>

// GM Frame (ADD XP TEASER):
<div style={{ /* Footer */ }}>
  🎯 Earn {gmXpReward} XP daily • Level {level} {tierName}
</div>
```

---

### Text Composition Audit

**Current State: FUNCTIONAL BUT INCONSISTENT**

**Infrastructure:**

**1. Compose Text Generator (`app/api/frame/route.tsx` lines 961-992)**
```typescript
function getComposeText(frameType, context: { title, chain, username, streak, gmCount }): string {
  switch (frameType) {
    case 'gm':
      if (streak >= 30) return `🔥 ${streak}-day GM streak! Legendary dedication! Join the meow squad @gmeowbased`
      if (streak >= 7) return `⚡ ${streak}-day GM streak! Hot streak! Stack your daily ritual @gmeowbased`
      if (gmCount > 0) return `🌅 Just stacked my daily GM ritual! ${gmCount} total GMs! Join @gmeowbased`
      return '🌅 Just stacked my daily GM ritual! Join the meow squad @gmeowbased'
    
    case 'quest':
      return `⚔️ New quest unlocked${chain ? ` on ${chain}` : ''}! ${title || 'Check it out'} @gmeowbased`
    
    case 'leaderboards':
      return `🏆 Climbing the ranks${chain ? ` on ${chain}` : ''}! Check the leaderboard @gmeowbased`
    
    case 'badge':
      return `🎖️ New badge earned${username ? ` by @${username}` : ''}! View the collection @gmeowbased`
    
    case 'guild':
      return '🛡️ Guild quests are live! Rally your squad @gmeowbased'
    
    case 'referral':
      return '🎁 Join me on gmeowbased! Share quests, earn rewards together @gmeowbased'
    
    case 'points':
      return `💰 Check out ${username ? `@${username}'s` : 'my'} gmeowbased Points balance @gmeowbased`
    
    case 'onchainstats':
      return `📊 Flexing onchain stats${chain ? ` on ${chain}` : ''}! View my profile @gmeowbased`
    
    case 'verify':
      return '✅ Verify your quests and unlock rewards @gmeowbased'
    
    default:
      return '🎮 Explore quests, guilds, and onchain adventures @gmeowbased'
  }
}
```

**2. Warpcast Composer (`lib/share.ts` lines 146-193)**
```typescript
export function buildWarpcastComposerUrl(text: string, embed?: string): string {
  const params = new URLSearchParams()
  params.set('text', text)
  if (embed) params.append('embeds[]', embed)
  return `https://warpcast.com/~/compose?${params.toString()}`
}

export async function openWarpcastComposer(text, embed): Promise<'miniapp' | 'web' | 'noop'> {
  // 1. Try Farcaster Miniapp SDK (if in iframe)
  if (isMiniappContext()) {
    const sdk = await import('@farcaster/miniapp-sdk')
    await sdk.actions.composeCast({ text, embeds: [embed] })
    return 'miniapp'
  }
  
  // 2. Fallback to web composer
  const url = buildWarpcastComposerUrl(text, embed)
  window.open(url, '_blank')
  return 'web'
}
```

**3. Badge Share Text (`lib/frame-badge.ts` lines 55-85)**
```typescript
export function buildBadgeShareText(
  badge: UserBadge,
  username?: string,
  bestFriendUsernames?: string[]
): string {
  const tierEmoji = getTierEmoji(badge.tier)
  const badgeName = badge.metadata?.name || badge.badgeType
  const user = username ? `@${username}` : 'I'
  
  let text = `${tierEmoji} ${user} just earned the ${badgeName} badge (${badge.tier} tier) on @gmeowbased! 🎖️`
  
  // Viral tagging (if best friends provided)
  if (bestFriendUsernames?.length) {
    const tags = bestFriendUsernames.slice(0, 3).map(u => `@${u}`).join(' ')
    text += ` Check it out ${tags}!`
  }
  
  return text
}
```

**✅ WORKING PATTERNS:**
1. **Frame Meta Tags:** All 9 frames have `fc:frame:text` pre-filled composer text
2. **QuestCard Share:** Opens composer with quest-specific text (line 405-421)
3. **ContractGMButton:** Opens composer with GM streak text (line 215)
4. **Dashboard Share:** Points balance share text (line 1299)
5. **Badge Share:** Tiered share text with viral tagging

**❌ @GMEOWBASED ATTRIBUTION GAPS:**

**Consistent Usage (9/9 frame types):**
- ✅ All getComposeText() strings end with `@gmeowbased`
- ✅ Frame HTML overlays show "Powered by @gmeowbased" (route.tsx line 1365)
- ✅ Frame images show "@gmeowbased • [context]" footer (image/route.tsx 8 locations)

**Inconsistent Usage:**
```typescript
// ✅ CORRECT (9 instances):
"Join the meow squad @gmeowbased"
"View my profile @gmeowbased"
"@gmeowbased • Quest #123"

// ❌ INCONSISTENT (4 instances):
"via @gmeowbased" (app/profile/[fid]/badges/page.tsx line 234)
"— via @gmeowbased" (same file)
"on @gmeowbased" (components/share/ShareButton.tsx line 76)
"Powered by @gmeowbased" (route.tsx line 1365) // Different from frame images
```

**Recommended Standardization:**
1. **Frame Images Footer:** Always "@gmeowbased • [context]"
2. **Compose Text Ending:** Always "Join/Check/View [action] @gmeowbased"
3. **Share Buttons:** Always "on @gmeowbased" (not "via")
4. **HTML Overlays:** Match frame image footer exactly

**❌ MISSING DYNAMIC CONTEXT:**

**Current:** Static strings, no personalization beyond username
**Recommended:** Add achievement-based flex

```typescript
// Enhanced GM compose text:
function getComposeText(frameType, context) {
  if (frameType === 'gm') {
    const { streak, gmCount, level, tier } = context
    
    if (streak >= 30 && level >= 20) {
      return `🔥 ${streak}-day streak + Level ${level} ${tier}! Join the legends @gmeowbased`
    }
    if (tier === 'Mythic GM') {
      return `⚡ Mythic GM ${gmCount} total! Stack with me @gmeowbased`
    }
    // ... existing logic
  }
  // ... other frame types with level/tier context
}
```

**Text Composition Quality Checklist:**
- ✅ All frames have pre-filled text
- ✅ Emoji usage consistent (🔥⚡🌅⚔️🏆🎖️🛡️🎁💰📊✅)
- ✅ @gmeowbased mentioned in all composition strings
- ❌ No achievement-based flex (level, tier, milestones)
- ❌ No personalization beyond username (no best friend tagging except badges)
- ❌ No urgency/FOMO messaging ("Limited time quest!")
- ❌ No social proof ("Join 10K+ adventurers")

---

## 🟢 MEDIUM PRIORITY (Cleanup)

### Issue 6: Delete Deprecated POST Handler

**Location:** `app/api/frame/route.tsx` lines 2590-3620 (1030+ lines)

**Current State:** Commented out in Phase 1E

**Impact:**
- **Code Size:** 1030+ lines of dead code
- **Maintenance:** Confusing for future developers
- **Performance:** Slightly larger bundle (minimal)

**Removal Plan:**
```typescript
// DELETE ENTIRE SECTION:
/**
 * ==================================================================================
 * DEPRECATED: POST HANDLER (Phase 1E - November 2025)
 * ==================================================================================
 * ...1030 lines...
 */
```

**Testing Required:**
- Verify no references to POST handler functions
- Ensure all frames use link buttons only
- Test all 9 frame types after deletion

---

### Issue 7: Remove Unused Frame Utilities

**Files to Clean:**
```
app/api/frame/route.tsx
  ├─> buildContextualButtons() (commented, line 494)
  ├─> safeJson() (commented, line 500)
  ├─> toAbsoluteUrl() (commented, line 494)
  └─> toOptionalString() (commented, line 503)

types/
  ├─> QuestButtonPlan (commented, line 808)
  ├─> GuildButtonPlan (commented, line 824)
  ├─> ReferralButtonPlan (commented, line 836)
  ├─> PointsButtonPlan (commented, line 845)
  └─> LeaderboardButtonPlan (commented, line 854)
```

**Impact:** ~200 lines of commented code removal

---

### Issue 8: Consolidate Frame Metadata Logic

**Problem:** Duplicate `frameKey()` patterns across handlers

**Current State:**
```typescript
// Repeated in 9 frame handlers:
const fcMeta: Record<string, string> = {
  [frameKey('entity')]: 'gm',
  [frameKey('fid')]: String(fid),
  // ... 5-15 more keys per handler
}
```

**Proposed:** Extract to helper function
```typescript
function buildFrameMetadata(type: FrameType, params: FrameMetaParams): Record<string, string> {
  const meta: Record<string, string> = {
    [frameKey('entity')]: type,
    [frameKey('version')]: FRAME_VERSION,
  }
  // Conditional additions based on params
  return meta
}
```

**Impact:** ~150 lines reduced, better consistency

---

## 🔵 LOW PRIORITY (Polish)

### Issue 9: Add Automated Frame Testing

**Proposal:** Create Playwright tests for all frame types

```typescript
test('GM frame shows username', async ({ page }) => {
  await page.goto('/api/frame?type=gm&fid=18139')
  const meta = await page.locator('meta[property="og:image"]')
  const imageUrl = await meta.getAttribute('content')
  expect(imageUrl).toContain('username=heycat')
})
```

**Coverage Needed:**
- Image URL parameter validation
- Username resolution for address/FID/username inputs
- Profile fallback when Neynar unavailable
- Frame metadata completeness

---

### Issue 10: Performance Profiling

**Questions to Answer:**
- Which frame type is slowest?
- Are Neynar API calls cached properly?
- Can we parallelize profile + data queries?
- Is image generation optimized?

**Tools:**
- Vercel Analytics
- Custom trace logging (already in place)
- Lighthouse CI

---

## 📋 Phase 1F Task Breakdown

### Task 1: GM Frame Username Support 🔴
**Priority:** CRITICAL  
**Effort:** 2 hours  
**Dependencies:** None

**Steps:**
1. Update GM frame route (line 2514):
   ```typescript
   const imageUrl = fid ? buildDynamicFrameImageUrl({ 
     type: 'gm', 
     fid,
     extra: { 
       gmCount, 
       streak,
       username: profile?.username || undefined,
       displayName: profile?.displayName || undefined,
     } 
   }, origin) : defaultFrameImage
   ```

2. Update GM image route (line 155):
   ```typescript
   const username = readParam(url, 'username', '')
   const displayName = readParam(url, 'displayName', '')
   const identity = username 
     ? `@${username}` 
     : displayName 
       ? displayName 
       : user 
         ? shortenAddress(user) 
         : fid 
           ? `FID ${fid}` 
           : 'Anonymous'
   ```

3. Update GM image layout (line 341):
   ```typescript
   // Replace shortenAddress fallback with identity
   <div>{identity}</div>
   ```

4. Test:
   - `curl localhost:3001/api/frame?type=gm&fid=18139`
   - Verify `username=heycat` in image URL
   - Generate PNG and verify @heycat displays

**Success Criteria:**
- ✅ Image URL includes `username` parameter
- ✅ Image displays `@heycat` not address
- ✅ Streak badge still working
- ✅ No TypeScript errors

---

### Task 2: Quest Frame Username Support 🔴
**Priority:** CRITICAL  
**Effort:** 1.5 hours  
**Dependencies:** None

**Steps:**
1. Check if Quest frame resolves profile (line 1491)
2. Add username to buildDynamicFrameImageUrl (line 1653)
3. Update Quest image route to read username (line 939)
4. Update Quest image layout to show @username

**Testing:**
- Quest with address input
- Quest with FID input
- Quest with username input
- Quest without user context

---

### Task 3: Points Frame Dedicated Handler 🔴
**Priority:** CRITICAL  
**Effort:** 4 hours  
**Dependencies:** None

**Steps:**
1. Create new `if (type === 'points')` handler in image route
2. Design XP/Level card layout:
   ```
   ┌─────────────────────────┐
   │ [@username]    [Tier]   │
   │                         │
   │      Level 5            │
   │   ▓▓▓▓▓▓▓░░░ 65%        │ ← XP bar
   │   1,300 / 2,000 XP      │
   │                         │
   │ Total: 5,420 pts        │
   │ Available: 1,200 pts    │
   └─────────────────────────┘
   ```
3. Implement XP progress bar visualization
4. Add tier badge (gold/silver/bronze)
5. Test with real user data

**Success Criteria:**
- ✅ Shows "Points & XP" not "Onchain Stats"
- ✅ XP bar visualizes progress
- ✅ Username displayed
- ✅ Tier badge prominent

---

### Task 4: Badge Frame Username Support 🔴
**Priority:** CRITICAL  
**Effort:** 2 hours  
**Dependencies:** None

**Steps:**
1. Update Badge frame route to resolve profile
2. Pass username to buildDynamicFrameImageUrl (line 2392)
3. Create Badge image handler (currently missing)
4. Design collector card layout

---

### Task 5: GM Frame Layout Redesign 🟡
**Priority:** HIGH  
**Effort:** 3 hours  
**Dependencies:** Task 1

**Layout Goals:**
- Remove 180x180px icon waste
- Prominent username header
- Larger streak display
- Show milestone progress
- 2-column layout like onchainstats

---

### Task 6: Delete POST Handler 🟢
**Priority:** MEDIUM  
**Effort:** 1 hour  
**Dependencies:** All frames tested

**Steps:**
1. Search for any remaining POST handler references
2. Delete lines 2590-3620 in route.tsx
3. Delete commented helper functions
4. Delete commented type definitions
5. Run full test suite
6. Verify all 9 frames still work

---

### Task 7: Verify/Leaderboard/Guild/Referral Audit 🟡
**Priority:** HIGH  
**Effort:** 6 hours  
**Dependencies:** None

**Steps:**
1. Audit each frame type systematically
2. Check username support
3. Review layout effectiveness
4. Document findings
5. Create sub-tasks for fixes

---

### Task 8: Design System Consolidation 🟡
**Priority:** HIGH (Layer 2)  
**Effort:** 4 hours  
**Dependencies:** Task 1-4 (username support complete)

**Steps:**
1. Create `lib/frame-design-system.ts`:
   ```typescript
   export const FRAME_FONTS = {
     identity: 20,    // @username header
     title: 18,       // Main stat/metric
     subtitle: 16,    // Secondary stat
     label: 12,       // Uppercase labels
     caption: 10,     // Footer/attribution
   }
   
   export const FRAME_COLORS = {
     // Unified frame palettes (from route.tsx lines 1176-1182)
     gm: { primary: '#7CFF7A', secondary: '#9bffaa', bg: '#052010', accent: '#ffd700' },
     // ... all 9 frame types
     
     // Tier colors (matches badge system)
     tiers: {
       mythic: '#9C27FF',
       legendary: '#FFD966',
       epic: '#61DFFF',
       rare: '#A18CFF',
       common: '#D3D7DC',
     }
   }
   ```

2. Update all frame image handlers to use `FRAME_FONTS`:
   ```typescript
   import { FRAME_FONTS, FRAME_COLORS } from '@/lib/frame-design-system'
   
   // Replace hardcoded fontSize values:
   <div style={{ fontSize: FRAME_FONTS.identity }}>@{username}</div>
   <div style={{ fontSize: FRAME_FONTS.label }}>STREAK</div>
   <div style={{ fontSize: FRAME_FONTS.title }}>{streak}</div>
   ```

3. Standardize footer attribution:
   ```typescript
   // All frames should use:
   <div style={{ fontSize: FRAME_FONTS.caption }}>
     @gmeowbased • {contextLabel}
   </div>
   ```

4. Test consistency across all 9 frames

**Success Criteria:**
- ✅ Single source of truth for fonts and colors
- ✅ No hardcoded font sizes in image handlers
- ✅ All frames use same identity header size (20px)
- ✅ Consistent label/value font hierarchy

---

### Task 9: Chain Icon Integration 🟡
**Priority:** HIGH (Layer 2)  
**Effort:** 3 hours  
**Dependencies:** None (parallel with username support)

**Steps:**
1. Update all 9 frame image handlers to read `chainIcon` param:
   ```typescript
   const chainIconUrl = readParam(url, 'chainIcon', '')
   const chainName = readParam(url, 'chainName', readParam(url, 'chain', 'Base'))
   ```

2. Add header icon rendering pattern:
   ```typescript
   <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
     {chainIconUrl && (
       <img src={chainIconUrl} width={24} height={24} alt="chain" />
     )}
     <div style={{ fontSize: FRAME_FONTS.label }}>{chainName}</div>
   </div>
   ```

3. Update frames to pass chainIcon in buildDynamicFrameImageUrl:
   ```typescript
   const imageUrl = buildDynamicFrameImageUrl({
     type: 'gm',
     fid,
     chain: chainKey,
     extra: {
       chainIcon: getChainIconUrl(chainKey),
       chainName: getChainDisplayName(chainKey),
       // ... other params
     }
   }, origin)
   ```

4. Test with all 5 supported chains (base, celo, op, unichain, ink)

**Frames Affected:**
- GM (multi-chain support needed)
- Quest (chain-specific quests)
- OnchainStats (shows chain stats)
- Leaderboard (chain-specific rankings)
- Guild (multi-chain guilds)

**Success Criteria:**
- ✅ Chain icons visible in frame headers
- ✅ Icons match 24x24px standard size
- ✅ All 5 deployed chains tested
- ✅ Fallback handles missing icon gracefully

---

### Task 10: XP System Frame Integration ✅
**Priority:** HIGH (Layer 2)  
**Effort:** 5 hours (completed in 3 hours)  
**Status:** COMPLETE (commit 6b5435c)  
**Dependencies:** Task 3 (Points frame handler)  
**Completed:** November 23, 2025

**Frames to Update:**

**10.1: Points Frame XP Progress Bar (2 hours)**
```typescript
// Already in Task 3, ensure includes:
const xpPercent = (xp / xpMax) * 100

// Progress bar visualization:
<div style={{ width: '100%', height: 12, background: '#1a1a2e', borderRadius: 6 }}>
  <div style={{ 
    width: `${xpPercent}%`, 
    height: '100%', 
    background: 'linear-gradient(90deg, #ffd700, #ffed4e)',
    borderRadius: 6,
  }} />
</div>
<div style={{ fontSize: FRAME_FONTS.subtitle }}>
  {xp.toLocaleString()} / {xpMax.toLocaleString()} XP
</div>
```

**10.2: Quest Frame XP Context (1.5 hours)**
```typescript
// Add to Quest image handler:
const xpReward = readParam(url, 'xpReward', '0')
const userLevel = readParam(url, 'userLevel', '1')
const userTier = readParam(url, 'userTier', 'Adventurer')

// Footer with XP teaser:
<div style={{ fontSize: FRAME_FONTS.caption }}>
  ⚡ Complete for +{xpReward} XP • Level {userLevel} {userTier}
</div>

// Update Quest route to pass user context:
const userProgress = await getUserProgress(fid) // New helper
extra: {
  xpReward: quest.xpReward,
  userLevel: userProgress.level,
  userTier: userProgress.tierName,
}
```

**10.3: GM Frame XP Teaser (1 hour)**
```typescript
// Add daily XP earnings context:
const dailyXpReward = 10 // Base GM XP
const userLevel = readParam(url, 'level', '1')
const userTier = readParam(url, 'tier', 'Adventurer')

// Footer:
<div style={{ fontSize: FRAME_FONTS.caption }}>
  🎯 Earn +{dailyXpReward} XP daily • Lvl {userLevel} {userTier}
</div>
```

**10.4: OnchainStats XP Flex (0.5 hours)**
```typescript
// Add level badge to header:
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <div style={{ fontSize: FRAME_FONTS.identity }}>@{username}</div>
  <div style={{ 
    fontSize: FRAME_FONTS.label, 
    padding: '4px 8px', 
    background: '#ffd700',
    color: '#000',
    borderRadius: 4,
  }}>
    LVL {level}
  </div>
</div>
```

**Success Criteria:**
- ✅ Points frame shows XP progress bar
- ✅ Quest frame shows XP reward + user level
- ✅ GM frame mentions daily XP earning
- ✅ OnchainStats shows level badge
- ✅ All XP values formatted with commas

---

### Task 11: Text Composition Enhancements ✅ COMPLETE
**Priority:** MEDIUM (Layer 2)  
**Effort:** 3 hours (Actual: 2 hours - Audit 30min, Implementation 60min, Testing 30min)  
**Dependencies:** Task 1-4 (username support), Task 10 (XP integration)  
**Status:** ✅ COMPLETE  
**Commit:** 93089f8  
**Documentation:** TASK-11-COMPLETE.md

**11.1: Achievement-Based Compose Text ✅ COMPLETE**
- Enhanced getComposeText with 6 new parameters (level, tier, xp, badgeCount, progress, reward)
- Added helper functions: formatXpForShare (K/M notation), getChainEmoji (9 chains)
- Implemented 23 achievement tier patterns across 9 frame types:
  - GM Frame: 6 tiers (elite/mythic/great/good/high count/default)
  - Quest Frame: 3 tiers (high progress/with reward/with chain)
  - Badge Frame: 4 tiers (15+/10+/5+/with XP)
  - Points Frame: 4 tiers (elite/high level/milestone/with level)
  - OnchainStats: 2 tiers (with level/with chain)
  - Leaderboards: Chain emoji support
- Updated buildFrameHtml signature with 6 new parameters
- Updated 4 frame route calls (Points, GM, Badge, Quest)

**11.2: Character Limit Validation ✅ COMPLETE**
- All compose text messages <250 characters (max 72 chars)
- Test suite: 6/6 patterns pass
- Helper functions validated: formatXpForShare, getChainEmoji
- TypeScript errors: 0

**11.3: Attribution Standardization ✅ COMPLETE**
- All compose text ends with "@gmeowbased"
- Chain emoji integration: 🔵 Base, ⟠ Ethereum, 🔴 Optimism, etc.
- Time-based greetings maintained (GM frame: morning/afternoon/evening/night)

**Success Criteria:**
- ✅ Compose text mentions level/tier for high achievers (23 patterns)
- ✅ All messages <250 characters (max 72 chars)
- ✅ Helper functions working (formatXpForShare, getChainEmoji)
- ✅ Test suite passing (6/6 tests)
- ✅ TypeScript compilation (0 errors)
- ✅ Achievement flexing integrated (XP, level, tier, badges)

**Examples:**
- GM Elite: "🌅 GM! 🔥 35-day streak + Lvl 23 Mythic GM! Unstoppable @gmeowbased" (67 chars)
- Quest High Progress: "⚔️ Almost done with 'Daily GM'! 85% complete • +50 XP 🔵 @gmeowbased" (68 chars)
- Badge Hunter: "🏆 15 badges collected! +2,500 total XP earned! Badge hunter @gmeowbased" (72 chars)
- Points Elite: "🎯 Mythic GM status! 10.5K XP earned • Elite player @gmeowbased" (63 chars)

---

### Task 12: Share System Documentation ✅ COMPLETE
**Priority:** LOW (Layer 2)  
**Effort:** 1 hour (Actual: 45 minutes)  
**Dependencies:** Task 11 (Compose Text Enhancements)  
**Status:** ✅ COMPLETE  
**Commit:** 8cdd64d  
**Documentation:** SHARE-SYSTEM.md (76KB, 1000+ lines)

**12.1: Architecture Documentation ✅ COMPLETE**
- Documented getComposeText function (12 parameters)
- Documented buildFrameHtml integration points
- Documented frame route handler patterns
- Code examples for all 9 frame types

**12.2: Achievement Tier System ✅ COMPLETE**
- 23 achievement tier patterns documented:
  - GM Frame: 6 tiers with code examples
  - Quest Frame: 3 tiers with code examples
  - Badge Frame: 4 tiers with code examples
  - Points Frame: 4 tiers with code examples
  - OnchainStats: 2 tiers with code examples
  - Leaderboards: Chain emoji integration
  - Guild/Referral/Verify: Static text patterns

**12.3: Helper Functions Documentation ✅ COMPLETE**
- formatXpForShare: K/M notation implementation
  - Examples: 150, 1.5K, 10.5K, 1.3M
  - Rationale: Character savings, readability
- getChainEmoji: 9 chain emoji mappings
  - Supported chains: Base, Ethereum, Optimism, Arbitrum, Polygon, Avalanche, Celo, BNB
  - Fallback: 🌐 for unknown chains

**12.4: Development Guide ✅ COMPLETE**
- Step-by-step guide for adding new frame types (6 steps)
- Best practices: character limits, tier design, attribution, emoji usage
- Character limits analysis: all frames <250 chars (max 72)
- Testing guidelines: automated tests, manual testing, regression testing
- Maintenance & update process (8 steps)

**Success Criteria:**
- ✅ All 23 patterns documented with code examples
- ✅ Helper functions explained with rationale
- ✅ Adding new frame types guide created
- ✅ Best practices section comprehensive
- ✅ Testing guidelines included
- ✅ Character limits validated (all <250 chars)

**Output:**
- SHARE-SYSTEM.md: 76KB, 1000+ lines
- Location: Docs/Maintenance/frame/Phase-1/Phase-1F/
- Sections: 8 major (Architecture, Tiers, Helpers, Guide, Practices, Limits, Testing, Maintenance)

---

### Task 13: Multichain Share System 🟢

## 🎯 Phase 1F Success Metrics

### Layer 1: Functional Completeness
- ✅ All 9 frames show @username (not address/FID)
- ✅ All frames have dedicated image handlers (no fallbacks)
- ✅ All layouts follow 2-column Yu-Gi-Oh! card design
- ✅ POST handler deleted (1030+ lines removed)
- ✅ All commented code removed (~200 lines)
- ✅ Username priority: @username > displayName > address > FID > Anonymous
- ✅ Profile resolution working for all input types (address, FID, username)

### Layer 2: Design System & Infrastructure
- ✅ Unified design system (`lib/frame-design-system.ts` created)
- ✅ All frames use standardized font scale (FRAME_FONTS)
- ✅ All frames use consolidated color palette (FRAME_COLORS)
- ✅ Chain icons visible in 5 frames (GM, Quest, OnchainStats, Leaderboard, Guild)
- ✅ XP system integrated in 4 frames (Points, Quest, GM, OnchainStats)
- ✅ XP progress bars functional (Points frame)
- ✅ @gmeowbased attribution consistent across all frames
- ✅ Compose text uses achievement-based personalization
- ✅ All frame footers follow standard pattern: "@gmeowbased • [context]"

### Quality Metrics:
- **Consistency:** Same identity display pattern across all 9 frames
- **Completeness:** No missing stats, icons, or XP context
- **Performance:** Profile resolution < 500ms (avg)
- **Maintainability:** Code reduced by 1200+ lines, single source of truth for design
- **UX:** Every frame is "flex-worthy" with username, icons, XP
- **Accessibility:** Proper fallbacks for missing data (graceful degradation)

### Testing Criteria:
- ✅ All 9 frames tested on localhost
- ✅ All 9 frames tested on production (Vercel)
- ✅ All 9 frames tested with Farcaster proxy
- ✅ Profile resolution tested for all input types (3 per frame = 27 tests)
- ✅ Chain icon rendering tested for 5 chains (5 frames × 5 chains = 25 tests)
- ✅ XP calculations validated (Points, Quest, GM frames)
- ✅ Compose text tested for all 9 frame types
- ✅ Zero TypeScript errors
- ✅ Vercel build passes with 0 warnings
- ✅ No console errors in browser

### Visual Consistency Checklist:
- ✅ All identity headers: 20px bold font
- ✅ All stat titles: 18px bold font
- ✅ All labels: 12px uppercase
- ✅ All footers: 10px "@gmeowbased • [context]"
- ✅ All chain icons: 24x24px
- ✅ All XP bars: Same gradient (gold)
- ✅ All tier badges: Same color scheme
- ✅ All layouts: 2-column grid (600x400px canvas)

---

## 📊 Effort Estimation

### Total Effort: ~45 hours (UPDATED)

**By Priority:**
- 🔴 CRITICAL (5 tasks): 13.5 hours (Layer 1 - Username Display)
  - Task 1: GM Frame - 2h
  - Task 2: Quest Frame - 1.5h
  - Task 3: Points Frame - 4h
  - Task 4: Badge Frame - 2h
  - Task 5: Verify Frame - 2h (included in Task 7)
  
- 🟡 HIGH (6 tasks): 21 hours (Layer 1 + Layer 2)
  - Task 5: GM Layout Redesign - 3h (Layer 1)
  - Task 7: Verify/Leaderboard/Guild/Referral Audit - 6h (Layer 1)
  - Task 8: Design System Consolidation - 4h (Layer 2)
  - Task 9: Chain Icon Integration - 3h (Layer 2)
  - Task 10: XP System Integration - 5h (Layer 2)
  
- 🟢 MEDIUM (3 tasks): 5 hours
  - Task 6: Delete POST Handler - 1h
  - Task 11: Text Composition Enhancements - 3h (Layer 2)
  - Issue 7: Remove Unused Utilities - 1h
  
- 🔵 LOW (1 task): 5.5 hours
  - Task 12: Frame Testing Suite - 8h (expanded)
  - Issue 9: Performance Profiling - Removed (use existing analytics)

**By Layer:**
- **Layer 1 (Functional Fixes):** 24.5 hours
  - Username display (5 frames): 13.5h
  - Layout improvements: 9h
  - Code cleanup: 2h
  
- **Layer 2 (Design System + Infrastructure):** 20.5 hours
  - Design system consolidation: 4h
  - Chain icon integration: 3h
  - XP system integration: 5h
  - Text composition: 3h
  - Comprehensive testing: 8h

**By Category:**
- Username Support: 13.5 hours (5 frames)
- Layout Improvements: 12 hours (3 frames + design system)
- Infrastructure (Chains + XP): 8 hours
- Text & Attribution: 3 hours
- Code Cleanup: 3 hours
- Testing/Polish: 8 hours

**Recommended Approach:**
1. **Week 1 (24h):** Layer 1 Critical - Username support for all 5 frames
   - Days 1-2: Tasks 1-4 (GM, Quest, Points, Badge username)
   - Days 3-4: Task 7 (Verify/Leaderboard/Guild/Referral audit)
   - Day 5: Task 5 (GM layout redesign)

2. **Week 2 (16h):** Layer 2 High Priority - Design system + Infrastructure
   - Days 1-2: Task 8 (Design system consolidation)
   - Days 3-4: Tasks 9-10 (Chain icons + XP integration)
   
3. **Week 3 (5h):** Cleanup + Polish
   - Day 1: Task 6 (Delete POST handler)
   - Day 2: Task 11 (Text composition enhancements)
   - Days 3-5: Task 12 (Testing suite - can span longer)

**Parallel Work Opportunities:**
- Task 9 (Chain icons) can run parallel with Tasks 1-4 (username)
- Task 11 (Text) can run parallel with Task 10 (XP)
- Task 6 (Cleanup) can happen anytime after Layer 1 complete

---

## 🔗 Dependencies & Risks

### External Dependencies:
- ✅ Neynar API (profile resolution) - Working
- ✅ Supabase (frame data) - Working
- ✅ Vercel (deployment) - Working

### Internal Dependencies:
- `lib/share.ts` - buildDynamicFrameImageUrl() ✅
- `lib/neynar.ts` - Profile resolution ✅
- `app/api/frame/image/route.tsx` - Image generation ✅

### Risks:
1. **Profile Resolution Failures:**
   - Mitigation: Proper fallbacks (address → FID → "Anonymous")
   - Already handled in onchainstats

2. **Image Generation Complexity:**
   - Mitigation: Reuse onchainstats layout patterns
   - Tested and working

3. **Breaking Changes:**
   - Mitigation: Test each frame after changes
   - Keep Vercel deployment preview links

4. **Scope Creep:**
   - Mitigation: Stick to documented tasks
   - Save enhancements for Phase 1G

---

## 📝 Implementation Notes

### Best Practices:
1. **Test locally first:** Use `localhost:3001` for all testing
2. **Commit atomically:** One task = one commit
3. **Update this document:** Mark completed tasks
4. **Document breaking changes:** Update CHANGELOG.md
5. **Verify production:** Wait 4-5 min for Vercel, test with Farcaster proxy

### Code Patterns to Follow:

**Username Resolution (Frame Route):**
```typescript
// 1. Resolve profile from address/FID/username
const profile = await resolveUserProfile(userParam, fid)

// 2. Pass to image URL
const imageUrl = buildDynamicFrameImageUrl({
  type: 'frametype',
  fid,
  extra: {
    username: profile?.username || undefined,
    displayName: profile?.displayName || undefined,
    // ... other params
  }
}, origin)
```

**Username Display (Image Route):**
```typescript
// 1. Read params
const username = readParam(url, 'username', '')
const displayName = readParam(url, 'displayName', '')
const address = readParam(url, 'user', user)

// 2. Priority fallback
const identity = username 
  ? `@${username}` 
  : displayName 
    ? displayName 
    : address 
      ? shortenAddress(address) 
      : fid 
        ? `FID ${fid}` 
        : 'Anonymous'

// 3. Display prominently
<div style={{ fontSize: 20, fontWeight: 900 }}>
  {identity}
</div>
```

**Layout Pattern (2-Column Yu-Gi-Oh! Card):**
```typescript
<div style={{ display: 'flex', gap: 12 }}>
  {/* Left Column - Primary Data */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    {/* Large stats with labels */}
  </div>
  
  {/* Right Column - Secondary/Reputation */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    {/* Scores, badges, milestones */}
  </div>
</div>
```

---

## 🚀 Next Steps

### Immediate Actions:
1. ✅ Create this planning document
2. ⏳ Review and approve Phase 1F scope
3. ⏳ Start Task 1: GM Frame Username Support
4. ⏳ Begin systematic frame-by-frame fixes

### Phase 1F Kickoff Checklist:
- [ ] Planning document reviewed
- [ ] Effort estimation approved
- [ ] Testing strategy defined
- [ ] Local environment ready
- [ ] Backup of current working state
- [ ] Task 1 implementation started

---

## 🚨 Layer 4 Audit: User-Reported Critical Issues (CRITICAL - 6 hours)

**Status:** 95% approved by @heycat and team, 5% remaining issues identified  
**Priority:** CRITICAL - These are blocking user engagement and frame sharing  
**Impact:** HIGH - Users cannot flex individual badges, GM dashboard broken

---

### 15: Badge Page Frame Trigger Logic (CRITICAL - 3 hours)

**Issue Reported:** Badge page only triggers **Signal Luminary** frame share, not all badges individually

**Current State (app/profile/[fid]/badges/page.tsx:208-237):**
```typescript
// ❌ PROBLEM: Only shares the first badge (badges[0])
<button onClick={() => {
  const latestBadge = badges[0]  // ← HARDCODED: Always Signal Luminary
  const shareUrl = `https://gmeowhq.art/api/frame/badge?fid=${fid}&badgeId=${latestBadge.badgeId}`
  const shareText = `Just earned the ${latestBadge.metadata?.name || latestBadge.badgeType} badge! 🎮✨\n\n— via @gmeowbased`
  
  const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`
  window.open(warpcastUrl, '_blank', 'noopener,noreferrer')
}}>
  Share on Warpcast
</button>
```

**Root Causes:**
1. **Single Share Button:** Only one share button for entire collection (not per-badge)
2. **Hardcoded Selection:** Always uses `badges[0]` (Signal Luminary if it's first)
3. **No Badge Click Handler:** Individual badges in `BadgeInventory` are not clickable
4. **Missing Collection Frame:** No "share all badges" frame route

**User Impact:**
- ❌ Users cannot flex individual badges they earned (Signal Luminary, GM Vanguard, etc.)
- ❌ Click on badge card does nothing (no share, no modal, no detail view)
- ❌ Only the first badge can be shared, rest are "dead weight"
- ❌ No way to share entire badge collection as a showcase

**Dependency Graph:**
```
app/profile/[fid]/badges/page.tsx
  ├─> BadgeInventory component (display only, no click handlers)
  ├─> Single share button (hardcoded badges[0])
  └─> Missing: Individual badge click → share handler

Required Fixes:
  ├─> components/badge/BadgeInventory.tsx
  │   └─> Add onClick prop to each badge card
  ├─> app/profile/[fid]/badges/page.tsx
  │   ├─> Add handleBadgeClick(badgeId) handler
  │   └─> Pass onClick to BadgeInventory
  └─> app/api/frame/route.tsx
      ├─> Add 'badge-collection' frame type
      └─> Generate multi-badge showcase image
```

**15.1: Individual Badge Share (2 hours)**

**Fix Requirements:**
1. **BadgeInventory Component Update:**
   ```typescript
   // components/badge/BadgeInventory.tsx
   interface BadgeInventoryProps {
     badges: UserBadge[]
     onBadgeClick?: (badge: UserBadge) => void  // NEW
   }
   
   export function BadgeInventory({ badges, onBadgeClick }: BadgeInventoryProps) {
     return badges.map(badge => (
       <div 
         onClick={() => onBadgeClick?.(badge)}
         className="cursor-pointer hover:scale-105 transition-transform"
       >
         {/* Existing badge card */}
       </div>
     ))
   }
   ```

2. **Badge Page Update:**
   ```typescript
   // app/profile/[fid]/badges/page.tsx
   const handleBadgeClick = async (badge: UserBadge) => {
     const shareUrl = buildFrameShareUrl({
       type: 'badge',
       fid: parseInt(fid),
       extra: { badgeId: badge.badgeId }
     })
     const shareText = `Just earned the ${badge.metadata?.name || badge.badgeType} badge! 🎮✨\n\n— via @gmeowbased`
     await openWarpcastComposer(shareText, shareUrl)
   }
   
   <BadgeInventory badges={badges} onBadgeClick={handleBadgeClick} />
   ```

3. **Frame Route Update:**
   ```typescript
   // app/api/frame/route.tsx (badge type handler)
   // CURRENT: Only uses fid, ignores badgeId param
   // FIX: Read badgeId from params, generate specific badge frame
   const badgeId = readParam(url, 'badgeId', '')
   if (badgeId) {
     // Show specific badge frame (already works via /api/frame/badgeShare)
     const badgeFrame = await buildBadgeShareFrame(fid, badgeId)
   } else {
     // Show badge collection overview (existing behavior)
     const collectionFrame = await buildBadgeCollectionFrame(fid)
   }
   ```

**15.2: Badge Collection Frame (1 hour)**

**New Frame Type:** `badge-collection` (multi-badge showcase)

**Implementation:**
```typescript
// app/api/frame/route.tsx
if (type === 'badge-collection') {
  const badges = await getUserBadges(fid)
  const earnedCount = badges.filter(b => b.assigned).length
  
  const imageUrl = buildDynamicFrameImageUrl({
    type: 'badge-collection',
    fid,
    extra: {
      earnedCount,
      totalBadges: badges.length,
      tierCounts: {
        mythic: badges.filter(b => b.tier === 'mythic').length,
        legendary: badges.filter(b => b.tier === 'legendary').length,
        // ...
      }
    }
  }, origin)
  
  return buildFrameHtml({
    title: `Badge Collection • ${earnedCount} Earned`,
    description: `@${username} earned ${earnedCount}/${badges.length} badges`,
    image: imageUrl,
    buttons: [
      { label: 'View Collection', target: `/profile/${fid}/badges` }
    ]
  })
}
```

**Image Generator Update:**
```typescript
// app/api/frame/image/route.tsx
if (type === 'badge-collection') {
  return new ImageResponse((
    <div style={{ /* Yu-Gi-Oh! card layout */ }}>
      <div>@{username}'s Badge Collection</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Show badge tier counts with icons */}
        <div>🌟 Mythic: {tierCounts.mythic}</div>
        <div>💎 Legendary: {tierCounts.legendary}</div>
        <div>⚡ Epic: {tierCounts.epic}</div>
        <div>🎯 Rare: {tierCounts.rare}</div>
      </div>
      <div>{earnedCount} / {totalBadges} Earned</div>
    </div>
  ))
}
```

**Success Criteria:**
- ✅ Click on any badge → Opens Warpcast composer with that badge's frame
- ✅ Share button updated to "Share Collection" → Shows all badges
- ✅ Each badge shareable individually (not just Signal Luminary)
- ✅ Badge collection frame shows tier breakdown

---

### 16: GM Dashboard Broken State (CRITICAL - 2 hours)

**Issue Reported:** GM on dashboard page appears broken and requires handling

**Investigation Needed:**
- Check `app/Dashboard/page.tsx` GM section (lines 1960-2020)
- Verify `ContractGMButton` component integration
- Test streak calculation logic
- Validate frame share URL generation

**Potential Issues (Based on Code Review):**

**16.1: GM Button State Issues (1 hour)**
```typescript
// app/Dashboard/page.tsx:1968-1988
// Potential issues:
1. ❌ canGM state not updating correctly
2. ❌ Streak showing 0 when user has active streak
3. ❌ Button disabled when it should be enabled
4. ❌ "Send GM" handler not triggering contract call
5. ❌ Frame share URL returning empty/broken URL
```

**Debugging Checklist:**
- [ ] `getUserStats()` contract call returning correct data
- [ ] `streak` state updating from contract response
- [ ] `canGM` calculation using correct 24h window
- [ ] `lastGMTimestamp` converting from BigInt correctly
- [ ] `handleGM()` function wiring to `writeContract`
- [ ] `gmFrameUrl` generating valid share URL
- [ ] Error handling showing useful messages

**16.2: Dashboard GM Section Audit (1 hour)**

**Files to Check:**
1. **Dashboard Page (app/Dashboard/page.tsx:1960-2020):**
   - GM button rendering logic
   - State management (streak, canGM, gmMessage)
   - Contract integration (useReadContract, useWriteContract)
   - Error handling and user feedback

2. **ContractGMButton Component (components/ContractGMButton.tsx):**
   - getUserStats() contract call
   - Streak calculation from BigInt
   - 24h cooldown logic
   - Chain switching
   - Share frame handler

3. **GM Utils (lib/gm-utils.ts):**
   - canGMBasedOnTimestamp() calculation
   - formatTimeUntilNextGM() display
   - Contract ABI accuracy
   - Chain ID mappings

**Common Failure Modes:**
```typescript
// Issue 1: BigInt conversion
const streak = Number(userData[1]) // ✅ Correct
const streak = userData[1]          // ❌ BigInt not converted

// Issue 2: Timestamp comparison
const canGM = lastGMTimestamp === 0 || Date.now() > lastGMTimestamp + 86400000
// ✅ Correct: 24h in milliseconds

// Issue 3: Contract address
const contractAddress = getContractAddress(selectedChain)
// ❌ If undefined → contract call fails silently

// Issue 4: Frame URL
const gmFrameUrl = buildFrameShareUrl({ type: 'gm', user: address })
// ❌ If address undefined → empty URL
```

**Fix Strategy:**
1. Add console.log() for all contract responses
2. Verify BigInt → Number conversions
3. Test canGMBasedOnTimestamp() with mock timestamps
4. Validate frame URL generation with address
5. Add error toast for failed contract calls
6. Show loading states during contract reads

**Success Criteria:**
- ✅ GM button shows correct state (ready/cooling down/already sent)
- ✅ Streak displays accurate count from contract
- ✅ "Send GM" button triggers transaction successfully
- ✅ "Share Frame" button opens composer with valid GM frame
- ✅ Error messages are helpful and actionable
- ✅ Loading states visible during contract interactions

---

### 17: Comprehensive Frame Deep Audit (CRITICAL - 1 hour)

**Issue Reported:** "I have only provided two examples of many frames that need a deeper audit. What about guild, onchain, and others?"

**Scope Expansion:** Apply same audit rigor to ALL remaining frame types

**17.1: Guild Frame Deep Audit (0.5 hours)**

**Current Status:** Not audited in Layer 1-3

**Audit Checklist:**
- [ ] Username display in frame image (or address fallback)
- [ ] Guild name and member count accurate
- [ ] Share button triggers (GuildManagementPage.tsx:396)
- [ ] Frame image layout (2-column Yu-Gi-Oh! style?)
- [ ] Chain icon integration (if guild is chain-specific)
- [ ] XP rewards display (if guild quests active)
- [ ] @gmeowbased attribution in frame text

**Potential Issues:**
```typescript
// Guild frame image parameters (app/api/frame/image/route.tsx)
// Check if missing:
- username / displayName
- guildId parameter reading
- member count display
- guild tier/level badges
- quest completion stats
```

**17.2: OnchainStats Frame Deep Audit (0.25 hours)**

**Status:** ✅ Fixed in Phase 1E (commit 7c5554d) but needs revalidation

**Revalidation Checklist:**
- [ ] Username still displaying correctly (@heycat not 0x7539...)
- [ ] 2-column layout maintained (not regressed)
- [ ] Chain-specific stats accurate (Base, Optimism, etc.)
- [ ] Share button working (OnchainStats.tsx:849)
- [ ] Frame image quality (1200x628, proper aspect ratio)
- [ ] Mobile layout responsive

**17.3: Remaining Frame Types Quick Audit (0.25 hours)**

**Frames to Quick Check:**
1. **Verify Frame:** Username display, verification status, CTA button
2. **Referral Frame:** Referral code display, reward info, share button
3. **Leaderboard Frame:** Username in leaderboard rows, rank display
4. **Quest Frame:** Quest title, XP reward, chain badge, share button
5. **Points Frame:** Username, points balance, level/tier badge

**Quick Audit Template (5 minutes per frame):**
```bash
# 1. Check frame route handler
grep -n "type === 'verify'" app/api/frame/route.tsx

# 2. Check image generation
grep -n "type === 'verify'" app/api/frame/image/route.tsx

# 3. Check share button trigger
rg "type: 'verify'" --type tsx

# 4. Validate frame metadata
curl "localhost:3001/api/frame?type=verify&fid=18139" | grep "fc:frame"

# 5. Test image rendering
open "localhost:3001/api/frame/image?type=verify&fid=18139"
```

**Success Criteria:**
- ✅ All 9 frame types audited with same depth as Layer 1-3
- ✅ Guild frame passes username + layout tests
- ✅ OnchainStats still working after revalidation
- ✅ Verify/Referral frames functional
- ✅ Documentation updated with findings

---

## 📊 Updated Task Breakdown & Effort Estimation (Layer 4 Added)

### Layer 1 Tasks (Functional Fixes - 24.5 hours):
1. ✅ GM Frame Username Support (4 hours) - Priority: CRITICAL
2. ✅ Quest Frame Username Support (3 hours) - Priority: HIGH
3. ✅ OnchainStats Frame 2-Column Layout (6 hours) - Priority: CRITICAL
4. ✅ Points Frame Handler (4 hours) - Priority: CRITICAL
5. ✅ Guild Frame Username Support (2.5 hours) - Priority: MEDIUM
6. ✅ Leaderboard Frame Username Validation (2 hours) - Priority: MEDIUM
7. ✅ Badge Frame Username Validation (3 hours) - Priority: MEDIUM

### Layer 2 Tasks (Infrastructure Completeness - 20.5 hours):
8. ✅ Design System Consolidation (8 hours) - Priority: HIGH
9. ✅ Chain Icon Integration (4 hours) - Priority: MEDIUM
10. ✅ XP System Integration (5 hours) - Priority: HIGH
11. ✅ Text Composition Enhancement (2 hours) - Priority: LOW
12. ✅ @gmeowbased Attribution (1.5 hours) - Priority: MEDIUM

### Layer 3 Tasks (System Documentation & Cleanup - 5 hours):
13. ✅ Share Button Architecture Documentation (3 hours) - Priority: CRITICAL
14. ✅ Missing Frame Improvements Documentation (2 hours) - Priority: CRITICAL

### **Layer 4 Tasks (User-Reported Critical Issues - 6 hours):** 🆕
15. ✅ **Badge Page Frame Trigger Logic (3 hours)** - Priority: CRITICAL ✅ COMPLETED
    - ✅ 15.1: Individual badge share handlers (2h) - Commit ab59d0f
    - ✅ 15.2: Badge collection frame (1h) - handleBadgeClick implemented
    - **Fixed:** Badge page now shares individual badges with unique badgeId frames

16. ✅ **GM Dashboard Time-Based Greetings (2 hours)** - Priority: CRITICAL ✅ COMPLETED
    - ✅ 16.1: Time-based greeting logic (1h) - Commit 08e2d0e
    - ✅ 16.2: GM frame compose text enhancement (1h) - Morning/afternoon/evening/night
    - **Fixed:** Dashboard shows contextual greetings, frame text varies by time

17. ✅ **Comprehensive Frame Deep Audit (1 hour)** - Priority: HIGH ✅ COMPLETED
    - ✅ 17.1: Guild frame deep audit (0.5h) - Minor issues documented
    - ✅ 17.2: OnchainStats revalidation (0.25h) - Still working correctly
    - ✅ 17.3: Remaining frames quick audit (0.25h) - Verify/Referral reviewed
    - **Result:** 0 critical issues, 3 minor (username enhancements)

**Updated Total Effort: 56 hours** (was 50h)
- Layer 1: 24.5 hours (functional fixes)
- Layer 2: 20.5 hours (infrastructure completeness)
- Layer 3: 5 hours (system documentation + cleanup)
- **Layer 4: 6 hours (user-reported critical issues)** 🆕

---

## 🎯 Updated Success Metrics (Layer 4 Completed)

**Frame Quality:**
- ✅ **100% frame types audited** (9/9 frames checked: GM, Quest, Badge, Points, OnchainStats, Guild, Leaderboard, Referral, Verify)
- ✅ **100% critical issues resolved** (Tasks 15-17 completed and deployed)
- ✅ **Zero user-blocking issues** (badge flex, time-based greetings working)
- ⚠️ **3 optional enhancements identified** (Guild/Verify/Referral username display)

**Deployment Status:**
- ✅ **Commit ab59d0f:** Task 15 - Individual badge sharing
- ✅ **Commit 08e2d0e:** Task 16 - Time-based greetings (morning/afternoon/evening/night)
- ✅ **Doc created:** TASK-17-FRAME-AUDIT-RESULTS.md (comprehensive audit findings)
- ✅ **Production ready:** All changes deployed to Vercel

**Phase 1F Progress:**
- ✅ **Layer 1:** Functional fixes (24.5h) - 100% complete
- ✅ **Layer 2:** Infrastructure completeness (20.5h) - 100% complete
- ✅ **Layer 3:** System documentation (5h) - 100% complete
- ✅ **Layer 4:** User-reported critical issues (6h) - 100% complete
- **Total:** 56 hours completed

**Next Phase:**
- 🟡 **Optional:** Implement Guild/Verify/Referral username enhancements (3h)
- 🟢 **Ready:** Move to Phase 1G or next priority feature

### Functional Completeness (Layer 1):
- ✅ 100% frames display username or FID
- ✅ Points frame has dedicated handler
- ✅ 2-column Yu-Gi-Oh! layout standard adopted
- ✅ Zero layout waste (GM frame 60% waste fixed)

### Infrastructure Health (Layer 2):
- ✅ Design system consolidated (fonts in 1 file, colors in 1 file)
- ✅ Chain icons used consistently (images + HTML overlays)
- ✅ XP system integrated in 4+ frame types
- ✅ @gmeowbased attribution 100% coverage

### System Maintainability (Layer 3):
- ✅ Share button architecture documented (10+ trigger points mapped)
- ✅ Frame spec compliance gaps identified (aspect ratio, input, tx buttons)
- ✅ Legacy code cleanup planned (POST handler, BadgeShareCard)
- ✅ Missing features prioritized (HIGH: input fields, MEDIUM: tx buttons, LOW: animations)

### **User Engagement (Layer 4):** 🆕
- ✅ **Individual badge sharing working** (not just Signal Luminary)
- ✅ **Badge collection frame live** (flex all badges at once)
- ✅ **GM dashboard functional** (streak updating, button working)
- ✅ **All 9 frame types audited** (guild, onchain, verify, referral, etc.)
- ✅ **Zero user-blocking issues** (badge flex, GM broken state resolved)

### Quality Gates (All Layers):
- ✅ All edits pass GI-8 (File-Level API Sync)
- ✅ Username resolution logic follows GI-7 (MCP Spec Sync)
- ✅ Frame button compliance (GI-12)
- ✅ Frame URL safety (GI-11)
- ✅ Legacy deletion follows GI-14 (Safe-Delete Verification)
- ✅ **GI-13 Safe Patching applied** (check file existence, patch not replace)

---

## 🔗 Layer 3 Audit: Share Button Infrastructure & Missing Features

### 13: Share Button Architecture Documentation (CRITICAL - 3 hours)

**Purpose:** Document complete share button infrastructure for maintainability

**13.1: Share Infrastructure Map (1.5 hours)**

**Core Library: `lib/share.ts` (208 lines)**
- `buildFrameShareUrl(input: FrameShareInput): string` - Generates frame URLs
- `buildWarpcastComposerUrl(text: string, embed?: string): string` - Creates composer links
- `openWarpcastComposer(text, embed): Promise<'miniapp'|'web'|'noop'>` - Handles SDK vs web

**Miniapp Detection Logic:**
```typescript
// Checks for Farcaster iframe context
const isFarcasterReferrer = document.referrer.includes('farcaster')
const isInIframe = window.self !== window.top

if (isInIframe && isFarcasterReferrer) {
  // Use Miniapp SDK
  await sdk.actions.openUrl(composerUrl)
} else {
  // Use web composer
  window.open(composerUrl, '_blank')
}
```

**Share URL Pattern:**
```typescript
// Standard pattern across all frame types:
const shareUrl = buildFrameShareUrl({
  type: 'badge' | 'quest' | 'leaderboard' | 'guild' | 'onchainstats',
  fid?: number,
  questId?: string,
  chain?: string,
  guildId?: string,
  // ... type-specific params
})
// Example output: https://gmeowhq.art/frame/badge/18139
```

**13.2: Share Button Triggers Inventory (1 hour)**

**10+ Integration Points Identified:**

1. **Quest System:**
   - `components/Quest/QuestCard.tsx` (line 405): Share quest frame after completion
   - `app/Quest/[chain]/[id]/page.tsx` (line 414): Quest page share button
   - `components/home/LiveQuests.tsx` (line 32): Home page quest share
   - Pattern: `openWarpcastComposer(composeText, buildFrameShareUrl({ type: 'quest', questId, chain }))`

2. **GM & Streaks:**
   - `components/ContractGMButton.tsx` (line 215): Share GM streak milestone
   - Pattern: Share after streak milestone (7, 30, 100, 365 days)

3. **Stats & Analytics:**
   - `components/OnchainStats.tsx` (line 849): Share chain-specific stats
   - `components/ProfileStats.tsx` (line 308): Share profile frame
   - Pattern: "Flexing my [stats type] via @gmeowbased"

4. **Dashboard & Profile:**
   - `app/Dashboard/page.tsx` (line 1299): Share points balance
   - `app/profile/[fid]/badges/page.tsx` (line 231): Share badge collection
   - Pattern: User-initiated sharing from profile pages

5. **Guild & Community:**
   - `components/Guild/GuildManagementPage.tsx` (line 396): Share guild frame
   - Pattern: Guild admins share guild recruitment

6. **Navigation & Sidebar:**
   - `components/layout/gmeow/GmeowSidebarRight.tsx` (line 53): "Launch Frame" button
   - Pattern: Quick access to frame sharing from sidebar

**13.3: Component Variants (0.5 hours)**

**Modern Component: `components/share/ShareButton.tsx` (320 lines)**
- **Variant 'deeplink'** (Phase 5.5): Opens Warpcast composer manually
  ```typescript
  <ShareButton 
    fid={fid} 
    tier={tier} 
    badgeId={badgeId}
    variant="deeplink" // Opens composer URL
  />
  ```

- **Variant 'cast-api'** (Phase 5.7): Auto-publishes via API
  ```typescript
  <ShareButton 
    fid={fid} 
    tier={tier} 
    badgeId={badgeId}
    variant="cast-api" // Calls /api/cast/badge-share
  />
  ```

- **Styling:** Glass morphism, tier-based colors (mythic #9C27FF, legendary #FFD966)
- **Usage:** OnboardingFlow after badge reveal (Stage 5 completion)

**Legacy Component: `components/legacy/BadgeShareCard__archived.tsx` (~200 lines)**
- Status: Archived but not deleted (dead code)
- Task: Clean up in GI-14 safe deletion process

**Success Criteria:**
- ✅ Complete architecture diagram showing lib → components → pages → APIs
- ✅ All 10+ trigger locations documented with purpose
- ✅ Component variants explained with usage examples
- ✅ Legacy cleanup identified

---

### 14: Missing Frame Improvements Documentation (CRITICAL - 2 hours)

**Purpose:** Identify frame spec compliance gaps and missing features

**14.1: Farcaster Frame Spec Compliance Audit (1 hour)**

**Current Status: BASIC COMPLIANCE**
- ✅ Frame metadata: `fc:frame:state`, buttons, actions working
- ✅ Image generation: 1200x628 (1.91:1 aspect ratio) with ImageResponse
- ✅ Button types: `link`, `post_redirect` supported (post actions deprecated)
- ✅ vNext format: Using version "1" with JSON schema validation

**MISSING SPEC FEATURES (Impact: Medium):**

**1. Aspect Ratio Control** (fc:frame:image:aspect_ratio)
- **Current:** All frames default to 1.91:1 (1200x628 OG standard)
- **Missing:** Cannot use 1:1 square format (1200x1200)
- **Spec:** Farcaster supports both 1.91:1 and 1:1
- **Use Case:** Square badges, profile cards, NFT showcases look better 1:1
- **Files:** `app/api/frame/route.tsx` (no aspect_ratio tag generation)
- **Fix Effort:** 1 hour (add aspect_ratio metadata, update image generators)
- **Priority:** LOW (current 1.91:1 works fine, 1:1 is enhancement)

**2. Input Fields** (fc:frame:input)
- **Current:** No text input support in frames
- **Missing:** Cannot collect user text for interactive frames
- **Spec:** Farcaster supports `fc:frame:input` for text entry
- **Use Case:** Custom GM messages, quest submission text, guild join requests
- **Files:** `app/api/frame/route.tsx` (no input generation), POST handler removed
- **Blocker:** POST handler deleted in Phase 1E (1030 lines commented)
- **Fix Effort:** 8 hours (restore POST handler, add input validation, update all frame types)
- **Priority:** HIGH (enables interactive frames, user engagement)

**3. Transaction Buttons** (tx action)
- **Current:** Only `link` and `post_redirect` buttons
- **Missing:** Cannot trigger onchain transactions from frames
- **Spec:** Farcaster supports `tx` action for onchain interactions
- **Use Case:** Mint badges, claim rewards, GM recording directly from frame
- **Files:** `app/api/frame/route.tsx` (no tx action support)
- **Blocker:** Requires transaction encoding (wagmi/viem integration)
- **Fix Effort:** 12 hours (tx encoding, gas estimation, error handling, multi-chain support)
- **Priority:** MEDIUM (nice-to-have, current link buttons work)

**4. Mint Buttons** (mint action - DEPRECATED)
- **Current:** Not supported
- **Missing:** Direct NFT minting from frames
- **Spec:** `mint` action deprecated by Farcaster (use `tx` instead)
- **Use Case:** Badge minting, quest rewards
- **Fix Effort:** N/A (deprecated, use `tx` action instead)
- **Priority:** N/A (not recommended)

**14.2: Cross-Frame Consistency Gaps (0.5 hours)**

**1. Animation Support**
- **Current:** Static PNG images only
- **Missing:** Animated GIFs, videos, lottie animations
- **Spec:** Farcaster supports GIF animations (max 10MB)
- **Use Case:** Celebration animations (level up, streaks, achievements)
- **Fix Effort:** 2 hours (GIF generation with sharp, video encoding)
- **Priority:** LOW (static images sufficient, animations slow load time)

**2. Dynamic Metadata Updates**
- **Current:** Frames are static after generation
- **Missing:** Real-time updates without page refresh
- **Spec:** Not supported by Farcaster (frames are cached)
- **Use Case:** Live leaderboard updates, countdown timers
- **Workaround:** Short cache TTL (60 seconds) already implemented
- **Fix Effort:** N/A (Farcaster limitation)
- **Priority:** N/A (workaround sufficient)

**3. Multi-Step Frame Flows**
- **Current:** Single-page frames with link buttons
- **Missing:** Multi-step interactive flows (wizard-style)
- **Spec:** Requires POST handler for state transitions
- **Blocker:** POST handler removed in Phase 1E
- **Use Case:** Quest onboarding, badge selection, guild join wizard
- **Fix Effort:** 15 hours (restore POST handler, state management, validation)
- **Priority:** LOW (current link-to-miniapp flow works well)

**14.3: Legacy Code Cleanup Inventory (0.5 hours)**

**Files Identified for Safe Deletion (GI-14):**

1. **POST Handler (app/api/frame/route.tsx lines 2590-3620)**
   - Status: 1030 lines commented (Phase 1E)
   - Reason: POST actions deprecated by Farcaster, all frames use link buttons
   - Blocker: None (already commented, zero references)
   - GI-14 Process: Can delete immediately (no 48h soft delete needed)
   - Effort: 0.5 hours (delete commented code, verify build)

2. **BadgeShareCard Archived Component**
   - File: `components/legacy/BadgeShareCard__archived.tsx` (~200 lines)
   - Status: Archived but not deleted
   - Reason: Replaced by ShareButton.tsx (Phase 5.5)
   - Blocker: Check for lingering imports
   - GI-14 Process: Run full usage scan, 48h soft delete
   - Effort: 1 hour (scan, soft delete, monitor, hard delete)

3. **Unused Frame Utilities**
   - File: Search for commented utilities in `lib/frame-*.ts`
   - Status: To be discovered during GI-14 scan
   - Effort: 1 hour (scan, validate, delete)

**Success Criteria:**
- ✅ Frame spec compliance gaps documented with priority
- ✅ Missing features identified with fix effort estimates
- ✅ Cross-frame consistency issues cataloged
- ✅ Legacy cleanup inventory complete with GI-14 checklist

---

## 📊 Updated Task Breakdown & Effort Estimation

### Layer 1 Tasks (Functional Fixes - 24.5 hours):
1. ✅ GM Frame Username Support (4 hours) - Priority: CRITICAL
2. ✅ Quest Frame Username Support (3 hours) - Priority: HIGH
3. ✅ OnchainStats Frame 2-Column Layout (6 hours) - Priority: CRITICAL
4. ✅ Points Frame Handler (4 hours) - Priority: CRITICAL
5. ✅ Guild Frame Username Support (2.5 hours) - Priority: MEDIUM
6. ✅ Leaderboard Frame Username Validation (2 hours) - Priority: MEDIUM
7. ✅ Badge Frame Username Validation (3 hours) - Priority: MEDIUM

### Layer 2 Tasks (Infrastructure Completeness - 20.5 hours):
8. ✅ Design System Consolidation (8 hours) - Priority: HIGH
9. ✅ Chain Icon Integration (4 hours) - Priority: MEDIUM
10. ✅ XP System Integration (5 hours) - Priority: HIGH
11. ✅ Text Composition Enhancement (2 hours) - Priority: LOW
12. ✅ @gmeowbased Attribution (1.5 hours) - Priority: MEDIUM

### Layer 3 Tasks (System Documentation & Cleanup - 5 hours):
13. ✅ **Share Button Architecture Documentation (3 hours)** - Priority: CRITICAL
    - 13.1: Share infrastructure map (1.5h)
    - 13.2: Trigger inventory (1h)
    - 13.3: Component variants (0.5h)

14. ✅ **Missing Frame Improvements Documentation (2 hours)** - Priority: CRITICAL
    - 14.1: Frame spec compliance audit (1h)
    - 14.2: Cross-frame consistency gaps (0.5h)
    - 14.3: Legacy cleanup inventory (0.5h)

**Updated Total Effort: 50 hours** (was 45h)
- Layer 1: 24.5 hours (functional fixes)
- Layer 2: 20.5 hours (infrastructure completeness)
- Layer 3: 5 hours (system documentation + cleanup)

---

## 🎯 Updated Success Metrics

### Functional Completeness (Layer 1):
- ✅ 100% frames display username or FID
- ✅ Points frame has dedicated handler
- ✅ 2-column Yu-Gi-Oh! layout standard adopted
- ✅ Zero layout waste (GM frame 60% waste fixed)

### Infrastructure Health (Layer 2):
- ✅ Design system consolidated (fonts in 1 file, colors in 1 file)
- ✅ Chain icons used consistently (images + HTML overlays)
- ✅ XP system integrated in 4+ frame types
- ✅ @gmeowbased attribution 100% coverage

### System Maintainability (Layer 3):
- ✅ **Share button architecture documented** (10+ trigger points mapped)
- ✅ **Frame spec compliance gaps identified** (aspect ratio, input, tx buttons)
- ✅ **Legacy code cleanup planned** (POST handler, BadgeShareCard)
- ✅ **Missing features prioritized** (HIGH: input fields, MEDIUM: tx buttons, LOW: animations)

### Quality Gates:
- ✅ All edits pass GI-8 (File-Level API Sync)
- ✅ Username resolution logic follows GI-7 (MCP Spec Sync)
- ✅ Frame button compliance (GI-12)
- ✅ Frame URL safety (GI-11)
- ✅ Legacy deletion follows GI-14 (Safe-Delete Verification)

---

## 📚 References

### Related Documents:
- [PHASE-1E-AUDIT-REPORT.md](./PHASE-1E-AUDIT-REPORT.md) - Phase 1E findings
- [PHASE-1E-COMPLETE.md](../../../PHASE-1E-COMPLETE.md) - Phase 1E summary
- [CHANGELOG.md](../../../CHANGELOG.md) - Version history
- [QUALITY-GATES.md](../../../reference/QUALITY-GATES.md) - GI-7 to GI-14 reference

### MCP Spec References:
- Farcaster Frame Spec: https://docs.farcaster.xyz/reference/frames/v1/spec
- Farcaster Miniapp Spec: https://miniapps.farcaster.xyz/docs/specification
- Neynar Frame API: https://docs.neynar.com/docs/frame-api
- Neynar Score Fields: https://docs.neynar.com/docs/neynar-score

### Key Commits:
- `9f061de` - Phase 1E: Fixed onchainstats image parameters
- `7c5554d` - Phase 1E: MEGA onchainstats improvement (username + redesign)
- `1addaa0` - Phase 1E: Removed unused imports and types
- `fc67af7` - Phase 1F: Layer 2 audit expansion (design, chains, XP, text)

### Testing URLs:
```bash
# Localhost testing
localhost:3001/api/frame?type=gm&fid=18139
localhost:3001/api/frame?type=quest&questId=1&chain=base
localhost:3001/api/frame?type=onchainstats&user=0x7539...
localhost:3001/api/frame?type=points&user=0x7539...
localhost:3001/api/frame?type=badge&fid=18139

# Production testing (after Vercel deploy)
gmeowhq.art/api/frame?type=...

# Farcaster proxy testing
https://proxy.wrpcd.net/?url=https%3A%2F%2Fgmeowhq.art%2Fapi%2Fframe%2F...
```

---

**Document Status:** ✅ Complete  
**Last Updated:** November 23, 2025  
**Next Review:** After Task 1 completion
