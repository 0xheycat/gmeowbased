# Frame Type Status & Testing Guide

**Generated**: November 19, 2025  
**Production Domain**: gmeowhq.art (deploys from origin/origin branch)  
**Latest Commit**: 6e29e35

## Frame Types Overview

### 1. Dynamic Image Frames (4 types)
These generate personalized PNG images via `/api/frame/image`

| Type | Route | Status | Image Size | Notes |
|------|-------|--------|------------|-------|
| **gm** | `/api/frame?type=gm` | ⏳ Testing | ~26KB | Fixed FID display issue |
| **quest** | `/frame/quest/[id]` | ✅ Working | ~177KB | Reference implementation |
| **leaderboard** | `/frame/leaderboard` | ⏳ Testing | TBD | Fixed footer pattern |
| **onchainstats** | `/frame/stats/[fid]` | ⏳ Testing | TBD | Fixed footer + gridColumn |

### 2. Static Image Frames (5 types)
These use `/frame-image.png` static fallback

| Type | Route | Status | Image | Notes |
|------|-------|--------|-------|-------|
| **verify** | `/api/frame?type=verify` | 🔍 Untested | Static | Quest verification helper |
| **guild** | `/api/frame?type=guild` | 🔍 Untested | Static | Guild preview/join |
| **referral** | `/api/frame?type=referral` | 🔍 Untested | Static | Referral code sharing |
| **points** | `/api/frame?type=points` | 🔍 Untested | Static | XP/points display |
| **badge** | `/frame/badge/[fid]` | 🔍 Untested | Static | Badge showcase |

## Satori CSS Compliance Issues Fixed

### Issue #1: Nested Div Structures (FAILED)
```tsx
// ❌ FAILED - Nested divs with text splits
<div>
  <div style={{ display: 'flex', gap: 8 }}>
    <span>Text</span>
  </div>
  <div style={{ display: 'flex', gap: 8 }}>
    <span>{variable}</span>
    <span>• More text</span>
  </div>
</div>
```

### Issue #2: Template Literals (WORKS)
```tsx
// ✅ WORKS - Single span with template literal
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <span>Powered by Gmeowbased</span>
  <span>{chain} • Quest #{questId}</span>
</div>
```

### Root Cause
Satori treats template literals like `{var1} • {var2}` as a single text node when in one element, but fails when trying to split text across multiple nested divs with display:flex.

### Fixes Applied (Commit 6e29e35)
- **GM Footer**: Reverted to `<span>Powered by Gmeowbased • {chain}</span>`
- **Leaderboard Footer**: Two spans (no nested divs): `<span>Text</span><span>{chain} • Text</span>`
- **Onchainstats Footer**: Two spans (no nested divs): `<span>Text</span><span>Text • Text</span>`
- **Pattern**: Match Quest frame footer (line 203) which has been working in production

## Test URLs

### Dynamic Image Generation
```bash
# GM Frame (no FID)
https://gmeowhq.art/api/frame/image?type=gm&gmCount=50&streak=7&rank=10&user=0x123&chain=Base

# GM Frame (with FID)
https://gmeowhq.art/api/frame/image?type=gm&gmCount=50&streak=7&rank=10&user=0x123&fid=12345&chain=Base

# Quest Frame
https://gmeowhq.art/api/frame/image?type=quest&questId=305&questName=Daily%20GM&reward=100%20XP&expires=24h&chain=Unichain

# Leaderboard Frame
https://gmeowhq.art/api/frame/image?type=leaderboard&season=Season%201&limit=10&chain=Base

# Onchainstats Frame
https://gmeowhq.art/api/frame/image?type=onchainstats&user=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb&txs=1234&volume=5.2ETH&builder=85&chain=Base
```

### Frame Metadata Handlers
```bash
# Verify Frame
https://gmeowhq.art/api/frame?type=verify&fid=12345

# Guild Frame
https://gmeowhq.art/api/frame?type=guild&id=1

# Referral Frame
https://gmeowhq.art/api/frame?type=referral&code=GMEOW123

# Points Frame
https://gmeowhq.art/api/frame?type=points&user=0x123

# GM Frame
https://gmeowhq.art/api/frame?type=gm
```

### User-Facing Routes (GI-11/FM-3 Compliant)
```bash
# Quest (working in Farcaster)
https://gmeowhq.art/frame/quest/305?chain=unichain

# Badge
https://gmeowhq.art/frame/badge/[fid]?badgeId=123

# Onchainstats
https://gmeowhq.art/frame/stats/[fid]?chain=base

# Leaderboard
https://gmeowhq.art/frame/leaderboard?chain=base
```

## Validation Checklist

### Image Generation Tests
- [ ] GM frame (no FID) returns 20-30KB PNG (1200x630)
- [ ] GM frame (with FID) returns 25-35KB PNG (1200x630)
- [ ] Quest frame returns 150-200KB PNG (1200x630)
- [ ] Leaderboard frame returns 50-100KB PNG (1200x630)
- [ ] Onchainstats frame returns 50-100KB PNG (1200x630)

### Metadata Generation Tests
- [ ] All frame types return valid HTML with Farcaster meta tags
- [ ] Image URLs are properly constructed with query parameters
- [ ] Buttons are configured correctly for each frame type
- [ ] Frame version is set to "1.2" (vNext)

### Farcaster Integration Tests
- [ ] Quest frame loads in Warpcast/Farcaster clients
- [ ] GM frame loads in Warpcast/Farcaster clients
- [ ] Leaderboard frame loads in Warpcast/Farcaster clients
- [ ] Onchainstats frame loads in Warpcast/Farcaster clients
- [ ] All frames pass Farcaster frame validator
- [ ] Button actions work correctly

## Next Steps

1. **Wait for Vercel deployment** (~5 minutes from commit 6e29e35)
2. **Test all 4 dynamic image types** on gmeowhq.art
3. **Test frame metadata handlers** for all 9 types
4. **Validate in Farcaster** using frame validator and Warpcast
5. **Document final results** with screenshots and metrics

## Known Working Configuration

**Quest Frame Footer** (Reference Implementation):
```tsx
<div style={{ 
  position: 'absolute',
  bottom: 48,
  left: 80,
  right: 80,
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 22,
  opacity: 0.6,
  letterSpacing: '2px',
}}>
  <span>Powered by Gmeowbased</span>
  <span>{chain} • Quest #{questId}</span>
</div>
```

This pattern has been tested and works in production. All other frames now follow this structure.
