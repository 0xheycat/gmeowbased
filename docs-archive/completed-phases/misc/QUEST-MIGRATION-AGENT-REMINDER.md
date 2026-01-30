# 🎯 Quest Migration Agent Reminder & Core Documentation
**Date**: January 23, 2026  
**Status**: Pre-Migration Briefing  
**Audience**: Development Team, QA, DevOps  
**Purpose**: Ensure successful zero-downtime quest system migration  

---

## Executive Brief

### Current State
- ✅ All active quests cleaned (0 active, 11 closed)
- ✅ Escrow refunded to creators (no locked points)
- ✅ Documentation complete (1,679 lines)
- ✅ Migration strategy approved (5-phase rollout)

### Migration Window
- **When**: Ready for Phase 1 deployment
- **Duration**: ~6 hours total (4-6 hours active migration + monitoring)
- **Risk Level**: 🟢 LOW (auto-rollback capability)
- **Team**: On-call required during phases 2-4

---

## 🟢 MUST DO - Critical Actions

### Before Migration Starts

#### 1. MUST: Verify Backup Snapshots Exist
```bash
# Verify production backups
✅ MUST: Supabase snapshot created within 24 hours
✅ MUST: Subsquid indexer state backed up
✅ MUST: GitHub Actions workflows tested
✅ MUST: Rollback procedures reviewed with team

# Command to verify:
$ npm run verify:backups
Expected: "✅ Latest backup: < 1 hour ago"
```

**Why**: If migration fails, need instant recovery point

#### 2. MUST: Enable Monitoring Dashboard
```bash
✅ MUST: Error rate tracking (threshold: < 1%)
✅ MUST: API latency monitoring (baseline: 220-240ms)
✅ MUST: Subsquid sync lag tracking (target: < 60 seconds)
✅ MUST: User error reporting alerts enabled

# Deploy monitoring:
$ npm run deploy:monitoring
$ npm run enable:alerts
```

**Why**: Real-time visibility prevents silent failures

#### 3. MUST: Verify All Data Consistency
```bash
# Run consistency tests BEFORE migration
$ npm run test:quest:consistency

Expected output:
✅ Supabase quests: 11 (closed)
✅ Subsquid quests: 11 (synced)
✅ Active quests: 0
✅ Consistency: 100%
✅ Escrow status: ✅ All refunded
```

**Why**: Starting from known-good state prevents cascade failures

#### 4. MUST: Brief On-Call Team
```bash
✅ MUST: Dev team on Slack/Discord during migration
✅ MUST: Incident response plan reviewed
✅ MUST: Rollback authority identified
✅ MUST: 30-min sync up before Phase 1 starts
```

**Why**: Quick response if issues detected

#### 5. MUST: Verify Subsquid Sync Status
```bash
# Check indexer health
$ npm run verify:subsquid:health

Expected:
✅ Subsquid online
✅ Block lag: 0-10 blocks
✅ Event latency: < 60 seconds
✅ GraphQL endpoint: responding
✅ No indexing errors
```

**Why**: Subsquid failures cascade to Supabase sync

### During Phase 1 (Dual-Read Setup)

#### 6. MUST: Deploy Code with Feature Flag Disabled
```bash
✅ MUST: Deploy multi-source code
✅ MUST: Feature flag set to 0% (single-source only)
✅ MUST: Run smoke tests (all 7 endpoints)
✅ MUST: Verify API responding normally
✅ MUST: Check error logs (should be clean)
```

**Why**: New code active but old path used = safe testing

#### 7. MUST: Verify No New Errors Introduced
```bash
$ npm run check:error-rate

Expected:
✅ Error rate: 0.01-0.02% (baseline)
✅ No new errors types
✅ Performance normal (220-240ms)
✅ No user complaints
```

**Why**: Baseline verification before traffic shift

### During Phase 2-4 (Gradual Rollout)

#### 8. MUST: Monitor Error Rate During Each Phase
```bash
Phase 2 (10% traffic): Monitor 10 minutes
Phase 3 (50% traffic): Monitor 10 minutes
Phase 4 (100% traffic): Monitor 30 minutes

✅ MUST: Error rate < 1% at all times
✅ MUST: Latency < 600ms at all times
✅ MUST: Consistency check every 2 minutes
✅ MUST: If any alert fires → ROLLBACK IMMEDIATELY
```

**Why**: Early detection prevents user impact

#### 9. MUST: Verify Data Consistency During Migration
```bash
# Run every 5 minutes during phases 2-4
$ npm run verify:quest:consistency:live

Check:
✅ MUST: Supabase ← → Subsquid match
✅ MUST: Completion counts same
✅ MUST: Points awarded consistent
✅ MUST: Escrow status unchanged
```

**Why**: Catch sync issues before they affect users

#### 10. MUST: Log All Decisions & Issues
```
Incident Log Template:
┌─ Time: HH:MM UTC
├─ Phase: [1-4]
├─ Issue: [description]
├─ Action Taken: [what was done]
├─ Resolution: [outcome]
└─ Impact: [users affected, duration]

Example:
┌─ Time: 10:15 UTC
├─ Phase: 2 (10% traffic)
├─ Issue: Latency spike to 450ms
├─ Action Taken: Increased query timeout
├─ Resolution: Dropped back to 240ms
└─ Impact: 0 users affected, 2 min duration
```

**Why**: Post-migration analysis & compliance

### Post-Migration (24+ hours)

#### 11. MUST: Verify All Systems Working
```bash
$ npm run verify:migration:complete

Checks:
✅ MUST: Quest creation working
✅ MUST: Quest completion working
✅ MUST: XP awards correct
✅ MUST: Points balance correct
✅ MUST: Escrow tracking accurate
✅ MUST: No stuck transactions
✅ MUST: Error rate normal
```

**Why**: Confirm migration succeeded

#### 12. MUST: Update Documentation
```bash
✅ MUST: Mark migration as complete
✅ MUST: Document any deviations
✅ MUST: Archive old implementation
✅ MUST: Update runbooks
✅ MUST: Notify team
```

**Why**: Knowledge preservation for future migrations

---

## 🔴 AVOID - Anti-Patterns That Cause Failures

### AVOID: Deploying Without Backups
❌ **Wrong**: `git push && vercel deploy` (no backup)  
✅ **Right**: 
```bash
$ npm run backup:supabase:snapshot
$ git push
$ vercel deploy
```

**Why**: Backups save you from data loss

### AVOID: Enabling 100% Traffic Too Quickly
❌ **Wrong**: Jump straight from 0% → 100%  
✅ **Right**: 0% → 10% → 50% → 100% (with monitoring between)

**Why**: Phased rollout catches issues early

### AVOID: Ignoring Error Rate Spikes
❌ **Wrong**: Error rate 5%, "let's wait and see"  
✅ **Right**: Error rate > 1% → ROLLBACK immediately

**Why**: Error spikes indicate systemic issues

### AVOID: Trusting Only One Data Source
❌ **Wrong**: Check Supabase only  
✅ **Right**: Verify Supabase ↔ Subsquid consistency

**Why**: One source can fail silently

### AVOID: Deploying During Peak Hours
❌ **Wrong**: Deploy at 2 PM UTC (high traffic)  
✅ **Right**: Deploy at 2 AM UTC (low traffic window)

**Why**: Less users affected if issues occur

### AVOID: Missing On-Call Coverage
❌ **Wrong**: Migrate with no one available  
✅ **Right**: Full team on-call, incident response ready

**Why**: Need quick response to issues

### AVOID: Skipping Smoke Tests
❌ **Wrong**: Deploy and assume it works  
✅ **Right**: Test all 7 endpoints before rollout

**Why**: Catches obvious bugs before user impact

### AVOID: Making Config Changes During Migration
❌ **Wrong**: Change timeout → enable SSL → migrate (3 things)  
✅ **Right**: Only change migration-related code

**Why**: Multiple changes make debugging hard

### AVOID: Not Documenting Issues
❌ **Wrong**: Issue happens, "everyone knows about it"  
✅ **Right**: Detailed incident log for post-mortem

**Why**: No log = no learning for next time

### AVOID: Forgetting Subsquid Monitoring
❌ **Wrong**: Check API latency, forget indexer lag  
✅ **Right**: Monitor both API (220ms) and Subsquid (< 60s)

**Why**: Indexer lags cascade to API failures

### AVOID: Assuming XP/Points Are the Same
❌ **Wrong**: Treat Points and XP as identical  
✅ **Right**: Points = contract, XP = database (separate)

**Why**: Confusion causes reward distribution errors

### AVOID: Rushing to Cleanup Phase
❌ **Wrong**: Delete old code after 5 hours  
✅ **Right**: Keep old code for 24+ hours, then cleanup

**Why**: Need fallback if issues discovered late

---

## 🎯 Core Documentation Reference

### Quest System Architecture (Remember This)

```
┌──────────────────────────────────────────────────┐
│ Smart Contracts (Base Mainnet, on-chain)        │
├──────────────────────────────────────────────────┤
│ • BaseModule.sol - Quest storage                 │
│ • CoreModule.sol - Creation/completion           │
│ • Events: QuestAdded, QuestCompleted, Closed     │
└──────────────────────────────────────────────────┘
         ↓ (Oracle monitors events)
┌──────────────────────────────────────────────────┐
│ Subsquid Cloud (Real-time indexer)              │
├──────────────────────────────────────────────────┤
│ • GraphQL endpoint (100ms response)              │
│ • Quest entities (48 fields indexed)             │
│ • Event lag: 30-60 seconds                       │
│ • Supports: quests, completions, user stats      │
└──────────────────────────────────────────────────┘
         ↓ (Batch sync every 5 minutes)
┌──────────────────────────────────────────────────┐
│ Supabase PostgreSQL (Canonical source)           │
├──────────────────────────────────────────────────┤
│ • unified_quests (32 columns, 11 rows closed)   │
│ • quest_completions (7 columns, tracking)        │
│ • user_quest_progress (multi-step tracking)      │
│ • RLS policies for access control                │
│ • Hourly backups automated                       │
└──────────────────────────────────────────────────┘
         ↓ (API routes read from here)
┌──────────────────────────────────────────────────┐
│ Backend API + Frontend (User facing)             │
├──────────────────────────────────────────────────┤
│ • 7 API endpoints (create, complete, claim)      │
│ • React components for UI                        │
│ • Wallet-based auth (no traditional login)       │
└──────────────────────────────────────────────────┘
```

### XP vs Points (Remember This)

| Aspect | Points | XP |
|--------|--------|-----|
| **Storage** | contract pointsBalance mapping | user_points_balances.viral_xp |
| **Purpose** | Spendable currency | Level progression only |
| **Sync** | Via oracle deposits | Via increment_user_xp() RPC |
| **Can Spend?** | YES (create quest, buy badge) | NO (view only) |
| **Ever Refunded?** | YES (on escrow return) | NO (never decreases) |
| **Multiplier Applied?** | YES (rank tier bonus) | NO (fixed value) |
| **Value Source** | reward_points_awarded × multiplier | reward_points_awarded |

### Table Relationships (Remember This)

```
unified_quests (11 closed quests)
    ├─ FK: quest_completions.quest_id
    ├─ FK: user_quest_progress.quest_id
    ├─ FK: task_completions.quest_id
    ├─ FK: quest_creation_costs.quest_id
    ├─ FK: quest_creator_earnings.quest_id
    └─ Reference: onchain_quest_id (to contract)

quest_completions (tracks who completed what)
    ├─ quest_id → unified_quests
    ├─ completer_fid → user_profiles
    └─ claim_signature (oracle approval)

user_quest_progress (multi-step quests)
    ├─ user_fid (participant)
    ├─ quest_id → unified_quests
    └─ progress_percentage (0-100)

task_completions (individual task records)
    ├─ quest_id → unified_quests
    ├─ task_index (which step)
    └─ verification_proof (JSONB)
```

### API Endpoints (Remember This)

```
GET /api/quests                      → All quests (closed, no active)
GET /api/quests/[slug]              → Single quest details
GET /api/quests/[slug]/progress     → User progress
GET /api/user/[address]/quests      → User's quests

POST /api/quests/create             → Create new quest (uses escrow)
POST /api/quests/[slug]/verify      → Verify completion (oracle signature)
POST /api/quests/[slug]/claim       → Claim rewards (on-chain)

All expect wallet signature authentication
All return: { success, data, error }
```

### Subsquid Queries (Remember This)

```graphql
# Get active quests
query GetActiveQuests {
  quests(where: { isActive_eq: true }) {
    id
    creator
    rewardPoints
    totalCompletions
    isActive
  }
}

# Get quest completions
query GetCompletions($questId: ID!) {
  questCompletions(where: { quest: { id_eq: $questId } }) {
    completer
    pointsAwarded
    createdAt
  }
}

# Verify sync status
query VerifySync($questId: ID!) {
  quests(where: { id_eq: $questId }) {
    totalCompletions
    pointsAwarded
    txHash
  }
}
```

---

## 📋 Pre-Migration Checklist (48 Hours Before)

### 24 Hours Before Migration

- [ ] ✅ All active quests closed (0 active count verified)
- [ ] ✅ Escrow refunded to creators (check points_balance)
- [ ] ✅ Create fresh Supabase backup snapshot
- [ ] ✅ Backup Subsquid indexer state
- [ ] ✅ Review rollback procedures with team
- [ ] ✅ Test rollback procedure (dry run)
- [ ] ✅ Update on-call rotation (24+ hour coverage)
- [ ] ✅ Notify stakeholders of migration window

### 4 Hours Before Migration

- [ ] ✅ Run consistency tests (100% match required)
- [ ] ✅ Verify Subsquid sync lag < 60 seconds
- [ ] ✅ Verify monitoring dashboard working
- [ ] ✅ Enable error rate alerts (threshold: < 1%)
- [ ] ✅ Brief team on incident response
- [ ] ✅ Confirm Phase 1 deployment ready
- [ ] ✅ Load Slack for real-time updates

### 1 Hour Before Migration

- [ ] ✅ Final consistency check
- [ ] ✅ Confirm on-call team available
- [ ] ✅ Start incident log
- [ ] ✅ Begin monitoring baseline capture
- [ ] ✅ Ready for Phase 1 code deploy

---

## 🚨 Emergency Rollback (If Needed)

### Trigger Conditions (ROLLBACK IMMEDIATELY)

```
✅ ROLLBACK IF: Error rate > 1%
✅ ROLLBACK IF: Inconsistency > 5% (Supabase ↔ Subsquid mismatch)
✅ ROLLBACK IF: API latency > 1000ms sustained
✅ ROLLBACK IF: User complaints > 10/hour
✅ ROLLBACK IF: Subsquid indexer down
✅ ROLLBACK IF: Supabase connection failing
```

### Rollback Procedure (< 5 Minutes)

```bash
# 1. IMMEDIATELY disable multi-source flag
$ MULTI_SOURCE_ENABLE_PCT=0 npm run restart:api
[Wait 30 seconds for restart]

# 2. Verify error rate normalizing
$ npm run check:error-rate
Expected: Returns to 0.01-0.02%

# 3. Verify API responding
$ npm run smoke:test
Expected: All 7 endpoints responding

# 4. Notify team
$ echo "ROLLBACK COMPLETE - Error rate normalized" | post-to-slack

# 5. Investigate root cause
$ npm run analyze:migration-failure
$ npm run collect:error-logs > rollback-analysis.md

# 6. Schedule post-mortem meeting
```

---

## 📞 Contact & Escalation

### During Migration (On-Call)

**Primary On-Call**: [Name] - [Slack/Phone]  
**Secondary On-Call**: [Name] - [Slack/Phone]  
**DevOps Lead**: [Name] - [Slack/Phone]  
**Database Owner**: [Name] - [Slack/Phone]  

### Incident Channels

- **Slack**: #production-incidents
- **Discord**: production-team
- **Status Page**: status.gmeow.dev

### Escalation Path

```
1. On-call detects issue (< 2 min)
   ↓
2. Posts to #production-incidents
   ↓
3. If error rate > 5%: trigger rollback immediately
   ↓
4. Notify DevOps lead (if still ongoing)
   ↓
5. Post-mortem meeting scheduled
```

---

## ✅ Success Criteria

### Phase 1 Complete When
- [ ] ✅ Dual-read code deployed
- [ ] ✅ Feature flag set to 0%
- [ ] ✅ All tests passing
- [ ] ✅ Error rate normal
- [ ] ✅ No new errors introduced

### Phase 2 Complete When
- [ ] ✅ 10% traffic running for 10+ min
- [ ] ✅ Error rate < 1%
- [ ] ✅ Latency normal (220-240ms)
- [ ] ✅ Consistency 100%

### Phase 3 Complete When
- [ ] ✅ 50% traffic running for 10+ min
- [ ] ✅ Error rate < 1%
- [ ] ✅ No user complaints
- [ ] ✅ Performance stable

### Phase 4 Complete When
- [ ] ✅ 100% traffic running for 30+ min
- [ ] ✅ All systems stable
- [ ] ✅ Final consistency check passes
- [ ] ✅ Migration log complete

### Migration Successful When
- [ ] ✅ All phases completed
- [ ] ✅ No rollback needed
- [ ] ✅ Error rate < baseline
- [ ] ✅ Quest endpoints working
- [ ] ✅ XP/Points system correct
- [ ] ✅ Team debriefing complete

---

## 📚 Quick Reference

### Important Numbers
- API Baseline Latency: **220-240ms**
- Error Rate Baseline: **0.01-0.02%**
- Subsquid Max Lag: **60 seconds**
- Max Acceptable Latency: **600ms**
- Max Acceptable Error Rate: **1%**
- Rollback Threshold: **Any alert or > 1% errors**

### Important Commands
```bash
$ npm run verify:quest:consistency          # Check sync state
$ npm run check:error-rate                  # Get current errors
$ npm run verify:subsquid:health            # Indexer status
$ npm run backup:supabase:snapshot          # Create backup
$ npm run smoke:test                        # Test endpoints
$ npm run analyze:migration-failure         # Post-mortem analysis
```

### Important Files
- `QUEST-SYSTEM-MIGRATION-ANALYSIS.md` - Full documentation
- `QUEST-MIGRATION-SESSION-SUMMARY.md` - Overview
- `.github/workflows/*` - CI/CD pipelines
- `lib/quests/multi-source-reader.ts` - Dual-source code
- `scripts/verify-quest-sync.ts` - Consistency checker

---

## 🎓 Learning Resources

If you need to understand:

**How Quests Work**: See QUEST-SYSTEM-MIGRATION-ANALYSIS.md sections 1-5  
**How Data Syncs**: See Data Sources section (Supabase + Subsquid)  
**How to Deploy**: See Deployment Checklist section  
**How to Rollback**: See Emergency Rollback section  
**How to Monitor**: See Monitoring Dashboard section  

---

**Document Status**: ✅ READY FOR TEAM BRIEFING  
**Last Updated**: January 23, 2026  
**Next Review**: Day before migration  
**Questions?**: Refer to QUEST-SYSTEM-MIGRATION-ANALYSIS.md or contact on-call team
