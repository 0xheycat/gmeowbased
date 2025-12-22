# 3-Layer Integration Status

**Date**: December 20, 2025  
**Status**: ✅ **COMPLETE - Already Integrated**

---

## Integration Points

### ✅ API Layer
- **Route**: `/api/leaderboard-v2/route.ts`
- **Uses**: `getLeaderboard()` from `lib/leaderboard/leaderboard-service.ts`
- **Status**: ✅ Full 3-layer implementation active

### ✅ Frontend
- **Page**: `app/leaderboard/page.tsx`
- **Hook**: `useLeaderboard.ts` → calls `/api/leaderboard-v2`
- **Features**: 9 category tabs (All, Quest, Viral, Guild, Referral, Streak, Badge, Tip, NFT)
- **Status**: ✅ Already using new API with all bonuses

### ✅ Data Flow
```
User Request → useLeaderboard hook → /api/leaderboard-v2 → getLeaderboard() → 3-Layer Architecture
                                                                                    ↓
                                                        Layer 1: Subsquid (on-chain)
                                                        Layer 2: Supabase (profiles, viral)
                                                        Layer 3: Calculations (level, tier)
```

---

## How Points Are Claimed

**Short Answer**: Users **DON'T claim** points - they're **auto-tracked on-chain**.

### Point Sources (Auto-Credited)
1. **GM Posts** → 10 points/GM (auto)
2. **Quests** → Reward points (auto on completion)
3. **Deposits** → User deposits to contract
4. **Referrals** → Auto-credited when referral joins

### Guild Points
- **Can claim** from guild treasury: `claimGuildReward(guildId, points)`
- Requires guild membership

### Points Usage
- Stay in contract `pointsBalance`
- Spent on: badges, quest creation, tips
- **No withdraw to wallet** - points are ecosystem-native

### Contract Functions
```solidity
// Users can:
- deposit(amount)           // Add points
- tip(to, amount)           // Transfer to another user
- spendOnBadge(badgeId)     // Spend on NFT
- spendOnQuest(questId)     // Spend on quest entry

// Guild members can:
- claimGuildReward(guildId, points)  // Claim from treasury
```

---

## No Action Required

All systems already integrated and working! 🎉
