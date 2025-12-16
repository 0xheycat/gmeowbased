# 🗑️ Tip System Removal Checklist

**Date**: December 9, 2025  
**Reason**: Rebuilding with professional Farcaster mention-based pattern  
**Status**: READY TO EXECUTE  

---

## 📋 Overview

**Problem**: Current tip system uses unprofessional wallet-to-wallet pattern instead of Farcaster-native mention flow

**Old Systems**:
1. **USDC Tips**: Ko-fi-style modal, OnchainKit checkout, leaderboard
2. **Contract Points Tips**: TipHub worker, scoring engine, mention detection
3. **Hybrid Backend**: Just created (tip_type support, dual stats)

**Solution**: Remove ALL existing code, rebuild from scratch with @gmeowbased mention bot

---

## 🗂️ Files to Remove

### 1. API Routes (8 files)

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| `app/api/tips/presets/route.ts` | ~50 | Ko-fi amounts ($1-$50) | None |
| `app/api/tips/record/route.ts` | ~180 | USDC tip recording | Supabase, Request-ID |
| `app/api/tips/record-points/route.ts` | 187 | Points tip recording (Session 8) | Supabase, Zod, Rate limiter |
| `app/api/tips/leaderboard/route.ts` | ~220 | 3-category leaderboard | Supabase, type filtering |
| `app/api/tips/user/[fid]/route.ts` | ~150 | User tip history | Supabase |
| `app/api/tips/summary/route.ts` | ~80 | Stats aggregation | tips-scoreboard |
| `app/api/tips/stream/route.ts` | ~100 | SSE real-time feed | tips-broker |
| `app/api/tips/ingest/route.ts` | ~200 | Farcaster Hub webhook | tips-broker, tips-scoreboard |

**Command**:
```bash
rm -rf app/api/tips/
```

---

### 2. UI Components (3 files)

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| `components/tips/TipButton.tsx` | 63 | Ko-fi button | TipModal |
| `components/tips/TipModal.tsx` | 316 | Full tip UI (presets, custom, message) | OnchainKit, Privy, types/tips |
| `components/tips/TipLeaderboard.tsx` | 228 | 3-tab leaderboard | tabs, types/tips |

**Used In**:
- `components/dashboard/DashboardNotificationCenter.tsx` (formatTip helpers)
- `components/profile/ProfileCard.tsx` (likely TipButton)
- `TIP-SYSTEM-IMPLEMENTATION-COMPLETE.md` (documentation only)

**Command**:
```bash
rm -rf components/tips/
```

---

### 3. Library Files (5 files)

| File | Lines | Purpose | Keep/Remove |
|------|-------|---------|-------------|
| `lib/tips-scoring.ts` | 239 | Complex mention scoring (cooldowns, caps) | ❌ Remove |
| `lib/tips-scoreboard.ts` | ~80 | Tracking awards/caps | ❌ Remove |
| `lib/tips-types.ts` | 107 | TipBroadcast, TipMentionScoreboardEntry | ❌ Remove |
| `lib/tip-bot-helpers.ts` | 139 | 7 message templates, tier calculation | ✅ **KEEP** (reuse for new bot) |
| `lib/tips-broker.ts` | ~70 | Event broker for tip streams | ❌ Remove (rebuild simpler) |

**Command**:
```bash
rm lib/tips-scoring.ts
rm lib/tips-scoreboard.ts
rm lib/tips-types.ts
rm lib/tips-broker.ts
# Keep lib/tip-bot-helpers.ts for now (will refactor)
```

---

### 4. Scripts (1 file)

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| `scripts/tipHubWorker.ts` | 120 | Listens to Farcaster Hub for tip link_add | @farcaster/hub-nodejs |

**Command**:
```bash
rm scripts/tipHubWorker.ts
```

---

### 5. Type Definitions (1 file)

| File | Lines | Purpose | Used By |
|------|-------|---------|---------|
| `types/tips.ts` | 171 | TipPreset, TipTransaction, TipLeaderboardEntry, bot messages | 10+ files |

**Command**:
```bash
rm types/tips.ts
```

---

### 6. Admin Components (2 files - PARTIAL REMOVAL)

| File | Action | Reason |
|------|--------|--------|
| `components/admin/TipScoringPanel.tsx` | ❌ Remove | Uses tips-scoring.ts (complex engine) |
| `components/dashboard/TipMentionSummaryCard.tsx` | ❌ Remove | Uses tips-types.ts (old schema) |
| `components/dashboard/DashboardNotificationCenter.tsx` | ✅ **KEEP** | Has formatTip helpers (refactor imports) |

**Command**:
```bash
rm components/admin/TipScoringPanel.tsx
rm components/dashboard/TipMentionSummaryCard.tsx
# Keep DashboardNotificationCenter.tsx
```

---

## 🗄️ Database Cleanup

### Tables to Remove

1. **tips** table (11 columns)
   - Current schema: USDC + points hybrid (Session 8)
   - New schema: Mention-based points only
   - **Action**: DROP and recreate with new schema

2. **tip_leaderboard** table (18 columns)
   - Current: USDC + points dual stats
   - New: Points-only leaderboard
   - **Action**: DROP (will use materialized view instead)

3. **tip_streaks** table (5 columns)
   - Current: Daily tip tracking
   - New: Rebuild with streak bonuses
   - **Action**: DROP and recreate

### Migration Plan

**File**: `supabase/migrations/20251209_remove_old_tip_tables.sql`

```sql
-- ====================================
-- TIP SYSTEM CLEANUP MIGRATION
-- Removes old USDC/hybrid tip tables
-- Prepares for mention-based rebuild
-- Date: December 9, 2025
-- ====================================

-- 1. Drop old tables (preserve data in backup)
DROP TABLE IF EXISTS public.tip_streaks CASCADE;
DROP TABLE IF EXISTS public.tip_leaderboard CASCADE;
DROP TABLE IF EXISTS public.tips CASCADE;

-- 2. Remove tip_points column from leaderboard_calculations (if exists)
-- ALTER TABLE public.leaderboard_calculations DROP COLUMN IF EXISTS tip_points;

COMMENT ON SCHEMA public IS 'Old tip tables removed - ready for mention-based system rebuild';
```

**Backup Command** (BEFORE running migration):
```bash
# Backup existing tip data
pg_dump $DATABASE_URL \
  --table=public.tips \
  --table=public.tip_leaderboard \
  --table=public.tip_streaks \
  --data-only \
  --file=backups/tip-system-backup-$(date +%Y%m%d).sql
```

---

## 🔍 Dependencies to Update

### 1. DashboardNotificationCenter.tsx (REFACTOR)

**Current imports**:
```typescript
import type { TipBroadcast } from '@/lib/tips-types'
```

**Action**: Remove tip formatting helpers (formatTipSender, formatTipRecipient, formatTipValue)  
**Reason**: New system uses Farcaster notifications, not custom tip broadcasts

---

### 2. Profile Components (CHECK)

**Potential imports**:
- `components/profile/ProfileCard.tsx` → May use TipButton
- `components/profile/ProfileStats.tsx` → May use tip stats

**Action**: Search and remove TipButton imports

---

### 3. Admin Dashboard (CHECK)

**Current**:
- `components/admin/TipScoringPanel.tsx` → Uses tips-scoring.ts

**Action**: Already marked for removal

---

## ✅ Verification Steps

### 1. Check All Imports (BEFORE removal)

```bash
# Find all files importing tip modules
grep -r "from '@/lib/tips" app/ components/ lib/ --include="*.ts" --include="*.tsx"
grep -r "from '@/components/tips" app/ components/ --include="*.ts" --include="*.tsx"
grep -r "from '@/types/tips" app/ components/ lib/ --include="*.ts" --include="*.tsx"

# Count occurrences
grep -r "import.*tips" app/ components/ lib/ --include="*.ts" --include="*.tsx" | wc -l
```

**Expected**: 19 matches (from earlier grep search)

---

### 2. TypeScript Check (AFTER removal)

```bash
# Should show errors for removed imports (expected)
npx tsc --noEmit

# Fix by removing import statements in dependent files
```

---

### 3. Database Verification (AFTER migration)

```sql
-- Check tables removed
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%tip%';

-- Expected: Empty result or only new tables
```

---

### 4. API Endpoint Check (AFTER removal)

```bash
# Should return 404
curl https://gmeowhq.art/api/tips/presets
curl https://gmeowhq.art/api/tips/leaderboard
curl https://gmeowhq.art/api/tips/record

# Expected: 404 Not Found
```

---

## 📦 Files to KEEP (Reusable)

| File | Reason | Refactor Needed |
|------|--------|-----------------|
| `lib/tip-bot-helpers.ts` | 7 message templates, tier calculation | ✅ Yes (update for new schema) |
| `lib/viral-notifications.ts` | Dispatch system, rate limiting | ✅ No (works with new system) |
| `lib/notification-history.ts` | Database persistence | ✅ No (already supports 'tip' category) |
| `app/api/admin/bot/activity/route.ts` | Bot interaction tracking | ✅ No (mention detection works) |

---

## 🚀 Execution Plan

### Step 1: Backup (5 min)
```bash
# 1. Backup database
pg_dump $DATABASE_URL \
  --table=public.tips \
  --table=public.tip_leaderboard \
  --table=public.tip_streaks \
  --data-only \
  --file=backups/tip-system-backup-$(date +%Y%m%d).sql

# 2. Commit current state to git
git add .
git commit -m "chore: backup before tip system removal"
git push
```

---

### Step 2: Remove Files (10 min)
```bash
# APIs
rm -rf app/api/tips/

# Components
rm -rf components/tips/
rm components/admin/TipScoringPanel.tsx
rm components/dashboard/TipMentionSummaryCard.tsx

# Libs
rm lib/tips-scoring.ts
rm lib/tips-scoreboard.ts
rm lib/tips-types.ts
rm lib/tips-broker.ts

# Scripts
rm scripts/tipHubWorker.ts

# Types
rm types/tips.ts

# Verify removal
ls -la app/api/tips/ 2>/dev/null || echo "✅ APIs removed"
ls -la components/tips/ 2>/dev/null || echo "✅ Components removed"
```

---

### Step 3: Fix Dependent Files (15 min)

**File 1**: `components/dashboard/DashboardNotificationCenter.tsx`
```typescript
// REMOVE these imports
import type { TipBroadcast } from '@/lib/tips-types'

// REMOVE these functions
function formatTipSender(tip: any) { ... }
function formatTipRecipient(tip: any) { ... }
function formatTipValue(tip: any) { ... }

// REMOVE tip notification rendering
// (will rebuild with new schema)
```

**File 2**: Search for other imports
```bash
# Find remaining tip imports
grep -r "from '@/lib/tips" app/ components/ --include="*.tsx"
grep -r "from '@/components/tips" app/ components/ --include="*.tsx"
grep -r "from '@/types/tips" app/ components/ --include="*.tsx"

# Manually fix each file (likely 2-3 files)
```

---

### Step 4: Database Migration (5 min)

```bash
# Apply removal migration
supabase migration new remove_old_tip_tables

# Paste SQL from "Database Cleanup" section above

# Apply migration
supabase db push

# Verify
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%tip%';"
```

---

### Step 5: Verify TypeScript (5 min)

```bash
# Should pass (after fixing imports)
npx tsc --noEmit

# If errors, fix manually:
# - Remove tip-related imports
# - Comment out tip-related UI code
# - Update types to use new schema (later)
```

---

### Step 6: Git Commit (2 min)

```bash
git add .
git commit -m "chore: remove old tip system for mention-based rebuild

- Removed 8 API routes (app/api/tips/)
- Removed 3 UI components (components/tips/)
- Removed 4 lib files (tips-scoring, tips-broker, etc.)
- Removed 1 script (tipHubWorker.ts)
- Removed 1 type file (types/tips.ts)
- Removed 2 admin components (TipScoringPanel, TipMentionSummaryCard)
- Dropped 3 database tables (tips, tip_leaderboard, tip_streaks)
- Updated DashboardNotificationCenter (removed tip formatting)

Ready for mention-based tip system rebuild following Farcaster professional patterns."

git push
```

---

## 📊 Impact Analysis

### Files Removed: 18 total
- APIs: 8 files (~1000 lines)
- Components: 5 files (~700 lines)
- Libs: 4 files (~500 lines)
- Scripts: 1 file (120 lines)
- Types: 1 file (171 lines)

### Database: 3 tables dropped
- `tips` (11 columns)
- `tip_leaderboard` (18 columns)
- `tip_streaks` (5 columns)

### Total Code Removed: ~2500 lines

### Files Preserved: 4 files
- `lib/tip-bot-helpers.ts` (message templates - will refactor)
- `lib/viral-notifications.ts` (dispatch system)
- `lib/notification-history.ts` (persistence)
- `app/api/admin/bot/activity/route.ts` (bot tracking)

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lost production tip data | HIGH | ✅ pg_dump backup before removal |
| Broken UI references | MEDIUM | ✅ TypeScript errors will surface all imports |
| Dependent features break | MEDIUM | ✅ Grep search found 19 import locations |
| User confusion (existing tips) | LOW | ✅ Display "System upgrading" message |

---

## ✅ Success Criteria

- [ ] All 18 files removed
- [ ] 3 database tables dropped
- [ ] 0 TypeScript errors (`npx tsc --noEmit`)
- [ ] 0 grep results for tip imports (except preserved files)
- [ ] Git commit created with comprehensive message
- [ ] Backup SQL file created (`backups/tip-system-backup-YYYYMMDD.sql`)
- [ ] Ready to implement new mention-based system (Phase 1)

---

## 🔗 Next Steps

After removal complete:
1. Read `TIP-SYSTEM-PROFESSIONAL-ARCHITECTURE.md` for new design
2. Implement Phase 1: Core Mention System (Week 1)
3. Deploy webhook handler to production
4. Test with real Farcaster casts
5. Monitor bot replies and notifications

---

**Estimated Time**: 45 minutes total  
**Backup Required**: YES (database only)  
**Reversible**: YES (via git + SQL backup)  
**Production Impact**: MEDIUM (tip features disabled temporarily)
