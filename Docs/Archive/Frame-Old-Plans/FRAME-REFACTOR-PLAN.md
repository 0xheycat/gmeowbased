# Frame Refactoring Plan - Keep Working Code, Improve Structure

## Current Situation

**Status**: ✅ Working in production (tested, image generation works)

**Problem**: Single 3000-line `/api/frame/route.tsx` handles ALL frame types:
- Quest frames
- Guild frames  
- Points frames
- Referral frames
- Leaderboard frames
- GM frames
- Badge frames
- OnchainStats frames
- Generic frames

**Issues**:
- Hard to maintain (30+ frame types documented)
- Slow to debug (single massive file)
- Difficult to test individual frame types
- Complex merge conflicts

## ❌ What NOT to Do

- ~~Don't migrate to Frog~~ (Satori WASM issues with Next.js 15)
- ~~Don't rewrite everything~~ (production code works)
- ~~Don't change working image generation~~ (verified working)

## ✅ What TO Do: Extract & Restructure

Keep the **exact same logic**, just reorganize into modular structure.

## Phase 1: Extract Frame Type Handlers (No Logic Changes)

### New Structure

```
lib/frames/
├── types.ts                    # Shared types (FrameType, FrameButton, etc.)
├── utils.ts                    # Shared utilities (escapeHtml, formatInteger, etc.)
├── validation.ts               # Input validation (sanitizeFID, sanitizeChainKey, etc.)
├── neynar.ts                   # Neynar API helpers
├── blockchain.ts               # Blockchain fetching (fetchQuestOnChain, fetchUserStatsOnChain, etc.)
├── html-builder.ts             # buildFrameHtml function
├── compose-text.ts             # getComposeText function
└── handlers/
    ├── quest.ts                # handleQuestFrame
    ├── guild.ts                # handleGuildFrame
    ├── points.ts               # handlePointsFrame
    ├── referral.ts             # handleReferralFrame
    ├── leaderboard.ts          # handleLeaderboardFrame
    ├── gm.ts                   # handleGmFrame
    ├── badge.ts                # handleBadgeFrame
    ├── onchainstats.ts         # handleOnchainStatsFrame
    └── generic.ts              # handleGenericFrame

app/api/frame/
└── route.tsx                   # Main router (200 lines)
```

### Main Router (Simplified)

```typescript
// app/api/frame/route.tsx

import { NextRequest } from 'next/server'
import { handleQuestFrame } from '@/lib/frames/handlers/quest'
import { handleGuildFrame } from '@/lib/frames/handlers/guild'
import { handlePointsFrame } from '@/lib/frames/handlers/points'
import { handleReferralFrame } from '@/lib/frames/handlers/referral'
import { handleLeaderboardFrame } from '@/lib/frames/handlers/leaderboard'
import { handleGmFrame } from '@/lib/frames/handlers/gm'
import { handleBadgeFrame } from '@/lib/frames/handlers/badge'
import { handleOnchainStatsFrame } from '@/lib/frames/handlers/onchainstats'
import { handleGenericFrame } from '@/lib/frames/handlers/generic'
import { parseFrameRequest, type FrameRequest } from '@/lib/frames/utils'

export const runtime = 'nodejs'
export const revalidate = 500

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const request: FrameRequest = parseFrameRequest(url, req)
  
  // Route to appropriate handler based on type
  switch (request.type) {
    case 'quest':
      return handleQuestFrame(request, req)
    case 'guild':
      return handleGuildFrame(request, req)
    case 'points':
      return handlePointsFrame(request, req)
    case 'referral':
      return handleReferralFrame(request, req)
    case 'leaderboards':
      return handleLeaderboardFrame(request, req)
    case 'gm':
      return handleGmFrame(request, req)
    case 'badge':
      return handleBadgeFrame(request, req)
    case 'onchainstats':
      return handleOnchainStatsFrame(request, req)
    default:
      return handleGenericFrame(request, req)
  }
}
```

### Example Handler (Quest Frame)

```typescript
// lib/frames/handlers/quest.ts

import { type FrameRequest } from '../types'
import { fetchQuestOnChain } from '../blockchain'
import { buildFrameHtml } from '../html-builder'
import { getComposeText } from '../compose-text'
import { createHtmlResponse, respondJson } from '../utils'

export async function handleQuestFrame(request: FrameRequest, req: Request) {
  const { questId, chain, fid, asJson, debug, origin } = request
  const traces: Trace = []
  
  // Extract existing logic from route.tsx lines ~1500-1800
  // (Keep exact same logic, just move to separate file)
  
  const questResult = await fetchQuestOnChain(questId, chain, traces)
  
  if (!questResult.ok) {
    // Error handling (keep same logic)
  }
  
  const quest = questResult.quest
  
  // Build frame HTML (keep same logic)
  const title = quest.title
  const description = quest.description
  const buttons = [
    { label: 'View Quest', target: `${origin}/quests/${slug}`, action: 'link' }
  ]
  
  const html = buildFrameHtml({
    title,
    description,
    image: `${origin}/api/frame/og?type=quest&questId=${questId}`,
    buttons,
    frameType: 'quest',
    fcMeta: { /* ... */ }
  })
  
  if (asJson) return respondJson({ ok: true, quest, traces })
  return createHtmlResponse(html)
}
```

## Phase 2: Extract Shared Utilities

### Shared Types (`lib/frames/types.ts`)

```typescript
export type FrameType = 'quest' | 'guild' | 'points' | 'referral' | 'leaderboards' | 'gm' | 'verify' | 'onchainstats' | 'badge' | 'generic'

export type FrameRequest = {
  type?: FrameType
  id?: string
  chain?: string
  questId?: string | number
  fid?: number | string
  user?: string
  json?: boolean
  debug?: boolean
  origin: string
}

export type FrameButton = {
  label: string
  target?: string
  action?: 'link' | 'post' | 'post_redirect'
}

export type Trace = Array<{ ts: number; step: string; info?: any }>

// ... rest of types
```

### Shared Utils (`lib/frames/utils.ts`)

```typescript
// Extract from route.tsx lines 500-700
export function escapeHtml(s: string) { /* ... */ }
export function formatInteger(value: number | bigint | string | null | undefined) { /* ... */ }
export function formatUtcDate(seconds?: number | null) { /* ... */ }
export function shortenHex(value: string, size = 4) { /* ... */ }
export function toJsonSafe<T>(value: T): any { /* ... */ }
export function respondJson(data: any, init?: ResponseInit) { /* ... */ }
export function createHtmlResponse(html: string, init?: any) { /* ... */ }
export function parseFrameRequest(url: URL, req: Request): FrameRequest { /* ... */ }
```

### Blockchain Utils (`lib/frames/blockchain.ts`)

```typescript
// Extract from route.tsx lines 700-900
export async function fetchQuestOnChain(questId: number | string, chainKey: string, traces: Trace) { /* ... */ }
export async function fetchUserStatsOnChain(userAddr: string, chainKey: string, traces: Trace) { /* ... */ }
export async function fetchReferralCodeForUser(chainKey: ChainKey, userAddr: `0x${string}`) { /* ... */ }
```

### HTML Builder (`lib/frames/html-builder.ts`)

```typescript
// Extract from route.tsx lines 1500-2000 (buildFrameHtml function)
export function buildFrameHtml(options: BuildFrameHtmlOptions): string {
  const { title, description, image, buttons, fcMeta, debug, profile, kicker, chainIcon, heroBadge, heroStats, heroList, chainKey, frameOrigin, frameVersion, frameType } = options
  
  // Keep exact same HTML generation logic
  // Just move to separate file
  
  return `<!DOCTYPE html>...`
}
```

## Phase 3: Testing Strategy

### 1. Create Tests for Each Handler

```typescript
// __tests__/frames/handlers/quest.test.ts

import { handleQuestFrame } from '@/lib/frames/handlers/quest'

describe('handleQuestFrame', () => {
  it('should return quest frame HTML', async () => {
    const request = {
      type: 'quest' as const,
      questId: '1',
      chain: 'base',
      origin: 'http://localhost:3000'
    }
    
    const response = await handleQuestFrame(request, mockRequest)
    const html = await response.text()
    
    expect(html).toContain('fc:frame')
    expect(html).toContain('fc:frame:image')
    expect(html).toContain('fc:frame:button:1')
  })
})
```

### 2. Compare Output Before/After

```bash
# Before refactor
curl http://localhost:3000/api/frame?type=quest&questId=1 > before.html

# After refactor
curl http://localhost:3000/api/frame?type=quest&questId=1 > after.html

# Compare
diff before.html after.html
# Should be identical or only whitespace differences
```

### 3. Test ALL Frame Types

```bash
# Test script
./scripts/test-all-frames.sh

# Tests:
# - Quest frames (quest, guild)
# - Points frames (points, referral, leaderboards)
# - GM frames (gm, verify)
# - Stats frames (onchainstats, badge)
# - Generic frames
```

## Phase 4: Migration Steps

### Step 1: Create New Structure (Don't Touch Old Code)

```bash
# Create new directories
mkdir -p lib/frames/handlers

# Create new files (empty for now)
touch lib/frames/types.ts
touch lib/frames/utils.ts
touch lib/frames/validation.ts
touch lib/frames/neynar.ts
touch lib/frames/blockchain.ts
touch lib/frames/html-builder.ts
touch lib/frames/compose-text.ts
touch lib/frames/handlers/quest.ts
touch lib/frames/handlers/guild.ts
# ... etc
```

### Step 2: Extract Types First

```bash
# Copy types from route.tsx to lib/frames/types.ts
# Test: TypeScript should still compile
pnpm tsc --noEmit
```

### Step 3: Extract Utils (One at a Time)

```bash
# 1. Extract escapeHtml
# 2. Update route.tsx to import from lib/frames/utils
# 3. Test: pnpm dev && curl test
# 4. Repeat for each utility
```

### Step 4: Extract Handlers (One at a Time)

```bash
# 1. Extract handleQuestFrame
# 2. Update route.tsx to use handler
# 3. Test: Quest frames still work
# 4. Commit
# 5. Repeat for each handler
```

### Step 5: Final Cleanup

```bash
# After all handlers extracted:
# - Remove old code from route.tsx
# - Keep only router logic
# - Final test of ALL frame types
# - Deploy
```

## Benefits of This Approach

✅ **Zero Downtime**: Old code keeps working during refactor
✅ **Incremental**: Can extract one handler at a time
✅ **Testable**: Can test each handler independently
✅ **Maintainable**: 300-line files instead of 3000-line file
✅ **Debuggable**: Easy to find frame-specific logic
✅ **Safe**: Keep exact same working logic

## Estimated Timeline

- **Phase 1** (Extract Types & Utils): 2 hours
- **Phase 2** (Extract 1st Handler): 1 hour
- **Phase 3** (Extract Remaining Handlers): 6 hours (30 min each × 12 handlers)
- **Phase 4** (Testing & Cleanup): 2 hours
- **Total**: ~11 hours

## Rollback Plan

If anything breaks:
1. Keep old `route.tsx` as `route.backup.tsx`
2. Can revert by renaming back
3. Git history preserved for each step

## Next Steps

1. ✅ Review this plan
2. ⏳ Create new directory structure
3. ⏳ Extract types.ts
4. ⏳ Extract utils.ts  
5. ⏳ Extract first handler (quest.ts)
6. ⏳ Test quest handler
7. ⏳ Extract remaining handlers
8. ⏳ Final testing & deploy

## Decision: Refactor, Don't Rewrite

**Reason**: Your production code works! Just needs better organization.

**Strategy**: Extract & modularize, keep exact same logic.

**Result**: Maintainable code, zero risk, production stability.
