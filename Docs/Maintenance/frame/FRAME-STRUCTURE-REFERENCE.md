# Frame Structure Reference Guide
**Version**: Phase 2.1 Complete  
**Date**: November 23, 2025  
**Purpose**: Quick reference for reviewing frame layouts, colors, fonts, and spacing

---

## Table of Contents
1. [GM Frame](#1-gm-frame)
2. [Guild Frame](#2-guild-frame)
3. [Verify Frame](#3-verify-frame)
4. [Quest Frame](#4-quest-frame)
5. [OnchainStats Frame](#5-onchainstats-frame)
6. [Leaderboard Frame](#6-leaderboard-frame)
7. [Badge Collection Frame](#7-badge-collection-frame)
8. [Badge Single Frame (badgeShare)](#8-badge-single-frame)
9. [Points Frame](#9-points-frame)
10. [Referral Frame](#10-referral-frame)

---

## 1. GM Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [GM Badge]                            [Chain Icon] Base    │ ← Header
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    [@username/address]                     │ ← Identity (centered)
│                                                            │
├────────────────────────────────────────────────────────────┤
│              🔥 X-Day Streak (if >= 7)                     │ ← Streak Badge (prominent)
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │   GM COUNT       │  │   TOTAL GMs      │              │ ← Stats Grid (2 cols)
│  │   [42]           │  │   [150]          │              │
│  └──────────────────┘  └──────────────────┘              │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ 👑 Week Warrior  │  │ 💯 Century Club  │              │
│  │ (if earned)      │  │ (if earned)      │              │
│  └──────────────────┘  └──────────────────┘              │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Chain                   │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
// Frame Colors
gmPalette = {
  start: FRAME_COLORS.gm.primary,    // Orange gradient start
  end: FRAME_COLORS.gm.secondary     // Orange gradient end
}

// Text Colors (Phase 2.1 Fixed)
GM Badge: SHARED_COLORS.white + textShadow.strong
Chain text: rgba(255, 255, 255, 0.85)
Identity: SHARED_COLORS.white + textShadow.glow(gmPalette.start)
Streak: SHARED_COLORS.white + textShadow.strong  ✅ FIXED (was black)
Count numbers: SHARED_COLORS.white + textShadow.strong
Labels: rgba(255, 255, 255, 0.75)  ✅ FIXED (was opacity 0.5)
Footer: rgba(255, 255, 255, 0.75)
```

### Typography
```typescript
GM Badge: FRAME_FONTS_V2.caption (12px), weight 700
Chain: FRAME_FONTS_V2.caption (12px), weight 600
Identity: FRAME_FONTS_V2.h3 (20px), weight 900
Streak: FRAME_FONTS_V2.h2 (24px), weight 900
Count numbers: FRAME_FONTS_V2.display (32px), weight 900
Labels: FRAME_FONTS_V2.caption (12px), weight 600
Footer: FRAME_FONTS_V2.caption (12px), weight 600
```

### Spacing
```typescript
Container padding: FRAME_SPACING.container (14px)
Header margin: FRAME_SPACING.margin.header (12px)
Section margin: FRAME_SPACING.margin.section (16px)
Stats grid gap: FRAME_SPACING.section.medium (16px)
Badge padding: FRAME_SPACING.padding.large (20px)
```

### Known Issues
- ✅ Black streak text - FIXED (now white with strong shadow)
- ✅ GM badge text - FIXED (now white with strong shadow)
- ✅ Chain text opacity - FIXED (now rgba)

---

## 2. Guild Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [GUILD Badge]                         [Chain Icon] Base    │
├────────────────────────────────────────────────────────────┤
│                   [Guild Icon 120px]                       │ ← Guild Icon
│                                                            │
│                     Guild Name                             │
│                     [@username]                            │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ 🎯 QUESTS        │  │ ⭐ Level X       │              │
│  │   [5]            │  │                  │              │
│  └──────────────────┘  └──────────────────┘              │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Chain                   │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
guildPalette = {
  start: FRAME_COLORS.guild.primary,
  end: FRAME_COLORS.guild.secondary
}

// Text Colors
GUILD Badge: SHARED_COLORS.white + textShadow.strong
Guild name: SHARED_COLORS.white + textShadow.glow(guildPalette.start)
Username: SHARED_COLORS.white + textShadow.subtle
Labels: rgba(255, 255, 255, 0.75)  ✅ FIXED
Numbers: SHARED_COLORS.white + textShadow.strong
Footer: rgba(255, 255, 255, 0.75)  ✅ FIXED
```

### Typography
```typescript
GUILD Badge: FRAME_FONTS_V2.caption (12px), weight 700
Guild name: FRAME_FONTS_V2.h1 (28px), weight 900
Username: FRAME_FONTS_V2.body (16px), weight 700
Labels: FRAME_FONTS_V2.caption (12px), weight 600
Numbers: FRAME_FONTS_V2.display (32px), weight 900
```

---

## 3. Verify Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [VERIFY Badge]                        [Chain Icon] Base    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌─────────────────────────────┐   │
│  │                  │  │  Quest Verified              │   │
│  │  [Quest Icon]    │  │                              │   │
│  │  120x120px       │  │  [@username]  ← User box     │   │
│  │                  │  │                              │   │
│  │                  │  │  Description...              │   │
│  └──────────────────┘  │                              │   │
│                        │  Reward: X XP                │   │
│                        └─────────────────────────────┘   │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Quest ID                │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
verifyPalette = {
  start: FRAME_COLORS.verify.primary,
  end: FRAME_COLORS.verify.secondary
}

// Text Colors (Phase 2.1 Fixed)
VERIFY Badge: SHARED_COLORS.white + textShadow.strong  ✅ FIXED (was black)
Quest title: SHARED_COLORS.white + textShadow.glow(verifyPalette.start)
Username: SHARED_COLORS.white + textShadow.subtle  ✅ FIXED (was black)
Description: rgba(255, 255, 255, 0.85)
Labels: rgba(255, 255, 255, 0.75)  ✅ FIXED
Footer: rgba(255, 255, 255, 0.75)  ✅ FIXED
```

### Typography
```typescript
VERIFY Badge: FRAME_FONTS_V2.caption (12px), weight 700
Quest title: FRAME_FONTS_V2.h1 (28px), weight 900
Username: FRAME_FONTS_V2.body (16px), weight 800
Description: FRAME_FONTS_V2.label (14px), weight 600
Reward: FRAME_FONTS_V2.body (16px), weight 700
```

### Known Issues
- ✅ VERIFY badge black text - FIXED
- ✅ @username black text - FIXED

---

## 4. Quest Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [QUEST Badge]                         [Chain Icon] Base    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌─────────────────────────────┐   │
│  │                  │  │  Quest Name                  │   │
│  │  [Quest Icon]    │  │                              │   │
│  │  🎯 180px        │  │  Description box             │   │
│  │                  │  │                              │   │
│  │                  │  │  📊 Slots: X/Y               │   │
│  │                  │  │  ⏰ Expires: Date            │   │
│  └──────────────────┘  │  🎁 Reward: X XP             │   │
│                        └─────────────────────────────┘   │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Quest                   │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
questPalette = {
  start: FRAME_COLORS.quest.primary,
  end: FRAME_COLORS.quest.secondary
}

// Text Colors
QUEST Badge: SHARED_COLORS.white + textShadow.strong
Quest name: SHARED_COLORS.white + textShadow.glow(questPalette.start)
Description: rgba(255, 255, 255, 0.85)
Labels: rgba(255, 255, 255, 0.75)  ✅ FIXED
Stats: SHARED_COLORS.white + textShadow.strong
Footer: rgba(255, 255, 255, 0.75)  ✅ FIXED
```

### Typography
```typescript
QUEST Badge: FRAME_FONTS_V2.caption (12px), weight 700
Quest icon: fontSize 80 (emoji)
Quest name: FRAME_FONTS_V2.h1 (28px), weight 900
Description: FRAME_FONTS_V2.label (14px), weight 600
Stats labels: FRAME_FONTS_V2.caption (12px), weight 600
Stats values: FRAME_FONTS_V2.body (16px), weight 700
```

---

## 5. OnchainStats Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [ONCHAIN Badge]                    [⚡ Power Badge]        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌─────────────────────────────┐   │
│  │                  │  │  [@username]                 │   │
│  │  Stats Grid:     │  │                              │   │
│  │                  │  │  📊 Transactions: X          │   │
│  │  AGE: X years    │  │  📝 Contracts: Y             │   │
│  │  FIRST TX: Date  │  │  💰 Volume: Z ETH            │   │
│  │  LAST TX: Date   │  │  💵 Balance: W ETH           │   │
│  │                  │  │                              │   │
│  │  BUILDER: High   │  │  ⭐ Neynar: 0.95             │   │
│  │  POWER: Yes      │  │                              │   │
│  └──────────────────┘  └─────────────────────────────┘   │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Base                    │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
statsPalette = {
  start: FRAME_COLORS.onchainstats.primary,
  end: FRAME_COLORS.onchainstats.secondary
}

// Text Colors (CHECK NEEDED)
ONCHAIN Badge: SHARED_COLORS.white + textShadow.strong
Power Badge: SHARED_COLORS.gold (background), text should be white
Username: SHARED_COLORS.white + textShadow.strong
Labels: rgba(255, 255, 255, 0.75)  ✅ FIXED
Values: SHARED_COLORS.white
Footer: rgba(255, 255, 255, 0.75)  ✅ FIXED
```

### Typography
```typescript
ONCHAIN Badge: FRAME_FONTS_V2.caption (12px), weight 700
Power Badge: FRAME_FONTS_V2.micro (10px), weight 800
Username: FRAME_FONTS_V2.h1 (28px), weight 900
Labels: FRAME_FONTS_V2.caption (12px), weight 600
Values: FRAME_FONTS_V2.body (16px), weight 700
```

### Known Issues
- ⚠️ Need to verify Power Badge text color
- ⚠️ Check if any black text remains in stats labels

---

## 6. Leaderboard Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [LEADERBOARD Badge]                   [Chain Icon] Base    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                   🏆 Top Performers                        │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  SEASON: Season 1                                   │  │
│  │  SHOWING: Top 10                                    │  │
│  │  GM Streaks • Quests • XP • Badges                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  1. @user1 ─────────────────── 1,234 pts                  │
│  2. @user2 ─────────────────── 1,123 pts                  │
│  3. @user3 ─────────────────── 1,012 pts                  │
│  ...                                                       │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Season                  │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
leaderboardPalette = {
  start: FRAME_COLORS.leaderboards.primary,
  end: FRAME_COLORS.leaderboards.secondary
}

// Text Colors
LEADERBOARD Badge: SHARED_COLORS.white + textShadow.strong
Title: SHARED_COLORS.white + textShadow.glow(leaderboardPalette.start)
Info labels: opacity 0.7
Info values: leaderboardPalette.start
Usernames: SHARED_COLORS.white + textShadow.subtle
Points: SHARED_COLORS.white + textShadow.strong
Footer: rgba(255, 255, 255, 0.75)  ✅ FIXED
```

---

## 7. Badge Collection Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [BADGE COLLECTION]                    [GMEOW Icon]         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌─────────────────────────────┐   │
│  │                  │  │  Badge Collection            │   │
│  │  Badge Grid:     │  │                              │   │
│  │                  │  │  [@username]                 │   │
│  │  ┌───┐ ┌───┐    │  │  FID: xxxxx                  │   │
│  │  │IMG│ │IMG│    │  │                              │   │
│  │  │56 │ │56 │    │  │  📊 X EARNED BADGES          │   │
│  │  └───┘ └───┘    │  │  🎯 Y ELIGIBLE FOR           │   │
│  │  Name  Name      │  │  ⭐ Z XP FROM BADGES         │   │
│  │                  │  │                              │   │
│  │  ┌───┐ ┌───┐    │  │  Power User Bonus: +X%       │   │
│  │  │IMG│ │IMG│    │  │                              │   │
│  │  └───┘ └───┘    │  │                              │   │
│  │  Name  Name      │  │                              │   │
│  │  (up to 9)       │  │                              │   │
│  └──────────────────┘  └─────────────────────────────┘   │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Badges                  │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
badgePalette = {
  start: FRAME_COLORS.badge.primary,
  end: FRAME_COLORS.badge.secondary
}

// Tier Colors (Badge Borders)
tierColors = {
  common: '#D3D7DC',     // Gray
  rare: '#A18CFF',       // Purple
  epic: '#61DFFF',       // Cyan
  legendary: '#FFD966',  // Gold
  mythic: '#9C27FF'      // Magenta
}

// Text Colors
BADGE COLLECTION: SHARED_COLORS.white + textShadow.strong
Badge names: SHARED_COLORS.white (8px font)
Username: SHARED_COLORS.white + textShadow.glow(badgePalette.start)
Stats: SHARED_COLORS.white + textShadow.strong
Footer: rgba(255, 255, 255, 0.75)
```

### Typography
```typescript
Badge names: fontSize 8, weight 600 (below 56x56 images)
Username: FRAME_FONTS_V2.h1 (28px), weight 900
Stats labels: FRAME_FONTS_V2.caption (12px), weight 600
Stats values: FRAME_FONTS_V2.h2 (24px), weight 900
```

### Badge Card Specs
```typescript
Badge image: 56x56px PNG from /public/badges/
Card border: 2px solid {tierColor}
Card padding: 4px
Card gap: 8px
Max badges: 9 (3x3 grid)
```

### Known Issues from Attachment
- ⚠️ Lines 34-90 updated - need verification
- ⚠️ Font usage needs checking (might be using old font)

---

## 8. Badge Single Frame (badgeShare)

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [Tier Badge]                                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐  ┌─────────────────────────────┐   │
│  │                  │  │  Badge Name                  │   │
│  │  [Badge Image]   │  │  (Large, prominent)          │   │
│  │  180x180px       │  │                              │   │
│  │                  │  │  Description box             │   │
│  │                  │  │  (Badge description text)    │   │
│  │  ┌─────────────┐ │  │                              │   │
│  │  │ 👤 @user    │ │  │  Earned: Nov 2024            │   │
│  │  │ ⭐ Score    │ │  │  MINTED: Nov 15, 2024        │   │
│  │  └─────────────┘ │  │                              │   │
│  └──────────────────┘  └─────────────────────────────┘   │
│                                                            │
│              @gmeowbased • badge-id                        │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
// Uses tier gradient
tierGradient = {
  legendary: { start: '#FFD700', end: '#FFA500' },
  epic: { start: '#00FFFF', end: '#0099FF' },
  rare: { start: '#FF00FF', end: '#CC00FF' },
  common: { start: '#808080', end: '#606060' }
}

// Text Colors
Tier badge: White on tier gradient background
Badge name: SHARED_COLORS.white + strong shadow
Username: SHARED_COLORS.white
Neynar score: tierGradient.start
Description: rgba(255, 255, 255, 0.85)
Footer: rgba(255, 255, 255, 0.7)
```

### Typography
```typescript
Tier badge: fontSize 10, weight 700
Badge name: fontSize 28, weight 900
Username: fontSize 13, weight 800
Neynar score: fontSize 12, weight 700
Description: fontSize 9, weight 600
Stats: fontSize 9, weight 600
```

### Known Issues
- ⚠️ Font usage needs checking (might not match FRAME_FONTS_V2)

---

## 9. Points Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [POINTS Badge]                        [Chain Icon] Base    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                       💰 (70px)                            │
│                                                            │
│                   [@username]                              │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            XP BREAKDOWN                             │  │
│  │                                                     │  │
│  │  GM Points:        X                                │  │
│  │  Quest Points:     Y                                │  │
│  │  Badge Points:     Z                                │  │
│  │  Referral Points:  W                                │  │
│  │  ─────────────────────                              │  │
│  │  TOTAL XP:         T                                │  │
│  └─────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Points                  │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
pointsPalette = {
  start: FRAME_COLORS.points.primary,
  end: FRAME_COLORS.points.secondary
}

// Text Colors
POINTS Badge: SHARED_COLORS.white + textShadow.strong
Username: SHARED_COLORS.white + textShadow.glow(pointsPalette.start)
Labels: rgba(255, 255, 255, 0.75)  ✅ FIXED
Values: SHARED_COLORS.white + textShadow.strong
Total: SHARED_COLORS.white + textShadow.strong
Footer: rgba(255, 255, 255, 0.75)  ✅ FIXED
```

---

## 10. Referral Frame

### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│ [REFERRAL Badge]                      [Chain Icon] Base    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                       🤝 (80px)                            │
│                                                            │
│                   Invite Friends                           │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Join Gmeowbased and earn rewards!                  │  │
│  │                                                     │  │
│  │  Referred by: @username                             │  │
│  │                                                     │  │
│  │  🎁 Get 100 XP on signup                            │  │
│  │  🌟 Earn 50 XP per referral                         │  │
│  │  🏆 Unlock exclusive badges                         │  │
│  └─────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│              FOOTER: @gmeowbased • Referral                │
└────────────────────────────────────────────────────────────┘
```

### Color Palette
```typescript
referralPalette = {
  start: FRAME_COLORS.referral.primary,
  end: FRAME_COLORS.referral.secondary
}

// Text Colors
REFERRAL Badge: SHARED_COLORS.white + textShadow.strong
Title: SHARED_COLORS.white + textShadow.glow(referralPalette.start)
Description: rgba(255, 255, 255, 0.85)
Benefits: SHARED_COLORS.white
Footer: rgba(255, 255, 255, 0.75)  ✅ FIXED
```

---

## Design System Tokens Reference

### Colors (All Frames)
```typescript
// Shared Colors
SHARED_COLORS = {
  white: '#ffffff',
  black: '#000000',
  gold: '#ffd700',
  darkBg: '#0a0a0a',
  cardBg: 'rgba(30, 30, 32, 0.6)',
  cardBorder: 'rgba(255, 255, 255, 0.2)'
}

// Tier Colors (Badge frames)
TIER_COLORS = {
  mythic: '#9C27FF',
  legendary: '#FFD966',
  epic: '#61DFFF',
  rare: '#A18CFF',
  common: '#D3D7DC'
}
```

### Typography
```typescript
FRAME_FONTS_V2 = {
  display: 32,  // Large numbers, hero text
  h1: 28,       // Primary titles
  h2: 24,       // Secondary titles
  h3: 20,       // Tertiary titles
  body: 16,     // Body text
  label: 14,    // Small labels
  caption: 12,  // Captions, badges
  micro: 10     // Tiny text
}

FRAME_TYPOGRAPHY.textShadow = {
  glow: (color) => `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${color}60`,
  strong: '0 2px 8px rgba(0, 0, 0, 0.9)',
  subtle: '0 1px 2px rgba(0, 0, 0, 0.5)'
}
```

### Spacing
```typescript
FRAME_SPACING = {
  container: 14,
  margin: {
    header: 12,
    section: 16,
    footer: 10
  },
  padding: {
    minimal: 6,
    small: 8,
    medium: 12,
    large: 20,
    box: 10
  },
  section: {
    minimal: 2,
    tight: 4,
    inline: 6,
    small: 8,
    medium: 16,
    large: 24
  },
  icon: {
    iconLarge: 180,   // Large images
    iconMedium: 120,  // Medium images
    iconSmall: 60,    // Small images
    iconTiny: 24      // Tiny images
  }
}
```

---

## Common Issues Checklist

### Text Readability
- [ ] No black text on gradient backgrounds
- [ ] All text has proper textShadow (glow/strong/subtle)
- [ ] Labels use rgba instead of opacity
- [ ] Footer text visible (rgba(255,255,255,0.75))

### Typography Consistency
- [ ] Using FRAME_FONTS_V2 tokens (not hardcoded sizes)
- [ ] Font weights consistent (700 for badges, 900 for titles)
- [ ] Letter spacing from FRAME_TYPOGRAPHY

### Color Consistency
- [ ] Using SHARED_COLORS for white/black/gold
- [ ] Using TIER_COLORS for badge tiers
- [ ] Using FRAME_COLORS for frame-specific palettes
- [ ] No hardcoded hex colors

### Spacing Consistency
- [ ] Using FRAME_SPACING tokens
- [ ] Container padding consistent (14px)
- [ ] Section gaps consistent
- [ ] No magic number spacing

### Badge Frames Specific
- [ ] Badge images 56x56 for collection, 180x180 for single
- [ ] Tier-colored borders (2px solid)
- [ ] Badge names visible (8px font for collection)
- [ ] Using FRAME_FONTS_V2 or custom sizes? ← CHECK NEEDED

---

## Quick Audit Commands

### Search for Black Text
```bash
grep -n "color: SHARED_COLORS.black\|color: '#000000'\|color: 'black'" app/api/frame/image/route.tsx
```

### Search for Hardcoded Colors
```bash
grep -n "color: '#[0-9a-fA-F]'" app/api/frame/image/route.tsx | grep -v "SHARED_COLORS\|TIER_COLORS\|FRAME_COLORS"
```

### Search for Opacity (should be rgba)
```bash
grep -n "opacity: 0\.[0-9]" app/api/frame/image/route.tsx
```

### Search for Hardcoded Font Sizes
```bash
grep -n "fontSize: [0-9]" app/api/frame/image/route.tsx | grep -v "FRAME_FONTS_V2"
```

---

## Next Steps

1. ✅ **Phase 2.1 Complete**: All 5 tasks done
2. ⏳ **Verify Fixes**: Check screenshots for remaining issues
3. ⏳ **Badge Font Audit**: Verify badgeShare uses correct fonts
4. ⏳ **Production Test**: Test all frames on gmeowhq.art

---

**Last Updated**: November 23, 2025  
**Version**: Phase 2.1 + Readability Fixes  
**Status**: ✅ Ready for Review
