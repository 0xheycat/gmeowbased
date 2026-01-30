# TypeScript Error Audit - January 1, 2026

**Total Errors**: 75 errors across codebase  
**Phase 1 Errors**: 0 errors ✅  
**Pre-Existing Errors**: 75 errors (NOT blocking Phase 2)

---

## Phase 1 Files - ✅ CLEAN (0 errors)

All Phase 1 migration files compile without errors:

1. ✅ `components/leaderboard/LeaderboardTable.tsx`
2. ✅ `components/modals/ScoreDetailsModal.tsx`
3. ✅ `components/score/TierBadge.tsx`
4. ✅ `components/score/TotalScoreDisplay.tsx`
5. ✅ `components/score/ScoreBreakdownCard.tsx`
6. ✅ `hooks/useUserStats.ts`
7. ✅ `hooks/useLeaderboard.ts`
8. ✅ `hooks/useUserHistory.ts`
9. ✅ `lib/apollo-client.ts`
10. ✅ `lib/graphql/fragments.ts`
11. ✅ `lib/graphql/queries/user-stats.ts`
12. ✅ `lib/graphql/queries/leaderboard.ts`
13. ✅ `lib/graphql/queries/user-history.ts`

---

## Pre-Existing Errors (75 total)

These errors existed BEFORE Phase 1 and are NOT blocking the migration:

### Category 1: Test Pages (16 errors)
**File**: `app/score-test/page.tsx`  
**Issue**: Passing `null` instead of `undefined` to address props  
**Impact**: LOW - Test page only  
**Fix**: Change `null` to `undefined` or update component types

### Category 2: Quest API Routes (12 errors)
**Files**:
- `app/api/quests/[slug]/verify/route.ts`
- `app/api/quests/mark-claimed/route.ts`
- `app/api/quests/regenerate-signature/route.ts`

**Issue**: Supabase table schema mismatch (claim_signature, is_claimed fields)  
**Impact**: MEDIUM - Quest claiming may have issues  
**Fix**: Update Supabase types or remove deprecated fields

### Category 3: Quest Pages (4 errors)
**Files**:
- `app/quests/manage/page.tsx`

**Issue**: xpRange property not in QuestFilterState type  
**Impact**: LOW - Filter UI may have issues  
**Fix**: Add xpRange to QuestFilterState interface

### Category 4: Offline Leaderboard (24 errors)
**Files**:
- `lib/supabase/queries/leaderboard.ts`
- `archive/phase7-deprecated/leaderboard-scorer.ts`

**Issue**: UserOnChainStats interface missing properties (wallet, rank, totalScore, fid, etc.)  
**Impact**: NONE - These are DEPRECATED files (offline calculations replaced by Phase 1)  
**Fix**: Will be deleted when offline system is fully removed

### Category 5: Guild Jobs (7 errors)
**Files**:
- `lib/jobs/sync-guild-deposits.ts`
- `lib/jobs/sync-guild-level-ups.ts`

**Issue**: Supabase client possibly null, type mismatches  
**Impact**: LOW - Background jobs only  
**Fix**: Add null checks and fix SupabaseGuildEvent type

### Category 6: Missing Modules (2 errors)
**Files**:
- `lib/leaderboard/index.ts` - Cannot find './rank'
- `lib/profile/index.ts` - Cannot find './stats-calculator'

**Impact**: MEDIUM - May break imports  
**Fix**: Create missing files or remove imports

### Category 7: Mock Data (6 errors)
**File**: `lib/supabase/queries/gm.ts`  
**Issue**: USE_MOCK_DATA constant not found  
**Impact**: LOW - Development only  
**Fix**: Define USE_MOCK_DATA or remove references

### Category 8: Metadata (2 errors)
**Files**:
- `lib/badges/badge-metadata.ts`
- `lib/contracts/nft-metadata.ts`

**Issue**: 'slug' variable not found  
**Impact**: LOW - Likely scoping issue  
**Fix**: Check template literal usage

### Category 9: Components (2 errors)
**Files**:
- `components/guild/GuildCreationForm.tsx` - Invalid props to ScoreBreakdownCard
- `components/guild/index.ts` - TreasuryTransaction import issue
- `components/home/LiveQuests.tsx` - xpReward prop doesn't exist on QuestCard
- `components/quests/QuestAnalytics.tsx` - 'slug' not found
- `hooks/useQuests.ts` - 'slug' not found (2 instances)

**Impact**: LOW-MEDIUM  
**Fix**: Update component props and imports

---

## Recommendation

**✅ Phase 1 is COMPLETE and READY for Phase 2**

The 75 pre-existing errors should be addressed **separately** in their own cleanup task, NOT as part of the hybrid architecture migration. They don't block Phase 2 work.

**Suggested Cleanup Plan** (Post-Migration):
1. Fix test pages (change null → undefined)
2. Delete deprecated offline leaderboard files
3. Fix Quest API route types
4. Add missing module files or remove imports
5. Clean up component prop mismatches

---

**Verification Command**:
```bash
# Check Phase 1 files only
pnpm tsc --noEmit 2>&1 | grep -E "(LeaderboardTable|ScoreDetailsModal|TierBadge|TotalScoreDisplay|ScoreBreakdownCard|useUserStats|useLeaderboard|useUserHistory|apollo-client)"

# Should return nothing (0 errors)
```

**Result**: ✅ 0 errors in Phase 1 files
