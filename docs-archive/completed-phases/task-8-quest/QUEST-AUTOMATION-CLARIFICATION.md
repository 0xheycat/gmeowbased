# 🎯 Quest Automation System - Complete Explanation

**Date**: December 5, 2025  
**Purpose**: Clarify what was built, why only one GitHub workflow was added, and what updates are needed

---

## ❓ Your Question

> "I see you already setting new automation quest system from supabase MCP earlier, but I see only quest expiry been add on github, I don't really understanding regarding this"

---

## ✅ Complete Answer

### What Was Built via Supabase MCP

The quest automation system has **TWO LAYERS**:

#### 1. Database Automation Layer (Supabase MCP) ✅ COMPLETE
**11 Functions + 5 Triggers** created using Supabase MCP tools

**Database Triggers** (automatically run on database events):
```sql
-- These run AUTOMATICALLY when database events occur:

trigger_quest_created 
  → Fires when quest is created
  → Calls auto_notify_quest_created()
  → Sends "Quest Created!" notification

trigger_task_progress
  → Fires when user completes a task
  → Calls auto_init_quest_progress()
  → Updates progress percentage

trigger_auto_complete
  → Fires when all tasks are done
  → Calls auto_complete_quest()
  → Marks quest as completed

trigger_auto_rewards
  → Fires when quest is completed
  → Calls auto_distribute_rewards()
  → Awards points to user + creator

trigger_milestone_bonuses
  → Fires when creator reaches 10/50/100 completions
  → Calls auto_milestone_bonuses()
  → Awards bonus points
```

**Why These Don't Need GitHub Workflows**:
- Database triggers run INSIDE Supabase automatically
- No external scheduling needed
- Events happen in real-time when users take actions
- No API calls required

#### 2. Scheduled Automation Layer (GitHub Actions) ⚠️ ONLY 1 ADDED
**Only `quest-expiry.yml` was created because**:

The **auto_expire_quests()** function is DIFFERENT from other functions:
- It checks **time-based expiry** (not user actions)
- Needs to run **periodically** (every hour)
- Cannot be a trigger (no specific database event to trigger it)
- Requires **cron job** to execute

**The Quest Expiry Workflow**:
```yaml
name: Quest Expiry Check (Hourly)
schedule:
  - cron: '0 * * * *'  # Every hour

# Calls: POST /api/cron/expire-quests
# Which calls: cron_expire_quests() database function
# Which calls: auto_expire_quests() to mark expired quests
```

---

## 🔍 Why Other Workflows Already Exist

You noticed 6 workflows in `.github/workflows/`:

| Workflow | Purpose | Status |
|----------|---------|--------|
| **quest-expiry.yml** 🆕 | Quest expiry checking | ✅ NEW - Just created |
| leaderboard-update.yml | Leaderboard sync | ✅ Already exists |
| badge-minting.yml | Badge queue processing | ✅ Already exists |
| gm-reminders.yml | Push notifications | ✅ Already exists |
| cache-warmup.yml | Cache warming | ✅ Already exists |
| viral-metrics-sync.yml | Engagement sync | ✅ Already exists |

**These workflows already existed** - we only added the quest expiry one!

---

## ⚠️ Old Patterns Found in Workflows

You're RIGHT that some workflows use old patterns. Here's what needs updating:

### 1. badge-minting.yml ✅ ALREADY FIXED (Nov 30, 2025)
```yaml
# ✅ CORRECT - Base-only RPC
env:
  RPC_BASE: ${{ secrets.RPC_BASE }}

# ❌ OLD - Multi-chain RPCs (REMOVED Nov 30)
# RPC_OP, RPC_CELO, RPC_UNICHAIN, RPC_INK
```
**Status**: Already updated to Base-only pattern

### 2. gm-reminders.yml ⚠️ NEEDS REVIEW
```yaml
# Current: Uses script directly
run: npx tsx scripts/automation/send-gm-reminders.ts

# Question: Should this be an API route?
# - Pro: Consistent with other cron jobs (quest-expiry, leaderboard-update)
# - Pro: Better security (CRON_SECRET verification)
# - Pro: Rate limiting support
# - Con: Works fine as-is
```

### 3. cache-warmup.yml ⚠️ NEEDS REVIEW
```yaml
# Current: Uses script directly
run: npx tsx scripts/cache/warmup-leaderboard.ts

# Question: Should this be an API route?
# Same considerations as gm-reminders.yml
```

### 4. viral-metrics-sync.yml ⚠️ NEEDS REVIEW
```yaml
# Current: Uses script directly
run: npx tsx scripts/automation/sync-viral-metrics.ts

# Question: Should this be an API route?
# Same considerations as above
```

---

## 🎯 Recommendation: Standardize Workflow Patterns

### Current State (Mixed Patterns)

**API Route Pattern** (2 workflows):
- ✅ quest-expiry.yml → `/api/cron/expire-quests`
- ✅ leaderboard-update.yml → `/api/cron/update-leaderboard`

**Direct Script Pattern** (4 workflows):
- ⚠️ badge-minting.yml → `npx tsx scripts/automation/mint-badges.ts`
- ⚠️ gm-reminders.yml → `npx tsx scripts/automation/send-gm-reminders.ts`
- ⚠️ cache-warmup.yml → `npx tsx scripts/cache/warmup-leaderboard.ts`
- ⚠️ viral-metrics-sync.yml → `npx tsx scripts/automation/sync-viral-metrics.ts`

### Standardized Pattern (Recommended)

**All workflows should use API routes** for consistency:

**Benefits**:
1. ✅ Consistent security (CRON_SECRET on all endpoints)
2. ✅ Rate limiting support (prevent abuse)
3. ✅ Better error handling (HTTP status codes)
4. ✅ Easier monitoring (Vercel logs)
5. ✅ IP tracking for audit trail
6. ✅ Can be triggered manually from browser (for testing)

**Migration Needed**:
```
Create new API routes:
- /api/cron/mint-badges (from scripts/automation/mint-badges.ts)
- /api/cron/send-gm-reminders (from scripts/automation/send-gm-reminders.ts)
- /api/cron/warmup-cache (from scripts/cache/warmup-leaderboard.ts)
- /api/cron/sync-viral-metrics (from scripts/automation/sync-viral-metrics.ts)

Update workflows to call API routes:
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$DEPLOYMENT_URL/api/cron/[endpoint]"
```

---

## 📊 Complete Quest Automation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    QUEST AUTOMATION SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Layer 1: Database Triggers (Real-time, Event-driven)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  User Action          → Trigger              → Function      │
│  ────────────────────────────────────────────────────────    │
│  Create quest         → trigger_quest_created                │
│                          → auto_notify_quest_created()       │
│                                                               │
│  Complete task        → trigger_task_progress                │
│                          → auto_init_quest_progress()        │
│                                                               │
│  Finish all tasks     → trigger_auto_complete                │
│                          → auto_complete_quest()             │
│                                                               │
│  Quest completed      → trigger_auto_rewards                 │
│                          → auto_distribute_rewards()         │
│                                                               │
│  Reach milestone      → trigger_milestone_bonuses            │
│                          → auto_milestone_bonuses()          │
│                                                               │
│  ✅ NO GITHUB WORKFLOWS NEEDED - Runs automatically in DB    │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Layer 2: Scheduled Jobs (Cron, Time-based)                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  GitHub Actions       → API Route            → Function      │
│  ────────────────────────────────────────────────────────    │
│  quest-expiry.yml     → /api/cron/expire-quests              │
│  (every hour)            → cron_expire_quests()              │
│                            → auto_expire_quests()            │
│                                                               │
│  ⚠️ ONLY THIS WORKFLOW NEEDED FOR QUEST AUTOMATION           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Action Items

### Immediate (Optional - Standardization)
1. **Create 4 new API routes** in `app/api/cron/`:
   - [ ] `mint-badges/route.ts` (move from script)
   - [ ] `send-gm-reminders/route.ts` (move from script)
   - [ ] `warmup-cache/route.ts` (move from script)
   - [ ] `sync-viral-metrics/route.ts` (move from script)

2. **Add 3-layer security** to new API routes:
   - [ ] Layer 1: Rate limiting (strictLimiter)
   - [ ] Layer 2: CRON_SECRET verification
   - [ ] Layer 3: IP tracking and logging

3. **Update 4 workflows** to use API routes:
   - [ ] badge-minting.yml
   - [ ] gm-reminders.yml
   - [ ] cache-warmup.yml
   - [ ] viral-metrics-sync.yml

### Alternative (Keep As-Is)
- Scripts work fine as-is
- Only disadvantage: Less consistent security patterns
- No functional issues

---

## ✅ Summary

**What You Asked About**:
- Quest automation via Supabase MCP ✅ DONE (11 functions, 5 triggers)
- Why only 1 GitHub workflow added → Because other 5 functions are DATABASE TRIGGERS (automatic)
- Only quest expiry needs GitHub workflow → Time-based check (not event-driven)

**What Needs Updating**:
- Optional: Standardize 4 workflows to use API routes (for consistency)
- Already fixed: Base-only pattern applied to badge-minting.yml

**Quest System Status**:
- ✅ 100% Complete and functional
- ✅ Database automation working automatically
- ✅ Quest expiry cron job scheduled and secured
- ✅ Zero manual intervention required

---

**Next Steps**:
1. Review this explanation - does it answer your questions?
2. Decide: Standardize workflows to API routes OR keep as-is?
3. If standardize: I'll create the 4 API routes + update workflows
4. If keep as-is: Move to Tasks 9-12 (Profile, Notifications, Badges pages)
