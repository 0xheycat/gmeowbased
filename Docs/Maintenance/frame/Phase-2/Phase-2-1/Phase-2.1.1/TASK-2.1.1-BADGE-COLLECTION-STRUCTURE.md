# Task 2.1.1: Badge Collection Frame Structure (CORRECTED)

**Status**: ⚠️ NEEDS CORRECTION  
**Issue**: Current implementation shows emoji icons (🏅) instead of actual badge images  
**Required**: Display badge PNG images with names below each image

---

## Current Implementation (INCORRECT ❌)

### What's Wrong
```
Current Display:
┌────────────────────────────────┐
│ 🏅 🏅 🏅                        │
│ 🏅 🏅 🏅                        │
│ 🏅 🏅 🏅                        │
│                                 │
│ Stats: 9 earned                 │
└────────────────────────────────┘
```

**Problems**:
- ❌ Shows emoji icons (🏅) not actual badge images
- ❌ No badge names displayed
- ❌ No card borders per badge
- ❌ Data flow passes emoji string not badge metadata
- ❌ No image loading implementation

---

## Required Implementation (CORRECT ✅)

### Frame Layout
```
Badge Collection Frame (600x400px):
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                     "BADGE COLLECTION"                        │
│                                                               │
│              Badge Grid (3x3 max - Centered)                 │
│                                                               │
│        ┌──────┐ ┌──────┐ ┌──────┐                           │
│        │ IMG  │ │ IMG  │ │ IMG  │                            │
│        │ 70x  │ │ 70x  │ │ 70x  │                            │
│        │ 70px │ │ 70px │ │ 70px │                            │
│        │Name  │ │Name  │ │Name  │                            │
│        └──────┘ └──────┘ └──────┘                            │
│                                                               │
│        ┌──────┐ ┌──────┐ ┌──────┐                           │
│        │ IMG  │ │ IMG  │ │ IMG  │                            │
│        │ 70x  │ │ 70x  │ │ 70x  │                            │
│        │ 70px │ │ 70px │ │ 70px │                            │
│        │Name  │ │Name  │ │Name  │                            │
│        └──────┘ └──────┘ └──────┘                            │
│                                                               │
│        ┌──────┐ ┌──────┐ ┌──────┐                           │
│        │ IMG  │ │ IMG  │ │ IMG  │                            │
│        │ 70x  │ │ 70x  │ │ 70x  │                            │
│        │ 70px │ │ 70px │ │ 70px │                            │
│        │Name  │ │Name  │ │Name  │                            │
│        └──────┘ └──────┘ └──────┘                            │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│                        [User PFP]                             │
│                        @username                              │
│                        FID: 12345                             │
│                      5 EARNED BADGES                          │
│                     10 ELIGIBLE FOR                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Badge Card Structure (Each Badge)
```
Badge Card:
┌──────────────┐
│              │
│  ┌────────┐  │  ← Border: 2px solid tier color
│  │ BADGE  │  │  ← Image: 70x70px PNG
│  │ IMAGE  │  │  ← Source: /public/badges/{badgeId}.png
│  │ 70x70  │  │
│  └────────┘  │
│              │
│  Badge Name  │  ← Text: 10px font, centered
│              │  ← Name: From badge registry
└──────────────┘
   80px total
```

---

## Technical Specifications

### 1. Badge Data Structure

**Badge Object**:
```typescript
interface BadgeDisplay {
  id: string              // e.g., 'neon-initiate'
  name: string            // e.g., 'Neon Initiate'
  imageUrl: string        // e.g., '/badges/neon-initiate.png'
  tier: string            // e.g., 'common', 'rare', 'epic', 'legendary'
}
```

**Available Badges** (from registry):
1. `neon-initiate` - "Neon Initiate" (common)
2. `pulse-runner` - "Pulse Runner" (rare)
3. `signal-luminary` - "Signal Luminary" (epic)
4. `warp-navigator` - "Warp Navigator" (legendary)
5. `gmeow-vanguard` - "Gmeow Vanguard" (mythic)

### 2. Layout Dimensions

**Frame Container**: 600x400px (Farcaster 3:2 spec)

**Left Section (Badge Grid)**:
- Width: 240px
- Height: 360px
- Padding: 20px
- Grid: 3 columns × 3 rows (max 9 badges visible)
- Gap: 8px between cards

**Badge Card**:
- Width: 70px
- Height: 90px (70px image + 20px name)
- Border: 2px solid (tier color)
- Border Radius: 8px
- Padding: 4px
- Background: rgba(255, 255, 255, 0.05)

**Badge Image**:
- Size: 70x70px
- Format: PNG (from /public/badges/)
- Border Radius: 6px
- Object Fit: cover

**Badge Name**:
- Font Size: 10px
- Font Weight: 600
- Color: #ffffff
- Text Align: center
- Max Width: 70px
- Overflow: ellipsis

**Right Section (Stats)**:
- Width: 340px
- Height: 360px
- Padding: 20px
- Display: User info + badge counts

### 3. Styling Details

**Tier Colors** (for card borders):
```typescript
const TIER_COLORS = {
  common: '#808080',    // Gray
  rare: '#FF00FF',      // Magenta
  epic: '#00FFFF',      // Cyan
  legendary: '#FFD700', // Gold
  mythic: '#FF1493'     // Deep Pink
}
```

**Typography**:
- Badge Names: 10px, weight 600, white
- Section Title: 24px, weight 900, white
- Counts: 18px, weight 700, white
- User Info: 14px, weight 600, white

**Background**:
- Base: og-image.png (600x400)
- Overlay: Linear gradient (dark purple theme)

---

## Data Flow (3 Files)

### File 1: `app/api/frame/route.tsx`

**Current (WRONG)**:
```typescript
// Line 2676-2680: Creates emoji string
let earnedBadgeIcons = ''
earnedBadgeIcons = Array(Math.min(earnedCount, 20))
  .fill('🏅')  // ❌ WRONG
  .join(',')

// Line 2726: Passes emoji string
extra: {
  earnedBadges: earnedBadgeIcons  // ❌ String of emojis
}
```

**Required (CORRECT)**:
```typescript
// Extract badge metadata from user_badges query
let earnedBadgeData: BadgeDisplay[] = []

if (!badgesError && userBadges) {
  earnedBadgeData = userBadges.slice(0, 9).map(ub => {
    const badge = badgeRegistry[ub.badge_id]
    return {
      id: ub.badge_id,
      name: badge?.name || 'Unknown Badge',
      imageUrl: `/badges/${ub.badge_id}.png`,
      tier: badge?.tier || 'common'
    }
  })
}

// Pass badge IDs as comma-separated string (simple format)
extra: {
  earnedBadges: earnedBadgeData.map(b => b.id).join(',')  // ✅ Badge IDs
}
```

**Changes**:
- Extract badge IDs from `user_badges` query
- Pass badge IDs as comma-separated string
- Image route will fetch badge metadata

---

### File 2: `lib/share.ts`

**Current (WORKING)**:
```typescript
// Line 239: Already correct routing
if (input.extra?.earnedBadges) params.set('earnedBadges', String(input.extra.earnedBadges))
```

**Required (NO CHANGES)**:
- ✅ Already correctly passes earnedBadges parameter
- ✅ Routing to `/api/frame/image?type=badgeCollection` works
- No changes needed

---

### File 3: `app/api/frame/image/route.tsx`

**Current (WRONG)**:
```typescript
// Line 2125: Parse emoji string
const earnedBadges = readParam(url, 'earnedBadges', '')
const badges = earnedBadges.split(',').filter(Boolean)

// Line 2264-2283: Display emoji grid
{badges.map((icon: string, i: number) => (
  <div key={i} style={{ fontSize: 20 }}>
    {icon}  {/* ❌ Shows 🏅 emoji */}
  </div>
))}
```

**Required (CORRECT)**:
```typescript
// Parse badge IDs from parameter
const earnedBadges = readParam(url, 'earnedBadges', '')
const badgeIds = earnedBadges.split(',').filter(Boolean).slice(0, 9)

// Load badge images (async)
const badgeImages = await Promise.all(
  badgeIds.map(async (badgeId) => {
    const imgData = await loadImageAsDataUrl(`badges/${badgeId}.png`)
    return imgData
  })
)

// Get badge metadata from registry
const badgeRegistry = {
  'neon-initiate': { name: 'Neon Initiate', tier: 'common' },
  'pulse-runner': { name: 'Pulse Runner', tier: 'rare' },
  'signal-luminary': { name: 'Signal Luminary', tier: 'epic' },
  'warp-navigator': { name: 'Warp Navigator', tier: 'legendary' },
  'gmeow-vanguard': { name: 'Gmeow Vanguard', tier: 'mythic' }
}

// Tier colors for borders
const tierColors = {
  common: '#808080',
  rare: '#FF00FF',
  epic: '#00FFFF',
  legendary: '#FFD700',
  mythic: '#FF1493'
}

// Display badge grid
<div style={{
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  width: 240,
}}>
  {badgeIds.map((badgeId, i) => {
    const badge = badgeRegistry[badgeId]
    const tierColor = tierColors[badge?.tier || 'common']
    
    return (
      <div
        key={badgeId}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 70,
          padding: 4,
          border: `2px solid ${tierColor}`,
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Badge Image */}
        <img
          src={badgeImages[i]}
          alt={badge?.name}
          width="70"
          height="70"
          style={{
            borderRadius: 6,
            objectFit: 'cover',
          }}
        />
        
        {/* Badge Name */}
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#ffffff',
          textAlign: 'center',
          marginTop: 4,
          maxWidth: 70,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {badge?.name || 'Unknown'}
        </div>
      </div>
    )
  })}
</div>

// Placeholder for no badges
{badgeIds.length === 0 && (
  <div style={{
    fontSize: 70,
    opacity: 0.3,
    color: '#ffffff',
  }}>
    🏅
  </div>
)}
```

**Changes**:
1. Parse badge IDs from parameter
2. Load badge images using `loadImageAsDataUrl()`
3. Map badge IDs to badge metadata (name, tier)
4. Create badge card grid with images + names
5. Apply tier-based border colors
6. Add placeholder for zero badges

---

## Reference Implementation

**Source**: `app/api/frame/badgeShare/image/route.tsx` (lines 65, 140-148, 289-373)

**Image Loading Pattern**:
```typescript
// Load badge image (line 65)
async function loadImageAsDataUrl(relativePath: string): Promise<string | null> {
  // Implementation already exists in badgeShare
}

// Usage (line 140-142)
const [ogImageData, badgeImageData] = await Promise.all([
  loadImageAsDataUrl('og-image.png'),
  loadImageAsDataUrl(`badges/${badgeId}.png`),  // ✅ Correct pattern
])
```

**Image Display Pattern**:
```typescript
// Badge image (line 289)
<img 
  src={badgeImageData}
  alt={badge.name}
  width="180"
  height="180"
  style={{
    objectFit: 'cover',
    borderRadius: 10,
  }}
/>

// Badge name (line 373)
<div style={{
  fontSize: 32,
  fontWeight: 900,
  color: '#ffffff',
  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
}}>
  {badge.name}
</div>
```

---

## Implementation Notes

### Badge Image Loading
- ✅ Use existing `loadImageAsDataUrl()` function from badgeShare
- ✅ Pattern: `loadImageAsDataUrl(\`badges/\${badgeId}.png\`)`
- ✅ Files exist: `/public/badges/*.png` (5 badges available)
- ⚠️ Registry has "-square.png" suffix but files are ".png" (use ".png")

### Badge Registry
- ✅ Source: `/lib/badge-registry-data.ts`
- ✅ 5 badges available with full metadata
- ✅ Each has: id, name, imageUrl, tier, description

### Grid Layout
- Max 9 badges visible (3x3 grid)
- 3 badges per row
- 8px gap between cards
- Overflow: Show first 9, hide rest

### Error Handling
- If badge image fails to load: Show placeholder or skip
- If badge metadata missing: Show "Unknown Badge"
- If no badges earned: Show large placeholder emoji

---

## Testing Checklist

### Local Testing URLs
```bash
# 0 badges (placeholder)
http://localhost:3003/api/frame/image?type=badgeCollection&earnedBadges=

# 1 badge
http://localhost:3003/api/frame/image?type=badgeCollection&earnedBadges=neon-initiate

# 3 badges (single row)
http://localhost:3003/api/frame/image?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary

# 6 badges (two rows)
http://localhost:3003/api/frame/image?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate

# 9 badges (3x3 grid - max)
http://localhost:3003/api/frame/image?type=badgeCollection&earnedBadges=neon-initiate,pulse-runner,signal-luminary,warp-navigator,gmeow-vanguard,neon-initiate,pulse-runner,signal-luminary,warp-navigator
```

### Visual Tests
- [ ] Badge images load correctly (70x70px)
- [ ] Badge names display below images
- [ ] Card borders show correct tier colors
- [ ] Grid layout: 3 badges per row
- [ ] Gap spacing: 8px between cards
- [ ] Max 9 badges visible
- [ ] Placeholder shows for zero badges
- [ ] Image quality: Clear and sharp
- [ ] Text readability: Names readable at 10px
- [ ] Border radius: 8px card, 6px image

### Functional Tests
- [ ] Badge IDs parsed correctly from parameter
- [ ] Badge images loaded via loadImageAsDataUrl()
- [ ] Badge metadata fetched from registry
- [ ] Tier colors applied to borders
- [ ] Badge names truncated if too long
- [ ] Error handling: Missing badge graceful
- [ ] Performance: Image loading < 2s

---

## Deployment Checklist

### Before Pushing
- [ ] Local tests pass (all 5 badge count scenarios)
- [ ] TypeScript errors cleared
- [ ] Badge images load correctly
- [ ] Badge names display correctly
- [ ] Card borders show tier colors
- [ ] No console errors
- [ ] Frame validates on Farcaster validator

### Git Commit
```bash
# Option 1: New commit (fix on top of fbab52f)
git add app/api/frame/route.tsx app/api/frame/image/route.tsx
git commit -m "fix(frames): Task 2.1.1 - Show badge images with names (correct implementation)"

# Option 2: Revert and redo (clean history)
git revert fbab52f
git add app/api/frame/route.tsx app/api/frame/image/route.tsx lib/share.ts
git commit -m "feat(frames): Task 2.1.1 - Add badge collection display with images and names"
```

### After Deployment
- [ ] Vercel build succeeds
- [ ] Production frame loads images
- [ ] Test share URL with actual user badges
- [ ] Validate on Farcaster frame validator
- [ ] Check image file size (< 300KB)
- [ ] Test with multiple badge counts

---

## Summary

### Current State
- ❌ Shows emoji icons (🏅) not badge images
- ❌ No badge names displayed
- ❌ Wrong data structure (emoji string)
- ⚠️ Deployed to production (commit fbab52f)

### Required Changes
- ✅ Load badge PNG images from /public/badges/
- ✅ Display badge names below images
- ✅ Add tier-based card borders
- ✅ Create badge card grid layout
- ✅ Pass badge IDs not emoji string

### Files to Modify
1. `app/api/frame/route.tsx` - Extract badge IDs
2. `lib/share.ts` - ✅ No changes (already correct)
3. `app/api/frame/image/route.tsx` - Load images + display cards

### Estimated Time
- Code changes: 30 minutes
- Testing: 15 minutes
- Deployment: 5 minutes
- **Total**: ~50 minutes

---

**Next Steps**: Awaiting user review of structure before implementation.
