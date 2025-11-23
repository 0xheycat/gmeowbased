# Phase 1F: Comprehensive Frame Improvement Plan
**Created:** November 23, 2025  
**Status:** Planning  
**Previous Phase:** Phase 1E (POST button removal + onchainstats image fix)

---

## Executive Summary

Phase 1F focuses on **consistency, completeness, and cleanup** across all 9 frame types. After fixing onchainstats frame with username display and improved layout, we identified significant gaps in other frame types.

### Impact Categories:
- 🔴 **CRITICAL**: Username display missing (social recognition)
- 🟡 **HIGH**: Layout improvements (flex appeal + readability)
- 🟢 **MEDIUM**: Code cleanup (technical debt)
- 🔵 **LOW**: Minor enhancements (polish)

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

### Task 10: XP System Frame Integration 🟡
**Priority:** HIGH (Layer 2)  
**Effort:** 5 hours  
**Dependencies:** Task 3 (Points frame handler)

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

### Task 11: Text Composition Enhancements 🟢
**Priority:** MEDIUM (Layer 2)  
**Effort:** 3 hours  
**Dependencies:** Task 1-4 (username support), Task 10 (XP integration)

**11.1: Achievement-Based Compose Text (1.5 hours)**
```typescript
// Update getComposeText() in route.tsx (lines 961-992):
function getComposeText(frameType, context) {
  const { username, streak, gmCount, level, tier, xp } = context
  
  if (frameType === 'gm') {
    // Layer achievement flex
    if (streak >= 30 && level >= 20) {
      return `🔥 ${streak}-day streak + Level ${level} ${tier}! Unstoppable! @gmeowbased`
    }
    if (tier === 'Mythic GM') {
      return `👑 Mythic GM unlocked! ${gmCount} total GMs! Join the elite @gmeowbased`
    }
    if (streak >= 30) {
      return `🔥 ${streak}-day GM streak! Legendary dedication! Join the meow squad @gmeowbased`
    }
    if (streak >= 7) {
      return `⚡ ${streak}-day GM streak! Hot streak! Stack your daily ritual @gmeowbased`
    }
    if (gmCount && gmCount > 100) {
      return `🌅 ${gmCount} GMs and counting! Join the daily ritual @gmeowbased`
    }
    return '🌅 Just stacked my daily GM ritual! Join the meow squad @gmeowbased'
  }
  
  if (frameType === 'quest') {
    const { title, chain, progress } = context
    if (progress >= 80) {
      return `⚔️ Almost done with "${title}"! ${progress}% complete @gmeowbased`
    }
    return `⚔️ New quest unlocked${chain ? ` on ${chain}` : ''}! ${title || 'Check it out'} @gmeowbased`
  }
  
  // ... other frame types with personalization
}
```

**11.2: Attribution Standardization (0.5 hours)**
```typescript
// Fix inconsistent @gmeowbased usage:

// ✅ STANDARD (frame images):
"@gmeowbased • Quest #123"
"@gmeowbased • Base"
"@gmeowbased • Multichain Rankings"

// Update inconsistent usage:
// app/profile/[fid]/badges/page.tsx (line 234):
- "— via @gmeowbased"
+ "on @gmeowbased"

// components/share/ShareButton.tsx (line 76):
- Keep "on @gmeowbased" ✅

// Ensure all compose text ends with:
"[action] @gmeowbased" (no "via", no "—")
```

**11.3: Social Proof Messaging (1 hour)**
```typescript
// Add to frame descriptions (not compose text):
const SOCIAL_PROOF = {
  gm: '10K+ daily GM warriors',
  quest: '5K+ quests completed',
  guild: '200+ active guilds',
  leaderboard: '15K+ adventurers competing',
}

// Update frame descriptions:
const description = `${baseDescription} • ${SOCIAL_PROOF[frameType]} • Join @gmeowbased`
```

**Success Criteria:**
- ✅ Compose text mentions level/tier for high achievers
- ✅ All @gmeowbased mentions consistent ("on @gmeowbased")
- ✅ Social proof added to descriptions
- ✅ No "via" or "—" inconsistencies

---

### Task 12: Frame Testing Suite 🔵
**Priority:** LOW (Layer 2)  
**Effort:** 8 hours  
**Dependencies:** All tasks complete

**Coverage:**
- Unit tests for frame route handlers
- Integration tests for image generation
- E2E tests with Playwright
- Profile resolution edge cases
- Cache behavior validation
- Design system consistency tests
- XP calculation accuracy tests

---

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

## 📚 References

### Related Documents:
- [PHASE-1E-AUDIT-REPORT.md](./PHASE-1E-AUDIT-REPORT.md) - Phase 1E findings
- [PHASE-1E-COMPLETE.md](../../../PHASE-1E-COMPLETE.md) - Phase 1E summary
- [CHANGELOG.md](../../../CHANGELOG.md) - Version history

### Key Commits:
- `9f061de` - Phase 1E: Fixed onchainstats image parameters
- `7c5554d` - Phase 1E: MEGA onchainstats improvement (username + redesign)
- `1addaa0` - Phase 1E: Removed unused imports and types

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
