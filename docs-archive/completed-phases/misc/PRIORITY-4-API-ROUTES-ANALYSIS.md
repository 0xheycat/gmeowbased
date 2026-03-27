# Priority 4: API Routes Analysis - December 22, 2025

## 🎯 Objective
Update all API routes to use new field names with proper snake_case → camelCase transformation.

## 📋 Field Renames Required

### Database Layer (Supabase - snake_case):
- `base_points` → `points_balance` ✅ (P1 migration complete)
- `viral_xp` → `viral_bonus_points` ✅ (P1 migration complete)  
- `total_points` → `treasury_points` ✅ (P1 migration complete - guild context)

### API Response Layer (camelCase):
- Database `points_balance` → API `pointsBalance`
- Database `viral_bonus_points` → API `viralPoints`
- Database `treasury_points` → API `treasuryPoints`

## 🔍 Files Requiring Updates

### High Priority (Direct field usage):

**1. `app/api/rewards/claim/route.ts`**
- Lines with `viral_xp`: 60, 84, 142, 329, 351, 407
- Status: ⏳ NOT STARTED
- Impact: Rewards claiming system
- Changes needed: 6 occurrences

**2. `app/api/test-infrastructure/route.ts`**
- Lines: 84 (blockchainPoints), 88 (viralXP)
- Status: ⏳ NOT STARTED
- Impact: Testing infrastructure
- Changes needed: 2 occurrences

**3. `app/api/guild/[guildId]/route.ts`**
- Lines with `base_points`: 221, 313, 426, 430, 586, 593
- Lines with `viral_xp`: 222, 314, 431, 544
- Lines with `total_points`: 239, 262
- Status: ⏳ NOT STARTED
- Impact: Guild detail endpoint
- Changes needed: 14 occurrences

**4. `app/api/guild/list/route.ts`**
- Lines with `total_points`: 239, 262
- Status: ⏳ NOT STARTED
- Impact: Guild listing
- Changes needed: 2 occurrences

**5. `app/api/quests/create/route.ts`**
- Lines: 172, 184 (total_points), 243 (min_viral_xp_required), 260 (base_points)
- Status: ⏳ NOT STARTED
- Impact: Quest creation
- Changes needed: 4 occurrences

## 📊 Summary Statistics

| File | Occurrences | Complexity | Priority |
|------|-------------|------------|----------|
| rewards/claim/route.ts | 6 | Medium | High |
| guild/[guildId]/route.ts | 14 | High | High |
| test-infrastructure/route.ts | 2 | Low | Medium |
| guild/list/route.ts | 2 | Low | Medium |
| quests/create/route.ts | 4 | Medium | Medium |

**Total changes**: 28 occurrences across 5 files

## 🛡️ Safety Rules (Learned from Yesterday)

1. ✅ ONE FILE AT A TIME - Complete and verify before moving to next
2. ✅ READ FULL CONTEXT - Understand surrounding code before editing
3. ✅ UPDATE ALL LAYERS - Database query + response transformation
4. ✅ VERIFY BUILD - Check TypeScript errors after each file
5. ✅ TEST QUERIES - Ensure Supabase queries use correct column names
6. ❌ NO RUSHING - Careful verification at each step

## 📝 Update Pattern

For each file:
```typescript
// BEFORE (OLD - snake_case from old migrations)
const { data } = await supabase
  .from('leaderboard_calculations')
  .select('base_points, viral_xp')

return {
  basePoints: data.base_points,
  viralXP: data.viral_xp
}

// AFTER (NEW - snake_case from P1 migrations)
const { data } = await supabase
  .from('leaderboard_calculations')
  .select('points_balance, viral_bonus_points')

return {
  pointsBalance: data.points_balance,
  viralPoints: data.viral_bonus_points
}
```

## 🎯 Execution Plan

### Step 1: Start with smallest file
- File: `app/api/test-infrastructure/route.ts` (2 changes)
- Reason: Low complexity, easy to verify
- Time: ~10 minutes

### Step 2: Medium complexity
- File: `app/api/guild/list/route.ts` (2 changes)
- Reason: Simple query transformation
- Time: ~10 minutes

### Step 3: Quest system
- File: `app/api/quests/create/route.ts` (4 changes)
- Reason: Moderate complexity
- Time: ~15 minutes

### Step 4: Rewards system
- File: `app/api/rewards/claim/route.ts` (6 changes)
- Reason: Critical system, multiple transformations
- Time: ~20 minutes

### Step 5: Complex guild endpoint
- File: `app/api/guild/[guildId]/route.ts` (14 changes)
- Reason: Highest complexity, most changes
- Time: ~30 minutes

**Total estimated time**: ~85 minutes (1.5 hours)

## 🔍 Verification Checklist (Per File)

- [ ] Read full file context
- [ ] Identify all field occurrences (grep search)
- [ ] Update Supabase queries (snake_case column names)
- [ ] Update response transformations (camelCase)
- [ ] Update TypeScript types if needed
- [ ] Build succeeds (npm run build)
- [ ] No TypeScript errors (get_errors tool)
- [ ] Document changes in commit/notes

## 📖 Reference Documentation

- `PRIORITY-1-COMPLETE.md` - P1 Supabase migrations (column renames)
- `types/supabase.generated.ts` - TypeScript types (auto-generated)
- `POINTS-NAMING-CONVENTION.md` - Naming standards

---

**Status**: Analysis complete, ready to start Step 1  
**Next**: Update `app/api/test-infrastructure/route.ts` (2 changes)
