# Professional Frame Layout Implementation

**Status:** ✅ GM Route Complete | ⏳ 10 Routes Pending  
**Design System:** November 2025 Production-Tested Yu-Gi-Oh Card Layout  
**Hybrid Calculator:** Preserved (95% Subsquid, 5% Supabase)

## Design System Components

### Core Structure
```tsx
// 1. Imports (All Routes)
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'
import {
  FRAME_FONT_FAMILY,
  FRAME_FONTS_V2,
  FRAME_SPACING,
  FRAME_COLORS,
  buildBackgroundGradient,
  buildBoxShadow,
  buildBorderEffect,
} from '@/lib/frame-design-system'

// 2. Background Layer
{ogImageData ? (
  <img src={ogImageData} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 1.0 }} />
) : (
  <div style={{ position: 'absolute', width: '100%', height: '100%', background: buildBackgroundGradient('frameType') }} />
)}

// 3. Card Container (540x360 inside 600x400)
<div style={{
  width: 540,
  height: 360,
  fontFamily: FRAME_FONT_FAMILY.body,
  background: buildBackgroundGradient('frameType', 'card'),
  border: borderStyle.border,
  borderRadius: 12,
  boxShadow: borderStyle.boxShadow,
  padding: FRAME_SPACING.container,
}}>
  {/* Content */}
</div>

// 4. Header Structure
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: FRAME_SPACING.section.medium,
}}>
  <div style={{ fontSize: FRAME_FONTS_V2.h3, color: palette.primary }}>
    @{username}
  </div>
  <div style={{ fontSize: FRAME_FONTS_V2.label, color: 'rgba(255, 255, 255, 0.6)' }}>
    FRAME TYPE
  </div>
</div>

// 5. Footer Structure
<div style={{
  display: 'flex',
  justifyContent: 'center',
  marginTop: FRAME_SPACING.margin.footer,
  fontSize: FRAME_FONTS_V2.caption,
  color: 'rgba(255, 255, 255, 0.5)',
}}>
  gmeowhq.art
</div>
```

### Typography System
- **Display:** FRAME_FONTS_V2.display (32px) - Hero text
- **H1:** FRAME_FONTS_V2.h1 (28px) - Frame titles
- **H2:** FRAME_FONTS_V2.h2 (24px) - Primary values
- **H3:** FRAME_FONTS_V2.h3 (20px) - Username headers
- **Body:** FRAME_FONTS_V2.body (14px) - Standard text
- **Label:** FRAME_FONTS_V2.label (12px) - Uppercase labels
- **Caption:** FRAME_FONTS_V2.caption (10px) - Secondary info
- **Micro:** FRAME_FONTS_V2.micro (9px) - Footer

### Color Palettes
```typescript
// GM Frame
FRAME_COLORS.gm = {
  primary: '#7CFF7A',    // Bright green
  secondary: '#9bffaa',  // Light green
  bg: '#052010',         // Dark green
  accent: '#ffd700',     // Gold
}

// Points Frame
FRAME_COLORS.points = {
  primary: '#10b981',    // Emerald
  secondary: '#06b6d4',  // Cyan
  bg: '#0a1a1a',
  accent: '#ffd700',
}

// Badge Frame
FRAME_COLORS.badge = {
  primary: '#d4af37',    // Gold
  secondary: '#c77dff',  // Violet
  bg: '#0a0a0a',
  accent: '#ffd700',
}

// Guild Frame
FRAME_COLORS.guild = {
  primary: '#4da3ff',    // Blue
  secondary: '#7dbaff',
  bg: '#0a1a2a',
  accent: '#ffd700',
}

// Quest Frame
FRAME_COLORS.quest = {
  primary: '#61DFFF',    // Cyan
  secondary: '#8dddff',
  bg: '#052030',
  accent: '#ffb700',
}

// Leaderboard Frame
FRAME_COLORS.leaderboards = {
  primary: '#ffd700',    // Gold
  secondary: '#ffed4e',
  bg: '#201a05',
  accent: '#ff6b6b',
}

// Onchainstats Frame
FRAME_COLORS.onchainstats = {
  primary: '#00d4ff',    // Bright cyan
  secondary: '#5ae4ff',
  bg: '#051520',
  accent: '#ffd700',
}

// Referral Frame
FRAME_COLORS.referral = {
  primary: '#ff6b9d',    // Pink
  secondary: '#ff8db4',
  bg: '#200510',
  accent: '#ffd700',
}
```

### Layout Dimensions
- **Frame:** 600x400px (Farcaster standard)
- **Card:** 540x360px (internal card)
- **Border:** 4px solid (primary color)
- **Border Radius:** 12px
- **Padding:** FRAME_SPACING.container (14px)

## Route-Specific Implementations

### 1. GM Route ✅ COMPLETE
**Features:**
- Circular streak display (200px diameter)
- Flame emoji (🔥) with streak count
- Stats row: Total GMs + Total XP
- Green gradient theme

### 2. Points Route ⏳ PENDING
**Features:**
- Total XP display center
- Breakdown: GM XP, Quest XP, Viral XP
- Percentage circles or bars
- Emerald/Cyan gradient theme

### 3. Leaderboard Route ⏳ PENDING
**Features:**
- Season badge (weekly/monthly/alltime)
- Top 3 podium display
- Total participants count
- Gold gradient theme

### 4. Badge Route ⏳ PENDING
**Features:**
- Single badge showcase with emoji
- Badge name and tier display
- Earned date
- Badge count indicator
- Gold/Violet gradient theme

### 5. Quest Route ⏳ PENDING
**Features:**
- Quest title and difficulty stars
- Reward amount display
- Status badge (completed/in progress)
- Cyan gradient theme

### 6. Guild Route ⏳ PENDING
**Features:**
- Guild name with level
- Member count display
- Owner/creator info
- Total XP or rank
- Blue gradient theme

### 7. Onchainstats Route ⏳ PENDING
**Features:**
- Grid layout: 6 stat boxes
- GM Streak, Lifetime GMs, Badges, Guilds, Referrals, Total XP
- Bright cyan theme

### 8. Referral Route ⏳ PENDING
**Features:**
- Referral code display (large)
- Referral count
- Total rewards earned
- Gift emoji (🎁)
- Pink gradient theme

### 9. NFT Route ⏳ PENDING
**Features:**
- NFT grid (up to 9 items, 3x3)
- NFT count and points
- Total value display
- Purple gradient theme

### 10. Badge Collection Route ✅ COMPLETE
**Status:** Already has professional layout from November
**Features:**
- Badge grid with tier colors
- Smart sizing (70px→60px→50px)
- Earned count display

### 11. Verify Route ✅ COMPLETE
**Status:** Already has professional layout from November
**Features:**
- Verification status display
- Quest name and chain
- Holographic shine effect

## Implementation Checklist

### Completed ✅
- [x] GM Route - Full redesign with card layout
- [x] Badge Collection Route - November design (no changes needed)
- [x] Verify Route - November design (no changes needed)

### Priority Updates ⏳
- [ ] Points Route - XP breakdown visualization
- [ ] Leaderboard Route - Podium layout
- [ ] Badge Route - Single badge showcase
- [ ] Quest Route - Quest card with difficulty
- [ ] Guild Route - Guild stats card
- [ ] Onchainstats Route - 6-stat grid layout
- [ ] Referral Route - Referral code showcase
- [ ] NFT Route - NFT collection grid

## Quality Standards

### Typography
- ✅ Use FRAME_FONT_FAMILY.body for all text
- ✅ Use FRAME_FONTS_V2 semantic sizes
- ✅ No hardcoded font sizes
- ✅ Uppercase labels use FRAME_FONTS_V2.label

### Colors
- ✅ Use FRAME_COLORS[frameType] palette
- ✅ Use buildBorderEffect() for borders
- ✅ Use buildBoxShadow() for shadows
- ✅ No hardcoded hex colors

### Layout
- ✅ 600x400 outer container
- ✅ 540x360 card container
- ✅ Use FRAME_SPACING constants
- ✅ Background: og-image.png or buildBackgroundGradient()

### Structure
- ✅ Import design system
- ✅ Load fonts with loadFrameFonts()
- ✅ Load background with loadBackgroundImage() or use gradient
- ✅ Three-layer structure: Background → Card → Content
- ✅ Consistent header/footer layout

## Testing Validation

### Visual Checks
- [ ] All routes: 600x400 dimensions
- [ ] All routes: Gmeow font rendering
- [ ] All routes: Background image or gradient
- [ ] All routes: Card border and shadow
- [ ] All routes: Proper spacing and alignment

### HTTP Checks
- [ ] All routes: HTTP 200 response
- [ ] All routes: PNG mime type
- [ ] All routes: <2s response time
- [ ] All routes: No compilation errors

### Design Checks
- [ ] All routes: Consistent header layout
- [ ] All routes: Consistent footer layout
- [ ] All routes: Color palette matching frame type
- [ ] All routes: Typography hierarchy correct
- [ ] All routes: Professional card appearance

---

**Next Action:** Update remaining 8 routes with professional card layout systematically.
