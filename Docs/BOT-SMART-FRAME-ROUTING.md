# Bot Smart Frame Routing System

> **Status**: ✅ Active in Production
> **Last Updated**: 2025-11-25
> **Module**: `lib/bot-frame-builder.ts`

## Overview

The bot now features **intelligent frame routing** that automatically detects the best available frame route based on:
- Available frame routes in `app/frame/`
- Required parameters (fid, questId, etc.)
- Smart fallback logic when parameters are missing

## Available Frame Routes

### ✅ Migrated Routes (User-Facing)

| Route | Path | Required Params | Frame Type |
|-------|------|-----------------|------------|
| **Stats** | `/frame/stats/[fid]` | `fid` | User stats dashboard |
| **Quest Detail** | `/frame/quest/[questId]` | `questId` | Specific quest info |
| **Badge** | `/frame/badge/[fid]` | `fid` | User badge showcase |
| **Leaderboard** | `/frame/leaderboard` | None | Rankings & quest access |

### ⏳ Not Yet Migrated (API Routes)

| Route | Path | Frame Type | Status |
|-------|------|------------|--------|
| **Guild** | `/api/frame?type=guild` | Guild invite | TODO: Create `/frame/guild` |
| **GM/Streak** | `/api/frame?type=gm` | Daily streak claim | TODO: Create `/frame/gm` |

## Bot Frame Types

The bot supports 8 frame types with smart routing:

### 1. stats-summary
**Route**: `/frame/stats/[fid]`
**Required**: `fid`
**Usage**: Display user's XP, level, streak, and achievements
```typescript
buildBotFrameEmbed({
  type: 'stats-summary',
  fid: 18139,
  chain: 'base'
})
// → https://gmeowhq.art/frame/stats/18139
```

### 2. quest-specific
**Route**: `/frame/quest/[questId]`
**Required**: `questId`
**Fallback**: If no `questId`, redirects to leaderboard
**Usage**: Show specific quest details
```typescript
buildBotFrameEmbed({
  type: 'quest-specific',
  questId: 1,
  chain: 'base'
})
// → https://gmeowhq.art/frame/quest/1
```

### 3. quest-board
**Route**: `/frame/leaderboard` (fallback route)
**Required**: None
**Usage**: Browse all available quests
**Note**: Leaderboard frame provides navigation to Quest page
```typescript
buildBotFrameEmbed({
  type: 'quest-board',
  fid: 18139,
  chain: 'all'
})
// → https://gmeowhq.art/frame/leaderboard
```

### 4. leaderboards
**Route**: `/frame/leaderboard`
**Required**: None
**Usage**: Display rankings and top pilots
```typescript
buildBotFrameEmbed({
  type: 'leaderboards',
  chain: 'all'
})
// → https://gmeowhq.art/frame/leaderboard
```

### 5. badge-showcase
**Route**: `/frame/badge/[fid]`
**Required**: `fid`
**Usage**: Display user's achievement badges
```typescript
buildBotFrameEmbed({
  type: 'badge-showcase',
  fid: 18139
})
// → https://gmeowhq.art/frame/badge/18139
```

### 6. profile-card
**Route**: `/frame/stats/[fid]`
**Required**: `fid`
**Usage**: Mintable NFT profile card
```typescript
buildBotFrameEmbed({
  type: 'profile-card',
  fid: 18139
})
// → https://gmeowhq.art/frame/stats/18139?card=true
```

### 7. guild-invite
**Route**: `/api/frame?type=guild` ⚠️ Not migrated
**Required**: None (optional `guildId`)
**Usage**: Guild recruitment and joining
```typescript
buildBotFrameEmbed({
  type: 'guild-invite',
  fid: 18139
})
// → https://gmeowhq.art/api/frame?type=guild
```

### 8. daily-streak
**Route**: `/api/frame?type=gm` ⚠️ Not migrated
**Required**: `fid`
**Usage**: Claim daily GM streak
```typescript
buildBotFrameEmbed({
  type: 'daily-streak',
  fid: 18139,
  chain: 'base'
})
// → https://gmeowhq.art/api/frame?type=gm&chain=base&fid=18139
```

## Smart Intent Detection

The bot automatically maps user intents to appropriate frame types:

| Intent | Primary Frame | Fallback | Context Requirements |
|--------|---------------|----------|---------------------|
| `stats`, `profile` | `stats-summary` | `profile-card` | Has stats data |
| `badge`, `achievement` | `badge-showcase` | `stats-summary` | Has badges |
| `quests` | `quest-specific` | `quest-board` | Has questId |
| `quest-recommendations` | `quest-board` | - | - |
| `leaderboard`, `rank` | `leaderboards` | - | - |
| `guild`, `team` | `guild-invite` | - | - |
| `streak`, `gm` | `stats-summary` | `daily-streak` | Has streak |
| `help` | `leaderboards` | - | Shows app overview |
| Unknown | `stats-summary` | `leaderboards` | Has fid |

## Smart Routing Logic

### Parameter Validation
The system automatically validates required parameters:

```typescript
// Example: Quest frame
if (questId) {
  // Use specific quest route
  return { type: 'quest', questId }
} else {
  // Fall back to leaderboard (has Quest navigation)
  return { type: 'leaderboards' }
}
```

### Fallback Hierarchy
1. **Primary Route**: Use specific route if all params available
2. **Alternative Route**: Use similar route with navigation access
3. **Generic Route**: Fall back to leaderboard (universal access point)

### Chain Parameter Handling
- Stats route: Does NOT accept `chain=all` (returns 400)
- Stats route: Defaults to `chain=base` if not specified
- Leaderboard route: Accepts `chain=all` ✅
- Quest route: Accepts any valid chain ✅

## Testing Frame Routes

### Quick Test Script
```bash
# Test all frame routes
bash test-smart-frame-routes.sh

# Test specific route
curl -sI "https://gmeowhq.art/frame/stats/18139"
curl -sI "https://gmeowhq.art/frame/leaderboard?chain=all"
curl -sI "https://gmeowhq.art/frame/quest/1"
curl -sI "https://gmeowhq.art/frame/badge/18139"
```

### Production Testing
1. **Stats Frame**: `@gmeowbased show my stats`
   - Expected: `/frame/stats/[fid]` with base chain
   - Button: "Open Onchain Hub"

2. **Quest Board**: `@gmeowbased what quests can I do?`
   - Expected: `/frame/leaderboard` with quest action
   - Button: "Open Leaderboard" → Navigate to Quest page

3. **Leaderboard**: `@gmeowbased show leaderboard`
   - Expected: `/frame/leaderboard?chain=all`
   - Button: "Open Leaderboard"

4. **Badge**: `@gmeowbased show my badges`
   - Expected: `/frame/badge/[fid]`
   - Button: "View Badge Collection"

## Migration TODO

### Priority 1: GM/Streak Frame
Create `/frame/gm/route.tsx` for daily streak claims:
- Route: `/frame/gm?chain=base&fid=18139`
- Frame Type: `daily-streak`
- Button: "Claim GM Streak"
- Current: Uses `/api/frame?type=gm`

### Priority 2: Guild Frame
Create `/frame/guild/route.tsx` for guild invites:
- Route: `/frame/guild?guildId=1` or `/frame/guild/[guildId]`
- Frame Type: `guild-invite`
- Button: "Join Guild"
- Current: Uses `/api/frame?type=guild`

### Priority 3: Quest Browse Frame
Create `/frame/quests/route.tsx` for browsing all quests:
- Route: `/frame/quests?chain=all`
- Frame Type: `quest-board`
- Button: "Browse Quests"
- Current: Falls back to leaderboard

## Analytics Tracking

Each frame embed includes action metadata:

```typescript
extra: {
  embed: 'bot-reply',      // Source: bot auto-reply
  action: 'view-stats',    // Specific action
  // Additional context...
}
```

### Action Names
- `view-stats` - Stats summary
- `view-quest` - Specific quest
- `browse-quests` - Quest board
- `view-rankings` - Leaderboard
- `join-guild` - Guild invite
- `view-profile` - Profile card
- `view-badge` - Badge showcase
- `claim-streak` - Daily streak

## Architecture Benefits

### 1. **Automatic Route Selection**
Bot automatically selects best available route based on params:
- Has fid → Use `/frame/stats/[fid]`
- Has questId → Use `/frame/quest/[questId]`
- No params → Use `/frame/leaderboard`

### 2. **Graceful Degradation**
Missing parameters trigger smart fallbacks:
- Quest without questId → Leaderboard (has Quest access)
- Stats without fid → Leaderboard (general view)
- Badge without fid → Stats (alternative view)

### 3. **Specification Compliance**
All frames use Farcaster Mini App Embed v1:
- ✅ Single button (not array)
- ✅ `launch_frame` action type
- ✅ Required `action.name` field
- ✅ No deprecated POST actions

### 4. **Future-Proof**
Easy to add new routes:
1. Create `/frame/[new-route]/route.tsx`
2. Add to `FrameShareInput` type in `lib/share.ts`
3. Add case to `detectBestFrameRoute()` function
4. Bot automatically uses new route

## Example Bot Reply Flow

### User Cast
```
@gmeowbased what quests can I do?
```

### Bot Processing
1. **Intent Detection**: `quest-recommendations` intent detected
2. **Frame Selection**: `selectFrameForIntent('quest-recommendations', { fid: 18139 })`
3. **Smart Routing**: `detectBestFrameRoute({ type: 'quest-board', fid: 18139 })`
4. **Route Output**: `{ type: 'leaderboards' }` (fallback, has Quest access)
5. **URL Building**: `https://gmeowhq.art/frame/leaderboard?chain=all&fid=18139&action=browse-quests`

### Bot Reply
```
gm @heycat! Here are today's contracts. Scope the board → [Frame Embed]

Frame Button: "Open Leaderboard"
Frame URL: https://gmeowhq.art/frame/leaderboard?chain=all&fid=18139
Action: launch_frame → https://gmeowhq.art/leaderboard → Navigate to Quest page
```

## Error Handling

### Missing Required Parameters
```typescript
// Example: Stats without fid
buildBotFrameEmbed({ type: 'stats-summary' })
// → Returns null (graceful failure)

// Example: Quest without questId
buildBotFrameEmbed({ type: 'quest-specific' })
// → Falls back to leaderboard (has Quest navigation)
```

### Invalid Routes
- Invalid chain parameter → Route returns 400
- Non-existent fid → Route returns 404
- Missing questId for quest route → Falls back to leaderboard

### Frame Build Failures
If `buildFrameShareUrl()` returns empty string:
- Returns `null` from `buildBotFrameEmbed()`
- Bot sends text-only reply without frame embed
- Logs error for debugging

## Performance Optimizations

### 1. **Single Function Call**
Smart routing eliminates redundant checks:
```typescript
// OLD (multiple checks)
if (type === 'stats' && fid) { ... }
else if (type === 'quest' && questId) { ... }
else if (type === 'quest') { fallback } 

// NEW (single detection)
const route = detectBestFrameRoute({ type, fid, questId })
```

### 2. **Cached Route Logic**
Route detection uses pure functions (no DB queries)

### 3. **Early Returns**
Fails fast if required params missing:
```typescript
if (!fid) return null  // No unnecessary processing
```

## Summary

✅ **Smart routing**: Automatically selects best available frame route
✅ **Graceful fallbacks**: Missing params trigger appropriate alternatives  
✅ **Specification compliant**: All frames use Mini App Embed v1
✅ **Future-proof**: Easy to add new routes without refactoring
✅ **Performance**: Single-pass detection, no redundant checks
⏳ **Migration needed**: Guild and GM frames still use `/api/frame`

Next steps:
1. Create `/frame/gm` route for streak claims
2. Create `/frame/guild` route for guild invites  
3. Create `/frame/quests` route for quest browsing (remove leaderboard fallback)
