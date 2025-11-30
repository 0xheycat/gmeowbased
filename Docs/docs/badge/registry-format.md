# Badge Registry Format

**Badge Metadata Specification**

Version: 2.0  
Last Updated: January 15, 2025

---

## Overview

The Badge Registry is a JSON-based specification that defines all available badges, their tiers, metadata, and requirements. The registry is loaded at runtime and used for badge assignment, display, and on-chain minting.

## Registry Structure

### File Location

**Primary**: `/lib/badges.ts` (exported constant `BADGE_REGISTRY`)

**Format**: TypeScript object (compiled to JSON)

### Root Schema

```typescript
interface BadgeRegistry {
  version: string                           // Semantic version (e.g., "2.0.0")
  lastUpdated: string                       // ISO 8601 timestamp
  description: string                       // Registry purpose
  tiers: Record<TierType, TierConfig>       // Tier definitions
  badges: Badge[]                           // All available badges
}
```

---

## Tier Configuration

### Tier Schema

```typescript
interface TierConfig {
  name: string              // Display name (e.g., "Mythic")
  color: string             // Hex color (e.g., "#9C27FF")
  minScore: number          // Minimum Neynar score for auto-assignment
  pointsBonus: number       // Points awarded on badge assignment
  description: string       // Tier description
  priority: number          // Sort priority (1 = highest)
}
```

### Standard Tiers

```typescript
const TIERS: Record<TierType, TierConfig> = {
  mythic: {
    name: 'Mythic',
    color: '#9C27FF',      // Purple
    minScore: 1.0,
    pointsBonus: 1000,
    description: 'Legendary status with massive influence',
    priority: 1,
  },
  legendary: {
    name: 'Legendary',
    color: '#FFD966',      // Gold
    minScore: 0.8,
    pointsBonus: 400,
    description: 'High influence with strong community presence',
    priority: 2,
  },
  epic: {
    name: 'Epic',
    color: '#61DFFF',      // Blue
    minScore: 0.5,
    pointsBonus: 200,
    description: 'Notable influence and active engagement',
    priority: 3,
  },
  rare: {
    name: 'Rare',
    color: '#A18CFF',      // Light Purple
    minScore: 0.3,
    pointsBonus: 100,
    description: 'Growing influence with consistent activity',
    priority: 4,
  },
  common: {
    name: 'Common',
    color: '#D3D7DC',      // Gray
    minScore: 0.0,
    pointsBonus: 0,
    description: 'Entry-level badge for all new users',
    priority: 5,
  },
}
```

---

## Badge Schema

### Badge Definition

```typescript
interface Badge {
  badgeType: string                  // Unique slug (e.g., "gmeow_vanguard")
  tier: TierType                     // Default tier
  metadata: BadgeMetadata            // Display and on-chain metadata
  requirements?: BadgeRequirements   // Assignment criteria
  chains?: ChainKey[]                // Supported chains (default: ['base'])
  imageUrl?: string                  // Badge image URL (overrides metadata.imageUrl)
  createdAt?: string                 // ISO timestamp
}
```

### Badge Metadata

```typescript
interface BadgeMetadata {
  name: string                       // Display name (e.g., "Gmeow Vanguard")
  description: string                // Badge description
  imageUrl: string                   // Badge image URL (IPFS or HTTPS)
  externalUrl?: string               // Badge landing page
  attributes: BadgeAttribute[]       // NFT attributes
  frame?: FrameConfig                // Frame customization (Phase 3C)
}
```

### Badge Attributes

```typescript
interface BadgeAttribute {
  trait_type: string                 // Attribute name (e.g., "Tier")
  value: string | number             // Attribute value (e.g., "Legendary")
  display_type?: string              // Display format (optional)
}
```

**Standard Attributes**:
- `Tier`: Badge tier (mythic, legendary, etc.)
- `Category`: Badge category (achievement, milestone, special)
- `Rarity`: Rarity score (0-100)
- `Season`: Season number (1, 2, 3, etc.)
- `Earned Date`: Assignment date (ISO timestamp)

### Frame Configuration (Phase 3C)

```typescript
interface FrameConfig {
  palette?: {
    primary: string                  // Frame primary color
    secondary: string                // Frame secondary color
    background: string               // Frame background color
    accent: string                   // Frame accent color
  }
  customButtons?: Array<{
    label: string                    // Button text
    action: 'link' | 'post'          // Button action
    target: string                   // Button target URL
  }>
}
```

---

## Badge Examples

### Example 1: Onboarding Badge (Tier-Based)

```typescript
{
  badgeType: 'gmeow_vanguard',
  tier: 'legendary',
  metadata: {
    name: 'Gmeow Vanguard',
    description: 'Awarded to legendary users with high influence',
    imageUrl: 'https://gmeowhq.art/badges/gmeow-vanguard.png',
    externalUrl: 'https://gmeowhq.art/badges/gmeow-vanguard',
    attributes: [
      { trait_type: 'Tier', value: 'Legendary' },
      { trait_type: 'Category', value: 'Achievement' },
      { trait_type: 'Rarity', value: 95 },
    ],
    frame: {
      palette: {
        primary: '#FFD966',
        secondary: '#FFA500',
        background: '#000000',
        accent: '#FFFFFF',
      },
    },
  },
  requirements: {
    neynarScore: { min: 0.8 },
    autoAssign: true,
  },
  chains: ['base', 'op', 'celo'],
}
```

### Example 2: Achievement Badge

```typescript
{
  badgeType: 'early_adopter',
  tier: 'epic',
  metadata: {
    name: 'Early Adopter',
    description: 'Joined Gmeowbased in Season 1',
    imageUrl: 'https://gmeowhq.art/badges/early-adopter.png',
    attributes: [
      { trait_type: 'Tier', value: 'Epic' },
      { trait_type: 'Category', value: 'Milestone' },
      { trait_type: 'Season', value: 1 },
    ],
  },
  requirements: {
    joinedBefore: '2025-02-01T00:00:00Z',
    autoAssign: false,
  },
  chains: ['base'],
}
```

### Example 3: Special Event Badge

```typescript
{
  badgeType: 'gm_streak_champion',
  tier: 'rare',
  metadata: {
    name: 'GM Streak Champion',
    description: 'Maintained a 30-day GM streak',
    imageUrl: 'https://gmeowhq.art/badges/gm-streak-champion.png',
    attributes: [
      { trait_type: 'Tier', value: 'Rare' },
      { trait_type: 'Category', value: 'Special' },
      { trait_type: 'Streak', value: 30, display_type: 'number' },
    ],
  },
  requirements: {
    gmStreak: { min: 30 },
    autoAssign: false,
  },
}
```

---

## Badge Requirements

### Requirements Schema

```typescript
interface BadgeRequirements {
  neynarScore?: {
    min?: number                     // Minimum Neynar score
    max?: number                     // Maximum Neynar score
  }
  gmStreak?: {
    min?: number                     // Minimum GM streak days
  }
  points?: {
    min?: number                     // Minimum points balance
  }
  questsCompleted?: {
    min?: number                     // Minimum quests completed
  }
  joinedBefore?: string              // ISO timestamp
  autoAssign?: boolean               // Auto-assign during onboarding
  manual?: boolean                   // Requires manual admin assignment
}
```

### Auto-Assignment

Badges with `autoAssign: true` are automatically assigned during onboarding based on Neynar score:

```typescript
async function assignOnboardingBadge(fid: number, neynarScore: number) {
  const tier = calculateTier(neynarScore)
  const badge = BADGE_REGISTRY.badges.find(b => 
    b.requirements?.autoAssign && 
    b.tier === tier
  )
  
  if (badge) {
    await assignBadgeToUser(fid, badge.badgeType)
  }
}
```

---

## Loading the Registry

### Runtime Loading

```typescript
import { BADGE_REGISTRY, loadBadgeRegistry } from '@/lib/badges'

// Static import
console.log(BADGE_REGISTRY.version)

// Dynamic loading (cached)
const registry = loadBadgeRegistry()
console.log(registry.badges.length)
```

### Registry Caching

The registry is cached in-memory for performance:

```typescript
let cachedRegistry: BadgeRegistry | null = null

export function loadBadgeRegistry(): BadgeRegistry {
  if (cachedRegistry) return cachedRegistry
  
  cachedRegistry = BADGE_REGISTRY
  return cachedRegistry
}
```

### Cache Invalidation

To force reload (e.g., after registry update):

```typescript
cachedRegistry = null
const freshRegistry = loadBadgeRegistry()
```

---

## Validation

### Registry Validation

All badges are validated at build time:

```typescript
function validateRegistry(registry: BadgeRegistry): void {
  // Check version format
  if (!/^\d+\.\d+\.\d+$/.test(registry.version)) {
    throw new Error('Invalid registry version')
  }
  
  // Check badge uniqueness
  const badgeTypes = registry.badges.map(b => b.badgeType)
  const duplicates = badgeTypes.filter((t, i) => badgeTypes.indexOf(t) !== i)
  if (duplicates.length > 0) {
    throw new Error(`Duplicate badge types: ${duplicates.join(', ')}`)
  }
  
  // Validate tiers
  for (const badge of registry.badges) {
    if (!registry.tiers[badge.tier]) {
      throw new Error(`Invalid tier for badge ${badge.badgeType}: ${badge.tier}`)
    }
  }
}
```

### Badge Type Naming Rules

- ✅ Lowercase with underscores: `gmeow_vanguard`
- ✅ Descriptive: `early_adopter`, `gm_streak_champion`
- ❌ Uppercase: `GMEOW_VANGUARD`
- ❌ Hyphens: `gmeow-vanguard` (use in badge IDs only)
- ❌ Spaces: `gmeow vanguard`

---

## Adding New Badges

### Step 1: Define Badge

Add badge to `BADGE_REGISTRY.badges` array:

```typescript
{
  badgeType: 'new_badge_name',
  tier: 'epic',
  metadata: {
    name: 'New Badge Name',
    description: 'Badge description',
    imageUrl: 'https://gmeowhq.art/badges/new-badge.png',
    attributes: [
      { trait_type: 'Tier', value: 'Epic' },
      { trait_type: 'Category', value: 'Achievement' },
    ],
  },
  requirements: {
    points: { min: 1000 },
    autoAssign: false,
  },
}
```

### Step 2: Validate

Run validation script:

```bash
tsx scripts/validate-badge-registry.ts
```

### Step 3: Deploy

Commit and push changes:

```bash
git add lib/badges.ts
git commit -m "Add new badge: new_badge_name"
git push origin main
```

### Step 4: Assign

Use admin panel or API to assign badge:

```typescript
await assignBadgeToUser(fid, 'new_badge_name')
```

---

## Version History

### Version 2.0 (Current)

- Added Phase 3C frame configuration
- Added multi-chain support
- Added badge requirements schema
- Improved metadata structure

### Version 1.0 (Legacy)

- Initial badge registry
- Basic tier system
- Manual badge assignment

---

## Related Documentation

- [Badge Share Frame](./share-frame.md) - Phase 3C frame system
- [Mint Queue System](./mint-queue.md) - Phase 3A minting
- [Admin Panel](./admin-panel.md) - Phase 3B management UI
- [Neynar Score](./neynar-score.md) - Auto-assignment scoring

---

**Version**: 2.0  
**Last Updated**: January 15, 2025  
**Status**: Production Ready
