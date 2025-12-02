# 🔍 BRANCH COMPARISON REPORT
**Date**: November 30, 2025  
**Branches**: foundation-rebuild vs main  
**Focus**: Last 9 hours commits (7cb5f27, 3444f8e, 229f21e)

---

## 📊 EXECUTIVE SUMMARY

**foundation-rebuild** is the CORRECT branch with:
- ✅ **gmeow-utils.ts** (Base-only)
- ✅ Supabase migrations (3 new ones)
- ✅ API route fixes (notifications, app structure)
- ✅ Automation scripts (sync-viral-metrics.ts)
- ✅ 46 files migrated from gm-utils → gmeow-utils

**main** branch has NONE of this work - it's the OLD multi-chain foundation.

---

## 🎯 CRITICAL COMMITS FROM 9 HOURS AGO

### 1. Commit 7cb5f27: "fix: notifications API, app structure, production logging"
**Time**: Sun Nov 30 05:32:20 2025 -0600  
**Changed**: 659 files, +108,096 insertions, -100,068 deletions

#### Key Changes:

**API Routes Created/Fixed:**
- ✅ `app/api/notifications/route.ts` - New notification history API
  - GET /api/notifications (fetch user notifications with filters)
  - POST /api/notifications (create new notifications)
  - PATCH /api/notifications/[id] (dismiss notifications)
  - Uses `user_notification_history` Supabase table
  - Supports filters: fid, walletAddress, category, limit, includeDismissed

**Supabase Migrations (3 NEW FILES):**
- ✅ `supabase/migrations/20251130000001_setup_pg_cron_jobs.sql`
  - pg_cron extension enabled
  - Automated cleanup jobs:
    1. Notification history cleanup (weekly, Sunday 2 AM UTC)
    2. Frame session cleanup (daily, 4 AM UTC)
    3. Quest expiration (daily, 3 AM UTC)
  - Added metadata column to xp_transactions table (JSONB)
  
- ✅ `supabase/migrations/20251130000002_enable_rls_policies.sql`
  - RLS policies for user_notification_history table
  - Security: Users can only read their own notifications
  - Admin: Can read all notifications
  
- ✅ `supabase/migrations/20251130000003_fix_security_issues.sql`
  - Additional security hardening
  - RLS policy refinements

**Component Folder Restructure:**
- ✅ Renamed `components/` → `components(old)/` (preserving legacy)
- ✅ Created new `components/` folder with fresh structure:
  - ChainSwitcher.tsx
  - ConnectWallet.tsx
  - ContractGMButton.tsx
  - ContractLeaderboard.tsx
  - ErrorBoundary.tsx
  - GMButton.tsx
  - GMCountdown.tsx
  - GMHistory.tsx
  - LeaderboardList.tsx
  - MobileNavigation.tsx
  - OnchainStats.tsx
  - PixelCard.tsx
  - PixelHeader.tsx
  - PixelSidebar.tsx
  - ProfileStats.tsx
  - ProgressXP.tsx
  - TimeEmoji.tsx
  - UserProfile.tsx
  - + 200+ more components organized by feature

**App Routes Preserved:**
- ✅ All existing app routes maintained:
  - app/Dashboard/page.tsx
  - app/Quest/[chain]/[id]/page.tsx
  - app/profile/page.tsx
  - app/leaderboard/page.tsx
  - app/notifications/page.tsx (NEW)
  - app/gm/page.tsx
  - app/admin/ routes

**Docs Restructure:**
- ✅ Moved old docs → `docs-archive/old-planning-nov-2025/`
- ✅ New docs structure:
  - CURRENT-TASK.md (updated)
  - DEPLOY-NOW.md
  - BASE-ONLY-SECURITY-UPDATE.md
  - ENV-UPDATE-SUMMARY.md
  - FINAL-DECISION.md
  - FOUNDATION-UPDATE-SUMMARY.md
  - GITHUB-WORKFLOW-SETUP.md
  - NAVIGATION-UPDATE-COMPLETE.md
  - NOTIFICATION-SYSTEM-FIX.md
  - PRODUCTION-FIXES-SUMMARY.md
  - WORKFLOW-IMPLEMENTATION-SUMMARY.md

**GitHub Workflows:**
- ✅ `.github/workflows/viral-metrics-sync.yml` (NEW)
  - Runs sync-viral-metrics.ts script
  - Cron: Every 6 hours
  - Updates badge cast viral scores
  
- ✅ `.github/workflows/supabase-leaderboard-sync.yml` (updated)
- ✅ `.github/workflows/badge-minting.yml` (updated)

**Scripts:**
- ✅ `scripts/automation/sync-viral-metrics.ts` (NEW - 400 lines)
  - Fetches engagement metrics from Neynar API
  - Updates viral_score, viral_tier, viral_bonus_xp
  - Formula: viral_score = (recasts × 10) + (replies × 5) + (likes × 2)
  - Tiers: none, active, engaging, popular, viral, mega_viral
  - Bonus XP: 10, 25, 50, 100, 250 per tier

---

### 2. Commit 3444f8e: "fix: TypeScript errors in sync-viral-metrics script"
**Time**: Sun Nov 30 05:40:35 2025 -0600  
**Changed**: 2 files, +205 insertions, -5 deletions

#### Key Changes:
- ✅ Fixed TypeScript compilation errors in sync-viral-metrics.ts
- ✅ Added Database type import from types/supabase
- ✅ Initialize Supabase client with proper type parameter
- ✅ Fixed function signatures to use typed client
- ✅ Replaced CommonJS require check with ES module check
- ✅ Created `TYPESCRIPT-FIXES-SUMMARY.md` documenting all 5 fixes

---

### 3. Commit 229f21e: "docs: comprehensive UI/UX restructuring plan"
**Time**: Sun Nov 30 05:45:10 2025 -0600  
**Changed**: 1 file, +1,356 insertions

#### Key Changes:
- ✅ Created `UI-UX-RESTRUCTURING-PLAN.md` (1,356 lines)
- ✅ Defined 6 core template categories:
  1. Quest Wizard (17 hours rebuild)
  2. Dashboard (23 hours rebuild)
  3. Profile (27 hours rebuild)
  4. Landing Page
  5. Admin Panel
  6. Frame System
- ✅ Farcaster miniapp optimization strategy
- ✅ base.dev integration roadmap
- ✅ Icon system strategy (React Icons)
- ✅ Time utilities plan (date-fns)
- ✅ 7-phase implementation roadmap (120-150 hours)
- ✅ Component library structure
- ✅ Success metrics defined
- ✅ Pros/cons analysis for all decisions

---

## 🔬 FILE COMPARISON: foundation-rebuild vs main

### API Routes (app/api/)

**foundation-rebuild HAS (main MISSING):**
```typescript
// app/api/notifications/route.ts - NEW API (218 lines)
GET /api/notifications - Fetch notifications with filters
POST /api/notifications - Create new notifications  
PATCH /api/notifications/[id] - Dismiss notifications

Features:
- Filter by fid, walletAddress, category
- Pagination (limit, default 50, max 100)
- Include/exclude dismissed
- Categories: quest, badge, guild, reward, tip, streak, level, achievement
```

**Import Changes:**
```diff
// foundation-rebuild uses gmeow-utils (Base-only)
- import { ... } from '@/lib/gm-utils'
+ import { ... } from '@/lib/gmeow-utils'

Files affected (46 total):
- app/api/admin/badges/[id]/route.ts
- app/api/admin/badges/route.ts
- app/api/badges/[address]/route.ts
- app/api/farcaster/assets/route.ts
- app/api/frame/route.tsx
- app/api/leaderboard/route.ts
- ... + 40 more
```

### Supabase Migrations

**foundation-rebuild HAS (main MISSING):**
```sql
-- 20251130000001_setup_pg_cron_jobs.sql (165 lines)
Automated cleanup jobs:
1. cleanup_old_notifications() - Delete notifications >90 days
2. cleanup_old_frame_sessions() - Delete sessions >30 days
3. expire_quests() - Mark quests as expired

Cron schedules:
- Notifications: 0 2 * * 0 (Sunday 2 AM UTC)
- Frame sessions: 0 4 * * * (Daily 4 AM UTC)
- Quest expiration: 0 3 * * * (Daily 3 AM UTC)

New column: xp_transactions.metadata (JSONB)

-- 20251130000002_enable_rls_policies.sql (240 lines)
RLS policies for user_notification_history:
- Users read own notifications
- Admins read all notifications
- Secure delete/update policies

-- 20251130000003_fix_security_issues.sql (189 lines)
Additional security hardening
```

### Scripts

**foundation-rebuild HAS (main MISSING):**
```typescript
// scripts/automation/sync-viral-metrics.ts (400 lines)
Purpose: Sync engagement metrics from Neynar to Supabase

Features:
- Fetches cast engagement (likes, recasts, replies)
- Calculates viral_score with weighted formula
- Assigns viral_tier (none → mega_viral)
- Awards viral_bonus_xp on tier upgrades
- Batch processing (50 casts per batch)
- Rate limit protection (100ms delay)
- Updates every 6 hours (only stale casts)

Formula:
viral_score = (recasts × 10) + (replies × 5) + (likes × 2)

Tiers:
- none: 0-9 → 0 XP
- active: 10-49 → +10 XP
- engaging: 50-99 → +25 XP
- popular: 100-249 → +50 XP
- viral: 250-499 → +100 XP
- mega_viral: 500+ → +250 XP
```

### GitHub Workflows

**foundation-rebuild HAS (main MISSING):**
```yaml
# .github/workflows/viral-metrics-sync.yml
Cron: 0 */6 * * * (every 6 hours)
Runs: scripts/automation/sync-viral-metrics.ts
Updates: Badge cast viral scores automatically
```

### Library Files

**foundation-rebuild:**
```typescript
// lib/gmeow-utils.ts (1,022 lines)
Comment: "Gmeowbased utilities - Base chain only"
GMChainKey = 'base' // SINGLE CHAIN
ChainKey = 'base' | 'optimism' | ... // For OnchainStats viewing only

CHAIN_IDS: Record<GMChainKey, number> = {
  base: 8453
}

CONTRACT_ADDRESSES: Record<GMChainKey, address> = {
  base: '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92'
}
```

**main:**
```typescript
// lib/gm-utils.ts (929 lines)
Comment: "Full-feature gm-utils for GmeowMultichain"
GMChainKey = 'base' | 'unichain' | 'celo' | 'ink' | 'op' // MULTI-CHAIN

CHAIN_IDS: Record<GMChainKey, number> = {
  base: 8453,
  unichain: 130,
  celo: 42220,
  ink: 57073,
  op: 10
}

CONTRACT_ADDRESSES: Record<GMChainKey, address> = {
  base: '0x3ad420B8C2Be19ff8EBAdB484Ed839Ae9254bf2F',
  unichain: '0xD8b4190c87d86E28f6B583984cf0C89FCf9C2a0f',
  celo: '0xa68BfB4BB6F7D612182A3274E7C555B7b0b27a52',
  ink: '0x6081a70c2F33329E49cD2aC673bF1ae838617d26',
  op: '0xF670d5387DF68f258C4D5aEBE67924D85e3C6db6'
}
```

---

## 📁 COMPONENT FOLDER RESTRUCTURE

**foundation-rebuild:**
```
components/           (NEW - organized by feature)
├── ChainSwitcher.tsx
├── ConnectWallet.tsx
├── ContractGMButton.tsx
├── GMButton.tsx
├── GMCountdown.tsx
├── GMHistory.tsx
├── MobileNavigation.tsx
├── OnchainStats.tsx
├── ProfileStats.tsx
├── ProgressXP.tsx
├── Quest/
│   ├── QuestCard.tsx
│   ├── QuestChainBadge.tsx
│   ├── QuestFAB.tsx
│   ├── QuestLoadingDeck.tsx
│   ├── QuestProgress.tsx
│   ├── QuestRewardCapsule.tsx
│   └── QuestTypeIcon.tsx
├── admin/
│   ├── BadgeManagerPanel.tsx
│   ├── BotManagerPanel.tsx
│   ├── viral/ (5 components)
├── dashboard/
│   ├── DashboardMobileTabs.tsx
│   ├── DashboardNotificationCenter.tsx
│   ├── TipMentionSummaryCard.tsx
├── profile/
│   ├── ProfileHeroStats.tsx
│   ├── ProfileNFTCard.tsx
│   ├── ProfileNotificationCenter.tsx
│   ├── ProfileSettings.tsx
├── quest-wizard/ (27 files)
│   ├── components/ (20 components)
│   ├── steps/ (5 steps)
│   ├── utils/ (5 utilities)
│   └── validation/
└── ... (200+ total components)

components(old)/      (Legacy - preserved for reference)
└── [all old components]
```

**main:**
```
components/           (OLD structure)
├── MiniappReady.tsx
├── ProgressXP.tsx
├── XPEventOverlay.tsx
├── base/
├── client-wrapper/
├── features/
├── landing/
├── layouts/
├── navigation/
├── providers/
└── ui/
```

---

## 🗄️ DOCUMENTATION RESTRUCTURE

**foundation-rebuild:**
```
docs-archive/
└── old-planning-nov-2025/    (All old docs moved here)
    ├── Archive-Phase-1-11/   (89 planning docs)
    ├── Phase-12-Multichain/
    ├── Phase-13-Quest/
    ├── Phase-14-Quest-Wizard/
    ├── Phase-15-Quest-Enhancements/
    └── Phase-16-Referral/

Root (NEW docs):
├── BASE-ONLY-SECURITY-UPDATE.md
├── CURRENT-TASK.md (updated)
├── DEPLOY-NOW.md
├── ENV-UPDATE-SUMMARY.md
├── FINAL-DECISION.md
├── FOUNDATION-UPDATE-SUMMARY.md
├── GITHUB-WORKFLOW-SETUP.md
├── NAVIGATION-UPDATE-COMPLETE.md
├── NOTIFICATION-SYSTEM-FIX.md
├── PRODUCTION-FIXES-SUMMARY.md
├── TYPESCRIPT-FIXES-SUMMARY.md
├── UI-UX-RESTRUCTURING-PLAN.md (1,356 lines)
└── WORKFLOW-IMPLEMENTATION-SUMMARY.md
```

**main:**
```
docs/                 (Old structure - many files)
├── api/
├── architecture/
├── badge/
├── features/
├── guides/
├── maintenance/
├── onboarding/
├── phase/
├── reference/
└── runbooks/
```

---

## 🎯 WHAT TO SAVE FROM foundation-rebuild

### CRITICAL FILES (MUST SAVE):

**1. API Routes:**
```bash
app/api/notifications/route.ts
```

**2. Supabase Migrations:**
```bash
supabase/migrations/20251130000001_setup_pg_cron_jobs.sql
supabase/migrations/20251130000002_enable_rls_policies.sql
supabase/migrations/20251130000003_fix_security_issues.sql
```

**3. Automation Scripts:**
```bash
scripts/automation/sync-viral-metrics.ts
```

**4. GitHub Workflows:**
```bash
.github/workflows/viral-metrics-sync.yml
```

**5. Documentation:**
```bash
BASE-ONLY-SECURITY-UPDATE.md
DEPLOY-NOW.md
ENV-UPDATE-SUMMARY.md
GITHUB-WORKFLOW-SETUP.md
NOTIFICATION-SYSTEM-FIX.md
TYPESCRIPT-FIXES-SUMMARY.md
UI-UX-RESTRUCTURING-PLAN.md
WORKFLOW-IMPLEMENTATION-SUMMARY.md
```

**6. Library File:**
```bash
lib/notification-history.ts (if exists)
```

---

## 📊 STATS SUMMARY

**foundation-rebuild (last 9 hours):**
- Commits: 3
- Files changed: 662 total
- Lines added: +109,657
- Lines removed: -100,073
- Net change: +9,584 lines

**Key additions:**
- ✅ 3 Supabase migrations (pg_cron, RLS, security)
- ✅ 1 API route (notifications with 3 methods)
- ✅ 1 automation script (400 lines)
- ✅ 1 GitHub workflow
- ✅ 8+ documentation files
- ✅ Component folder restructure (200+ components)
- ✅ 46 files migrated (gm-utils → gmeow-utils)
- ✅ Base-only architecture (GMChainKey = 'base')

**main:**
- Commits: 13 (in last 14 hours)
- Focus: CSS cleanup, Phase 1 work
- Still using: gm-utils.ts (multi-chain)
- No new API routes
- No new migrations
- No automation scripts

---

## 🚨 RECOMMENDATION

**ACTION PLAN:**

1. **STAY on foundation-rebuild** (current branch ✅)

2. **Cherry-pick useful commits from main:**
   ```bash
   # CSS improvements from main
   git cherry-pick 39a2c89  # fresh CSS
   git cherry-pick 99c5dcb  # CSS consolidation
   git cherry-pick 0ce49ec  # Day 2 components
   
   # Resolve conflicts (prefer gmeow-utils over gm-utils)
   ```

3. **Save critical files before switching:**
   ```bash
   # Already on foundation-rebuild, no need to save
   # Files are safe on this branch
   ```

4. **Update main documentation:**
   ```bash
   # When ready to merge back
   git checkout main
   git merge foundation-rebuild
   # Or create PR: foundation-rebuild → main
   ```

5. **DO NOT switch to main yet** - you'll lose:
   - Notifications API
   - 3 Supabase migrations
   - Viral metrics automation
   - Base-only architecture
   - Component restructure

---

## ✅ CONCLUSION

**foundation-rebuild is 100% correct branch.**

**You completed:**
- ✅ Base-only migration (gm-utils → gmeow-utils)
- ✅ Notifications API (3 HTTP methods)
- ✅ Supabase migrations (pg_cron, RLS, security)
- ✅ Viral metrics automation (Neynar sync)
- ✅ GitHub workflow (auto-sync every 6 hours)
- ✅ Documentation (8 new files)
- ✅ Component restructure (200+ organized)

**main branch has:**
- ❌ Old multi-chain code
- ❌ None of the above features
- ❌ CSS improvements (can cherry-pick)

**Next step:** Continue on foundation-rebuild, optionally cherry-pick CSS work from main.

---

**Generated**: November 30, 2025  
**Branch**: foundation-rebuild  
**Status**: ✅ CORRECT BRANCH
