# Frame System Cleanup & Optimization Plan

## Current Status (December 12, 2025)

### ✅ Completed
- 8/10 modular image routes working with correct 600x400 dimensions
- Runtime fixed (nodejs instead of edge)
- JSX layout issues resolved
- All endpoints responding < 2s

### ❌ Remaining Issues

1. **Old monolithic route (3517 lines)** - `app/api/frame/image/route.tsx`
   - Still handles 2 frame types: `verify` and `badge/badgeCollection`
   - Badge collection logic (lines 2120-2550) needs migration
   - Should be deprecated after migration

2. **Hybrid Calculator Missing Types**
   - No proper TypeScript interfaces exported
   - Missing category types from original plan
   - Needs integration with frame handlers

3. **Badge Collection Not Migrated**
   - Complex multi-badge display logic
   - Badge registry and tier colors
   - Image loading for up to 9 badges
   - Stats: earnedCount, eligibleCount, badgeXp

## Migration Plan

### Phase 1: Add Missing Types to Hybrid Calculator

**File:** `lib/scoring/hybrid-calculator.ts`

Add these interfaces:

```typescript
// Category types for leaderboard tabs
export type LeaderboardCategory = 
  | 'all_pilots'        // Overall leaderboard
  | 'quest_masters'     // Quest completion focus
  | 'viral_legends'     // Viral engagement focus
  | 'guild_heroes'      // Guild activity focus
  | 'referral_champions' // Referral focus
  | 'streak_kings'      // GM streak focus
  | 'badge_collectors'  // Badge collection focus
  | 'tip_lords'         // Tip activity focus
  | 'nft_holders'       // NFT holdings focus

// Extended user stats for frames
export interface UserFrameStats extends LeaderboardScore {
  username: string
  displayName: string
  currentStreak: number
  lifetimeGMs: number
  badgeCount: number
  guildLevel: number
  referralCount: number
}

// Quest-specific data
export interface QuestStats {
  questName: string
  progress: number
  xpReward: number
  completed: boolean
}

// Guild-specific data  
export interface GuildStats {
  guildId: string
  guildName: string
  memberCount: number
  totalDeposits: number
  level: number
  role: 'owner' | 'officer' | 'member'
}

// Badge collection data
export interface BadgeCollectionStats {
  earnedCount: number
  eligibleCount: number
  badgeXp: number
  badges: Array<{
    id: string
    name: string
    tier: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
    imageUrl: string
  }>
}
```

### Phase 2: Migrate Badge Collection Logic

**Create:** `app/api/frame/image/badgecollection/route.tsx`

**Extract from old route:**
- Badge registry (lines 2133-2141)
- Tier colors (lines 2144-2150)
- Badge image loading logic (lines 2153-2158)
- Full badge collection layout (lines 2160-2450)

**Key Features to Preserve:**
- Support up to 9 badges in 3x3 grid
- Badge tier-based border colors
- Stats display: earned/eligible counts, badge XP
- Proper 600x400 dimensions

### Phase 3: Migrate Verify Frame

**Create:** `app/api/frame/image/verify/route.tsx`

**Extract from old route:**
- Verify frame logic (lines 918-1188)
- Wallet verification display
- Connection status

### Phase 4: Clean Up Old Monolithic Route

**After migration complete:**

1. Check all frame HTML routes point to modular image routes
2. Update frame handlers to use new badge collection route
3. Remove old monolithic route entirely
4. Update documentation

### Phase 5: Optimize Hybrid Calculator Integration

**Connect calculator to frame handlers:**

```typescript
// In lib/frames/handlers/points.ts
import { calculateHybridScore } from '@/lib/scoring/hybrid-calculator'

export async function handlePointsFrame(fid: number, walletAddress: string) {
  const score = await calculateHybridScore(fid, walletAddress)
  
  return {
    totalXP: score.totalScore,
    gmXP: score.breakdown.streakBonus,
    questXP: score.breakdown.basePoints,
    viralXP: score.breakdown.viralXP,
    username: // fetch from user profile
  }
}
```

## File Structure After Cleanup

```
app/api/frame/
├── image/
│   ├── gm/route.tsx              ✅ Modular (122 lines)
│   ├── badge/route.tsx           ✅ Modular (220 lines) - single badge
│   ├── badgecollection/route.tsx ⏳ NEW - multi-badge display
│   ├── guild/route.tsx           ✅ Modular
│   ├── onchainstats/route.tsx    ✅ Modular
│   ├── referral/route.tsx        ✅ Modular
│   ├── quest/route.tsx           ✅ Modular
│   ├── points/route.tsx          ✅ Modular
│   ├── leaderboard/route.tsx     ✅ Modular
│   ├── verify/route.tsx          ⏳ NEW - verification frame
│   └── route.tsx                 ❌ DELETE (3517 lines → 0)
├── route.tsx                     ✅ Main frame handler
└── og/route.tsx                  ✅ OG image generator
```

## Benefits After Cleanup

1. **Maintainability**: Each frame type in separate file (100-300 lines)
2. **Testing**: Can test each endpoint independently
3. **Performance**: No unnecessary code loaded
4. **Type Safety**: Proper TypeScript interfaces
5. **Consistency**: All routes use same patterns
6. **Documentation**: Clear separation of concerns

## Scoring Calculation Best Practices

Based on hybrid-calculator.ts analysis:

### Current Weights (Good Balance):
- **Subsquid (95%)**: Blockchain events (verifiable)
  - GM streaks: 10 points per day
  - Badges: 25 points each
  - Referrals: 50 points each
  - Guild level: 100 points per level
  - NFTs: 100 points each

- **Supabase (5%)**: Off-chain data (fast access)
  - Quest completions: Variable per quest
  - Viral engagement: Variable per cast
  - Tip activity: 1:1 point ratio
  - Guild member bonus: 10-15% of contributions

### Recommendation: ✅ Keep Current Weights

**Reasoning:**
1. Blockchain data is source of truth (can't be gamed)
2. Off-chain data provides real-time engagement
3. Guild bonuses reward active participation
4. Balanced across different activity types
5. Easy to audit and explain to users

### Only Add if Needed:
- Time-based multipliers (e.g., streak combo bonuses)
- Seasonal events (temporary 2x XP)
- Achievement milestones (one-time bonuses)

## Next Steps

1. ✅ Add TypeScript types to hybrid-calculator.ts
2. ⏳ Create badgecollection/route.tsx (extract from old route)
3. ⏳ Create verify/route.tsx (extract from old route)
4. ⏳ Test both new routes thoroughly
5. ⏳ Update frame handlers to use new routes
6. ⏳ Delete old monolithic route
7. ⏳ Update documentation

## Testing Checklist

After migration:
- [ ] All 10 modular routes return 200 OK
- [ ] All images are 600x400 (3:2 ratio)
- [ ] Badge collection shows up to 9 badges correctly
- [ ] Verify frame displays wallet status
- [ ] No references to old monolithic route
- [ ] Frame handlers point to correct endpoints
- [ ] TypeScript compilation has no errors
- [ ] All tests passing

---
**Status**: Ready to execute Phase 1
**Priority**: High - Clean up before adding new features
**Estimated Time**: 2-3 hours for complete migration
