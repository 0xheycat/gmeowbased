# Phase 2: UI/UX Comprehensive Frame Audit
**Status:** ✅ Complete  
**Date:** November 23, 2025  
**Focus:** Premium Styles, Rich Layouts, Typography Enhancement, User Experience  

---

## Executive Summary

This audit comprehensively analyzed all 9 frame types in the Gmeowbased frame system. The current implementation uses a functional Yu-Gi-Oh card aesthetic with basic typography and standard gradients. **Key finding: The frames lack premium visual polish—they use default sans-serif fonts, basic 2-color gradients, and simple spacing systems.**

### Current State Overview
- ✅ **Functional:** All 9 frames work correctly with consistent structure
- ✅ **Design System:** Centralized in `lib/frame-design-system.ts` (FRAME_FONTS, FRAME_COLORS, FRAME_LAYOUT)
- ❌ **Typography:** Default sans-serif, size-based hierarchy only, no letter-spacing/line-height control
- ❌ **Colors:** Basic 2-4 color palettes per frame (primary/secondary gradients only)
- ❌ **Layouts:** FRAME_LAYOUT constants exist but **NOT USED** (hardcoded values everywhere)
- ❌ **Visual Depth:** Limited richness—basic shadows, standard effects, no textures/overlays

### Phase 2 Goals (User Requirements)
1. **Premium Styles**: High-quality fonts, rich color palettes, polished visual design
2. **Rich Layouts**: Enhanced information architecture, advanced grid systems, better spacing
3. **Typography Enhancement**: Custom font families, advanced typographic controls
4. **User Experience**: Improved readability, visual hierarchy, engagement

---

## Part 1: Frame-by-Frame Analysis

### Frame 1: GM Frame (Green #7CFF7A)
**File:** `app/api/frame/image/route.tsx` (Lines 200-590)  
**Screenshot:** `/tmp/phase2-audit/01-gm-frame.png`

#### Current Implementation
```tsx
Typography:
- Header badge: FRAME_FONTS.caption (10px), fontWeight 700
- Username: FRAME_FONTS.identity (20px), fontWeight 900, centered
- Streak badge: fontSize 28, fontWeight 900
- Stats labels: FRAME_FONTS.label (12px), textTransform 'uppercase'
- Stats values: fontSize 24, fontWeight 900
- Milestone badges: fontSize 16, fontWeight 800
- Footer: FRAME_FONTS.micro (9px), opacity 0.6

Colors:
- Primary: #7CFF7A (green)
- Secondary: #9bffaa (light green)
- Gradient: linear-gradient(135deg, #7CFF7A, #9bffaa)
- Background: rgba(15, 15, 17, 0.75) → rgba(10, 10, 12, 0.85)
- Border: 4px solid #7CFF7A
- Holographic shine: linear-gradient(180deg, #7CFF7A15, transparent)

Layout:
- Canvas: 600x400px
- Card: 540x360px (hardcoded, not using FRAME_LAYOUT.cardWidth)
- Padding: 14px (hardcoded, not using FRAME_LAYOUT.padding)
- Border radius: 12px (hardcoded, not using FRAME_LAYOUT.borderRadius)
- 2-column grid: Stats (left) | Milestones (right)
- Gap: 12px between sections

Visual Effects:
- Box shadow: 0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px #7CFF7A90, 0 10px 50px rgba(0, 0, 0, 0.8)
- Text shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px #7CFF7A60
- Streak badge glow: 0 0 20px #7CFF7A80
```

#### UI/UX Gaps Identified
- ❌ **Font Family:** Default sans-serif (no premium font like Inter, SF Pro, Geist)
- ❌ **Typography Control:** No letter-spacing, line-height specifications
- ❌ **Color Palette:** Only 2 colors (#7CFF7A, #9bffaa)—needs 6-8 for depth
- ❌ **Gradient Depth:** Simple 2-stop gradient—no multi-stop, no overlays
- ❌ **Layout Constants:** Hardcoded 540x360, 14px, 12px—FRAME_LAYOUT unused
- ❌ **Visual Richness:** Basic shadows, no textures, no subtle patterns
- ❌ **Milestone Badges:** Functional but basic styling (could be more prominent)

#### Premium Opportunities
- ✨ Custom font stack: `font-family: 'Inter', 'SF Pro Display', -apple-system, sans-serif`
- ✨ Advanced typography: letter-spacing: -0.02em (tight), line-height: 1.2
- ✨ Rich green palette: 8 shades (#0a2f0a → #7CFF7A → #e0ffe0) + accent gold
- ✨ Multi-stop gradients: 135deg, #0a2f0a 0%, #7CFF7A 50%, #9bffaa 75%, #e0ffe0 100%
- ✨ Texture overlays: Subtle noise pattern, holographic foil effect
- ✨ Enhanced shadows: Layered shadows (0 4px 8px, 0 8px 24px, 0 16px 48px)
- ✨ Responsive spacing: Use FRAME_LAYOUT constants with multipliers (padding * 1.5)

---

### Frame 2: Guild Frame (Blue #4da3ff)
**File:** `app/api/frame/image/route.tsx` (Lines 600-850)  
**Screenshot:** `/tmp/phase2-audit/07-guild-frame.png`

#### Current Implementation
```tsx
Typography:
- Badge: FRAME_FONTS.caption (10px), fontWeight 700
- Username: FRAME_FONTS.body (14px), fontWeight 800
- Guild name: fontSize 28, fontWeight 900, lineHeight 1.1
- Stats labels: FRAME_FONTS.label (12px), fontWeight 700, opacity 0.7
- Stats values: FRAME_FONTS.label (12px), color #4da3ff
- Level: FRAME_FONTS.caption (10px), fontWeight 600, opacity 0.6

Colors:
- Primary: #4da3ff (blue)
- Secondary: #7dbaff (light blue)
- Gradient: linear-gradient(135deg, #4da3ff, #7dbaff)
- Icon background: 180x180px gradient box with 🛡️ emoji (100px)

Layout:
- Structure: 540x360px card, 14px padding
- Left: Guild icon (180x180) + User info box (below)
- Right: Guild name + Stats box (3 rows: members, quests, level)
- Gap: 16px between left/right columns
```

#### UI/UX Gaps Identified
- ❌ **Icon Size:** 180x180px too large, leaves right column cramped
- ❌ **User Info:** Squeezed below large icon, poor visual balance
- ❌ **Typography:** Same basic sans-serif, no font variations
- ❌ **Stats Box:** Generic dark box (rgba(30, 30, 32, 0.6))—lacks personality
- ❌ **Guild Name:** 28px bold adequate but not premium feeling

#### Premium Opportunities
- ✨ Resize icon: 120x120px (like Badge/Points frames) for better balance
- ✨ Typography: Custom font stack, tighter letter-spacing (-0.03em for headers)
- ✨ Stats cards: Individual gradient cards per stat (not single box)
- ✨ Blue palette expansion: Navy (#0a1a2f) → Sky (#4da3ff) → Ice (#d4ebff)
- ✨ Member count animation hint: Visual indicator (pulse effect on border)

---

### Frame 3: Verify Frame (Green #7CFF7A)
**File:** `app/api/frame/image/route.tsx` (Lines 860-1110)  
**Screenshot:** `/tmp/phase2-audit/08-verify-frame.png`

#### Current Implementation
```tsx
Typography:
- Similar to Guild frame structure
- Verify badge text: BLACK color (#000000) on green gradient
- Username: FRAME_FONTS.body (14px), fontWeight 800, BLACK text shadow
- Quest name: fontSize 28, fontWeight 900
- Status: FRAME_FONTS.label (12px), color #7CFF7A

Colors:
- Reuses GM frame palette (#7CFF7A, #9bffaa)
- Unique: Black text on green badge (high contrast)
- Black text shadow on username: 0 1px 3px rgba(255, 255, 255, 0.8)

Layout:
- Icon: 180x180px with ✅ emoji (100px)
- Right: Quest name + Status box (2 rows: status, quest ID)
```

#### UI/UX Gaps Identified
- ❌ **Color Contrast:** Black text on green works but not premium feeling
- ❌ **Status Display:** Simple label—could use visual indicators (checkmark, pending icon)
- ❌ **Quest ID:** Small caption text—low prominence
- ❌ **Icon:** Oversized (180x180px) like Guild frame

#### Premium Opportunities
- ✨ Status badges: Color-coded (green ✅, yellow ⏳, red ❌) with icons
- ✨ Progress indicator: Visual verification steps (1/3 completed)
- ✨ Icon resize: 120x120px for consistency
- ✨ Typography: Verification-specific font weight hierarchy
- ✨ Green palette: Add mint (#a0ffa0) and forest (#2f5f2f) accents

---

### Frame 4: Quest Frame (Cyan #61DFFF)
**File:** `app/api/frame/image/route.tsx` (Lines 1120-1400)  
**Screenshot:** `/tmp/phase2-audit/02-quest-frame.png`

#### Current Implementation
```tsx
Typography:
- Quest name: fontSize 28, fontWeight 900
- XP reward badge: fontSize 24 (+{reward} XP), fontWeight 900
- "COMPLETE FOR" label: FRAME_FONTS.micro (9px), fontWeight 600
- Slots: FRAME_FONTS.label (12px), fontWeight 700
- Expires: FRAME_FONTS.caption (10px), fontWeight 600

Colors:
- Primary: #61DFFF (cyan)
- Secondary: #8dddff (light cyan)
- XP badge: Gradient box with cyan, prominent display

Layout:
- Icon: 180x180px with 🎯 emoji (80px)
- Right: Quest name + Description box with 3 sections:
  1. XP reward badge (prominent gradient)
  2. Slots left
  3. Expiration time
```

#### UI/UX Gaps Identified
- ❌ **XP Badge:** Good prominence but could be more premium (no sparkle, no glow)
- ❌ **Icon Size:** 80px emoji smaller than other frames (inconsistent)
- ❌ **Color Palette:** Only 2 cyan shades—needs depth
- ❌ **Expiration:** Simple text—no urgency indicator (countdown visual)

#### Premium Opportunities
- ✨ XP badge enhancement: Add sparkle ✨ effect, stronger glow
- ✨ Countdown timer: Visual progress bar for expiration (24h → red zone)
- ✨ Cyan palette: Ocean (#0a2a3f) → Cyan (#61DFFF) → Ice (#e0f7ff)
- ✨ Icon consistency: Standardize emoji size (90-100px across all frames)
- ✨ Quest difficulty: Color-coded badges (Easy 🟢, Medium 🟡, Hard 🔴)

---

### Frame 5: OnchainStats Frame (Blue #00d4ff)
**File:** `app/api/frame/image/route.tsx` (Lines 1410-1770)  
**Screenshot:** `/tmp/phase2-audit/05-onchainstats-frame.png`

#### Current Implementation
```tsx
Typography:
- Identity header: FRAME_FONTS.identity (20px), fontWeight 900, centered
- Primary stats values: fontSize 16, fontWeight 900
- Primary stats labels: fontSize 10, fontWeight 600, uppercase
- Volume/Balance: fontSize 14, fontWeight 800
- Secondary stats: fontSize 9/10, fontWeight 600/700
- Reputation title: fontSize 13, fontWeight 800
- Builder score: fontSize 20, fontWeight 900
- Neynar score: fontSize 18, fontWeight 900

Colors:
- Primary: #00d4ff (bright blue)
- Secondary: #5ae4ff (sky blue)
- Power badge: Gold gradient (#FFD700, #FFA500) with ⚡

Layout:
- **BEST LAYOUT:** 2-column grid (Left: transactions/volume | Right: reputation)
- Identity header: Prominent centered bar at top
- Left column: 4 primary stats + divider + 3 secondary stats
- Right column: "Reputation" title + Builder score card + Neynar score card
- Power badge: Top-right header (conditional display)
```

#### UI/UX Gaps Identified
- ✅ **Layout Structure:** BEST in class—2-column grid with clear hierarchy
- ❌ **Font Sizes:** Too many variations (9, 10, 13, 14, 16, 18, 20)—needs standardization
- ❌ **Stats Cards:** All same style—no visual priority (volume = age = builder?)
- ❌ **Color Coding:** No semantic colors (high volume = green, low = yellow)
- ❌ **Power Badge:** Good but could be more prominent

#### Premium Opportunities
- ✨ Typography scale: Reduce to 4 sizes (small 9px, body 12px, large 16px, display 24px)
- ✨ Stats hierarchy: Visual weight (transactions > contracts > volume > balance > age)
- ✨ Color semantics: Green (high), Yellow (medium), Red (low) for value indicators
- ✨ Reputation cards: Add rank badges (Top 1%, Top 10%, etc.)
- ✨ Blue palette: Deep ocean (#0a1a2f) → Electric (#00d4ff) → Ice (#d4f4ff)
- ✨ Power badge: Animated pulse effect hint (border glow)

---

### Frame 6: Leaderboards Frame (Gold #ffd700)
**File:** `app/api/frame/image/route.tsx` (Lines 1770-2000)  
**Screenshot:** `/tmp/phase2-audit/06-leaderboards-frame.png`

#### Current Implementation
```tsx
Typography:
- Title: "Top Performers" fontSize 28, fontWeight 900
- Season: FRAME_FONTS.label (12px), fontWeight 700
- Showing: FRAME_FONTS.label (12px)
- Categories: FRAME_FONTS.caption (10px), fontWeight 600, opacity 0.7

Colors:
- Primary: #ffd700 (gold)
- Secondary: #ffed4e (light gold)
- Gradient: linear-gradient(135deg, #ffd700, #ffed4e)

Layout:
- Icon: 180x180px with 🏆 emoji (100px)
- Right: Title + Info box (3 rows: season, showing top N, categories)
- NO USER INFO (global leaderboard, not personal)
```

#### UI/UX Gaps Identified
- ❌ **Static Display:** Shows metadata (season, limit) but no actual rankings
- ❌ **Gold Palette:** Only 2 shades—needs bronze, silver, gold hierarchy
- ❌ **Trophy Icon:** Large but not interactive
- ❌ **Categories Text:** Small caption—low emphasis

#### Premium Opportunities
- ✨ Podium visual: Top 3 medals (🥇🥈🥉) with user names (if data available)
- ✨ Gold palette: Bronze (#cd7f32) → Silver (#c0c0c0) → Gold (#ffd700) → Platinum (#e5e4e2)
- ✨ Rank badges: Visual indicators (1st = crown, top 10 = star)
- ✨ Trophy animation hint: Shimmer effect on gold gradient
- ✨ Categories: Icon grid (🔥 Streaks | 🎯 Quests | ⚡ XP | 🏅 Badges)

---

### Frame 7: Badge Frame (Gold/Violet #d4af37 + #c77dff)
**File:** `app/api/frame/image/route.tsx` (Lines 2010-2320)  
**Screenshot:** `/tmp/phase2-audit/03-badge-frame.png`

#### Current Implementation
```tsx
Typography:
- Title: "Badge Collection" fontSize 28, fontWeight 900
- Stats labels: FRAME_FONTS.caption (10px), fontWeight 600, opacity 0.7
- Stats values: fontSize 24, fontWeight 900
- XP label: FRAME_FONTS.micro (9px), fontWeight 600, "TOTAL XP FROM BADGES"
- XP value: fontSize 20, fontWeight 900, color #ffd700 (gold)
- Username: fontSize 12, fontWeight 700

Colors:
- Primary: #d4af37 (gold)
- Secondary: #c77dff (violet)
- Dual gradients: Gold border + Violet accents
- XP display: Gold (#ffd700) text with glow

Layout:
- Icon: 120x120px with 🏅 emoji (70px) ✅ GOOD SIZE
- User info: Below icon (120px width box)
- Right: 3 stat cards (Earned, Eligible, Total XP)
```

#### UI/UX Gaps Identified
- ✅ **Icon Size:** 120x120px optimal (not oversized)
- ✅ **Stats Cards:** Individual cards (not single box)—good separation
- ❌ **Dual Colors:** Gold + Violet clash slightly—needs harmonization
- ❌ **XP Display:** Good prominence but cramped label text (9px micro)
- ❌ **Username:** Small box below icon—could be header

#### Premium Opportunities
- ✨ Color harmony: Gold primary (#d4af37) + Amber (#ff8c00) + Violet accent sparingly
- ✨ Badge grid: Show earned badge icons (4-6 mini badges) in left column
- ✨ Collection progress: Visual completion bar (8/15 = 53%)
- ✨ Rarity tiers: Common, Rare, Epic, Legendary badges with different glows
- ✨ XP label: Increase to caption size (10px), reduce text length

---

### Frame 8: Points Frame (Emerald #10b981 + Cyan #06b6d4)
**File:** `app/api/frame/image/route.tsx` (Lines 2330-2690)  
**Screenshot:** `/tmp/phase2-audit/04-points-frame.png`

#### Current Implementation
```tsx
Typography:
- Title: "Points & XP" fontSize 28, fontWeight 900
- Stats labels: FRAME_FONTS.caption (10px), fontWeight 600, opacity 0.7
- Available/Locked: fontSize 20, fontWeight 900
- Level badge: fontSize 16 "LVL {level}", fontWeight 900
- Tier: FRAME_FONTS.caption (10px), fontWeight 700
- XP progress: FRAME_FONTS.micro (9px), opacity 0.7/0.8
- Username: fontSize 12, fontWeight 700

Colors:
- Primary: #10b981 (emerald green)
- Secondary: #06b6d4 (cyan)
- Gradient: linear-gradient(135deg, #10b981, #06b6d4)
- XP progress bar: Gradient fill with glow

Layout:
- Icon: 120x120px with 💰 emoji (70px) ✅ GOOD SIZE
- Right: 3 sections (Available pts, Locked pts, Level + XP bar)
- XP progress bar: 8px height with percentage fill
```

#### UI/UX Gaps Identified
- ✅ **XP Progress Bar:** EXCELLENT visual indicator (best in all frames)
- ✅ **Icon Size:** 120x120px consistent with Badge frame
- ✅ **Level Badge:** Gradient pill badge—good visual
- ❌ **Points Display:** "pts" suffix small—could be more prominent
- ❌ **XP Values:** formatXp() used correctly but small font (9px micro)
- ❌ **Tier Display:** Small caption text—low emphasis

#### Premium Opportunities
- ✨ Points emphasis: Larger font (24px → 28px), remove "pts" suffix
- ✨ XP bar enhancement: Add level milestones markers (Lvl 1, 5, 10, 20)
- ✨ Tier badge: Separate visual badge with icon (🐱 Signal Kitten, ⭐ Star Captain)
- ✨ Emerald/Cyan: Add gold accent for XP values (#ffd700)
- ✨ Progress animation: Shimmer effect on XP bar fill

---

### Frame 9: Referral Frame (Pink #ff6b9d)
**File:** `app/api/frame/image/route.tsx` (Lines 2690-2930, uses default fallback)  
**Screenshot:** `/tmp/phase2-audit/09-referral-frame.png`

#### Current Implementation
```tsx
Status: Uses DEFAULT FALLBACK (onchainstats-style frame)
- No dedicated referral frame handler
- Falls back to generic onchainstats display
- Loses referral-specific context (invite code, rewards)

Typography & Colors:
- Uses onchainstats palette (#00d4ff blue) instead of referral pink
- Missing referral-specific elements
```

#### UI/UX Gaps Identified
- ❌ **NO DEDICATED FRAME:** Uses generic fallback—not referral-specific
- ❌ **Missing Pink Palette:** FRAME_COLORS.referral exists (#ff6b9d) but unused
- ❌ **No Referral Code:** Key feature missing (shareable invite code)
- ❌ **No Rewards Display:** Referral incentives not shown

#### Premium Opportunities
- ✨ **CREATE REFERRAL FRAME:** Dedicated handler with pink palette
- ✨ Referral code: Large centered code (QR code visual + text)
- ✨ Rewards tracking: Successful referrals count + XP earned
- ✨ Pink palette: Rose (#ff6b9d) → Coral (#ff8db4) → Peach (#ffc4d6)
- ✨ Social proof: "Join 1,234 users" with gradient counter

---

## Part 2: Cross-Frame Design System Analysis

### Typography System (Current)
**Source:** `lib/frame-design-system.ts` (Lines 23-31)

```typescript
export const FRAME_FONTS = {
  identity: 20,   // Username/identity headers
  title: 18,      // Main titles (UNUSED in frames—frames use 28px directly)
  subtitle: 16,   // Subtitles (UNUSED)
  body: 14,       // User info text
  label: 12,      // Stats labels (uppercase)
  caption: 10,    // Badges, chain info
  micro: 9,       // Footer, smallest text
}

export const FRAME_WEIGHTS = {
  normal: 400,    // UNUSED (all frames use 600+)
  medium: 600,    // Stats labels
  bold: 700,      // Badges, headers
  black: 900,     // Primary values, titles
}
```

#### Typography Gaps
- ❌ **No Font Family:** Default sans-serif everywhere
- ❌ **Inconsistent Sizes:** Frames use custom sizes (24, 28, 20, 16) bypassing FRAME_FONTS.title/subtitle
- ❌ **No Letter Spacing:** Critical for premium feel (tight headers, loose body)
- ❌ **No Line Height:** Affects readability and visual rhythm
- ❌ **Unused Constants:** FRAME_FONTS.title (18) never used (frames use 28)
- ❌ **Limited Scale:** 7 sizes insufficient for complex hierarchy

#### Typography Recommendations
```typescript
// Premium Font Stack (Phase 2)
export const FRAME_FONT_FAMILY = {
  display: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'SF Mono', 'Monaco', 'Courier New', monospace", // For codes, addresses
}

// Enhanced Font Scale (8-point scale)
export const FRAME_FONTS_V2 = {
  display: 32,      // Hero text (frame titles on hover)
  h1: 28,          // Main frame titles (current hardcoded value)
  h2: 24,          // Primary stat values
  h3: 20,          // Identity headers (current)
  body: 14,        // Standard text (current)
  label: 12,       // Uppercase labels (current)
  caption: 10,     // Secondary info (current)
  micro: 9,        // Footer, fine print (current)
}

// Typographic Controls
export const FRAME_TYPOGRAPHY = {
  letterSpacing: {
    tight: '-0.03em',   // Display, H1, H2 (premium tight)
    normal: '-0.01em',  // H3, body
    wide: '0.05em',     // Labels (uppercase tracking)
  },
  lineHeight: {
    tight: 1.1,         // Display, H1
    normal: 1.4,        // Body, caption
    loose: 1.6,         // Long-form text (if needed)
  },
  textShadow: {
    glow: (color: string) => `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${color}60`,
    strong: '0 2px 8px rgba(0, 0, 0, 0.9)',
    subtle: '0 1px 2px rgba(0, 0, 0, 0.5)',
  },
}
```

---

### Color System (Current)
**Source:** `lib/frame-design-system.ts` (Lines 33-114)

```typescript
export const FRAME_COLORS = {
  gm: { primary: '#7CFF7A', secondary: '#9bffaa', bg: '#0a2a0a', accent: '#ffd700' },
  quest: { primary: '#61DFFF', secondary: '#8dddff', bg: '#0a1a2a', accent: '#ffd700' },
  onchainstats: { primary: '#00d4ff', secondary: '#5ae4ff', bg: '#0a1a2a', accent: '#ffd700' },
  points: { primary: '#10b981', secondary: '#06b6d4', bg: '#0a1a1a', accent: '#ffd700' },
  badge: { primary: '#d4af37', secondary: '#c77dff', bg: '#1a0a1a', accent: '#ffd700' },
  leaderboards: { primary: '#ffd700', secondary: '#ffed4e', bg: '#1a0a2a', accent: '#ff8c00' },
  guild: { primary: '#4da3ff', secondary: '#7dbaff', bg: '#0a1a2a', accent: '#ffd700' },
  verify: { primary: '#7CFF7A', secondary: '#a0ffa0', bg: '#0a2a0a', accent: '#ffd700' },
  referral: { primary: '#ff6b9d', secondary: '#ff8db4', bg: '#1a0a1a', accent: '#ffd700' },
}
```

#### Color System Gaps
- ❌ **4 Colors Only:** Each frame has primary, secondary, bg, accent—insufficient for depth
- ❌ **No Color Scale:** Need 8-10 shades per frame (dark → base → light → tint)
- ❌ **BG Unused:** Background colors defined but frames use hardcoded gradients
- ❌ **Accent Underused:** Gold accent (#ffd700) rarely applied
- ❌ **No Semantic Colors:** Success, warning, error, info states missing
- ❌ **Referral Unused:** Pink palette exists but frame uses fallback

#### Color System Recommendations
```typescript
// Premium Color Palettes (Phase 2)
export const FRAME_COLORS_V2 = {
  gm: {
    50: '#e8ffe8',    // Lightest tint
    100: '#d0ffd0',
    200: '#b8ffb8',
    300: '#9bffaa',   // Current secondary
    400: '#7CFF7A',   // Current primary ← Base
    500: '#5ee05c',   // Darker
    600: '#40c040',
    700: '#2a8028',   // Dark shade
    800: '#0a2a0a',   // Current bg
    900: '#051a05',   // Darkest
    accent: '#ffd700', // Gold
    contrast: '#000000', // Text on light backgrounds
  },
  // Repeat for all 9 frame types...
  
  // Semantic Colors (Global)
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
}

// Gradient Presets (Multi-stop)
export const FRAME_GRADIENTS = {
  gm: 'linear-gradient(135deg, #0a2a0a 0%, #2a8028 20%, #7CFF7A 60%, #9bffaa 80%, #d0ffd0 100%)',
  quest: 'linear-gradient(135deg, #0a1a2a 0%, #3a7aaa 20%, #61DFFF 60%, #8dddff 80%, #d0f0ff 100%)',
  // ...
}
```

---

### Layout System (Current)
**Source:** `lib/frame-design-system.ts` (Lines 116-151)

```typescript
export const FRAME_LAYOUT = {
  // Canvas (full frame)
  width: 600,
  height: 400,
  aspectRatio: '3:2',
  
  // Card dimensions
  cardWidth: 540,
  cardHeight: 360,
  cardMargin: 30,
  
  // Spacing
  padding: 14,
  borderRadius: 12,
  borderWidth: 4,
  
  // Icon sizes
  iconLarge: 180,   // Current: Guild, Quest, Verify (TOO BIG)
  iconMedium: 120,  // Current: Badge, Points (GOOD)
  iconSmall: 60,    // UNUSED
  iconTiny: 24,     // UNUSED (chain icons use 16)
  
  // Gaps
  gapLarge: 16,
  gapMedium: 12,
  gapSmall: 10,
  gapTiny: 8,
  gapMicro: 6,
}
```

#### Layout System Gaps
- ❌ **CONSTANTS UNUSED:** All frames hardcode 540, 360, 14, 12 instead of using FRAME_LAYOUT
- ❌ **Icon Sizes Wrong:** iconLarge (180) too big, iconSmall/Tiny unused
- ❌ **No Responsive Scale:** Fixed values, no multipliers or breakpoints
- ❌ **No Grid System:** No column widths, row heights, grid gaps defined
- ❌ **Inconsistent Icons:** 180px (Guild/Quest/Verify) vs 120px (Badge/Points) vs 100px emoji sizes

#### Layout System Recommendations
```typescript
// Phase 2: Enforced Layout Constants
export const FRAME_LAYOUT_V2 = {
  // Canvas (immutable)
  canvas: { width: 600, height: 400 },
  
  // Card (enforce usage)
  card: {
    width: 540,    // USE THIS: width: FRAME_LAYOUT_V2.card.width
    height: 360,   // USE THIS: height: FRAME_LAYOUT_V2.card.height
    margin: 30,
    padding: 14,   // USE THIS: padding: FRAME_LAYOUT_V2.card.padding
    borderRadius: 12,
    borderWidth: 4,
  },
  
  // Icon sizes (standardized)
  icon: {
    large: 140,    // Hero icons (leaderboards trophy)
    medium: 120,   // Standard icons (badge, points) ← DEFAULT
    small: 80,     // Compact icons (if needed)
    emoji: 100,    // Emoji font size (consistent)
  },
  
  // Spacing scale (4px base)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,        // Current gapMedium
    lg: 16,        // Current gapLarge
    xl: 24,
    xxl: 32,
  },
  
  // Grid system
  grid: {
    columns: { two: '1fr 1fr', leftIcon: '140px 1fr', leftIconCompact: '120px 1fr' },
    gap: 16,
    rowGap: 12,
  },
}

// Usage enforcement
// BAD:  width: 540, height: 360, padding: 14
// GOOD: width: FRAME_LAYOUT_V2.card.width, height: FRAME_LAYOUT_V2.card.height, padding: FRAME_LAYOUT_V2.card.padding
```

---

### Visual Effects (Current)

#### Box Shadows
All frames use similar pattern:
```tsx
boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${color}90, 0 10px 50px rgba(0, 0, 0, 0.8)`
```
- Layer 1: 0 0 0 2px black inset border
- Layer 2: 0 0 40px color glow
- Layer 3: 0 10px 50px black depth shadow

#### Text Shadows
```tsx
textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${color}60`
```
- Layer 1: 0 2px 4px black drop shadow
- Layer 2: 0 0 20px color glow

#### Holographic Shine
```tsx
background: `linear-gradient(180deg, ${color}15, transparent 100%)`
```
- Top 30% of card
- 15% opacity color fade

#### Gaps in Visual Effects
- ❌ **No Depth Layers:** Single gradient, no overlays
- ❌ **No Texture:** No noise, grain, or patterns
- ❌ **Static Shadows:** No hover states or depth variations
- ❌ **No Animation Hints:** No pulse, shimmer, or glow effects

#### Visual Effects Recommendations
```typescript
export const FRAME_EFFECTS = {
  // Layered Shadows (Premium Depth)
  shadow: {
    card: '0 4px 8px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.4), 0 16px 48px rgba(0, 0, 0, 0.5)',
    glow: (color: string) => `0 0 20px ${color}40, 0 0 40px ${color}20, 0 0 60px ${color}10`,
    inset: 'inset 0 1px 2px rgba(255, 255, 255, 0.1), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
  },
  
  // Texture Overlays
  texture: {
    noise: 'url("data:image/svg+xml,...")', // SVG noise pattern
    grain: 'url("data:image/svg+xml,...")', // Subtle grain
    holographic: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
  },
  
  // Border Effects
  border: {
    gradient: (color1: string, color2: string) => `linear-gradient(135deg, ${color1}, ${color2})`,
    glow: (color: string) => `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 20px ${color}60`,
  },
}
```

---

## Part 3: Priority Rankings

### Critical Issues (Phase 2 Layer 1: Must Fix)
1. **Typography Foundation** (8 hours)
   - Add font family declarations (Inter, SF Pro Display)
   - Implement letter-spacing controls
   - Add line-height specifications
   - Create FRAME_FONT_FAMILY constant

2. **Layout Constant Enforcement** (6 hours)
   - Replace all hardcoded 540, 360, 14, 12 with FRAME_LAYOUT_V2
   - Standardize icon sizes (120px default, 140px hero)
   - Fix emoji sizes (consistent 100px)
   - Implement grid system

3. **Create Referral Frame** (4 hours)
   - Dedicated handler (currently uses fallback)
   - Pink palette implementation
   - Referral code display
   - Rewards tracking

4. **Color Palette Expansion** (6 hours)
   - Expand each frame from 4 colors to 8-10 shades
   - Add semantic colors (success, warning, error)
   - Create multi-stop gradients
   - Implement accent color usage

**Total Layer 1:** 24 hours

---

### High Priority (Phase 2 Layer 2: Visual Enhancement)
5. **Enhanced Shadows & Depth** (4 hours)
   - Layered box shadows (3-4 layers)
   - Stronger glow effects
   - Inset highlights
   - Border gradients

6. **OnchainStats Layout Template** (3 hours)
   - Extract 2-column grid as reusable template
   - Apply to other frames (GM, Quest)
   - Standardize stat card styling

7. **XP Progress Bar Component** (3 hours)
   - Extract Points frame XP bar as reusable component
   - Add to Quest frame (quest progress)
   - Add level milestone markers

8. **Badge/Points Icon Optimization** (2 hours)
   - Maintain 120x120px size (already correct)
   - Enhance user info box styling
   - Improve visual balance

**Total Layer 2:** 12 hours

---

### Medium Priority (Phase 2 Layer 3: Rich Features)
9. **Gradient Enhancements** (4 hours)
   - Multi-stop gradients (5+ stops)
   - Texture overlays (noise, grain)
   - Holographic foil effects

10. **Status & State Indicators** (3 hours)
    - Color-coded badges (Verify frame: ✅⏳❌)
    - Progress indicators (Quest countdown)
    - Visual hierarchy (OnchainStats value coloring)

11. **Typography Hierarchy** (3 hours)
    - Reduce font size variations (9→12→16→24→32)
    - Implement tight letter-spacing (-0.03em headers)
    - Enhance text shadows with glow

12. **Leaderboards Podium** (3 hours)
    - Add Top 3 display (🥇🥈🥉)
    - User name cards
    - Rank badges

**Total Layer 3:** 13 hours

---

### Low Priority (Phase 2 Layer 4: Polish)
13. **Animation Hints** (2 hours)
    - Power badge pulse effect
    - XP bar shimmer
    - Trophy shine

14. **Rarity System** (2 hours)
    - Badge tiers (Common, Rare, Epic, Legendary)
    - Different glow colors per tier

15. **Social Proof** (2 hours)
    - Referral frame: "Join 1,234 users"
    - Guild frame: Member activity indicators

16. **Accessibility** (2 hours)
    - Contrast ratio validation
    - Text legibility checks
    - Icon alt text (already present)

**Total Layer 4:** 8 hours

---

## Part 4: Implementation Roadmap

### Phase 2 Total Estimate: 57 hours (7-8 days)

### Week 1: Foundation (Days 1-3)
- **Day 1:** Typography foundation (8h)
  - Font family implementation
  - Letter-spacing, line-height
  - FRAME_FONTS_V2 migration
  
- **Day 2:** Layout enforcement (6h) + Referral frame (4h)
  - Replace hardcoded values with FRAME_LAYOUT_V2
  - Create dedicated referral handler
  
- **Day 3:** Color palette expansion (6h)
  - 8-10 shade scales per frame
  - Multi-stop gradients

### Week 2: Enhancement (Days 4-6)
- **Day 4:** Visual depth (7h)
  - Layered shadows
  - Glow effects
  - OnchainStats template extraction
  
- **Day 5:** Components & Features (8h)
  - XP progress bar component
  - Status indicators
  - Badge/Points optimization
  
- **Day 6:** Rich features (9h)
  - Gradient enhancements
  - Typography hierarchy
  - Leaderboards podium

### Week 3: Polish (Day 7)
- **Day 7:** Final polish (8h)
  - Animation hints
  - Rarity system
  - Social proof
  - Accessibility validation

---

## Part 5: Success Metrics

### Before Phase 2 (Current State)
- ❌ Default sans-serif fonts
- ❌ 2-4 colors per frame
- ❌ Hardcoded layout values
- ❌ Basic shadows (3 layers)
- ❌ No referral frame
- ❌ Inconsistent icon sizes (180px vs 120px)

### After Phase 2 (Target State)
- ✅ Premium font stack (Inter, SF Pro Display)
- ✅ 8-10 color shades per frame
- ✅ FRAME_LAYOUT_V2 constants enforced (0 hardcoded values)
- ✅ Layered shadows (4-5 layers with glows)
- ✅ Dedicated referral frame with pink palette
- ✅ Consistent icon sizes (120px standard, 140px hero)
- ✅ XP progress bars (Points + Quest frames)
- ✅ Multi-stop gradients (5+ stops)
- ✅ Status indicators (color-coded badges)
- ✅ Typography hierarchy (tight letter-spacing, enhanced shadows)

### Visual Quality Comparison
```
Current:  ████████░░ 8/10 (Functional, basic aesthetics)
Phase 2:  ██████████ 10/10 (Premium, rich, polished)
```

---

## Appendix A: Frame Comparison Matrix

| Frame | Icon Size | Colors | Layout | Typography | Visual Depth | Premium Score |
|-------|-----------|--------|--------|------------|--------------|---------------|
| GM | N/A (2-col) | 2 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 7/10 |
| Guild | 180px ❌ | 2 | ⭐⭐ | ⭐⭐ | ⭐⭐ | 6/10 |
| Verify | 180px ❌ | 2 | ⭐⭐ | ⭐⭐ | ⭐⭐ | 6/10 |
| Quest | 180px ❌ | 2 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 7/10 |
| OnchainStats | Header | 2 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | **9/10** 🏆 |
| Leaderboards | 180px ❌ | 2 | ⭐⭐ | ⭐⭐ | ⭐⭐ | 6/10 |
| Badge | 120px ✅ | 2 | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | 8/10 |
| Points | 120px ✅ | 2 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | **8/10** 🥈 |
| Referral | N/A ❌ | 0 ❌ | ⭐ | ⭐ | ⭐ | **2/10** ❌ |

**Best Layout:** OnchainStats (2-column grid, clear hierarchy)  
**Best Visual:** Points (XP progress bar, gradient cards)  
**Needs Most Work:** Referral (no dedicated frame), Guild/Verify (oversized icons)

---

## Appendix B: Code Examples

### Before (Current):
```tsx
// Hardcoded values, default fonts
<div style={{
  width: 540,              // ❌ Hardcoded
  height: 360,             // ❌ Hardcoded
  padding: 14,             // ❌ Hardcoded
  fontSize: 28,            // ❌ Not using FRAME_FONTS
  fontWeight: 900,
  color: '#ffffff',        // ✅ OK
}}>
  {questName}
</div>
```

### After (Phase 2):
```tsx
// Premium fonts, enforced constants
<div style={{
  width: FRAME_LAYOUT_V2.card.width,           // ✅ Constant
  height: FRAME_LAYOUT_V2.card.height,         // ✅ Constant
  padding: FRAME_LAYOUT_V2.card.padding,       // ✅ Constant
  fontFamily: FRAME_FONT_FAMILY.display,       // ✅ Premium font
  fontSize: FRAME_FONTS_V2.h1,                 // ✅ Semantic size
  fontWeight: FRAME_WEIGHTS.black,             // ✅ Named weight
  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, // ✅ Premium control
  lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,       // ✅ Rhythm
  color: FRAME_COLORS_V2.quest[400],           // ✅ Shade scale
  textShadow: FRAME_TYPOGRAPHY.textShadow.glow(FRAME_COLORS_V2.quest[400]), // ✅ Enhanced
}}>
  {questName}
</div>
```

---

## Conclusion

Phase 2 will transform the Gmeowbased frame system from **functional** to **premium**. The audit identified 3 critical gaps:

1. **Typography:** Default sans-serif → Premium Inter/SF Pro stack
2. **Colors:** 2-4 colors → 8-10 shade scales with multi-stop gradients
3. **Layout:** Hardcoded values → Enforced FRAME_LAYOUT_V2 constants

**Estimated effort:** 57 hours (7-8 days)  
**Expected outcome:** 10/10 premium visual quality, rich user experience, consistent brand identity

Next step: Proceed to **PHASE-2-PLANNING.md** for detailed task breakdown.
