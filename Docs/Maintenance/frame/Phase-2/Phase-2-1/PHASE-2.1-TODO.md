# Phase 2.1: Frame Quality Improvements - TODO List

**Status**: IN PROGRESS  
**Started**: 2025-11-23  
**Last Updated**: 2025-11-23

---

## Overview

Phase 2.1 addresses quality issues in frame images identified during Phase 2 audit:
- 10% missing implementation issues (badge collection, text readability, shadows, colors, icons)
- Focus on visual consistency and design system compliance

---

## Task Status

### ✅ Task 2.1.1: Badge Collection Display (COMPLETED)
**Status**: ✅ FIXED  
**Commit**: 9d570dd
**Priority**: HIGH  
**Files Modified**: 
- `app/api/frame/route.tsx` (extract badge IDs)
- `app/api/frame/image/route.tsx` (load images, display cards)

**Changes**:
- ✅ Extract badge IDs from user_badges query
- ✅ Load actual badge PNG images from `/public/badges/`
- ✅ Display badge images (56x56px) with names below
- ✅ Add tier-based card borders (gold/cyan/magenta/gray/purple)
- ✅ Grid layout: up to 9 badges (3 columns)
- ✅ Badge registry metadata inline

---

### ✅ Task 2.1.2: Text Readability Fixes (COMPLETED)
**Status**: ✅ FIXED
**Commit**: 52b2100
**Priority**: HIGH  
**Time Taken**: 40 minutes

**Changes**:
- ✅ Fixed 24 opacity issues across 9 frame types
- ✅ Replaced opacity 0.5-0.6 with rgba(255, 255, 255, 0.75-0.85)
- ✅ Improved WCAG AA compliance (contrast ratio ≥ 4.5:1)
- ✅ Kept placeholder emoji at opacity 0.3 (intended disabled state)

**Frames Fixed**:
- GM frame: Week Warrior, Century Club labels
- Guild frame: QUESTS, Level labels + footer
- Verify frame: Quest label + footer
- Quest frame: SLOTS, Expires labels + footer
- OnchainStats frame: Age, FirstTX, LastTX labels + footer
- Leaderboard, Badge, Points, Referral frames: footers + labels

---

### ✅ Task 2.1.3: Text Shadow Standardization (COMPLETED)
**Status**: ✅ FIXED
**Commit**: a4ee072
**Priority**: MEDIUM  
**Time Taken**: 25 minutes

**Changes**:
- ✅ Standardized 17 text shadow instances
- ✅ Use FRAME_TYPOGRAPHY.textShadow tokens:
  * `glow(color)` - Display titles with color param
  * `strong` - Emphasized numbers/counts
  * `subtle` - Usernames and secondary text
- ✅ Consistent shadow application across all frames

---

### ⏳ Task 2.1.4: Color Palette Adoption (32 hardcoded colors)
**Status**: TODO  
**Priority**: HIGH  
**Estimated Time**: 60 minutes

**Audit Results**:
```
Total hardcoded colors: 32 instances
- Hex colors: #ffffff, #808080, #FFD700, etc.
- Inline rgba() values
- Not using FRAME_COLORS tokens
```

**Required Changes**:
- [ ] Map hardcoded colors to FRAME_COLORS tokens:
  ```typescript
  #ffffff → FRAME_COLORS.text.primary
  #808080 → FRAME_COLORS.text.muted
  #FFD700 → FRAME_COLORS.accent.gold
  #00FFFF → FRAME_COLORS.accent.cyan
  #FF00FF → FRAME_COLORS.accent.magenta
  ```
- [ ] Replace all 32 hardcoded instances
- [ ] Ensure color consistency across frames
- [ ] Document color usage patterns

**Files to Modify**:
- `app/api/frame/image/route.tsx` (32 replacements)
- Possibly add new FRAME_COLORS tokens if needed

**Testing**:
- [ ] Visual comparison: Colors match design system
- [ ] No color regression across frame types

---

### ⏳ Task 2.1.5: Icon Size Standardization (14 hardcoded values)
**Status**: TODO  
**Priority**: MEDIUM  
**Estimated Time**: 30 minutes

**Audit Results**:
```
Total hardcoded icon sizes: 14 instances
- fontSize: 70, 60, 50, 40, 32, 28, 24, 20, 16
- Inconsistent sizing across frames
- Not using FRAME_FONTS_V2 scale
```

**Required Changes**:
- [ ] Map icon sizes to standard scale:
  ```typescript
  FRAME_ICON_SIZES = {
    hero: 70,      // Main frame icon
    large: 50,     // Section headers
    medium: 32,    // Body icons
    small: 20,     // Inline icons
    tiny: 16       // Badges/indicators
  }
  ```
- [ ] Replace all 14 hardcoded icon sizes
- [ ] Ensure visual hierarchy consistency
- [ ] Test icon scaling on different screen sizes

**Files to Modify**:
- `app/api/frame/image/route.tsx` (14 replacements)

**Testing**:
- [ ] Visual hierarchy maintained
- [ ] Icon sizes proportional across frames

---

## Implementation Strategy

### Phase Order
1. ✅ Task 2.1.1: Badge Collection (COMPLETED - critical user-facing)
2. ⏳ Task 2.1.2: Text Readability (HIGH - accessibility)
3. ⏳ Task 2.1.4: Color Palette (HIGH - design consistency)
4. ⏳ Task 2.1.3: Text Shadows (MEDIUM - polish)
5. ⏳ Task 2.1.5: Icon Sizes (MEDIUM - refinement)

### Testing Protocol
- Local testing before each commit
- Visual comparison screenshots
- Frame validator testing
- Production deployment testing

---

## Progress Tracking

### Completed
- [x] Task 2.1.1: Badge Collection Display
  - Badge images loaded
  - Badge names displayed
  - Tier colors applied
  - Grid layout implemented

### In Progress
- [ ] Task 2.1.2: Text Readability (NEXT)

### Pending
- [ ] Task 2.1.3: Text Shadows
- [ ] Task 2.1.4: Color Palette
- [ ] Task 2.1.5: Icon Sizes

---

## Commit Strategy

### Task 2.1.1 (Ready to Commit)
```bash
git add app/api/frame/route.tsx app/api/frame/image/route.tsx
git commit -m "fix(frames): Task 2.1.1 - Badge collection displays actual images with names

- Extract badge IDs from user_badges query
- Load badge PNG images from /public/badges/
- Display 56x56px images with badge names below
- Add tier-based card borders (gold/cyan/magenta/gray/purple)
- Grid layout: up to 9 badges in 3 columns
- Badge registry metadata inline for frame generation

Fixes: #GI-15 Phase 2.1 badge collection display"
```

### Subsequent Tasks
- One commit per task for clean history
- Include before/after screenshots in PR
- Reference GI-15 Phase 2.1 in commit messages

---

## Dependencies & Constraints

### Design System Tokens (Available)
- ✅ FRAME_COLORS (colors)
- ✅ FRAME_FONTS_V2 (typography)
- ✅ FRAME_SPACING (layout)
- ✅ FRAME_TYPOGRAPHY (text styles)

### Files
- Primary: `app/api/frame/image/route.tsx` (3467 lines)
- Secondary: `app/api/frame/route.tsx` (metadata generation)
- Supporting: `lib/share.ts` (URL building)

### Testing Environment
- Local: http://localhost:3003
- Production: https://gmeowhq.art
- Vercel build time: 4-5 minutes

---

## Notes

### Badge Collection Implementation
- Badge images stored: `/public/badges/*.png`
- 5 badges available: neon-initiate, pulse-runner, signal-luminary, warp-navigator, gmeow-vanguard
- Registry has "-square.png" suffix but files are ".png" (using ".png")
- loadImageAsDataUrl() function handles async image loading

### Quality Standards
- Text contrast ratio: ≥ 4.5:1 (WCAG AA)
- Icon sizes: Use standard scale (70/50/32/20/16)
- Colors: Use FRAME_COLORS tokens only
- Shadows: Use standardized text shadow values
- Consistency: All frames follow same patterns

---

**Next Action**: Commit Task 2.1.1, then proceed with Task 2.1.2 (Text Readability)
